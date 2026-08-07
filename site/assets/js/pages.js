(() => {
  'use strict';

  const { $, $$, escapeHTML, sanitizeURL, initials, formatDate, initializeReveals } = window.O32UI || {};
  const data = window.O32Data;

  function list(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) { /* comma fallback */ }
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  function codeFor(title = '') {
    return title.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'O32';
  }


  function downloadText(filename, text, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function slugify(value = '') {
    return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
  }

  function projectBriefMarkdown(project) {
    const skills = list(project.skills);
    const roles = list(project.open_roles);
    return `# ${project.title || 'Project brief'}

` +
      `- **Category:** ${project.category || 'Open'}
` +
      `- **Status:** ${project.status || 'Active'}
` +
      `- **Build year:** ${project.year || 'Current'}


` +
      `## Summary
${project.summary || ''}

` +
      `## Brief
${project.description || project.summary || ''}

` +
      `## Intended impact
${project.impact || 'To be defined with the project team and intended users.'}

` +
      `## Useful skills
${skills.length ? skills.map((item) => `- ${item}`).join('\n') : '- All disciplines welcome'}

` +
      `## Open roles
${roles.length ? roles.map((item) => `- ${item}`).join('\n') : '- Contact the projects team'}

` +
      `## Next step
Join or ask about this project through the Oberlin 3-2 Engineering Society.
`;
  }

  function eventIcs(event) {
    const start = event.start_at ? new Date(event.start_at) : null;
    const end = event.end_at ? new Date(event.end_at) : (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);
    if (!start || Number.isNaN(start.getTime())) return '';
    const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const clean = (value) => String(value || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Oberlin 3-2 Engineering Society//Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${event.id || slugify(event.title)}@oberlin32engineeringsociety.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`, `SUMMARY:${clean(event.title)}`, `DESCRIPTION:${clean(event.summary || event.description)}`, `LOCATION:${clean(event.location)}`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  function categoryKey(project) {
    return `${project.category || ''} ${project.title || ''} ${list(project.skills).join(' ')}`.toLowerCase();
  }

  function projectCard(project, board = false) {
    const skills = list(project.skills).slice(0, board ? 5 : 3);
    const roles = list(project.open_roles);
    const code = codeFor(project.title);
    const visual = project.cover_url
      ? `<img class="project-cover-image" src="${escapeHTML(project.cover_url)}" alt="${escapeHTML(project.title)} project cover" loading="lazy">`
      : `<span class="visual-code">${escapeHTML(code)}</span>`;
    return `
      <article class="project-card reveal" tabindex="0" role="button" data-project-slug="${escapeHTML(project.slug)}" data-project-search="${escapeHTML(categoryKey(project))}">
        <div class="project-card-visual ${project.cover_url ? 'has-cover' : ''}">${visual}</div>
        <div class="project-card-top"><span>${escapeHTML(project.kicker || project.category || 'Project')}</span><span class="project-status">${escapeHTML(project.status || 'Active')}</span></div>
        <h3>${escapeHTML(project.title)}</h3>
        <p>${escapeHTML(project.summary || '')}</p>
        <div class="project-card-tags">${skills.map((skill) => `<span>${escapeHTML(skill)}</span>`).join('')}</div>
        <div class="project-card-foot"><span>${roles.length ? `${roles.length} open role${roles.length === 1 ? '' : 's'}` : escapeHTML(project.year || '')}</span><span>Open project →</span></div>
      </article>`;
  }

  function eventPreview(event, index = 0) {
    const href = event.registration_url || 'events.html';
    const external = /^https?:/i.test(href);
    return `
      <a class="event-preview reveal" href="${escapeHTML(sanitizeURL(href))}" ${external ? 'target="_blank" rel="noopener"' : ''}>
        <span>${String(index + 1).padStart(2, '0')} · ${escapeHTML(event.event_type || 'Event')}</span>
        <div><h3>${escapeHTML(event.title)}</h3><p>${escapeHTML(event.summary || '')}</p></div>
        <time>${escapeHTML(event.date_label || formatDate(event.start_at) || 'Details soon')}</time>
        <b>↗</b>
      </a>`;
  }

  function newsCard(post) {
    return `
      <article class="news-card reveal">
        <time datetime="${escapeHTML(post.published_at || '')}">${escapeHTML(formatDate(post.published_at) || 'Update')}</time>
        <h3>${escapeHTML(post.title)}</h3>
        <p>${escapeHTML(post.excerpt || '')}</p>
        <a href="events.html#news">Read field note →</a>
      </article>`;
  }

  function projectUpdateCard(update, project = {}) {
    return `
      <article class="project-update-card reveal">
        <div class="project-update-meta"><span>${escapeHTML(update.milestone || 'Project update')}</span><time datetime="${escapeHTML(update.published_at || '')}">${escapeHTML(formatDate(update.published_at) || 'Update')}</time></div>
        <small>${escapeHTML(project.title || 'Society project')}</small>
        <h3>${escapeHTML(update.title || 'Build update')}</h3>
        <p>${escapeHTML(update.summary || update.body || '')}</p>
        ${project.slug ? `<button type="button" data-update-project="${escapeHTML(project.slug)}">Open project →</button>` : ''}
      </article>`;
  }

  function leaderRow(leader) {
    return `<div class="leader-console-row"><span class="leader-avatar">${escapeHTML(initials(leader.name))}</span><div><strong>${escapeHTML(leader.name)}</strong><small>${escapeHTML(leader.role)}</small></div><span>${escapeHTML(leader.term || '')}</span></div>`;
  }

  function leaderCard(leader) {
    const links = [];
    if (leader.email) links.push(`<a href="mailto:${escapeHTML(leader.email)}">Email ↗</a>`);
    if (leader.linkedin_url) links.push(`<a href="${escapeHTML(sanitizeURL(leader.linkedin_url))}" target="_blank" rel="noopener">LinkedIn ↗</a>`);
    return `
      <article class="leader-card reveal ${leader.advisor ? 'advisor-card' : ''}">
        <div class="leader-card-top"><span>${escapeHTML(leader.term || 'Current term')}</span><span>${leader.advisor ? 'ADVISOR' : 'BOARD'}</span></div>
        <div class="leader-card-avatar">${leader.photo_url ? `<img src="${escapeHTML(leader.photo_url)}" alt="${escapeHTML(leader.name)}">` : escapeHTML(initials(leader.name))}</div>
        <h3>${escapeHTML(leader.name)}</h3>
        <div class="leader-role">${escapeHTML(leader.role)}</div>
        <p>${escapeHTML(leader.bio || '')}</p>
        ${links.length ? `<div class="leader-card-links">${links.join('')}</div>` : ''}
      </article>`;
  }

  function openRoleCard(leader) {
    return `
      <article class="open-role-card reveal">
        <span>OPEN // ${escapeHTML(leader.term || '2026–27')}</span>
        <h3>${escapeHTML(leader.role)}</h3>
        <p>${escapeHTML(leader.bio || '')}</p>
        <a href="https://forms.gle/6pPoj3hqQMJADLjZ6" target="_blank" rel="noopener">Express interest ↗</a>
      </article>`;
  }

  function openProjectDialog(project, updates = []) {
    const dialog = $('[data-project-dialog]');
    const content = $('[data-project-dialog-content]');
    if (!dialog || !content) return;
    const skills = list(project.skills);
    const roles = list(project.open_roles);
    const recentUpdates = (updates || []).filter((item) => item.project_id === project.id && item.published !== false).slice(0, 5);
    const updateTimeline = recentUpdates.length ? `
      <section class="project-detail-updates">
        <div class="project-detail-section-head"><span>BUILD LOG</span><h3>Recent project updates</h3></div>
        <div class="project-detail-update-list">${recentUpdates.map((item) => `
          <article><time datetime="${escapeHTML(item.published_at || '')}">${escapeHTML(formatDate(item.published_at) || 'Update')}</time><div><span>${escapeHTML(item.milestone || 'Milestone')}</span><h4>${escapeHTML(item.title || 'Project update')}</h4><p>${escapeHTML(item.summary || item.body || '')}</p></div></article>`).join('')}</div>
      </section>` : '';
    const links = [
      project.project_url ? `<a class="button button-outline" href="${escapeHTML(sanitizeURL(project.project_url))}" target="_blank" rel="noopener">Project site ↗</a>` : '',
      project.github_url ? `<a class="button button-outline" href="${escapeHTML(sanitizeURL(project.github_url))}" target="_blank" rel="noopener">Repository ↗</a>` : '',
      `<button class="button button-outline" type="button" data-download-project>Download brief ↓</button>`,
      `<button class="button button-outline" type="button" data-share-project>Share project ⧉</button>`,
      `<a class="button button-gold" href="https://forms.gle/6pPoj3hqQMJADLjZ6" target="_blank" rel="noopener">Join this project ↗</a>`
    ].filter(Boolean).join('');
    content.innerHTML = `
      <div class="project-detail-head">
        <div class="project-detail-code ${project.cover_url ? 'has-cover' : ''}">${project.cover_url ? `<img src="${escapeHTML(project.cover_url)}" alt="${escapeHTML(project.title)} project cover">` : escapeHTML(codeFor(project.title))}</div>
        <div><span class="eyebrow">${escapeHTML(project.category || 'Project')}</span><h2 id="project-dialog-title">${escapeHTML(project.title)}</h2><p>${escapeHTML(project.summary || '')}</p><div class="project-progress"><div class="progress-head"><span>${escapeHTML(project.status || 'Active')}</span><span>${Number(project.progress || 0)}%</span></div><div class="progress-track"><i style="width:${Math.max(0, Math.min(100, Number(project.progress || 0)))}%"></i></div></div></div>
      </div>
      <div class="project-detail-grid">
        <div><h3>The brief</h3><p>${escapeHTML(project.description || project.summary || '')}</p><h3>Intended impact</h3><p>${escapeHTML(project.impact || 'The team will define and measure the intended impact during project framing.')}</p></div>
        <div><h3>Useful skills</h3><ul class="detail-tag-list">${skills.map((item) => `<li>${escapeHTML(item)}</li>`).join('') || '<li>All disciplines welcome</li>'}</ul><h3>Open roles</h3><ul class="detail-tag-list">${roles.map((item) => `<li>${escapeHTML(item)}</li>`).join('') || '<li>Ask the project team</li>'}</ul><div class="hero-actions">${links}</div></div>
      </div>
      ${updateTimeline}`;
    $('[data-download-project]', content)?.addEventListener('click', () => {
      downloadText(`${slugify(project.title)}-brief.md`, projectBriefMarkdown(project), 'text/markdown;charset=utf-8');
    });
    $('[data-share-project]', content)?.addEventListener('click', async () => {
      const url = new URL(window.location.href);
      url.pathname = url.pathname.replace(/[^/]*$/, 'projects.html');
      url.search = `?project=${encodeURIComponent(project.slug)}`;
      try {
        if (navigator.share) await navigator.share({ title: project.title, text: project.summary || '', url: url.toString() });
        else { await navigator.clipboard.writeText(url.toString()); window.O32UI?.showToast('Project link copied.'); }
      } catch (error) {
        if (error?.name !== 'AbortError') window.O32UI?.showToast('Could not share the project link.', 'error');
      }
    });
    if (!dialog.open) dialog.showModal();
  }

  function bindProjectCards(projects, updates = []) {
    $$('[data-project-slug]').forEach((card) => {
      const open = () => {
        const project = projects.find((item) => item.slug === card.dataset.projectSlug);
        if (project) openProjectDialog(project, updates);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
      });
    });
    $('[data-project-dialog-close]')?.addEventListener('click', () => $('[data-project-dialog]')?.close());
    $('[data-project-dialog]')?.addEventListener('click', (event) => { if (event.target.matches('[data-project-dialog]')) event.target.close(); });
  }

  async function renderHome() {
    const [projects, events, leaders, news, updates] = await Promise.all([
      data.get('projects'), data.get('events'), data.get('leaders'), data.get('news_posts'), data.get('project_updates')
    ]);
    const featuredProjects = (projects || []).filter((item) => item.featured !== false).slice(0, 3);
    const projectRoot = $('[data-featured-projects]');
    if (projectRoot) projectRoot.innerHTML = featuredProjects.map((item) => projectCard(item)).join('');

    const eventRoot = $('[data-featured-events]');
    if (eventRoot) eventRoot.innerHTML = (events || []).filter((item) => item.featured !== false).slice(0, 4).map(eventPreview).join('');

    const leaderRoot = $('[data-leadership-preview]');
    if (leaderRoot) leaderRoot.innerHTML = (leaders || []).filter((item) => item.current && !item.open_seat).slice(0, 3).map(leaderRow).join('');

    const newsRoot = $('[data-latest-news]');
    if (newsRoot) newsRoot.innerHTML = (news || []).slice(0, 3).map(newsCard).join('');
    bindProjectCards(projects || [], updates || []);
  }

  async function renderProjects() {
    const [projects, updates] = await Promise.all([data.get('projects'), data.get('project_updates')]);
    const root = $('[data-project-board]');
    if (!root) return;
    let activeFilter = 'all';
    let query = '';

    const render = () => {
      const filtered = (projects || []).filter((project) => {
        const haystack = categoryKey(project);
        const filterMatch = activeFilter === 'all' || haystack.includes(activeFilter);
        const queryMatch = !query || haystack.includes(query) || String(project.summary || '').toLowerCase().includes(query);
        return filterMatch && queryMatch;
      });
      root.innerHTML = filtered.map((item) => projectCard(item, true)).join('');
      $('[data-project-empty]')?.toggleAttribute('hidden', filtered.length > 0);
      bindProjectCards(projects || [], updates || []);
      initializeReveals?.();
    };

    const roleCount = (projects || []).reduce((sum, item) => sum + list(item.open_roles).length, 0);
    $('[data-project-count]') && ($('[data-project-count]').textContent = String((projects || []).length));
    $('[data-open-role-count]') && ($('[data-open-role-count]').textContent = roleCount ? `${roleCount}+` : 'Open');

    const updateRoot = $('[data-project-updates]');
    if (updateRoot) {
      const projectById = new Map((projects || []).map((item) => [item.id, item]));
      updateRoot.innerHTML = (updates || []).filter((item) => item.published !== false).slice(0, 6).map((item) => projectUpdateCard(item, projectById.get(item.project_id) || {})).join('');
      $$('[data-update-project]', updateRoot).forEach((button) => button.addEventListener('click', () => {
        const project = (projects || []).find((item) => item.slug === button.dataset.updateProject);
        if (project) openProjectDialog(project, updates || []);
      }));
    }

    $$('[data-project-filter]').forEach((button) => button.addEventListener('click', () => {
      activeFilter = button.dataset.projectFilter;
      $$('[data-project-filter]').forEach((item) => item.classList.toggle('active', item === button));
      render();
    }));
    $('[data-project-search]')?.addEventListener('input', (event) => { query = event.target.value.trim().toLowerCase(); render(); });
    $('[data-project-reset]')?.addEventListener('click', () => {
      activeFilter = 'all'; query = '';
      $$('[data-project-filter]').forEach((item) => item.classList.toggle('active', item.dataset.projectFilter === 'all'));
      const input = $('[data-project-search]'); if (input) input.value = '';
      render();
    });
    render();

    const slug = new URLSearchParams(window.location.search).get('project');
    if (slug) {
      const project = (projects || []).find((item) => item.slug === slug);
      if (project) window.setTimeout(() => openProjectDialog(project, updates || []), 150);
    }
  }

  async function renderCompetition() {
    const [competition, sponsorRows] = await Promise.all([
      data.get('competition_editions', { order: 'year.desc' }),
      data.get('sponsors')
    ]);
    if (!competition) return;
    const setText = (selector, value) => { const node = $(selector); if (node && value) node.textContent = value; };
    setText('[data-competition-theme]', competition.theme || 'Engineering for a More Connected World');
    setText('[data-competition-season]', String(competition.season || competition.year || 'Date to be announced').toUpperCase());
    setText('[data-competition-description]', competition.description);
    setText('[data-competition-status]', String(competition.status || 'Concept in development').toUpperCase());
    setText('[data-competition-registration]', competition.registration_open ? 'OPEN' : 'INTEREST LIST OPEN');
    setText('[data-competition-venue]', String(competition.venue || 'To be announced').toUpperCase());
    const tracks = list(competition.tracks);
    const stages = list(competition.stages);
    const criteria = list(competition.criteria);
    const trackRoot = $('[data-competition-tracks]');
    if (trackRoot) trackRoot.innerHTML = tracks.map((track, index) => `<article class="track-card reveal" data-number="${escapeHTML(track.number || String(index + 1).padStart(2, '0'))}"><span>TRACK ${escapeHTML(track.number || String(index + 1).padStart(2, '0'))}</span><h3>${escapeHTML(track.title)}</h3><p>${escapeHTML(track.description || '')}</p></article>`).join('');
    const stageRoot = $('[data-competition-stages]');
    if (stageRoot) stageRoot.innerHTML = stages.map((stage, index) => `<article class="process-stage reveal"><span>${escapeHTML(stage.number || String(index + 1).padStart(2, '0'))}</span><div><h3>${escapeHTML(stage.title)}</h3><p>${escapeHTML(stage.description || '')}</p></div></article>`).join('');
    const criteriaRoot = $('[data-competition-criteria]');
    if (criteriaRoot) criteriaRoot.innerHTML = criteria.map((item) => `<article class="criteria-card reveal"><strong>${escapeHTML(item.weight || '')}</strong><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description || '')}</p></article>`).join('');

    const sponsors = (sponsorRows || []).filter((item) => item.published !== false && item.active !== false);
    const sponsorSection = $('[data-sponsor-section]');
    const sponsorRoot = $('[data-sponsor-grid]');
    if (sponsorSection && sponsorRoot && sponsors.length) {
      sponsorRoot.innerHTML = sponsors.map((item) => `<a class="sponsor-logo-card" href="${escapeHTML(sanitizeURL(item.url || 'contact.html'))}" ${/^https?:/i.test(item.url || '') ? 'target="_blank" rel="noopener"' : ''}>${item.logo_url ? `<img src="${escapeHTML(item.logo_url)}" alt="${escapeHTML(item.name)} logo" loading="lazy">` : `<strong>${escapeHTML(item.name)}</strong>`}<span>${escapeHTML(item.tier || 'Partner')}</span></a>`).join('');
      sponsorSection.hidden = false;
    }
  }

  async function renderLeadership() {
    const leaders = await data.get('leaders');
    const published = (leaders || []).filter((item) => item.published !== false);
    const current = published.filter((item) => item.current && !item.open_seat);
    const open = published.filter((item) => item.current && item.open_seat);
    const currentRoot = $('[data-current-leadership]');
    if (currentRoot) currentRoot.innerHTML = current.map(leaderCard).join('');
    const openRoot = $('[data-open-leadership]');
    if (openRoot) openRoot.innerHTML = open.map(openRoleCard).join('');

    const archiveRoot = $('[data-leadership-archive]');
    if (archiveRoot) {
      const people = published.filter((item) => !item.open_seat);
      const terms = [...new Set(people.map((item) => item.term || 'Term not listed'))];
      terms.sort((a, b) => String(b).localeCompare(String(a)));
      const records = terms.map((term) => {
        const termLeaders = people.filter((item) => (item.term || 'Term not listed') === term);
        const isCurrent = termLeaders.some((item) => item.current);
        const names = termLeaders.map((item) => `<li><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.role)}</span></li>`).join('');
        return `<article class="archive-term ${isCurrent ? 'active' : ''} reveal"><div class="archive-year"><strong>${escapeHTML(term)}</strong><span>${isCurrent ? 'CURRENT TERM' : 'PAST TERM'}</span></div><div class="archive-summary"><h3>${isCurrent ? 'The systems-building year' : 'Leadership record'}</h3><ul class="archive-leader-list">${names}</ul>${isCurrent ? '<a href="#open-roles">View current openings ↓</a>' : ''}</div></article>`;
      });
      const hasPast = people.some((item) => !item.current);
      if (!hasPast) records.push('<article class="archive-term future reveal"><div class="archive-year"><strong>NEXT</strong><span>FUTURE TERMS</span></div><div class="archive-summary"><h3>The archive grows here</h3><p>At the end of each term, officers move into the permanent archive rather than disappearing from the site.</p></div></article>');
      archiveRoot.innerHTML = records.join('');
    }
  }

  function fullEventRow(event) {
    const href = event.registration_url || '#';
    const external = /^https?:/i.test(href);
    const calendar = event.start_at ? `<button type="button" data-calendar-event="${escapeHTML(event.id || slugify(event.title))}">Add to calendar ↓</button>` : '';
    return `
      <article class="event-row reveal" data-event-type="${escapeHTML(String(event.event_type || '').toLowerCase())}">
        <span class="event-row-type">${escapeHTML(event.event_type || 'Event')}</span>
        <div><h3>${escapeHTML(event.title)}</h3><p>${escapeHTML(event.summary || '')}</p></div>
        <div><time>${escapeHTML(event.date_label || formatDate(event.start_at) || 'Details soon')}</time><div class="event-location">${escapeHTML(event.location || '')}</div></div>
        <div class="event-row-actions"><a href="${escapeHTML(sanitizeURL(href))}" ${external ? 'target="_blank" rel="noopener"' : ''}>Details ↗</a>${calendar}</div>
      </article>`;
  }

  async function renderEvents() {
    const [events, news] = await Promise.all([data.get('events'), data.get('news_posts')]);
    const featured = (events || []).find((item) => item.featured) || (events || [])[0];
    const featureRoot = $('[data-featured-event]');
    if (featureRoot && featured) {
      const href = featured.registration_url || '#calendar';
      const external = /^https?:/i.test(href);
      featureRoot.innerHTML = `<div class="event-feature-art" data-code="${escapeHTML(codeFor(featured.title))}"><span class="event-badge">FEATURED EVENT</span></div><div class="event-feature-copy"><span>${escapeHTML(featured.event_type || 'EVENT')}</span><h2>${escapeHTML(featured.title)}</h2><p>${escapeHTML(featured.summary || '')}</p><div class="event-meta"><span>${escapeHTML(featured.date_label || 'Details soon')}</span><span>${escapeHTML(featured.location || '')}</span></div><a class="button button-gold" href="${escapeHTML(sanitizeURL(href))}" ${external ? 'target="_blank" rel="noopener"' : ''}>Event details <span>↗</span></a></div>`;
    }
    const listRoot = $('[data-events-list]');
    if (listRoot) {
      listRoot.innerHTML = (events || []).map(fullEventRow).join('');
      $$('[data-calendar-event]', listRoot).forEach((button) => button.addEventListener('click', () => {
        const event = (events || []).find((item) => (item.id || slugify(item.title)) === button.dataset.calendarEvent);
        const ics = event ? eventIcs(event) : '';
        if (ics) downloadText(`${slugify(event.title)}.ics`, ics, 'text/calendar;charset=utf-8');
      }));
    }
    const newsRoot = $('[data-news-grid]');
    if (newsRoot) newsRoot.innerHTML = (news || []).map(newsCard).join('');

    $$('[data-event-filter]').forEach((button) => button.addEventListener('click', () => {
      const filter = button.dataset.eventFilter;
      $$('[data-event-filter]').forEach((item) => item.classList.toggle('active', item === button));
      $$('.event-row').forEach((row) => { row.hidden = filter !== 'all' && !row.dataset.eventType.includes(filter); });
    }));
  }

  function opportunityCard(item) {
    const href = item.url || '#';
    const external = /^https?:/i.test(href);
    return `
      <article class="opportunity-card reveal" data-opportunity-type="${escapeHTML(String(item.type || '').toLowerCase())}" data-opportunity-search="${escapeHTML(`${item.title} ${item.organization} ${item.description} ${item.type}`.toLowerCase())}">
        <div class="opportunity-card-top"><span class="opportunity-card-type">${escapeHTML(item.type || 'Opportunity')}</span><span>${escapeHTML(item.location || '')}</span></div>
        <h3>${escapeHTML(item.title)}</h3><span class="org">${escapeHTML(item.organization || '')}</span><p>${escapeHTML(item.description || '')}</p>
        <div class="opportunity-card-bottom"><span>${escapeHTML(item.deadline_label || formatDate(item.deadline) || 'Timing varies')}</span><a href="${escapeHTML(sanitizeURL(href))}" ${external ? 'target="_blank" rel="noopener"' : ''}>Open opportunity ↗</a></div>
      </article>`;
  }

  async function renderOpportunities() {
    const opportunities = await data.get('opportunities');
    const root = $('[data-opportunity-grid]');
    if (!root) return;
    let filter = 'all';
    let query = '';
    const render = () => {
      const matches = (opportunities || []).filter((item) => {
        const type = String(item.type || '').toLowerCase();
        const haystack = `${item.title} ${item.organization} ${item.description} ${item.type}`.toLowerCase();
        return (filter === 'all' || type.includes(filter)) && (!query || haystack.includes(query));
      });
      root.innerHTML = matches.map(opportunityCard).join('');
      $('[data-opportunity-empty]')?.toggleAttribute('hidden', matches.length > 0);
      initializeReveals?.();
    };
    $$('[data-opportunity-filter]').forEach((button) => button.addEventListener('click', () => {
      filter = button.dataset.opportunityFilter;
      $$('[data-opportunity-filter]').forEach((item) => item.classList.toggle('active', item === button));
      render();
    }));
    $('[data-opportunity-search]')?.addEventListener('input', (event) => { query = event.target.value.trim().toLowerCase(); render(); });
    $('[data-opportunity-reset]')?.addEventListener('click', () => {
      filter = 'all'; query = '';
      const input = $('[data-opportunity-search]'); if (input) input.value = '';
      $$('[data-opportunity-filter]').forEach((item) => item.classList.toggle('active', item.dataset.opportunityFilter === 'all'));
      render();
    });
    render();
  }

  function resourceCard(item) {
    return `
      <article class="resource-card reveal ${item.pinned ? 'pinned' : ''}" data-resource-category="${escapeHTML(String(item.category || '').toLowerCase())}" data-resource-search="${escapeHTML(`${item.title} ${item.description} ${item.category} ${item.source}`.toLowerCase())}">
        <span>${escapeHTML(item.category || 'Resource')}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description || '')}</p>
        <div class="resource-card-foot"><span>${escapeHTML(item.source || '')}</span><a href="${escapeHTML(sanitizeURL(item.url || '#'))}" target="_blank" rel="noopener">Open ↗</a></div>
      </article>`;
  }

  async function renderResources() {
    const resources = await data.get('resources');
    const root = $('[data-resource-grid]');
    if (!root) return;
    let filter = 'all';
    let query = '';
    const render = () => {
      const matches = (resources || []).filter((item) => {
        const category = String(item.category || '').toLowerCase();
        const haystack = `${item.title} ${item.description} ${item.category} ${item.source}`.toLowerCase();
        return (filter === 'all' || category.includes(filter)) && (!query || haystack.includes(query));
      });
      root.innerHTML = matches.map(resourceCard).join('');
      $('[data-resource-empty]')?.toggleAttribute('hidden', matches.length > 0);
      initializeReveals?.();
    };
    $$('[data-resource-filter]').forEach((button) => button.addEventListener('click', () => {
      filter = button.dataset.resourceFilter;
      $$('[data-resource-filter]').forEach((item) => item.classList.toggle('active', item === button));
      render();
    }));
    $('[data-resource-search]')?.addEventListener('input', (event) => { query = event.target.value.trim().toLowerCase(); render(); });
    $('[data-resource-reset]')?.addEventListener('click', () => {
      filter = 'all'; query = '';
      const input = $('[data-resource-search]'); if (input) input.value = '';
      $$('[data-resource-filter]').forEach((item) => item.classList.toggle('active', item.dataset.resourceFilter === 'all'));
      render();
    });
    render();
  }


  async function renderPathway() {
    const partners = await data.get('partner_schools');
    const root = $('[data-partner-grid]');
    if (!root) return;
    root.innerHTML = (partners || []).map((partner, index) => `
      <article class="partner-comparison-card reveal">
        <div class="partner-card-code"><span>${escapeHTML(partner.region_code || String(index + 1).padStart(2, '0'))}</span><i></i></div>
        <small>PARTNER ${String(index + 1).padStart(2, '0')}</small>
        <h3>${escapeHTML(partner.short_name || partner.name)}</h3>
        <p>${escapeHTML(partner.location || '')}</p>
        <div class="partner-question-list">${list(partner.questions).map((question) => `<span>${escapeHTML(question)}</span>`).join('')}</div>
        <a href="${escapeHTML(sanitizeURL(partner.url || '#'))}" target="_blank" rel="noopener">Visit official institution site ↗</a>
      </article>`).join('');
  }

  function documentCard(item) {
    const external = /^https?:/i.test(item.url || '');
    return `<article class="document-card reveal"><span>${escapeHTML(item.category || 'Document')}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description || '')}</p><div><small>${escapeHTML(item.format || 'Resource')}</small><a href="${escapeHTML(sanitizeURL(item.url || '#'))}" ${external ? 'target="_blank" rel="noopener"' : 'download'}>Open resource ↗</a></div></article>`;
  }

  async function renderImpact() {
    const [impactRows, documents] = await Promise.all([data.get('impact'), data.get('documents')]);
    const impact = Array.isArray(impactRows) ? (impactRows[0]?.settings || impactRows[0] || {}) : (impactRows || {});
    const stage = $('[data-impact-stage]');
    if (stage) stage.textContent = String(impact.operating_stage || 'Founding year').toUpperCase();

    const metricsRoot = $('[data-impact-metrics]');
    if (metricsRoot) metricsRoot.innerHTML = list(impact.public_metrics).map((metric) => `<article class="impact-metric reveal"><strong>${escapeHTML(metric.value || '')}</strong><h3>${escapeHTML(metric.label || '')}</h3><p>${escapeHTML(metric.note || '')}</p></article>`).join('');

    const milestoneRoot = $('[data-impact-milestones]');
    if (milestoneRoot) milestoneRoot.innerHTML = list(impact.milestones).map((item, index) => `<article class="milestone-row reveal ${escapeHTML(item.status || 'planned')}"><div><span>${String(index + 1).padStart(2, '0')}</span><i></i></div><time>${escapeHTML(item.period || '')}</time><section><small>${escapeHTML(item.status || 'planned')}</small><h3>${escapeHTML(item.title || '')}</h3><p>${escapeHTML(item.description || '')}</p></section></article>`).join('');

    const reportRoot = $('[data-report-grid]');
    if (reportRoot) reportRoot.innerHTML = list(impact.reports).map((report) => `<article class="report-record reveal"><span>ANNUAL REPORT</span><strong>${escapeHTML(report.year || '')}</strong><h3>${escapeHTML(report.title || '')}</h3><p>${escapeHTML(report.status || '')}</p>${report.url ? `<a href="${escapeHTML(sanitizeURL(report.url))}">Read report ↗</a>` : '<small>Publication pending</small>'}</article>`).join('');

    const documentRoot = $('[data-document-grid]');
    if (documentRoot) documentRoot.innerHTML = (documents || []).filter((item) => item.published !== false).map(documentCard).join('');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const page = document.body.dataset.page;
    try {
      if (page === 'home') await renderHome();
      if (page === 'projects') await renderProjects();
      if (page === 'competition') await renderCompetition();
      if (page === 'leadership') await renderLeadership();
      if (page === 'events') await renderEvents();
      if (page === 'opportunities') await renderOpportunities();
      if (page === 'resources') await renderResources();
      if (page === 'pathway') await renderPathway();
      if (page === 'impact') await renderImpact();
    } catch (error) {
      console.error('[O32] Page rendering failed:', error);
    } finally {
      initializeReveals?.();
    }
  });
})();
