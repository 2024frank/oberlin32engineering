(() => {
  'use strict';

  const config = window.O32_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  const API = String(config.supabaseUrl || '').replace(/\/$/, '');
  const ANON = config.supabaseAnonKey || '';
  const BUCKET = config.storageBucket || 'society-media';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const safeId = (value = '') => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72);
  const initials = (value = '') => String(value).split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'O3';
  const formatDate = (value, withTime = false) => {
    if (!value) return 'Not set';
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(date);
  };
  const pretty = (value = '') => String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  /* datetime-local wants local wall-clock time. toISOString would hand it UTC,
   * which silently shifts the value the officer sees by their offset. */
  const localInputValue = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const authScreen = $('[data-auth-screen]');
  const portal = $('[data-portal]');
  const loginView = $('[data-login-view]');
  const codeView = $('[data-code-view]');
  const passwordView = $('[data-password-view]');
  const configView = $('[data-config-view]');
  const loginForm = $('[data-login-form]');
  const codeForm = $('[data-code-form]');
  const passwordForm = $('[data-password-form]');
  const content = $('[data-content]');
  const viewTitle = $('[data-view-title]');
  const breadcrumb = $('[data-breadcrumb]');
  const primaryAction = $('[data-primary-action]');
  const editorDialog = $('[data-editor-dialog]');
  const editorForm = $('[data-editor-form]');
  const editorFields = $('[data-editor-fields]');
  const editorTitle = $('[data-editor-title]');
  const editorKicker = $('[data-editor-kicker]');
  const deleteRecord = $('[data-delete-record]');
  const confirmDialog = $('[data-confirm-dialog]');

  let session = null;
  let profile = null;
  let activeView = 'dashboard';
  let activeRecords = [];
  let editorContext = null;
  let pendingConfirm = null;

  const text = (name, label, options = {}) => ({ name, label, type: 'text', ...options });
  const area = (name, label, options = {}) => ({ name, label, type: 'textarea', full: true, ...options });
  const check = (name, label, options = {}) => ({ name, label, type: 'checkbox', ...options });
  const number = (name, label, options = {}) => ({ name, label, type: 'number', ...options });
  const date = (name, label, options = {}) => ({ name, label, type: 'date', ...options });
  const datetime = (name, label, options = {}) => ({ name, label, type: 'datetime-local', ...options });
  const array = (name, label, options = {}) => ({ name, label, type: 'array', full: true, ...options });
  const json = (name, label, options = {}) => ({ name, label, type: 'json', full: true, ...options });
  const image = (name, label, options = {}) => ({ name, label, type: 'image', full: true, ...options });
  const select = (name, label, options = [], extra = {}) => ({ name, label, type: 'select', options, ...extra });

  /* Twelve collections rendered from one template were indistinguishable: the
   * only wayfinding cue was which sidebar row happened to be highlighted. Each
   * one now carries a line icon and an accent hue, used in the sidebar, the
   * page head, and as the row marker for records with no photograph. Line
   * drawings rather than emoji, so they inherit colour and stay legible small. */
  const ICONS = {
    dashboard: '<path d="M4 13h7V4H4zM13 8h7V4h-7zM13 20h7v-9h-7zM4 20h7v-5H4z"/>',
    submissions: '<path d="M3 8l9 6 9-6"/><rect x="3" y="5" width="18" height="14" rx="2"/>',
    projects: '<path d="M4 4h16v16H4z"/><path d="M4 10h16M10 10v10"/>',
    project_updates: '<path d="M9 6h11M9 12h11M9 18h7"/><circle cx="4.5" cy="6" r="1.3"/><circle cx="4.5" cy="12" r="1.3"/><circle cx="4.5" cy="18" r="1.3"/>',
    events: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    leaders: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
    resources: '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.5-2.5a4 4 0 1 0-5.7-5.7l-1.2 1.2"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.5 2.5a4 4 0 1 0 5.7 5.7l1.2-1.2"/>',
    opportunities: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
    news_posts: '<rect x="3" y="5" width="13" height="15" rx="1.5"/><path d="M16 9h5v9a2 2 0 0 1-2 2M6 9h7M6 13h7M6 17h4"/>',
    partner_schools: '<path d="M3 21h18M5 21V9l7-5 7 5v12M10 21v-6h4v6"/>',
    competition_editions: '<circle cx="12" cy="9" r="5"/><path d="M8.8 13.2 7 21l5-2.7L17 21l-1.8-7.8"/>',
    impact: '<path d="M3 20h18"/><path d="M7 20v-5M12 20v-9M17 20v-13"/>',
    documents: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    sponsors: '<path d="M20.6 12.4 12 21l-8.6-8.6V3.8H12z"/><circle cx="7.6" cy="7.6" r="1.4"/>',
    site_settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>',
    members: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.2 2.7-5.4 6-5.4s6 2.2 6 5.4"/><path d="M16 5.4a3.2 3.2 0 0 1 0 6.2M17.5 13.9c2.1.6 3.5 2.4 3.5 4.6"/>',
    broadcasts: '<path d="M4 9v6h4l6 4V5L8 9z"/><path d="M17.5 8.5a5 5 0 0 1 0 7"/>',
    media: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m3 17 5-4.5 4 3.5 3-2.5 6 5"/>',
    content_audit: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>',
    edit: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.5 6.5l3 3"/>',
    duplicate: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    reviewed: '<path d="m5 13 4 4L19 7"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>'
  };
  const ACCENTS = {
    projects: 210, project_updates: 196, events: 24, leaders: 340, resources: 168,
    opportunities: 262, news_posts: 44, partner_schools: 232, competition_editions: 288,
    impact: 152, documents: 12, sponsors: 96
  };
  function iconMarkup(key, extraClass = '') {
    const path = ICONS[key];
    if (!path) return '';
    return `<svg class="icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  const collections = {
    projects: {
      label: 'Projects', singular: 'project', titleField: 'title', subtitleField: 'status', imageField: 'cover_url', order: 'sort_order.asc,title.asc',
      description: 'Publish honest project proposals and active work. Use the status field to distinguish an idea from a staffed project.',
      fields: [text('id','Record ID',{required:true}), text('slug','URL slug',{required:true}), text('title','Project title',{required:true}), text('kicker','Short label'), area('summary','Card summary',{required:true,rows:3}), area('description','Full brief',{required:true,rows:7}), text('category','Category',{required:true}), select('status','Project stage',['Idea under review','Open for interest','Scoping','Active','Paused','Complete'],{help:'Where the work itself stands. Separate from whether the record is visible.'}), text('year','Term or year'), number('progress','Progress',{min:0,max:100}), check('featured','Featured'), check('published','Visible on the public site'), array('skills','Useful skills'), array('open_roles','Open roles'), array('team_names','Team members'), select('accent','Accent',['maroon','gold','ivory']), image('cover_url','Cover image'), area('impact','Purpose or intended impact',{rows:3}), text('project_url','Project URL'), text('github_url','GitHub URL'), number('sort_order','Sort order',{min:0})]
    },
    project_updates: {
      label: 'Project updates', singular: 'project update', titleField: 'title', subtitleField: 'milestone', imageField: 'image_url', order: 'published_at.desc,title.asc',
      description: 'Record dated decisions, tests, setbacks, and milestones for real project work.',
      fields: [text('id','Record ID',{required:true}), text('project_id','Project ID',{required:true}), text('title','Title',{required:true}), area('summary','Summary',{required:true,rows:3}), area('body','Update',{required:true,rows:8}), text('milestone','Milestone label'), date('published_at','Publication date'), image('image_url','Image'), check('published','Visible on the public site')]
    },
    events: {
      label: 'Events', singular: 'event', titleField: 'title', subtitleField: 'date_label', imageField: 'cover_url', order: 'start_at.asc,title.asc',
      description: 'Publish dates only after they are confirmed. Planned formats may remain visible with a clear status.',
      fields: [text('id','Record ID',{required:true}), text('slug','URL slug',{required:true}), text('title','Event title',{required:true}), area('summary','Summary',{required:true,rows:3}), area('description','Description',{rows:6}), select('event_type','Event type',['Meetup','Workshop','Build night','Speaker','Info session','Social','Tour','Other']), select('status','Event stage',['Planned','Scheduling','Registration open','Confirmed','Completed','Cancelled'],{help:'Where the event itself stands. Separate from whether the record is visible.'}), text('date_label','Public date label',{required:true}), datetime('start_at','Start time'), datetime('end_at','End time'), text('location','Location'), text('registration_url','Registration URL'), image('cover_url','Event image'), check('featured','Featured'), check('published','Visible on the public site')]
    },
    leaders: {
      label: 'Leadership', singular: 'leadership record', titleField: 'name', subtitleField: 'role', imageField: 'photo_url', order: 'sort_order.asc,name.asc',
      description: 'Show named organizers and specific open roles. Do not publish placeholder people.',
      fields: [text('id','Record ID',{required:true}), text('name','Name',{required:true}), text('role','Role',{required:true}), text('term','Term'), text('class_year','Class year'), text('major','Major or pathway'), area('bio','Biography or role description',{rows:5}), image('photo_url','Portrait'), text('linkedin_url','LinkedIn URL'), text('email','Email'), check('current','Current'), check('advisor','Advisor'), check('open_seat','Open role'), check('published','Visible on the public site'), number('sort_order','Sort order',{min:0})]
    },
    resources: {
      label: 'Resources', singular: 'resource', titleField: 'title', subtitleField: 'category', order: 'pinned.desc,sort_order.asc,title.asc',
      description: 'Keep official links current and record the date each resource was checked.',
      fields: [text('id','Record ID',{required:true}), text('title','Title',{required:true}), area('description','Description',{rows:4}), text('category','Category',{required:true}), text('source','Source'), text('url','URL',{required:true}), date('reviewed_at','Last checked'), check('pinned','Pinned'), check('published','Visible on the public site'), number('sort_order','Sort order',{min:0})]
    },
    opportunities: {
      label: 'Opportunities', singular: 'opportunity', titleField: 'title', subtitleField: 'type', order: 'featured.desc,deadline.asc,title.asc',
      description: 'Publish current openings with a direct source and a clear deadline or rolling-review label.',
      fields: [text('id','Record ID',{required:true}), text('title','Title',{required:true}), text('organization','Organization'), text('type','Type'), area('description','Description',{required:true,rows:5}), text('deadline_label','Deadline label'), date('deadline','Deadline'), text('location','Location'), text('url','Application URL'), check('featured','Featured'), check('published','Visible on the public site')]
    },
    news_posts: {
      label: 'News', singular: 'news post', titleField: 'title', subtitleField: 'published_at', imageField: 'cover_url', order: 'published_at.desc,title.asc',
      description: 'Publish concise announcements and records of what the society actually did.',
      fields: [text('id','Record ID',{required:true}), text('slug','URL slug',{required:true}), text('title','Title',{required:true}), area('excerpt','Excerpt',{required:true,rows:3}), area('body','Body',{required:true,rows:10}), text('author','Author'), date('published_at','Publication date'), image('cover_url','Cover image'), check('featured','Featured'), check('published','Visible on the public site')]
    },
    partner_schools: {
      label: 'Partner schools', singular: 'partner-school card', titleField: 'name', subtitleField: 'location', order: 'sort_order.asc,name.asc',
      description: 'Maintain links to official partner-school information. Recheck details before each advising cycle.',
      fields: [text('id','Record ID',{required:true}), text('name','Institution name',{required:true}), text('short_name','Short name'), text('location','Location'), text('region_code','State code'), text('url','Official URL',{required:true}), area('description','Current summary',{rows:5}), json('questions','Questions students should ask',{help:'JSON array of strings.'}), check('published','Visible on the public site'), number('sort_order','Sort order',{min:0})]
    },
    competition_editions: {
      label: 'Future showcase', singular: 'showcase concept', titleField: 'title', subtitleField: 'status', imageField: 'hero_url', order: 'year.desc',
      description: 'Keep this as a proposal until a venue, team, budget, approval path, and date are confirmed.',
      fields: [text('id','Record ID',{required:true}), text('year','Year or stage'), text('title','Title',{required:true}), text('eyebrow','Label'), text('theme','Theme'), text('tagline','Tagline'), area('description','Description',{required:true,rows:7}), select('status','Showcase stage',['Idea under evaluation','Scoping','Seeking approval','Approved','Scheduled','Complete','Shelved']), text('season','Season'), check('registration_open','Registration open'), date('registration_deadline','Registration deadline'), date('event_date','Event date'), text('venue','Venue'), image('hero_url','Hero image'), text('prize_pool','Awards statement'), text('rules_url','Rules URL'), check('results_published','Results published'), check('published','Visible on the public site'), json('tracks','Tracks'), json('stages','Stages'), json('criteria','Review criteria')]
    },
    impact: {
      label: 'Founding roadmap', singular: 'roadmap', titleField: 'current_term', subtitleField: 'operating_stage', order: 'updated_at.desc',
      description: 'Track concrete commitments and outcomes. Publish numbers only after they can be supported.',
      fields: [text('id','Record ID',{required:true}), text('founded','Founded'), text('current_term','Current term',{required:true}), text('operating_stage','Operating stage'), json('public_metrics','Public metrics'), json('milestones','Milestones'), json('reports','Reports'), check('published','Visible on the public site')]
    },
    documents: {
      label: 'Documents', singular: 'document', titleField: 'title', subtitleField: 'category', order: 'sort_order.asc,title.asc',
      description: 'Publish useful permanent files such as planning sheets, reports, or governance documents.',
      fields: [text('id','Record ID',{required:true}), text('title','Title',{required:true}), text('category','Category'), area('description','Description',{rows:4}), text('url','URL',{required:true}), text('format','Format'), check('published','Visible on the public site'), number('sort_order','Sort order',{min:0})]
    },
    sponsors: {
      label: 'Sponsors and collaborators', singular: 'supporter', titleField: 'name', subtitleField: 'tier', imageField: 'logo_url', order: 'sort_order.asc,name.asc',
      description: 'Publish only confirmed relationships and describe the support accurately.',
      fields: [text('id','Record ID',{required:true}), text('name','Name',{required:true}), text('tier','Relationship type'), image('logo_url','Logo'), text('url','URL'), area('description','Description',{rows:4}), check('active','Active'), check('published','Visible on the public site'), number('sort_order','Sort order',{min:0})]
    }
  };

  /* Eighteen fields in one undivided column with a single Save button gave no
   * sense of what belonged with what. Grouped into the four things an officer
   * actually comes here to change. Advisor and organization status were free
   * text, which invited a different phrasing every time they were touched. */
  const SITE_SECTIONS = [
    { title: 'Identity', copy: 'How the society names itself across the site.', fields: [
      text('name','Organization name',{required:true}), text('short_name','Short name'),
      text('domain','Canonical domain'), text('founded','Founded'), text('tagline','Tagline'),
      text('launch_term','Current term'),
      select('status','Organization status',['Founding stage','Recruiting','Active','On hiatus','Closed']),
    ]},
    { title: 'Homepage', copy: 'The opening lines and the link the join buttons point at.', fields: [
      text('hero_title','Homepage title'), area('hero_description','Homepage description',{rows:4}),
      text('join_url','Join page URL'),
    ]},
    { title: 'Contact and social', copy: 'Where the public reaches the society.', fields: [
      text('contact_email','Contact email'), text('instagram_url','Instagram URL'),
      text('instagram_handle','Instagram handle'), text('founder','Founder'),
      select('advisor','Advisor status',['Not yet confirmed','Being identified','In conversation','Confirmed']),
    ]},
    { title: 'Announcement bar', copy: 'The strip across the top of every public page. Leave the text empty to hide it.', fields: [
      area('announcement','Announcement text',{rows:2}), text('announcement_link','Announcement link'),
    ]},
  ];
  const siteFields = SITE_SECTIONS.flatMap((section) => section.fields);

  function toast(message, type = 'success') {
    const region = $('[data-toasts]');
    if (!region) return;
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = message;
    region.append(node);
    window.setTimeout(() => node.remove(), 5000);
  }

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, options);
    if (!response.ok) {
      const raw = await response.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed.message || parsed.error_description || parsed.error || parsed.hint || raw;
      } catch (_) { /* use raw */ }
      throw new Error(message || `Request failed (${response.status}).`);
    }
    if (response.status === 204 || options.method === 'DELETE') return null;
    return (response.headers.get('content-type') || '').includes('application/json') ? response.json() : response.text();
  }

  function authHeaders(token = session?.access_token) {
    return { apikey: ANON, Authorization: `Bearer ${token || ANON}`, Accept: 'application/json' };
  }

  function saveSession(value) {
    session = value;
    if (session) sessionStorage.setItem('o32-officer-session', JSON.stringify(session));
    else sessionStorage.removeItem('o32-officer-session');
  }

  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem('o32-officer-session') || 'null'); }
    catch (_) { return null; }
  }

  async function refreshSession() {
    if (!session?.refresh_token) throw new Error('Your session has ended. Sign in again.');
    const next = await request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    next.expires_at = Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600);
    saveSession(next);
  }

  async function ensureSession() {
    if (!session) throw new Error('Sign in required.');
    if (Number(session.expires_at || 0) < Math.floor(Date.now() / 1000) + 60) await refreshSession();
  }

  async function signIn(email, password) {
    const next = await request('/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    next.expires_at = Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600);
    saveSession(next);
  }

  async function verifyCode(email, token) {
    let lastError = null;
    for (const type of ['invite', 'recovery']) {
      try {
        const next = await request('/auth/v1/verify', {
          method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ type, email, token })
        });
        next.expires_at = Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600);
        saveSession(next);
        return type;
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error('That code was not accepted.');
  }

  async function loadProfile() {
    if (!session?.user?.id && session?.access_token) {
      session.user = await request('/auth/v1/user', { headers: authHeaders() });
      saveSession(session);
    }
    if (!session?.user?.id) throw new Error('No authenticated user was returned.');
    const base = `/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}`;
    let rows;
    try {
      rows = await request(`${base}&select=id,email,full_name,role,society_role_id`, { headers: authHeaders() });
    } catch (error) {
      if (!/society_role_id|schema cache|column.*does not exist|could not find/i.test(error.message || '')) throw error;
      rows = await request(`${base}&select=id,email,full_name,role`, { headers: authHeaders() });
      if (Array.isArray(rows)) rows = rows.map((row) => ({ ...row, society_role_id: null }));
    }
    const record = Array.isArray(rows) ? rows[0] : null;
    if (!record || !['admin','editor'].includes(record.role)) throw new Error('This account is not listed as a society officer.');
    profile = record;
  }

  async function signOut() {
    try { if (session?.access_token) await request('/auth/v1/logout', { method: 'POST', headers: authHeaders() }); }
    catch (_) { /* local sign-out still succeeds */ }
    saveSession(null); profile = null; portal.hidden = true; authScreen.hidden = false; loginView.hidden = false; codeView.hidden = true; passwordView.hidden = true;
  }

  async function rows(table, order = '') {
    await ensureSession();
    const query = new URLSearchParams({ select: '*' });
    if (order) query.set('order', order);
    return request(`/rest/v1/${table}?${query}`, { headers: authHeaders() });
  }

  async function saveRecord(table, record, existingId = '') {
    await ensureSession();
    if (existingId) {
      const result = await request(`/rest/v1/${table}?id=eq.${encodeURIComponent(existingId)}`, { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(record) });
      return Array.isArray(result) ? result[0] : result;
    }
    const result = await request(`/rest/v1/${table}`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(record) });
    return Array.isArray(result) ? result[0] : result;
  }

  async function deleteTableRecord(table, id) {
    await ensureSession();
    return request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() });
  }

  async function apiCall(path, options = {}) {
    await ensureSession();
    const response = await fetch(path, { ...options, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  async function uploadFile(file, collection = 'general') {
    const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif','application/pdf']);
    if (!allowed.has(file.type)) throw new Error('Use a JPG, PNG, WebP, GIF, or PDF file.');
    if (file.size > 15 * 1024 * 1024) throw new Error('Files must be 15 MB or smaller.');
    await ensureSession();
    const extension = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = safeId(file.name.replace(/\.[^.]+$/, '')) || 'upload';
    const now = new Date();
    const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2,'0')}`;
    const path = `${collection}/${folder}/${Date.now()}-${base}.${extension}`;
    await request(`/storage/v1/object/${encodeURIComponent(BUCKET)}/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': file.type, 'x-upsert': 'false' }, body: file });
    const publicUrl = `${API}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${path.split('/').map(encodeURIComponent).join('/')}`;
    try {
      await request('/rest/v1/media', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ file_name: file.name, storage_path: path, public_url: publicUrl, mime_type: file.type, size_bytes: file.size, uploaded_by: session.user.id }) });
    } catch (error) { console.warn('Could not record media metadata:', error.message); }
    return publicUrl;
  }

  function titleFor(definition, record) { return record?.[definition.titleField] || record?.id || 'Untitled'; }
  function subtitleFor(definition, record) { return record?.[definition.subtitleField] || record?.category || record?.type || ''; }
  /* The pill answers "can the public see this", so it says so. The word Status
   * now belongs solely to the stage field inside the editor. */
  function statusMarkup(record) {
    const published = record.published !== false;
    return `<span class="status ${published ? '' : 'draft'}">${published ? 'Public' : 'Hidden'}</span>`;
  }

  /* Nearly every seeded record shared one absolute date, which told an officer
   * nothing. Recency is what the column is for, so recent edits read as elapsed
   * time and anything older falls back to the date. */
  function relativeDate(value) {
    if (!value) return 'Not set';
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return formatDate(value);
    const seconds = Math.round((Date.now() - then) / 1000);
    if (seconds < 0) return formatDate(value);
    if (seconds < 90) return 'Just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return formatDate(value);
  }

  /* Only Leadership holds people, so only Leadership gets initials. Everywhere
   * else a monogram was noise: Founding roadmap rendered a bare "2". The
   * collection's own icon carries more meaning in the same square. */
  function rowMarker(view, definition, record, title) {
    const imageUrl = definition.imageField ? record[definition.imageField] : '';
    if (imageUrl) return `<img src="${escapeHTML(imageUrl)}" alt="">`;
    if (view === 'leaders') return `<span class="marker">${escapeHTML(initials(title))}</span>`;
    return `<span class="marker marker--icon">${iconMarkup(view)}</span>`;
  }

  /* One Create button, in the topbar, where it stays put as the officer scrolls.
   * The head used to render a second identical one directly beneath it.
   *
   * The editorial policy line ("Do not publish placeholder people") used to sit
   * here permanently in prime space, which reads as the product distrusting the
   * person using it. It is onboarding, so it collapses. */
  function viewHead(view, definition, count) {
    const noun = count === 1 ? definition.singular : `${definition.singular}s`;
    return `<div class="view-head view-head--collection" style="--accent-h:${ACCENTS[view] ?? 340}">
      <span class="view-head__icon">${iconMarkup(view)}</span>
      <div><h2>${escapeHTML(definition.label)}</h2><p class="view-head__count">${count} ${escapeHTML(noun)}</p></div>
      <details class="guideline"><summary>Editing guidance</summary><p>${escapeHTML(definition.description)}</p></details>
    </div>`;
  }

  function tableMarkup(view, definition, records) {
    if (!records.length) {
      return `<div class="empty"><div>${iconMarkup(view, 'empty__icon')}<h3>No ${escapeHTML(definition.label.toLowerCase())} yet</h3><p>Create the first record. Keep it hidden until the information is ready for the public site.</p><button class="button primary" type="button" data-create>Create ${escapeHTML(definition.singular)}</button></div></div>`;
    }
    return `<div class="table-wrap"><table><thead><tr><th>Record</th><th>Visibility</th><th>Updated</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${records.map((record) => {
      const title = titleFor(definition, record);
      const subtitle = subtitleFor(definition, record);
      const stamp = record.updated_at || record.created_at;
      return `<tr><td><div class="record-title">${rowMarker(view, definition, record, title)}<div><strong>${escapeHTML(title)}</strong><small>${escapeHTML(subtitle)}</small></div></div></td><td>${statusMarkup(record)}</td><td><time title="${escapeHTML(formatDate(stamp, true))}">${escapeHTML(relativeDate(stamp))}</time></td><td><div class="row-actions"><button type="button" data-edit="${escapeHTML(record.id)}" title="Edit" aria-label="Edit ${escapeHTML(title)}">${iconMarkup('edit')}<span>Edit</span></button><button type="button" data-copy="${escapeHTML(record.id)}" title="Duplicate" aria-label="Duplicate ${escapeHTML(title)}">${iconMarkup('duplicate')}<span>Copy</span></button><button class="danger" type="button" data-remove="${escapeHTML(record.id)}" title="Delete" aria-label="Delete ${escapeHTML(title)}">${iconMarkup('trash')}<span>Delete</span></button></div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  async function renderCollection(view) {
    const definition = collections[view];
    activeRecords = await rows(view, definition.order || 'updated_at.desc');
    content.innerHTML = `${viewHead(view, definition, activeRecords.length)}<div class="toolbar"><label><span class="sr-only">Search</span><input type="search" data-search placeholder="Search ${escapeHTML(definition.label.toLowerCase())}"></label><select data-filter><option value="all">All records</option><option value="published">Public</option><option value="draft">Hidden</option><option value="featured">Featured</option></select></div><div data-results>${tableMarkup(view, definition, activeRecords)}</div>`;
    const refresh = () => {
      const query = String($('[data-search]')?.value || '').trim().toLowerCase(); const filter = $('[data-filter]')?.value || 'all';
      const filtered = activeRecords.filter((record) => {
        const status = filter === 'all' || (filter === 'published' && record.published !== false) || (filter === 'draft' && record.published === false) || (filter === 'featured' && record.featured);
        return status && (!query || JSON.stringify(record).toLowerCase().includes(query));
      });
      $('[data-results]').innerHTML = tableMarkup(view, definition, filtered); bindRecordActions(view);
    };
    $('[data-search]')?.addEventListener('input', refresh); $('[data-filter]')?.addEventListener('change', refresh); bindRecordActions(view);
  }

  function bindRecordActions(view) {
    $$('[data-create]', content).forEach((button) => button.addEventListener('click', () => openEditor(view)));
    $$('[data-edit]', content).forEach((button) => button.addEventListener('click', () => { const record = activeRecords.find((item) => String(item.id) === button.dataset.edit); if (record) openEditor(view, record); }));
    $$('[data-copy]', content).forEach((button) => button.addEventListener('click', () => {
      const original = activeRecords.find((item) => String(item.id) === button.dataset.copy); if (!original) return;
      const copy = structuredClone(original); delete copy.created_at; delete copy.updated_at; copy.id = `${safeId(titleFor(collections[view], copy))}-copy-${Date.now().toString().slice(-5)}`; if (copy.slug) copy.slug = `${safeId(copy.slug)}-copy`; copy.published = false; openEditor(view, copy, true);
    }));
    $$('[data-remove]', content).forEach((button) => button.addEventListener('click', () => {
      const record = activeRecords.find((item) => String(item.id) === button.dataset.remove); if (!record) return;
      confirmAction(`Delete ${titleFor(collections[view], record)}?`, 'This permanently removes the record from the content database.', async () => { await deleteTableRecord(view, record.id); toast('Record deleted.'); await renderCollection(view); });
    }));
  }

  function valueFor(field, record) {
    const value = record?.[field.name];
    if (field.type === 'json') return value ? JSON.stringify(value, null, 2) : '[]';
    if (field.type === 'array') return Array.isArray(value) ? value.join(', ') : (value || '');
    if (field.type === 'datetime-local' && value) return String(value).slice(0,16);
    return value ?? '';
  }

  function fieldMarkup(field, record) {
    const value = valueFor(field, record); const required = field.required ? ' required' : ''; const help = field.help ? `<small>${escapeHTML(field.help)}</small>` : '';
    const minmax = `${field.min !== undefined ? ` min="${field.min}"` : ''}${field.max !== undefined ? ` max="${field.max}"` : ''}`;
    if (field.type === 'checkbox') return `<label class="checkbox"><input type="checkbox" name="${escapeHTML(field.name)}" ${value ? 'checked' : ''}><span>${escapeHTML(field.label)}</span></label>`;
    if (field.type === 'textarea' || field.type === 'json') return `<label class="${field.full ? 'full' : ''}"><span>${escapeHTML(field.label)}</span><textarea class="${field.type === 'json' ? 'code' : ''}" name="${escapeHTML(field.name)}" rows="${field.rows || 5}"${required}>${escapeHTML(value)}</textarea>${help}</label>`;
    if (field.type === 'select') return `<label class="${field.full ? 'full' : ''}"><span>${escapeHTML(field.label)}</span><select name="${escapeHTML(field.name)}"${required}>${field.options.map((option) => `<option value="${escapeHTML(option)}" ${String(value) === option ? 'selected' : ''}>${escapeHTML(option)}</option>`).join('')}</select>${help}</label>`;
    if (field.type === 'image') return `<div class="image-field" data-image-field="${escapeHTML(field.name)}"><span>${escapeHTML(field.label)}</span><div class="image-control"><img src="${escapeHTML(value || '../assets/images/engineering-field.svg')}" alt=""><div><input type="url" name="${escapeHTML(field.name)}" value="${escapeHTML(value)}" placeholder="Image URL"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-upload="${escapeHTML(field.name)}"><small>Use a licensed image and keep its credit in content/photo_credits.json.</small></div></div></div>`;
    const inputType = field.type === 'array' ? 'text' : field.type;
    return `<label class="${field.full ? 'full' : ''}"><span>${escapeHTML(field.label)}</span><input type="${escapeHTML(inputType)}" name="${escapeHTML(field.name)}" value="${escapeHTML(value)}"${required}${minmax}>${help}</label>`;
  }

  function openEditor(view, record = {}, forceNew = false) {
    const definition = collections[view]; if (!definition) return;
    editorContext = { view, originalId: forceNew ? '' : (record.id || ''), record };
    editorKicker.textContent = definition.label; editorTitle.textContent = `${forceNew || !record.id ? 'Create' : 'Edit'} ${definition.singular}`;
    // Record ID and URL slug are machine values. Asking a person to invent a
    // primary key before they can name their project is the system's problem
    // leaking into the interface, so both are generated on save. The slug stays
    // editable on an existing record because changing it breaks a public URL,
    // but it belongs at the bottom rather than above the title.
    const isNew = forceNew || !record.id;
    const visible = definition.fields.filter((field) => {
      if (field.name === 'id') return false;
      if (field.name === 'slug' && isNew) return false;
      return true;
    });
    // The first field is the one the officer is here to fill in, and the one an
    // empty-form save should point at. Previously that was Record ID, so the
    // browser sent them to a plumbing field to explain what was missing.
    const titleIndex = visible.findIndex((field) => field.name === definition.titleField);
    if (titleIndex > 0) visible.unshift(...visible.splice(titleIndex, 1));
    const slugField = visible.find((field) => field.name === 'slug');
    const body = visible.filter((field) => field.name !== 'slug');
    editorFields.innerHTML = body.map((field) => fieldMarkup(field, record)).join('')
      + (slugField ? `<details class="advanced"><summary>Advanced</summary><div class="advanced__fields">${fieldMarkup({ ...slugField, help: 'Changing this breaks any existing link to the public page.' }, record)}</div></details>` : '');
    deleteRecord.hidden = forceNew || !record.id;
    deleteRecord.onclick = () => confirmAction(`Delete ${titleFor(definition, record)}?`, 'This cannot be undone.', async () => { await deleteTableRecord(view, record.id); editorDialog.close(); toast('Record deleted.'); await renderCollection(view); });
    $$('[data-upload]', editorFields).forEach((input) => input.addEventListener('change', async () => {
      const file = input.files?.[0]; if (!file) return; const wrapper = input.closest('[data-image-field]');
      try { const url = await uploadFile(file, view); $(`input[name="${CSS.escape(input.dataset.upload)}"]`, wrapper).value = url; $('img', wrapper).src = url; toast('Image uploaded. Save the record to publish it.'); }
      catch (error) { toast(error.message, 'error'); }
    }));
    editorDialog.showModal();
    // A dialog reopened on a long form keeps the previous scroll position, so
    // the officer landed mid-form with the record's title above the fold.
    editorFields.scrollTop = 0;
    editorDialog.scrollTop = 0;
    $('.editor__shell', editorDialog)?.scrollTo({ top: 0 });
  }


  /* Turn a title into a URL-safe slug. */
  function toSlug(value) {
    return String(value || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  /* Fill in the machine fields the form no longer asks for. */
  function applyGeneratedKeys(definition, record, existingRecord, isNew) {
    const hasId = definition.fields.some((field) => field.name === 'id');
    const hasSlug = definition.fields.some((field) => field.name === 'slug');
    if (hasId) {
      record.id = existingRecord?.id
        || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    }
    if (hasSlug) {
      if (isNew) {
        const source = record[definition.titleField] || record.title || record.name || '';
        record.slug = toSlug(source) || `item-${String(record.id).slice(0, 8)}`;
      } else if (!record.slug) {
        record.slug = existingRecord?.slug || toSlug(record[definition.titleField] || '');
      }
    }
    return record;
  }

  function collectRecord(definition) {
    const data = new FormData(editorForm); const record = {};
    for (const field of definition.fields) {
      if (field.type === 'checkbox') { record[field.name] = Boolean($(`[name="${CSS.escape(field.name)}"]`, editorForm)?.checked); continue; }
      let value = data.get(field.name); if (typeof value === 'string') value = value.trim();
      if (field.type === 'number') record[field.name] = value === '' ? 0 : Number(value);
      else if (field.type === 'array') record[field.name] = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
      else if (field.type === 'json') { try { record[field.name] = JSON.parse(String(value || '[]')); } catch (_) { throw new Error(`${field.label} must contain valid JSON.`); } }
      else if (field.type === 'datetime-local') record[field.name] = value ? new Date(value).toISOString() : null;
      else if (field.type === 'date') record[field.name] = value || null;
      else record[field.name] = value || '';
    }
    if (!record.id) record.id = `${safeId(record.title || record.name || record.current_term || definition.singular)}-${Date.now().toString().slice(-5)}`;
    if (Object.prototype.hasOwnProperty.call(record, 'slug') && !record.slug) record.slug = safeId(record.title || record.name || record.id);
    return record;
  }

  /* A badge is a request for attention. Showing "0" made the sidebar look like
   * there was always something waiting, which trains people to ignore it. */
  function setBadge(count) {
    const badge = $('[data-new-count]');
    if (!badge) return;
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  /* The overview used to open with a motivational line and a policy paragraph,
   * then show four counters that mostly read 0 with nothing to click and no
   * hint about what to do; the audit log, the one thing that answers "what
   * changed while I was away", sat at the bottom. It now leads with the state
   * of the site, every counter is a link into the collection it counts, a
   * counter at zero says what to do about it, and recent changes come first.
   * The Common tasks grid is gone: it was the third copy of the same six
   * collection names, after the sidebar and the create buttons. */
  async function renderDashboard() {
    const names = ['projects','leaders','events','resources','submissions','content_audit'];
    const values = await Promise.all(names.map((name) => rows(name, name === 'submissions' || name === 'content_audit' ? 'created_at.desc' : 'updated_at.desc').catch(() => [])));
    const [projects, leaders, events, resources, submissions, audit] = values;
    const fresh = submissions.filter((item) => item.status === 'new');
    setBadge(fresh.length);

    const cards = [
      { view: 'projects', label: 'Published projects', value: projects.filter((item) => item.published !== false).length, empty: 'Nothing on the public projects page yet' },
      { view: 'leaders', label: 'Named officers', value: leaders.filter((item) => item.current && !item.open_seat).length, empty: 'Every seat still reads as open' },
      { view: 'events', label: 'Events with a date', value: events.filter((item) => item.start_at).length, empty: 'No confirmed date is published' },
      { view: 'submissions', label: 'New submissions', value: fresh.length, empty: 'Nothing is waiting on you' },
      { view: 'resources', label: 'Published resources', value: resources.filter((item) => item.published !== false).length, empty: 'No links published yet' },
    ];

    content.innerHTML = `
      <div class="metric-grid">${cards.map((card) => `
        <button class="metric" type="button" data-goto="${escapeHTML(card.view)}" style="--accent-h:${ACCENTS[card.view] ?? 210}">
          <span class="metric__icon">${iconMarkup(card.view)}</span>
          <span class="metric__label">${escapeHTML(card.label)}</span>
          <strong>${card.value}</strong>
          ${card.value === 0 ? `<small class="metric__hint">${escapeHTML(card.empty)}</small>` : '<small class="metric__hint">Open</small>'}
        </button>`).join('')}</div>

      <section class="panel"><header class="panel__head"><div><h3>Recent changes</h3><p>What has been edited, and by which part of the site.</p></div><button class="link-button" type="button" data-goto="content_audit">See all</button></header>
        <div class="activity-list">${audit.slice(0, 6).map((item) => `<div class="activity"><span class="marker marker--icon">${iconMarkup(item.table_name in collections ? item.table_name : 'content_audit')}</span><div><strong>${escapeHTML(auditVerb(item.action))} ${escapeHTML(auditRecordName(item))}</strong><small>${escapeHTML(pretty(item.table_name || 'content'))}</small></div><time title="${escapeHTML(formatDate(item.created_at, true))}">${escapeHTML(relativeDate(item.created_at))}</time></div>`).join('') || '<div class="activity activity--empty"><div><strong>No changes recorded yet</strong><small>Every edit you make from here will be listed.</small></div></div>'}</div></section>

      <section class="panel" style="margin-top:1rem"><header class="panel__head"><div><h3>Recent submissions</h3><p>Membership, project, event, and contact responses.</p></div>${submissions.length ? '<button class="link-button" type="button" data-goto="submissions">See all</button>' : ''}</header>
        <div class="activity-list">${submissions.slice(0, 6).map((item) => `<div class="activity"><span class="marker marker--icon">${iconMarkup('submissions')}</span><div><strong>${escapeHTML(item.full_name || item.email || 'Visitor')}</strong><small>${escapeHTML(pretty(item.type || 'submission'))}</small></div><time title="${escapeHTML(formatDate(item.created_at, true))}">${escapeHTML(relativeDate(item.created_at))}</time></div>`).join('') || '<div class="activity activity--empty"><div><strong>No submissions yet</strong><small>Anything sent through a public form arrives here.</small></div></div>'}</div></section>`;

    $$('[data-goto]', content).forEach((button) => button.addEventListener('click', () => switchView(button.dataset.goto)));
  }

  async function renderSubmissions() {
    const submissions = await rows('submissions','created_at.desc'); setBadge(submissions.filter((item) => item.status === 'new').length);
    content.innerHTML = `<div class="view-head"><div><p class="eyebrow">Inbox</p><h2>Public submissions</h2><p>Review what students sent, mark it handled, or archive it. Network hashes are used only for abuse prevention and are not shown here.</p></div></div><div class="submission-list">${submissions.map((item) => {
      const payload = item.payload || {}; const lead = payload.message || payload.motivation || payload.problem || payload.first_test || '';
      return `<article class="submission"><div><div class="submission__meta"><span>${escapeHTML(pretty(item.type))}</span><span>${escapeHTML(item.status)}</span><span>${escapeHTML(formatDate(item.created_at,true))}</span><span>${escapeHTML(item.email)}</span></div><h3>${escapeHTML(item.full_name || item.email)}</h3><p>${escapeHTML(lead)}</p><div class="submission-data">${Object.entries(payload).filter(([key]) => !['full_name','email'].includes(key)).map(([key,value]) => `<div><b>${escapeHTML(pretty(key))}</b><span>${escapeHTML(Array.isArray(value) ? value.join(', ') : value)}</span></div>`).join('')}</div></div><div class="row-actions"><button type="button" data-status="reviewed" data-id="${escapeHTML(item.id)}" title="Mark reviewed">${iconMarkup('reviewed')}<span>Reviewed</span></button><button type="button" data-status="archived" data-id="${escapeHTML(item.id)}" title="Archive">${iconMarkup('archive')}<span>Archive</span></button><button class="danger" type="button" data-delete-submission="${escapeHTML(item.id)}" title="Delete">${iconMarkup('trash')}<span>Delete</span></button></div></article>`;
    }).join('') || '<div class="empty"><div><h3>No submissions yet</h3><p>Working public forms will place new entries here.</p></div></div>'}</div>`;
    $$('[data-status]',content).forEach((button) => button.addEventListener('click', async () => { await saveRecord('submissions',{status:button.dataset.status},button.dataset.id); toast('Submission updated.'); await renderSubmissions(); }));
    $$('[data-delete-submission]',content).forEach((button) => button.addEventListener('click', () => confirmAction('Delete this submission?','This permanently removes the entry.',async()=>{await deleteTableRecord('submissions',button.dataset.deleteSubmission);toast('Submission deleted.');await renderSubmissions();})));
  }

  async function renderSiteSettings() {
    const settingsRows = await rows('site_settings','updated_at.desc'); const settings = settingsRows?.[0]?.settings || {};
    content.innerHTML = `<div class="view-head view-head--collection" style="--accent-h:262"><span class="view-head__icon">${iconMarkup('site_settings')}</span><div><h2>Site settings</h2><p class="view-head__count">${siteFields.length} values used across the public site</p></div><details class="guideline"><summary>Editing guidance</summary><p>These values control contact links, the announcement, and homepage identity. Page copy remains versioned in GitHub.</p></details></div><form data-settings-form>${SITE_SECTIONS.map((section) => `<section class="panel settings-section"><header class="panel__head"><div><h3>${escapeHTML(section.title)}</h3><p>${escapeHTML(section.copy)}</p></div></header><div class="editor__fields">${section.fields.map((field) => fieldMarkup(field, settings)).join('')}</div></section>`).join('')}<div class="settings-save"><button class="button primary" type="submit">Save settings</button></div></form>`;
    $('[data-settings-form]').addEventListener('submit',async(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);const next={};siteFields.forEach((field)=>{next[field.name]=String(data.get(field.name)||'').trim();});await request('/rest/v1/site_settings?on_conflict=id',{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:'main',settings:next,published:true})});toast('Site settings saved.');});
  }

  /* The library listed camera-roll filenames with a single Copy URL action: no
   * rename, no delete, and no alt text, which is an accessibility gap the
   * moment one of these images lands on a public page. Each card now edits its
   * own name and description, and can be removed from storage and the index. */
  async function renderMedia() {
    const media = await rows('media','created_at.desc').catch(()=>[]);
    const usage = await collectMediaUsage().catch(() => new Map());
    content.innerHTML = `<div class="view-head view-head--collection" style="--accent-h:196"><span class="view-head__icon">${iconMarkup('media')}</span><div><h2>Media library</h2><p class="view-head__count">${media.length} file${media.length === 1 ? '' : 's'}</p></div><details class="guideline"><summary>Editing guidance</summary><p>Upload public images and PDFs. Record the original source and license separately when the file is not created by the society.</p></details></div>
      <div class="media-uploader"><label><input type="file" data-media-upload accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" multiple><span class="media-uploader__face">${iconMarkup('media')}<strong>Choose files to upload</strong><small>JPG, PNG, WebP, GIF, or PDF. Maximum 15 MB each.</small></span></label></div>
      <div class="media-grid">${media.map((item) => {
        const used = usage.get(item.public_url) || [];
        const name = item.title || item.file_name;
        return `<article class="media-card" data-media-card="${escapeHTML(item.id)}">
          ${String(item.mime_type || '').startsWith('image/') ? `<img src="${escapeHTML(item.public_url)}" alt="${escapeHTML(item.alt_text || '')}">` : `<div class="media-card__file">${iconMarkup('documents')}</div>`}
          <div class="media-card__body">
            <strong title="${escapeHTML(item.file_name)}">${escapeHTML(name)}</strong>
            <small>${escapeHTML(relativeDate(item.created_at))} · ${escapeHTML(formatBytes(item.size_bytes))}</small>
            <small class="media-card__usage">${used.length ? `Used in ${escapeHTML(used.join(', '))}` : 'Not used on any page yet'}</small>
            <div class="media-card__actions">
              <button class="link-button" type="button" data-copy-url="${escapeHTML(item.public_url)}">Copy URL</button>
              <button class="link-button" type="button" data-media-edit="${escapeHTML(item.id)}">Rename</button>
              <button class="link-button danger" type="button" data-media-delete="${escapeHTML(item.id)}">Delete</button>
            </div>
            <form class="media-card__form" data-media-form="${escapeHTML(item.id)}" hidden>
              <label><span>Name</span><input type="text" name="title" maxlength="140" value="${escapeHTML(name)}"></label>
              <label><span>Alt text</span><input type="text" name="alt_text" maxlength="240" value="${escapeHTML(item.alt_text || '')}" placeholder="What the image shows"></label>
              <div><button class="button primary button--small" type="submit">Save</button><button class="link-button" type="button" data-media-cancel="${escapeHTML(item.id)}">Cancel</button></div>
            </form>
          </div>
        </article>`;
      }).join('') || `<div class="empty"><div>${iconMarkup('media','empty__icon')}<h3>No uploaded media</h3><p>The versioned site images remain available in the repository.</p></div></div>`}</div>`;

    $('[data-media-upload]')?.addEventListener('change', async (event) => {
      const files = [...(event.target.files || [])];
      for (const file of files) {
        try { await uploadFile(file, 'media'); toast(`${file.name} uploaded.`); }
        catch (error) { toast(`${file.name}: ${error.message}`, 'error'); }
      }
      await renderMedia();
    });
    $$('[data-copy-url]', content).forEach((button) => button.addEventListener('click', async () => { await navigator.clipboard.writeText(button.dataset.copyUrl); toast('URL copied.'); }));
    $$('[data-media-edit]', content).forEach((button) => button.addEventListener('click', () => { $(`[data-media-form="${CSS.escape(button.dataset.mediaEdit)}"]`).hidden = false; }));
    $$('[data-media-cancel]', content).forEach((button) => button.addEventListener('click', () => { $(`[data-media-form="${CSS.escape(button.dataset.mediaCancel)}"]`).hidden = true; }));
    $$('[data-media-form]', content).forEach((form) => form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      try {
        await saveRecord('media', { title: String(data.get('title') || '').trim(), alt_text: String(data.get('alt_text') || '').trim() }, form.dataset.mediaForm);
        toast('File details saved.');
        await renderMedia();
      } catch (error) { toast(error.message, 'error'); }
    }));
    $$('[data-media-delete]', content).forEach((button) => button.addEventListener('click', () => {
      const record = media.find((item) => String(item.id) === button.dataset.mediaDelete);
      if (!record) return;
      const used = usage.get(record.public_url) || [];
      confirmAction(
        `Delete ${record.title || record.file_name}?`,
        used.length
          ? `This file is currently used in ${used.join(', ')}. Deleting it will leave a broken image there.`
          : 'This removes the file from storage. Anything already pointing at its URL will break.',
        async () => {
          await request(`/storage/v1/object/${encodeURIComponent(BUCKET)}/${record.storage_path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE', headers: authHeaders() }).catch(() => {});
          await deleteTableRecord('media', record.id);
          toast('File deleted.');
          await renderMedia();
        }
      );
    }));
  }

  function formatBytes(bytes) {
    const size = Number(bytes || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  /* "Where is this used" answered by scanning the collections that hold an
   * image field, so deleting a file in use warns instead of silently breaking
   * a public page. */
  async function collectMediaUsage() {
    const withImages = Object.entries(collections).filter(([, definition]) => definition.imageField);
    const found = new Map();
    const results = await Promise.all(withImages.map(([view]) => rows(view).catch(() => [])));
    withImages.forEach(([view, definition], index) => {
      for (const record of results[index] || []) {
        const url = record[definition.imageField];
        if (!url) continue;
        const list = found.get(url) || [];
        if (!list.includes(definition.label)) list.push(definition.label);
        found.set(url, list);
      }
    });
    return found;
  }

  /* The log stores the Postgres verb. Officers think in Added and Edited. */
  const AUDIT_VERBS = { INSERT: 'Added', UPDATE: 'Edited', DELETE: 'Removed', TRUNCATE: 'Cleared' };
  function auditVerb(action) {
    return AUDIT_VERBS[String(action || '').toUpperCase()] || pretty(action || 'Changed');
  }
  /* Singleton tables keep one row under a fixed key. Printing "main" as if it
   * were a record name means nothing to a reader; the collection is the name. */
  function auditRecordName(item) {
    const label = item.snapshot?.title || item.snapshot?.name || item.record_id || '';
    if (!label || /^(main|default|singleton)$/i.test(label)) return pretty(item.table_name || 'record');
    return label;
  }

  async function renderAudit() {
    const audit = await rows('content_audit','created_at.desc');
    content.innerHTML = `<div class="view-head view-head--collection" style="--accent-h:210"><span class="view-head__icon">${iconMarkup('content_audit')}</span><div><h2>Change history</h2><p class="view-head__count">${audit.length} recorded change${audit.length === 1 ? '' : 's'}</p></div><details class="guideline"><summary>What this is</summary><p>Every content edit is recorded automatically for board handoff. This view is read-only.</p></details></div><div class="table-wrap"><table><thead><tr><th>Change</th><th>Record</th><th>Collection</th><th>When</th></tr></thead><tbody>${audit.map((item)=>`<tr><td><span class="verb verb--${escapeHTML(String(item.action||'').toLowerCase())}">${escapeHTML(auditVerb(item.action))}</span></td><td>${escapeHTML(auditRecordName(item))}</td><td>${escapeHTML(pretty(item.table_name))}</td><td><time title="${escapeHTML(formatDate(item.created_at,true))}">${escapeHTML(relativeDate(item.created_at))}</time></td></tr>`).join('')||'<tr><td colspan="4">No changes have been recorded.</td></tr>'}</tbody></table></div>`;
  }

  async function renderMembers() {
    if (profile.role !== 'admin') { content.innerHTML='<div class="empty"><div><h3>Administrator access required</h3><p>Editors can maintain public content. Only administrators can invite officers or change access roles.</p></div></div>'; return; }
    const [roleData, memberData] = await Promise.all([apiCall('/api/roles'),apiCall('/api/members')]); const roles=roleData.roles||[]; const members=memberData.members||[]; const invitations=memberData.invitations||[];
    const roleMap=new Map(roles.map((role)=>[role.id,role.label]));
    content.innerHTML = `<div class="view-head"><div><p class="eyebrow">Access</p><h2>Officers and roles</h2><p>Create a role before inviting someone into it. Seat limits count current profiles and pending invitations.</p></div></div><div class="grid-2"><section class="panel"><header class="panel__head"><div><h3>Invite an officer</h3><p>The recipient receives a temporary setup code.</p></div></header><form style="display:grid;gap:.8rem;padding:1rem" data-invite-form><label>Full name<input type="text" name="full_name" maxlength="120"></label><label>Email<input type="email" name="email" required></label><label>Role<select name="role_id" required><option value="">Choose a role</option>${roles.filter((role)=>role.active).map((role)=>`<option value="${escapeHTML(role.id)}">${escapeHTML(role.label)} · ${role.seats} seat${role.seats===1?'':'s'}</option>`).join('')}</select></label><label>Optional note<textarea name="message" rows="3" maxlength="800"></textarea></label><button class="button primary" type="submit">Send setup code</button><p class="form-message" data-invite-message></p></form></section><section class="panel"><header class="panel__head"><div><h3>Create a role</h3><p>Use officer titles that describe the actual responsibility.</p></div></header><form style="display:grid;gap:.8rem;padding:1rem" data-role-form><label>Role name<input type="text" name="label" required maxlength="100"></label><label>Description<textarea name="description" rows="3" maxlength="600"></textarea></label><label>Access<select name="access_level"><option value="editor">Editor</option><option value="admin">Administrator</option></select></label><label>Seats<input type="number" name="seats" value="1" min="1" max="50"></label><button class="button primary" type="submit">Create role</button></form></section></div><section class="panel" style="margin-top:1rem"><header class="panel__head"><div><h3>Current officers</h3><p>${members.length} profile${members.length===1?'':'s'}</p></div></header><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Name</th><th>Email</th><th>Officer role</th><th>Access</th></tr></thead><tbody>${members.map((member)=>`<tr><td>${escapeHTML(member.full_name||'Not set')}</td><td>${escapeHTML(member.email)}</td><td>${escapeHTML(roleMap.get(member.society_role_id)||'Not assigned')}</td><td>${escapeHTML(member.role)}</td></tr>`).join('')||'<tr><td colspan="4">No officer profiles.</td></tr>'}</tbody></table></div></section><section class="panel" style="margin-top:1rem"><header class="panel__head"><div><h3>Invitations</h3><p>Pending and historical invitation records.</p></div></header><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Sent</th><th></th></tr></thead><tbody>${invitations.map((invite)=>`<tr><td>${escapeHTML(invite.full_name||invite.email)}<br><small>${escapeHTML(invite.email)}</small></td><td>${escapeHTML(roleMap.get(invite.role_id)||'Role removed')}</td><td>${escapeHTML(invite.status)}</td><td>${escapeHTML(formatDate(invite.sent_at,true))}</td><td>${invite.status==='sent'?`<button class="link-button" type="button" data-revoke="${escapeHTML(invite.id)}">Revoke</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5">No invitations.</td></tr>'}</tbody></table></div></section><section class="panel" style="margin-top:1rem"><header class="panel__head"><div><h3>Role definitions</h3><p>Deactivate roles that should no longer accept invitations.</p></div></header><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Role</th><th>Access</th><th>Seats</th><th>Status</th><th></th></tr></thead><tbody>${roles.map((role)=>`<tr><td><strong>${escapeHTML(role.label)}</strong><br><small>${escapeHTML(role.description||'')}</small></td><td>${escapeHTML(role.access_level)}</td><td>${role.seats}</td><td>${role.active?'Active':'Inactive'}</td><td>${role.active?`<button class="link-button" type="button" data-deactivate-role="${escapeHTML(role.id)}">Deactivate</button>`:''}</td></tr>`).join('')}</tbody></table></div></section>`;
    $('[data-invite-form]').addEventListener('submit',async(event)=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));const message=$('[data-invite-message]');message.textContent='Sending…';try{await apiCall('/api/members',{method:'POST',body:JSON.stringify({action:'invite',...data})});message.textContent='Setup code sent.';message.classList.add('success');event.currentTarget.reset();toast('Officer invitation sent.');await renderMembers();}catch(error){message.textContent=error.message;}});
    $('[data-role-form]').addEventListener('submit',async(event)=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));data.seats=Number(data.seats||1);try{await apiCall('/api/roles',{method:'POST',body:JSON.stringify(data)});toast('Role created.');await renderMembers();}catch(error){toast(error.message,'error');}});
    $$('[data-revoke]',content).forEach((button)=>button.addEventListener('click',()=>confirmAction('Revoke this invitation?','The existing one-time code will no longer be treated as a pending invitation record.',async()=>{await apiCall('/api/members',{method:'POST',body:JSON.stringify({action:'revoke',id:button.dataset.revoke})});toast('Invitation revoked.');await renderMembers();},'Revoke')));
    $$('[data-deactivate-role]',content).forEach((button)=>button.addEventListener('click',()=>confirmAction('Deactivate this role?','Existing officer profiles remain. The role will disappear from new invitations.',async()=>{await apiCall('/api/roles',{method:'DELETE',body:JSON.stringify({id:button.dataset.deactivateRole})});toast('Role deactivated.');await renderMembers();},'Deactivate')));
  }

  /* Newsletters. A draft can be tested against your own address, sent now, or
   * scheduled; scheduled sends are picked up by /api/dispatch on a cron, and a
   * send that does not finish inside one function call simply continues on the
   * next tick, so nothing here has to wait for a whole list to go out. */
  let broadcastDraftId = '';

  /* A send request only delivers as many people as fit in the function's time
   * budget. This keeps asking until the server reports nothing left, so a list
   * of any size finishes while the officer watches. Each call is safe to repeat
   * because the server skips anyone who already has a delivery record. */
  async function driveSend(id, say) {
    let total = 0;
    for (let pass = 0; pass < 60; pass += 1) {
      const result = await apiCall(`/api/broadcasts?id=${encodeURIComponent(id)}&action=send`, { method: 'POST' });
      total += result.sent || 0;
      if (!result.remaining) {
        toast(result.message);
        return result;
      }
      say(`Sent ${total} so far…`);
    }
    // Sixty passes is far past any realistic society mailing list; stopping
    // here means something is wrong rather than slow.
    toast('Still sending. It will continue in the background.', 'error');
    return null;
  }

  function broadcastStatusLabel(broadcast) {
    if (broadcast.status === 'scheduled' && broadcast.scheduled_for) {
      return `Scheduled for ${formatDate(broadcast.scheduled_for, true)}`;
    }
    if (broadcast.status === 'sent') {
      return `Sent to ${broadcast.recipient_count} ${broadcast.recipient_count === 1 ? 'person' : 'people'}`;
    }
    if (broadcast.status === 'sending') return `Sending, ${broadcast.recipient_count} done so far`;
    if (broadcast.status === 'failed') return `Failed: ${broadcast.last_error || 'unknown error'}`;
    return 'Draft';
  }

  async function renderBroadcasts() {
    const data = await apiCall('/api/broadcasts');
    const broadcasts = data.broadcasts || [];
    const audienceSize = data.audienceSize || 0;
    const editing = broadcasts.find((item) => item.id === broadcastDraftId) || null;
    const locked = editing && (editing.status === 'sent' || editing.status === 'sending');

    content.innerHTML = `<div class="view-head"><div><p class="eyebrow">Outreach</p><h2>Newsletters</h2><p>${audienceSize} ${audienceSize === 1 ? 'person is' : 'people are'} on the list. Everyone who joins through the membership form is added, and every message carries an unsubscribe link.</p></div></div>
      <section class="panel"><header class="panel__head"><div><h3>${editing ? 'Edit message' : 'Write a message'}</h3><p>Blank lines start a new paragraph. Use <code>**bold**</code>, <code>[text](https://link)</code>, and <code>{{name}}</code> for the recipient's first name.</p></div>${editing ? '<button class="button secondary" type="button" data-new-broadcast>Start a new one</button>' : ''}</header>
        <form style="display:grid;gap:.8rem;padding:1rem" data-broadcast-form>
          <label>Subject<input type="text" name="subject" maxlength="180" required value="${escapeHTML(editing?.subject || '')}"${locked ? ' disabled' : ''}></label>
          <label>Preview line<input type="text" name="preheader" maxlength="240" value="${escapeHTML(editing?.preheader || '')}"${locked ? ' disabled' : ''}></label>
          <label>Message<textarea name="body_markdown" rows="10" required${locked ? ' disabled' : ''}>${escapeHTML(editing?.body_markdown || '')}</textarea></label>
          <label>Send to<select name="audience"${locked ? ' disabled' : ''}><option value="subscribers"${editing?.audience === 'subscribers' ? ' selected' : ''}>Everyone on the list</option><option value="members"${editing?.audience === 'members' ? ' selected' : ''}>Confirmed members only</option></select></label>
          ${locked ? '<p class="form-message">This message has already started sending and can no longer be edited.</p>' : '<button class="button primary" type="submit">Save draft</button>'}
          <p class="form-message" data-broadcast-message aria-live="polite"></p>
        </form>
        ${editing && !locked ? `<div style="display:flex;flex-wrap:wrap;gap:.6rem;padding:0 1rem 1rem">
          <button class="button secondary" type="button" data-broadcast-test>Send a test to me</button>
          <label style="display:flex;align-items:center;gap:.5rem;margin:0"><span>Schedule</span><input type="datetime-local" data-broadcast-when value="${editing.scheduled_for ? escapeHTML(localInputValue(editing.scheduled_for)) : ''}"></label>
          <button class="button secondary" type="button" data-broadcast-schedule>Set schedule</button>
          <button class="button primary" type="button" data-broadcast-send>Send now</button>
        </div>
        <p class="form-message" style="padding:0 1rem 1rem">Scheduled messages go out on the daily 9:00am sweep at or after the time you pick. For an exact time, use Send now.</p>` : ''}
      </section>
      <section class="panel" style="margin-top:1rem"><header class="panel__head"><div><h3>All messages</h3><p>${broadcasts.length} total</p></div></header>
        <div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Subject</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>${broadcasts.map((item) => `<tr><td><strong>${escapeHTML(item.subject)}</strong>${item.preheader ? `<br><small>${escapeHTML(item.preheader)}</small>` : ''}</td><td>${escapeHTML(broadcastStatusLabel(item))}</td><td>${escapeHTML(formatDate(item.created_at, true))}</td><td><button class="link-button" type="button" data-open-broadcast="${escapeHTML(item.id)}">Open</button>${item.status === 'draft' || item.status === 'scheduled' ? ` <button class="link-button" type="button" data-delete-broadcast="${escapeHTML(item.id)}">Delete</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="4">No messages yet.</td></tr>'}</tbody></table></div>
      </section>`;

    const form = $('[data-broadcast-form]');
    const message = $('[data-broadcast-message]');
    const say = (text, ok) => { message.textContent = text; message.classList.toggle('success', !!ok); };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.currentTarget));
      say('Saving…');
      try {
        const path = editing ? `/api/broadcasts?id=${encodeURIComponent(editing.id)}` : '/api/broadcasts';
        const result = await apiCall(path, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
        broadcastDraftId = result.broadcast?.id || broadcastDraftId;
        toast('Draft saved.');
        await renderBroadcasts();
      } catch (error) { say(error.message); }
    });

    $('[data-new-broadcast]')?.addEventListener('click', async () => { broadcastDraftId = ''; await renderBroadcasts(); });

    $('[data-broadcast-test]')?.addEventListener('click', async () => {
      say('Sending a test…');
      try {
        const result = await apiCall(`/api/broadcasts?id=${encodeURIComponent(editing.id)}&action=test`, { method: 'POST' });
        say(result.message, true);
      } catch (error) { say(error.message); }
    });

    $('[data-broadcast-schedule]')?.addEventListener('click', async () => {
      const value = $('[data-broadcast-when]').value;
      say(value ? 'Scheduling…' : 'Clearing the schedule…');
      try {
        // The input gives local wall-clock time; send an absolute instant.
        const when = value ? new Date(value).toISOString() : null;
        await apiCall(`/api/broadcasts?id=${encodeURIComponent(editing.id)}&action=schedule`, { method: 'POST', body: JSON.stringify({ scheduled_for: when }) });
        toast(when ? 'Scheduled.' : 'Back to draft.');
        await renderBroadcasts();
      } catch (error) { say(error.message); }
    });

    $('[data-broadcast-send]')?.addEventListener('click', () => confirmAction(
      `Send "${editing.subject}" now?`,
      `This goes to ${audienceSize} ${audienceSize === 1 ? 'person' : 'people'} and cannot be recalled.`,
      async () => { await driveSend(editing.id, say); await renderBroadcasts(); },
      'Send now'
    ));

    $$('[data-open-broadcast]', content).forEach((button) => button.addEventListener('click', async () => {
      broadcastDraftId = button.dataset.openBroadcast;
      await renderBroadcasts();
      content.scrollIntoView({ block: 'start' });
    }));

    $$('[data-delete-broadcast]', content).forEach((button) => button.addEventListener('click', () => confirmAction(
      'Delete this message?', 'The draft and its schedule are removed.',
      async () => {
        await apiCall(`/api/broadcasts?id=${encodeURIComponent(button.dataset.deleteBroadcast)}`, { method: 'DELETE' });
        if (broadcastDraftId === button.dataset.deleteBroadcast) broadcastDraftId = '';
        toast('Message deleted.');
        await renderBroadcasts();
      }
    )));
  }

  async function switchView(view) {
    activeView=view; $$('[data-view]').forEach((button)=>button.classList.toggle('active',button.dataset.view===view)); document.body.classList.remove('sidebar-open');
    const labels={dashboard:'Officer overview',submissions:'Public submissions',site_settings:'Site settings',members:'Officers and roles',broadcasts:'Newsletters',media:'Media library',content_audit:'Change history'};
    const title=labels[view]||collections[view]?.label||pretty(view); viewTitle.textContent=title; breadcrumb.textContent=view==='dashboard'?'Overview':title;
    primaryAction.hidden=!collections[view]; primaryAction.textContent=collections[view]?`Create ${collections[view].singular}`:'Create';
    content.innerHTML='<div class="loading"><span></span><p>Loading…</p></div>';
    try {
      if(view==='dashboard') await renderDashboard(); else if(view==='submissions') await renderSubmissions(); else if(view==='site_settings') await renderSiteSettings(); else if(view==='members') await renderMembers(); else if(view==='broadcasts') await renderBroadcasts(); else if(view==='media') await renderMedia(); else if(view==='content_audit') await renderAudit(); else if(collections[view]) await renderCollection(view); else throw new Error('Unknown portal view.');
    } catch(error){content.innerHTML=`<div class="empty"><div><h3>This section could not load</h3><p>${escapeHTML(error.message)}</p><button class="button secondary" type="button" data-retry>Try again</button></div></div>`;$('[data-retry]')?.addEventListener('click',()=>switchView(view));}
  }

  /* The accept button used to read "Confirm" for everything, so the dialog for
   * deleting a record looked identical to the one for archiving a submission.
   * Naming the action is the last chance to notice you are on the wrong one. */
  function confirmAction(title, copy, action, acceptLabel = 'Delete') {
    pendingConfirm = action;
    $('[data-confirm-title]').textContent = title;
    $('[data-confirm-copy]').textContent = copy;
    $('[data-confirm-accept]').textContent = acceptLabel;
    confirmDialog.showModal();
  }

  function bindShell() {
    // Icons live in JS beside the collection definitions rather than being
    // duplicated into the static markup, so a new collection gets its sidebar
    // icon by existing.
    $$('[data-view]').forEach((button) => {
      const view = button.dataset.view;
      if (!ICONS[view]) return;
      button.insertAdjacentHTML('afterbegin', iconMarkup(view));
      if (ACCENTS[view] !== undefined) button.style.setProperty('--accent-h', ACCENTS[view]);
    });
    $$('[data-view]').forEach((button)=>button.addEventListener('click',()=>switchView(button.dataset.view)));
    $('[data-open-sidebar]')?.addEventListener('click',()=>document.body.classList.add('sidebar-open'));
    $('[data-close-sidebar]')?.addEventListener('click',()=>document.body.classList.remove('sidebar-open'));
    $('[data-logout]')?.addEventListener('click',signOut);
    primaryAction?.addEventListener('click',()=>{if(collections[activeView])openEditor(activeView);});
    $('[data-editor-close]')?.addEventListener('click',()=>editorDialog.close()); $('[data-editor-cancel]')?.addEventListener('click',()=>editorDialog.close());
    $('[data-confirm-cancel]')?.addEventListener('click',()=>{pendingConfirm=null;confirmDialog.close();});
    $('[data-confirm-accept]')?.addEventListener('click',async()=>{const action=pendingConfirm;pendingConfirm=null;confirmDialog.close();if(!action)return;try{await action();}catch(error){toast(error.message,'error');}});
    editorForm?.addEventListener('submit',async(event)=>{event.preventDefault();if(!editorContext)return;const definition=collections[editorContext.view];try{const record=applyGeneratedKeys(definition,collectRecord(definition),editorContext.record,!editorContext.originalId);await saveRecord(editorContext.view,record,editorContext.originalId);editorDialog.close();toast('Record saved.');await renderCollection(editorContext.view);}catch(error){toast(error.message,'error');}});
  }

  async function enterPortal() {
    try { await apiCall('/api/members', { method: 'POST', body: JSON.stringify({ action: 'accept_self' }) }); } catch (_) { /* existing officers can still continue */ }
    await loadProfile();
    authScreen.hidden=true; portal.hidden=false; $('[data-user-name]').textContent=profile.full_name||profile.email; $('[data-user-role]').textContent=profile.role; $('[data-user-initials]').textContent=initials(profile.full_name||profile.email); await switchView('dashboard');
    resumeStalledBroadcasts();
  }

  /* The daily cron is the only scheduled trigger this plan allows, so a
   * broadcast left part-sent would otherwise wait until tomorrow. Signing in
   * nudges it along. Failures here are not the officer's problem. */
  function resumeStalledBroadcasts() {
    if (profile?.role !== 'admin') return;
    apiCall('/api/broadcasts').then(async (data) => {
      const stalled = (data.broadcasts || []).find((item) => item.status === 'sending');
      if (!stalled) return;
      await driveSend(stalled.id, () => {});
    }).catch(() => {});
  }

  function showAuth(view) { loginView.hidden=view!=='login'; codeView.hidden=view!=='code'; passwordView.hidden=view!=='password'; configView.hidden=view!=='config'; }

  async function initialize() {
    bindShell(); if(!configured){showAuth('config');return;} showAuth('login');
    loginForm.addEventListener('submit',async(event)=>{event.preventDefault();const data=new FormData(loginForm);const message=$('[data-login-message]');message.textContent='';const button=$('button[type="submit"]',loginForm);button.disabled=true;try{await signIn(String(data.get('email')||'').trim(),String(data.get('password')||''));await enterPortal();}catch(error){saveSession(null);message.textContent=error.message;}finally{button.disabled=false;}});
    $('[data-request-code]').addEventListener('click',()=>{const email=$('input[name="email"]',loginForm).value;$('input[name="email"]',codeForm).value=email;showAuth('code');});
    $('[data-back-login]').addEventListener('click',()=>showAuth('login'));
    $('[data-send-reset]').addEventListener('click',async()=>{const email=String($('input[name="email"]',codeForm).value||'').trim();const message=$('[data-code-message]');if(!email){message.textContent='Enter your email address first.';return;}message.textContent='Sending…';try{const response=await fetch('/api/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reset',email})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Could not request a code.');message.textContent='If that address has an officer account, a code has been sent.';message.classList.add('success');}catch(error){message.textContent=error.message;}});
    codeForm.addEventListener('submit',async(event)=>{event.preventDefault();const data=new FormData(codeForm);const email=String(data.get('email')||'').trim();const token=String(data.get('code')||'').replace(/\s/g,'');const message=$('[data-code-message]');message.textContent='Checking…';try{await verifyCode(email,token);showAuth('password');}catch(error){message.textContent='That code was not accepted. Request a new code and try again.';}});
    passwordForm.addEventListener('submit',async(event)=>{event.preventDefault();const data=new FormData(passwordForm);const password=String(data.get('password')||'');const confirm=String(data.get('confirm')||'');const message=$('[data-password-message]');if(password.length<10){message.textContent='Use at least 10 characters.';return;}if(password!==confirm){message.textContent='The two passwords do not match.';return;}message.textContent='Saving…';try{await request('/auth/v1/user',{method:'PUT',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({password})});await enterPortal();}catch(error){message.textContent=error.message;}});
    session=loadSession(); if(session){try{await ensureSession();await enterPortal();}catch(error){saveSession(null);$('[data-login-message]').textContent=error.message;}}
  }

  document.addEventListener('DOMContentLoaded',initialize);
})();
