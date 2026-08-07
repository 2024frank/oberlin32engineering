-- Officer roles, invitations, subscribers, and email records.
-- Run after database/schema.sql. Re-running is safe.

begin;

create table if not exists public.society_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 1 and 48),
  label text not null check (char_length(label) between 1 and 100),
  description text not null default '' check (char_length(description) <= 600),
  access_level public.app_role not null default 'editor',
  seats integer not null default 1 check (seats between 1 and 50),
  sort_order integer not null default 100 check (sort_order between 0 and 10000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 320),
  full_name text not null default '' check (char_length(full_name) <= 160),
  role_id uuid references public.society_roles(id) on delete set null,
  access_level public.app_role not null default 'editor',
  invited_by uuid references auth.users(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete set null,
  existing_account boolean not null default false,
  status text not null default 'sent' check (status in ('sent','accepted','revoked','failed')),
  message text not null default '' check (char_length(message) <= 1200),
  resend_id text,
  error text,
  sent_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists invitations_email_idx on public.invitations (lower(email));
create index if not exists invitations_role_status_idx on public.invitations (role_id, status);
create index if not exists invitations_auth_user_idx on public.invitations (auth_user_id);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 320),
  full_name text not null default '' check (char_length(full_name) <= 160),
  source text not null default 'website' check (char_length(source) <= 120),
  confirmed boolean not null default false,
  unsubscribed boolean not null default false,
  unsub_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (char_length(subject) between 1 and 180),
  preheader text not null default '' check (char_length(preheader) <= 240),
  body_markdown text not null default '',
  audience text not null default 'subscribers' check (audience in ('subscribers','members','both')),
  status text not null default 'draft' check (status in ('draft','scheduled','sending','sent','failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  key text primary key,
  subject text not null,
  body_markdown text not null,
  updated_at timestamptz not null default now()
);

insert into public.email_templates (key, subject, body_markdown) values
  ('invitation',
   'Your Oberlin 3-2 Engineering Society officer account',
   E'Hi {{name}},\n\nYou have been invited to help as **{{role}}**. Enter the one-time code from this email in the officer portal, then choose a password.\n\nIf you were not expecting this message, you can ignore it.\n\n— {{inviter}}'),
  ('password_reset',
   'Your Oberlin 3-2 officer-portal code',
   E'Hi {{name}},\n\nEnter the temporary code from this email in the officer portal to choose a new password.\n\nIf you did not request it, you can ignore this message.')
on conflict (key) do update set
  subject = excluded.subject,
  body_markdown = excluded.body_markdown,
  updated_at = now();

-- Reuse the common updated_at trigger created by schema.sql.
do $$
declare t text;
begin
  foreach t in array array['society_roles','broadcasts','email_templates'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
  end loop;
end $$;

alter table public.society_roles enable row level security;
alter table public.invitations enable row level security;
alter table public.subscribers enable row level security;
alter table public.broadcasts enable row level security;
alter table public.email_templates enable row level security;

do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('society_roles','invitations','subscribers','broadcasts','email_templates')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy "signed in users read roles" on public.society_roles
  for select to authenticated using (active = true or private.is_admin());

create policy "admins manage roles" on public.society_roles
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins manage invitations" on public.invitations
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins manage subscribers" on public.subscribers
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins manage broadcasts" on public.broadcasts
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins manage email templates" on public.email_templates
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Newsletter signup should use a validated endpoint before this is enabled.
-- There is deliberately no anonymous insert policy on subscribers.

grant select on public.society_roles to authenticated;
grant all on public.society_roles, public.invitations, public.subscribers, public.broadcasts, public.email_templates to authenticated;

insert into public.society_roles (slug, label, description, access_level, seats, sort_order) values
  ('founding-lead', 'Founding Lead', 'Coordinates the launch, board, and external relationships.', 'admin', 2, 10),
  ('operations-finance', 'Operations and Finance Coordinator', 'Keeps meeting, budget, room, and follow-up records accurate.', 'editor', 2, 20),
  ('projects-coordinator', 'Projects Coordinator', 'Helps teams define scope, safety, milestones, and documentation.', 'editor', 2, 30),
  ('programs-coordinator', 'Programs Coordinator', 'Organizes practical events, speakers, and member feedback.', 'editor', 2, 40),
  ('communications-coordinator', 'Communications Coordinator', 'Keeps membership information, the website, and social updates current.', 'editor', 2, 50)
on conflict (slug) do update set
  label = excluded.label,
  description = excluded.description,
  access_level = excluded.access_level,
  seats = excluded.seats,
  sort_order = excluded.sort_order,
  active = true;

commit;
