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
  const safeId = (value = '') => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
  const initials = (value = '') => String(value).split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'O32';
  const formatDate = (value) => {
    if (!value) return 'Not recorded';
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  const authScreen = $('[data-auth-screen]');
  const adminApp = $('[data-admin-app]');
  const configuredLogin = $('[data-configured-login]');
  const setupState = $('[data-setup-state]');
  const loginForm = $('[data-login-form]');
  const authMessage = $('[data-auth-message]');
  const contentRoot = $('[data-admin-content]');
  const viewTitle = $('[data-view-title]');
  const breadcrumb = $('[data-breadcrumb]');
  const primaryAction = $('[data-primary-action]');
  const editorDialog = $('[data-editor-dialog]');
  const editorForm = $('[data-editor-form]');
  const editorFields = $('[data-editor-fields]');
  const editorTitle = $('[data-editor-title]');
  const editorKicker = $('[data-editor-kicker]');
  const deleteButton = $('[data-delete-record]');
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
  const image = (name, label, options = {}) => ({ name, label, type: 'image', full: true, ...options });
  const array = (name, label, options = {}) => ({ name, label, type: 'array', full: true, ...options });
  const json = (name, label, options = {}) => ({ name, label, type: 'json', full: true, ...options });

  const collections = {
    projects: {
      label: 'Projects', singular: 'project', description: 'Publish project briefs, featured builds, team openings, progress, links, and project imagery.',
      titleField: 'title', subtitleField: 'status', imageField: 'cover_url', order: 'sort_order.asc,title.asc',
      fields: [
        text('id', 'Record ID', { required: true, help: 'Stable machine ID. Use lowercase words separated by hyphens.' }),
        text('slug', 'URL slug', { required: true }), text('title', 'Project title', { required: true }), text('kicker', 'Short label'),
        area('summary', 'Card summary', { required: true, rows: 3 }), area('description', 'Full project brief', { required: true, rows: 7 }),
        text('category', 'Category', { required: true }), text('status', 'Status', { required: true }), text('year', 'Project year or term'),
        number('progress', 'Progress percentage', { min: 0, max: 100 }), check('featured', 'Feature this project'), check('published', 'Published'),
        array('skills', 'Useful skills', { help: 'Comma-separated. Example: ESP32, CAD, Python' }),
        array('open_roles', 'Open roles', { help: 'Comma-separated roles available on the team.' }), array('team_names', 'Team members'),
        text('accent', 'Visual accent', { type: 'select', options: ['gold', 'maroon', 'ivory'] }),
        image('cover_url', 'Project cover image'), area('impact', 'Intended impact', { rows: 3 }),
        text('project_url', 'Project website URL'), text('github_url', 'Project repository URL'), number('sort_order', 'Sort order', { min: 0 })
      ]
    },
    project_updates: {
      label: 'Project updates', singular: 'project update', description: 'Publish dated notes that show how project concepts, teams, tests, and decisions are changing.',
      titleField: 'title', subtitleField: 'milestone', imageField: 'image_url', order: 'published_at.desc,title.asc',
      fields: [
        text('id', 'Record ID', { required: true }), text('project_id', 'Project ID', { required: true, help: 'Must match an existing project record ID.' }),
        text('title', 'Update title', { required: true }), area('summary', 'Short summary', { rows: 3, required: true }),
        area('body', 'Full update', { rows: 8, required: true }), text('milestone', 'Milestone label'),
        text('published_at', 'Publication date', { type: 'date' }), image('image_url', 'Update image'), check('published', 'Published')
      ]
    },
    leaders: {
      label: 'Leadership', singular: 'leader', description: 'Manage the organizing team, advisor, open positions, and the permanent leadership archive.',
      titleField: 'name', subtitleField: 'role', imageField: 'photo_url', order: 'sort_order.asc,name.asc',
      fields: [
        text('id', 'Record ID', { required: true }), text('name', 'Name', { required: true }), text('role', 'Role', { required: true }),
        text('term', 'Term', { required: true, placeholder: '2026–27' }), text('class_year', 'Class year'), text('major', 'Major or pathway'),
        area('bio', 'Biography', { rows: 5 }), image('photo_url', 'Portrait'), text('linkedin_url', 'LinkedIn URL'), text('email', 'Email address'),
        check('current', 'Current leadership'), check('advisor', 'Advisor'), check('open_seat', 'Open position'), check('published', 'Published'),
        number('sort_order', 'Sort order', { min: 0 })
      ]
    },
    events: {
      label: 'Events', singular: 'event', description: 'Manage the calendar, featured event, registration links, dates, locations, and event artwork.',
      titleField: 'title', subtitleField: 'date_label', imageField: 'cover_url', order: 'start_at.asc,title.asc',
      fields: [
        text('id', 'Record ID', { required: true }), text('slug', 'URL slug', { required: true }), text('title', 'Event title', { required: true }),
        area('summary', 'Event summary', { rows: 3, required: true }), area('description', 'Full description', { rows: 6 }),
        text('event_type', 'Event type', { required: true }), text('date_label', 'Public date label', { required: true }),
        text('start_at', 'Start time', { type: 'datetime-local' }), text('end_at', 'End time', { type: 'datetime-local' }),
        text('location', 'Location'), text('registration_url', 'Registration or detail URL'), image('cover_url', 'Event image'),
        check('featured', 'Feature this event'), check('published', 'Published')
      ]
    },
    news_posts: {
      label: 'News', singular: 'field note', description: 'Publish announcements, program news, and a permanent record of society decisions.',
      titleField: 'title', subtitleField: 'published_at', imageField: 'cover_url', order: 'published_at.desc,title.asc',
      fields: [
        text('id', 'Record ID', { required: true }), text('slug', 'URL slug', { required: true }), text('title', 'Headline', { required: true }),
        area('excerpt', 'Short excerpt', { rows: 3, required: true }), area('body', 'Full article', { rows: 10, required: true }),
        text('author', 'Author'), text('published_at', 'Publication date', { type: 'date' }), image('cover_url', 'Cover image'),
        check('featured', 'Feature this update'), check('published', 'Published')
      ]
    },
    resources: {
      label: 'Resources', singular: 'resource', description: 'Maintain official planning links, partner-school information, career tools, and society-created guides.',
      titleField: 'title', subtitleField: 'category', order: 'sort_order.asc,title.asc',
      fields: [
        text('id', 'Record ID', { required: true }), text('title', 'Resource title', { required: true }), area('description', 'Description', { rows: 4 }),
        text('category', 'Category', { required: true }), text('source', 'Source'), text('url', 'Resource URL', { required: true }),
        check('pinned', 'Pin this resource'), check('published', 'Published'), number('sort_order', 'Sort order', { min: 0 })
      ]
    },
    opportunities: {
      label: 'Opportunities', singular: 'opportunity', description: 'Publish leadership roles, project openings, competitions, internships, research, and partner opportunities.',
      titleField: 'title', subtitleField: 'type', order: 'featured.desc,deadline.asc,title.asc',
      fields: [
        text('id', 'Record ID', { required: true }), text('title', 'Opportunity title', { required: true }), text('organization', 'Organization'),
        text('type', 'Type', { required: true }), area('description', 'Description', { rows: 5, required: true }),
        text('deadline_label', 'Deadline label'), text('deadline', 'Deadline', { type: 'date' }), text('location', 'Location'),
        text('url', 'Application or detail URL'), check('featured', 'Feature this opportunity'), check('published', 'Published')
      ]
    },
    competition_editions: {
      label: 'Engineering Challenge', singular: 'challenge edition', description: 'Develop and, only after approval, administer a future flagship challenge: publish confirmed editions, shape tracks and judging criteria, open registration, and preserve results.',
      titleField: 'title', subtitleField: 'season', imageField: 'hero_url', order: 'year.desc',
      fields: [
        text('id', 'Edition ID', { required: true }), text('year', 'Year', { required: true }), text('title', 'Competition name', { required: true }),
        text('eyebrow', 'Eyebrow'), text('theme', 'Theme', { required: true }), text('tagline', 'Tagline'),
        area('description', 'Competition description', { rows: 7, required: true }), text('status', 'Status'), text('season', 'Season'),
        check('registration_open', 'Registration open'), text('registration_deadline', 'Registration deadline', { type: 'date' }),
        text('event_date', 'Event date', { type: 'date' }), text('venue', 'Venue'), image('hero_url', 'Hero image'),
        text('prize_pool', 'Awards or prize statement'), text('rules_url', 'Official rules URL'), check('results_published', 'Results published'), check('published', 'Published'),
        json('tracks', 'Competition tracks', { help: 'JSON array with number, title, and description.' }),
        json('stages', 'Competition stages', { help: 'JSON array with number, title, and description.' }),
        json('criteria', 'Judging criteria', { help: 'JSON array with title, weight, and description.' })
      ]
    },
    sponsors: {
      label: 'Partners + sponsors', singular: 'partner or sponsor', description: 'Manage only formally confirmed supporters, project contributors, co-sponsors, and community relationships.',
      titleField: 'name', subtitleField: 'tier', imageField: 'logo_url', order: 'sort_order.asc,name.asc',
      fields: [
        text('id', 'Record ID', { required: true }), text('name', 'Partner name', { required: true }), text('tier', 'Partnership tier'),
        image('logo_url', 'Logo'), text('url', 'Partner URL'), area('description', 'Partnership description', { rows: 4 }),
        check('active', 'Active partner'), check('published', 'Published'), number('sort_order', 'Sort order', { min: 0 })
      ]
    },
    partner_schools: {
      label: '3-2 partner schools', singular: 'partner-school card', description: 'Maintain the official partner-school reference cards shown in the pathway experience. These records are informational and separate from society sponsorships.',
      titleField: 'name', subtitleField: 'location', order: 'sort_order.asc,name.asc',
      fields: [
        text('id', 'Record ID', { required: true }), text('name', 'Institution name', { required: true }), text('short_name', 'Short name', { required: true }),
        text('location', 'Location'), text('region_code', 'Region code'), text('url', 'Official institution URL', { required: true }),
        json('questions', 'Questions students should ask', { help: 'JSON array of question strings.' }), check('published', 'Published'),
        number('sort_order', 'Sort order', { min: 0 })
      ]
    },
    impact: {
      label: 'Impact + reports', singular: 'impact record', description: 'Manage the public record of the society’s growth, milestones, annual reports, and evidence of work completed.',
      titleField: 'current_term', subtitleField: 'operating_stage', order: 'updated_at.desc',
      fields: [
        text('id', 'Record ID', { required: true, help: 'Use main for the primary public impact record.' }), text('founded', 'Founded year'),
        text('current_term', 'Current term', { required: true }), text('operating_stage', 'Operating stage'),
        json('public_metrics', 'Public metrics', { help: 'JSON array with value, label, and note.' }),
        json('milestones', 'Milestones', { help: 'JSON array with period, title, description, and status.' }),
        json('reports', 'Annual reports', { help: 'JSON array with year, title, status, URL, and published.' }), check('published', 'Published')
      ]
    },
    documents: {
      label: 'Documents', singular: 'document', description: 'Publish governance files, project templates, advising question sheets, annual reports, and other permanent society documents.',
      titleField: 'title', subtitleField: 'category', order: 'sort_order.asc,title.asc',
      fields: [
        text('id', 'Record ID', { required: true }), text('title', 'Document title', { required: true }), text('category', 'Category'),
        area('description', 'Description', { rows: 4 }), text('url', 'Document URL', { required: true }), text('format', 'Format'),
        check('published', 'Published'), number('sort_order', 'Sort order', { min: 0 })
      ]
    }
  };

  const siteFields = [
    text('name', 'Organization name', { required: true }), text('short_name', 'Short name'), text('domain', 'Website domain'),
    text('founded', 'Founded year'), text('tagline', 'Tagline'), text('hero_title', 'Hero title'), area('hero_description', 'Hero description', { rows: 4 }),
    text('join_url', 'Membership form URL'), text('instagram_url', 'Instagram URL'), text('instagram_handle', 'Instagram handle'),
    text('contact_email', 'Contact email'), text('founder', 'Founder'), text('advisor', 'Advisor'),
    text('competition_name', 'Competition name'), text('competition_season', 'Competition season'),
    area('announcement', 'Announcement bar message', { rows: 2 }), text('announcement_link', 'Announcement link'),
    text('status', 'Organization status'), text('launch_term', 'Current term')
  ];

  function toast(message, type = 'success') {
    const region = $('[data-admin-toasts]');
    if (!region) return;
    const node = document.createElement('div');
    node.className = `admin-toast ${type}`;
    node.textContent = message;
    region.append(node);
    window.setTimeout(() => node.remove(), 4800);
  }

  function authHeaders(token = session?.access_token) {
    return {
      apikey: ANON,
      Authorization: `Bearer ${token || ANON}`,
      Accept: 'application/json'
    };
  }

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, options);
    if (!response.ok) {
      const raw = await response.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed.message || parsed.error_description || parsed.error || parsed.hint || raw;
      } catch (_) { /* keep raw response */ }
      throw new Error(message || `Request failed (${response.status})`);
    }
    if (response.status === 204 || options.method === 'DELETE') return null;
    const type = response.headers.get('content-type') || '';
    return type.includes('application/json') ? response.json() : response.text();
  }

  function saveSession(value) {
    session = value;
    if (session) sessionStorage.setItem('o32-admin-session', JSON.stringify(session));
    else sessionStorage.removeItem('o32-admin-session');
  }

  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem('o32-admin-session') || 'null'); }
    catch (_) { return null; }
  }

  async function refreshSession() {
    if (!session?.refresh_token) return false;
    const next = await request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    next.expires_at = Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600);
    saveSession(next);
    return true;
  }

  async function ensureSession() {
    if (!session) return false;
    if (Number(session.expires_at || 0) < Math.floor(Date.now() / 1000) + 60) {
      try { await refreshSession(); }
      catch (_) { saveSession(null); return false; }
    }
    return true;
  }

  async function signIn(email, password) {
    const next = await request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    next.expires_at = Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600);
    saveSession(next);
    return next;
  }

  async function loadProfile() {
    if (!session?.user?.id) throw new Error('No authenticated user was returned.');
    const rows = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,email,full_name,role`, {
      headers: authHeaders()
    });
    const record = Array.isArray(rows) ? rows[0] : null;
    if (!record || !['admin', 'editor'].includes(record.role)) throw new Error('This account is not listed as a society administrator or editor.');
    profile = record;
    return record;
  }

  async function signOut() {
    try {
      if (session?.access_token) await request('/auth/v1/logout', { method: 'POST', headers: authHeaders() });
    } catch (_) { /* local logout still proceeds */ }
    saveSession(null);
    profile = null;
    adminApp.hidden = true;
    authScreen.hidden = false;
    if (loginForm) loginForm.reset();
  }

  async function tableRows(table, order = '') {
    await ensureSession();
    const query = new URLSearchParams({ select: '*' });
    if (order) query.set('order', order);
    return request(`/rest/v1/${table}?${query}`, { headers: authHeaders() });
  }

  async function saveTableRecord(table, record, existingId = '') {
    await ensureSession();
    if (existingId) {
      const rows = await request(`/rest/v1/${table}?id=eq.${encodeURIComponent(existingId)}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(record)
      });
      return Array.isArray(rows) ? rows[0] : rows;
    }
    const rows = await request(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(record)
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function deleteTableRecord(table, id) {
    await ensureSession();
    return request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() });
  }

  async function saveSiteSettings(settings) {
    await ensureSession();
    const rows = await request('/rest/v1/site_settings?on_conflict=id', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ id: 'main', settings, published: true })
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function loadSiteSettings() {
    const rows = await tableRows('site_settings', 'updated_at.desc');
    return (rows?.[0]?.settings) || {};
  }

  async function uploadFile(file, collection = 'general') {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
    const maxBytes = 15 * 1024 * 1024;
    if (!allowedTypes.has(file.type)) throw new Error('Use a JPG, PNG, WebP, GIF, or PDF file.');
    if (file.size > maxBytes) throw new Error('Files must be 15 MB or smaller.');
    await ensureSession();
    const extension = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = safeId(file.name.replace(/\.[^.]+$/, '')) || 'upload';
    const date = new Date();
    const folder = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const path = `${collection}/${folder}/${Date.now()}-${base}.${extension}`;
    await request(`/storage/v1/object/${encodeURIComponent(BUCKET)}/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
      body: file
    });
    const publicUrl = `${API}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${path.split('/').map(encodeURIComponent).join('/')}`;
    try {
      await saveTableRecord('media', {
        id: crypto.randomUUID(), file_name: file.name, storage_path: path, public_url: publicUrl,
        mime_type: file.type || '', size_bytes: file.size, uploaded_by: session.user.id
      });
    } catch (error) {
      console.warn('Media record could not be created:', error.message);
    }
    return publicUrl;
  }

  function recordTitle(definition, record) {
    return record?.[definition.titleField] || record?.id || 'Untitled';
  }

  function recordSubtitle(definition, record) {
    return record?.[definition.subtitleField] || record?.category || record?.type || '';
  }

  function statusMarkup(record) {
    const published = record.published !== false;
    const featured = Boolean(record.featured);
    return `<span class="status-pill ${published ? 'live' : 'draft'}"><i></i>${published ? 'Published' : 'Draft'}</span>${featured ? ' <span class="status-pill featured">Featured</span>' : ''}`;
  }

  function viewHeader(definition) {
    return `<div class="table-view-head"><div><span class="admin-kicker">CONTENT SYSTEM</span><h2>${escapeHTML(definition.label)}</h2><p>${escapeHTML(definition.description)}</p></div><button class="admin-button primary" type="button" data-create-record><span>Create ${escapeHTML(definition.singular)}</span><b>＋</b></button></div>`;
  }

  function renderTable(definition, records) {
    if (!records.length) return `<div class="empty-state"><span>◇</span><h3>No ${escapeHTML(definition.label.toLowerCase())} yet</h3><p>Create the first record. Drafts remain hidden from the public website until published.</p><button class="admin-button primary" type="button" data-create-record><span>Create ${escapeHTML(definition.singular)}</span><b>＋</b></button></div>`;
    return `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>RECORD</th><th>STATUS</th><th>UPDATED</th><th></th></tr></thead><tbody>${records.map((record) => {
      const title = recordTitle(definition, record);
      const subtitle = recordSubtitle(definition, record);
      const imageUrl = definition.imageField ? record[definition.imageField] : '';
      const thumb = imageUrl ? `<img class="record-thumb" src="${escapeHTML(imageUrl)}" alt="">` : `<span class="record-thumb">${escapeHTML(initials(title))}</span>`;
      return `<tr><td><div class="record-title">${thumb}<div><strong>${escapeHTML(title)}</strong><small>${escapeHTML(subtitle)}</small></div></div></td><td>${statusMarkup(record)}</td><td>${escapeHTML(formatDate(record.updated_at || record.created_at))}</td><td><div class="row-actions"><button type="button" data-edit-record="${escapeHTML(record.id)}" aria-label="Edit ${escapeHTML(title)}">✎</button><button type="button" data-duplicate-record="${escapeHTML(record.id)}" aria-label="Duplicate ${escapeHTML(title)}">⧉</button><button type="button" data-remove-record="${escapeHTML(record.id)}" aria-label="Delete ${escapeHTML(title)}">×</button></div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  async function renderCollection(view) {
    const definition = collections[view];
    activeRecords = await tableRows(view, definition.order || 'updated_at.desc');
    contentRoot.innerHTML = `${viewHeader(definition)}<div class="toolbar"><label class="search-control"><span>⌕</span><input type="search" data-table-search placeholder="Search ${escapeHTML(definition.label.toLowerCase())}"></label><select data-table-filter><option value="all">All records</option><option value="published">Published</option><option value="draft">Drafts</option><option value="featured">Featured</option></select></div><div data-table-results>${renderTable(definition, activeRecords)}</div>`;

    const rerender = () => {
      const query = String($('[data-table-search]')?.value || '').toLowerCase().trim();
      const filter = $('[data-table-filter]')?.value || 'all';
      const rows = activeRecords.filter((record) => {
        const haystack = JSON.stringify(record).toLowerCase();
        const statusMatch = filter === 'all' || (filter === 'published' && record.published !== false) || (filter === 'draft' && record.published === false) || (filter === 'featured' && record.featured);
        return statusMatch && (!query || haystack.includes(query));
      });
      $('[data-table-results]').innerHTML = renderTable(definition, rows);
      bindCollectionActions(view);
    };
    $('[data-table-search]')?.addEventListener('input', rerender);
    $('[data-table-filter]')?.addEventListener('change', rerender);
    bindCollectionActions(view);
  }

  function bindCollectionActions(view) {
    $$('[data-create-record]').forEach((button) => button.addEventListener('click', () => openEditor(view)));
    $$('[data-edit-record]').forEach((button) => button.addEventListener('click', () => {
      const record = activeRecords.find((item) => String(item.id) === button.dataset.editRecord);
      if (record) openEditor(view, record);
    }));
    $$('[data-duplicate-record]').forEach((button) => button.addEventListener('click', () => {
      const original = activeRecords.find((item) => String(item.id) === button.dataset.duplicateRecord);
      if (!original) return;
      const copy = structuredClone(original);
      delete copy.created_at; delete copy.updated_at;
      copy.id = `${safeId(recordTitle(collections[view], original))}-copy-${Date.now().toString().slice(-5)}`;
      if (copy.slug) copy.slug = `${safeId(copy.slug)}-copy`;
      copy.published = false;
      openEditor(view, copy, true);
    }));
    $$('[data-remove-record]').forEach((button) => button.addEventListener('click', () => {
      const record = activeRecords.find((item) => String(item.id) === button.dataset.removeRecord);
      if (record) confirmAction(`Delete ${recordTitle(collections[view], record)}?`, 'This removes the record from the content system and public website. This cannot be undone.', async () => {
        await deleteTableRecord(view, record.id); toast('Record deleted.'); await renderCollection(view);
      });
    }));
  }

  function fieldValue(field, record) {
    const value = record?.[field.name];
    if (field.type === 'json') return value ? JSON.stringify(value, null, 2) : '[]';
    if (field.type === 'array') return Array.isArray(value) ? value.join(', ') : (value || '');
    if (field.type === 'datetime-local' && value) return String(value).slice(0, 16);
    return value ?? '';
  }

  function fieldMarkup(field, record) {
    const value = fieldValue(field, record);
    const classes = `editor-field${field.full ? ' full' : ''}`;
    const required = field.required ? ' required' : '';
    const help = field.help ? `<small>${escapeHTML(field.help)}</small>` : '';
    const minmax = `${field.min !== undefined ? ` min="${field.min}"` : ''}${field.max !== undefined ? ` max="${field.max}"` : ''}`;

    if (field.type === 'checkbox') {
      return `<label class="${classes} checkbox-field"><input type="checkbox" name="${escapeHTML(field.name)}" ${value ? 'checked' : ''}><span>${escapeHTML(field.label)}</span></label>`;
    }
    if (field.type === 'textarea' || field.type === 'json') {
      return `<label class="${classes}"><span>${escapeHTML(field.label)}</span><textarea name="${escapeHTML(field.name)}" rows="${field.rows || 5}" class="${field.type === 'json' ? 'code-field' : ''}"${required}>${escapeHTML(value)}</textarea>${help}</label>`;
    }
    if (field.type === 'select') {
      return `<label class="${classes}"><span>${escapeHTML(field.label)}</span><select name="${escapeHTML(field.name)}"${required}>${(field.options || []).map((option) => `<option value="${escapeHTML(option)}" ${String(value) === option ? 'selected' : ''}>${escapeHTML(option)}</option>`).join('')}</select>${help}</label>`;
    }
    if (field.type === 'image') {
      return `<div class="${classes}" data-image-field="${escapeHTML(field.name)}"><span>${escapeHTML(field.label)}</span><div class="media-upload"><img class="media-preview" src="${escapeHTML(value || '../assets/images/engineering-field.svg')}" alt=""><div><input type="url" name="${escapeHTML(field.name)}" value="${escapeHTML(value)}" placeholder="Image URL"><input type="file" accept="image/*" data-file-upload="${escapeHTML(field.name)}"><small>Upload an image or paste a hosted URL. Uploads publish to the society media bucket.</small><div class="upload-progress"><i></i></div></div></div>${help}</div>`;
    }
    const inputType = field.type === 'array' ? 'text' : (field.type || 'text');
    return `<label class="${classes}"><span>${escapeHTML(field.label)}</span><input type="${escapeHTML(inputType)}" name="${escapeHTML(field.name)}" value="${escapeHTML(value)}" placeholder="${escapeHTML(field.placeholder || '')}"${required}${minmax}>${help}</label>`;
  }

  function openEditor(view, record = {}, forceNew = false) {
    const definition = collections[view];
    if (!definition) return;
    editorContext = { view, originalId: forceNew ? '' : (record.id || ''), record };
    editorTitle.textContent = `${forceNew || !record.id ? 'Create' : 'Edit'} ${definition.singular}`;
    editorKicker.textContent = definition.label.toUpperCase();
    editorFields.innerHTML = definition.fields.map((field) => fieldMarkup(field, record)).join('');
    deleteButton.hidden = forceNew || !record.id;
    deleteButton.onclick = () => confirmAction(`Delete ${recordTitle(definition, record)}?`, 'This cannot be undone.', async () => {
      await deleteTableRecord(view, record.id); editorDialog.close(); toast('Record deleted.'); await renderCollection(view);
    });
    $$('[data-file-upload]', editorFields).forEach((input) => input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fieldName = input.dataset.fileUpload;
      const wrapper = input.closest('[data-image-field]');
      const progress = $('.upload-progress i', wrapper);
      const preview = $('.media-preview', wrapper);
      const urlInput = $(`input[name="${CSS.escape(fieldName)}"]`, wrapper);
      try {
        if (progress) progress.style.width = '35%';
        const url = await uploadFile(file, view);
        if (progress) progress.style.width = '100%';
        if (preview) preview.src = url;
        if (urlInput) urlInput.value = url;
        toast('Image uploaded. Save the record to publish the change.');
      } catch (error) {
        if (progress) progress.style.width = '0';
        toast(`Upload failed: ${error.message}`, 'error');
      }
    }));
    editorDialog.showModal();
  }

  function collectEditorRecord(definition) {
    const formData = new FormData(editorForm);
    const record = {};
    for (const field of definition.fields) {
      if (field.type === 'checkbox') {
        record[field.name] = Boolean($(`[name="${CSS.escape(field.name)}"]`, editorForm)?.checked);
        continue;
      }
      let value = formData.get(field.name);
      if (typeof value === 'string') value = value.trim();
      if (field.type === 'number') record[field.name] = value === '' ? 0 : Number(value);
      else if (field.type === 'array') record[field.name] = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
      else if (field.type === 'json') {
        try { record[field.name] = JSON.parse(String(value || '[]')); }
        catch (_) { throw new Error(`${field.label} must contain valid JSON.`); }
      } else if (field.type === 'datetime-local') record[field.name] = value ? new Date(value).toISOString() : null;
      else record[field.name] = value || '';
    }
    if (!record.id) record.id = `${safeId(record.title || record.name || record.role || definition.singular)}-${Date.now().toString().slice(-5)}`;
    if ('slug' in record && !record.slug) record.slug = safeId(record.title || record.name || record.id);
    return record;
  }

  async function renderDashboard() {
    const tables = ['projects', 'project_updates', 'leaders', 'events', 'opportunities', 'submissions', 'content_audit'];
    const values = await Promise.all(tables.map((table) => tableRows(table, table === 'submissions' || table === 'content_audit' ? 'created_at.desc' : 'updated_at.desc').catch(() => [])));
    const [projects, updates, leaders, events, opportunities, submissions, audit] = values;
    const newSubmissions = submissions.filter((item) => item.status === 'new');
    $('[data-submission-count]') && ($('[data-submission-count]').textContent = String(newSubmissions.length));
    const auditLabel = (item) => item.snapshot?.title || item.snapshot?.name || item.snapshot?.current_term || item.record_id || 'record';
    contentRoot.innerHTML = `
      <section class="dashboard-hero"><div><span class="system-status"><i></i> CONTENT SYSTEM ONLINE</span><h2>Welcome back, ${escapeHTML(profile?.full_name?.split(' ')[0] || 'administrator')}.</h2><p>Publish the society's work, keep leadership and opportunities current, develop the future Engineering Challenge concept responsibly, and preserve the record future boards will inherit.</p></div><div class="dashboard-hero-actions"><button class="admin-button primary" type="button" data-dashboard-create="projects"><span>Create project</span><b>＋</b></button><a class="admin-button ghost" href="../index.html" target="_blank" rel="noopener"><span>Open website</span><b>↗</b></a></div></section>
      <div class="metric-grid"><article class="metric-card"><span>PUBLISHED PROJECTS</span><strong>${projects.filter((item) => item.published !== false).length}</strong><small>${projects.filter((item) => item.featured).length} featured</small></article><article class="metric-card"><span>CURRENT LEADERS</span><strong>${leaders.filter((item) => item.current && !item.open_seat).length}</strong><small>${leaders.filter((item) => item.current && item.open_seat).length} open seats</small></article><article class="metric-card"><span>BUILD-LOG UPDATES</span><strong>${updates.filter((item) => item.published !== false).length}</strong><small>${events.length} events on record</small></article><article class="metric-card"><span>NEW SUBMISSIONS</span><strong>${newSubmissions.length}</strong><small>${opportunities.length} opportunities live</small></article></div>
      <div class="dashboard-grid"><section class="admin-panel"><header class="panel-head"><h3>Recent submissions</h3><span>${submissions.length} TOTAL</span></header><div class="activity-list">${submissions.slice(0, 6).map((item) => `<div class="activity-item"><span class="activity-icon">${escapeHTML(String(item.type || 'S').slice(0, 1).toUpperCase())}</span><div><strong>${escapeHTML(item.full_name || item.email || 'Website visitor')}</strong><p>${escapeHTML(String(item.type || 'submission').replaceAll('_', ' '))}</p></div><time>${escapeHTML(formatDate(item.created_at))}</time></div>`).join('') || '<div class="activity-item"><span class="activity-icon">✓</span><div><strong>No submissions yet</strong><p>New public form entries will appear here.</p></div></div>'}</div></section><section class="admin-panel"><header class="panel-head"><h3>Quick publish</h3><span>CREATE</span></header><div class="quick-list">${[['projects','◇','Project'],['project_updates','↻','Build-log update'],['leaders','◎','Leader'],['events','□','Event'],['news_posts','≋','Field note'],['opportunities','↗','Opportunity'],['competition_editions','✦','Challenge edition']].map(([view, icon, label]) => `<button class="quick-item" type="button" data-dashboard-create="${view}"><span>${icon}</span><strong>${label}</strong><p>Open editor</p></button>`).join('')}</div></section></div>
      <section class="admin-panel audit-preview"><header class="panel-head"><h3>Recent content changes</h3><button class="text-button" type="button" data-open-audit>Open full history</button></header><div class="activity-list">${audit.slice(0, 6).map((item) => `<div class="activity-item"><span class="activity-icon audit-${escapeHTML(String(item.action || '').toLowerCase())}">${escapeHTML(String(item.action || 'U').slice(0, 1))}</span><div><strong>${escapeHTML(auditLabel(item))}</strong><p>${escapeHTML(String(item.action || 'updated').toLowerCase())} in ${escapeHTML(String(item.table_name || 'content').replaceAll('_', ' '))}</p></div><time>${escapeHTML(formatDate(item.created_at))}</time></div>`).join('') || '<div class="activity-item"><span class="activity-icon">≡</span><div><strong>No content changes recorded</strong><p>The audit log begins after the database schema is installed.</p></div></div>'}</div></section>`;
    $$('[data-dashboard-create]').forEach((button) => button.addEventListener('click', () => openEditor(button.dataset.dashboardCreate)));
    $('[data-open-audit]')?.addEventListener('click', () => switchView('content_audit'));
  }

  async function renderSubmissions() {
    const submissions = await tableRows('submissions', 'created_at.desc');
    $('[data-submission-count]') && ($('[data-submission-count]').textContent = String(submissions.filter((item) => item.status === 'new').length));
    contentRoot.innerHTML = `<div class="table-view-head"><div><span class="admin-kicker">INBOX</span><h2>Public submissions</h2><p>Project ideas, leadership interest, competition updates, event suggestions, resource requests, opportunity listings, newsletters, and partnership messages.</p></div></div><div class="admin-panel">${submissions.map((item) => {
      const payload = item.payload || {};
      return `<article class="submission-card"><div><div class="submission-meta"><span>${escapeHTML(String(item.type || '').replaceAll('_', ' ').toUpperCase())}</span><span>${escapeHTML(formatDate(item.created_at))}</span><span>${escapeHTML(item.email || '')}</span><span>${escapeHTML(item.status || 'new')}</span></div><h3>${escapeHTML(item.full_name || item.email || 'Website submission')}</h3><p>${escapeHTML(payload.message || payload.problem || payload.value || payload.motivation || payload.description || '')}</p><div class="submission-data">${Object.entries(payload).map(([key, value]) => `<div><b>${escapeHTML(key.replaceAll('_', ' '))}</b><span>${escapeHTML(Array.isArray(value) ? value.join(', ') : value)}</span></div>`).join('')}</div></div><div class="row-actions"><button type="button" data-submission-status="reviewed" data-submission-id="${escapeHTML(item.id)}" title="Mark reviewed">✓</button><button type="button" data-submission-status="archived" data-submission-id="${escapeHTML(item.id)}" title="Archive">↧</button><button type="button" data-submission-delete="${escapeHTML(item.id)}" title="Delete">×</button></div></article>`;
    }).join('') || '<div class="empty-state"><span>↳</span><h3>No submissions yet</h3><p>Public form entries will appear here after the database is connected.</p></div>'}</div>`;
    $$('[data-submission-status]').forEach((button) => button.addEventListener('click', async () => {
      await saveTableRecord('submissions', { status: button.dataset.submissionStatus }, button.dataset.submissionId); toast('Submission updated.'); await renderSubmissions();
    }));
    $$('[data-submission-delete]').forEach((button) => button.addEventListener('click', () => confirmAction('Delete this submission?', 'This permanently removes the entry.', async () => {
      await deleteTableRecord('submissions', button.dataset.submissionDelete); toast('Submission deleted.'); await renderSubmissions();
    })));
  }

  async function renderMedia() {
    const media = await tableRows('media', 'created_at.desc').catch(() => []);
    contentRoot.innerHTML = `<div class="table-view-head"><div><span class="admin-kicker">ASSET SYSTEM</span><h2>Media library</h2><p>Upload project covers, leadership portraits, event art, partner logos, and competition imagery. Files are published through the society's Supabase Storage bucket.</p></div></div><div class="media-uploader"><label><span>＋</span><strong>Upload media</strong><small>Images, PDFs, and approved public assets</small><input type="file" data-media-upload accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" multiple></label></div><div class="media-grid">${media.map((item) => `<article class="media-card">${String(item.mime_type || '').startsWith('image/') ? `<img src="${escapeHTML(item.public_url)}" alt="">` : '<div class="record-thumb">FILE</div>'}<div><strong>${escapeHTML(item.file_name)}</strong><small>${Math.round(Number(item.size_bytes || 0) / 1024)} KB · ${escapeHTML(formatDate(item.created_at))}</small><button class="text-button" type="button" data-copy-media="${escapeHTML(item.public_url)}">Copy URL</button></div></article>`).join('') || '<div class="empty-state"><span>▧</span><h3>No uploaded media</h3><p>Upload the first image to create the library.</p></div>'}</div>`;
    $('[data-media-upload]')?.addEventListener('change', async (event) => {
      const files = [...(event.target.files || [])];
      for (const file of files) {
        try { await uploadFile(file, 'library'); toast(`${file.name} uploaded.`); }
        catch (error) { toast(`Could not upload ${file.name}: ${error.message}`, 'error'); }
      }
      await renderMedia();
    });
    $$('[data-copy-media]').forEach((button) => button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(button.dataset.copyMedia); toast('Media URL copied.');
    }));
  }

  async function renderSiteSettings() {
    const settings = await loadSiteSettings();
    contentRoot.innerHTML = `<div class="table-view-head"><div><span class="admin-kicker">GLOBAL CONFIGURATION</span><h2>Site settings</h2><p>Update the announcement, contact information, membership link, Instagram, competition label, current term, and global public copy.</p></div></div><form class="admin-panel" data-settings-form><div class="editor-body">${siteFields.map((field) => fieldMarkup(field, settings)).join('')}</div><footer class="editor-actions"><span class="editor-spacer"></span><button class="admin-button primary" type="submit"><span>Publish settings</span><b>✓</b></button></footer></form>`;
    $('[data-settings-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const next = {};
      siteFields.forEach((field) => { next[field.name] = String(data.get(field.name) || '').trim(); });
      await saveSiteSettings(next); toast('Site settings published.');
    });
  }

  function confirmAction(title, copy, action) {
    $('[data-confirm-title]').textContent = title;
    $('[data-confirm-copy]').textContent = copy;
    pendingConfirm = action;
    confirmDialog.showModal();
  }

  async function switchView(view) {
    activeView = view;
    $$('.admin-nav button[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
    const labels = {
      dashboard: 'Command overview', submissions: 'Public submissions', site_settings: 'Site settings', media: 'Media library',
      ...Object.fromEntries(Object.entries(collections).map(([key, value]) => [key, value.label]))
    };
    viewTitle.textContent = labels[view] || 'Content';
    breadcrumb.textContent = String(labels[view] || view).toUpperCase();
    primaryAction.hidden = !collections[view];
    if (collections[view]) primaryAction.innerHTML = `<span>Create ${escapeHTML(collections[view].singular)}</span><b>＋</b>`;
    contentRoot.innerHTML = '<div class="admin-loading"><span></span><p>Loading society systems…</p></div>';
    try {
      if (view === 'dashboard') await renderDashboard();
      else if (view === 'submissions') await renderSubmissions();
      else if (view === 'media') await renderMedia();
      else if (view === 'site_settings') await renderSiteSettings();
      else if (collections[view]) await renderCollection(view);
    } catch (error) {
      console.error(error);
      contentRoot.innerHTML = `<div class="connection-warning">The admin system could not load this view: ${escapeHTML(error.message)}</div>`;
      toast(error.message, 'error');
    }
  }

  async function enterAdmin() {
    await loadProfile();
    authScreen.hidden = true;
    adminApp.hidden = false;
    $('[data-user-name]').textContent = profile.full_name || profile.email;
    $('[data-user-role]').textContent = profile.role;
    $('[data-user-initials]').textContent = initials(profile.full_name || profile.email);
    await switchView('dashboard');
  }

  function bindShell() {
    $$('.admin-nav button[data-view]').forEach((button) => button.addEventListener('click', () => {
      switchView(button.dataset.view);
      $('[data-sidebar]')?.classList.remove('open');
    }));
    primaryAction?.addEventListener('click', () => { if (collections[activeView]) openEditor(activeView); });
    $('[data-logout]')?.addEventListener('click', signOut);
    $('[data-sidebar-open]')?.addEventListener('click', () => $('[data-sidebar]')?.classList.add('open'));
    $('[data-sidebar-close]')?.addEventListener('click', () => $('[data-sidebar]')?.classList.remove('open'));
    $('[data-editor-close]')?.addEventListener('click', () => editorDialog.close());
    $('[data-editor-cancel]')?.addEventListener('click', () => editorDialog.close());
    $('[data-confirm-cancel]')?.addEventListener('click', () => { pendingConfirm = null; confirmDialog.close(); });
    $('[data-confirm-accept]')?.addEventListener('click', async () => {
      const action = pendingConfirm; pendingConfirm = null; confirmDialog.close();
      if (!action) return;
      try { await action(); }
      catch (error) { toast(error.message, 'error'); }
    });
    editorForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!editorContext) return;
      const definition = collections[editorContext.view];
      try {
        const record = collectEditorRecord(definition);
        await saveTableRecord(editorContext.view, record, editorContext.originalId);
        editorDialog.close(); toast(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} saved.`); await renderCollection(editorContext.view);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  async function initialize() {
    configuredLogin.hidden = !configured;
    setupState.hidden = configured;
    bindShell();

    if (!configured) return;

    loginForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      authMessage.textContent = '';
      const button = $('button[type="submit"]', loginForm);
      const original = button.innerHTML;
      button.disabled = true; button.textContent = 'Authenticating…';
      try {
        await signIn(String(formData.get('email') || ''), String(formData.get('password') || ''));
        await enterAdmin();
      } catch (error) {
        saveSession(null);
        authMessage.textContent = error.message;
      } finally {
        button.disabled = false; button.innerHTML = original;
      }
    });

    $('[data-reset-password]')?.addEventListener('click', async () => {
      const email = String($('input[name="email"]', loginForm)?.value || '').trim();
      if (!email) { authMessage.textContent = 'Enter your email address first.'; return; }
      try {
        await request('/auth/v1/recover', {
          method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, redirect_to: `${location.origin}/admin/` })
        });
        authMessage.textContent = 'Password reset email sent.';
      } catch (error) { authMessage.textContent = error.message; }
    });

    session = loadSession();
    if (session && await ensureSession()) {
      try { await enterAdmin(); }
      catch (error) { saveSession(null); authMessage.textContent = error.message; }
    }
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
