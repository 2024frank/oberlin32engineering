(() => {
  'use strict';

  const documentElement = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  // Footer year.
  $$('[data-current-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  // Sticky header and page progress.
  const header = $('[data-site-header]');
  const progress = $('[data-scroll-progress]');
  let scrollTicking = false;

  const updateScrollUI = () => {
    const y = window.scrollY || documentElement.scrollTop;
    header?.classList.toggle('scrolled', y > 16);

    if (progress) {
      const max = Math.max(1, documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, y / max))})`;
    }
    scrollTicking = false;
  };

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  }, { passive: true });
  updateScrollUI();

  // Mobile navigation with focus management.
  const menu = $('[data-mobile-menu]');
  const menuOpen = $('[data-menu-open]');
  const menuClose = $('[data-menu-close]');
  let lastFocusedElement = null;

  const focusableMenuItems = () => menu
    ? $$('a[href], button:not([disabled])', menu).filter((element) => !element.hasAttribute('hidden'))
    : [];

  const openMenu = () => {
    if (!menu || !menuOpen) return;
    lastFocusedElement = document.activeElement;
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    menuOpen.setAttribute('aria-expanded', 'true');
    body.classList.add('menu-open');
    window.setTimeout(() => menuClose?.focus(), 30);
  };

  const closeMenu = ({ restoreFocus = true } = {}) => {
    if (!menu || !menuOpen) return;
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    menuOpen.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-open');
    if (restoreFocus && lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  };

  menuOpen?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', () => closeMenu());
  $$('.mobile-nav a', menu || document).forEach((link) => {
    link.addEventListener('click', () => closeMenu({ restoreFocus: false }));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.classList.contains('open')) closeMenu();
    if (event.key !== 'Tab' || !menu?.classList.contains('open')) return;

    const items = focusableMenuItems();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900 && menu?.classList.contains('open')) {
      closeMenu({ restoreFocus: false });
    }
  }, { passive: true });

  // Reveal-on-scroll. Content stays visible when JavaScript is disabled.
  const reveals = $$('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((element) => element.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.09, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((element) => revealObserver.observe(element));
  }

  // FAQ accordion.
  $$('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
      const nextValue = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(nextValue));
    });
  });

  // Project filters.
  const projectButtons = $$('[data-project-filter]');
  const projectCards = $$('[data-project-card]');
  const projectEmpty = $('[data-project-empty]');

  const filterProjects = (filter) => {
    let visible = 0;
    projectCards.forEach((card) => {
      const categories = (card.dataset.category || '').toLowerCase().split(/\s+/).filter(Boolean);
      const show = filter === 'all' || categories.includes(filter);
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (projectEmpty) projectEmpty.hidden = visible > 0;
  };

  projectButtons.forEach((button) => {
    button.addEventListener('click', () => {
      projectButtons.forEach((candidate) => candidate.classList.toggle('active', candidate === button));
      filterProjects((button.dataset.projectFilter || 'all').toLowerCase());
    });
  });

  // Resource search and filters.
  const resourceInput = $('[data-resource-search]');
  const resourceButtons = $$('[data-resource-filter]');
  const resourceCards = $$('[data-resource-card]');
  const resourceEmpty = $('[data-resource-empty]');
  let activeResourceGroup = 'all';

  const normalize = (value) => String(value || '').toLowerCase().trim();
  const filterResources = () => {
    const query = normalize(resourceInput?.value);
    let visible = 0;
    resourceCards.forEach((card) => {
      const groupMatches = activeResourceGroup === 'all' || normalize(card.dataset.group) === activeResourceGroup;
      const queryMatches = !query || normalize(card.dataset.search).includes(query);
      const show = groupMatches && queryMatches;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (resourceEmpty) resourceEmpty.hidden = visible > 0;
  };

  resourceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeResourceGroup = normalize(button.dataset.resourceFilter) || 'all';
      resourceButtons.forEach((candidate) => candidate.classList.toggle('active', candidate === button));
      filterResources();
    });
  });
  resourceInput?.addEventListener('input', filterResources);

  // Count-up animation for the 3 + 2 pathway.
  const counters = $$('[data-counter]');
  const animateCounter = (node) => {
    const target = Number(node.dataset.counter || node.textContent || 0);
    if (!Number.isFinite(target)) return;
    if (prefersReducedMotion) {
      node.textContent = String(target);
      return;
    }
    const start = performance.now();
    const duration = 750;
    const frame = (now) => {
      const progressValue = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progressValue, 3);
      node.textContent = String(Math.max(0, Math.round(target * eased)));
      if (progressValue < 1) window.requestAnimationFrame(frame);
    };
    node.textContent = '0';
    window.requestAnimationFrame(frame);
  };

  if (counters.length) {
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.55 });
      counters.forEach((counter) => counterObserver.observe(counter));
    } else {
      counters.forEach(animateCounter);
    }
  }

  // Subtle 3D response on the hero system and project cards.
  if (finePointer && !prefersReducedMotion) {
    $$('[data-tilt-root], .tilt-card').forEach((element) => {
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
        const y = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
        const strength = element.matches('[data-tilt-root]') ? 4 : 2.4;
        element.style.transform = `perspective(1100px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg)`;
      });
      element.addEventListener('pointerleave', () => {
        element.style.transform = '';
      });
    });
  }

  // Rotating engineering-system status line.
  const statusReadout = $('[data-signal-readout]');
  if (statusReadout && !prefersReducedMotion) {
    const messages = [
      'CONNECT / PREPARE / BUILD',
      'PEOPLE / RESOURCES / PROJECTS',
      'LIBERAL ARTS / ENGINEERING',
      'IDEAS / TEAMS / PROTOTYPES'
    ];
    let index = 0;
    window.setInterval(() => {
      index = (index + 1) % messages.length;
      statusReadout.animate(
        [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-4px)' }],
        { duration: 170, fill: 'forwards' }
      ).finished.then(() => {
        statusReadout.textContent = messages[index];
        statusReadout.animate(
          [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 220, fill: 'forwards' }
        );
      }).catch(() => {});
    }, 3600);
  }

  // Lightweight engineering network canvas. Each canvas is isolated so pages can reuse it.
  const createEngineeringField = (canvas) => {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const density = canvas.dataset.density === 'low' ? 0.000035 : 0.000055;
    const pointer = { x: -1000, y: -1000, active: false };
    let width = 0;
    let height = 0;
    let ratio = 1;
    let nodes = [];
    let frameId = 0;
    let running = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.max(18, Math.min(80, Math.round(width * height * density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: 0.7 + Math.random() * 1.1,
        gold: Math.random() > 0.72
      }));
      if (prefersReducedMotion) draw();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const linkDistance = Math.min(145, Math.max(95, width * 0.115));
      const linkDistanceSquared = linkDistance * linkDistance;

      nodes.forEach((node, index) => {
        if (!prefersReducedMotion) {
          if (pointer.active) {
            const dx = node.x - pointer.x;
            const dy = node.y - pointer.y;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared > 1 && distanceSquared < 22000) {
              const force = (1 - distanceSquared / 22000) * 0.009;
              const distance = Math.sqrt(distanceSquared);
              node.vx += (dx / distance) * force;
              node.vy += (dy / distance) * force;
            }
          }
          node.vx *= 0.998;
          node.vy *= 0.998;
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < -10) node.x = width + 10;
          if (node.x > width + 10) node.x = -10;
          if (node.y < -10) node.y = height + 10;
          if (node.y > height + 10) node.y = -10;
        }

        for (let nextIndex = index + 1; nextIndex < nodes.length; nextIndex += 1) {
          const next = nodes[nextIndex];
          const dx = node.x - next.x;
          const dy = node.y - next.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared > linkDistanceSquared) continue;
          const opacity = (1 - distanceSquared / linkDistanceSquared) * 0.16;
          context.beginPath();
          context.moveTo(node.x, node.y);
          context.lineTo(next.x, next.y);
          context.strokeStyle = `rgba(255,255,255,${opacity})`;
          context.lineWidth = 0.7;
          context.stroke();
        }

        context.beginPath();
        context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        context.fillStyle = node.gold ? 'rgba(235,176,44,.75)' : 'rgba(255,255,255,.52)';
        context.fill();
      });
    };

    const loop = () => {
      if (!running) return;
      draw();
      frameId = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || prefersReducedMotion) return;
      running = true;
      frameId = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frameId);
    };

    canvas.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    }, { passive: true });
    canvas.addEventListener('pointerleave', () => { pointer.active = false; });

    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    window.addEventListener('resize', resize, { passive: true });
    resize();

    if ('IntersectionObserver' in window) {
      const visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.isIntersecting ? start() : stop());
      }, { rootMargin: '150px 0px' });
      visibilityObserver.observe(canvas);
    } else {
      start();
    }
  };

  $$('canvas[data-engineering-field]').forEach(createEngineeringField);
})();
