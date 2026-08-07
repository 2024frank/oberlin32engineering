/* Motion layer (anime.js v4).
 *
 * Deliberately few moments. The site's problem was never too little movement,
 * it was decoration standing in for meaning, so the rule here is that an
 * animation has to say something:
 *
 * There is deliberately no generic scroll-reveal: it is the pattern that reads
 * as generated, and an animation that fails to complete leaves real content
 * invisible. Three moments only:
 *
 *   1. The 3-2 bar performs the idea. Three years fill at Oberlin, a beat,
 *      then two years outline at the partner school. It is the one moment
 *      that earns real choreography because it explains the programme.
 *   2. The hero lines arrive in reading order.
 *   3. The facts count to their value.
 *
 * Everything is progressive: with JS off, anime.js missing, or reduced motion
 * requested, the page is already in its finished state and nothing is hidden.
 */
(function () {
  'use strict';

  var anime = window.anime;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!anime || !anime.animate || reduced) return;

  var animate = anime.animate;
  var stagger = anime.stagger;
  var onScroll = anime.onScroll;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---- 1. the 3-2 bar ------------------------------------------------- */
  function ratioBar() {
    var units = $$('.ratio-bar .ratio-unit');
    if (units.length !== 5) return;

    var oberlin = units.slice(0, 3);
    var partner = units.slice(3);

    anime.utils.set(units, { scaleX: 0, opacity: 0 });
    anime.utils.set(units, { transformOrigin: 'left center' });

    animate(oberlin, {
      scaleX: [0, 1],
      opacity: [0, 1],
      duration: 460,
      delay: stagger(110, { start: 180 }),
      ease: 'out(3)'
    });

    // the beat between "three years here" and "two years there"
    animate(partner, {
      scaleX: [0, 1],
      opacity: [0, 1],
      duration: 460,
      delay: stagger(110, { start: 900 }),
      ease: 'out(3)'
    });
  }

  /* ---- 2. hero lines --------------------------------------------------- */
  function heroLines() {
    var h1 = $('.hero-copy h1');
    if (!h1) return;

    // split on the authored <br> so each line animates as one unit
    var html = h1.innerHTML;
    if (html.indexOf('<br>') === -1) return;
    h1.innerHTML = html
      .split(/<br\s*\/?>/i)
      .map(function (line) { return '<span class="line">' + line + '</span>'; })
      .join('');

    var lines = $$('.line', h1);
    anime.utils.set(lines, { display: 'block' });
    animate(lines, {
      opacity: [0, 1],
      y: [14, 0],
      duration: 620,
      delay: stagger(90),
      ease: 'out(3)'
    });

    var support = [$('.hero-kicker'), $('.hero-lede'), $('.hero-actions')].filter(Boolean);
    animate(support, {
      opacity: [0, 1],
      y: [10, 0],
      duration: 540,
      delay: stagger(80, { start: 240 }),
      ease: 'out(3)'
    });
  }

  /* ---- 3. counters ----------------------------------------------------- */
  function counters() {
    var targets = $$('[data-count]');
    if (!targets.length) return;

    targets.forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      if (isNaN(end)) return;
      var state = { n: 0 };
      var run = function () {
        animate(state, {
          n: end,
          duration: 900,
          ease: 'out(3)',
          modifier: anime.utils.round(0),
          onUpdate: function () { el.textContent = String(Math.round(state.n)); },
          onComplete: function () { el.textContent = String(end); }
        });
      };
      observeOnce(el, run);
    });
  }

  /* fire a callback the first time an element is reached, then forget it */
  function observeOnce(el, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        fn();
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    io.observe(el);
  }

  function start() {
    try {
      ratioBar();
      heroLines();
      counters();
    } catch (err) {
      /* motion is decoration: never let it take the page down */
      if (window.console && console.warn) console.warn('motion disabled:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
