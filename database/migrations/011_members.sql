-- Verified Oberlin membership requests and approved member accounts.

do $$ begin
  create type public.membership_status as enum ('REQUESTED','EMAIL_VERIFIED','PENDING_APPROVAL','APPROVED','REJECTED','ACTIVE','SUSPENDED');
exception when duplicate_object then null; end $$;

create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  status public.membership_status not null default 'REQUESTED',
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email_verified_at timestamptz,
  reviewed_by uuid references public.admin_profiles(user_id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists membership_requests_email_idx on public.membership_requests(lower(email));
create index if not exists membership_requests_review_idx on public.membership_requests(status,created_at desc);

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  membership_request_id uuid not null unique references public.membership_requests(id) on delete restrict,
  oberlin_email text not null,
  display_name text not null,
  status public.membership_status not null default 'APPROVED',
  class_year smallint check(class_year between 2020 and 2100),
  major text,
  disciplines text[] not null default '{}',
  skills text[] not null default '{}',
  project_interests text[] not null default '{}',
  availability text,
  portfolio_url text,
  github_url text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(status in ('APPROVED','ACTIVE','SUSPENDED'))
);
create unique index if not exists member_profiles_email_idx on public.member_profiles(lower(oberlin_email));
create index if not exists member_profiles_status_idx on public.member_profiles(status);

create table if not exists public.member_privacy_settings (
  user_id uuid primary key references public.member_profiles(user_id) on delete cascade,
  directory_visible boolean not null default true,
  visible_fields text[] not null default array['display_name','class_year','major','disciplines','skills','project_interests','availability'],
  share_contact boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists member_notifications_unread_idx on public.member_notifications(user_id,read_at,created_at desc);

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

create or replace function public.verify_membership_request(p_request_id uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_request public.membership_requests%rowtype;
  v_auth_email text;
begin
  select * into v_request from public.membership_requests where id=p_request_id for update;
  if not found then raise exception 'MEMBERSHIP_REQUEST_NOT_FOUND'; end if;
  if v_request.status not in ('REQUESTED','EMAIL_VERIFIED') then raise exception 'MEMBERSHIP_VERIFICATION_INVALID_STATE'; end if;
  select lower(email) into v_auth_email from auth.users where id=p_user_id;
  if v_auth_email is null or v_auth_email<>lower(v_request.email) then raise exception 'MEMBERSHIP_IDENTITY_MISMATCH'; end if;
  if v_auth_email !~ '^[^@[:space:]]+@oberlin[.]edu$' then raise exception 'OBERLIN_EMAIL_REQUIRED'; end if;
  update public.membership_requests set
    auth_user_id=p_user_id,
    status='PENDING_APPROVAL',
    email_verified_at=coalesce(email_verified_at,now()),
    updated_at=now()
  where id=p_request_id;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
  values(p_user_id,'MEMBERSHIP_EMAIL_VERIFIED','membership_request',p_request_id::text,jsonb_build_object('email',v_request.email,'status','PENDING_APPROVAL'));
  return jsonb_build_object('request_id',p_request_id,'status','PENDING_APPROVAL');
end;
$$;

create or replace function public.approve_membership_request(p_request_id uuid,p_reviewer_id uuid,p_review_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_request public.membership_requests%rowtype;
  v_reviewer_role public.admin_role;
begin
  select ra.role into v_reviewer_role
  from public.role_assignments ra join public.admin_profiles ap on ap.user_id=ra.user_id
  where ra.user_id=p_reviewer_id and ap.active=true and ap.status='ACTIVE';
  if v_reviewer_role not in ('ADMIN','SUPER_ADMIN') then raise exception 'MEMBER_REVIEW_FORBIDDEN'; end if;

  select * into v_request from public.membership_requests where id=p_request_id for update;
  if not found then raise exception 'MEMBERSHIP_REQUEST_NOT_FOUND'; end if;
  if v_request.status<>'PENDING_APPROVAL' then raise exception 'MEMBERSHIP_NOT_READY_FOR_REVIEW'; end if;
  if v_request.auth_user_id is null then raise exception 'MEMBERSHIP_EMAIL_NOT_VERIFIED'; end if;

  insert into public.member_profiles(user_id,membership_request_id,oberlin_email,display_name,status)
  values(v_request.auth_user_id,v_request.id,lower(v_request.email),v_request.display_name,'APPROVED')
  on conflict(user_id) do update set
    membership_request_id=excluded.membership_request_id,
    oberlin_email=excluded.oberlin_email,
    display_name=excluded.display_name,
    status='APPROVED',
    updated_at=now();

  insert into public.member_privacy_settings(user_id)
  values(v_request.auth_user_id)
  on conflict(user_id) do nothing;

  update public.membership_requests set
    status='APPROVED',reviewed_by=p_reviewer_id,reviewed_at=now(),review_note=p_review_note,updated_at=now()
  where id=p_request_id;

  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
  values(p_reviewer_id,'MEMBERSHIP_APPROVED','membership_request',p_request_id::text,
    jsonb_build_object('status',v_request.status),jsonb_build_object('status','APPROVED','email',v_request.email));

  return jsonb_build_object('request_id',p_request_id,'user_id',v_request.auth_user_id,'email',v_request.email,'display_name',v_request.display_name,'status','APPROVED');
end;
$$;

create or replace function public.reject_membership_request(p_request_id uuid,p_reviewer_id uuid,p_review_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_request public.membership_requests%rowtype;
  v_reviewer_role public.admin_role;
begin
  select ra.role into v_reviewer_role
  from public.role_assignments ra join public.admin_profiles ap on ap.user_id=ra.user_id
  where ra.user_id=p_reviewer_id and ap.active=true and ap.status='ACTIVE';
  if v_reviewer_role not in ('ADMIN','SUPER_ADMIN') then raise exception 'MEMBER_REVIEW_FORBIDDEN'; end if;

  select * into v_request from public.membership_requests where id=p_request_id for update;
  if not found then raise exception 'MEMBERSHIP_REQUEST_NOT_FOUND'; end if;
  if v_request.status<>'PENDING_APPROVAL' then raise exception 'MEMBERSHIP_NOT_READY_FOR_REVIEW'; end if;

  update public.membership_requests set
    status='REJECTED',reviewed_by=p_reviewer_id,reviewed_at=now(),review_note=p_review_note,updated_at=now()
  where id=p_request_id;

  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
  values(p_reviewer_id,'MEMBERSHIP_REJECTED','membership_request',p_request_id::text,
    jsonb_build_object('status',v_request.status),jsonb_build_object('status','REJECTED','email',v_request.email,'review_note',p_review_note));

  return jsonb_build_object('request_id',p_request_id,'email',v_request.email,'display_name',v_request.display_name,'status','REJECTED');
end;
$$;

create or replace function public.activate_member(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_profile public.member_profiles%rowtype;
begin
  select * into v_profile from public.member_profiles where user_id=p_user_id for update;
  if not found then raise exception 'MEMBER_PROFILE_NOT_FOUND'; end if;
  if v_profile.status='ACTIVE' then return jsonb_build_object('user_id',p_user_id,'status','ACTIVE'); end if;
  if v_profile.status<>'APPROVED' then raise exception 'MEMBER_NOT_APPROVED'; end if;

  update public.member_profiles set status='ACTIVE',updated_at=now() where user_id=p_user_id;
  update public.membership_requests set status='ACTIVE',updated_at=now() where id=v_profile.membership_request_id;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
  values(p_user_id,'MEMBER_ACTIVATED','member_profile',p_user_id::text,jsonb_build_object('status','ACTIVE'));
  return jsonb_build_object('user_id',p_user_id,'status','ACTIVE');
end;
$$;

revoke all on function public.verify_membership_request(uuid,uuid) from public,anon,authenticated;
revoke all on function public.approve_membership_request(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.reject_membership_request(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.activate_member(uuid) from public,anon,authenticated;
grant execute on function public.verify_membership_request(uuid,uuid) to service_role;
grant execute on function public.approve_membership_request(uuid,uuid,text) to service_role;
grant execute on function public.reject_membership_request(uuid,uuid,text) to service_role;
grant execute on function public.activate_member(uuid) to service_role;

alter table public.membership_requests enable row level security;
alter table public.member_profiles enable row level security;
alter table public.member_privacy_settings enable row level security;
alter table public.member_notifications enable row level security;

drop policy if exists "member reads own request" on public.membership_requests;
create policy "member reads own request" on public.membership_requests for select to authenticated
  using(auth_user_id=(select auth.uid()) or private.is_admin_or_super());

drop policy if exists "admins review member requests" on public.membership_requests;
create policy "admins review member requests" on public.membership_requests for update to authenticated
  using(private.is_admin_or_super()) with check(private.is_admin_or_super());

drop policy if exists "member reads own profile" on public.member_profiles;
create policy "member reads own profile" on public.member_profiles for select to authenticated
  using(user_id=(select auth.uid()) or private.is_admin_or_super());

drop policy if exists "member reads own privacy" on public.member_privacy_settings;
create policy "member reads own privacy" on public.member_privacy_settings for select to authenticated
  using(user_id=(select auth.uid()) or private.is_admin_or_super());

drop policy if exists "member manages own privacy" on public.member_privacy_settings;
create policy "member manages own privacy" on public.member_privacy_settings for update to authenticated
  using(user_id=(select auth.uid()) and private.is_active_member())
  with check(user_id=(select auth.uid()) and private.is_active_member());

drop policy if exists "member reads own notifications" on public.member_notifications;
create policy "member reads own notifications" on public.member_notifications for select to authenticated
  using(user_id=(select auth.uid()));

drop policy if exists "member updates own notifications" on public.member_notifications;
create policy "member updates own notifications" on public.member_notifications for update to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

drop trigger if exists set_updated_at on public.membership_requests;
create trigger set_updated_at before update on public.membership_requests for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on public.member_profiles;
create trigger set_updated_at before update on public.member_profiles for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on public.member_privacy_settings;
create trigger set_updated_at before update on public.member_privacy_settings for each row execute function private.set_updated_at();
