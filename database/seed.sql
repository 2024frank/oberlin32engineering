-- Versioned public content for the Oberlin 3-2 Engineering Society
-- Run after schema.sql, members.sql, and migrations/2026-08-07-complete-site.sql. Re-running is safe.

insert into public.site_settings (id, settings, published) values ('main', '{"name":"Oberlin 3-2 Engineering Society","short_name":"Oberlin 3-2","domain":"https://www.oberlin32engineeringsociety.com","founded":"2026","tagline":"A student community for engineering at Oberlin.","hero_title":"A place for Oberlin students who want to build.","hero_description":"A new student-led community for engineering, 3-2 planning, and collaborative technical projects.","join_url":"/join","instagram_url":"https://www.instagram.com/oberlin32engineering/","instagram_handle":"@oberlin32engineering","contact_email":"fkusiapp@oberlin.edu","founder":"Kwaku Kusi Appiah","advisor":"Not yet confirmed","announcement":"Launching in 2026–27. Founding members and student leaders are welcome.","announcement_link":"/join","status":"Founding stage","launch_term":"2026–27","content_version":"2026-08-07-rebuild"}'::jsonb, true) on conflict (id) do update set settings = excluded.settings, published = true;

insert into public.leaders (id, name, role, term, class_year, major, bio, expected_time, photo_url, linkedin_url, email, current, advisor, open_seat, published, sort_order) values
  ('kwaku-kusi-appiah', 'Kwaku Kusi Appiah', 'Founder and president', '2026–27', '', '3-2 Engineering', 'Starting the society, recruiting the first team, and coordinating the launch. Kwaku is interested in electrical engineering, robotics, embedded systems, and hardware-software projects.', '3–5 hours per week during launch', '', '', 'fkusiapp@oberlin.edu', true, false, false, true, 10),
  ('open-operations-coordinator', 'Open position', 'Operations and finance coordinator', '2026–27', '', 'Any field', 'Keeps meeting notes, task ownership, simple budgets, reimbursements, room requests, and organizational records in order.', 'About 2 hours per week', '', '', '', true, false, true, true, 20),
  ('open-projects-coordinator', 'Open position', 'Projects coordinator', '2026–27', '', 'Any field', 'Helps teams define scope, identify tools and mentors, schedule check-ins, and publish honest project updates.', 'About 2–3 hours per week', '', '', '', true, false, true, true, 30),
  ('open-community-coordinator', 'Open position', 'Community and events coordinator', '2026–27', '', 'Any field', 'Plans welcoming meetings, gathers scheduling and access needs, and coordinates speakers or campus collaborators after details are confirmed.', 'About 2 hours per week', '', '', '', true, false, true, true, 40),
  ('open-communications-coordinator', 'Open position', 'Communications coordinator', '2026–27', '', 'Any field', 'Maintains clear website and social updates, takes or organizes photographs with consent, and avoids presenting plans as completed work.', 'About 1–2 hours per week', '', '', '', true, false, true, true, 50)
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
  ('founding-meetup', 'founding-meetup', 'Founding Meetup', 'Meet other interested students, review the first-year plan, and choose which projects and events deserve attention first.', 'The date, time, and room are being scheduled. Pizza and accessibility details will be confirmed with the final announcement.', 'Community', 'Planned', 'Date and room being scheduled', null, null, 'Oberlin College, room to be announced', '/join?interest=events', 'assets/images/photos/makerspace-sign.jpg', true, true),
  ('pizza-and-pathways', 'pizza-and-pathways', 'Pizza + Pathways', 'A student conversation about the questions people have before committing to or applying through the 3-2 pathway.', 'The session will use current official links and a question checklist. It will not replace individual academic advising.', 'Advising', 'Planned', 'Planned for the 2026–27 academic year', null, null, 'To be announced', '/join?interest=events', 'assets/images/photos/solder-practice.jpg', true, true),
  ('first-build-night', 'first-build-night', 'First Build Night', 'A low-pressure session for reviewing project proposals, testing small components, and helping beginners choose a first task.', 'This event will be scheduled only after a project, workspace, supervision plan, and safe equipment list are confirmed.', 'Build session', 'Planned', 'Timing depends on project selection', null, null, 'Workspace to be confirmed', '/join?interest=projects', 'assets/images/photos/tool-pegboard.jpg', false, true),
  ('engineering-conversation', 'engineering-conversation', 'Engineer or Alumni Conversation', 'A practical conversation about engineering study, work, projects, and decisions students wish they had understood earlier.', 'A speaker and topic have not yet been confirmed. Suggestions and introductions are welcome through the contact page.', 'Speaker', 'Planned', 'Speaker and date not yet confirmed', null, null, 'To be announced', '/contact', 'assets/images/photos/circuit-board-dark.jpg', false, true)
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
  ('oberlin-official-32-guide', 'Oberlin 3-2 Engineering Advising Guide', 'The primary Oberlin starting point for program structure, sample planning, affiliated schools, and advising context.', '3-2 planning', 'Oberlin College', 'https://www.oberlin.edu/aarc/advising-guides-major/3-2-engineering-program', '2026-08-07', true, true, 10),
  ('oberlin-engineering-program', 'Oberlin Engineering Program Page', 'Official program overview, current contact information, and links to related engineering experiences.', '3-2 planning', 'Oberlin College', 'https://www.oberlin.edu/arts-and-sciences/departments/engineering', '2026-08-07', true, true, 20),
  ('oberlin-engaged-engineering', 'Engaged 3-2 Engineering', 'Examples of research, internships, study away, winter term, and other applied experiences connected to the pathway.', 'research', 'Oberlin College', 'https://www.oberlin.edu/arts-and-sciences/departments/engineering/engaged-engineering', '2026-08-07', false, true, 30),
  ('caltech-32', 'Caltech 3/2 Program', 'Current Caltech program overview and application links. International students should check the financial-aid policy carefully.', 'partner school', 'California Institute of Technology', 'https://www.admissions.caltech.edu/apply/32-program', '2026-08-07', false, true, 40),
  ('case-32', 'Case Western Reserve 3+2 Program', 'Official program description, eligibility, application direction, and contact information.', 'partner school', 'Case Western Reserve University', 'https://case.edu/engineering/academics/undergraduate/32-program', '2026-08-07', false, true, 50),
  ('columbia-combined-plan', 'Columbia Combined Plan BA/BS', 'Official Columbia Engineering overview for the 3-2 and 4-2 Combined Plan pathways.', 'partner school', 'Columbia University', 'https://www.engineering.columbia.edu/academics/programs/undergraduate-programs/combined-plan-babs', '2026-08-07', false, true, 60),
  ('washu-dual-degree', 'WashU Dual Degree Program', 'Current WashU program information. WashU now describes a three-year engineering segment leading to an engineering bachelor’s and master’s, so confirm the timeline and degree plan directly.', 'partner school', 'Washington University in St. Louis', 'https://engineering.washu.edu/academics/dual-degree-program/index.html', '2026-08-07', false, true, 70),
  ('oberlin-career', 'Career Exploration and Development', 'Oberlin career advising, internship support, employer resources, and application preparation.', 'careers', 'Oberlin College', 'https://www.oberlin.edu/career', '2026-08-07', false, true, 80),
  ('oberlin-research', 'Undergraduate Research at Oberlin', 'Starting point for campus research information and support.', 'research', 'Oberlin College', 'https://www.oberlin.edu/undergraduate-research', '2026-08-07', false, true, 90),
  ('nsf-reu', 'NSF Research Experiences for Undergraduates', 'Official directory for NSF-funded REU sites. Eligibility varies by program, so verify each listing.', 'research', 'National Science Foundation', 'https://www.nsf.gov/crssprgm/reu/', '2026-08-07', false, true, 100),
  ('arduino-docs', 'Arduino Documentation', 'Official tutorials and references useful for introductory electronics and microcontroller projects.', 'project skills', 'Arduino', 'https://docs.arduino.cc/', '2026-08-07', false, true, 110),
  ('freecad-docs', 'FreeCAD Documentation', 'Official open-source CAD documentation for students who need a no-cost modeling tool.', 'project skills', 'FreeCAD', 'https://wiki.freecad.org/Getting_started', '2026-08-07', false, true, 120)
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
  ('founding-operations-role', 'Operations and finance coordinator', 'Oberlin 3-2 Engineering Society', 'Leadership', 'Help run meetings, records, simple budgets, room requests, and follow-up. Good organization matters more than technical experience.', 'Interest reviewed on a rolling basis', null, 'Oberlin College', '/join?interest=leadership', true, true),
  ('founding-projects-role', 'Projects coordinator', 'Oberlin 3-2 Engineering Society', 'Leadership', 'Help project teams turn broad ideas into manageable tasks, identify tools or mentors, and publish short progress notes.', 'Interest reviewed on a rolling basis', null, 'Oberlin College', '/join?interest=leadership', true, true),
  ('project-team-interest', 'Founding project team member', 'Oberlin 3-2 Engineering Society', 'Project', 'Join one of the proposed teams through hardware, software, data, CAD, research, testing, documentation, or coordination.', 'Open while teams are forming', null, 'Oberlin College', '/join?interest=projects', true, true),
  ('event-volunteer', 'Launch-event volunteer', 'Oberlin 3-2 Engineering Society', 'Volunteer', 'Help with room setup, attendance, accessibility checks, photography with consent, food, or post-event follow-up.', 'Open before each confirmed event', null, 'Oberlin College', '/join?interest=events', false, true),
  ('resource-reviewer', 'Resource and link reviewer', 'Oberlin 3-2 Engineering Society', 'Volunteer', 'Check official links, note update dates, flag unclear claims, and help keep the 3-2 resource library accurate.', 'Open during the founding term', null, 'Remote or Oberlin College', '/join?interest=communications', false, true)
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
  ('founding-launch', 'founding-launch', 'The society is entering its founding stage', 'Membership interest, leadership interest, and project proposals are now being collected.', 'The public website has been rebuilt around the society’s actual stage. Four project briefs are proposals, the first event is still being scheduled, leadership vacancies are shown as open, and the resource library points to original sources. The next step is to recruit the founding group and confirm the first meeting.', 'Kwaku Kusi Appiah', '2026-08-07', 'assets/images/photos/motherboard-macro.jpg', true, true)
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
  ('future-showcase-concept', 'Future', 'Future Oberlin Engineering Showcase', 'Idea under evaluation', 'Student work explained clearly', 'Demonstrate what was tested and what was learned.', 'The society is considering a future event where student teams could demonstrate projects and explain their design decisions. The format, date, venue, funding, approval path, and review process are not confirmed.', 'Idea under evaluation', 'Not scheduled', false, null, null, 'Not confirmed', 'assets/images/photos/tool-pegboard.jpg', 'No prizes or awards confirmed', '', false, true, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
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
  ('caltech', 'California Institute of Technology', 'Caltech', 'Pasadena, California', 'CA', 'https://www.admissions.caltech.edu/apply/32-program', 'Caltech describes a five-year 3/2 route leading to a liberal-arts bachelor’s and a Caltech BS. Admission is selective and current international-aid rules require careful review.', '["Which entrance or academic-preparation requirements apply to my application year?","Which engineering option fits my Oberlin preparation?","What is the current financial-aid policy for my citizenship status?","What housing is available to incoming 3/2 students?"]'::jsonb, true, 10),
  ('case-western', 'Case Western Reserve University', 'Case Western', 'Cleveland, Ohio', 'OH', 'https://case.edu/engineering/academics/undergraduate/32-program', 'Case describes a three-year liberal-arts plus two-year engineering pathway leading to two bachelor’s degrees, subject to current eligibility and admission rules.', '["Which prerequisites apply to my intended engineering major?","How will my Oberlin courses transfer?","What are the current GPA and application requirements?","What financial aid and housing options apply to 3+2 students?"]'::jsonb, true, 20),
  ('columbia', 'Columbia University', 'Columbia', 'New York, New York', 'NY', 'https://www.engineering.columbia.edu/academics/programs/undergraduate-programs/combined-plan-babs', 'Columbia’s Combined Plan is usually completed as a 3-2 sequence and may also have a 4-2 route. Review current affiliate, prerequisite, admission, housing, and financial-aid information.', '["Which courses and grades are required for my intended major?","How does affiliate status affect review?","What housing is guaranteed and for how long?","What is the current cost and aid process?"]'::jsonb, true, 30),
  ('washu', 'Washington University in St. Louis', 'WashU', 'St. Louis, Missouri', 'MO', 'https://engineering.washu.edu/academics/dual-degree-program/index.html', 'WashU currently presents its Dual Degree Program as three additional years leading to an engineering bachelor’s and master’s, not a simple two-year continuation. Confirm how the current structure applies to Oberlin students.', '["Is my expected route three years at WashU, and which degrees would I earn?","Which prerequisites and GPA rules apply?","How does the tuition discount or other aid work for my situation?","Which bachelor’s and master’s combinations are available?"]'::jsonb, true, 40)
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
  ('main', '2026', '2026–27', 'Founding stage', '[]'::jsonb, '[{"period":"August 2026","title":"Publish an honest founding website","description":"Replace inflated claims with clear status labels, verified resources, working forms, and proposed project briefs.","status":"Complete"},{"period":"August–September 2026","title":"Recruit the founding group","description":"Collect member interests, discuss leadership capacity, and identify students willing to own the first tasks.","status":"In progress"},{"period":"Early fall 2026","title":"Hold the first member meeting","description":"Confirm a room, date, agenda, access information, and a clear decision process for first-year priorities.","status":"Planned"},{"period":"Fall 2026","title":"Select one or two first projects","description":"Choose projects only after a lead, team, scope, tools, safety plan, and first milestone are defined.","status":"Planned"},{"period":"Fall 2026","title":"Run the first practical program","description":"Test one 3-2 planning conversation, build session, or speaker event and gather participant feedback.","status":"Planned"},{"period":"End of first term","title":"Publish a short founding-term report","description":"Record what happened, what did not happen, participation counts, project status, spending, and next steps.","status":"Planned"}]'::jsonb, '[]'::jsonb, true)
on conflict (id) do update set
  founded = excluded.founded,
  current_term = excluded.current_term,
  operating_stage = excluded.operating_stage,
  public_metrics = excluded.public_metrics,
  milestones = excluded.milestones,
  reports = excluded.reports,
  published = excluded.published;

insert into public.documents (id, title, category, description, url, format, published, sort_order) values
  ('official-oberlin-guide', 'Official Oberlin 3-2 Engineering Advising Guide', 'Academic planning', 'Current official Oberlin starting point for the pathway.', 'https://www.oberlin.edu/aarc/advising-guides-major/3-2-engineering-program', 'Web page', true, 10)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  url = excluded.url,
  format = excluded.format,
  published = excluded.published,
  sort_order = excluded.sort_order;
