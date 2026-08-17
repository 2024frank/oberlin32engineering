-- RLS boundaries: public sees only published canonical state; drafts stay private.

do $$ declare t text; begin
  foreach t in array array['admin_profiles','role_assignments','media','projects','project_updates','events','opportunities','resources','news_posts','leaders','sponsors','documents','partner_schools','submissions','navigation_items','site_settings','pages','page_drafts','page_sections','page_versions','content_drafts','content_versions','scheduled_publications','audit_log'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

-- Remove existing policies to make migration re-runnable in development.
do $$ declare r record; begin
  for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' loop
    execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;

create policy "admins read profiles" on public.admin_profiles for select to authenticated using(private.is_staff());
create policy "super admins manage profiles" on public.admin_profiles for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());
create policy "admins read assignments" on public.role_assignments for select to authenticated using(private.is_staff());
create policy "super admins manage assignments" on public.role_assignments for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());

create policy "public reads media metadata" on public.media for select to anon,authenticated using(public_url <> '');
create policy "staff manage media" on public.media for all to authenticated using(private.is_staff()) with check(private.is_staff());

-- Public canonical tables.
do $$ declare t text; scope text; begin
  foreach t in array array['projects','project_updates','events','opportunities','resources','news_posts','leaders','sponsors','documents','partner_schools'] loop
    execute format('create policy "public reads published %1$s" on public.%1$I for select to anon,authenticated using(publication_state=''published'')',t);
    execute format('create policy "staff manage %1$s" on public.%1$I for all to authenticated using(private.has_scope(''%1$s'')) with check(private.has_scope(''%1$s''))',t);
  end loop;
end $$;

create policy "public reads published navigation" on public.navigation_items for select to anon,authenticated using(publication_state='published' and visible=true);
create policy "admins manage navigation" on public.navigation_items for all to authenticated using(private.current_role() in ('SUPER_ADMIN'::public.admin_role,'ADMIN'::public.admin_role)) with check(private.current_role() in ('SUPER_ADMIN'::public.admin_role,'ADMIN'::public.admin_role));
create policy "public reads published settings" on public.site_settings for select to anon,authenticated using(publication_state='published');
create policy "super admin manages settings" on public.site_settings for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());

create policy "staff read submissions" on public.submissions for select to authenticated using(private.is_staff());
create policy "admins update submissions" on public.submissions for update to authenticated using(private.current_role() in ('SUPER_ADMIN'::public.admin_role,'ADMIN'::public.admin_role)) with check(private.current_role() in ('SUPER_ADMIN'::public.admin_role,'ADMIN'::public.admin_role));

create policy "public reads page identities" on public.pages for select to anon,authenticated using(published_version_id is not null or private.is_staff());
create policy "staff manage page identities" on public.pages for all to authenticated using(private.has_scope('pages')) with check(private.has_scope('pages'));
create policy "staff read page drafts" on public.page_drafts for select to authenticated using(private.has_scope('pages'));
create policy "staff write page drafts" on public.page_drafts for all to authenticated using(private.has_scope('pages')) with check(private.has_scope('pages'));
create policy "staff read page sections" on public.page_sections for select to authenticated using(private.has_scope('pages'));
create policy "staff write page sections" on public.page_sections for all to authenticated using(private.has_scope('pages')) with check(private.has_scope('pages'));
create policy "public reads current page version" on public.page_versions for select to anon,authenticated using(exists(select 1 from public.pages p where p.published_version_id=page_versions.id) or private.is_staff());
create policy "publishers insert page versions" on public.page_versions for insert to authenticated with check(private.can_publish() and private.has_scope('pages'));

create policy "staff read content drafts" on public.content_drafts for select to authenticated using(private.has_scope(entity_type));
create policy "staff write content drafts" on public.content_drafts for all to authenticated using(private.has_scope(entity_type)) with check(private.has_scope(entity_type));
create policy "staff read content versions" on public.content_versions for select to authenticated using(private.has_scope(entity_type));
create policy "publishers insert content versions" on public.content_versions for insert to authenticated with check(private.can_publish() and private.has_scope(entity_type));
create policy "staff scheduled publications" on public.scheduled_publications for select to authenticated using(private.is_staff());
create policy "publishers manage scheduled publications" on public.scheduled_publications for all to authenticated using(private.can_publish()) with check(private.can_publish());
create policy "staff read audit" on public.audit_log for select to authenticated using(private.is_staff());
create policy "publishers insert audit" on public.audit_log for insert to authenticated with check(private.is_staff());
