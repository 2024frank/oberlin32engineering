insert into public.navigation_items(label,destination,visible,sort_order,publication_state) values
('Home','/',true,10,'published'),('About','/about',true,20,'published'),('Projects','/projects',true,30,'published'),
('Events','/events',true,40,'published'),('Opportunities','/opportunities',true,50,'published'),('Resources','/resources',true,60,'published'),
('3-2 Pathway','/pathway',true,70,'published'),('News','/news',true,80,'published'),('Get Involved','/get-involved',true,90,'published')
on conflict do nothing;
insert into public.site_settings(key,value,publication_state) values
('brand',jsonb_build_object('badgeMediaId',null,'horizontalMediaId',null),'published'),
('contact',jsonb_build_object('email','engineering@oberlin.edu'),'published'),
('footer',jsonb_build_object('text','Build • Learn • Engineer Together'),'published'),
('social',jsonb_build_object('instagram','','linkedin','','github',''),'published'),
('seo',jsonb_build_object('titlePattern','%s · Oberlin Engineering Club','defaultOgMediaId',null),'published'),
('announcement',jsonb_build_object('enabled',false,'text','','href',''),'published')
on conflict(key) do update set value=excluded.value;

-- CMS page identities and initial published snapshots. Stable UUIDs make staging/prod seed repeatable.
insert into public.pages(id,slug) values
('00000000-0000-4000-8000-000000000101','home'),
('00000000-0000-4000-8000-000000000102','about'),
('00000000-0000-4000-8000-000000000103','pathway'),
('00000000-0000-4000-8000-000000000104','get-involved')
on conflict(id) do nothing;

insert into public.page_drafts(page_id,title,seo_title,seo_description) values
('00000000-0000-4000-8000-000000000101','Home','Oberlin Engineering Club | Oberlin College 3-2 Engineering','A student engineering group at Oberlin College. Projects, events, and guidance on the 3-2 dual-degree pathway with Caltech, Case Western, Columbia and WashU.'),
('00000000-0000-4000-8000-000000000102','About','About the club','Oberlin has no engineering major, but it has a 3-2 pathway. The club is where students interested in engineering find each other. Meet the founding members.'),
('00000000-0000-4000-8000-000000000103','3-2 Pathway','3-2 Engineering Pathway','How the 3-2 pathway works: three years at Oberlin, two at Caltech, Case Western, Columbia or WashU, a BA from Oberlin, plus the courses and official sources.'),
('00000000-0000-4000-8000-000000000104','Get Involved','Get Involved','Join the Oberlin Engineering Club.')
on conflict(page_id) do update set title=excluded.title,seo_title=excluded.seo_title,seo_description=excluded.seo_description;

insert into public.page_sections(page_id,stable_key,section_type,sort_order,is_visible,draft_payload) values
('00000000-0000-4000-8000-000000000101','hero','hero',10,true,'{"stableKey":"hero","isVisible":true,"type":"hero","layout":"split","eyebrow":"Oberlin Engineering Club","headline":"Build. Learn. Engineer Together.","body":"A student group at Oberlin for people who like building things, and for anyone weighing the 3-2 engineering pathway.","primaryCta":{"label":"Get involved","href":"/get-involved"},"secondaryCta":{"label":"Explore projects","href":"/projects"}}'::jsonb),
('00000000-0000-4000-8000-000000000101','disciplines','discipline_grid',20,true,'{"stableKey":"disciplines","isVisible":true,"type":"discipline_grid","heading":"Members come from across the sciences.","items":[{"name":"Mechanical","description":"CAD, machining, 3D printing, and testing parts that have to hold up."},{"name":"Electrical","description":"Circuits, microcontrollers, sensors, and power."},{"name":"Computing & AI","description":"Software, embedded code, and machine learning."},{"name":"Chemical & Materials","description":"Lab chemistry, materials testing, and process work."},{"name":"Robotics","description":"Mechanical, electrical, and software work on one moving thing."},{"name":"Civil & Environmental","description":"Water, infrastructure, and environmental monitoring."}]}'::jsonb),
('00000000-0000-4000-8000-000000000101','projects','project_grid',30,true,'{"stableKey":"projects","isVisible":true,"type":"project_grid","eyebrow":"Build with us","heading":"What we are building","limit":6,"featuredOnly":false}'::jsonb),
('00000000-0000-4000-8000-000000000101','events','event_list',40,true,'{"stableKey":"events","isVisible":true,"type":"event_list","eyebrow":"Meet & learn","heading":"Upcoming events","limit":4,"upcomingOnly":true}'::jsonb),
('00000000-0000-4000-8000-000000000101','join','cta',50,true,'{"stableKey":"join","isVisible":true,"type":"cta","tone":"cardinal","eyebrow":"OEC","heading":"You do not need experience to join.","body":"You do not need to be in the 3-2 program or already know what kind of engineer you want to become.","primaryCta":{"label":"Get involved","href":"/get-involved"},"secondaryCta":{"label":"Learn about the club","href":"/about"}}'::jsonb),
('00000000-0000-4000-8000-000000000102','hero','hero',10,true,'{"stableKey":"hero","isVisible":true,"type":"hero","layout":"minimal","eyebrow":"About OEC","headline":"A club for students who build things.","body":"Members come from physics, chemistry, computer science, maths, and the 3-2 engineering pathway.","primaryCta":{"label":"Join the club","href":"/get-involved"}}'::jsonb),
('00000000-0000-4000-8000-000000000102','mission','text_image',20,true,'{"stableKey":"mission","isVisible":true,"type":"text_image","layout":"image_right","eyebrow":"Mission","heading":"Oberlin has no engineering major.","body":"It has a 3-2 pathway with Caltech, Case Western Reserve, Columbia, and Washington University in St. Louis. That leaves students interested in engineering scattered across departments with nowhere obvious to find each other. The club is meant to be that place."}'::jsonb),
('00000000-0000-4000-8000-000000000102','leaders','leadership_grid',30,true,'{"stableKey":"leaders","isVisible":true,"type":"leadership_grid","eyebrow":"Founding team","heading":"Founding members","limit":8,"currentOnly":true}'::jsonb),
('00000000-0000-4000-8000-000000000103','hero','hero',10,true,'{"stableKey":"hero","isVisible":true,"type":"hero","layout":"minimal","eyebrow":"3-2 Engineering Pathway","headline":"Three years at Oberlin, two at an engineering school.","body":"You finish with a BA from Oberlin and an engineering degree from the partner school. The club keeps the official sources in one place; it does not replace advising.","primaryCta":{"label":"Browse official-source resources","href":"/resources?category=3-2"}}'::jsonb),
('00000000-0000-4000-8000-000000000103','notice','quote',20,true,'{"stableKey":"notice","isVisible":true,"type":"quote","quote":"Use this page as a planning map, not as an admissions contract. Confirm prerequisites, deadlines, financial aid, degree requirements, and transfer details with Oberlin and the partner engineering school.","attribution":"Oberlin Engineering Club","role":"Student resource notice"}'::jsonb),
('00000000-0000-4000-8000-000000000103','timeline','project_timeline',30,true,'{"stableKey":"timeline","isVisible":true,"type":"project_timeline","heading":"How the three years usually go","items":[{"label":"Year 1","title":"Start the sequence","body":"CHEM 101, PHYS 111, MATH 234, and CSCI 150 turn up on most 3-2 plans. Starting the maths and physics early is what keeps the rest possible."},{"label":"Year 2","title":"Compare the four schools","body":"Prerequisites differ by school and by engineering major, and some Oberlin courses run in only one semester. This is the year to find the collisions."},{"label":"Year 3","title":"Apply","body":"Check prerequisites, deadlines, and financial aid against each school’s current official pages."},{"label":"Transfer","title":"Sort out the move","body":"Housing, credit transfer, and aid all get settled directly with the partner school before you go."}]}'::jsonb)
on conflict(page_id,stable_key) do update set section_type=excluded.section_type,sort_order=excluded.sort_order,is_visible=excluded.is_visible,draft_payload=excluded.draft_payload;

-- Build initial immutable versions from the seeded drafts.
insert into public.page_versions(id,page_id,version_number,page_snapshot,sections_snapshot)
select '10000000-0000-4000-8000-000000000101'::uuid,p.id,1,
  jsonb_build_object('pageId',p.id,'slug',p.slug,'title',d.title,'seoTitle',d.seo_title,'seoDescription',d.seo_description,'ogMediaId',d.og_media_id),
  coalesce(jsonb_agg(s.draft_payload order by s.sort_order) filter(where s.id is not null),'[]'::jsonb)
from public.pages p join public.page_drafts d on d.page_id=p.id left join public.page_sections s on s.page_id=p.id where p.slug='home' group by p.id,p.slug,d.title,d.seo_title,d.seo_description,d.og_media_id
on conflict(id) do nothing;
insert into public.page_versions(id,page_id,version_number,page_snapshot,sections_snapshot)
select '10000000-0000-4000-8000-000000000102'::uuid,p.id,1,jsonb_build_object('pageId',p.id,'slug',p.slug,'title',d.title,'seoTitle',d.seo_title,'seoDescription',d.seo_description,'ogMediaId',d.og_media_id),coalesce(jsonb_agg(s.draft_payload order by s.sort_order) filter(where s.id is not null),'[]'::jsonb) from public.pages p join public.page_drafts d on d.page_id=p.id left join public.page_sections s on s.page_id=p.id where p.slug='about' group by p.id,p.slug,d.title,d.seo_title,d.seo_description,d.og_media_id on conflict(id) do nothing;
insert into public.page_versions(id,page_id,version_number,page_snapshot,sections_snapshot)
select '10000000-0000-4000-8000-000000000103'::uuid,p.id,1,jsonb_build_object('pageId',p.id,'slug',p.slug,'title',d.title,'seoTitle',d.seo_title,'seoDescription',d.seo_description,'ogMediaId',d.og_media_id),coalesce(jsonb_agg(s.draft_payload order by s.sort_order) filter(where s.id is not null),'[]'::jsonb) from public.pages p join public.page_drafts d on d.page_id=p.id left join public.page_sections s on s.page_id=p.id where p.slug='pathway' group by p.id,p.slug,d.title,d.seo_title,d.seo_description,d.og_media_id on conflict(id) do nothing;
insert into public.page_versions(id,page_id,version_number,page_snapshot,sections_snapshot)
select '10000000-0000-4000-8000-000000000104'::uuid,p.id,1,jsonb_build_object('pageId',p.id,'slug',p.slug,'title',d.title,'seoTitle',d.seo_title,'seoDescription',d.seo_description,'ogMediaId',d.og_media_id),'[]'::jsonb from public.pages p join public.page_drafts d on d.page_id=p.id where p.slug='get-involved' on conflict(id) do nothing;
update public.pages set published_version_id=case slug when 'home' then '10000000-0000-4000-8000-000000000101'::uuid when 'about' then '10000000-0000-4000-8000-000000000102'::uuid when 'pathway' then '10000000-0000-4000-8000-000000000103'::uuid when 'get-involved' then '10000000-0000-4000-8000-000000000104'::uuid else published_version_id end where slug in ('home','about','pathway','get-involved');

-- legacy_source_id matches the legacy site's partner ids so a legacy import upserts
-- into these rows (adding descriptions and advising questions) instead of creating a
-- second copy of every partner school.
insert into public.partner_schools(id,legacy_source_id,name,short_name,location,official_url,publication_state,sort_order,published_at) values
('20000000-0000-4000-8000-000000000101','caltech','California Institute of Technology','Caltech','Pasadena, CA','https://www.admissions.caltech.edu/apply/32-program','published',10,now()),
('20000000-0000-4000-8000-000000000102','case-western','Case Western Reserve University','Case Western Reserve','Cleveland, OH','https://case.edu/engineering/academics/undergraduate/32-program','published',20,now()),
('20000000-0000-4000-8000-000000000103','columbia','Columbia Engineering','Columbia Engineering','New York, NY','https://undergrad.admissions.columbia.edu/apply/combinedplan','published',30,now()),
('20000000-0000-4000-8000-000000000104','washu','Washington University in St. Louis','WashU','St. Louis, MO','https://engineering.washu.edu/academics/dual-degree-program/index.html','published',40,now())
on conflict(id) do update set legacy_source_id=excluded.legacy_source_id,official_url=excluded.official_url,publication_state='published';
