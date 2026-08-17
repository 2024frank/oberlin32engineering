-- Private member bookmarks for canonical public projects, opportunities, and resources.
create table if not exists public.saved_items (
  user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  item_type text not null check(item_type in ('PROJECT','OPPORTUNITY','RESOURCE')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(user_id,item_type,item_id)
);
create index if not exists saved_items_recent_idx on public.saved_items(user_id,created_at desc);
alter table public.saved_items enable row level security;
drop policy if exists "active member reads own saves" on public.saved_items;
drop policy if exists "active member creates own saves" on public.saved_items;
drop policy if exists "active member deletes own saves" on public.saved_items;
create policy "active member reads own saves" on public.saved_items for select to authenticated using(user_id=(select auth.uid()) and private.is_active_member());
create policy "active member creates own saves" on public.saved_items for insert to authenticated with check(user_id=(select auth.uid()) and private.is_active_member());
create policy "active member deletes own saves" on public.saved_items for delete to authenticated using(user_id=(select auth.uid()) and private.is_active_member());
