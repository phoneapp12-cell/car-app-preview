/* Sugar Rush map extras. Small file so the big game file stays untouched.
   Car while travelling inside one country, plane between countries,
   and a small landmark on each country. */
(function () {
  'use strict';
  var LANDMARKS = {
    'new zealand': '🥝',
    'cook islands': '🌺',
    tonga: '🥥',
    samoa: '🌴',
    australia: '🦘',
    'papua new guinea': '🐦',
    'solomon islands': '🐚',
    vanuatu: '🌋',
    fiji: '🌊',
    'new caledonia': '🐠',
    indonesia: '🛕',
    vietnam: '🛶',
    malaysia: '🦋',
    thailand: '🐘',
    myanmar: '🏯',
    india: '🪷',
    nepal: '🏔️',
    bangladesh: '🛺',
    'sri lanka': '🐘',
    singapore: '🌆',
    cambodia: '🛕',
    philippines: '⛵',
    laos: '🌿',
    bhutan: '🏔️',
    pakistan: '🏔️',
    afghanistan: '🧿',
    iran: '🌷',
    uzbekistan: '🕌',
    kazakhstan: '🐎',
    china: '🐉',
    japan: '🗻',
    'south korea': '🎌',
    korea: '🎌',
    taiwan: '🧋'
  };

  function injectStyle() {
    if (document.getElementById('sr-map-extra-style')) return;
    var css = document.createElement('style');
    css.id = 'sr-map-extra-style';
    css.textContent = '.stops .lv .sr-land{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:16px;line-height:1;pointer-events:none;filter:drop-shadow(0 1px 0 #fff);z-index:2}' +
      '.stops .lv.here .sr-land{font-size:20px;top:-20px}';
    document.head.appendChild(css);
  }

  function landmark(country) {
    var key = String(country || '').trim().toLowerCase();
    return LANDMARKS[key] || '';
  }

  function decorateStops() {
    var seen = {};
    var pins = document.querySelectorAll('.stops .lv[data-country]');
    pins.forEach(function (pin) {
      var country = pin.dataset.country || '';
      var key = country.toLowerCase();
      var icon = landmark(country);
      if (!icon) return;
      var prefer = pin.classList.contains('country-stop') || pin.classList.contains('here');
      if (seen[key] && !prefer) return;
      if (seen[key] && prefer) {
        var old = document.querySelector('.stops .lv[data-country="' + country.replace(/"/g, '') + '"] .sr-land');
        if (old && old.parentNode !== pin) old.remove();
      }
      seen[key] = true;
      if (pin.querySelector('.sr-land')) return;
      var badge = document.createElement('span');
      badge.className = 'sr-land';
      badge.textContent = icon;
      badge.title = country;
      pin.appendChild(badge);
    });
  }

  function svgNode(markup) {
    var doc = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>', 'image/svg+xml');
    return doc.documentElement.firstElementChild;
  }

  function carBits() {
    return '<rect class="sr-car-bit" x="-13" y="-6" width="26" height="12" rx="3.2" fill="#ff5a6a" stroke="#fff" stroke-width="1.3"/>' +
      '<rect class="sr-car-bit" x="-8" y="-11" width="15" height="7" rx="2" fill="#ffe9a0" stroke="#fff" stroke-width="1"/>' +
      '<circle class="sr-car-bit" cx="-7" cy="7" r="3.1" fill="#243044"/>' +
      '<circle class="sr-car-bit" cx="7" cy="7" r="3.1" fill="#243044"/>';
  }

  function rememberPlane(plane) {
    if (plane.dataset.planePath) return;
    var path = plane.querySelector('path');
    if (path) plane.dataset.planePath = path.outerHTML;
  }

  function setMode(plane, car) {
    rememberPlane(plane);
    var bits = plane.querySelectorAll('.sr-car-bit');
    var path = plane.querySelector('path');
    if (car) {
      if (path) path.setAttribute('display', 'none');
      if (!bits.length) {
        var holder = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        var wrapped = svgNode('<g>' + carBits() + '</g>');
        while (wrapped.firstChild) plane.appendChild(wrapped.firstChild);
      } else {
        bits.forEach(function (bit) { bit.removeAttribute('display'); });
      }
      plane.dataset.mode = 'car';
    } else {
      plane.querySelectorAll('.sr-car-bit').forEach(function (bit) { bit.remove(); });
      if (path) path.removeAttribute('display');
      else if (plane.dataset.planePath) plane.insertAdjacentHTML('beforeend', plane.dataset.planePath);
      plane.dataset.mode = 'plane';
    }
  }

  function sameCountryTrip() {
    var here = document.querySelector('.stops .lv.here');
    if (!here) return false;
    var n = parseInt(here.dataset.n, 10);
    if (!n || n < 2) return false;
    var prev = document.querySelector('.stops .lv[data-n="' + (n - 1) + '"]');
    if (!prev) return false;
    var a = (here.dataset.country || '').trim().toLowerCase();
    var b = (prev.dataset.country || '').trim().toLowerCase();
    return !!(a && b && a === b);
  }

  function syncTravel() {
    var plane = document.getElementById('sr-travel-plane');
    if (!plane) return;
    var shown = plane.getAttribute('display') !== 'none';
    if (!shown) {
      if (plane.dataset.mode === 'car') setMode(plane, false);
      return;
    }
    setMode(plane, sameCountryTrip());
  }

  function tick() {
    injectStyle();
    decorateStops();
    syncTravel();
  }

  var obs = new MutationObserver(tick);
  function arm() {
    var root = document.getElementById('map') || document.body;
    if (!root) return;
    obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['display', 'class', 'transform'] });
    tick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm);
  else arm();
  setInterval(tick, 700);
})();
