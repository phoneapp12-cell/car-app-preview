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

  // (1) Family — members who posted in last 24h
  if (typeof SHARES !== 'undefined' && Array.isArray(SHARES)) {
    const cut = Date.now() - 864e5, by = new Map();
    for (const s of SHARES) {
      if (!s || !s.at || s.at < cut) continue;
      const it = typeof shareItem === 'function' ? shareItem(s) : null;
      const img = (it && (it.img || (it.photos && it.photos[0]))) || (s.snap && (s.snap.img || (s.snap.photos && s.snap.photos[0])));
      if (!img) continue;
      const who = s.name || (it && it.sn) || 'Family';
      if (!by.has(who) || s.at > by.get(who).at) by.set(who, { id: 'fam-' + (s.id || who), img, label: who, em: '💬', kind: 'family', item: it, at: s.at, title: (it && it.t) || who, text: (s.caption || (it && it.s) || ''), url: it && it.url });
    }
    [...by.values()].sort((a, b) => b.at - a.at).forEach(push);
  }

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
  // birthday / family date within 7 days (extras X.dates) — only if Show My App / family dates available
  try {
    if (typeof SHOW_LIFE !== 'undefined' && SHOW_LIFE !== false && typeof PRIVATE_OK !== 'undefined' && PRIVATE_OK && typeof lifeItems === 'function') {
      const L = lifeItems(true) || [];
      const d = L.filter(x => (x.cat === 'bday' || x.cat === 'event') && x.mine && x.days != null && x.days >= 0 && x.days <= 7).sort((a, b) => a.days - b.days)[0];
      if (d) push({ id: 'today-life-' + d.id, img: d.cat === 'bday' ? 'img/birthday.svg' : 'img/event.svg', label: String(d.t || d.sub || 'Coming up').slice(0, 22), em: d.cat === 'bday' ? '🎂' : '🎉', kind: 'date', title: d.t || 'Coming up', text: d.days === 0 ? 'Today!' : 'In ' + d.days + ' day' + (d.days === 1 ? '' : 's'), url: null });
    }
  } catch (e) { }
  try {
    if (typeof jokesToday === 'function') {
      const j = jokesToday()[0];
      if (j) push({ id: 'today-joke-' + j.id, img: 'img/joke.svg', label: 'Joke of the day', em: j.e || '😂', kind: 'joke', title: 'Joke of the day', text: j.q, url: null, _joke: j });
    }
  } catch (e) { }

  // (3) Highlights — best video, funny animal, top local news (no sport, no election/politics)
  const POL = /\b(election|labour|national|act party|greens?|politic|mp\b|parliament|vote|voting|trump|biden)\b/i;
  const items = (typeof FEED !== 'undefined' && FEED && FEED.items) ? FEED.items : [];
  const ok = i => i && i.img && !SPORT.test((i.t || '') + ' ' + (i.s || '')) && i.topic !== 'election' && !POL.test((i.t || '') + ' ' + (i.s || ''));
  const FUNV = /funny|hilarious|best of|bloopers?|fails?|cold open|prank|laugh|comedy|try not to|cute|adorable|epic|amazing|wow|unexpected|reaction/i, DULLV = /news|interview|explained|lecture|review|update|podcast|full episode|documentary|budget|report/i;
  const fs = i => { const t = (i.t || '') + ' ' + (i.s || '') + ' ' + (i.sn || ''); let s = 0; if (/^fun-|^yt-(cc|nbc|fox|neon)/.test(i.src || i.id || '')) s += 3; if (['sitcoms', 'dogs', 'pets', 'comedy'].includes(i.topic)) s += 3; if (FUNV.test(t)) s += 4; if (DULLV.test(t)) s -= 6; if (['news', 'science', 'nz', 'election'].includes(i.topic)) s -= 4; return s + Math.min(2, ((i.at || 0) - Date.now() + 864e5 * 3) / 864e5); };
  const vids = items.filter(i => ok(i) && (i.vid || i.kind === 'video')).map(i => [fs(i), i]).filter(p => p[0] > 0).sort((a, b) => b[0] - a[0]);
  const vid = vids.length ? vids[0][1] : null;
  if (vid) push({ id: 'hl-vid-' + vid.id, img: vid.img, label: 'Funny video', em: '🎥', kind: 'highlight', item: vid, title: vid.t, text: vid.s || '', url: vid.url });
  const animal = items.filter(i => ok(i) && i !== vid && (['dogs', 'pets'].includes(i.topic) || /\b(dogs?|cats?|pupp(y|ies)|kittens?|parrots?|otters?|goats?|pets?|animals?)\b/i.test(i.t || ''))).map(i => [fs(i) + (i.vid ? 2 : 0), i]).sort((a, b) => b[0] - a[0]).map(p => p[1])[0];
  if (animal) push({ id: 'hl-an-' + animal.id, img: animal.img, label: 'Cute animal', em: '🐾', kind: 'highlight', item: animal, title: animal.t, text: animal.s || '', url: animal.url });
  const local = items.filter(i => ok(i) && (i.topic === 'nz' || /\b(whang[aā]rei|northland|nz herald|stuff\.co\.nz|rnz)\b/i.test((i.sn || '') + ' ' + (i.url || '') + ' ' + (i.t || '')))).sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  if (local) push({ id: 'hl-nz-' + local.id, img: local.img, label: 'Local news', em: '📰', kind: 'highlight', item: local, title: local.t, text: local.s || '', url: local.url });

  // (4) Favourite topics — learn.js scores else PICK order
  let topics = [];
  try {
    const L = window.ibLearn && window.ibLearn.get && window.ibLearn.get();
    if (L && L.t) topics = Object.entries(L.t).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  } catch (e) { }
  if (!topics.length && typeof PICK !== 'undefined' && Array.isArray(PICK)) topics = PICK.slice();
  if (!topics.length && typeof TOPICS !== 'undefined') topics = TOPICS.map(t => t[0]).filter(t => !['all', 'life', 'liked', 'photos', 'family', 'election'].includes(t));
  for (const t of topics) {
    if (out.length >= MAX) break;
    if (typeof topicOn === 'function' && !topicOn(t)) continue;
    if (t === 'election') continue;
    const T = TOPIC[t]; if (!T) continue;
    const it = items.filter(i => i.topic === t && i.img && ok(i)).sort((a, b) => (b.at || 0) - (a.at || 0))[0];
    if (!it) continue;
    push({ id: 'top-' + t, img: it.img, label: T[1], em: T[2], kind: 'topic', topic: t, item: it, title: it.t, text: it.s || '', url: it.url });
  }

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
  TILES = buildTiles(); if (!TILES.length) return;
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
  const media = t.item && t.item.vid
    ? `<div class="stmedia"><img src="${esc(t.img)}" alt=""><div class="stplay">▶</div></div>`
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
  ST_TIMER = setTimeout(() => next(1), 6000);
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
