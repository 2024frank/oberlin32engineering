(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function initials(name = '') {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'O32';
  }

  function formatDate(value) {
    if (!value) return '';
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }

  function showToast(message, type = 'success') {
    const region = $('[data-toast-region]');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 4800);
  }

  async function applySiteSettings() {
    try {
      const site = await window.O32Data.get('site_settings');
      if (!site || Array.isArray(site)) return;
      $$('[data-join-link]').forEach((link) => { if (site.join_url) link.href = site.join_url; });
      $$('[data-instagram-link]').forEach((link) => { if (site.instagram_url) link.href = site.instagram_url; });
      $$('[data-email-link]').forEach((link) => { if (site.contact_email) link.href = `mailto:${site.contact_email}`; });
      $$('[data-contact-email]').forEach((node) => { if (site.contact_email) node.textContent = site.contact_email; });
      $$('[data-instagram-handle]').forEach((node) => { if (site.instagram_handle) node.textContent = site.instagram_handle; });
      const announcement = $('[data-site-announcement]');
      const announcementLink = $('[data-announcement-link]');
      if (announcement && site.announcement) announcement.textContent = site.announcement;
      if (announcementLink && site.announcement_link) announcementLink.href = site.announcement_link;
    } catch (error) {
      console.warn('[O32] Site settings unavailable:', error.message);
    }
  }

  function initializeNavigation() {
    const header = $('[data-header]');
    const toggle = $('[data-menu-toggle]');
    const menu = $('[data-mobile-menu]');
    const dropdown = $('.nav-dropdown');
    const moreToggle = $('[data-more-toggle]');
    const page = document.body.dataset.page;

    $$(`[data-nav="${page}"]`).forEach((link) => link.classList.add('active'));

    const syncHeader = () => header?.classList.toggle('scrolled', window.scrollY > 14);
    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });

    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        toggle.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
        menu.hidden = open;
        document.body.classList.toggle('menu-open', !open);
      });
      $$('a', menu).forEach((link) => link.addEventListener('click', () => {
        toggle.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
        document.body.classList.remove('menu-open');
      }));
    }

    if (dropdown && moreToggle) {
      moreToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const open = dropdown.classList.toggle('open');
        moreToggle.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
          dropdown.classList.remove('open');
          moreToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  function initializeProgress() {
    const bar = $('.reading-progress span');
    if (!bar) return;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      bar.style.width = `${ratio * 100}%`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }

  function initializeReveals() {
    const items = $$('.reveal');
    if (!items.length) return;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((item) => observer.observe(item));
  }

  function initializeTilt() {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    $$('[data-tilt]').forEach((root) => {
      const target = $('.machine-shell, .stage-screen', root) || root;
      root.addEventListener('pointermove', (event) => {
        const rect = root.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        target.style.transform = `rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateZ(0)`;
      });
      root.addEventListener('pointerleave', () => { target.style.transform = ''; });
    });

    $$('.magnetic').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .08;
        const y = (event.clientY - rect.top - rect.height / 2) * .12;
        button.style.transform = `translate(${x}px, ${y}px)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  }

  function initializeCounters() {
    const nodes = $$('[data-count]');
    if (!nodes.length || reducedMotion) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        const target = Number(node.dataset.count || 0);
        const start = performance.now();
        const duration = 900;
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / duration);
          node.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.unobserve(node);
      });
    }, { threshold: .6 });
    nodes.forEach((node) => observer.observe(node));
  }

  function initializeCanvas() {
    const canvas = $('[data-engineering-canvas]');
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let raf = 0;
    let last = 0;
    const pointer = { x: -9999, y: -9999, active: false };

    function makeNode() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .12,
        vy: (Math.random() - .5) * .12,
        r: Math.random() * 1.2 + .55,
        gold: Math.random() > .76
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(74, Math.max(28, Math.floor((width * height) / 26000)));
      nodes = Array.from({ length: count }, makeNode);
    }

    function draw(timestamp) {
      if (timestamp - last < 28) { raf = requestAnimationFrame(draw); return; }
      last = timestamp;
      ctx.clearRect(0, 0, width, height);
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;
        if (pointer.active) {
          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 150 && distance > 0) {
            node.x += (dx / distance) * .15;
            node.y += (dy / distance) * .15;
          }
        }
      }
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 125) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(240,180,41,${(1 - distance / 125) * .11})`;
            ctx.lineWidth = .7;
            ctx.stroke();
          }
        }
      }
      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = node.gold ? 'rgba(240,180,41,.45)' : 'rgba(255,255,255,.19)';
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', (event) => { pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true; }, { passive: true });
    document.addEventListener('mouseleave', () => { pointer.active = false; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(draw);
    });
  }

  async function initializeSearch() {
    const dialog = $('[data-search-dialog]');
    const input = $('[data-global-search]');
    const results = $('[data-search-results]');
    if (!dialog || !input || !results) return;

    let index = null;
    const staticItems = [
      { type: 'Page', title: 'About the Society', description: 'Mission, operating model, values, and continuity.', url: 'about.html' },
      { type: 'Page', title: '3-2 Pathway', description: 'Five-year planning workspace, partner institutions, and advising questions.', url: 'pathway.html' },
      { type: 'Page', title: 'Oberlin Engineering Challenge', description: 'Future challenge concept, possible tracks, review standards, and updates.', url: 'competition.html' },
      { type: 'Page', title: 'Leadership and Governance', description: 'Organizing team, open roles, and leadership archive.', url: 'leadership.html' },
      { type: 'Page', title: 'Impact and Archive', description: 'Milestones, annual reports, public outcomes, and organizational memory.', url: 'impact.html' },
      { type: 'Page', title: 'Media Kit', description: 'Logos, brand colors, organization boilerplate, and media contact.', url: 'media.html' },
      { type: 'Page', title: 'Join the Society', description: 'Membership, projects, leadership, mentors, and partners.', url: 'join.html' }
    ];

    async function buildIndex() {
      if (index) return index;
      const [projects, leaders, events, resources, opportunities, news, projectUpdates] = await Promise.all([
        window.O32Data.get('projects'), window.O32Data.get('leaders'), window.O32Data.get('events'),
        window.O32Data.get('resources'), window.O32Data.get('opportunities'), window.O32Data.get('news_posts'),
        window.O32Data.get('project_updates')
      ]);
      index = [
        ...staticItems,
        ...(projects || []).map((item) => ({ type: 'Project', title: item.title, description: item.summary, url: `projects.html?project=${encodeURIComponent(item.slug)}` })),
        ...(leaders || []).filter((item) => !item.open_seat).map((item) => ({ type: 'Leadership', title: item.name, description: item.role, url: 'leadership.html' })),
        ...(events || []).map((item) => ({ type: 'Event', title: item.title, description: item.summary, url: 'events.html' })),
        ...(resources || []).map((item) => ({ type: 'Resource', title: item.title, description: item.description, url: item.url, external: true })),
        ...(opportunities || []).map((item) => ({ type: 'Opportunity', title: item.title, description: item.description, url: item.url })),
        ...(news || []).map((item) => ({ type: 'News', title: item.title, description: item.excerpt, url: 'events.html#news' })),
        ...(projectUpdates || []).map((item) => ({ type: 'Build log', title: item.title, description: item.summary || item.body, url: `projects.html?project=${encodeURIComponent((projects || []).find((project) => project.id === item.project_id)?.slug || '')}#build-log` }))
      ];
      return index;
    }

    function render(query) {
      const normalized = query.trim().toLowerCase();
      if (!normalized) {
        results.innerHTML = '<p class="search-hint">Start typing to search the project board, programs, events, resources, and leadership.</p>';
        return;
      }
      const matches = (index || []).filter((item) => `${item.title} ${item.description} ${item.type}`.toLowerCase().includes(normalized)).slice(0, 10);
      results.innerHTML = matches.length ? matches.map((item) => `
        <a class="search-result" href="${escapeHTML(item.url)}" ${item.external ? 'target="_blank" rel="noopener"' : ''}>
          <small>${escapeHTML(item.type)}</small><strong>${escapeHTML(item.title)}</strong><span>→</span>
        </a>`).join('') : '<p class="search-hint">No exact match. Try a shorter keyword.</p>';
    }

    $$('[data-search-open]').forEach((button) => button.addEventListener('click', async () => {
      if (dialog.open) return;
      dialog.showModal();
      await buildIndex();
      input.focus();
      render(input.value);
    }));
    $('[data-search-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    input.addEventListener('input', () => render(input.value));
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        $('[data-search-open]')?.click();
      }
      if (event.key === 'Escape' && dialog.open) dialog.close();
    });
  }

  function initializeForms() {
    $$('[data-submission-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = $('button[type="submit"]', form);
        const status = $('[data-form-status]', form);
        const original = button?.innerHTML;
        if (button) { button.disabled = true; button.textContent = 'Sending…'; }
        if (status) { status.textContent = ''; status.classList.remove('error'); }
        try {
          const result = await window.O32Data.submit(form.dataset.submissionType || 'general', new FormData(form));
          if (result.via === 'email' && result.mailto) {
            if (status) status.textContent = 'Your email app is opening with the message prepared. Send it to complete your submission.';
            window.location.href = result.mailto;
          } else {
            if (status) status.textContent = 'Received. The society will follow up using the email you provided.';
            form.reset();
            showToast('Submission received. Thank you.', 'success');
          }
        } catch (error) {
          console.error(error);
          if (status) { status.textContent = 'The message could not be sent. Please email the society directly.'; status.classList.add('error'); }
          showToast('Submission failed. Please try again or email the society.', 'error');
        } finally {
          if (button) { button.disabled = false; button.innerHTML = original; }
        }
      });
    });
  }

  function initializeAccordions() {
    $$('[data-accordion]').forEach((accordion) => {
      $$('details', accordion).forEach((detail) => detail.addEventListener('toggle', () => {
        if (!detail.open) return;
        $$('details', accordion).forEach((other) => { if (other !== detail) other.open = false; });
      }));
    });
  }

  function initializeQueryValues() {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get('topic');
    const select = $('[data-topic-select]');
    if (topic && select) select.value = topic;
  }

  function initializePlanner() {
    const root = $('[data-pathway-plan]');
    if (!root) return;
    const inputs = $$('input[type="checkbox"]', root);
    const storageKey = 'o32-pathway-plan-v1';
    const progress = $('[data-planner-progress]');
    const bar = $('[data-planner-bar]');

    function load() {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        inputs.forEach((input) => { input.checked = saved.includes(input.value); });
      } catch (_) { /* private browsing or invalid data */ }
    }

    function update(save = true) {
      const completed = inputs.filter((input) => input.checked).map((input) => input.value);
      if (progress) progress.textContent = `${completed.length} of ${inputs.length} complete`;
      if (bar) bar.style.width = `${inputs.length ? (completed.length / inputs.length) * 100 : 0}%`;
      if (save) {
        try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch (_) { /* storage unavailable */ }
      }
    }

    load();
    update(false);
    inputs.forEach((input) => input.addEventListener('change', () => update(true)));
    $('[data-planner-reset]')?.addEventListener('click', () => {
      inputs.forEach((input) => { input.checked = false; });
      update(true);
      showToast('Your local pathway checklist was reset.');
    });
  }

  function initializeCopyTools() {
    async function copyText(text) {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text.trim());
        showToast('Copied to clipboard.');
      } catch (_) {
        const area = document.createElement('textarea');
        area.value = text.trim();
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        document.execCommand('copy');
        area.remove();
        showToast('Copied to clipboard.');
      }
    }

    $$('[data-copy]').forEach((button) => button.addEventListener('click', () => copyText(button.dataset.copy || '')));
    $$('[data-copy-target]').forEach((button) => button.addEventListener('click', () => {
      const target = $(button.dataset.copyTarget);
      copyText(target?.textContent || '');
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    $$('[data-current-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });
    applySiteSettings();
    initializeNavigation();
    initializeProgress();
    initializeReveals();
    initializeTilt();
    initializeCounters();
    initializeCanvas();
    initializeSearch();
    initializeForms();
    initializeAccordions();
    initializeQueryValues();
    initializePlanner();
    initializeCopyTools();
  });

  window.O32UI = { $, $$, escapeHTML, initials, formatDate, showToast, initializeReveals };
})();
