/* 1.9.82 📖 Stories row: Facebook-style tall tiles under the header on All.
   Family (24h) → Today (weather, birthday≤7d, joke) → Highlights (video, animal, local news) → favourite topics.
   Unseen = pink→orange ring; seen = grey (localStorage, resets daily). Tap opens full-screen viewer. */
(() => {
const MAX = 12, DAY = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const seenKey = () => 'ibStoriesSeen:' + DAY();
const seenMap = () => { try { return JSON.parse(localStorage.getItem(seenKey()) || '{}'); } catch (e) { return {}; } };
const markSeen = id => { const m = seenMap(); m[id] = 1; localStorage.setItem(seenKey(), JSON.stringify(m)); };
const isSeen = id => !!seenMap()[id];
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WX = { 0: '☀️', 1: '☀️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 80: '🌦️', 81: '🌧️', 82: '🌧️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };

function tilePic(url, label) {
  if (!url) return '';
  return `<img class="stimg" src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.stile')&&this.closest('.stile').remove()">`;
}

function buildTiles() {
  const out = [], used = new Set();
  const push = t => { if (!t || !t.img || used.has(t.id) || out.length >= MAX) return; used.add(t.id); out.push(t); };

  // 1.9.89 Shane: only weather + joke, then short videos (family posts, dates, news and topic tiles removed)
  // (2) Today — weather, next birthday/event ≤7d, joke
  try {
    const c = JSON.parse(localStorage.getItem('fxWx') || 'null');
    const w = c && c.w; if (w) {
      const code = w.weather_code, em = WX[code] || '⛅', temp = Math.round(w.temperature_2m);
      // soft sky-ish fallback image via picsum-less: use a static candy gradient as data — better: open-meteo no img; use Wikipedia weather commons or a CSS-only tile
      const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 105 170"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#5b9fff"/><stop offset="1" stop-color="#c6e4ff"/></linearGradient></defs><rect width="105" height="170" fill="url(#g)"/><text x="52" y="90" font-size="42" text-anchor="middle">' + em + '</text></svg>');
      push({ id: 'today-wx', img: svg, label: 'Whangārei ' + temp + '°', em, kind: 'weather', title: 'Whangārei weather', text: em + ' ' + temp + '°C right now', url: null, _wx: true });
    }
  } catch (e) { }
  // 1.9.98 ⚠️ Whangārei weather warnings and ⚡ unplanned Northpower power cuts, only when there are any
  try {
    const xs = typeof X !== 'undefined' ? X : {}, now = Date.now();
    const T = t => new Date(t).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(':00', '');
    for (const w of (xs.wx || []).filter(w => w.wg && w.expires > now).slice(0, 3)) {
      const pic = { rain: 'rain', wind: 'wind', thunderstorm: 'thunderstorm', snow: 'snow', swell: 'swell' }[w.event] || 'warn';
      const lvl = w.colour === 'red' ? 'Red warning' : w.colour === 'orange' ? 'Orange warning' : 'Weather watch';
      push({ id: 'wxw-' + w.id, img: 'img/alert-' + pic + '.svg', label: lvl, em: w.colour === 'red' ? '🔴' : w.colour === 'orange' ? '🟠' : '🟡', kind: 'alert',
        title: (w.test ? 'TEST – ' : '') + String(w.head || 'Weather warning').replace(/\s*-\s*(Orange|Red)$/i, ''),
        text: (w.onset > now ? 'From ' + T(w.onset) : 'Now') + ' until ' + T(w.expires) + '. ' + (w.desc || ''), url: w.web || 'https://www.metservice.com/warnings/home' });
    }
    for (const o of (xs.pwr || []).filter(o => o.kind === 'unplanned').slice(0, 3)) {
      const ar = (o.areas || []).join(', ') || o.title || 'Whangārei';
      push({ id: 'pwr-' + o.id, img: 'img/alert-power.svg', label: 'Power cut', em: '⚡', kind: 'alert', title: (o.test ? 'TEST – ' : '') + 'Power cut: ' + ar,
        text: 'About ' + (+o.customers || 'some') + ' properties. ' + (o.start ? 'Off since ' + T(o.start) : 'Off now') + (o.etr ? ', back on by about ' + T(o.etr) : ', no restoration time yet') + '.' + (o.cause ? ' Cause: ' + o.cause + '.' : ''),
        url: 'https://outages.northpower.nz/' });
    }
  } catch (e) { }
  try {
    if (typeof jokesToday === 'function') {
      const j = jokesToday()[0];
      if (j) push({ id: 'today-joke-' + j.id, img: 'img/joke.svg', label: 'Joke of the day', em: j.e || '😂', kind: 'joke', title: 'Joke of the day', text: j.q + '  😂 ' + j.a, url: null, _joke: j });
    }
  } catch (e) { }

  // (3) Highlights — best video, funny animal, top local news (no sport, no election/politics)
  const POL = /\b(election|labour|national|act party|greens?|politic|mp\b|parliament|vote|voting|trump|biden)\b/i;
  const items = (typeof FEED !== 'undefined' && FEED && FEED.items) ? FEED.items : [];
  const ok = i => i && i.img && !SPORT.test((i.t || '') + ' ' + (i.s || '')) && i.topic !== 'election' && !POL.test((i.t || '') + ' ' + (i.s || ''));
  const FUNV = /funny|hilarious|best of|bloopers?|fails?|cold open|prank|laugh|comedy|try not to|cute|adorable|epic|amazing|wow|unexpected|reaction/i, DULLV = /news|interview|explained|lecture|review|update|podcast|full episode|documentary|budget|report/i;
  const fs = i => { const t = (i.t || '') + ' ' + (i.s || '') + ' ' + (i.sn || ''); let s = 0; if (/^fun-|^yt-(cc|nbc|fox|neon)/.test(i.src || i.id || '')) s += 3; if (['sitcoms', 'dogs', 'pets', 'comedy'].includes(i.topic)) s += 3; if (FUNV.test(t)) s += 4; if (DULLV.test(t)) s -= 6; if (['news', 'science', 'nz', 'election'].includes(i.topic)) s -= 4; return s + Math.min(2, ((i.at || 0) - Date.now() + 864e5 * 3) / 864e5); };
  const SHORT = i => /youtube\.com\/shorts\/|v\.redd\.it|tiktok|reel/i.test((i.url || '') + ' ' + (i.vid || '') + ' ' + (i.v || ''));
  // 1.9.93 Shane: under 30 seconds, no YouTube (no ads) — Reddit's own clips with a known length
  const playable = i => { if (i.vid) return false; const v = typeof vidOf === 'function' && vidOf(i); return !!(v && v.k === 'reddit' && i.vdur > 0 && i.vdur <= 30); };
  const vids = items.filter(i => ok(i) && playable(i))
    .map(i => [fs(i) + (SHORT(i) ? 3 : 0), i]).filter(p => p[0] > 0).sort((a, b) => b[0] - a[0]).map(p => p[1]);
  const LAB = i => { const t = (i.t || '') + ' ' + (i.topic || ''); if (['dogs', 'pets'].includes(i.topic) || /\b(dogs?|cats?|pupp(y|ies)|kittens?|animals?|pets?|birds?|otters?)\b/i.test(t)) return ['Cute animal', '🐾'];
    if (i.topic === 'sitcoms' || /sitcom|comedy|cold open|bloopers?/i.test(t)) return ['Sitcom clip', '📺']; if (/fail|prank|funny|hilarious|laugh/i.test(t)) return ['Funny', '😂']; if (/wow|amazing|epic|incredible/i.test(t)) return ['Wow', '🤩'];
    const T = typeof TOPIC !== 'undefined' && TOPIC[i.topic]; return T ? [T[1], T[2]] : ['Video', '🎥']; };
  const seenTopic = {};
  const FUNL = new Set(['Cute animal', 'Sitcom clip', 'Funny', 'Wow']);
  const fun = vids.filter(v => FUNL.has(LAB(v)[0])), rest = vids.filter(v => !FUNL.has(LAB(v)[0]));
  const pick = fun.length >= 6 ? fun : fun.concat(rest);
  for (const v of pick) { if (out.length >= MAX) break; const k = LAB(v)[0]; if ((seenTopic[k] = (seenTopic[k] || 0) + 1) > 4) continue; const [label, em] = LAB(v);
    push({ id: 'hl-vid-' + v.id, img: v.img, label, em, kind: 'highlight', item: v, title: v.t, text: '', url: v.url }); }

  return out.slice(0, MAX);
}

function rowHtml(tiles) {
  if (!tiles.length) return '';
  return `<div class="stories" id="stories" aria-label="Stories"><div class="stscroll">${tiles.map((t, i) => {
    const ring = isSeen(t.id) ? ' seen' : ' fresh';
    return `<button type="button" class="stile${ring}" data-st="${i}" aria-label="${esc(t.label)}">
      ${tilePic(t.img, t.label)}
      <span class="stav${ring}" aria-hidden="true">${t.em || '✨'}</span>
      <span class="stlab">${esc(t.label)}</span>
    </button>`;
  }).join('')}</div></div>`;
}

let TILES = [], ST_I = 0, ST_TIMER = 0;

function openViewer(i) {
  if (!TILES.length) TILES = buildTiles(); if (!TILES.length) return; // 1.9.94 use the row as shown (a rebuild could shift tiles and open the wrong one)
  ST_I = Math.max(0, Math.min(i, TILES.length - 1));
  let v = document.getElementById('stview');
  if (!v) {
    v = document.createElement('div'); v.id = 'stview'; v.className = 'stview'; v.setAttribute('aria-modal', 'true'); v.setAttribute('role', 'dialog');
    document.body.append(v);
    v.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-stclose]') || t === v) { closeViewer(); return; }
      if (t.closest('[data-stopen]')) { const x = TILES[ST_I]; closeViewer(); if (x && x.url) window.open(x.url, '_blank', 'noopener'); else if (x && x.item && typeof draw === 'function') { /* stay */ } return; }
      if (t.closest('[data-stnext]')) { next(1); return; }
      if (t.closest('[data-stprev]')) { next(-1); return; }
    });
    let sy = 0;
    v.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
    v.addEventListener('touchend', e => { const dy = e.changedTouches[0].clientY - sy; if (dy > 80) closeViewer(); }, { passive: true });
  }
  document.body.classList.add('noscroll');
  paint();
  arm();
}

function paint() {
  const v = document.getElementById('stview'); if (!v || !TILES[ST_I]) return;
  const t = TILES[ST_I]; markSeen(t.id);
  // refresh ring in row
  const btn = document.querySelector(`.stile[data-st="${ST_I}"]`);
  if (btn) { btn.classList.add('seen'); btn.classList.remove('fresh'); const a = btn.querySelector('.stav'); if (a) { a.classList.add('seen'); a.classList.remove('fresh'); } }
  const bars = TILES.map((_, k) => `<i class="${k < ST_I ? 'done' : k === ST_I ? 'on' : ''}"></i>`).join('');
  const vo = t.item && !t.item.vid && typeof vidOf === 'function' ? vidOf(t.item) : null;
  const media = t.item && t.item.vid
    ? `<div class="stmedia stv"><iframe src="https://www.youtube-nocookie.com/embed/${esc(t.item.vid)}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}" onload="stCdHook(this)" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
    : vo && (vo.k === 'reddit' || vo.k === 'mp4')
    ? `<div class="stmedia stv"><video src="${esc(vo.k === 'mp4' ? vo.u : 'https://v.redd.it/' + vo.u + '/CMAF_720.mp4')}" data-rv="${esc(vo.k === 'reddit' ? vo.u : '')}" poster="${esc(t.img)}" autoplay muted playsinline ontimeupdate="stCdSet(this.duration-this.currentTime)" onerror="stVidErr(this)" onplay="stAud(this)" onended="stCdSet(0)"></video></div>`
    : `<div class="stmedia"><img src="${esc(t.img)}" alt=""></div>`;
  v.innerHTML = `<div class="stbars">${bars}</div>
    <button type="button" class="stx" data-stclose aria-label="Close">✕</button>
    <div class="sttap stprev" data-stprev aria-label="Previous"></div>
    <div class="sttap stnext" data-stnext aria-label="Next"></div>
    ${media}
    <div class="stmeta"><b>${esc(t.title || t.label)}</b>${t.text ? `<p>${esc(String(t.text).slice(0, 180))}</p>` : ''}
      ${t.url ? `<button type="button" class="btn pri" data-stopen>Open ↗</button>` : ''}</div>`;
  v.classList.add('on');
}

function arm() {
  clearTimeout(ST_TIMER);
  // 1.9.88 no auto-advance: a story stays put until you tap or swipe
}
function next(d) {
  clearTimeout(ST_TIMER);
  ST_I += d;
  if (ST_I < 0 || ST_I >= TILES.length) { closeViewer(); return; }
  paint(); arm();
}
function closeViewer() {
  clearTimeout(ST_TIMER);
  const v = document.getElementById('stview'); if (v) v.classList.remove('on');
  document.body.classList.remove('noscroll');
}

function html() {
  if (typeof tab !== 'undefined' && tab && tab !== 'all') return '';
  TILES = buildTiles();
  return rowHtml(TILES);
}

document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('.stile[data-st]');
  if (!b) return;
  e.preventDefault();
  openViewer(+b.dataset.st);
});

window.ibStories = { html, open: openViewer, build: buildTiles, close: closeViewer };
})();

/* 1.9.86 open at the top so the stories row is always the first thing you see (late feed redraws used to re-snap the page down to a card) */
(function () {
  try { history.scrollRestoration = 'manual'; } catch (e) { }
  let user = false; const mark = () => { user = true; };
  ['touchstart', 'wheel', 'keydown', 'mousedown'].forEach(ev => addEventListener(ev, mark, { passive: true, once: true }));
  const top = () => { if (!user && scrollY > 0) { const de = document.documentElement; de.classList.add('nosnap'); scrollTo(0, 0); requestAnimationFrame(() => de.classList.remove('nosnap')); } };
  const mo = new MutationObserver(() => requestAnimationFrame(top));
  const go = () => { const f = document.getElementById('feed'), h = document.getElementById('stories-host'); if (f) mo.observe(f, { childList: true }); if (h) mo.observe(h, { childList: true }); top(); };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', go); else go();
  const tick = setInterval(top, 250); setTimeout(() => { clearInterval(tick); }, 15000);
  addEventListener('pageshow', () => { user = false; top(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && scrollY < 200) { user = false; top(); } });
})();

/* 1.9.88 hide Imgur's 'image was probably deleted' placeholder (161x81) anywhere it sneaks in */
document.addEventListener('load', e => { const im = e.target; if (!(im instanceof HTMLImageElement)) return;
  if ((im.naturalWidth === 161 && im.naturalHeight === 81) || /imgur\.com\/removed/i.test(im.currentSrc || '')) {
    const c = im.closest('#feed .card'), tl = im.closest('.stile, .story, [data-story]');
    if (c) c.remove(); else if (tl) tl.remove(); else { im.dataset.fb = 1; im.src = 'img/card-fallback.svg'; } } }, true);

/* 1.9.92 ⏱ countdown on short videos in the story viewer */
const stFmt = x => { x = Math.max(0, Math.ceil(x || 0)); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
window.stCdSet = function (left) { const m = document.querySelector('.stmedia.stv'); if (!m || !isFinite(left)) return;
  let b = m.querySelector('.stcd'); if (!b) { b = document.createElement('div'); b.className = 'stcd'; m.appendChild(b); }
  b.textContent = '⏱ ' + stFmt(left); b.classList.toggle('low', left <= 5); };
window.stCdHook = function (f) { ST_DUR = 0; const ping = () => { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (e) { } };
  ping(); let n = 0; const t = setInterval(() => { if (!f.isConnected || ++n > 10) clearInterval(t); else ping(); }, 500); };
let ST_DUR = 0;
addEventListener('message', e => { if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin || 'http://x').hostname)) return; let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (x) { return; }
  const i = d && d.info; if (!i) return; if (i.duration) ST_DUR = i.duration; if (i.currentTime != null && ST_DUR) stCdSet(ST_DUR - i.currentTime); });

/* 1.9.93 Reddit clips: try smaller sizes if one is missing, and play the separate sound track alongside */
const ST_RES = ['CMAF_720', 'CMAF_480', 'DASH_720', 'DASH_480', 'CMAF_360', 'DASH_360'];
window.stVidErr = function (v) { const id = v.dataset.rv; if (!id) return; const k = (+v.dataset.ri || 0) + 1; if (k >= ST_RES.length) return; v.dataset.ri = k; v.src = `https://v.redd.it/${id}/${ST_RES[k]}.mp4`; v.play().catch(() => { }); };
let ST_AU = null;
window.stAud = function (v) { const id = v.dataset.rv; if (!id) return; if (ST_AU) { ST_AU.pause(); ST_AU = null; }
  const A = ['CMAF_AUDIO_128', 'CMAF_AUDIO_64', 'DASH_AUDIO_128', 'DASH_audio']; let ai = 0; const au = new Audio(`https://v.redd.it/${id}/${A[0]}.mp4`); ST_AU = au;
  au.onerror = () => { if (++ai < A.length) au.src = `https://v.redd.it/${id}/${A[ai]}.mp4`; };
  au.currentTime = v.currentTime; au.play().catch(() => { });
  v.addEventListener('pause', () => au.pause()); v.addEventListener('ended', () => au.pause());
  const iv = setInterval(() => { if (!v.isConnected) { au.pause(); clearInterval(iv); return; } if (Math.abs(au.currentTime - v.currentTime) > .4) au.currentTime = v.currentTime; }, 1000); };
