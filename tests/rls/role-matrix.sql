-- Structural launch assertions. Run after all migrations against an isolated
-- Supabase database; E2E tests exercise the same boundaries with real JWTs.
begin;

do $$
declare t text;
begin
  foreach t in array array[
    'staff_invites','membership_requests','member_profiles','member_privacy_settings',
    'project_proposals','project_memberships','project_applications','project_team_invites',
    'project_milestones','project_update_reviews','page_drafts','content_drafts','media'
  ] loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity) then
      raise exception 'RLS must be enabled on public.%',t;
    end if;
  end loop;

  if not exists(select 1 from pg_policies where schemaname='public' and tablename='staff_invites' and policyname='super admins manage staff invites' and cmd='ALL') then
    raise exception 'staff invites must be Super-Admin managed';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='membership_requests' and cmd in ('UPDATE','ALL')) then
    raise exception 'membership approval must not expose direct authenticated UPDATE';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='member_profiles' and cmd in ('UPDATE','INSERT','DELETE','ALL')) then
    raise exception 'member identity/profile lifecycle must use constrained RPCs';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='project_memberships' and cmd in ('INSERT','UPDATE','DELETE','ALL')) then
    raise exception 'project roster mutations must be transaction-only';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='media' and policyname='scoped staff manage media' and cmd='ALL') then
    raise exception 'media mutation must require assigned media scope';
  end if;
  if not exists(select 1 from pg_trigger where tgname='enforce_canonical_media_policy' and not tgisinternal) then
    raise exception 'canonical generated-image publication guard missing';
  end if;
  if not exists(select 1 from pg_trigger where tgname='enforce_page_version_media_policy' and not tgisinternal) then
    raise exception 'page-version generated-image publication guard missing';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='page_drafts' and policyname='staff read page drafts') then
    raise exception 'page drafts must be staff-scoped';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='content_drafts' and policyname='staff read content drafts') then
    raise exception 'content drafts must be staff-scoped';
  end if;
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='search_member_directory') then
    raise exception 'privacy-safe member directory RPC missing';
  end if;
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='is_project_lead') then
    raise exception 'project-scoped lead helper missing';
  end if;
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='bootstrap_first_super_admin') then
    raise exception 'first Super Admin bootstrap RPC missing';
  end if;
  if has_function_privilege('authenticated','public.bootstrap_first_super_admin(uuid,text)','EXECUTE') or has_function_privilege('anon','public.bootstrap_first_super_admin(uuid,text)','EXECUTE') then
    raise exception 'first Super Admin bootstrap must not be executable by app users';
  end if;
  if not has_function_privilege('service_role','public.bootstrap_first_super_admin(uuid,text)','EXECUTE') then
    raise exception 'first Super Admin bootstrap must be service-role executable';
  end if;
end $$;

rollback;
