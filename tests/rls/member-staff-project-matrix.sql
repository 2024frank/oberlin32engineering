-- Run after migrations against an isolated Supabase database. These assertions
-- validate policy/helper existence; role-behavior E2E tests validate live JWT contexts.
begin;

do $$
begin
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='is_project_lead') then
    raise exception 'missing private.is_project_lead';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='staff_invites' and policyname='super admins manage staff invites') then
    raise exception 'staff invite super-admin policy missing';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='member_profiles' and cmd='UPDATE') then
    raise exception 'member_profiles must not expose direct UPDATE policy';
  end if;
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='search_member_directory') then
    raise exception 'privacy-safe member directory function missing';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='project_memberships' and cmd in ('INSERT','UPDATE','DELETE','ALL')) then
    raise exception 'project roster must be transaction-only; direct member mutations are forbidden';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='membership_requests' and cmd in ('UPDATE','ALL')) then
    raise exception 'membership review must use constrained server RPCs';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='project_updates' and policyname ilike '%member%manage%') then
    raise exception 'member canonical publication mutation policy must not exist';
  end if;
end $$;

rollback;
