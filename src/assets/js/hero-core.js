(function () {
  'use strict';
  var core = document.querySelector('[data-hero-core]');
  if (!core || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  core.addEventListener('pointermove', function (event) {
    var rect = core.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width - .5) * 2;
    var y = ((event.clientY - rect.top) / rect.height - .5) * 2;
    core.style.setProperty('--pointer-x', x.toFixed(3));
    core.style.setProperty('--pointer-y', y.toFixed(3));
  });
  core.addEventListener('pointerleave', function () {
    core.style.setProperty('--pointer-x', '0');
    core.style.setProperty('--pointer-y', '0');
  });
})();
