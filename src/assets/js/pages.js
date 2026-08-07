(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  function safeUrl(value = '') {
    try {
      const url = new URL(String(value), location.origin);
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return '#';
      return url.href;
    } catch (_) { return '#'; }
  }

  function initials(name = '') {
    return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'O32';
  }

  function formatDate(value, fallback = 'Date to be announced') {
    if (!value) return fallback;
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
  }

  function empty(title, copy) {
    return `<div class="empty-state"><h3>${esc(title)}</h3><p>${esc(copy)}</p></div>`;
  }

  function projectCard(item) {
    const categories = [item.category, ...(item.skills || [])].filter(Boolean).join('|').toLowerCase();
    const image = item.cover_url ? `<div class="project-card__image"><img src="${esc(safeUrl(item.cover_url))}" alt="" loading="eager" decoding="async"></div>` : '';
    const skills = (item.skills || []).slice(0, 5).map((skill) => `<li>${esc(skill)}</li>`).join('');
    const roles = (item.open_roles || []).map((role) => `<li>${esc(role)}</li>`).join('');
    return `<article class="card project-card" data-filter-value="${esc(categories)}">
      ${image}
      <div class="card__meta"><span class="status-pill status-pill--${item.status === 'Open for interest' ? 'open' : 'planned'}">${esc(item.status || 'Proposed')}</span><span class="card__meta-sep">·</span><span>${esc(item.category || 'Project')}</span></div>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.summary)}</p>
      ${skills ? `<ul class="tag-list" aria-label="Useful skills">${skills}</ul>` : ''}
      <details><summary>Read the proposed brief</summary><p>${esc(item.description || '')}</p>${item.impact ? `<p><strong>Why it could matter:</strong> ${esc(item.impact)}</p>` : ''}${roles ? `<p><strong>Help wanted:</strong></p><ul class="plain-list">${roles}</ul>` : ''}</details>
      <div class="card__footer project-card__footer"><span>${esc(item.year || '2026–27')}</span><a class="text-link" href="join?interest=projects">I’m interested →</a></div>
    </article>`;
  }

  function eventCard(item) {
    const date = item.date_label || formatDate(item.start_at);
    const action = item.registration_url ? `<a class="text-link" href="${esc(safeUrl(item.registration_url))}"${String(item.registration_url).startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>Details or registration →</a>` : '<a class="text-link" href="join?interest=events">Get the date when confirmed →</a>';
    return `<article class="card event-card" data-filter-value="${esc(String(item.event_type || 'event').toLowerCase())}">
      <time datetime="${esc(item.start_at || '')}">${esc(date)}</time>
      <h3>${esc(item.title)}</h3>
      <p class="event-card__place">${esc(item.location || 'Location to be announced')}</p>
      <p>${esc(item.summary)}</p>
      <div class="card__footer"><span class="status-pill status-pill--planned">${esc(item.status || 'Planned')}</span>${action}</div>
    </article>`;
  }

  function resourceCard(item) {
    return `<article class="card resource-card" data-resource-card data-filter-value="${esc(String(item.category || '').toLowerCase())}" data-search="${esc(`${item.title} ${item.description} ${item.source} ${item.category}`.toLowerCase())}">
      <span class="resource-card__source">${esc(item.source || item.category || 'Resource')}</span>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.description)}</p>
      <a href="${esc(safeUrl(item.url))}" target="_blank" rel="noopener">Open official resource →</a>
      ${item.reviewed_at ? `<div class="card__footer"><small>Checked ${esc(formatDate(item.reviewed_at, item.reviewed_at))}</small></div>` : ''}
    </article>`;
  }

  function opportunityCard(item) {
    const deadline = item.deadline_label || (item.deadline ? `Deadline: ${formatDate(item.deadline)}` : 'Open while positions remain');
    const external = /^https?:/i.test(String(item.url || ''));
    return `<article class="card" data-filter-value="${esc(String(item.type || '').toLowerCase())}">
      <div class="card__meta"><span class="status-pill status-pill--open">${esc(item.type || 'Opportunity')}</span></div>
      <h3>${esc(item.title)}</h3>
      <p><strong>${esc(item.organization || 'Oberlin 3-2 Engineering Society')}</strong></p>
      <p>${esc(item.description)}</p>
      <div class="card__footer"><span>${esc(deadline)}</span><a class="text-link" href="${esc(safeUrl(item.url || 'join'))}"${external ? ' target="_blank" rel="noopener"' : ''}>${external ? 'Open listing ↗' : 'Express interest →'}</a></div>
    </article>`;
  }

  function leaderCard(item) {
    // Not lazy. These cards are injected after page load, and the browser's
    // lazy-load check can miss an image that is already in view by the time it
    // arrives, leaving an uploaded portrait permanently blank.
    const avatar = item.photo_url ? `<img src="${esc(safeUrl(item.photo_url))}" alt="${esc(item.name)}" loading="eager" decoding="async">` : esc(initials(item.name || item.role));
    const action = item.open_seat ? '<a class="text-link" href="join?interest=leadership">Express interest →</a>' : (item.email ? `<a class="text-link" href="mailto:${esc(item.email)}">Email →</a>` : '');
    return `<article class="card leader-card" data-filter-value="${item.open_seat ? 'open' : 'current'}">
      <div class="leader-card__avatar">${avatar}</div>
      <div><h3>${esc(item.name || 'Open position')}</h3><p class="leader-card__role">${esc(item.role)}</p><p>${esc(item.bio || '')}</p>${action}</div>
    </article>`;
  }

  function partnerCard(item) {
    const questions = (item.questions || []).map((question) => `<li>${esc(question)}</li>`).join('');
    return `<article class="partner-card"><h3>${esc(item.name)}</h3><p class="partner-card__location">${esc(item.location || '')}</p><p>${esc(item.description || '')}</p><a class="text-link" href="${esc(safeUrl(item.url))}" target="_blank" rel="noopener">Official program page ↗</a>${questions ? `<details><summary>Questions to ask before applying</summary><ul>${questions}</ul></details>` : ''}</article>`;
  }

  function roadmapItem(item) {
    const statusClass = item.status === 'Complete' ? 'open' : item.status === 'In progress' ? 'review' : 'planned';
    return `<article class="roadmap__item"><div class="roadmap__period">${esc(item.period || '')}</div><div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></div><span class="status-pill status-pill--${statusClass}">${esc(item.status || 'Planned')}</span></article>`;
  }

  function newsCard(item) {
    return `<article class="card"><span class="resource-card__source">${esc(formatDate(item.published_at, 'Update'))}</span><h3>${esc(item.title)}</h3><p>${esc(item.excerpt)}</p><details><summary>Read update</summary><p>${esc(item.body)}</p></details></article>`;
  }

  async function renderList(selector, table, renderer, options = {}) {
    const root = $(selector);
    if (!root) return [];
    try {
      const data = await window.O32Data.get(table);
      let rows = Array.isArray(data) ? data : (data ? [data] : []);
      if (options.filter) rows = rows.filter(options.filter);
      const limited = options.limit ? rows.slice(0, options.limit) : rows;
      root.innerHTML = limited.length ? limited.map(renderer).join('') : empty(options.emptyTitle || 'Nothing published yet', options.emptyCopy || 'Check back after the organizing team confirms the details.');
      window.O32Site?.applyFilters?.(root);
      return rows;
    } catch (error) {
      root.innerHTML = empty('This section could not load', 'Please refresh the page or try again later.');
      console.error(`[O32] ${table}:`, error);
      return [];
    }
  }

  async function initResourceSearch() {
    const input = $('[data-resource-search]');
    const root = $('[data-resource-grid]');
    if (!input || !root) return;
    input.addEventListener('input', () => {
      root.dataset.searchQuery = input.value.trim().toLowerCase();
      window.O32Site?.applyFilters?.(root);
    });
  }

  async function initImpact() {
    const root = $('[data-roadmap]');
    if (!root) return;
    try {
      const impact = await window.O32Data.get('impact');
      const record = Array.isArray(impact) ? impact[0] : impact;
      const milestones = record?.milestones || [];
      root.innerHTML = milestones.length ? milestones.map(roadmapItem).join('') : empty('Roadmap not published', 'The founding team is still setting priorities.');
      $$('[data-impact-stage]').forEach((node) => { node.textContent = record?.operating_stage || 'Founding stage'; });
    } catch (error) {
      root.innerHTML = empty('Roadmap unavailable', 'Please try again later.');
    }
  }

  async function initCompetition() {
    const root = $('[data-showcase-status]');
    if (!root) return;
    try {
      const item = await window.O32Data.get('competition_editions');
      if (!item) return;
      $$('[data-showcase-title]').forEach((node) => { node.textContent = item.title; });
      $$('[data-showcase-copy]').forEach((node) => { node.textContent = item.description; });
      root.textContent = item.status || 'Idea under evaluation';
    } catch (_) { /* static page copy remains */ }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
      renderList('[data-project-grid]', 'projects', projectCard, { emptyTitle: 'Project proposals are being collected', emptyCopy: 'Share an idea or join the launch list to help choose the first projects.' }),
      renderList('[data-featured-projects]', 'projects', projectCard, { limit: 3 }),
      renderList('[data-event-grid]', 'events', eventCard, { emptyTitle: 'The first event is being scheduled', emptyCopy: 'Join the list to receive the confirmed date and room.' }),
      renderList('[data-home-events]', 'events', eventCard, { limit: 2 }),
      renderList('[data-resource-grid]', 'resources', resourceCard, { emptyTitle: 'Resources are being checked', emptyCopy: 'Only verified links will be published here.' }),
      renderList('[data-opportunity-grid]', 'opportunities', opportunityCard),
      renderList('[data-leader-grid]', 'leaders', leaderCard),
      // The homepage shows the people, not the vacancies: an unfilled seat is
      // useful on the leadership page and confusing as an introduction.
      renderList('[data-home-leaders]', 'leaders', leaderCard, {
        filter: (item) => !item.open_seat && item.name && item.name !== 'Open position',
        limit: 2,
        emptyTitle: 'The founding team is forming',
        emptyCopy: 'Officer records appear here once roles are confirmed.'
      }),
      renderList('[data-partner-grid]', 'partner_schools', partnerCard),
      renderList('[data-news-grid]', 'news_posts', newsCard, { limit: 6 })
    ]);
    initResourceSearch();
    initImpact();
    initCompetition();
  });
})();
