-- Harden staff/member/community authorization. Application tables remain the
-- authorization source of truth even when a Supabase Auth session exists.

-- Staff helpers must honor both the legacy active flag and the lifecycle status.
create or replace function private.current_role()
returns public.admin_role language sql stable security definer set search_path='' as $$
  select ra.role from public.role_assignments ra
  join public.admin_profiles ap on ap.user_id=ra.user_id
  where ra.user_id=(select auth.uid()) and ap.active=true and ap.status='ACTIVE';
$$;

create or replace function private.current_scopes()
returns text[] language sql stable security definer set search_path='' as $$
  select coalesce(ra.scopes,'{}'::text[]) from public.role_assignments ra
  join public.admin_profiles ap on ap.user_id=ra.user_id
  where ra.user_id=(select auth.uid()) and ap.active=true and ap.status='ACTIVE';
$$;

create or replace function private.is_admin_or_super()
returns boolean language sql stable security definer set search_path='' as $$
  select private.current_role() in ('ADMIN'::public.admin_role,'SUPER_ADMIN'::public.admin_role);
$$;

create or replace function private.is_active_member()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.member_profiles mp
    where mp.user_id=(select auth.uid()) and mp.status='ACTIVE'
  );
$$;

create or replace function private.is_project_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.project_memberships pm
    join public.member_profiles mp on mp.user_id=pm.user_id
    where pm.project_id=p_project_id and pm.user_id=(select auth.uid())
      and pm.status='ACTIVE' and mp.status='ACTIVE'
  );
$$;

create or replace function private.is_project_lead(p_project_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.project_memberships pm
    join public.member_profiles mp on mp.user_id=pm.user_id
    where pm.project_id=p_project_id and pm.user_id=(select auth.uid())
      and pm.status='ACTIVE' and pm.role='LEAD' and mp.status='ACTIVE'
  );
$$;

-- Staff registry: staff may read coworkers, but only Super Admin may mutate staff or invites.
drop policy if exists "admins read profiles" on public.admin_profiles;
drop policy if exists "super admins manage profiles" on public.admin_profiles;
create policy "staff read profiles" on public.admin_profiles for select to authenticated using(private.is_staff());
create policy "super admins manage profiles" on public.admin_profiles for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());

drop policy if exists "admins read assignments" on public.role_assignments;
drop policy if exists "super admins manage assignments" on public.role_assignments;
create policy "staff read assignments" on public.role_assignments for select to authenticated using(private.is_staff());
create policy "super admins manage assignments" on public.role_assignments for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());

drop policy if exists "super admins read staff invites" on public.staff_invites;
drop policy if exists "super admins manage staff invites" on public.staff_invites;
create policy "super admins read staff invites" on public.staff_invites for select to authenticated using(private.is_super_admin());
create policy "super admins manage staff invites" on public.staff_invites for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());

-- Requests/profile data never become an authenticated-user directory by accident.
drop policy if exists "member reads own request" on public.membership_requests;
drop policy if exists "admins review member requests" on public.membership_requests;
create policy "member or reviewer reads membership request" on public.membership_requests for select to authenticated
  using(auth_user_id=(select auth.uid()) or private.is_admin_or_super());
-- Review mutations run through service-role-only approval/rejection RPCs, which verify
-- the authenticated reviewer supplied by the server route. No direct UPDATE policy is exposed.

drop policy if exists "member reads own profile" on public.member_profiles;
create policy "member reads own profile" on public.member_profiles for select to authenticated
  using(user_id=(select auth.uid()) or private.is_admin_or_super());
-- No direct UPDATE policy exists on member_profiles. Profile edits go through the
-- constrained update_my_member_profile RPC so status/email/identity cannot be altered.

drop policy if exists "member reads own privacy" on public.member_privacy_settings;
drop policy if exists "member manages own privacy" on public.member_privacy_settings;
create policy "member reads own privacy" on public.member_privacy_settings for select to authenticated
  using(user_id=(select auth.uid()) or private.is_admin_or_super());
create policy "active member manages own privacy" on public.member_privacy_settings for update to authenticated
  using(user_id=(select auth.uid()) and private.is_active_member())
  with check(user_id=(select auth.uid()) and private.is_active_member());

drop policy if exists "member reads own notifications" on public.member_notifications;
drop policy if exists "member updates own notifications" on public.member_notifications;
create policy "member reads own notifications" on public.member_notifications for select to authenticated
  using(user_id=(select auth.uid()) and private.is_active_member());
create policy "member updates own notifications" on public.member_notifications for update to authenticated
  using(user_id=(select auth.uid()) and private.is_active_member())
  with check(user_id=(select auth.uid()) and private.is_active_member());

create or replace function public.update_my_member_profile(
  p_display_name text,
  p_class_year smallint,
  p_major text,
  p_disciplines text[],
  p_skills text[],
  p_project_interests text[],
  p_availability text,
  p_portfolio_url text,
  p_github_url text,
  p_linkedin_url text
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
  if char_length(trim(coalesce(p_display_name,'')))<2 then raise exception 'DISPLAY_NAME_REQUIRED'; end if;
  update public.member_profiles set
    display_name=trim(p_display_name),
    class_year=p_class_year,
    major=nullif(trim(coalesce(p_major,'')),''),
    disciplines=coalesce(p_disciplines,'{}'::text[]),
    skills=coalesce(p_skills,'{}'::text[]),
    project_interests=coalesce(p_project_interests,'{}'::text[]),
    availability=nullif(trim(coalesce(p_availability,'')),''),
    portfolio_url=nullif(trim(coalesce(p_portfolio_url,'')),''),
    github_url=nullif(trim(coalesce(p_github_url,'')),''),
    linkedin_url=nullif(trim(coalesce(p_linkedin_url,'')),''),
    updated_at=now()
  where user_id=(select auth.uid());
end;
$$;
revoke all on function public.update_my_member_profile(text,smallint,text,text[],text[],text[],text,text,text,text) from public,anon;
grant execute on function public.update_my_member_profile(text,smallint,text,text[],text[],text[],text,text,text,text) to authenticated;

-- Privacy-safe directory surface. Direct member_profiles RLS never grants peer reads.
create or replace function public.search_member_directory(p_query text default null,p_limit integer default 60)
returns table(
  user_id uuid,
  display_name text,
  class_year smallint,
  major text,
  disciplines text[],
  skills text[],
  project_interests text[],
  availability text,
  portfolio_url text,
  github_url text,
  linkedin_url text,
  contact_email text
)
language plpgsql stable security definer set search_path='' as $$
begin
  if not (private.is_active_member() or private.is_staff()) then raise exception 'MEMBER_DIRECTORY_FORBIDDEN'; end if;
  return query
  select
    mp.user_id,
    case when 'display_name'=any(ps.visible_fields) then mp.display_name end,
    case when 'class_year'=any(ps.visible_fields) then mp.class_year end,
    case when 'major'=any(ps.visible_fields) then mp.major end,
    case when 'disciplines'=any(ps.visible_fields) then mp.disciplines end,
    case when 'skills'=any(ps.visible_fields) then mp.skills end,
    case when 'project_interests'=any(ps.visible_fields) then mp.project_interests end,
    case when 'availability'=any(ps.visible_fields) then mp.availability end,
    case when 'portfolio_url'=any(ps.visible_fields) then mp.portfolio_url end,
    case when 'github_url'=any(ps.visible_fields) then mp.github_url end,
    case when 'linkedin_url'=any(ps.visible_fields) then mp.linkedin_url end,
    case when ps.share_contact then mp.oberlin_email end
  from public.member_profiles mp
  join public.member_privacy_settings ps on ps.user_id=mp.user_id
  where mp.status='ACTIVE' and ps.directory_visible=true
    and (
      nullif(trim(coalesce(p_query,'')),'') is null or
      ('display_name'=any(ps.visible_fields) and mp.display_name ilike '%'||trim(p_query)||'%') or
      ('major'=any(ps.visible_fields) and coalesce(mp.major,'') ilike '%'||trim(p_query)||'%') or
      ('skills'=any(ps.visible_fields) and exists(select 1 from unnest(mp.skills) term where term ilike '%'||trim(p_query)||'%')) or
      ('disciplines'=any(ps.visible_fields) and exists(select 1 from unnest(mp.disciplines) term where term ilike '%'||trim(p_query)||'%')) or
      ('project_interests'=any(ps.visible_fields) and exists(select 1 from unnest(mp.project_interests) term where term ilike '%'||trim(p_query)||'%')) or
      ('availability'=any(ps.visible_fields) and coalesce(mp.availability,'') ilike '%'||trim(p_query)||'%')
    )
  order by lower(mp.display_name),mp.user_id
  limit greatest(1,least(coalesce(p_limit,60),100));
end;
$$;
revoke all on function public.search_member_directory(text,integer) from public,anon;
grant execute on function public.search_member_directory(text,integer) to authenticated;

-- Project proposals: active members own their proposals; Admin/Super Admin review them.
drop policy if exists "members read own project proposals" on public.project_proposals;
drop policy if exists "members create project proposals" on public.project_proposals;
drop policy if exists "admins read project proposals" on public.project_proposals;
create policy "members read own project proposals" on public.project_proposals for select to authenticated
  using(proposer_user_id=(select auth.uid()) or private.is_admin_or_super());
create policy "members create project proposals" on public.project_proposals for insert to authenticated
  with check(proposer_user_id=(select auth.uid()) and private.is_active_member() and status='PENDING');

-- Roster/workspace visibility is scoped to active project members (or Admin/Super Admin).
create policy "project members read team roles" on public.project_team_roles for select to authenticated
  using(private.is_project_member(project_id) or private.is_admin_or_super());
create policy "project leads manage team roles" on public.project_team_roles for all to authenticated
  using(private.is_project_lead(project_id)) with check(private.is_project_lead(project_id));

create policy "project members read roster" on public.project_memberships for select to authenticated
  using(private.is_project_member(project_id) or private.is_admin_or_super());
-- Roster membership is transaction-only: applications/invitations create/remove memberships
-- through server services. Leads cannot bypass acceptance by inserting membership rows directly.

create policy "project members read milestones" on public.project_milestones for select to authenticated
  using(private.is_project_member(project_id) or private.is_admin_or_super());
create policy "project leads manage milestones" on public.project_milestones for all to authenticated
  using(private.is_project_lead(project_id)) with check(private.is_project_lead(project_id));

create policy "members read relevant applications" on public.project_applications for select to authenticated
  using(applicant_user_id=(select auth.uid()) or private.is_project_lead(project_id) or private.is_admin_or_super());
create policy "members submit project applications" on public.project_applications for insert to authenticated
  with check(applicant_user_id=(select auth.uid()) and private.is_active_member() and status='PENDING');
-- Application decisions are server transactions because acceptance also creates membership.

create policy "members read relevant team invites" on public.project_team_invites for select to authenticated
  using(invited_user_id=(select auth.uid()) or invited_by_user_id=(select auth.uid()) or private.is_project_lead(project_id) or private.is_admin_or_super());
create policy "project leads create team invites" on public.project_team_invites for insert to authenticated
  with check(
    invited_by_user_id=(select auth.uid()) and private.is_project_lead(project_id) and status='PENDING'
    and exists(select 1 from public.member_profiles target where target.user_id=invited_user_id and target.status='ACTIVE')
  );
-- Invite response is intentionally a server transaction because accepting also creates membership.

create policy "project members read update review" on public.project_update_reviews for select to authenticated
  using(private.is_project_member(project_id) or private.is_admin_or_super());
-- No member mutation policy exists on canonical project_updates/publication state.
