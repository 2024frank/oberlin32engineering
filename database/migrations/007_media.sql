create table if not exists public.media_usage (
  media_id uuid not null references public.media(id) on delete cascade,
  owner_type text not null,
  owner_id text not null,
  field_key text not null,
  created_at timestamptz not null default now(),
  primary key(media_id,owner_type,owner_id,field_key)
);
alter table public.media_usage enable row level security;
create policy "staff read media usage" on public.media_usage for select to authenticated using(private.is_staff());
create policy "staff manage media usage" on public.media_usage for all to authenticated using(private.is_staff()) with check(private.is_staff());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('oec-media','oec-media',true,15728640,array['image/png','image/jpeg','image/webp','image/gif','application/pdf'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public read oec media" on storage.objects;
create policy "public read oec media" on storage.objects for select to public using(bucket_id='oec-media');
drop policy if exists "staff upload oec media" on storage.objects;
create policy "staff upload oec media" on storage.objects for insert to authenticated with check(bucket_id='oec-media' and private.is_staff());
drop policy if exists "staff update oec media" on storage.objects;
create policy "staff update oec media" on storage.objects for update to authenticated using(bucket_id='oec-media' and private.is_staff()) with check(bucket_id='oec-media' and private.is_staff());
drop policy if exists "staff delete oec media" on storage.objects;
create policy "staff delete oec media" on storage.objects for delete to authenticated using(bucket_id='oec-media' and private.is_staff());
