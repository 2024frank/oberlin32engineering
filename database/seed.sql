-- Versioned public content for the Oberlin 3-2 Engineering Society
-- Run after schema.sql, members.sql, and migrations/2026-08-07-complete-site.sql. Re-running is safe.

insert into public.site_settings (id, settings, published) values ('main', '{"name":"Oberlin 3-2 Engineering Society","short_name":"Oberlin 3-2","domain":"https://www.oberlin32engineeringsociety.com","founded":"2026","tagline":"Engineering projects and 3-2 planning for Oberlin students.","hero_title":"Oberlin 3-2 Engineering Society","hero_description":"A student group forming around engineering projects and the 3-2 pathway.","join_url":"/join","instagram_url":"https://www.instagram.com/oberlin32engineering/","instagram_handle":"@oberlin32engineering","contact_email":"","founder":"Frank (Kwaku) Kusi Appiah","advisor":"Not yet confirmed","announcement":"Organizing for 2026–27. Membership interest is open.","announcement_link":"/join","status":"Founding stage","launch_term":"2026–27","content_version":"2026-08-09-content-audit"}'::jsonb, true) on conflict (id) do update set settings = excluded.settings, published = true;

insert into public.leaders (id, name, role, term, class_year, major, bio, expected_time, photo_url, linkedin_url, email, current, advisor, open_seat, published, sort_order) values
  ('kwaku-kusi-appiah', 'Frank (Kwaku) Kusi Appiah', 'Founder and president', '2026–27', '', 'Mechanical engineering', 'Kwaku is a mechanical engineering student who likes building things and wants to spend more time on hardware. He also works in software and is most interested in projects that use both. He started the society to do that work with other Oberlin students.', '3–5 hours per week during launch', 'https://tpsawnzhhyeddqiefxfp.supabase.co/storage/v1/object/public/society-media/leaders/2026/08/1786136220-kwaku-kusi-appiah.jpg', '', 'fkusiapp@oberlin.edu', true, false, false, true, 10),
  ('mahi-zarif', 'Mahi Zarif', 'Vice president', '2026–27', 'Third year', 'Electrical engineering', 'Mahi is a third-year student studying electrical engineering and the society''s vice president. His role includes member recruitment, project planning, and event coordination.', '', 'https://tpsawnzhhyeddqiefxfp.supabase.co/storage/v1/object/public/society-media/leaders/2026/08/1786109795-mahi-zarif.jpg', '', '', true, false, false, true, 15),
  ('open-projects-coordinator', 'Open position', 'Liaison', '2026–27', '', 'Any field', 'Coordinates chartering and communication with Student Senate, Student Leadership and Involvement, the adviser, and campus partners.', 'About 2–3 hours per week', '', '', '', true, false, true, true, 30),
  ('open-community-coordinator', 'Open position', 'Secretary', '2026–27', '', 'Any field', 'Keeps meeting notes, membership records, attendance, officer lists, and charter documents organized for the society.', 'About 2 hours per week', '', '', '', true, false, true, true, 40)
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  term = excluded.term,
  class_year = excluded.class_year,
  major = excluded.major,
  bio = excluded.bio,
  expected_time = excluded.expected_time,
  photo_url = excluded.photo_url,
  linkedin_url = excluded.linkedin_url,
  email = excluded.email,
  current = excluded.current,
  advisor = excluded.advisor,
  open_seat = excluded.open_seat,
  published = excluded.published,
  sort_order = excluded.sort_order;

insert into public.events (id, slug, title, summary, description, event_type, status, date_label, start_at, end_at, location, registration_url, cover_url, featured, published) values
  ('engineering-conversation', 'engineering-conversation', 'Engineer or Alumni Conversation', 'A practical conversation about engineering study, work, projects, and decisions students wish they had understood earlier.', 'A speaker and topic have not yet been confirmed. Suggestions and introductions are welcome through the contact page.', 'Speaker', 'Planned', 'Speaker and date not yet confirmed', null, null, 'To be announced', '/contact', 'assets/images/photos/circuit-board-dark.jpg', false, true),
  ('first-build-night', 'first-build-night', 'First Build Night', 'A low-pressure session for reviewing project proposals, testing small components, and helping beginners choose a first task.', 'This event will be scheduled only after a project, workspace, supervision plan, and safe equipment list are confirmed.', 'Build session', 'Planned', 'Timing depends on project selection', null, null, 'Workspace to be confirmed', '/join?interest=projects', 'assets/images/photos/tool-pegboard.jpg', false, true),
  ('founding-meetup', 'founding-meetup', 'Founding Meetup', 'Meet other interested students, review the first-year plan, and choose which projects and events deserve attention first.', 'The date, time, and room are being scheduled. Pizza and accessibility details will be confirmed with the final announcement.', 'Community', 'Planned', 'Date and room being scheduled', null, null, 'Oberlin College, room to be announced', '/join?interest=events', 'assets/images/photos/makerspace-sign.jpg', true, true)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  event_type = excluded.event_type,
  status = excluded.status,
  date_label = excluded.date_label,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  location = excluded.location,
  registration_url = excluded.registration_url,
  cover_url = excluded.cover_url,
  featured = excluded.featured,
  published = excluded.published;

insert into public.resources (id, title, description, category, source, url, reviewed_at, pinned, published, sort_order) values
  ('oberlin-official-32-guide', 'Oberlin 3-2 Engineering Advising Guide', 'Oberlin’s advising guide explains the program structure and includes sample three-year course plans.', '3-2 planning', 'Oberlin College', 'https://www.oberlin.edu/aarc/advising-guides-major/3-2-engineering-program', '2026-08-07', true, true, 10),
  ('oberlin-engineering-program', 'Oberlin Engineering Program Page', 'Oberlin’s engineering department page lists the partner schools and current program contact information.', '3-2 planning', 'Oberlin College', 'https://www.oberlin.edu/arts-and-sciences/departments/engineering', '2026-08-07', true, true, 20),
  ('oberlin-engaged-engineering', 'Engaged 3-2 Engineering', 'Examples of internships, research, study away, and Winter Term work connected to Oberlin’s 3-2 program.', 'research', 'Oberlin College', 'https://www.oberlin.edu/arts-and-sciences/departments/engineering/engaged-engineering', '2026-08-07', false, true, 30),
  ('caltech-32', 'Caltech 3/2 Program', 'Caltech’s 3/2 program page explains the five-year route, application requirements, and financial-aid policy.', 'partner school', 'California Institute of Technology', 'https://www.admissions.caltech.edu/apply/32-program', '2026-08-07', false, true, 40),
  ('case-32', 'Case Western Reserve 3+2 Program', 'Case Western’s page explains the 3+2 structure, eligibility, application process, and program contacts.', 'partner school', 'Case Western Reserve University', 'https://case.edu/engineering/academics/undergraduate/32-program', '2026-08-07', false, true, 50),
  ('columbia-combined-plan', 'Columbia Combined Plan BA/BS', 'Columbia’s page explains its 3-2 and 4-2 routes, application requirements, housing terms, and financial aid.', 'partner school', 'Columbia University', 'https://www.engineering.columbia.edu/academics/programs/undergraduate-programs/combined-plan-babs', '2026-08-07', false, true, 60),
  ('washu-dual-degree', 'WashU Dual Degree Program', 'WashU’s page explains its three-year engineering segment, degree structure, prerequisites, and scholarship information.', 'partner school', 'Washington University in St. Louis', 'https://engineering.washu.edu/academics/dual-degree-program/index.html', '2026-08-07', false, true, 70),
  ('oberlin-career', 'Career Exploration and Development', 'Oberlin’s career center provides advising, internship-search support, and application help.', 'careers', 'Oberlin College', 'https://www.oberlin.edu/career', '2026-08-07', false, true, 80),
  ('oberlin-research', 'Undergraduate Research at Oberlin', 'Oberlin’s undergraduate research page lists campus programs, funding, and contacts.', 'research', 'Oberlin College', 'https://www.oberlin.edu/undergraduate-research', '2026-08-07', false, true, 90),
  ('nsf-reu', 'NSF Research Experiences for Undergraduates', 'Search NSF’s directory of REU sites and apply through each host program.', 'research', 'National Science Foundation', 'https://www.nsf.gov/funding/initiatives/reu', '2026-08-07', false, true, 100),
  ('arduino-docs', 'Arduino Documentation', 'Arduino’s documentation covers board setup, programming references, hardware specifications, and introductory tutorials.', 'project skills', 'Arduino', 'https://docs.arduino.cc/', '2026-08-07', false, true, 110),
  ('freecad-docs', 'FreeCAD Documentation', 'FreeCAD’s getting-started guide covers installation, the interface, workbenches, and basic 3D modeling.', 'project skills', 'FreeCAD', 'https://wiki.freecad.org/Getting_started', '2026-08-07', false, true, 120)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  source = excluded.source,
  url = excluded.url,
  reviewed_at = excluded.reviewed_at,
  pinned = excluded.pinned,
  published = excluded.published,
  sort_order = excluded.sort_order;

insert into public.opportunities (id, title, organization, type, description, deadline_label, deadline, location, url, featured, published) values
  ('founding-projects-role', 'Project coordinator', 'Oberlin 3-2 Engineering Society', 'Leadership', 'Coordinate project scopes, equipment needs, mentors, and progress updates after projects are selected.', 'No fixed deadline', null, 'Oberlin College', '/join?interest=leadership', true, true),
  ('event-volunteer', 'Event support volunteer', 'Oberlin 3-2 Engineering Society', 'Volunteer', 'Help with setup, check-in, cleanup, and accessibility needs at a confirmed society event.', 'Opens when an event is scheduled', null, 'Oberlin College', '/join?interest=events', true, false)
on conflict (id) do update set
  title = excluded.title,
  organization = excluded.organization,
  type = excluded.type,
  description = excluded.description,
  deadline_label = excluded.deadline_label,
  deadline = excluded.deadline,
  location = excluded.location,
  url = excluded.url,
  featured = excluded.featured,
  published = excluded.published;

insert into public.news_posts (id, slug, title, excerpt, body, author, published_at, cover_url, featured, published) values
  ('founding-launch', 'founding-launch', 'The society is entering its founding stage', 'Membership interest, leadership interest, and project proposals are now being collected.', 'The public website has been rebuilt around the society’s actual stage. Four project briefs are proposals, the first event is still being scheduled, leadership vacancies are shown as open, and the resource library points to original sources. The next step is to recruit the founding group and confirm the first meeting.', 'Frank (Kwaku) Kusi Appiah', '2026-08-07', 'assets/images/photos/motherboard-macro.jpg', true, true)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  excerpt = excluded.excerpt,
  body = excluded.body,
  author = excluded.author,
  published_at = excluded.published_at,
  cover_url = excluded.cover_url,
  featured = excluded.featured,
  published = excluded.published;

insert into public.competition_editions (id, year, title, eyebrow, theme, tagline, description, status, season, registration_open, registration_deadline, event_date, venue, hero_url, prize_pool, rules_url, results_published, published, tracks, stages, criteria) values
  ('competition-status', '', 'No competition or showcase is scheduled.', 'Competition status', '', '', 'Members have not approved an engineering competition or showcase.', 'Not planned', '', false, null, null, '', '', '', '', false, false, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
on conflict (id) do update set
  year = excluded.year,
  title = excluded.title,
  eyebrow = excluded.eyebrow,
  theme = excluded.theme,
  tagline = excluded.tagline,
  description = excluded.description,
  status = excluded.status,
  season = excluded.season,
  registration_open = excluded.registration_open,
  registration_deadline = excluded.registration_deadline,
  event_date = excluded.event_date,
  venue = excluded.venue,
  hero_url = excluded.hero_url,
  prize_pool = excluded.prize_pool,
  rules_url = excluded.rules_url,
  results_published = excluded.results_published,
  published = excluded.published,
  tracks = excluded.tracks,
  stages = excluded.stages,
  criteria = excluded.criteria;

insert into public.partner_schools (id, name, short_name, location, region_code, url, description, questions, published, sort_order) values
  ('caltech', 'California Institute of Technology', 'Caltech', 'Pasadena, California', 'CA', 'https://www.admissions.caltech.edu/apply/32-program', 'Caltech’s page describes a five-year 3/2 route leading to a liberal-arts bachelor’s degree and a Caltech BS. Review its current admission and financial-aid rules before applying.', '["Which entrance or academic-preparation requirements apply to my application year?","Which engineering option fits my Oberlin preparation?","What is the current financial-aid policy for my citizenship status?","What housing is available to incoming 3/2 students?"]'::jsonb, true, 10),
  ('case-western', 'Case Western Reserve University', 'Case Western', 'Cleveland, Ohio', 'OH', 'https://case.edu/engineering/academics/undergraduate/32-program', 'Case Western’s page describes three years at an affiliate school followed by two years of engineering, with one bachelor’s degree from each school.', '["Which prerequisites apply to my intended engineering major?","How will my Oberlin courses transfer?","What are the current GPA and application requirements?","What financial aid and housing options apply to 3+2 students?"]'::jsonb, true, 20),
  ('columbia', 'Columbia University', 'Columbia', 'New York, New York', 'NY', 'https://www.engineering.columbia.edu/academics/programs/undergraduate-programs/combined-plan-babs', 'Columbia’s page describes 3-2 and 4-2 Combined Plan routes. Check its current prerequisites, admission process, housing terms, and financial-aid rules.', '["Which courses and grades are required for my intended major?","How does affiliate status affect review?","What housing is guaranteed and for how long?","What is the current cost and aid process?"]'::jsonb, true, 30),
  ('washu', 'Washington University in St. Louis', 'WashU', 'St. Louis, Missouri', 'MO', 'https://engineering.washu.edu/academics/dual-degree-program/index.html', 'WashU’s page describes three additional years leading to an engineering bachelor’s and master’s degree. Confirm the degree plan and timeline for your application year.', '["Is my expected route three years at WashU, and which degrees would I earn?","Which prerequisites and GPA rules apply?","How does the tuition discount or other aid work for my situation?","Which bachelor’s and master’s combinations are available?"]'::jsonb, true, 40)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  location = excluded.location,
  region_code = excluded.region_code,
  url = excluded.url,
  description = excluded.description,
  questions = excluded.questions,
  published = excluded.published,
  sort_order = excluded.sort_order;

insert into public.impact (id, founded, current_term, operating_stage, public_metrics, milestones, reports, published) values
  ('main', '2026', '2026–27', 'Founding stage', '[]'::jsonb, '[{"period":"August 2026","title":"Publish the society’s first website","description":"Publish membership information, leadership openings, the first-year roadmap, and links to Oberlin and partner-school resources.","status":"Complete"},{"period":"August–September 2026","title":"Recruit the founding group","description":"Collect interest forms, confirm the remaining founding members, and fill the open officer roles.","status":"In progress"},{"period":"Early fall 2026","title":"Hold the first member meeting","description":"Meet with founding members to review officer roles, project interests, chartering work, and immediate tasks.","status":"Planned"},{"period":"Fall 2026","title":"Review proposals for the first projects","description":"Confirm a lead, workspace, tools, estimated cost, safety needs, and first milestone before selecting a project.","status":"Planned"},{"period":"Fall 2026","title":"Hold the first confirmed event","description":"Set an organizer, topic, date, room, and access information before announcing the event.","status":"Planned"},{"period":"End of first term","title":"Publish a short founding-term report","description":"Report confirmed participation counts, meetings held, project status, spending, unfinished work, and next steps.","status":"Planned"}]'::jsonb, '[]'::jsonb, true)
on conflict (id) do update set
  founded = excluded.founded,
  current_term = excluded.current_term,
  operating_stage = excluded.operating_stage,
  public_metrics = excluded.public_metrics,
  milestones = excluded.milestones,
  reports = excluded.reports,
  published = excluded.published;

insert into public.documents (id, title, category, description, url, format, published, sort_order) values
  ('official-oberlin-guide', 'Official Oberlin 3-2 Engineering Advising Guide', 'Academic planning', 'Oberlin’s advising guide explains the program structure and includes sample three-year course plans.', 'https://www.oberlin.edu/aarc/advising-guides-major/3-2-engineering-program', 'Web page', true, 10)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  url = excluded.url,
  format = excluded.format,
  published = excluded.published,
  sort_order = excluded.sort_order;
