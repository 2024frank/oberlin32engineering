(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function toast(message, type = 'success') {
    const region = $('[data-toast-region]');
    if (!region) return;
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = message;
    region.append(node);
    window.setTimeout(() => node.remove(), 5200);
  }

  function initNavigation() {
    const header = $('[data-header]');
    const toggle = $('[data-menu-toggle]');
    const menu = $('[data-mobile-menu]');
    const current = document.body.dataset.page;
    $$(`[data-nav="${current}"]`).forEach((link) => link.classList.add('active'));

    if (!toggle || !menu) return;
    const syncMenuTop = () => {
      const bottom = header ? header.getBoundingClientRect().bottom : 0;
      menu.style.setProperty('--menu-top', `${Math.max(0, Math.round(bottom))}px`);
    };
    const close = () => {
      toggle.setAttribute('aria-expanded', 'false');
      const label = $('.sr-only', toggle);
      if (label) label.textContent = 'Open navigation';
      menu.hidden = true;
      document.body.classList.remove('menu-open');
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      if (open) return close();
      syncMenuTop();
      toggle.setAttribute('aria-expanded', 'true');
      const label = $('.sr-only', toggle);
      if (label) label.textContent = 'Close navigation';
      menu.hidden = false;
      document.body.classList.add('menu-open');
    });
    $$('a', menu).forEach((link) => link.addEventListener('click', close));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 960) close();
      else if (!menu.hidden) syncMenuTop();
    }, { passive: true });
  }

  async function applySiteSettings() {
    try {
      const site = await window.O32Data.get('site_settings');
      if (!site || Array.isArray(site)) return;
      $$('[data-instagram-link]').forEach((link) => { if (site.instagram_url) link.href = site.instagram_url; });
      $$('[data-email-link]').forEach((link) => { if (site.contact_email) link.href = `mailto:${site.contact_email}`; });
      $$('[data-contact-email]').forEach((node) => { if (site.contact_email) node.textContent = site.contact_email; });
      const announcement = $('[data-site-announcement]');
      const announcementLink = $('[data-announcement-link]');
      if (announcement && site.announcement) announcement.textContent = site.announcement;
      if (announcementLink && site.announcement_link) announcementLink.href = site.announcement_link;
    } catch (error) {
      console.warn('[O32] Site settings unavailable:', error.message);
    }
  }

  function initForms() {
    $$('form[data-o32-form]').forEach((form) => {
      const started = document.createElement('input');
      started.type = 'hidden';
      started.name = 'started_at';
      started.value = String(Date.now());
      form.append(started);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const button = $('button[type="submit"]', form);
        const status = $('[data-form-status]', form);
        const components = window.O32Components;
        components?.setBusy(button, true, 'Sending…');
        if (status) { status.textContent = ''; status.className = 'form-status'; }
        try {
          const result = await window.O32Data.submit(form.dataset.formType || 'contact', new FormData(form));
          const message = result.message || 'Thanks. Your response has been received.';
          if (status) { status.textContent = message; status.classList.add('success'); }
          toast(message, 'success');
          form.reset();
          started.value = String(Date.now());
        } catch (error) {
          if (status) { status.textContent = error.message; status.classList.add('error'); }
          toast(error.message, 'error');
        } finally {
          components?.setBusy(button, false);
        }
      });
    });
  }

  function applyFilters(target) {
    if (!target) return;
    const filter = String(target.dataset.activeFilter || 'all').toLowerCase();
    const normalizeSearch = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
    const query = normalizeSearch(target.dataset.searchQuery || '');
    $$('[data-filter-value]', target).forEach((card) => {
      const values = String(card.dataset.filterValue || '').toLowerCase().split('|');
      const matchesFilter = filter === 'all' || values.includes(filter);
      const haystack = normalizeSearch(card.dataset.search || card.textContent || '');
      const matchesSearch = !query || haystack.includes(query);
      card.hidden = !(matchesFilter && matchesSearch);
    });
  }

  function initFilters() {
    $$('[data-filter-group]').forEach((group) => {
      const targetSelector = group.dataset.filterTarget;
      const target = targetSelector ? $(targetSelector) : null;
      if (!target) return;
      target.dataset.activeFilter = $('[data-filter].active', group)?.dataset.filter || 'all';
      $$('[data-filter]', group).forEach((button) => button.addEventListener('click', () => {
        $$('[data-filter]', group).forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        target.dataset.activeFilter = button.dataset.filter || 'all';
        applyFilters(target);
      }));

      /* A category list is a claim that those categories exist. With an empty
       * grid it advertises a body of work that is not there, so it stays hidden
       * until the grid actually has something to filter. The grids are filled
       * asynchronously, hence the observer rather than a one-time check. */
      const syncVisibility = () => {
        group.hidden = !target.querySelector('[data-filter-value]');
      };
      syncVisibility();
      new MutationObserver(syncVisibility).observe(target, { childList: true });
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        console.warn('[O32] Offline support could not start:', error.message);
      });
    }, { once: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    $$('[data-current-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });
    initNavigation();
    initForms();
    initFilters();
    applySiteSettings();
    registerServiceWorker();
  });

  window.O32Site = { toast, applyFilters };
})();
