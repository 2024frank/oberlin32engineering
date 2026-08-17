-- Media provenance and visual QA metadata. Generated photography is never
-- considered publish-ready until a human explicitly approves its realism.
alter table public.media
  add column if not exists source_type text not null default 'original' check(source_type in ('original','licensed','generated')),
  add column if not exists rights_note text,
  add column if not exists focal_x numeric check(focal_x between 0 and 1),
  add column if not exists focal_y numeric check(focal_y between 0 and 1),
  add column if not exists visual_qa_approved boolean not null default false;

comment on column public.media.source_type is 'original, licensed, or generated';
comment on column public.media.rights_note is 'License, photographer credit, source, or other rights/provenance note';
comment on column public.media.visual_qa_approved is 'Human approval after checking generated images for realistic hands, tools, text, lighting, reflections, proportions, and textures';

create or replace function private.assert_publishable_media_values(
  p_mime_type text,
  p_alt_text text,
  p_source_type text,
  p_rights_note text,
  p_visual_qa_approved boolean
) returns void language plpgsql immutable set search_path='' as $$
begin
  if coalesce(p_mime_type,'') not like 'image/%' then return; end if;
  if btrim(coalesce(p_alt_text,''))='' then raise exception 'IMAGE_ALT_REQUIRED'; end if;
  if p_source_type='licensed' and btrim(coalesce(p_rights_note,''))='' then raise exception 'LICENSED_IMAGE_RIGHTS_REQUIRED'; end if;
  if p_source_type='generated' and not coalesce(p_visual_qa_approved,false) then raise exception 'GENERATED_IMAGE_QA_REQUIRED'; end if;
end $$;

create or replace function private.assert_publishable_media(p_media_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare r record;
begin
  if p_media_id is null then return; end if;
  select mime_type,alt_text,source_type,rights_note,visual_qa_approved into r from public.media where id=p_media_id;
  if not found then raise exception 'MEDIA_NOT_FOUND'; end if;
  perform private.assert_publishable_media_values(r.mime_type,r.alt_text,r.source_type,r.rights_note,r.visual_qa_approved);
end $$;

create or replace function private.enforce_canonical_media_policy()
returns trigger language plpgsql security definer set search_path='' as $$
declare j jsonb:=to_jsonb(new);media_id uuid;
begin
  if coalesce(j->>'publication_state','')<>'published' then return new; end if;
  media_id:=case tg_table_name
    when 'projects' then nullif(j->>'cover_media_id','')::uuid
    when 'project_updates' then nullif(j->>'media_id','')::uuid
    when 'events' then nullif(j->>'cover_media_id','')::uuid
    when 'news_posts' then nullif(j->>'cover_media_id','')::uuid
    when 'leaders' then nullif(j->>'photo_media_id','')::uuid
    when 'sponsors' then nullif(j->>'logo_media_id','')::uuid
    else null
  end;
  perform private.assert_publishable_media(media_id);
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['projects','project_updates','events','news_posts','leaders','sponsors'] loop
    execute format('drop trigger if exists enforce_canonical_media_policy on public.%I',t);
    execute format('create trigger enforce_canonical_media_policy before insert or update on public.%I for each row execute function private.enforce_canonical_media_policy()',t);
  end loop;
end $$;

create or replace function private.enforce_page_version_media_policy()
returns trigger language plpgsql security definer set search_path='' as $$
declare section jsonb;image_item jsonb;
begin
  perform private.assert_publishable_media(nullif(new.page_snapshot->>'ogMediaId','')::uuid);
  for section in select value from jsonb_array_elements(coalesce(new.sections_snapshot,'[]'::jsonb)) loop
    if section->>'type' in ('hero','text_image') then
      perform private.assert_publishable_media(nullif(section->>'imageId','')::uuid);
    elsif section->>'type'='gallery' then
      for image_item in select value from jsonb_array_elements(coalesce(section->'images','[]'::jsonb)) loop
        perform private.assert_publishable_media(nullif(image_item->>'mediaId','')::uuid);
      end loop;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists enforce_page_version_media_policy on public.page_versions;
create trigger enforce_page_version_media_policy before insert on public.page_versions for each row execute function private.enforce_page_version_media_policy();

create or replace function private.enforce_site_settings_media_policy()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.publication_state<>'published' then return new; end if;
  if new.key='seo' then
    perform private.assert_publishable_media(nullif(new.value->>'defaultOgMediaId','')::uuid);
  elsif new.key='brand' then
    perform private.assert_publishable_media(nullif(new.value->>'badgeMediaId','')::uuid);
    perform private.assert_publishable_media(nullif(new.value->>'horizontalMediaId','')::uuid);
  end if;
  return new;
end $$;

drop trigger if exists enforce_site_settings_media_policy on public.site_settings;
create trigger enforce_site_settings_media_policy before insert or update on public.site_settings for each row execute function private.enforce_site_settings_media_policy();

create or replace function private.media_is_publicly_referenced(p_media_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.projects where publication_state='published' and cover_media_id=p_media_id)
      or exists(select 1 from public.project_updates where publication_state='published' and media_id=p_media_id)
      or exists(select 1 from public.events where publication_state='published' and cover_media_id=p_media_id)
      or exists(select 1 from public.news_posts where publication_state='published' and cover_media_id=p_media_id)
      or exists(select 1 from public.leaders where publication_state='published' and photo_media_id=p_media_id)
      or exists(select 1 from public.sponsors where publication_state='published' and logo_media_id=p_media_id)
      or exists(
        select 1 from public.pages p join public.page_versions v on v.id=p.published_version_id
        where nullif(v.page_snapshot->>'ogMediaId','')::uuid=p_media_id
           or exists(
             select 1 from jsonb_array_elements(coalesce(v.sections_snapshot,'[]'::jsonb)) section
             where (section->>'type' in ('hero','text_image') and nullif(section->>'imageId','')::uuid=p_media_id)
                or exists(select 1 from jsonb_array_elements(coalesce(section->'images','[]'::jsonb)) image_item where nullif(image_item->>'mediaId','')::uuid=p_media_id)
           )
      )
      or exists(select 1 from public.site_settings where publication_state='published' and key='seo' and nullif(value->>'defaultOgMediaId','')::uuid=p_media_id)
      or exists(select 1 from public.site_settings where publication_state='published' and key='brand' and (nullif(value->>'badgeMediaId','')::uuid=p_media_id or nullif(value->>'horizontalMediaId','')::uuid=p_media_id));
$$;

create or replace function private.enforce_live_media_metadata_policy()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if private.media_is_publicly_referenced(new.id) then
    perform private.assert_publishable_media_values(new.mime_type,new.alt_text,new.source_type,new.rights_note,new.visual_qa_approved);
  end if;
  return new;
end $$;

drop trigger if exists enforce_live_media_metadata_policy on public.media;
create trigger enforce_live_media_metadata_policy before update of mime_type,alt_text,source_type,rights_note,visual_qa_approved on public.media for each row execute function private.enforce_live_media_metadata_policy();

-- Editors may manage media only when the Super Admin assigned the media scope.
drop policy if exists "staff manage media" on public.media;
drop policy if exists "scoped staff manage media" on public.media;
create policy "scoped staff manage media" on public.media for all to authenticated using(private.has_scope('media')) with check(private.has_scope('media'));

drop policy if exists "staff read media usage" on public.media_usage;
drop policy if exists "staff manage media usage" on public.media_usage;
create policy "scoped staff read media usage" on public.media_usage for select to authenticated using(private.has_scope('media'));
create policy "scoped staff manage media usage" on public.media_usage for all to authenticated using(private.has_scope('media')) with check(private.has_scope('media'));

drop policy if exists "staff upload oec media" on storage.objects;
drop policy if exists "staff update oec media" on storage.objects;
drop policy if exists "staff delete oec media" on storage.objects;
create policy "staff upload oec media" on storage.objects for insert to authenticated with check(bucket_id='oec-media' and private.has_scope('media'));
create policy "staff update oec media" on storage.objects for update to authenticated using(bucket_id='oec-media' and private.has_scope('media')) with check(bucket_id='oec-media' and private.has_scope('media'));
create policy "staff delete oec media" on storage.objects for delete to authenticated using(bucket_id='oec-media' and private.has_scope('media'));
