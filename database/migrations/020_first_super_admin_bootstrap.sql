-- One-time, service-role-only bootstrap for the first OEC Super Admin.
-- Normal staff creation remains invite-only through public.staff_invites.

create or replace function public.bootstrap_first_super_admin(p_user_id uuid, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text;
  v_name text := btrim(coalesce(p_display_name,''));
  v_existing_count integer;
begin
  -- Serialize bootstrap attempts so two deployment operators cannot create two first admins.
  perform pg_advisory_xact_lock(hashtext('oec:first-super-admin-bootstrap'));

  if length(v_name) < 2 then raise exception 'DISPLAY_NAME_REQUIRED'; end if;

  select lower(email) into v_email from auth.users where id=p_user_id;
  if v_email is null then raise exception 'AUTH_USER_NOT_FOUND'; end if;

  select count(*) into v_existing_count
  from public.role_assignments ra
  join public.admin_profiles ap on ap.user_id=ra.user_id
  where ra.role='SUPER_ADMIN'::public.admin_role
    and ap.active=true
    and ap.status='ACTIVE'::public.staff_account_status;

  if v_existing_count > 0 then raise exception 'SUPER_ADMIN_ALREADY_BOOTSTRAPPED'; end if;

  insert into public.admin_profiles(user_id,display_name,active,status)
  values(p_user_id,v_name,true,'ACTIVE')
  on conflict(user_id) do update set
    display_name=excluded.display_name,
    active=true,
    status='ACTIVE';

  insert into public.role_assignments(user_id,role,scopes,can_publish)
  values(p_user_id,'SUPER_ADMIN','{}'::text[],false)
  on conflict(user_id) do update set
    role='SUPER_ADMIN',
    scopes='{}'::text[],
    can_publish=false;

  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
  values(p_user_id,'FIRST_SUPER_ADMIN_BOOTSTRAPPED','admin_user',p_user_id::text,
    jsonb_build_object('email',v_email,'role','SUPER_ADMIN'));

  return jsonb_build_object('user_id',p_user_id,'email',v_email,'role','SUPER_ADMIN');
end;
$$;

revoke all on function public.bootstrap_first_super_admin(uuid,text) from public,anon,authenticated;
grant execute on function public.bootstrap_first_super_admin(uuid,text) to service_role;
