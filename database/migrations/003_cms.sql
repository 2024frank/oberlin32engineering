-- Structured no-code page builder + immutable revisions.
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(), slug text not null unique, published_version_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.page_drafts (
  page_id uuid primary key references public.pages(id) on delete cascade, title text not null, seo_title text not null default '',
  seo_description text not null default '', og_media_id uuid references public.media(id) on delete set null,
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table if not exists public.page_sections (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade,
  stable_key text not null, section_type text not null, sort_order integer not null, is_visible boolean not null default true,
  draft_payload jsonb not null, unique(page_id,stable_key)
);
create table if not exists public.page_versions (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade,
  version_number integer not null, page_snapshot jsonb not null, sections_snapshot jsonb not null,
  published_by uuid references auth.users(id), published_at timestamptz not null default now(), restored_from uuid references public.page_versions(id),
  unique(page_id,version_number)
);
alter table public.pages drop constraint if exists pages_published_version_fk;
alter table public.pages add constraint pages_published_version_fk foreign key(published_version_id) references public.page_versions(id);

create table if not exists public.content_drafts (
  entity_type text not null, entity_id uuid not null, payload jsonb not null, updated_by uuid references auth.users(id), updated_at timestamptz not null default now(),
  primary key(entity_type,entity_id)
);
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null, version_number integer not null,
  snapshot jsonb not null, published_by uuid references auth.users(id), published_at timestamptz not null default now(), restored_from uuid references public.content_versions(id),
  unique(entity_type,entity_id,version_number)
);
create table if not exists public.scheduled_publications (
  id uuid primary key default gen_random_uuid(), target_type text not null, target_id uuid not null, scheduled_for timestamptz not null,
  payload_snapshot jsonb not null, requested_by uuid references auth.users(id), processed_at timestamptz, failure_message text,
  created_at timestamptz not null default now()
);
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null, entity_type text not null,
  entity_id text not null, before_snapshot jsonb, after_snapshot jsonb, created_at timestamptz not null default now()
);
create index if not exists page_sections_order_idx on public.page_sections(page_id,sort_order);
create index if not exists page_versions_lookup_idx on public.page_versions(page_id,version_number desc);
create index if not exists content_versions_lookup_idx on public.content_versions(entity_type,entity_id,version_number desc);
create index if not exists scheduled_due_idx on public.scheduled_publications(processed_at,scheduled_for);
create index if not exists audit_log_recent_idx on public.audit_log(created_at desc);

drop trigger if exists set_updated_at on public.pages;
create trigger set_updated_at before update on public.pages for each row execute function private.set_updated_at();
