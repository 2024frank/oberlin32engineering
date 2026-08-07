-- Membership, invitations and broadcasting.
--
-- Three different things were all being called "role", so they are separated here:
--   profiles.role      access level, the existing app_role enum (admin | editor)
--   society_roles      the assignable leadership titles the admin maintains.
--                      Only rows in this table appear in the "add member" picker.
--   leaders.role       the public-facing title printed on the leadership page
--
-- Identity stays in Supabase Auth. Resend only carries the mail.

begin;

-- ---------------------------------------------------------------- roles ----
create table if not exists public.society_roles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  label         text not null,
  description   text default '',
  access_level  public.app_role not null default 'editor',
  seats         int  not null default 1,          -- how many people may hold it
  sort_order    int  not null default 100,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.society_roles is
  'Assignable leadership roles. The add-member picker reads only from here, so a role must be created before anyone can be invited into it.';

-- ---------------------------------------------------------- invitations ----
create table if not exists public.invitations (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  full_name     text default '',
  role_id       uuid references public.society_roles(id) on delete set null,
  access_level  public.app_role not null default 'editor',
  invited_by    uuid references auth.users(id) on delete set null,
  status        text not null default 'sent'
                check (status in ('sent','accepted','revoked','failed')),
  message       text default '',                  -- optional note from the inviter
  resend_id     text,                             -- Resend message id, for tracing
  error         text,
  sent_at       timestamptz not null default now(),
  accepted_at   timestamptz,
  unique (email, status) deferrable initially deferred
);

create index if not exists invitations_email_idx on public.invitations (lower(email));

-- ---------------------------------------------------------- subscribers ----
create table if not exists public.subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  full_name     text default '',
  source        text default 'website',
  confirmed     boolean not null default false,
  unsubscribed  boolean not null default false,
  unsub_token   uuid not null default gen_random_uuid(),
  created_at    timestamptz not null default now()
);

create index if not exists subscribers_active_idx
  on public.subscribers (email) where unsubscribed = false;

-- ----------------------------------------------------------- broadcasts ----
create table if not exists public.broadcasts (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null,
  preheader     text default '',
  body_markdown text not null default '',
  audience      text not null default 'subscribers'
                check (audience in ('subscribers','members','both')),
  status        text not null default 'draft'
                check (status in ('draft','scheduled','sending','sent','failed')),
  scheduled_for timestamptz,
  sent_at       timestamptz,
  recipient_count int not null default 0,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists broadcasts_due_idx
  on public.broadcasts (scheduled_for) where status = 'scheduled';

-- ------------------------------------------------- email template store ----
-- Lets the invitation and newsletter copy be edited from the admin instead of
-- living in code. {{placeholders}} are substituted at send time.
create table if not exists public.email_templates (
  key           text primary key,
  subject       text not null,
  body_markdown text not null,
  updated_at    timestamptz not null default now()
);

insert into public.email_templates (key, subject, body_markdown) values
  ('invitation',
   'You have been added to the Oberlin 3-2 Engineering Society',
   E'Hi {{name}},\n\nYou have been added to the Oberlin 3-2 Engineering Society as **{{role}}**.\n\nUse the button below to set your password and sign in to the society command center. The link is good for 24 hours.\n\n{{action}}\n\nIf you were not expecting this, you can ignore this message and no account will be created.\n\n— {{inviter}}'),
  ('password_reset',
   'Reset your Oberlin 3-2 Engineering Society password',
   E'Hi {{name}},\n\nUse the button below to choose a new password. The link is good for one hour.\n\n{{action}}\n\nIf you did not ask for this, nothing has changed and you can ignore this message.')
on conflict (key) do nothing;

-- ------------------------------------------------------------------ RLS ----
alter table public.society_roles  enable row level security;
alter table public.invitations    enable row level security;
alter table public.subscribers    enable row level security;
alter table public.broadcasts     enable row level security;
alter table public.email_templates enable row level security;

-- Roles are readable by any signed-in member so the picker can populate.
drop policy if exists "members read roles" on public.society_roles;
create policy "members read roles" on public.society_roles
  for select using (auth.uid() is not null);

-- Everything else is admin-only. The API uses the service key and enforces the
-- admin check itself, so these policies are the second line of defence.
do $$
declare t text;
begin
  foreach t in array array['society_roles','invitations','subscribers','broadcasts','email_templates']
  loop
    execute format('drop policy if exists "admins manage %1$s" on public.%1$I', t);
    execute format($f$
      create policy "admins manage %1$s" on public.%1$I
        for all
        using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
        with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    $f$, t);
  end loop;
end $$;

-- Anyone may subscribe to the newsletter; nobody but an admin may read the list.
drop policy if exists "public may subscribe" on public.subscribers;
create policy "public may subscribe" on public.subscribers
  for insert with check (true);

-- --------------------------------------------------------- starting set ----
-- The five vacancies already advertised on the leadership page, so the picker
-- is usable immediately rather than empty on first load.
insert into public.society_roles (slug, label, description, access_level, sort_order) values
  ('president',      'President',                            'Leads the executive board and sets direction.',        'admin',  10),
  ('vice-president', 'Vice President',                       'Runs meetings and turns strategy into action.',        'admin',  20),
  ('treasurer',      'Treasurer',                            'Owns the budget, reimbursements and records.',         'editor', 30),
  ('projects-chair', 'Projects Chair',                       'Runs the project board and team formation.',           'editor', 40),
  ('programs-chair', 'Programs & Partnerships Chair',        'Organises panels, speakers and partner relations.',    'editor', 50),
  ('comms-chair',    'Communications & Membership Chair',    'Owns the site, social channels and membership.',       'editor', 60)
on conflict (slug) do nothing;

commit;
