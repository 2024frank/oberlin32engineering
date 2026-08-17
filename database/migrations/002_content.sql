-- Normalized OEC public content tables.
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id text,
  file_name text not null,
  storage_path text not null unique,
  public_url text not null default '',
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  alt_text text not null default '',
  caption text not null default '',
  tags text[] not null default '{}',
  width integer,
  height integer,
  protected boolean not null default false,
  content_hash text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, slug text not null unique, title text not null,
  summary text not null default '', problem text not null default '', goal text not null default '', discipline text not null default '',
  disciplines text[] not null default '{}', status text not null default 'proposed' check(status in ('proposed','open_for_interest','scoping','active','complete')),
  recruiting boolean not null default false, skills text[] not null default '{}', lead_name text not null default '', next_step text not null default '',
  team_names text[] not null default '{}', timeline jsonb not null default '[]'::jsonb, cover_media_id uuid references public.media(id) on delete set null,
  external_url text not null default '', github_url text not null default '', sort_order integer not null default 100,
  publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, summary text not null default '', body text not null default '', milestone text not null default '', update_date date,
  media_id uuid references public.media(id) on delete set null, publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')),
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, slug text not null unique, title text not null,
  summary text not null default '', description text not null default '', event_type text not null default 'Event', start_at timestamptz, end_at timestamptz,
  organizer_name text not null default '', location text not null default '', access_details text not null default '', registration_url text not null default '',
  cover_media_id uuid references public.media(id) on delete set null, featured boolean not null default false,
  publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, title text not null, organization text not null default '',
  opportunity_type text not null default 'Opportunity', description text not null default '', deadline date, location text not null default '', url text not null default '',
  featured boolean not null default false, publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, title text not null, description text not null default '', category text not null default '',
  source_name text not null default '', url text not null default '', official_source boolean not null default false, source_url text not null default '',
  pinned boolean not null default false, sort_order integer not null default 100,
  publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, slug text not null unique, title text not null, excerpt text not null default '',
  body text not null default '', author text not null default '', cover_media_id uuid references public.media(id) on delete set null, featured boolean not null default false,
  publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.leaders (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, name text not null, role_title text not null, term text not null default '',
  class_year text not null default '', major text not null default '', bio text not null default '', photo_media_id uuid references public.media(id) on delete set null,
  linkedin_url text not null default '', email text not null default '', current boolean not null default true, advisor boolean not null default false,
  open_seat boolean not null default false, sort_order integer not null default 100,
  publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, name text not null, relationship_type text not null default 'collaborator',
  logo_media_id uuid references public.media(id) on delete set null, url text not null default '', description text not null default '', sort_order integer not null default 100,
  publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, title text not null, category text not null default '', description text not null default '',
  url text not null default '', format text not null default '', sort_order integer not null default 100,
  publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.partner_schools (
  id uuid primary key default gen_random_uuid(), legacy_source_id text, name text not null, short_name text not null default '', location text not null default '',
  official_url text not null, questions jsonb not null default '[]'::jsonb, sort_order integer not null default 100,
  publication_state text not null default 'draft' check(publication_state in ('draft','published','archived')), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(), type text not null, full_name text not null default '', email text not null default '', payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check(status in ('new','reviewed','archived')), network_hash text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(), label text not null, destination text not null, visible boolean not null default true,
  external boolean not null default false, sort_order integer not null default 100, publication_state text not null default 'published' check(publication_state in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key, value jsonb not null default '{}'::jsonb, publication_state text not null default 'published' check(publication_state in ('draft','published','archived')),
  updated_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists projects_public_idx on public.projects(publication_state,status,recruiting,sort_order);
create index if not exists events_public_idx on public.events(publication_state,start_at);
create index if not exists opportunities_deadline_idx on public.opportunities(publication_state,deadline);
create index if not exists news_public_idx on public.news_posts(publication_state,published_at desc);
create index if not exists submissions_status_idx on public.submissions(status,created_at desc);

do $$ declare t text; begin
  foreach t in array array['media','projects','project_updates','events','opportunities','resources','news_posts','leaders','sponsors','documents','partner_schools','submissions','navigation_items','site_settings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
  end loop;
end $$;
