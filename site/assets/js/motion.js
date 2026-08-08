/* Motion: one moment, and it has a job.
 *
 * The 3-2 bar draws in sequence. Three years fill at Oberlin, a beat, then two
 * outline at the partner school. The animation performs the idea the page is
 * about, which is the only reason it earns the bandwidth. There is no
 * scroll-reveal on anything else: scattered fades are the pattern that reads as
 * template-like, and an animation that fails to finish leaves real content invisible.
 *
 * Progressive by construction. With JS off, anime.js missing, or reduced motion
 * requested, the bar is already in its finished state.
 */
(function () {
  'use strict';

  var anime = window.anime;
  if (!anime || !anime.createTimeline) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var units = Array.prototype.slice.call(document.querySelectorAll('.ratio__unit'));
  if (units.length !== 5) return;

  anime.utils.set(units, { transformOrigin: 'left center', scaleX: 0, opacity: 0 });

  anime.createTimeline({ defaults: { duration: 440, ease: 'out(3)' } })
    .add(units.slice(0, 3), { scaleX: [0, 1], opacity: [0, 1], delay: anime.stagger(100) }, 200)
    .add(units.slice(3),    { scaleX: [0, 1], opacity: [0, 1], delay: anime.stagger(100) }, '+=220');

  /* Whatever happens, nothing stays invisible. */
  setTimeout(function () {
    units.forEach(function (el) {
      if (parseFloat(getComputedStyle(el).opacity) < 0.9) {
        el.style.opacity = '';
        el.style.transform = '';
      }
    });
  }, 2600);
})();
