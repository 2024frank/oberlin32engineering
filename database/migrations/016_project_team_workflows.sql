-- Transactional project applications and Project Lead invitations.

create or replace function public.submit_project_application(p_project_id uuid,p_motivation text,p_skills text[] default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_project public.projects%rowtype;v_id uuid;begin
  if v_user is null or not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  select * into v_project from public.projects where id=p_project_id and publication_state='published' and recruiting=true;
  if not found then raise exception 'PROJECT_NOT_ACCEPTING_APPLICATIONS';end if;
  if exists(select 1 from public.project_memberships where project_id=p_project_id and user_id=v_user and status='ACTIVE') then raise exception 'ALREADY_PROJECT_MEMBER';end if;
  if length(trim(coalesce(p_motivation,'')))<10 then raise exception 'APPLICATION_MOTIVATION_REQUIRED';end if;
  insert into public.project_applications(project_id,applicant_user_id,motivation,skills,status)
  values(p_project_id,v_user,trim(p_motivation),coalesce(p_skills,'{}'),'PENDING') returning id into v_id;
  insert into public.member_notifications(user_id,kind,title,body,action_url)
    select pm.user_id,'PROJECT_APPLICATION_RECEIVED','New project application',
      'A member applied to join “'||v_project.title||'”.','/member/teams/'||p_project_id::text
    from public.project_memberships pm where pm.project_id=p_project_id and pm.status='ACTIVE' and pm.role='LEAD';
  return jsonb_build_object('applicationId',v_id,'projectId',p_project_id,'projectTitle',v_project.title,'status','PENDING');
end $$;

create or replace function public.review_project_application(p_application_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_app public.project_applications%rowtype;v_project public.projects%rowtype;v_member public.member_profiles%rowtype;begin
  select * into v_app from public.project_applications where id=p_application_id for update;
  if not found then raise exception 'PROJECT_APPLICATION_NOT_FOUND';end if;
  if not private.is_project_lead(v_app.project_id) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  if v_app.status<>'PENDING' then raise exception 'PROJECT_APPLICATION_ALREADY_REVIEWED';end if;
  if p_decision not in ('ACCEPT','REJECT') then raise exception 'PROJECT_APPLICATION_DECISION_INVALID';end if;
  select * into v_project from public.projects where id=v_app.project_id;
  select * into v_member from public.member_profiles where user_id=v_app.applicant_user_id and status='ACTIVE';
  if not found then raise exception 'APPLICANT_NOT_ACTIVE';end if;
  if p_decision='ACCEPT' then
    insert into public.project_memberships(project_id,user_id,role,status) values(v_app.project_id,v_app.applicant_user_id,'MEMBER','ACTIVE')
      on conflict(project_id,user_id) do update set role='MEMBER',status='ACTIVE',updated_at=now();
    update public.project_applications set status='ACCEPTED',reviewed_by_user_id=v_user,reviewed_at=now(),decision_note=p_note,updated_at=now() where id=p_application_id;
    insert into public.member_notifications(user_id,kind,title,body,action_url) values(v_app.applicant_user_id,'PROJECT_APPLICATION_ACCEPTED','Project application accepted','You joined “'||v_project.title||'”.','/member/teams/'||v_app.project_id::text);
  else
    update public.project_applications set status='REJECTED',reviewed_by_user_id=v_user,reviewed_at=now(),decision_note=p_note,updated_at=now() where id=p_application_id;
    insert into public.member_notifications(user_id,kind,title,body,action_url) values(v_app.applicant_user_id,'PROJECT_APPLICATION_REJECTED','Project application update','Your application to “'||v_project.title||'” was not accepted at this time.','/member/applications');
  end if;
  return jsonb_build_object('applicationId',p_application_id,'projectId',v_app.project_id,'projectTitle',v_project.title,'status',case when p_decision='ACCEPT' then 'ACCEPTED' else 'REJECTED' end,'applicantUserId',v_app.applicant_user_id,'applicantEmail',v_member.oberlin_email,'applicantName',v_member.display_name);
end $$;

create or replace function public.create_project_team_invite(p_project_id uuid,p_invited_user_id uuid,p_message text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_target public.member_profiles%rowtype;v_project public.projects%rowtype;v_id uuid;begin
  if not private.is_project_lead(p_project_id) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  if p_invited_user_id=v_user then raise exception 'CANNOT_INVITE_SELF';end if;
  select * into v_target from public.member_profiles where user_id=p_invited_user_id and status='ACTIVE';if not found then raise exception 'MEMBER_NOT_INVITABLE';end if;
  if exists(select 1 from public.project_memberships where project_id=p_project_id and user_id=p_invited_user_id and status='ACTIVE') then raise exception 'ALREADY_PROJECT_MEMBER';end if;
  select * into v_project from public.projects where id=p_project_id;if not found then raise exception 'PROJECT_NOT_FOUND';end if;
  insert into public.project_team_invites(project_id,invited_user_id,invited_by_user_id,message,status)
  values(p_project_id,p_invited_user_id,v_user,trim(coalesce(p_message,'')),'PENDING') returning id into v_id;
  insert into public.member_notifications(user_id,kind,title,body,action_url) values(p_invited_user_id,'PROJECT_TEAM_INVITE','Project team invitation','You were invited to join “'||v_project.title||'”.','/member/invitations');
  return jsonb_build_object('inviteId',v_id,'projectId',p_project_id,'projectTitle',v_project.title,'status','PENDING','invitedUserId',p_invited_user_id,'invitedEmail',v_target.oberlin_email,'invitedName',v_target.display_name);
end $$;

create or replace function public.respond_project_team_invite(p_invite_id uuid,p_decision text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_invite public.project_team_invites%rowtype;v_project public.projects%rowtype;begin
  select * into v_invite from public.project_team_invites where id=p_invite_id for update;if not found then raise exception 'PROJECT_INVITE_NOT_FOUND';end if;
  if v_invite.invited_user_id<>v_user then raise exception 'PROJECT_INVITE_NOT_YOURS';end if;
  if v_invite.status<>'PENDING' then raise exception 'PROJECT_INVITE_ALREADY_RESPONDED';end if;
  if v_invite.expires_at<=now() then update public.project_team_invites set status='EXPIRED',updated_at=now() where id=p_invite_id;return jsonb_build_object('inviteId',p_invite_id,'status','EXPIRED');end if;
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  if p_decision not in ('ACCEPT','DECLINE') then raise exception 'PROJECT_INVITE_DECISION_INVALID';end if;
  select * into v_project from public.projects where id=v_invite.project_id;
  if p_decision='ACCEPT' then
    insert into public.project_memberships(project_id,user_id,role,status) values(v_invite.project_id,v_user,'MEMBER','ACTIVE')
      on conflict(project_id,user_id) do update set role='MEMBER',status='ACTIVE',updated_at=now();
    update public.project_team_invites set status='ACCEPTED',responded_at=now(),updated_at=now() where id=p_invite_id;
    insert into public.member_notifications(user_id,kind,title,body,action_url) values(v_invite.invited_by_user_id,'PROJECT_INVITE_ACCEPTED','Project invitation accepted','A member accepted your invitation to “'||v_project.title||'”.','/member/teams/'||v_invite.project_id::text);
  else
    update public.project_team_invites set status='DECLINED',responded_at=now(),updated_at=now() where id=p_invite_id;
  end if;
  return jsonb_build_object('inviteId',p_invite_id,'projectId',v_invite.project_id,'projectTitle',v_project.title,'status',case when p_decision='ACCEPT' then 'ACCEPTED' else 'DECLINED' end);
end $$;


create or replace function public.list_project_applications_for_lead(p_project_id uuid)
returns table(id uuid,project_id uuid,applicant_user_id uuid,applicant_name text,motivation text,skills text[],status public.project_application_status,decision_note text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_project_lead(p_project_id) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  return query select a.id,a.project_id,a.applicant_user_id,m.display_name,a.motivation,a.skills,a.status,a.decision_note,a.created_at
    from public.project_applications a join public.member_profiles m on m.user_id=a.applicant_user_id
    where a.project_id=p_project_id and a.status='PENDING' order by a.created_at;
end $$;

create or replace function public.list_my_project_team_invites()
returns table(id uuid,project_id uuid,project_title text,invited_user_id uuid,invited_by_user_id uuid,inviter_name text,message text,status public.project_invite_status,expires_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  return query select i.id,i.project_id,p.title,i.invited_user_id,i.invited_by_user_id,m.display_name,i.message,i.status,i.expires_at,i.created_at
    from public.project_team_invites i join public.projects p on p.id=i.project_id join public.member_profiles m on m.user_id=i.invited_by_user_id
    where i.invited_user_id=(select auth.uid()) order by i.created_at desc;
end $$;

revoke all on function public.submit_project_application(uuid,text,text[]) from public,anon;
revoke all on function public.review_project_application(uuid,text,text) from public,anon;
revoke all on function public.create_project_team_invite(uuid,uuid,text) from public,anon;
revoke all on function public.respond_project_team_invite(uuid,text) from public,anon;
revoke all on function public.list_project_applications_for_lead(uuid) from public,anon;
revoke all on function public.list_my_project_team_invites() from public,anon;
grant execute on function public.submit_project_application(uuid,text,text[]) to authenticated;
grant execute on function public.review_project_application(uuid,text,text) to authenticated;
grant execute on function public.create_project_team_invite(uuid,uuid,text) to authenticated;
grant execute on function public.respond_project_team_invite(uuid,text) to authenticated;
grant execute on function public.list_project_applications_for_lead(uuid) to authenticated;
grant execute on function public.list_my_project_team_invites() to authenticated;
