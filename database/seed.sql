-- Initial public content for the Oberlin 3-2 Engineering Society
-- Run after database/schema.sql. Re-running is safe.

insert into public.site_settings (id, settings, published) values ('main', '{"name":"Oberlin 3-2 Engineering Society","short_name":"Oberlin 3-2","domain":"https://oberlin32engineeringsociety.com","founded":"2026","tagline":"Connect. Prepare. Build.","hero_title":"Engineering belongs at the center of Oberlin.","hero_description":"A student-led community in formation for engineering-minded Obies to find collaborators, navigate the 3-2 pathway, develop projects, and turn ideas into visible work.","join_url":"https://forms.gle/6pPoj3hqQMJADLjZ6","instagram_url":"https://www.instagram.com/oberlin32engineering/","instagram_handle":"@oberlin32engineering","contact_email":"fkusiapp@oberlin.edu","founder":"Kusi Appiah","advisor":"Samantha","competition_name":"Oberlin Engineering Challenge","competition_season":"Date to be announced","announcement":"Founding members, student leaders, and project collaborators are being recruited for the 2026–27 launch.","announcement_link":"https://forms.gle/6pPoj3hqQMJADLjZ6","status":"Student organization in formation","launch_term":"2026–27"}'::jsonb, true) on conflict (id) do update set settings = excluded.settings, published = true;

insert into public.projects (id, slug, title, kicker, summary, description, category, status, year, progress, featured, published, skills, open_roles, team_names, accent, cover_url, impact, project_url, github_url, sort_order) values
  ('environmental-sensing', 'environmental-sensing-network', 'Environmental Sensing Network', '2026–27 flagship build', 'A low-cost sensor network that turns local environmental measurements into useful, visible information for campus and community partners.', 'The team will explore sensing, power, wireless communication, data quality, dashboards, and long-term maintenance. The project is intentionally interdisciplinary and can support embedded systems, electrical design, software, data science, environmental studies, fabrication, and public communication.', 'Climate + Embedded Systems', 'Team formation', '2026–27', 12, true, true, '["ESP32","Sensors","Python","Data visualization","Field testing"]'::jsonb, '["Hardware","Firmware","Data","Design","Community research"]'::jsonb, '[]'::jsonb, 'gold', '', 'Make environmental conditions easier to measure, understand, and act on.', '', '', 1),
  ('autonomous-systems', 'small-autonomous-system', 'Small Autonomous System', 'Open project brief', 'A compact robot designed around one clear task, with sensing, controls, mechanical design, and reliable system integration.', 'Rather than building a robot that tries to do everything, the team will choose a focused challenge and engineer a dependable solution. The build can include computer vision, navigation, embedded control, mechanisms, and human interaction.', 'Robotics + Controls', 'Open for a lead', '2026–27', 5, true, true, '["C/C++","Controls","CAD","Computer vision","Fabrication"]'::jsonb, '["Project lead","Mechanical","Electronics","Software"]'::jsonb, '[]'::jsonb, 'maroon', '', 'Create a visible platform for learning how complete engineering systems come together.', '', '', 2),
  ('assistive-design', 'assistive-design-studio', 'Assistive Design Studio', 'Human-centered engineering', 'A collaborative design process that begins with a real person or partner and develops a practical device around a clearly understood need.', 'This project prioritizes listening, iteration, testing, accessibility, and responsible design. Teams can combine mechanics, electronics, user research, industrial design, and rapid prototyping.', 'Design + Accessibility', 'Seeking a partner', '2026–27', 8, true, true, '["User research","CAD","Prototyping","Testing","Accessibility"]'::jsonb, '["Design research","Mechanical","Prototype testing"]'::jsonb, '[]'::jsonb, 'ivory', '', 'Build with people, not simply for them.', '', '', 3),
  ('campus-energy', 'campus-energy-story', 'Campus Energy Story', 'Data made public', 'An interactive experience that translates building and energy data into a story students can understand and use.', 'The project can combine data analysis, web development, visualization, physical displays, and sustainability communication. The goal is not merely to show numbers, but to reveal patterns and support better questions.', 'Energy + Data', 'Scope development', '2026–27', 10, false, true, '["Data analysis","JavaScript","Visualization","Energy systems"]'::jsonb, '["Data","Web","Visual design","Research"]'::jsonb, '[]'::jsonb, 'gold', '', 'Turn technical information into a shared campus resource.', '', '', 4),
  ('creative-technology', 'creative-technology-installation', 'Creative Technology Installation', 'Engineering meets the arts', 'A responsive installation combining sensors, light, sound, movement, or projection with Oberlin''s creative culture.', 'This project gives conservatory, arts, science, and engineering-minded students a shared build space. The final work should be technically thoughtful, artistically intentional, and designed for public interaction.', 'Interactive Media', 'Team formation', '2026–27', 3, false, true, '["Microcontrollers","Lighting","Sound","Fabrication","Interaction design"]'::jsonb, '["Creative direction","Electronics","Sound","Fabrication"]'::jsonb, '[]'::jsonb, 'maroon', '', 'Create a project that could only happen at a place like Oberlin.', '', '', 5),
  ('student-tools', 'tools-for-student-life', 'Tools for Student Life', 'Software with a real user', 'A focused digital product that removes friction from one important student experience and is tested with the people who will use it.', 'The team will identify a narrow problem, study the current experience, prototype rapidly, and measure whether the finished tool actually helps. Strong scope discipline matters more than feature count.', 'Software + Product', 'Problem submissions open', '2026–27', 2, false, true, '["JavaScript","Product design","APIs","User testing"]'::jsonb, '["Product","Frontend","Backend","UX research"]'::jsonb, '[]'::jsonb, 'ivory', '', 'Solve one student problem exceptionally well.', '', '', 6)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  kicker = excluded.kicker,
  summary = excluded.summary,
  description = excluded.description,
  category = excluded.category,
  status = excluded.status,
  year = excluded.year,
  progress = excluded.progress,
  featured = excluded.featured,
  published = excluded.published,
  skills = excluded.skills,
  open_roles = excluded.open_roles,
  team_names = excluded.team_names,
  accent = excluded.accent,
  cover_url = excluded.cover_url,
  impact = excluded.impact,
  project_url = excluded.project_url,
  github_url = excluded.github_url,
  sort_order = excluded.sort_order;

insert into public.project_updates (id, project_id, title, summary, body, milestone, published_at, image_url, published) values
  ('project-board-published', 'student-tools', 'Starter project board published', 'Six interdisciplinary concepts are available for founding members to review, reshape, lead, or replace.', 'These are proposed briefs, not completed teams or funded commitments. A concept becomes active only after members confirm a responsible scope, leadership, permissions, safety needs, available support, and a realistic first milestone.', 'Open review', '2026-08-06', '', true),
  ('environmental-sensing-brief', 'environmental-sensing', 'Environmental sensing brief opened for interest', 'Students interested in sensors, embedded systems, data, design, or field research can help decide whether this should become a first-year build.', 'The first step is not buying hardware. It is identifying a useful measurement problem, intended users, site permissions, maintenance expectations, safety requirements, and the smallest test that would produce meaningful evidence.', 'Concept review', '2026-08-06', '', true),
  ('autonomous-system-interest', 'autonomous-systems', 'Autonomous systems concept seeks a potential lead', 'A student lead could help choose one focused task and evaluate whether a small team can build and test it responsibly.', 'Possible work includes mechanics, sensing, embedded control, software, and testing. The concept remains open until a lead, workspace, safety plan, mentorship needs, and achievable scope are identified.', 'Leadership interest', '2026-08-06', '', true),
  ('assistive-design-safeguard', 'assistive-design', 'Assistive design concept starts with a partner-first safeguard', 'No device should be designed until a willing person or organization helps define the need and meaning of success.', 'Any future team should begin with listening, consent, shared problem definition, accessibility, realistic testing, and responsible ownership. This concept remains inactive until an appropriate partner and process are confirmed.', 'Safeguard defined', '2026-08-06', '', true)
on conflict (id) do update set
  project_id = excluded.project_id,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  milestone = excluded.milestone,
  published_at = excluded.published_at,
  image_url = excluded.image_url,
  published = excluded.published;

insert into public.leaders (id, name, role, term, class_year, major, bio, photo_url, linkedin_url, email, current, advisor, open_seat, published, sort_order) values
  ('kusi-appiah', 'Kusi Appiah', 'Founder & President', '2026–27', '', '3-2 Engineering', 'Building a lasting home for engineering community, project collaboration, and shared knowledge at Oberlin.', '', '', 'fkusiapp@oberlin.edu', true, false, false, true, 1),
  ('samantha-advisor', 'Samantha', 'Organization Advisor', '2026–27', '', '', 'Supporting the society''s development, continuity, and connection to Oberlin resources.', '', '', '', true, true, false, true, 2),
  ('vice-president-open', 'Position Open', 'Vice President', '2026–27', '', '', 'Help lead meetings, coordinate the executive board, and turn strategy into consistent action.', '', '', '', true, false, true, true, 3),
  ('treasurer-open', 'Position Open', 'Treasurer', '2026–27', '', '', 'Own budgets, funding requests, reimbursements, purchasing, and responsible financial records.', '', '', '', true, false, true, true, 4),
  ('projects-chair-open', 'Position Open', 'Projects Chair', '2026–27', '', '', 'Build the project pipeline, support team leads, organize design reviews, and move ideas toward demonstrations.', '', '', '', true, false, true, true, 5),
  ('programs-chair-open', 'Position Open', 'Programs & Partnerships Chair', '2026–27', '', '', 'Lead panels, workshops, speakers, alumni relationships, co-sponsorships, and external partnerships.', '', '', '', true, false, true, true, 6),
  ('communications-open', 'Position Open', 'Communications & Membership Chair', '2026–27', '', '', 'Grow the community, welcome members, manage communications, and make the society visible across campus.', '', '', '', true, false, true, true, 7)
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  term = excluded.term,
  class_year = excluded.class_year,
  major = excluded.major,
  bio = excluded.bio,
  photo_url = excluded.photo_url,
  linkedin_url = excluded.linkedin_url,
  email = excluded.email,
  current = excluded.current,
  advisor = excluded.advisor,
  open_seat = excluded.open_seat,
  published = excluded.published,
  sort_order = excluded.sort_order;

insert into public.events (id, slug, title, summary, description, event_type, date_label, start_at, end_at, location, registration_url, cover_url, featured, published) values
  ('founding-team-session', 'founding-team-session', 'Founding Team Planning Session', 'The first working session for founders and students interested in leadership, projects, outreach, and the Fall launch.', 'We will confirm responsibilities, review the charter process, prepare for tabling, and decide the first public meeting and project priorities.', 'Leadership', 'August 2026 · Date to be announced', null, null, 'Oberlin College · Room to be announced', 'https://forms.gle/6pPoj3hqQMJADLjZ6', '', true, true),
  ('connections-table', 'fall-connections-table', 'Meet the Society at Fall Tabling', 'Meet the founding team, explore the project board, and find your place in Oberlin''s engineering community.', 'Students can join the mailing list, express leadership interest, volunteer for projects, and register for the kickoff event.', 'Campus', 'Fall 2026 · Details coming soon', null, null, 'Oberlin College', 'https://forms.gle/6pPoj3hqQMJADLjZ6', '', true, true),
  ('kickoff-pizza', 'engineering-kickoff', 'Engineering Kickoff + Pizza Night', 'The first all-community gathering for engineering-minded students across departments and class years.', 'Meet collaborators, hear the society''s plan, explore the 3-2 pathway, pitch project ideas, and choose how you want to participate.', 'Community', 'Early Fall 2026', null, null, 'Oberlin College · Room to be announced', 'https://forms.gle/6pPoj3hqQMJADLjZ6', '', true, true),
  ('pathways-panel', '3-2-pathways-panel', '3-2 Pathways Panel', 'A practical conversation about planning, partner schools, transitions, engineering fields, and the questions students should ask early.', 'The panel will bring together program knowledge, student perspective, and alumni experience in one useful session.', 'Panel', 'Fall 2026', null, null, 'Oberlin College', '', '', false, true),
  ('project-pitch-night', 'project-pitch-night', 'Project Pitch Night', 'Bring a problem, a rough idea, or a skill you want to use. Leave with a team and a sharper project brief.', 'Teams will form around achievable problems, define users and impact, identify technical needs, and prepare for design review.', 'Projects', 'Fall 2026', null, null, 'Oberlin College', '', '', false, true),
  ('engineering-challenge', 'oberlin-engineering-challenge', 'Future Oberlin Engineering Challenge', 'A developing concept for a public build challenge and interdisciplinary project showcase.', 'The society is exploring a format that could move teams from problem framing to prototype, testing, documentation, and a public technical explanation. No date, venue, awards, or official rules are confirmed.', 'Flagship', 'Future concept · Date to be announced', null, null, 'To be announced', 'competition.html', '', false, true)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  event_type = excluded.event_type,
  date_label = excluded.date_label,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  location = excluded.location,
  registration_url = excluded.registration_url,
  cover_url = excluded.cover_url,
  featured = excluded.featured,
  published = excluded.published;

insert into public.resources (id, title, description, category, source, url, pinned, published, sort_order) values
  ('oberlin-program', 'Oberlin 3-2 Engineering Program', 'Official program overview, current partner institutions, program director contact, and the five-year academic structure.', '3-2 Planning', 'Oberlin College', 'https://www.oberlin.edu/arts-and-sciences/departments/engineering', true, true, 1),
  ('advising-guide', '3-2 Engineering Advising Guide', 'Questions and planning context for students considering the pathway and mapping their time at Oberlin.', '3-2 Planning', 'Oberlin College', 'https://www.oberlin.edu/aarc/advising-guides-major/3-2-engineering-program', true, true, 2),
  ('course-catalog', 'Oberlin Course Catalog', 'Course descriptions, academic policies, degree requirements, and program information for long-range planning.', 'Academic Planning', 'Oberlin College', 'https://catalog.oberlin.edu/', true, true, 3),
  ('academic-calendar', 'Academic Calendar', 'Semester dates, registration milestones, breaks, and academic deadlines.', 'Academic Planning', 'Oberlin College', 'https://www.oberlin.edu/registrar/academic-calendar', false, true, 4),
  ('career-center', 'Career Exploration and Development', 'Support for internships, resumes, interviews, networking, experiential learning, and career planning.', 'Career', 'Oberlin College', 'https://www.oberlin.edu/career', true, true, 5),
  ('student-organizations', 'Student Leadership and Involvement', 'GOberlin, event resources, student organization support, and campus involvement information.', 'Campus', 'Oberlin College', 'https://www.oberlin.edu/student-involvement', false, true, 6),
  ('caltech', 'California Institute of Technology', 'Official site for one of Oberlin''s current 3-2 engineering partner institutions.', 'Partner Schools', 'Partner institution', 'https://www.caltech.edu/', false, true, 7),
  ('case-western', 'Case Western Reserve University', 'Official site for one of Oberlin''s current 3-2 engineering partner institutions.', 'Partner Schools', 'Partner institution', 'https://case.edu/', false, true, 8),
  ('columbia', 'Columbia University', 'Official site for one of Oberlin''s current 3-2 engineering partner institutions.', 'Partner Schools', 'Partner institution', 'https://www.columbia.edu/', false, true, 9),
  ('washu', 'Washington University in St. Louis', 'Official site for one of Oberlin''s current 3-2 engineering partner institutions.', 'Partner Schools', 'Partner institution', 'https://wustl.edu/', false, true, 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  source = excluded.source,
  url = excluded.url,
  pinned = excluded.pinned,
  published = excluded.published,
  sort_order = excluded.sort_order;

insert into public.opportunities (id, title, organization, type, description, deadline_label, deadline, location, url, featured, published) values
  ('founding-board', 'Join the Founding Team', 'Oberlin 3-2 Engineering Society', 'Leadership', 'Help establish the systems, programs, identity, and culture that future boards will inherit.', 'Applications reviewed on a rolling basis', null, 'Oberlin College', 'https://forms.gle/6pPoj3hqQMJADLjZ6', true, true),
  ('project-leads', 'Become a Project Lead', 'Oberlin 3-2 Engineering Society', 'Projects', 'Choose a proposed brief, test its feasibility, sharpen the scope, recruit collaborators, and define a responsible first milestone.', 'Fall 2026 team formation', null, 'Hybrid project work', 'projects.html', true, true),
  ('competition-committee', 'Help Evaluate the Engineering Challenge Concept', 'Oberlin 3-2 Engineering Society', 'Competition', 'Join the group deciding whether a future public build challenge is useful and feasible, and help draft possible tracks, review standards, safety needs, logistics, and resource requirements.', 'Exploratory group forming', null, 'Oberlin College', 'competition.html', true, true),
  ('panel-volunteers', 'Programs and Panel Team', 'Oberlin 3-2 Engineering Society', 'Programs', 'Help identify speakers, contact alumni, plan useful questions, and run high-quality technical and career events.', 'Open throughout the year', null, 'Oberlin College', 'join.html', false, true)
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
  ('society-launch', 'building-a-home-for-engineering-at-oberlin', 'Building a Home for Engineering at Oberlin', 'The founding team is bringing students across departments and class years toward one community built around connection, preparation, and action.', 'Oberlin students interested in engineering often move through similar courses and decisions without a consistent place to meet one another. The Oberlin 3-2 Engineering Society is being built to become that place through shared knowledge, mentorship, projects, panels, and opportunity.', 'Oberlin 3-2 Engineering Society', '2026-08-06', '', true, true),
  ('project-board-open', 'the-project-board-is-open', 'Starter Project Briefs Are Open for Review', 'Six interdisciplinary starting points are available for founding members to challenge, reshape, lead, or replace with stronger ideas.', 'The project board is not a list of active assignments. It is a starting point for discussion and team formation. A concept becomes an active project only after students confirm a lead, scope, permissions, support, safety needs, and an achievable next step.', 'Projects Team', '2026-08-06', '', true, true),
  ('engineering-challenge-announced', 'introducing-the-oberlin-engineering-challenge', 'A future Engineering Challenge is being explored', 'A possible future public stage where teams could design, build, test, and explain engineering work that matters.', 'The society is exploring a future Oberlin Engineering Challenge as a possible public showcase for interdisciplinary student work. The format, date, venue, eligibility, judges, awards, and resources are not yet confirmed. Interested students can help evaluate and design the concept.', 'Organizing Team', '2026-08-06', '', true, true)
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
  ('future-concept', '', 'Oberlin Engineering Challenge', 'Future flagship concept', 'Engineering for a More Connected World', 'Design it. Build it. Defend it.', 'A proposed public challenge where interdisciplinary student teams could take a real problem from evidence to prototype, then explain and test important decisions before the Oberlin community.', 'Planning stage', 'Date to be announced', false, null, null, 'To be announced', '', 'Any awards or project support will be announced only after resources are confirmed', '', false, true, '[{"title":"Robotics + Intelligent Systems","description":"Machines that sense, decide, move, assist, or collaborate.","number":"01"},{"title":"Climate + Community","description":"Engineering responses to environmental and community needs.","number":"02"},{"title":"Built World + Mechanics","description":"Physical systems, structures, devices, manufacturing, and motion.","number":"03"},{"title":"Open Innovation","description":"Strong ideas that cross categories and create their own lane.","number":"04"}]'::jsonb, '[{"title":"Frame the problem","description":"Teams identify a real user, need, constraint, or system worth understanding.","number":"01"},{"title":"Propose the build","description":"Teams define scope, evidence, technical approach, milestones, and risks.","number":"02"},{"title":"Design reviews","description":"Mentors and reviewers challenge assumptions before teams invest deeply in the wrong direction.","number":"03"},{"title":"Build + test","description":"Teams iterate, document failures, measure performance, and improve the prototype.","number":"04"},{"title":"Public defense","description":"Finalists demonstrate the work and defend their choices before judges and the community.","number":"05"}]'::jsonb, '[{"title":"Problem understanding","weight":"20%","description":"Evidence that the team understands the people, context, constraints, and stakes."},{"title":"Engineering quality","weight":"30%","description":"Sound technical decisions, system integration, safety, rigor, and execution."},{"title":"Testing + evidence","weight":"20%","description":"Clear metrics, thoughtful experiments, honest limitations, and learning through iteration."},{"title":"Impact + responsibility","weight":"15%","description":"A credible path to usefulness with attention to ethics, access, cost, and consequences."},{"title":"Communication","weight":"15%","description":"A precise explanation, compelling demonstration, and ability to defend decisions."}]'::jsonb)
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

insert into public.sponsors (id, name, tier, logo_url, url, description, active, published, sort_order) values
  ('founding-partners', 'Collaboration framework', 'Not yet published', '', 'contact.html', 'A placeholder record for future, formally confirmed support relationships. It remains unpublished until an agreement exists.', false, false, 1)
on conflict (id) do update set
  name = excluded.name,
  tier = excluded.tier,
  logo_url = excluded.logo_url,
  url = excluded.url,
  description = excluded.description,
  active = excluded.active,
  published = excluded.published,
  sort_order = excluded.sort_order;

insert into public.partner_schools (id, name, short_name, location, region_code, url, questions, published, sort_order) values
  ('caltech', 'California Institute of Technology', 'Caltech', 'Pasadena, California', 'CA', 'https://www.caltech.edu/', '["Current transfer pathway and eligibility","Engineering field fit","Course sequencing","Financial aid and housing"]'::jsonb, true, 1),
  ('case-western', 'Case Western Reserve University', 'Case Western Reserve', 'Cleveland, Ohio', 'OH', 'https://case.edu/', '["Current transfer pathway and eligibility","Engineering field fit","Course sequencing","Financial aid and housing"]'::jsonb, true, 2),
  ('columbia', 'Columbia University', 'Columbia University', 'New York, New York', 'NY', 'https://www.columbia.edu/', '["Current transfer pathway and eligibility","Engineering field fit","Course sequencing","Financial aid and housing"]'::jsonb, true, 3),
  ('washu', 'Washington University in St. Louis', 'Washington University', 'St. Louis, Missouri', 'MO', 'https://wustl.edu/', '["Current transfer pathway and eligibility","Engineering field fit","Course sequencing","Financial aid and housing"]'::jsonb, true, 4)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  location = excluded.location,
  region_code = excluded.region_code,
  url = excluded.url,
  questions = excluded.questions,
  published = excluded.published,
  sort_order = excluded.sort_order;

insert into public.impact (id, founded, current_term, operating_stage, public_metrics, milestones, reports, published) values
  ('main', '2026', '2026–27', 'Founding year', '[{"value":"01","label":"community being built","note":"Across departments, class years, and engineering interests"},{"value":"06","label":"initial project briefs","note":"Open to challenge, lead, and reshape"},{"value":"04","label":"partner engineering schools","note":"Referenced through official Oberlin resources"},{"value":"01","label":"future challenge concept","note":"Format and date not yet confirmed"}]'::jsonb, '[{"period":"Summer 2026","title":"Organizing phase","description":"Mission, identity, founding recruitment, digital systems, and initial project concepts are being prepared.","status":"active"},{"period":"Fall 2026","title":"Campus launch","description":"Form the founding board, table, hold the first general meeting, open the resource hub, and evaluate project teams and programs.","status":"planned"},{"period":"2026–27","title":"Build and learn","description":"Develop only the projects and programs that have clear teams, responsible scope, appropriate support, and achievable next steps.","status":"planned"},{"period":"Future phase","title":"Public demonstration concept","description":"Consider a project showcase or engineering challenge after teams, resources, safety, space, and partners are confirmed.","status":"concept"}]'::jsonb, '[{"year":"2026–27","title":"Founding Year Annual Report","status":"Planned for the end of the founding year","url":"","published":true}]'::jsonb, true)
on conflict (id) do update set
  founded = excluded.founded,
  current_term = excluded.current_term,
  operating_stage = excluded.operating_stage,
  public_metrics = excluded.public_metrics,
  milestones = excluded.milestones,
  reports = excluded.reports,
  published = excluded.published;

insert into public.documents (id, title, category, description, url, format, published, sort_order) values
  ('project-brief-template', 'Project Brief Template', 'Projects', 'A practical structure for defining the problem, users, scope, constraints, evidence, roles, budget, and next review.', 'assets/downloads/project-brief-template.md', 'Markdown', true, 1),
  ('design-review-template', 'Design Review Checklist', 'Projects', 'Questions teams should answer before major spending, fabrication, or software architecture decisions.', 'assets/downloads/design-review-checklist.md', 'Markdown', true, 2),
  ('leadership-handoff-template', 'Leadership Handoff Template', 'Governance', 'A term-end handoff format covering responsibilities, calendars, contacts, budgets, files, unfinished work, and lessons.', 'assets/downloads/leadership-handoff-template.md', 'Markdown', true, 3),
  ('pathway-question-sheet', '3-2 Advising Question Sheet', '3-2 Planning', 'A question list students can take to official advising conversations when comparing plans and partner institutions.', 'assets/downloads/3-2-advising-questions.md', 'Markdown', true, 4)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  url = excluded.url,
  format = excluded.format,
  published = excluded.published,
  sort_order = excluded.sort_order;
