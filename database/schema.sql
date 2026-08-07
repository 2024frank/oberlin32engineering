-- Oberlin 3-2 Engineering Society content platform
-- Run in a new Supabase project's SQL editor. Re-running is safe.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

-- Application roles used by the administrator studio.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor');
  end if;
end
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'editor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'editor')
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create table if not exists public.site_settings (
  id text primary key default 'main',
  settings jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  slug text not null unique,
  title text not null,
  kicker text not null default '',
  summary text not null default '',
  description text not null default '',
  category text not null default '',
  status text not null default 'Active',
  year text not null default '',
  progress integer not null default 0 check (progress between 0 and 100),
  featured boolean not null default false,
  published boolean not null default false,
  skills jsonb not null default '[]'::jsonb,
  open_roles jsonb not null default '[]'::jsonb,
  team_names jsonb not null default '[]'::jsonb,
  accent text not null default 'gold',
  cover_url text not null default '',
  impact text not null default '',
  project_url text not null default '',
  github_url text not null default '',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_updates (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  title text not null,
  summary text not null default '',
  body text not null default '',
  milestone text not null default '',
  published_at date,
  image_url text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leaders (
  id text primary key,
  name text not null,
  role text not null,
  term text not null default '',
  class_year text not null default '',
  major text not null default '',
  bio text not null default '',
  photo_url text not null default '',
  linkedin_url text not null default '',
  email text not null default '',
  current boolean not null default true,
  advisor boolean not null default false,
  open_seat boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  description text not null default '',
  event_type text not null default 'Event',
  date_label text not null default '',
  start_at timestamptz,
  end_at timestamptz,
  location text not null default '',
  registration_url text not null default '',
  cover_url text not null default '',
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id text primary key,
  title text not null,
  description text not null default '',
  category text not null default '',
  source text not null default '',
  url text not null default '',
  pinned boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id text primary key,
  title text not null,
  organization text not null default '',
  type text not null default 'Opportunity',
  description text not null default '',
  deadline_label text not null default '',
  deadline date,
  location text not null default '',
  url text not null default '',
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_posts (
  id text primary key,
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  author text not null default '',
  published_at date,
  cover_url text not null default '',
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_editions (
  id text primary key,
  year text not null,
  title text not null,
  eyebrow text not null default '',
  theme text not null default '',
  tagline text not null default '',
  description text not null default '',
  status text not null default '',
  season text not null default '',
  registration_open boolean not null default false,
  registration_deadline date,
  event_date date,
  venue text not null default '',
  hero_url text not null default '',
  prize_pool text not null default '',
  rules_url text not null default '',
  results_published boolean not null default false,
  published boolean not null default false,
  tracks jsonb not null default '[]'::jsonb,
  stages jsonb not null default '[]'::jsonb,
  criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campus, community, alumni, competition, and financial partners.
create table if not exists public.sponsors (
  id text primary key,
  name text not null,
  tier text not null default '',
  logo_url text not null default '',
  url text not null default '',
  description text not null default '',
  active boolean not null default true,
  published boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Official 3-2 partner-school reference cards. These are separate from sponsors.
create table if not exists public.partner_schools (
  id text primary key,
  name text not null,
  short_name text not null default '',
  location text not null default '',
  region_code text not null default '',
  url text not null default '',
  questions jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.impact (
  id text primary key default 'main',
  founded text not null default '',
  current_term text not null default '',
  operating_stage text not null default '',
  public_metrics jsonb not null default '[]'::jsonb,
  milestones jsonb not null default '[]'::jsonb,
  reports jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text primary key,
  title text not null,
  category text not null default '',
  description text not null default '',
  url text not null default '',
  format text not null default '',
  published boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (char_length(type) between 1 and 80),
  full_name text not null default '' check (char_length(full_name) <= 160),
  email text not null default '' check (char_length(email) <= 320),
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) <= 65536),
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique,
  public_url text not null,
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id text not null default '',
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function private.log_content_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
  item_id text;
begin
  if tg_op = 'DELETE' then
    payload := to_jsonb(old);
  else
    payload := to_jsonb(new);
  end if;
  item_id := coalesce(payload ->> 'id', '');
  insert into public.content_audit (actor_id, table_name, record_id, action, snapshot)
  values ((select auth.uid()), tg_table_name, item_id, tg_op, payload);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Useful indexes for public and administrative queries.
create index if not exists projects_public_order_idx on public.projects (published, featured desc, sort_order, title);
create index if not exists project_updates_project_date_idx on public.project_updates (project_id, published, published_at desc);
create index if not exists leaders_term_idx on public.leaders (published, current desc, term desc, sort_order);
create index if not exists events_start_idx on public.events (published, start_at, title);
create index if not exists news_date_idx on public.news_posts (published, published_at desc);
create index if not exists submissions_status_idx on public.submissions (status, created_at desc);
create index if not exists content_audit_date_idx on public.content_audit (created_at desc);

-- Keep updated_at accurate.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','site_settings','projects','project_updates','leaders','events','resources','opportunities',
    'news_posts','competition_editions','sponsors','partner_schools','impact','documents','submissions','media'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name);
  end loop;
end
$$;

-- Record content changes for accountability and board handoff.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'site_settings','projects','project_updates','leaders','events','resources','opportunities',
    'news_posts','competition_editions','sponsors','partner_schools','impact','documents'
  ] loop
    execute format('drop trigger if exists log_content_change on public.%I', table_name);
    execute format('create trigger log_content_change after insert or update or delete on public.%I for each row execute function private.log_content_change()', table_name);
  end loop;
end
$$;

-- Row-level security.
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.leaders enable row level security;
alter table public.events enable row level security;
alter table public.resources enable row level security;
alter table public.opportunities enable row level security;
alter table public.news_posts enable row level security;
alter table public.competition_editions enable row level security;
alter table public.sponsors enable row level security;
alter table public.partner_schools enable row level security;
alter table public.impact enable row level security;
alter table public.documents enable row level security;
alter table public.submissions enable row level security;
alter table public.media enable row level security;
alter table public.content_audit enable row level security;

-- Remove policies if this file is re-run.
do $$
declare
  row record;
begin
  for row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','site_settings','projects','project_updates','leaders','events','resources','opportunities',
        'news_posts','competition_editions','sponsors','partner_schools','impact','documents','submissions','media','content_audit'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', row.policyname, row.schemaname, row.tablename);
  end loop;
end
$$;

create policy "Users read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_staff());
create policy "Admins manage profiles" on public.profiles
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Public reads settings" on public.site_settings
  for select to anon, authenticated using (published = true);
create policy "Managers control settings" on public.site_settings
  for all to authenticated using (private.is_staff()) with check (private.is_staff());

-- Public visitors only see published content. Editors and admins manage it.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects','project_updates','leaders','events','resources','opportunities','news_posts',
    'competition_editions','sponsors','partner_schools','impact','documents'
  ] loop
    execute format('create policy "Public reads published %1$s" on public.%1$I for select to anon, authenticated using (published = true)', table_name);
    execute format('create policy "Managers control %1$s" on public.%1$I for all to authenticated using (private.is_staff()) with check (private.is_staff())', table_name);
  end loop;
end
$$;

create policy "Public creates submissions" on public.submissions
  for insert to anon, authenticated with check (true);
create policy "Managers read submissions" on public.submissions
  for select to authenticated using (private.is_staff());
create policy "Managers update submissions" on public.submissions
  for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Managers delete submissions" on public.submissions
  for delete to authenticated using (private.is_staff());

create policy "Public reads media records" on public.media
  for select to anon, authenticated using (true);
create policy "Managers control media records" on public.media
  for all to authenticated using (private.is_staff()) with check (private.is_staff());

create policy "Managers read content audit" on public.content_audit
  for select to authenticated using (private.is_staff());

-- API grants. Row-level security remains the authority.
grant usage on schema public to anon, authenticated;
grant select on public.site_settings, public.projects, public.project_updates, public.leaders, public.events,
  public.resources, public.opportunities, public.news_posts, public.competition_editions, public.sponsors,
  public.partner_schools, public.impact, public.documents, public.media to anon, authenticated;
grant insert on public.submissions to anon, authenticated;
grant all on public.profiles, public.site_settings, public.projects, public.project_updates, public.leaders,
  public.events, public.resources, public.opportunities, public.news_posts, public.competition_editions,
  public.sponsors, public.partner_schools, public.impact, public.documents, public.submissions, public.media to authenticated;
grant select on public.content_audit to authenticated;

grant usage on schema private to authenticated;
revoke all on function private.is_staff() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.log_content_change() from public;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Public media bucket. Editors and admins control writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'society-media',
  'society-media',
  true,
  15728640,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads society media" on storage.objects;
drop policy if exists "Managers upload society media" on storage.objects;
drop policy if exists "Managers update society media" on storage.objects;
drop policy if exists "Managers delete society media" on storage.objects;

create policy "Public reads society media" on storage.objects
  for select to public using (bucket_id = 'society-media');
create policy "Managers upload society media" on storage.objects
  for insert to authenticated with check (bucket_id = 'society-media' and private.is_staff());
create policy "Managers update society media" on storage.objects
  for update to authenticated using (bucket_id = 'society-media' and private.is_staff())
  with check (bucket_id = 'society-media' and private.is_staff());
create policy "Managers delete society media" on storage.objects
  for delete to authenticated using (bucket_id = 'society-media' and private.is_staff());
