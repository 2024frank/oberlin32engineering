-- OEC core auth/role model
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

do $$ begin
  create type public.admin_role as enum ('SUPER_ADMIN', 'ADMIN', 'EDITOR');
exception when duplicate_object then null; end $$;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_assignments (
  user_id uuid primary key references public.admin_profiles(user_id) on delete cascade,
  role public.admin_role not null default 'EDITOR',
  scopes text[] not null default '{}',
  can_publish boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function private.current_role()
returns public.admin_role language sql stable security definer set search_path = '' as $$
  select ra.role from public.role_assignments ra
  join public.admin_profiles ap on ap.user_id = ra.user_id
  where ra.user_id = (select auth.uid()) and ap.active = true;
$$;

create or replace function private.current_scopes()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(ra.scopes, '{}'::text[]) from public.role_assignments ra
  join public.admin_profiles ap on ap.user_id = ra.user_id
  where ra.user_id = (select auth.uid()) and ap.active = true;
$$;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() is not null;
$$;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() = 'SUPER_ADMIN'::public.admin_role;
$$;

create or replace function private.can_publish()
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when private.current_role() in ('SUPER_ADMIN'::public.admin_role, 'ADMIN'::public.admin_role) then true
    when private.current_role() = 'EDITOR'::public.admin_role then coalesce((select ra.can_publish from public.role_assignments ra where ra.user_id=(select auth.uid())), false)
    else false end;
$$;

create or replace function private.has_scope(p_scope text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when private.current_role() in ('SUPER_ADMIN'::public.admin_role, 'ADMIN'::public.admin_role) then true
    when private.current_role() = 'EDITOR'::public.admin_role then p_scope = any(private.current_scopes())
    else false end;
$$;

create or replace function private.can_manage_scope(p_scope text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff() and private.has_scope(p_scope);
$$;

create index if not exists role_assignments_role_idx on public.role_assignments(role);

drop trigger if exists set_updated_at on public.admin_profiles;
create trigger set_updated_at before update on public.admin_profiles for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on public.role_assignments;
create trigger set_updated_at before update on public.role_assignments for each row execute function private.set_updated_at();
