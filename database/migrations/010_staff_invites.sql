-- Invite-only OEC staff activation. Application invite records are the source of truth
-- for whether an authenticated Supabase identity may become staff.

do $$ begin
  create type public.staff_invite_status as enum ('INVITED','ACCEPTED','REVOKED','EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.staff_account_status as enum ('ACTIVE','SUSPENDED','REVOKED');
exception when duplicate_object then null; end $$;

alter table public.admin_profiles
  add column if not exists status public.staff_account_status not null default 'ACTIVE';

update public.admin_profiles set status='SUSPENDED' where active=false and status='ACTIVE';

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  role public.admin_role not null check (role in ('ADMIN','EDITOR')),
  scopes text[] not null default '{}',
  can_publish boolean not null default false,
  token_hash text not null unique,
  status public.staff_invite_status not null default 'INVITED',
  expires_at timestamptz not null,
  invited_by uuid not null references public.admin_profiles(user_id),
  accepted_user_id uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists staff_invites_open_email_idx
  on public.staff_invites(lower(email)) where status='INVITED';
create index if not exists staff_invites_recent_idx on public.staff_invites(created_at desc);

alter table public.staff_invites enable row level security;

drop policy if exists "super admins read staff invites" on public.staff_invites;
create policy "super admins read staff invites" on public.staff_invites
  for select to authenticated using(private.is_super_admin());

drop policy if exists "super admins manage staff invites" on public.staff_invites;
create policy "super admins manage staff invites" on public.staff_invites
  for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());

create or replace function public.accept_staff_invite(p_invite_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_invite public.staff_invites%rowtype;
  v_auth_email text;
begin
  select * into v_invite from public.staff_invites where id=p_invite_id for update;
  if not found then raise exception 'STAFF_INVITE_NOT_FOUND'; end if;
  if v_invite.status='REVOKED' then raise exception 'STAFF_INVITE_REVOKED'; end if;
  if v_invite.status='ACCEPTED' then raise exception 'STAFF_INVITE_USED'; end if;
  if v_invite.status='EXPIRED' or v_invite.expires_at<=now() then
    update public.staff_invites set status='EXPIRED' where id=p_invite_id and status='INVITED';
    raise exception 'STAFF_INVITE_EXPIRED';
  end if;
  if v_invite.status<>'INVITED' then raise exception 'STAFF_INVITE_INVALID_STATE'; end if;

  select lower(email) into v_auth_email from auth.users where id=p_user_id;
  if v_auth_email is null or v_auth_email<>lower(v_invite.email) then
    raise exception 'STAFF_INVITE_IDENTITY_MISMATCH';
  end if;

  insert into public.admin_profiles(user_id,display_name,active,status)
  values(p_user_id,v_invite.display_name,true,'ACTIVE')
  on conflict(user_id) do update set
    display_name=excluded.display_name,
    active=true,
    status='ACTIVE';

  insert into public.role_assignments(user_id,role,scopes,can_publish)
  values(p_user_id,v_invite.role,v_invite.scopes,case when v_invite.role='EDITOR' then v_invite.can_publish else false end)
  on conflict(user_id) do update set
    role=excluded.role,
    scopes=excluded.scopes,
    can_publish=excluded.can_publish;

  update public.staff_invites set
    status='ACCEPTED',
    accepted_user_id=p_user_id,
    accepted_at=now()
  where id=p_invite_id;

  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
  values(p_user_id,'STAFF_INVITE_ACCEPTED','staff_invite',p_invite_id::text,
    jsonb_build_object('email',v_invite.email,'role',v_invite.role,'scopes',v_invite.scopes));

  return jsonb_build_object('invite_id',p_invite_id,'role',v_invite.role);
end;
$$;

revoke all on function public.accept_staff_invite(uuid,uuid) from public,anon,authenticated;
grant execute on function public.accept_staff_invite(uuid,uuid) to service_role;
