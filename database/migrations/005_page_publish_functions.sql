-- Atomic page publish/restore plus cron claiming.
create or replace function public.publish_page_snapshot(p_page_id uuid,p_page_snapshot jsonb,p_sections_snapshot jsonb,p_restored_from uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_version integer; v_id uuid; v_before uuid; begin
  if not (private.can_publish() or coalesce(auth.role(),'')='service_role') then raise exception 'publish permission required'; end if;
  select published_version_id into v_before from public.pages where id=p_page_id for update;
  if not found then raise exception 'page not found'; end if;
  select coalesce(max(version_number),0)+1 into v_version from public.page_versions where page_id=p_page_id;
  insert into public.page_versions(page_id,version_number,page_snapshot,sections_snapshot,published_by,restored_from)
    values(p_page_id,v_version,p_page_snapshot,p_sections_snapshot,(select auth.uid()),p_restored_from) returning id into v_id;
  update public.pages set published_version_id=v_id,updated_at=now() where id=p_page_id;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
    values((select auth.uid()),case when p_restored_from is null then 'PUBLISH' else 'RESTORE' end,'page',p_page_id::text,jsonb_build_object('publishedVersionId',v_before),jsonb_build_object('publishedVersionId',v_id,'versionNumber',v_version));
  return v_id;
end $$;
revoke all on function public.publish_page_snapshot(uuid,jsonb,jsonb,uuid) from public;
grant execute on function public.publish_page_snapshot(uuid,jsonb,jsonb,uuid) to authenticated,service_role;

alter table public.scheduled_publications add column if not exists claimed_at timestamptz;
alter table public.scheduled_publications add column if not exists claim_token uuid;

create or replace function public.claim_due_publications(p_limit integer default 20)
returns setof public.scheduled_publications language plpgsql security definer set search_path='' as $$
declare token uuid:=gen_random_uuid(); begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service role required'; end if;
  return query with due as (
    select id from public.scheduled_publications where processed_at is null and scheduled_for<=now() and (claimed_at is null or claimed_at<now()-interval '15 minutes') order by scheduled_for for update skip locked limit p_limit
  ), claimed as (
    update public.scheduled_publications s set claimed_at=now(),claim_token=token from due where s.id=due.id returning s.*
  ) select * from claimed;
end $$;
grant execute on function public.claim_due_publications(integer) to service_role;
