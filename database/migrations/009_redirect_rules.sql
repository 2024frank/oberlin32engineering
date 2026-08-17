-- CMS-managed legacy redirects and system-control hardening.
create table if not exists public.redirect_rules (
  id uuid primary key default gen_random_uuid(),
  source_path text not null unique check (source_path like '/%' and source_path not like '//%'),
  destination text not null,
  status_code integer not null default 308 check (status_code in (301,302,307,308)),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists redirect_rules_active_source_idx on public.redirect_rules(active,source_path);
drop trigger if exists set_updated_at on public.redirect_rules;
create trigger set_updated_at before update on public.redirect_rules for each row execute function private.set_updated_at();
alter table public.redirect_rules enable row level security;

drop policy if exists "public reads active redirects" on public.redirect_rules;
drop policy if exists "staff reads redirects" on public.redirect_rules;
drop policy if exists "super admin manages redirects" on public.redirect_rules;
create policy "public reads active redirects" on public.redirect_rules for select to anon,authenticated using(active=true);
create policy "staff reads redirects" on public.redirect_rules for select to authenticated using(private.is_staff());
create policy "super admin manages redirects" on public.redirect_rules for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());

-- Navigation is global site structure, so only Super Admin mutates it.
drop policy if exists "admins manage navigation" on public.navigation_items;
drop policy if exists "super admin manages navigation" on public.navigation_items;
create policy "super admin manages navigation" on public.navigation_items for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());

create or replace function public.replace_navigation_items(p_items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; keep_ids uuid[] := '{}'; item_id uuid;
begin
  if not private.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 20 then raise exception 'INVALID_NAVIGATION'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    item_id := coalesce(nullif(item->>'id','')::uuid,gen_random_uuid());
    keep_ids := array_append(keep_ids,item_id);
    insert into public.navigation_items(id,label,destination,visible,external,sort_order,publication_state)
      values(item_id,item->>'label',item->>'destination',coalesce((item->>'visible')::boolean,true),coalesce((item->>'external')::boolean,false),coalesce((item->>'sort_order')::integer,100),'published')
      on conflict(id) do update set label=excluded.label,destination=excluded.destination,visible=excluded.visible,external=excluded.external,sort_order=excluded.sort_order,publication_state='published';
  end loop;
  delete from public.navigation_items where not(id=any(keep_ids));
end $$;
revoke all on function public.replace_navigation_items(jsonb) from public;
grant execute on function public.replace_navigation_items(jsonb) to authenticated;
