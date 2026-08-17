-- Trace legacy records for repeatable, auditable migration without granting
-- any member or staff access. Full unique indexes are intentional so PostgREST
-- can use `on_conflict=legacy_source_id` during idempotent imports.
alter table public.submissions add column if not exists legacy_source_id text;

create unique index if not exists media_legacy_source_id_unique on public.media(legacy_source_id);
create unique index if not exists projects_legacy_source_id_unique on public.projects(legacy_source_id);
create unique index if not exists project_updates_legacy_source_id_unique on public.project_updates(legacy_source_id);
create unique index if not exists events_legacy_source_id_unique on public.events(legacy_source_id);
create unique index if not exists leaders_legacy_source_id_unique on public.leaders(legacy_source_id);
create unique index if not exists resources_legacy_source_id_unique on public.resources(legacy_source_id);
create unique index if not exists opportunities_legacy_source_id_unique on public.opportunities(legacy_source_id);
create unique index if not exists news_posts_legacy_source_id_unique on public.news_posts(legacy_source_id);
create unique index if not exists sponsors_legacy_source_id_unique on public.sponsors(legacy_source_id);
create unique index if not exists partner_schools_legacy_source_id_unique on public.partner_schools(legacy_source_id);
create unique index if not exists documents_legacy_source_id_unique on public.documents(legacy_source_id);
create unique index if not exists submissions_legacy_source_id_unique on public.submissions(legacy_source_id);
