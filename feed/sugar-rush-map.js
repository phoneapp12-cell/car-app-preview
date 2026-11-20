/* Sugar Rush map helpers – car icon and travel accents.
   Loaded by the main sugar-rush.js so map changes stay small and safe. */
(function () {
  'use strict';
  function carAt(x, y, deg) {
    return '<g class="sr-car" transform="translate(' + x + ' ' + y + ') rotate(' + deg + ')"><rect x="-12" y="-6" width="24" height="12" rx="3" fill="#ff6b6b" stroke="#fff" stroke-width="1.2"/><circle cx="-7" cy="6" r="3.5" fill="#333"/><circle cx="7" cy="6" r="3.5" fill="#333"/><rect x="-8" y="-8" width="16" height="6" rx="2" fill="#ffd93d"/></g>';
  }
  // Expose for the main game if needed
  if (typeof window !== 'undefined') {
    window.SugarRushMap = { carAt: carAt };
  }
})();
