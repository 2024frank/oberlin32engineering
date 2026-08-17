-- Private project workspaces, milestones, roster controls, and review-gated
-- member-authored project updates.

create or replace function public.list_my_project_workspaces()
returns table(project_id uuid,title text,slug text,project_status text,publication_state text,membership_role public.project_membership_role,recruiting boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  return query select p.id,p.title,p.slug,p.status,p.publication_state,pm.role,p.recruiting
  from public.project_memberships pm join public.projects p on p.id=pm.project_id
  where pm.user_id=(select auth.uid()) and pm.status='ACTIVE' order by lower(p.title);
end $$;

create or replace function public.get_project_workspace(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_project public.projects%rowtype;v_role public.project_membership_role;begin
  if not private.is_project_member(p_project_id) then raise exception 'PROJECT_WORKSPACE_FORBIDDEN';end if;
  select * into v_project from public.projects where id=p_project_id;if not found then raise exception 'PROJECT_NOT_FOUND';end if;
  select role into v_role from public.project_memberships where project_id=p_project_id and user_id=(select auth.uid()) and status='ACTIVE';
  return jsonb_build_object(
    'project',jsonb_build_object('id',v_project.id,'title',v_project.title,'slug',v_project.slug,'summary',v_project.summary,'status',v_project.status,'publicationState',v_project.publication_state,'recruiting',v_project.recruiting),
    'myRole',v_role,
    'roster',coalesce((select jsonb_agg(jsonb_build_object('userId',pm.user_id,'displayName',mp.display_name,'role',pm.role,'joinedAt',pm.joined_at) order by case when pm.role='LEAD' then 0 else 1 end,lower(mp.display_name)) from public.project_memberships pm join public.member_profiles mp on mp.user_id=pm.user_id where pm.project_id=p_project_id and pm.status='ACTIVE'),'[]'::jsonb),
    'milestones',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'description',m.description,'status',m.status,'dueDate',m.due_date,'sortOrder',m.sort_order) order by m.sort_order,m.created_at) from public.project_milestones m where m.project_id=p_project_id),'[]'::jsonb),
    'updates',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'title',u.title,'summary',u.summary,'reviewStatus',r.status,'reviewFeedback',r.review_feedback,'submittedAt',r.submitted_at,'publicationState',u.publication_state) order by r.submitted_at desc) from public.project_update_reviews r join public.project_updates u on u.id=r.project_update_id where r.project_id=p_project_id),'[]'::jsonb)
  );
end $$;

create or replace function public.upsert_project_milestone(p_project_id uuid,p_milestone_id uuid,p_title text,p_description text,p_status text,p_due_date date,p_sort_order integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
  if not private.is_project_lead(p_project_id) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  if length(trim(coalesce(p_title,'')))<2 then raise exception 'MILESTONE_TITLE_REQUIRED';end if;
  if p_status not in ('TODO','IN_PROGRESS','BLOCKED','DONE') then raise exception 'MILESTONE_STATUS_INVALID';end if;
  if p_milestone_id is null then
    insert into public.project_milestones(project_id,title,description,status,due_date,sort_order,created_by)
    values(p_project_id,trim(p_title),trim(coalesce(p_description,'')),p_status::public.project_milestone_status,p_due_date,coalesce(p_sort_order,100),(select auth.uid())) returning id into v_id;
  else
    update public.project_milestones set title=trim(p_title),description=trim(coalesce(p_description,'')),status=p_status::public.project_milestone_status,due_date=p_due_date,sort_order=coalesce(p_sort_order,100),updated_at=now()
    where id=p_milestone_id and project_id=p_project_id returning id into v_id;
    if v_id is null then raise exception 'MILESTONE_NOT_FOUND';end if;
  end if;
  return jsonb_build_object('id',v_id,'status',p_status);
end $$;

create or replace function public.remove_project_member(p_project_id uuid,p_target_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_target public.project_memberships%rowtype;v_project_title text;begin
  if not private.is_project_lead(p_project_id) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  select * into v_target from public.project_memberships where project_id=p_project_id and user_id=p_target_user_id and status='ACTIVE' for update;
  if not found then raise exception 'PROJECT_MEMBER_NOT_FOUND';end if;
  if v_target.role='LEAD' then raise exception 'CANNOT_REMOVE_PROJECT_LEAD';end if;
  update public.project_memberships set status='REMOVED',updated_at=now() where project_id=p_project_id and user_id=p_target_user_id;
  select title into v_project_title from public.projects where id=p_project_id;
  insert into public.member_notifications(user_id,kind,title,body,action_url) values(p_target_user_id,'PROJECT_MEMBERSHIP_REMOVED','Project team membership updated','You are no longer on the “'||v_project_title||'” project team.','/member/teams');
end $$;

create or replace function public.submit_team_project_update(p_project_id uuid,p_title text,p_summary text,p_body text,p_milestone text,p_update_date date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_update_id uuid;begin
  if not private.is_project_member(p_project_id) then raise exception 'PROJECT_MEMBER_REQUIRED';end if;
  if length(trim(coalesce(p_title,'')))<3 then raise exception 'PROJECT_UPDATE_TITLE_REQUIRED';end if;
  if length(trim(coalesce(p_summary,'')))<10 and length(trim(coalesce(p_body,'')))<10 then raise exception 'PROJECT_UPDATE_CONTENT_REQUIRED';end if;
  insert into public.project_updates(project_id,title,summary,body,milestone,update_date,publication_state)
  values(p_project_id,trim(p_title),trim(coalesce(p_summary,'')),trim(coalesce(p_body,'')),trim(coalesce(p_milestone,'')),p_update_date,'draft') returning id into v_update_id;
  insert into public.content_drafts(entity_type,entity_id,payload,updated_by,updated_at)
  values('project_updates',v_update_id,jsonb_build_object('projectId',p_project_id,'title',trim(p_title),'summary',trim(coalesce(p_summary,'')),'body',trim(coalesce(p_body,'')),'milestone',trim(coalesce(p_milestone,'')),'updateDate',p_update_date,'mediaId',null),v_user,now());
  insert into public.project_update_reviews(project_update_id,project_id,submitted_by_user_id,status)
  values(v_update_id,p_project_id,v_user,'PENDING_REVIEW');
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot) values(v_user,'TEAM_PROJECT_UPDATE_SUBMITTED','project_update',v_update_id::text,jsonb_build_object('project_id',p_project_id,'review_status','PENDING_REVIEW'));
  return jsonb_build_object('updateId',v_update_id,'publicationState','draft','reviewStatus','PENDING_REVIEW');
end $$;

create or replace function public.review_team_project_update(p_update_id uuid,p_decision text,p_feedback text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_review public.project_update_reviews%rowtype;v_status public.project_update_review_status;v_title text;begin
  if not private.is_admin_or_super() then raise exception 'TEAM_UPDATE_REVIEW_FORBIDDEN';end if;
  select * into v_review from public.project_update_reviews where project_update_id=p_update_id for update;if not found then raise exception 'TEAM_UPDATE_REVIEW_NOT_FOUND';end if;
  if v_review.status not in ('PENDING_REVIEW','CHANGES_REQUESTED') then raise exception 'TEAM_UPDATE_REVIEW_INVALID_STATE';end if;
  v_status:=case p_decision when 'APPROVE' then 'APPROVED_FOR_PUBLISH'::public.project_update_review_status when 'CHANGES' then 'CHANGES_REQUESTED'::public.project_update_review_status when 'REJECT' then 'REJECTED'::public.project_update_review_status else null end;
  if v_status is null then raise exception 'TEAM_UPDATE_REVIEW_DECISION_INVALID';end if;
  update public.project_update_reviews set status=v_status,reviewed_by=v_user,review_feedback=p_feedback,reviewed_at=now(),updated_at=now() where project_update_id=p_update_id;
  select title into v_title from public.project_updates where id=p_update_id;
  insert into public.member_notifications(user_id,kind,title,body,action_url) values(v_review.submitted_by_user_id,'PROJECT_UPDATE_REVIEW','Project update review','Your update “'||v_title||'” is now '||replace(lower(v_status::text),'_',' ')||'.','/member/teams/'||v_review.project_id::text);
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot) values(v_user,'TEAM_PROJECT_UPDATE_REVIEWED','project_update',p_update_id::text,jsonb_build_object('review_status',v_status,'feedback',p_feedback));
  return jsonb_build_object('updateId',p_update_id,'reviewStatus',v_status);
end $$;

revoke all on function public.list_my_project_workspaces() from public,anon;
revoke all on function public.get_project_workspace(uuid) from public,anon;
revoke all on function public.upsert_project_milestone(uuid,uuid,text,text,text,date,integer) from public,anon;
revoke all on function public.remove_project_member(uuid,uuid) from public,anon;
revoke all on function public.submit_team_project_update(uuid,text,text,text,text,date) from public,anon;
revoke all on function public.review_team_project_update(uuid,text,text) from public,anon;
grant execute on function public.list_my_project_workspaces() to authenticated;
grant execute on function public.get_project_workspace(uuid) to authenticated;
grant execute on function public.upsert_project_milestone(uuid,uuid,text,text,text,date,integer) to authenticated;
grant execute on function public.remove_project_member(uuid,uuid) to authenticated;
grant execute on function public.submit_team_project_update(uuid,text,text,text,text,date) to authenticated;
grant execute on function public.review_team_project_update(uuid,text,text) to authenticated;
