-- Complete-site migration for the August 2026 public redesign.
-- Run after database/schema.sql and database/members.sql.
-- Re-running is safe.

begin;

-- Fields used by the public site and officer portal.
alter table public.leaders add column if not exists expected_time text not null default '';
alter table public.events add column if not exists status text not null default 'Planned';
alter table public.resources add column if not exists reviewed_at date;
alter table public.partner_schools add column if not exists description text not null default '';
alter table public.profiles add column if not exists society_role_id uuid references public.society_roles(id) on delete set null;
alter table public.invitations add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.invitations add column if not exists existing_account boolean not null default false;
create index if not exists invitations_auth_user_idx on public.invitations (auth_user_id);

-- Public submissions are accepted only through the validated server endpoint.
alter table public.submissions add column if not exists source text not null default 'website';
alter table public.submissions add column if not exists ip_hash text not null default '';
alter table public.submissions add column if not exists user_agent text not null default '';

create index if not exists submissions_ip_created_idx on public.submissions (ip_hash, created_at desc);
create index if not exists submissions_email_created_idx on public.submissions (lower(email), created_at desc);
create index if not exists profiles_society_role_idx on public.profiles (society_role_id);

drop policy if exists "Public creates submissions" on public.submissions;
revoke insert on public.submissions from anon, authenticated;

create or replace function public.accept_public_submission(
  p_type text,
  p_full_name text,
  p_email text,
  p_payload jsonb,
  p_ip_hash text,
  p_user_agent text default '',
  p_source text default 'website'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_type text := trim(coalesce(p_type, ''));
  v_lock_ip bigint;
  v_lock_email bigint;
begin
  if v_type not in ('membership_interest','project_idea','event_interest','showcase_interest','contact') then
    raise exception 'invalid_submission_type' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 2 or char_length(p_full_name) > 160 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if char_length(v_email) < 5 or char_length(v_email) > 320 or position('@' in v_email) < 2 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or pg_column_size(p_payload) > 32768 then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  if char_length(coalesce(p_ip_hash, '')) <> 64 then
    raise exception 'invalid_request_key' using errcode = '22023';
  end if;

  -- Serialize checks that share an email or network key so concurrent requests
  -- cannot race through the count-then-insert limit.
  v_lock_ip := hashtextextended('submission:ip:' || p_ip_hash, 0);
  v_lock_email := hashtextextended('submission:email:' || v_email, 0);
  perform pg_advisory_xact_lock(least(v_lock_ip, v_lock_email));
  if v_lock_ip <> v_lock_email then
    perform pg_advisory_xact_lock(greatest(v_lock_ip, v_lock_email));
  end if;

  -- Five submissions per network key per hour and three per email per hour.
  if (select count(*) from public.submissions
      where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.submissions
      where lower(email) = v_email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.submissions (type, full_name, email, payload, status, source, ip_hash, user_agent)
  values (
    v_type,
    left(trim(p_full_name), 160),
    left(v_email, 320),
    p_payload,
    'new',
    left(coalesce(p_source, 'website'), 500),
    p_ip_hash,
    left(coalesce(p_user_agent, ''), 300)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.accept_public_submission(text,text,text,jsonb,text,text,text) from public, anon, authenticated;
grant execute on function public.accept_public_submission(text,text,text,jsonb,text,text,text) to service_role;

-- Keep account-recovery mail from being used as a spam relay.
create table if not exists public.account_email_events (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null check (char_length(email_hash) = 64),
  ip_hash text not null check (char_length(ip_hash) = 64),
  kind text not null check (kind in ('password_reset','invitation')),
  created_at timestamptz not null default now()
);

alter table public.account_email_events enable row level security;
create index if not exists account_email_email_idx on public.account_email_events (email_hash, kind, created_at desc);
create index if not exists account_email_ip_idx on public.account_email_events (ip_hash, created_at desc);
create index if not exists account_email_created_idx on public.account_email_events (created_at);
revoke all on public.account_email_events from public, anon, authenticated;

create or replace function public.allow_account_email(
  p_email_hash text,
  p_ip_hash text,
  p_kind text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lock_email bigint;
  v_lock_ip bigint;
begin
  if char_length(coalesce(p_email_hash, '')) <> 64 or char_length(coalesce(p_ip_hash, '')) <> 64 then
    return false;
  end if;
  if p_kind not in ('password_reset','invitation') then
    return false;
  end if;

  v_lock_email := hashtextextended('account-email:' || p_kind || ':' || p_email_hash, 0);
  v_lock_ip := hashtextextended('account-ip:' || p_ip_hash, 0);
  perform pg_advisory_xact_lock(least(v_lock_email, v_lock_ip));
  if v_lock_email <> v_lock_ip then
    perform pg_advisory_xact_lock(greatest(v_lock_email, v_lock_ip));
  end if;

  delete from public.account_email_events
  where created_at < now() - interval '7 days';

  if (select count(*) from public.account_email_events
      where email_hash = p_email_hash and kind = p_kind and created_at > now() - interval '1 hour') >= 3 then
    return false;
  end if;
  if (select count(*) from public.account_email_events
      where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 10 then
    return false;
  end if;
  insert into public.account_email_events (email_hash, ip_hash, kind)
  values (p_email_hash, p_ip_hash, p_kind);
  return true;
end;
$$;

revoke all on function public.allow_account_email(text,text,text) from public, anon, authenticated;
grant execute on function public.allow_account_email(text,text,text) to service_role;


-- Accepting or revoking an invitation must be atomic. Without a row lock, a
-- recipient and an administrator could race and leave access in the wrong state.
create or replace function public.accept_officer_invitation(
  p_user_id uuid,
  p_email text,
  p_full_name text default ''
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := left(trim(coalesce(p_full_name, '')), 160);
begin
  if p_user_id is null or char_length(v_email) < 5 or char_length(v_email) > 320 then
    return false;
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id and lower(coalesce(u.email, '')) = v_email
  ) then
    return false;
  end if;

  select i.* into v_invitation
  from public.invitations i
  where i.id = (
    select candidate.id
    from public.invitations candidate
    where lower(candidate.email) = v_email and candidate.status = 'sent'
    order by candidate.sent_at desc
    limit 1
  )
  for update;

  if not found then
    return false;
  end if;

  if v_name = '' then
    v_name := left(coalesce(nullif(trim(v_invitation.full_name), ''), split_part(v_email, '@', 1)), 160);
  end if;

  insert into public.profiles as current_profile (
    id, email, full_name, role, society_role_id, updated_at
  ) values (
    p_user_id,
    v_email,
    v_name,
    v_invitation.access_level,
    v_invitation.role_id,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when excluded.full_name <> '' then excluded.full_name else current_profile.full_name end,
    role = case when current_profile.role = 'admin' then current_profile.role else excluded.role end,
    society_role_id = excluded.society_role_id,
    updated_at = now();

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = v_invitation.id;

  return true;
end;
$$;

revoke all on function public.accept_officer_invitation(uuid,text,text) from public, anon, authenticated;
grant execute on function public.accept_officer_invitation(uuid,text,text) to service_role;

create or replace function public.revoke_officer_invitation(p_invitation_id uuid)
returns table(revoked boolean, auth_user_id uuid, existing_account boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
begin
  select i.* into v_invitation
  from public.invitations i
  where i.id = p_invitation_id
  for update;

  if not found then
    return query select false, null::uuid, true;
    return;
  end if;
  if v_invitation.status <> 'sent' then
    return query select false, v_invitation.auth_user_id, v_invitation.existing_account;
    return;
  end if;

  update public.invitations
  set status = 'revoked'
  where id = v_invitation.id;

  return query select true, v_invitation.auth_user_id, v_invitation.existing_account;
end;
$$;

revoke all on function public.revoke_officer_invitation(uuid) from public, anon, authenticated;
grant execute on function public.revoke_officer_invitation(uuid) to service_role;

-- One active invitation per email. Preserve the newest pending code and mark
-- older duplicate pending records as revoked before adding the unique index.
with ranked_invitations as (
  select id, row_number() over (
    partition by lower(email)
    order by sent_at desc, id desc
  ) as position
  from public.invitations
  where status = 'sent'
)
update public.invitations as invitation
set status = 'revoked'
from ranked_invitations as ranked
where invitation.id = ranked.id and ranked.position > 1;

alter table public.invitations drop constraint if exists invitations_email_status_key;
create unique index if not exists invitations_one_sent_per_email_idx
  on public.invitations (lower(email)) where status = 'sent';

-- Editors may read the role attached to their own profile. Only admins manage roles.
drop policy if exists "members read roles" on public.society_roles;
create policy "signed in users read active roles" on public.society_roles
  for select to authenticated using (active = true or private.is_admin());

commit;
