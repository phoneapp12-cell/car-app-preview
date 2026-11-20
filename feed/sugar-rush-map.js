/* Sugar Rush map look. Small file so the big game stays untouched.
   Candy-atlas style: soft land, country medallions, a three-thing card,
   a pink ribbon path, and a car inside a country / plane between. */
(function () {
  'use strict';

  var COUNTRIES = {
    'new zealand': ['🥝', [['🌿', 'silver fern'], ['🌊', 'harbours'], ['🥝', 'kiwi']]],
    'cook islands': ['🌺', [['🏝️', 'lagoon'], ['🌺', 'hibiscus'], ['🛶', 'outrigger']]],
    tonga: ['🥥', [['🥥', 'coconut'], ['🐋', 'whales'], ['👑', 'royal']]],
    samoa: ['🌴', [['🏝️', 'two islands'], ['🏠', 'fale'], ['🌅', 'sunset']]],
    australia: ['🦘', [['🦘', 'kangaroo'], ['🐠', 'reef'], ['🎭', 'opera']]],
    'papua new guinea': ['🐦', [['🐦', 'bird of paradise'], ['⛰️', 'highlands'], ['🎭', 'masks']]],
    'solomon islands': ['🐚', [['🐚', 'shells'], ['🐠', 'reefs'], ['🛶', 'canoes']]],
    vanuatu: ['🌋', [['🌋', 'volcano'], ['💦', 'waterfall'], ['🌿', 'kava']]],
    fiji: ['🌊', [['🐠', 'reef'], ['🌴', 'palm'], ['🌺', 'bula']]],
    'new caledonia': ['🐠', [['🏝️', 'lagoon'], ['🌲', 'pine'], ['🐠', 'reef']]],
    indonesia: ['🛕', [['🛕', 'temples'], ['🌾', 'rice'], ['🏝️', 'islands']]],
    vietnam: ['🏮', [['🏮', 'lanterns'], ['🛶', 'river'], ['👘', 'ao dai']]],
    malaysia: ['🦋', [['🏙️', 'towers'], ['🌳', 'rainforest'], ['🦋', 'butterfly']]],
    thailand: ['🐘', [['🛕', 'temples'], ['🐘', 'elephant'], ['🛶', 'longtail']]],
    myanmar: ['🏯', [['🏯', 'pagodas'], ['✨', 'gold'], ['🛶', 'river']]],
    india: ['🪷', [['🪷', 'lotus'], ['🐯', 'tigers'], ['🚪', 'gates']]],
    nepal: ['🏔️', [['🏔️', 'mountains'], ['🚩', 'prayer flags'], ['🛕', 'temples']]],
    bangladesh: ['🛺', [['🛶', 'rivers'], ['🛺', 'rickshaw'], ['🍵', 'tea']]],
    'sri lanka': ['🍵', [['🍵', 'tea'], ['🐘', 'elephants'], ['🏰', 'fort']]],
    singapore: ['🌆', [['🌿', 'gardens'], ['🌆', 'skyline'], ['🦁', 'merlion']]],
    cambodia: ['🛕', [['🛕', 'temples'], ['🛶', 'river'], ['🪷', 'lotus']]],
    philippines: ['⛵', [['🏝️', 'islands'], ['🚌', 'jeepney'], ['⛵', 'boats']]],
    laos: ['🌿', [['🛶', 'river'], ['🛕', 'stupas'], ['🥭', 'mango']]],
    bhutan: ['🐉', [['🏔️', 'mountains'], ['🏯', 'dzong'], ['🐉', 'dragon']]],
    pakistan: ['🏔️', [['🏔️', 'mountains'], ['🍵', 'tea'], ['🚛', 'truck art']]],
    afghanistan: ['🪁', [['🏔️', 'mountains'], ['🏪', 'bazaar'], ['🪁', 'kites']]],
    iran: ['🌷', [['🌷', 'roses'], ['🟦', 'tiles'], ['🏪', 'bazaar']]],
    uzbekistan: ['🕌', [['🟦', 'blue tiles'], ['🧵', 'silk'], ['🕌', 'mosques']]],
    kazakhstan: ['🐎', [['🌾', 'steppe'], ['🐎', 'horses'], ['🦅', 'eagles']]],
    china: ['🐉', [['🐉', 'dragon'], ['🧱', 'great wall'], ['🏮', 'lanterns']]],
    taiwan: ['🧋', [['🌃', 'night markets'], ['🍵', 'tea'], ['🧋', 'bubble tea']]],
    japan: ['🗻', [['🌸', 'cherry blossoms'], ['⛩️', 'ancient temples'], ['🌊', 'coastlines']]],
    'south korea': ['🎌', [['🏯', 'palace'], ['👘', 'hanbok'], ['🥬', 'kimchi']]],
    korea: ['🎌', [['🏯', 'palace'], ['👘', 'hanbok'], ['🥬', 'kimchi']]],
    palau: ['🪼', [['🪨', 'rock islands'], ['🪼', 'jellyfish lake'], ['🌊', 'ocean']]],
    'federated states of micronesia': ['🪸', [['🪸', 'reef'], ['🏛️', 'ancient city'], ['🌊', 'ocean']]],
    'marshall islands': ['🛶', [['⭕', 'atolls'], ['🛶', 'canoe'], ['🌊', 'ocean']]],
    nauru: ['🌴', [['🌴', 'palm'], ['🌊', 'ocean'], ['🏝️', 'island']]],
    kiribati: ['🌅', [['🌅', 'sunrise'], ['⭕', 'atolls'], ['🛶', 'canoe']]]
  };

  function info(country) {
    var key = String(country || '').trim().toLowerCase();
    return COUNTRIES[key] || ['📍', [['📍', 'a new stop'], ['🗺️', 'on the trail'], ['🍬', 'sweet shop']]];
  }

  function injectStyle() {
    if (document.getElementById('sr-map-extra-style')) return;
    var css = document.createElement('style');
    css.id = 'sr-map-extra-style';
    css.textContent = [
      '.mapview{background:#7ee8f5}',
      '.nzsvg .sr-atlas,.nzsvg .sr-bob{display:none}',
      '.nzsvg path{stroke:#fff;stroke-linejoin:round}',
      '.stops .lv .pin{width:18px;height:18px;border:2px solid #fff;background:#fff;box-shadow:0 1px 0 rgba(180,40,90,.12);color:#d6246e}',
      '.stops .lv .pin .no{font-size:0}',
      '.stops .lv .pin .mark,.stops .lv .pin .hardmark{display:none}',
      '.stops .lv.done .pin{background:#fff6d8;border-color:#f0c14b}',
      '.stops .lv.here .pin{width:22px;height:22px;background:#fff;border-color:#f0c14b;box-shadow:0 0 0 6px rgba(255,180,0,.35)}',
      '.stops .lv .meta,.stops .st{opacity:0;max-height:0;overflow:hidden;pointer-events:none}',
      '.sr-medal{position:absolute;z-index:3;left:50%;top:50%;transform:translate(-50%,-58%);display:flex;flex-direction:column;align-items:center;pointer-events:none}',
      '.sr-medal i{width:42px;height:42px;border-radius:50%;background:#fff;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:22px;box-shadow:0 3px 0 rgba(180,90,120,.12),0 6px 12px rgba(90,140,170,.18)}',
      '.sr-medal b{margin-top:3px;padding:2px 7px;border-radius:9px;background:rgba(255,255,255,.94);color:#3d4a62;font:800 10px/1.15 ui-rounded,system-ui,sans-serif;white-space:nowrap;box-shadow:0 1px 0 rgba(255,255,255,.8)}',
      '.stops .lv.here .sr-medal i{box-shadow:0 0 0 4px rgba(255,180,0,.4),0 4px 10px rgba(90,140,170,.2)}',
      '.sr-country-card{position:absolute;left:50%;top:58px;transform:translateX(-50%);z-index:9;width:min(92%,340px);padding:10px 14px 12px;border-radius:22px;background:rgba(255,255,255,.97);box-shadow:0 6px 16px rgba(90,140,170,.18);pointer-events:none;text-align:center}',
      '.sr-country-card[hidden]{display:none}',
      'body:not(.onmap) .sr-country-card{display:none}',
      '.sr-country-card .sr-cname{display:block;font:900 22px/1.1 ui-rounded,system-ui,sans-serif;color:#f25d8a;margin:0 0 8px}',
      '.sr-country-card .sr-bits{display:flex;justify-content:space-between;gap:6px}',
      '.sr-country-card .sr-bit{flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0}',
      '.sr-country-card .sr-bit i{font-style:normal;font-size:16px;line-height:1}',
      '.sr-country-card .sr-bit span{font:700 10px/1.15 ui-rounded,system-ui,sans-serif;color:#5c6b82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      '#sr-path-wide{stroke:#f48fb1;stroke-width:10}',
      '#sr-path-dash{stroke:#fff;stroke-width:2.4;opacity:.9}',
      '#sr-future{stroke:#fff;stroke-width:5;stroke-dasharray:8 12;opacity:.75}'
    ].join('');
    document.head.appendChild(css);
  }

  function decorate() {
    var seen = {};
    var pins = document.querySelectorAll('.stops .lv[data-country]');
    pins.forEach(function (pin) {
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
      card.innerHTML = '<b class="sr-cname"></b><div class="sr-bits"></div>';
      map.appendChild(card);
    }
    var here = document.querySelector('.stops .lv.here');
    var country = here && here.dataset.country;
    if (!country || !document.body.classList.contains('onmap')) {
      card.hidden = true;
      return;
    }
    if (card.dataset.country === country) {
      card.hidden = false;
      return;
    }
    var pair = info(country);
    card.dataset.country = country;
    card.querySelector('.sr-cname').textContent = country;
    card.querySelector('.sr-bits').innerHTML = pair[1].map(function (bit) {
      return '<div class="sr-bit"><i aria-hidden="true">' + bit[0] + '</i><span>' + bit[1] + '</span></div>';
    }).join('');
    card.hidden = false;
  }

  function svgNode(markup) {
    var doc = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>', 'image/svg+xml');
    return doc.documentElement.firstElementChild;
  }

  function carBits() {
    return '<rect class="sr-car-bit" x="-14" y="-6" width="28" height="13" rx="4" fill="#e23b4a" stroke="#fff" stroke-width="1.4"/>' +
      '<rect class="sr-car-bit" x="-8" y="-11" width="16" height="7" rx="2.5" fill="#7ec8ff" stroke="#fff" stroke-width="1"/>' +
      '<circle class="sr-car-bit" cx="-7" cy="7" r="3.2" fill="#243044"/>' +
      '<circle class="sr-car-bit" cx="8" cy="7" r="3.2" fill="#243044"/>';
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
