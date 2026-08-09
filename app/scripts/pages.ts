import { get, type PublicTable } from './data';
import { flag, isRecord, list, text, type UnknownRecord } from './types';
import { escapeHtml as esc, safeUrl, statusPanel } from './ui';

type Renderer = (item: UnknownRecord) => string;
type FilterCallback = (item: UnknownRecord) => boolean;
type ApplyFilters = (target: HTMLElement | null) => void;

interface RenderOptions {
  limit?: number;
  filter?: FilterCallback;
  emptyTitle?: string;
  emptyCopy?: string;
}

const select = <T extends Element>(selector: string, root: ParentNode = document): T | null => root.querySelector<T>(selector);
const selectAll = <T extends Element>(selector: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(selector)];

function initials(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'O32';
}

function formatDate(value: string, fallback = 'Date to be announced'): string {
  if (!value) return fallback;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

/* Injected images must not be lazy.
 *
 * These cards are written into the DOM after the page has loaded. When an
 * image arrives already inside the viewport, the browser's lazy-load check has
 * often already run, so the load never fires and the picture stays blank. It
 * is intermittent, which is what makes it easy to miss: a hard refresh shows
 * the photo, a normal visit does not. This was fixed once before and the
 * migration reverted it, so scripts/check_site.py now fails the build if
 * loading="lazy" reappears in a card renderer.
 */
function projectCard(item: UnknownRecord): string {
  const categories = [text(item, 'category'), ...list(item, 'skills')].filter(Boolean).join('|').toLowerCase();
  const cover = text(item, 'cover_url');
  const image = cover ? `<div class="project-card__image"><img src="${esc(safeUrl(cover))}" alt="" width="1200" height="800" loading="eager" decoding="async"></div>` : '';
  const skills = list(item, 'skills').slice(0, 5).map((skill) => `<li>${esc(skill)}</li>`).join('');
  const roles = list(item, 'open_roles').map((role) => `<li>${esc(role)}</li>`).join('');
  const status = text(item, 'status', 'Proposed');
  const description = text(item, 'description');
  const impact = text(item, 'impact');
  return `<article class="card project-card" data-filter-value="${esc(categories)}">
    ${image}<div class="card__meta"><span class="status-pill status-pill--${status === 'Open for interest' ? 'open' : 'planned'}">${esc(status)}</span><span class="card__meta-sep">·</span><span>${esc(text(item, 'category', 'Project'))}</span></div>
    <h3>${esc(text(item, 'title'))}</h3><p>${esc(text(item, 'summary'))}</p>
    ${skills ? `<ul class="tag-list" aria-label="Useful skills">${skills}</ul>` : ''}
    <details><summary>Read the project brief</summary><p>${esc(description)}</p>${impact ? `<p><strong>Intended use:</strong> ${esc(impact)}</p>` : ''}${roles ? `<p><strong>Open tasks:</strong></p><ul class="plain-list">${roles}</ul>` : ''}</details>
    <div class="card__footer project-card__footer"><span>${esc(text(item, 'year', '2026–27'))}</span><a class="text-link" href="/join?interest=projects">Submit project interest →</a></div>
  </article>`;
}

function eventCard(item: UnknownRecord): string {
  const start = text(item, 'start_at');
  const registration = text(item, 'registration_url');
  const action = registration
    ? `<a class="text-link" href="${esc(safeUrl(registration))}"${registration.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>Details or registration →</a>`
    : '<a class="text-link" href="/join?interest=events">Get the date when confirmed →</a>';
  return `<article class="card event-card" data-filter-value="${esc(text(item, 'event_type', 'event').toLowerCase())}"><time datetime="${esc(start)}">${esc(text(item, 'date_label') || formatDate(start))}</time><h3>${esc(text(item, 'title'))}</h3><p class="event-card__place">${esc(text(item, 'location', 'Location to be announced'))}</p><p>${esc(text(item, 'summary'))}</p><div class="card__footer"><span class="status-pill status-pill--planned">${esc(text(item, 'status', 'Planned'))}</span>${action}</div></article>`;
}

function resourceCard(item: UnknownRecord): string {
  const reviewed = text(item, 'reviewed_at');
  const search = `${text(item, 'title')} ${text(item, 'description')} ${text(item, 'source')} ${text(item, 'category')}`.toLowerCase();
  return `<article class="card resource-card" data-resource-card data-filter-value="${esc(text(item, 'category').toLowerCase())}" data-search="${esc(search)}"><span class="resource-card__source">${esc(text(item, 'source') || text(item, 'category', 'Resource'))}</span><h3>${esc(text(item, 'title'))}</h3><p>${esc(text(item, 'description'))}</p><a href="${esc(safeUrl(text(item, 'url')))}" target="_blank" rel="noopener">Open official resource →</a>${reviewed ? `<div class="card__footer"><small>Checked ${esc(formatDate(reviewed, reviewed))}</small></div>` : ''}</article>`;
}

function opportunityCard(item: UnknownRecord): string {
  const deadlineValue = text(item, 'deadline');
  const deadline = text(item, 'deadline_label') || (deadlineValue ? `Deadline: ${formatDate(deadlineValue)}` : 'No fixed deadline');
  const url = text(item, 'url', '/join');
  const external = /^https?:/i.test(url);
  return `<article class="card" data-filter-value="${esc(text(item, 'type').toLowerCase())}"><div class="card__meta"><span class="status-pill status-pill--open">${esc(text(item, 'type', 'Opportunity'))}</span></div><h3>${esc(text(item, 'title'))}</h3><p><strong>${esc(text(item, 'organization', 'Oberlin 3-2 Engineering Society'))}</strong></p><p>${esc(text(item, 'description'))}</p><div class="card__footer"><span>${esc(deadline)}</span><a class="text-link" href="${esc(safeUrl(url))}"${external ? ' target="_blank" rel="noopener"' : ''}>${external ? 'Open listing ↗' : 'Express interest →'}</a></div></article>`;
}

function leaderCard(item: UnknownRecord): string {
  const name = text(item, 'name', 'Open position');
  const role = text(item, 'role');
  const photo = text(item, 'photo_url');
  const email = text(item, 'email');
  const avatar = photo ? `<img src="${esc(safeUrl(photo))}" alt="${esc(name)}" width="640" height="640" loading="eager" decoding="async">` : esc(initials(name || role));
  const action = flag(item, 'open_seat') ? '<a class="text-link" href="/join?interest=leadership">Express interest →</a>' : email ? `<a class="text-link" href="mailto:${esc(email)}">Email →</a>` : '';
  return `<article class="card leader-card" data-filter-value="${flag(item, 'open_seat') ? 'open' : 'current'}"><div class="leader-card__avatar">${avatar}</div><div><h3>${esc(name)}</h3><p class="leader-card__role">${esc(role)}</p><p>${esc(text(item, 'bio'))}</p>${action}</div></article>`;
}

function partnerCard(item: UnknownRecord): string {
  const questions = list(item, 'questions').map((question) => `<li>${esc(question)}</li>`).join('');
  return `<article class="partner-card"><h3>${esc(text(item, 'name'))}</h3><p class="partner-card__location">${esc(text(item, 'location'))}</p><p>${esc(text(item, 'description'))}</p><a class="text-link" href="${esc(safeUrl(text(item, 'url')))}" target="_blank" rel="noopener">Official program page ↗</a>${questions ? `<details><summary>Questions to ask before applying</summary><ul>${questions}</ul></details>` : ''}</article>`;
}

function roadmapItem(item: UnknownRecord): string {
  const status = text(item, 'status', 'Planned');
  const statusClass = status === 'Complete' ? 'open' : status === 'In progress' ? 'review' : 'planned';
  return `<article class="roadmap__item"><div class="roadmap__period">${esc(text(item, 'period'))}</div><div><h3>${esc(text(item, 'title'))}</h3><p>${esc(text(item, 'description'))}</p></div><span class="status-pill status-pill--${statusClass}">${esc(status)}</span></article>`;
}

function newsCard(item: UnknownRecord): string {
  return `<article class="card"><span class="resource-card__source">${esc(formatDate(text(item, 'published_at'), 'Update'))}</span><h3>${esc(text(item, 'title'))}</h3><p>${esc(text(item, 'excerpt'))}</p><details><summary>Read update</summary><p>${esc(text(item, 'body'))}</p></details></article>`;
}

async function renderList(selector: string, table: PublicTable, renderer: Renderer, applyFilters: ApplyFilters, options: RenderOptions = {}): Promise<UnknownRecord[]> {
  const root = select<HTMLElement>(selector);
  if (!root) return [];
  root.innerHTML = statusPanel('loading', 'Loading…', 'Preparing this section.');
  try {
    const value = await get(table);
    let rows = Array.isArray(value) ? value.filter(isRecord) : isRecord(value) ? [value] : [];
    if (options.filter) rows = rows.filter(options.filter);
    const limited = options.limit ? rows.slice(0, options.limit) : rows;
    root.innerHTML = limited.length
      ? limited.map(renderer).join('')
      : statusPanel('empty', options.emptyTitle ?? 'Nothing published yet', options.emptyCopy ?? 'New information will appear here after it is confirmed.');
    applyFilters(root);
    return rows;
  } catch (error) {
    root.innerHTML = statusPanel('error', 'This section could not load', 'Refresh the page or try again later.');
    console.error(`[O32] ${table}`, error);
    return [];
  }
}

function initResourceSearch(applyFilters: ApplyFilters): void {
  const input = select<HTMLInputElement>('[data-resource-search]');
  const root = select<HTMLElement>('[data-resource-grid]');
  if (!input || !root) return;
  input.addEventListener('input', () => { root.dataset.searchQuery = input.value.trim().toLowerCase(); applyFilters(root); });
}

async function initImpact(): Promise<void> {
  const root = select<HTMLElement>('[data-roadmap]');
  if (!root) return;
  try {
    const value = await get('impact');
    const record = Array.isArray(value) ? value.find(isRecord) : isRecord(value) ? value : null;
    const milestones = record && Array.isArray(record.milestones) ? record.milestones.filter(isRecord) : [];
    root.innerHTML = milestones.length ? milestones.map(roadmapItem).join('') : statusPanel('empty', 'Roadmap not published', 'The founding team is still setting priorities.');
    selectAll<HTMLElement>('[data-impact-stage]').forEach((node) => { node.textContent = record ? text(record, 'operating_stage', 'Founding stage') : 'Founding stage'; });
  } catch {
    root.innerHTML = statusPanel('error', 'Roadmap unavailable', 'Refresh the page or try again later.');
  }
}

async function initCompetition(): Promise<void> {
  const root = select<HTMLElement>('[data-showcase-status]');
  if (!root) return;
  try {
    const value = await get('competition_editions');
    if (!isRecord(value) || value.published === false) return;
    selectAll<HTMLElement>('[data-showcase-title]').forEach((node) => { node.textContent = text(value, 'title'); });
    selectAll<HTMLElement>('[data-showcase-copy]').forEach((node) => { node.textContent = text(value, 'description'); });
    root.textContent = text(value, 'status', 'Idea under evaluation');
  } catch { /* Static copy remains available. */ }
}

async function initOpenRoles(): Promise<void> {
  const field = select<HTMLElement>('[data-open-roles-field]');
  const roleSelect = select<HTMLSelectElement>('[data-open-roles]');
  if (!field || !roleSelect) return;
  try {
    const value = await get('leaders');
    const open = Array.isArray(value) ? value.filter(isRecord).filter((item) => flag(item, 'open_seat') && text(item, 'role')) : [];
    if (!open.length) return;
    roleSelect.insertAdjacentHTML('beforeend', open.map((item) => `<option value="${esc(text(item, 'role'))}">${esc(text(item, 'role'))}</option>`).join(''));
    const reveal = (): void => {
      const wants = selectAll<HTMLInputElement>('input[name="interests"]:checked').some((box) => /leadership|communication/i.test(box.value));
      field.hidden = !wants;
    };
    selectAll<HTMLInputElement>('input[name="interests"]').forEach((box) => box.addEventListener('change', reveal));
    const params = new URLSearchParams(location.search);
    const interest = params.get('interest');
    const interestBox = interest ? selectAll<HTMLInputElement>('input[name="interests"]').find((box) => box.value.toLowerCase() === interest.toLowerCase()) : undefined;
    if (interestBox) interestBox.checked = true;
    reveal();
    const requestedRole = params.get('role');
    const match = requestedRole ? [...roleSelect.options].find((option) => option.value.toLowerCase() === requestedRole.toLowerCase()) : undefined;
    if (match) { roleSelect.value = match.value; field.hidden = false; }
  } catch { /* The form remains usable without a role preference. */ }
}

export async function initPages(applyFilters: ApplyFilters): Promise<void> {
  await Promise.all([
    renderList('[data-project-grid]', 'projects', projectCard, applyFilters, { emptyTitle: 'No projects selected', emptyCopy: 'Members will choose the first projects after reviewing proposals and available resources.' }),
    renderList('[data-featured-projects]', 'projects', projectCard, applyFilters, { limit: 3 }),
    renderList('[data-event-grid]', 'events', eventCard, applyFilters, { emptyTitle: 'Nothing scheduled yet', emptyCopy: 'Confirmed dates, rooms, and registration links will appear here.' }),
    renderList('[data-home-events]', 'events', eventCard, applyFilters, { limit: 2, emptyTitle: 'No events announced yet', emptyCopy: 'Dates and rooms will appear here after they are confirmed.' }),
    renderList('[data-resource-grid]', 'resources', resourceCard, applyFilters, { emptyTitle: 'No resources available', emptyCopy: 'The resource list could not be prepared.' }),
    renderList('[data-opportunity-grid]', 'opportunities', opportunityCard, applyFilters),
    renderList('[data-leader-grid]', 'leaders', leaderCard, applyFilters),
    renderList('[data-home-leaders]', 'leaders', leaderCard, applyFilters, { filter: (item) => !flag(item, 'open_seat') && text(item, 'name') !== 'Open position', limit: 2, emptyTitle: 'The founding team is forming', emptyCopy: 'Officer records appear here once roles are confirmed.' }),
    renderList('[data-partner-grid]', 'partner_schools', partnerCard, applyFilters),
    renderList('[data-news-grid]', 'news_posts', newsCard, applyFilters, { limit: 6, emptyTitle: 'No updates published yet', emptyCopy: 'Completed actions and confirmed announcements will appear here.' }),
  ]);
  await Promise.all([initOpenRoles(), initImpact(), initCompetition()]);
  initResourceSearch(applyFilters);
}
