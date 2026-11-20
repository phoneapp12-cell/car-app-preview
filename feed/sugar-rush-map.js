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
      '#sr-future{stroke:#fff;stroke-width:5;stroke-dasharray:8 12;opacity:.75}',
      '.sr-zoom{position:absolute;inset:0;z-index:12;display:none;background:linear-gradient(180deg,#8eecf6,#7ee0ee 40%,#b7f3e4);overflow:hidden}',
      '.sr-zoom.on{display:block}',
      '.sr-zoom svg{position:absolute;inset:0;width:100%;height:100%}',
      '.sr-zoom .sr-ride{position:absolute;left:8%;top:68%;animation:srRide 2.6s ease-in-out forwards}',
      '@keyframes srRide{from{transform:translate(0,0)}to{transform:translate(62vw,-34vh)}}',
      '.sr-zoom .sr-fly{position:absolute;left:10%;top:46%;animation:srFly 2.6s ease-in-out forwards}',
      '@keyframes srFly{from{transform:translate(0,10px) rotate(-8deg)}to{transform:translate(70vw,-26vh) rotate(6deg)}}',
      '.sr-zoom-label{position:absolute;left:50%;top:64px;transform:translateX(-50%);padding:8px 14px;border-radius:16px;background:rgba(255,255,255,.96);color:#d6246e;font:900 16px/1.2 ui-rounded,system-ui,sans-serif;box-shadow:0 4px 12px rgba(90,140,170,.18);white-space:nowrap}',
      '.sr-nav{position:absolute;left:50%;bottom:72px;transform:translateX(-50%);z-index:20;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:24px;background:#fff;border:2px solid #ff8ab8;box-shadow:0 4px 0 #f4a0c4}',
      'body:not(.onmap) .sr-nav{display:none}',
      '.sr-nav button{width:48px;height:48px;border:0;border-radius:50%;background:#ff4f88;color:#fff;font:900 26px/1 ui-rounded,system-ui,sans-serif;box-shadow:0 3px 0 #d6246e}',
      '.sr-nav button:disabled{opacity:.35}',
      '.sr-nav span{min-width:120px;text-align:center;font:900 14px/1.1 ui-rounded,system-ui,sans-serif;color:#d6246e}'
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

  var picked = '';
  var lastHere = '';

  function countryList() {
    var seen = {};
    var list = [];
    var pins = Array.prototype.slice.call(document.querySelectorAll('.stops .lv[data-country]'));
    pins.sort(function (a, b) { return (+a.dataset.n) - (+b.dataset.n); });
    pins.forEach(function (pin) {
      var c = pin.dataset.country;
      if (!c || seen[c]) return;
      seen[c] = true;
      list.push(c);
    });
    return list;
  }

  function currentCountry() {
    var here = document.querySelector('.stops .lv.here');
    return (here && here.dataset.country) || '';
  }

  function ensurePicked() {
    var list = countryList();
    if (!list.length) return '';
    var here = currentCountry();
    if (here && here !== lastHere) {
      lastHere = here;
      picked = here;
      var stage = document.getElementById('mapstage');
      if (stage) stage.dataset.framed = '';
    }
    if (!picked || list.indexOf(picked) < 0) picked = here || list[0];
    return picked;
  }

  function frameCountry(country) {
    var stage = document.getElementById('mapstage');
    var view = document.getElementById('mapview');
    if (!stage || !view || !country) return;
    if (stage.classList.contains('travel-shot')) return;
    var all = document.querySelectorAll('.stops .lv, .stops .future-stop');
    var pins = [];
    all.forEach(function (pin) {
      var on = pin.dataset.country === country;
      pin.style.visibility = on ? '' : 'hidden';
      if (on && pin.classList.contains('lv')) pins.push(pin);
    });
    if (!pins.length) return;
    var key = country + ':' + pins.length;
    if (stage.dataset.framed === key) return;
    stage.dataset.framed = key;
    var sw = stage.clientWidth, sh = stage.clientHeight, vw = view.clientWidth, vh = view.clientHeight;
    if (!sw || !sh || !vw || !vh) return;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pins.forEach(function (p) {
      var x = parseFloat(p.style.left) / 100 * sw;
      var y = parseFloat(p.style.top) / 100 * sh;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    var pad = 90;
    var bw = Math.max(140, maxX - minX + pad * 2);
    var bh = Math.max(180, maxY - minY + pad * 2);
    var cx = (minX + maxX) / 2;
    var cy = (minY + maxY) / 2;
    var scale = Math.min(vw / bw, (vh - 120) / bh, 2.2);
    if (scale < 0.9) scale = 0.9;
    var tx = vw / 2 - cx * scale;
    var ty = (vh / 2 + 10) - cy * scale;
    view.style.overflow = 'hidden';
    stage.style.transformOrigin = '0 0';
    stage.style.transition = 'transform .35s ease';
    stage.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
  }

  function stepCountry(dir) {
    var list = countryList();
    if (!list.length) return;
    var i = list.indexOf(ensurePicked());
    if (i < 0) i = 0;
    var next = i + dir;
    if (next < 0 || next >= list.length) return;
    picked = list[next];
    var stage = document.getElementById('mapstage');
    if (stage) stage.dataset.framed = '';
    frameCountry(picked);
    showCard();
    syncNav();
  }

  function syncNav() {
    var map = document.getElementById('map');
    if (!map) return;
    var nav = document.getElementById('sr-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.id = 'sr-nav';
      nav.className = 'sr-nav';
      nav.innerHTML = '<button type="button" id="sr-prev" aria-label="Previous country">‹</button><span></span><button type="button" id="sr-next" aria-label="Next country">›</button>';
      nav.querySelector('#sr-prev').addEventListener('click', function () { stepCountry(-1); });
      nav.querySelector('#sr-next').addEventListener('click', function () { stepCountry(1); });
      map.appendChild(nav);
    }
    var list = countryList();
    var country = ensurePicked();
    var i = list.indexOf(country);
    nav.querySelector('span').innerHTML = (country || 'Country') + '<small style="display:block;font-size:10px;color:#7a4a62">1.9.276</small>';
    nav.querySelector('#sr-prev').disabled = i <= 0;
    nav.querySelector('#sr-next').disabled = i < 0 || i >= list.length - 1;
    if (!document.body.classList.contains('onmap')) nav.style.display = 'none';
    else nav.style.display = '';
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
    var country = ensurePicked();
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

  function zoomScene(car) {
    var ride = car
      ? '<g class="sr-ride"><rect x="0" y="0" width="54" height="26" rx="8" fill="#e23b4a" stroke="#fff" stroke-width="2"/><rect x="10" y="-10" width="28" height="14" rx="5" fill="#7ec8ff" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="26" r="7" fill="#243044"/><circle cx="42" cy="26" r="7" fill="#243044"/></g>'
      : '<g class="sr-fly"><path d="M28 4 L34 16 L52 22 L52 26 L34 24 L32 36 L40 40 L40 44 L28 40 L16 44 L16 40 L24 36 L22 24 L4 26 L4 22 L22 16 Z" fill="#fff" stroke="#2878c8" stroke-width="2"/><ellipse cx="28" cy="24" rx="8" ry="4" fill="#7ec8ff"/></g>';
    return '<svg viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="srzsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8eecf6"/><stop offset="1" stop-color="#b7f3e4"/></linearGradient></defs>' +
      '<rect width="360" height="640" fill="url(#srzsea)"/>' +
      '<path d="M0 210 C 80 190 140 230 220 200 C 280 180 320 210 360 190 L360 640 L0 640 Z" fill="#d7f4ea" opacity=".7"/>' +
      '<path d="M-10 250 C 70 220 120 280 190 250 C 250 226 300 270 370 240 L370 640 L-10 640 Z" fill="#cfead8" stroke="#fff" stroke-width="8"/>' +
      '<path d="M-10 430 C 40 390 90 450 150 410 C 210 372 250 430 310 400 C 340 388 370 410 380 400" fill="none" stroke="#f48fb1" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M-10 430 C 40 390 90 450 150 410 C 210 372 250 430 310 400 C 340 388 370 410 380 400" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="8 10" opacity=".8"/>' +
      '<circle cx="300" cy="392" r="16" fill="#fff" stroke="#f0c14b" stroke-width="4"/>' +
      '<circle cx="300" cy="392" r="28" fill="none" stroke="#ffe08a" stroke-width="6" opacity=".7"/>' +
      '<ellipse cx="70" cy="90" rx="34" ry="16" fill="#fff" opacity=".85"/>' +
      '<ellipse cx="250" cy="70" rx="40" ry="18" fill="#fff" opacity=".8"/>' +
      ride +
      '</svg>';
  }

  function syncZoom() {
    var map = document.getElementById('map');
    var stage = document.getElementById('mapstage');
    if (!map || !stage) return;
    var panel = document.getElementById('sr-zoom');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'sr-zoom';
      panel.className = 'sr-zoom';
      map.appendChild(panel);
    }
    var traveling = stage.classList.contains('travel-shot');
    if (!traveling) {
      panel.classList.remove('on');
      panel.dataset.mode = '';
      return;
    }
    var car = sameCountryTrip();
    var mode = car ? 'car' : 'plane';
    if (panel.dataset.mode === mode && panel.classList.contains('on')) return;
    panel.dataset.mode = mode;
    panel.innerHTML = zoomScene(car) +
      '<div class="sr-zoom-label">' + (car ? 'Driving' : 'Flying') + ' · ' +
      ((document.querySelector('.stops .lv.here') || {}).dataset || {}).country + '</div>';
    panel.classList.add('on');
  }

  function tick() {
    injectStyle();
    decorate();
    var stage = document.getElementById('mapstage');
    if (stage && stage.classList.contains('travel-shot')) {
      stage.dataset.wasTravel = '1';
    } else {
      if (stage && stage.dataset.wasTravel === '1') {
        stage.dataset.wasTravel = '';
        stage.dataset.framed = '';
      }
      frameCountry(ensurePicked());
    }
    showCard();
    syncNav();
    syncTravel();
    syncZoom();
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
