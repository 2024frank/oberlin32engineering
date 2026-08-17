-- Atomic review of member project proposals. Approval creates exactly one draft
-- canonical project and makes the proposer the active Project Lead.
create or replace function public.approve_project_proposal(p_proposal_id uuid,p_reviewer_id uuid,p_feedback text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_proposal public.project_proposals%rowtype;
  v_reviewer_role public.admin_role;
  v_project_id uuid;
  v_slug text;
  v_member public.member_profiles%rowtype;
begin
  select ra.role into v_reviewer_role from public.role_assignments ra
    join public.admin_profiles ap on ap.user_id=ra.user_id
    where ra.user_id=p_reviewer_id and ap.active=true and ap.status='ACTIVE';
  if v_reviewer_role not in ('ADMIN','SUPER_ADMIN') then raise exception 'PROJECT_PROPOSAL_REVIEW_FORBIDDEN'; end if;

  select * into v_proposal from public.project_proposals where id=p_proposal_id for update;
  if not found then raise exception 'PROJECT_PROPOSAL_NOT_FOUND'; end if;
  select * into v_member from public.member_profiles where user_id=v_proposal.proposer_user_id and status='ACTIVE';
  if not found then raise exception 'PROJECT_PROPOSER_NOT_ACTIVE'; end if;

  if v_proposal.status='APPROVED' and v_proposal.approved_project_id is not null then
    return jsonb_build_object('proposalId',v_proposal.id,'status','APPROVED','projectId',v_proposal.approved_project_id,
      'title',v_proposal.title,'email',v_member.oberlin_email,'displayName',v_member.display_name,
      'membership',jsonb_build_object('userId',v_member.user_id,'role','LEAD','status','ACTIVE'));
  end if;
  if v_proposal.status<>'PENDING' then raise exception 'PROJECT_PROPOSAL_NOT_PENDING'; end if;

  v_project_id:=gen_random_uuid();
  v_slug:=trim(both '-' from regexp_replace(lower(v_proposal.title),'[^a-z0-9]+','-','g'))||'-'||left(v_proposal.id::text,8);
  insert into public.projects(id,slug,title,summary,problem,goal,disciplines,status,recruiting,lead_name,next_step,publication_state)
  values(v_project_id,v_slug,v_proposal.title,v_proposal.summary,v_proposal.problem,v_proposal.goal,v_proposal.disciplines,'proposed',
    length(trim(v_proposal.recruiting_needs))>0,v_member.display_name,'Define scope, milestones, and team roles','draft');

  insert into public.project_memberships(project_id,user_id,role,status)
  values(v_project_id,v_proposal.proposer_user_id,'LEAD','ACTIVE');

  update public.project_proposals set status='APPROVED',admin_feedback=p_feedback,reviewed_by=p_reviewer_id,reviewed_at=now(),approved_project_id=v_project_id,updated_at=now()
    where id=p_proposal_id;

  insert into public.member_notifications(user_id,kind,title,body,action_url)
  values(v_proposal.proposer_user_id,'PROJECT_PROPOSAL_APPROVED','Project proposal approved',
    'Your proposal “'||v_proposal.title||'” was approved. Your private project workspace is ready.',
    '/member/teams/'||v_project_id::text);

  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
  values(p_reviewer_id,'PROJECT_PROPOSAL_APPROVED','project_proposal',v_proposal.id::text,
    jsonb_build_object('status',v_proposal.status),jsonb_build_object('status','APPROVED','project_id',v_project_id,'lead_user_id',v_proposal.proposer_user_id));

  return jsonb_build_object('proposalId',v_proposal.id,'status','APPROVED','projectId',v_project_id,'title',v_proposal.title,
    'email',v_member.oberlin_email,'displayName',v_member.display_name,
    'membership',jsonb_build_object('userId',v_proposal.proposer_user_id,'role','LEAD','status','ACTIVE'));
end;
$$;

create or replace function public.reject_project_proposal(p_proposal_id uuid,p_reviewer_id uuid,p_feedback text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_proposal public.project_proposals%rowtype;
  v_reviewer_role public.admin_role;
  v_member public.member_profiles%rowtype;
begin
  select ra.role into v_reviewer_role from public.role_assignments ra
    join public.admin_profiles ap on ap.user_id=ra.user_id
    where ra.user_id=p_reviewer_id and ap.active=true and ap.status='ACTIVE';
  if v_reviewer_role not in ('ADMIN','SUPER_ADMIN') then raise exception 'PROJECT_PROPOSAL_REVIEW_FORBIDDEN'; end if;
  select * into v_proposal from public.project_proposals where id=p_proposal_id for update;
  if not found then raise exception 'PROJECT_PROPOSAL_NOT_FOUND'; end if;
  select * into v_member from public.member_profiles where user_id=v_proposal.proposer_user_id;
  if v_proposal.status='REJECTED' then
    return jsonb_build_object('proposalId',v_proposal.id,'status','REJECTED','title',v_proposal.title,'email',v_member.oberlin_email,'displayName',v_member.display_name);
  end if;
  if v_proposal.status<>'PENDING' then raise exception 'PROJECT_PROPOSAL_NOT_PENDING'; end if;
  update public.project_proposals set status='REJECTED',admin_feedback=p_feedback,reviewed_by=p_reviewer_id,reviewed_at=now(),updated_at=now() where id=p_proposal_id;
  insert into public.member_notifications(user_id,kind,title,body,action_url)
  values(v_proposal.proposer_user_id,'PROJECT_PROPOSAL_REJECTED','Project proposal review complete',
    'Your proposal “'||v_proposal.title||'” needs a different direction before it can become an OEC project.','/member/proposals');
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
  values(p_reviewer_id,'PROJECT_PROPOSAL_REJECTED','project_proposal',v_proposal.id::text,jsonb_build_object('status',v_proposal.status),jsonb_build_object('status','REJECTED','feedback',p_feedback));
  return jsonb_build_object('proposalId',v_proposal.id,'status','REJECTED','title',v_proposal.title,'email',v_member.oberlin_email,'displayName',v_member.display_name);
end;
$$;

revoke all on function public.approve_project_proposal(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.reject_project_proposal(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.approve_project_proposal(uuid,uuid,text) to service_role;
grant execute on function public.reject_project_proposal(uuid,uuid,text) to service_role;
