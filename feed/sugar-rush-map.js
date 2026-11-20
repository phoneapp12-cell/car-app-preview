/* Sugar Rush map extras. Small file so the big game file stays untouched.
   Country medallions, a country card, quieter pins, a clearer path,
   and a car inside a country / plane between countries. */
(function () {
  'use strict';

  var COUNTRIES = {
    'new zealand': ['🥝', 'kiwi · fern · harbours'],
    'cook islands': ['🌺', 'lagoon · hibiscus · outrigger'],
    tonga: ['🥥', 'coconut · whales · royal'],
    samoa: ['🌴', 'two islands · fale · sunset'],
    australia: ['🦘', 'kangaroo · reef · opera'],
    'papua new guinea': ['🐦', 'bird of paradise · highlands · masks'],
    'solomon islands': ['🐚', 'shells · reefs · canoes'],
    vanuatu: ['🌋', 'volcano · waterfall · kava'],
    fiji: ['🌊', 'reef · palm · bula'],
    'new caledonia': ['🐠', 'lagoon · pine · reef'],
    indonesia: ['🛕', 'temples · rice · islands'],
    vietnam: ['🏮', 'lanterns · river · ao dai'],
    malaysia: ['🦋', 'towers · rainforest · butterfly'],
    thailand: ['🐘', 'temples · elephant · longtail'],
    myanmar: ['🏯', 'pagodas · gold · river'],
    india: ['🪷', 'lotus · tigers · gates'],
    nepal: ['🏔️', 'mountains · flags · temples'],
    bangladesh: ['🛺', 'rivers · rickshaw · tea'],
    'sri lanka': ['🍵', 'tea · elephants · fort'],
    singapore: ['🌆', 'gardens · skyline · merlion'],
    cambodia: ['🛕', 'temples · river · lotus'],
    philippines: ['⛵', 'islands · jeepney · boats'],
    laos: ['🌿', 'river · stupas · mango'],
    bhutan: ['🐉', 'mountains · dzong · dragon'],
    pakistan: ['🏔️', 'mountains · tea · truck art'],
    afghanistan: ['🪁', 'mountains · bazaar · kites'],
    iran: ['🌷', 'roses · tiles · bazaar'],
    uzbekistan: ['🕌', 'blue tiles · silk · mosques'],
    kazakhstan: ['🐎', 'steppe · horses · eagles'],
    china: ['🐉', 'dragon · wall · lanterns'],
    taiwan: ['🧋', 'night markets · tea · bubble tea'],
    japan: ['🗻', 'fuji · torii · cherry'],
    'south korea': ['🎌', 'palace · hanbok · kimchi'],
    korea: ['🎌', 'palace · hanbok · kimchi'],
    palau: ['🪼', 'rock islands · jellyfish lake'],
    'federated states of micronesia': ['🪸', 'reef · ancient city'],
    'marshall islands': ['🛶', 'atolls · canoe · ocean'],
    nauru: ['🌴', 'palm · ocean · island'],
    kiribati: ['🌅', 'sunrise · atolls · canoe']
  };

  function info(country) {
    var key = String(country || '').trim().toLowerCase();
    return COUNTRIES[key] || ['📍', 'a new stop on the trail'];
  }

  function injectStyle() {
    if (document.getElementById('sr-map-extra-style')) return;
    var css = document.createElement('style');
    css.id = 'sr-map-extra-style';
    css.textContent = [
      '.stops .lv .pin{width:34px;height:34px;border-width:2.5px;box-shadow:0 2px 0 #f4a0c4,0 4px 8px rgba(180,40,90,.12)}',
      '.stops .lv .pin .no{font-size:13px}',
      '.stops .lv.here .pin{width:40px;height:40px;border-width:3px}',
      '.stops .lv.here .pin .no{font-size:15px}',
      '.stops .lv.done .pin{border-color:#e8b84a;background:linear-gradient(180deg,#fff,#fff6d8)}',
      '.stops .lv .meta{opacity:0;max-height:0;overflow:hidden;pointer-events:none}',
      '.stops .lv.sr-show .meta,.stops .lv.here .meta{opacity:1;max-height:40px}',
      '.sr-medal{position:absolute;z-index:3;transform:translate(-50%,-128%);display:flex;flex-direction:column;align-items:center;pointer-events:none;filter:drop-shadow(0 2px 0 rgba(255,255,255,.9))}',
      '.sr-medal i{width:30px;height:30px;border-radius:50%;background:#fff;border:2px solid #ffb3d3;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:16px;box-shadow:0 2px 0 #f4a0c4}',
      '.sr-medal b{margin-top:2px;padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.92);color:#7a1f4c;font:800 9px/1.2 ui-rounded,system-ui,sans-serif;letter-spacing:.02em;white-space:nowrap}',
      '.stops .lv.here .sr-medal i{border-color:#f0c14b;box-shadow:0 0 0 3px rgba(255,180,0,.35),0 2px 0 #f4a0c4}',
      '.sr-country-card{position:absolute;left:50%;top:54px;transform:translateX(-50%);z-index:9;display:flex;align-items:center;gap:8px;max-width:min(92%,340px);padding:6px 12px 6px 6px;border-radius:18px;background:rgba(255,255,255,.96);border:2px solid #ff9cc6;box-shadow:0 3px 0 #f4a0c4;pointer-events:none}',
      '.sr-country-card[hidden]{display:none}',
      'body:not(.onmap) .sr-country-card{display:none}',
      '.sr-country-card i{width:36px;height:36px;border-radius:50%;background:#fff4f8;border:1.5px solid #ffb3d3;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:20px;flex:0 0 auto}',
      '.sr-country-card b{display:block;font:900 13px/1.15 ui-rounded,system-ui,sans-serif;color:#d6246e}',
      '.sr-country-card span{display:block;margin-top:1px;font:700 11px/1.2 ui-rounded,system-ui,sans-serif;color:#7a4a62}',
      '#sr-path-wide{stroke:#ff8ab8;stroke-width:9}',
      '#sr-path-dash{stroke:#fff;stroke-width:2.6;opacity:.95}',
      '#sr-future{stroke:#fff;stroke-width:5;stroke-dasharray:7 11;opacity:.8}'
    ].join('');
    document.head.appendChild(css);
  }

  function decorate() {
    var seen = {};
    var pins = document.querySelectorAll('.stops .lv[data-country]');
    pins.forEach(function (pin) {
      pin.classList.remove('sr-show');
      var country = pin.dataset.country || '';
      var key = country.toLowerCase();
      var prefer = pin.classList.contains('country-stop');
      if (seen[key] && !prefer) return;
      if (seen[key] && prefer) {
        var old = document.querySelector('.sr-medal[data-country="' + country.replace(/"/g, '') + '"]');
        if (old && old.parentNode !== pin) old.remove();
      }
      seen[key] = true;
      if (pin.querySelector('.sr-medal')) return;
      var pair = info(country);
      var medal = document.createElement('span');
      medal.className = 'sr-medal';
      medal.dataset.country = country;
      medal.innerHTML = '<i aria-hidden="true">' + pair[0] + '</i><b>' + country + '</b>';
      pin.appendChild(medal);
    });
    var here = document.querySelector('.stops .lv.here');
    if (here) {
      here.classList.add('sr-show');
      var n = parseInt(here.dataset.n, 10);
      var next = n ? document.querySelector('.stops .lv[data-n="' + (n + 1) + '"]') : null;
      if (next) next.classList.add('sr-show');
    }
  }

  function showCard() {
    var map = document.getElementById('map');
    if (!map) return;
    var card = document.getElementById('sr-country-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'sr-country-card';
      card.className = 'sr-country-card';
      card.hidden = true;
      card.innerHTML = '<i></i><div><b></b><span></span></div>';
      map.appendChild(card);
    }
    var here = document.querySelector('.stops .lv.here');
    var country = here && here.dataset.country;
    if (!country || !document.body.classList.contains('onmap')) {
      card.hidden = true;
      return;
    }
    var pair = info(country);
    if (card.dataset.country === country) {
      card.hidden = false;
      return;
    }
    card.dataset.country = country;
    card.querySelector('i').textContent = pair[0];
    card.querySelector('b').textContent = country;
    card.querySelector('span').textContent = pair[1];
    card.hidden = false;
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
        var wrapped = svgNode('<g>' + carBits() + '</g>');
        while (wrapped && wrapped.firstChild) plane.appendChild(wrapped.firstChild);
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
    decorate();
    showCard();
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
