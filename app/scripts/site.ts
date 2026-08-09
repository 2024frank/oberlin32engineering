import { get, submit } from './data';
import { isRecord } from './types';
import { setBusy, toast } from './ui';
import { initPages } from './pages';

const select = <T extends Element>(selector: string, root: ParentNode = document): T | null => root.querySelector<T>(selector);
const selectAll = <T extends Element>(selector: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(selector)];

function initNavigation(): void {
  const header = select<HTMLElement>('[data-header]');
  const toggle = select<HTMLButtonElement>('[data-menu-toggle]');
  const menu = select<HTMLElement>('[data-mobile-menu]');
  if (!toggle || !menu) return;
  const pageRegions = selectAll<HTMLElement>('main, .site-footer');
  const setPageInert = (value: boolean): void => pageRegions.forEach((region) => { region.inert = value; });
  const syncMenuTop = (): void => {
    const bottom = header?.getBoundingClientRect().bottom ?? 0;
    menu.style.setProperty('--menu-top', `${Math.max(0, Math.round(bottom))}px`);
  };
  const close = (restoreFocus = false): void => {
    toggle.setAttribute('aria-expanded', 'false');
    const label = select<HTMLElement>('.sr-only', toggle);
    if (label) label.textContent = 'Open navigation';
    menu.hidden = true;
    document.body.classList.remove('menu-open');
    setPageInert(false);
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') { close(true); return; }
    syncMenuTop();
    toggle.setAttribute('aria-expanded', 'true');
    const label = select<HTMLElement>('.sr-only', toggle);
    if (label) label.textContent = 'Close navigation';
    menu.hidden = false;
    document.body.classList.add('menu-open');
    setPageInert(true);
    select<HTMLAnchorElement>('a', menu)?.focus();
  });
  selectAll<HTMLAnchorElement>('a', menu).forEach((link) => link.addEventListener('click', () => close()));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !menu.hidden) close(true); });
  window.addEventListener('resize', () => { if (window.innerWidth > 960) close(); else if (!menu.hidden) syncMenuTop(); }, { passive: true });
}

async function applySiteSettings(): Promise<void> {
  try {
    const value = await get('site_settings');
    if (!isRecord(value)) return;
    const instagram = typeof value.instagram_url === 'string' ? value.instagram_url : '';
    const email = typeof value.contact_email === 'string' ? value.contact_email : '';
    selectAll<HTMLAnchorElement>('[data-instagram-link]').forEach((link) => { if (instagram) link.href = instagram; });
    selectAll<HTMLAnchorElement>('[data-email-link]').forEach((link) => { if (email) link.href = `mailto:${email}`; });
    selectAll<HTMLElement>('[data-contact-email]').forEach((node) => { if (email) node.textContent = email; });
    const announcement = select<HTMLElement>('[data-site-announcement]');
    const announcementLink = select<HTMLAnchorElement>('[data-announcement-link]');
    if (announcement && typeof value.announcement === 'string') announcement.textContent = value.announcement;
    if (announcementLink && typeof value.announcement_link === 'string') announcementLink.href = value.announcement_link;
  } catch (error) {
    console.warn('[O32] Site settings unavailable.', error);
  }
}

function initForms(): void {
  selectAll<HTMLFormElement>('form[data-o32-form]').forEach((form) => {
    const started = document.createElement('input');
    started.type = 'hidden';
    started.name = 'started_at';
    started.value = String(Date.now());
    form.append(started);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = select<HTMLButtonElement>('button[type="submit"]', form);
      const status = select<HTMLElement>('[data-form-status]', form);
      setBusy(button, true);
      if (status) { status.textContent = ''; status.className = 'form-status'; }
      try {
        const result = await submit(form.dataset.formType ?? 'contact', new FormData(form));
        const message = typeof result.message === 'string' ? result.message : 'Thanks. Your response has been received.';
        if (status) { status.textContent = message; status.classList.add('success'); }
        toast(message);
        form.reset();
        started.value = String(Date.now());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Your message could not be sent. Please try again.';
        if (status) { status.textContent = message; status.classList.add('error'); }
        toast(message, 'error');
      } finally {
        setBusy(button, false);
      }
    });
  });
}

export function applyFilters(target: HTMLElement | null): void {
  if (!target) return;
  const filter = (target.dataset.activeFilter ?? 'all').toLowerCase();
  const normalize = (value: string): string => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
  const query = normalize(target.dataset.searchQuery ?? '');
  selectAll<HTMLElement>('[data-filter-value]', target).forEach((card) => {
    const values = (card.dataset.filterValue ?? '').toLowerCase().split('|');
    const haystack = normalize(card.dataset.search ?? card.textContent ?? '');
    card.hidden = !((filter === 'all' || values.includes(filter)) && (!query || haystack.includes(query)));
  });
}

function initFilters(): void {
  selectAll<HTMLElement>('[data-filter-group]').forEach((group) => {
    const targetSelector = group.dataset.filterTarget;
    const target = targetSelector ? select<HTMLElement>(targetSelector) : null;
    if (!target) return;
    target.dataset.activeFilter = select<HTMLElement>('[data-filter].active', group)?.dataset.filter ?? 'all';
    selectAll<HTMLButtonElement>('[data-filter]', group).forEach((button) => button.addEventListener('click', () => {
      selectAll<HTMLElement>('[data-filter]', group).forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      target.dataset.activeFilter = button.dataset.filter ?? 'all';
      applyFilters(target);
    }));
    const syncVisibility = (): void => { group.hidden = !target.querySelector('[data-filter-value]'); };
    syncVisibility();
    new MutationObserver(syncVisibility).observe(target, { childList: true });
  });
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch((error: unknown) => console.warn('[O32] Offline support could not start.', error)), { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  selectAll<HTMLElement>('[data-current-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });
  initNavigation();
  initForms();
  initFilters();
  void applySiteSettings();
  void initPages(applyFilters);
  registerServiceWorker();
});
