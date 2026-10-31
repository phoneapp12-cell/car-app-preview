/* My Feed – Shane's private photo and video feed. No likes counts, comments, followers or sharing.
   Thumbs up / down are saved on this phone only (localStorage) and only change the order of this feed. */
'use strict';
const APP_VERSION = '1.1.0';
const FEED_URL = 'https://shane-my-feed-data.phoneapp12.workers.dev/feed.json';
const MY_APP = '../'; // My Feed lives at My App's address + feed/, so My App is one level up
const TOPICS = [
  ['all', 'All', '✨', '#7c3aed', '#ec4899'],
  ['life', 'For You', '📌', '#0f766e', '#2563eb'],
  ['sitcoms', 'Sitcoms', '😂', '#f59e0b', '#ef4444'],
  ['garden', 'Gardening', '🌱', '#16a34a', '#65a30d'],
  ['music', 'Music', '🎵', '#db2777', '#9333ea'],
  ['scifi', 'Sci-fi & Space', '🚀', '#2563eb', '#7c3aed'],
  ['nz', 'Around NZ', '🇳🇿', '#0891b2', '#1d4ed8'],
  ['dogs', 'Dogs', '🐶', '#ea580c', '#a16207'],
  ['nature', 'Nature', '🌿', '#059669', '#0e7490'],
  ['liked', 'Liked', '👍', '#16a34a', '#0d9488']
];
const TOPIC = Object.fromEntries(TOPICS.map(t => [t[0], t]));
const BASE = { sitcoms: 1.35, garden: 1.1, music: 1, scifi: 1.05, nz: 1, dogs: 1, nature: 0.95 }; // sitcoms lead
const SPORT = /\b(sports?|rugby|all blacks|black ferns|super rugby|league|nrl|warriors|cricket|black ?caps|netball|silver ferns|football|soccer|fifa|premier league|afl|basketball|nba|nfl|golf|tennis|motorsport|formula ?1|f1|grand prix|supercars|boxing|ufc|mma|wrestling|athletics|olympics?|commonwealth games|hockey|rowing|america'?s cup|sailgp|triathlon|horse racing|darts|snooker|volleyball|baseball|world cup|bledisloe|test match|tyson fury|heavyweight)\b/i;
const PAGE = 12;
const THUMB = {
  up: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path class="sh" d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path class="ln" d="M7 10v12"/></svg>',
  dn: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path class="sh" d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/><path class="ln" d="M17 14V2"/></svg>'
};

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k, d) { try { const v = localStorage.getItem('mf.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('mf.' + k, JSON.stringify(v)); } catch (e) { } } };

let FEED = ls.get('feed', null);
let VOTES = ls.get('votes', {});        // id -> { v: 1 | -1, topic, src, at, item }
let SEEN = ls.get('seen', {});          // id -> times shown (keeps the feed fresh)
let tab = ls.get('tab', 'all');
let order = [], shown = 0, io = null;

/* ---- ranking (all on this phone) ---- */
function weights() {
  const t = {}, s = {};
  for (const v of Object.values(VOTES)) {
    const age = Math.max(0, (Date.now() - (v.at || 0)) / 864e5), fade = Math.pow(0.5, age / 45); // votes fade over ~6 weeks
    t[v.topic] = (t[v.topic] || 0) + v.v * fade;
    s[v.src] = (s[v.src] || 0) + v.v * fade;
  }
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  return { topic: k => clamp(1 + 0.12 * (t[k] || 0), 0.3, 2.5), src: k => clamp(1 + 0.2 * (s[k] || 0), 0.15, 3) };
}
function rand(seed) { let x = seed % 2147483647; if (x <= 0) x += 2147483646; return () => (x = x * 16807 % 2147483647) / 2147483647; }
function rank(items) {
  const W = weights(), now = Date.now();
  const scored = items.map(i => {
    const ref = i.kind === 'tv' && i.ev ? Math.min(i.ev, now) : (i.first && i.at < i.first - 3 * 864e5 ? (i.at + i.first) / 2 : i.at);
    const ageH = Math.max(0, (now - ref) / 36e5);
    const fresh = Math.pow(0.5, ageH / 30);                        // half as strong every 30 hours
    const media = i.vid ? 1.15 : i.img ? 1.1 : i.kind === 'tip' ? 0.8 : 0.6; // pictures and videos first
    const seen = Math.pow(0.8, SEEN[i.id] || 0);                   // seen a few times: let new things through
    const hot = i.hot ? 1.5 : 1;                                   // e.g. fireworks this week
    return { i, sc: (0.15 + fresh) * media * seen * hot * (BASE[i.topic] || 1) * W.topic(i.topic) * W.src(i.src) };
  }).sort((a, b) => b.sc - a.sc);
  // Mix: each step takes the best next post from the topic that's due, so every interest gets a turn
  // (higher-voted topics, and sitcoms, come round more often). About 1 in 7 slots explores further down a list.
  const r = rand(Math.floor(now / 36e5) + Object.keys(VOTES).length * 7), out = [], Q = {};
  for (const p of scored) (Q[p.i.topic] = Q[p.i.topic] || []).push(p);
  const total = scored.length;
  const lastAt = {}; // step when each topic was last shown: the longer since, the more it's due
  while (out.length < total) {
    const n = out.length, prevSrc = (out[n - 1] || {}).src;
    let bestT = null, best = -1;
    for (const t in Q) {
      if (!Q[t].length) continue;
      const gap = t in lastAt ? n - lastAt[t] : 8;
      const v = Math.sqrt(Q[t][0].sc) * gap * (0.8 + 0.4 * r());
      if (v > best) { best = v; bestT = t; }
    }
    lastAt[bestT] = n;
    const q = Q[bestT]; let k = 0, explore = false;
    if (q.length > 6 && r() < 0.14) { k = 2 + Math.floor(r() * Math.min(q.length - 2, 30)); explore = true; }
    else if (q[0].i.src === prevSrc) { const j = q.findIndex(p => p.i.src !== prevSrc); if (j > 0 && j < 6) k = j; }
    const [p] = q.splice(k, 1); p.i._x = explore; out.push(p.i);
  }
  return out;
}
function visible() {
  if (!FEED) return [];
  if (tab === 'liked') return Object.values(VOTES).filter(v => v.v > 0 && v.item).sort((a, b) => b.at - a.at).map(v => v.item);
  const seenIds = new Set();
  return FEED.items.filter(i => {
    if (seenIds.has(i.id)) return false; seenIds.add(i.id);
    if (VOTES[i.id] && VOTES[i.id].v < 0) return false;          // thumbs-down: gone
    if (SPORT.test((i.t || '') + ' ' + (i.s || ''))) return false; // never any sport
    return tab === 'all' || i.topic === tab;
  });
}

/* ---- For You: Shane's own items, read on this phone from what My App left in localStorage (key myFeedLife).
   Nothing personal is fetched from or sent to any server. Bills and money are left out by My App and again here. ---- */
const LIFE_CAT = { // emoji, label, colour 1, colour 2, My App page
  car: ['🚗', 'Cars', '#2563eb', '#0ea5e9', '#cars'], pet: ['🐾', 'Pets', '#ea580c', '#f59e0b', '#pets'], bday: ['🎂', 'Birthday', '#db2777', '#f97316', '#birthdays'],
  health: ['🩺', 'Health', '#0d9488', '#22c55e', '#health'], todo: ['✅', 'To-do', '#7c3aed', '#6366f1', '#todo'], gym: ['🏋️', 'Gym', '#0f766e', '#14b8a6', '#gym'],
  meal: ['🍽️', 'Dinner', '#c2410c', '#eab308', '#meals'], hol: ['🎉', 'Holiday', '#9333ea', '#ec4899', '#calendar'], event: ['📅', 'Calendar', '#1d4ed8', '#7c3aed', '#calendar'],
  reno: ['🔨', 'Reno', '#92400e', '#d97706', '#projects'], delivery: ['📦', 'Delivery', '#a16207', '#ca8a04', '#alerts'], flag: ['🎟️', 'Flagged event', '#be123c', '#f43f5e', '#events'],
  road: ['🚧', 'Roads', '#b45309', '#f59e0b', '#roadworks'], alert: ['⚠️', 'Heads up', '#b91c1c', '#f97316', '#weather'], weather: ['⛅', 'Weather', '#0284c7', '#38bdf8', '#weather'],
  solar: ['☀️', 'Solar', '#ca8a04', '#f59e0b', '#power']
};
const WX_EMOJI = { clear: '☀️', pc: '⛅', cloud: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', showers: '🌦️', storm: '⛈️', snow: '❄️', wind: '💨' };
const LIFE_MONEY = /\$\s?\d|\b(bills?|pay|payday|payments?|paid|budget|mortgages?|bank|loans?|wages?|commission|invoices?|refunds?|direct debit|credit card|tolls?|claims?|kiwisaver|shares?)\b/i;
const nzToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const daysTo = iso => iso ? Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(nzToday() + 'T00:00:00Z')) / 864e5) : null;
let DISMISS = ls.get('dismiss', {});
function lifeItems() {
  let snap = null; try { snap = JSON.parse(localStorage.getItem('myFeedLife') || 'null'); } catch (e) { }
  if (!snap || !Array.isArray(snap.items)) return null;
  const stale = snap.today !== nzToday();
  return snap.items.map((x, n) => {
    const days = daysTo(x.iso), id = 'life:' + (x.cat + '|' + x.t + '|' + (x.iso || '')).toLowerCase();
    return { ...x, id, days, n, snapAt: snap.at };
  }).filter(x => {
    if (DISMISS[x.id]) return false;
    if (LIFE_MONEY.test([x.t, x.s, x.tag].join(' '))) return false;
    if (stale && (x.cat === 'weather' || x.cat === 'solar' || x.kind === 'warn')) return false; // yesterday's weather and warnings
    if (x.days != null && x.days < 0 && !['car', 'todo', 'pet', 'health'].includes(x.cat)) return false; // past events (overdue jobs stay)
    return true;
  }).sort((a, b) => (a.cat === 'weather' ? -1 : 0) - (b.cat === 'weather' ? -1 : 0) || (a.days == null ? 999 : a.days) - (b.days == null ? 999 : b.days) || (b.red ? 1 : 0) - (a.red ? 1 : 0) || a.n - b.n);
}
const isSoon = x => x.cat === 'weather' || x.red || (x.days != null && x.days <= 2);
function whenChip(x) {
  if (x.days == null) return x.kind === 'warn' && x.red ? 'Now' : '';
  if (x.days < 0) return `${-x.days} day${x.days === -1 ? '' : 's'} overdue`;
  if (x.days === 0) return 'Today'; if (x.days === 1) return 'Tomorrow';
  if (x.days < 7) return new Date(x.iso + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'long', timeZone: 'UTC' });
  return 'In ' + x.days + ' days · ' + new Date(x.iso + 'T12:00:00Z').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
function lifeCard(x) {
  const C = LIFE_CAT[x.cat] || LIFE_CAT.event, em = x.cat === 'weather' && WX_EMOJI[x.wx] ? WX_EMOJI[x.wx] : C[0];
  const w = whenChip(x), hot = (x.days != null && x.days <= 0) || x.red;
  const go = MY_APP + (x.go || C[4]);
  return `<article class="card life${hot ? ' hot' : ''}" data-id="${esc(x.id)}" style="--c1:${C[2]};--c2:${C[3]}">
    <div class="lhero"><span class="lem">${em}</span><div class="lhx"><span class="lcat">${esc(x.tag || C[1])}</span>${w ? `<span class="lwhen${hot ? ' now' : ''}">${esc(w)}</span>` : ''}</div></div>
    <div class="bd"><h3>${esc(x.t)}</h3>${x.s ? `<p data-more>${esc(x.s)}</p>` : ''}</div>
    <div class="ft"><a class="lbtn" href="${esc(go)}">Open in My App</a>${x.url ? `<a class="lbtn ghost" href="${esc(x.url)}" target="_blank" rel="noopener">Details ↗</a>` : ''}<button class="lx" data-dismiss="${esc(x.id)}" aria-label="Hide this">✕</button></div></article>`;
}
function lifeTop() { // All: what's due today or soon, pinned above the feed
  const L = lifeItems(); if (!L) return '';
  const top = L.filter(isSoon).slice(0, 5); if (!top.length) return '';
  return `<div class="pinhd">📌 Today &amp; soon <button data-tab="life">See all ${L.length} ›</button></div>` + top.map(lifeCard).join('') + '<div class="pinhd sub">✨ Your feed</div>';
}

/* ---- rendering ---- */
function ago(ms) {
  const d = (Date.now() - ms) / 1000;
  if (d < 0) { const f = -d / 3600; return f < 24 ? 'today' : f < 48 ? 'tomorrow' : 'in ' + Math.round(f / 24) + ' days'; }
  if (d < 3600) return Math.max(1, Math.round(d / 60)) + 'm';
  if (d < 86400) return Math.round(d / 3600) + 'h';
  if (d < 7 * 86400) return Math.round(d / 86400) + 'd';
  return new Date(ms).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}
const evDate = ms => new Date(ms).toLocaleString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' });
function card(i) {
  const T = TOPIC[i.topic] || TOPIC.all, v = VOTES[i.id] ? VOTES[i.id].v : 0;
  const style = `--c1:${T[3]};--c2:${T[4]}`;
  let media = '';
  if (i.vid) media = `<button class="media vid" data-play="${esc(i.vid)}" aria-label="Play video: ${esc(i.t)}"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(i.img)}" alt="" onerror="this.src='https://i.ytimg.com/vi/${esc(i.vid)}/mqdefault.jpg'"><span class="play"><span></span></span></button>`;
  else if (i.img) media = `<a class="media${i.kind === 'tv' ? ' tall' : ''}" href="${esc(i.url)}" target="_blank" rel="noopener"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(i.img)}" alt="${esc(i.t)}" onerror="if(!this.dataset.r){this.dataset.r=1;var s=this.src;setTimeout(()=>{this.src=s},1500)}else this.closest('.media').remove()"></a>`;
  else media = `<div class="hero"><span class="em">${T[2]}</span><h3>${esc(i.t)}</h3></div>`;
  const when = i.kind === 'event' && i.ev ? `<span class="when">📅 ${esc(evDate(i.ev))}</span>` : i.kind === 'tv' && i.where ? `<span class="when">📺 ${esc(i.where)}</span>` : '';
  const showTitle = i.img || i.vid;
  return `<article class="card" data-id="${esc(i.id)}" style="${style}">
    <div class="hd"><div class="av">${T[2]}</div><div class="who"><b>${esc(i.sn || '')}</b><small>${esc(ago(i.at))}${i.tag ? ' · ' + esc(i.tag) : ''}${i._x ? '<span class="mx">new for you</span>' : ''}</small></div><span class="tp">${esc(T[1])}</span></div>
    ${media}
    <div class="bd">${showTitle ? `<h3>${esc(i.t)}</h3>` : ''}${i.s ? `<p data-more>${esc(i.s)}</p>` : ''}${when}</div>
    <div class="ft">
      <button class="vote up${v > 0 ? ' on' : ''}" data-vote="1" aria-pressed="${v > 0}" aria-label="Thumbs up">${THUMB.up}</button>
      <button class="vote dn${v < 0 ? ' on' : ''}" data-vote="-1" aria-pressed="${v < 0}" aria-label="Thumbs down">${THUMB.dn}</button>
      ${i.url ? `<a class="open-l" href="${esc(i.url)}" target="_blank" rel="noopener">Open ↗</a>` : ''}
    </div></article>`;
}
function chips() {
  $('#chips').innerHTML = TOPICS.map(t => `<button class="chip${t[0] === tab ? ' on' : ''}" data-tab="${t[0]}">${t[2]} ${t[1]}</button>`).join('');
  const on = $('#chips .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function draw() {
  chips();
  const m = $('#feed');
  if (!FEED) { m.innerHTML = '<div class="sk"></div><div class="sk"></div>'; return; }
  if (tab === 'life') { drawLife(); return; }
  order = tab === 'liked' ? visible() : rank(visible()); shown = 0;
  m.innerHTML = (tab === 'all' ? lifeTop() : '') + (order.length ? '' : `<div class="empty">${tab === 'liked' ? 'Nothing here yet. Tap 👍 on posts you like and they’ll be kept here.' : 'Nothing new here right now. Check back soon.'}</div>`);
  more();
  $('#upd').innerHTML = FEED.updated ? `Updated<br>${esc(ago(FEED.updated))} ago` : '';
}
function drawLife() {
  const L = lifeItems(), m = $('#feed');
  if (!L) { m.innerHTML = `<div class="empty">📌 Your own things show here: car WOF, rego and service, birthdays, appointments, to-dos, deliveries, flagged events, roads and weather.<br><br>Open <a href="${MY_APP}">My App</a> once on this phone and they’ll appear. They stay on this phone.</div>`; return; }
  let snap = {}; try { snap = JSON.parse(localStorage.getItem('myFeedLife')) || {}; } catch (e) { }
  const soon = L.filter(isSoon), later = L.filter(x => !isSoon(x));
  m.innerHTML = (soon.length ? '<div class="pinhd">📌 Today &amp; soon</div>' + soon.map(lifeCard).join('') : '') + (later.length ? '<div class="pinhd sub">🗓️ Coming up</div>' + later.map(lifeCard).join('') : '') +
    `<div class="load">From My App on this phone · ${snap.at ? 'updated ' + esc(ago(snap.at)) + ' ago' : ''}<br>Bills and money are never shown here.</div>`;
}
function more() {
  const m = $('#feed'), next = order.slice(shown, shown + PAGE);
  if (!next.length) return;
  shown += next.length;
  m.insertAdjacentHTML('beforeend', next.map(card).join('') + (shown < order.length ? '<div class="load" id="sentinel">Loading more…</div>' : '<div class="load">You’re all caught up ✨</div>'));
  const old = m.querySelectorAll('#sentinel'); old.forEach((s, n) => { if (n < old.length - 1) s.remove(); });
  for (const i of next) SEEN[i.id] = (SEEN[i.id] || 0) + 1;
  saveSeen();
  const s = $('#sentinel');
  if (s) { if (io) io.disconnect(); io = new IntersectionObserver(e => { if (e[0].isIntersecting) { io.disconnect(); s.remove(); more(); } }, { rootMargin: '900px' }); io.observe(s); }
}
let seenT = 0;
function saveSeen() { clearTimeout(seenT); seenT = setTimeout(() => { const keep = new Set((FEED ? FEED.items : []).map(i => i.id)); for (const k of Object.keys(SEEN)) if (!keep.has(k)) delete SEEN[k]; ls.set('seen', SEEN); }, 800); }

/* ---- votes ---- */
function vote(el, v) {
  const c = el.closest('.card'), id = c.dataset.id;
  const item = order.find(x => x.id === id) || (FEED.items || []).find(x => x.id === id) || (VOTES[id] && VOTES[id].item);
  if (!item) return;
  const prev = VOTES[id];
  if (prev && prev.v === v) { delete VOTES[id]; ls.set('votes', VOTES); c.querySelectorAll('.vote').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); toast('Vote removed'); return; }
  const { _x, ...snap } = item;
  VOTES[id] = { v, topic: item.topic, src: item.src, at: Date.now(), item: v > 0 ? snap : undefined };
  ls.set('votes', VOTES);
  c.querySelectorAll('.vote').forEach(b => { const on = +b.dataset.vote === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  try { navigator.vibrate && navigator.vibrate(12); } catch (e) { }
  if (v > 0) toast('👍 More like this from ' + (item.sn || 'here'));
  else {
    c.innerHTML = `<div class="gone">👎 Hidden. You’ll see less from ${esc(item.sn || 'here')}.<button data-undo="${esc(id)}">Undo</button></div>`;
  }
}

/* ---- data ---- */
async function load(force) {
  $('#rf').classList.add('spin');
  try {
    const r = await fetch(FEED_URL + (force ? '?t=' + Date.now() : ''), { cache: force ? 'no-store' : 'default' });
    if (!r.ok) throw new Error(r.status);
    const f = await r.json();
    if (f && Array.isArray(f.items) && f.items.length) {
      const first = !FEED || FEED.updated !== f.updated;
      FEED = f; ls.set('feed', f);
      if (first || force) draw();
      if (force) toast('Feed is up to date');
    }
  } catch (e) { if (!FEED) $('#feed').innerHTML = '<div class="empty">Can’t reach the feed right now. Check your connection and tap ↻.</div>'; else if (force) toast('Offline – showing the last feed'); }
  $('#rf').classList.remove('spin');
}

/* ---- settings ---- */
function settings() {
  const W = weights(), ups = Object.values(VOTES).filter(v => v.v > 0).length, downs = Object.values(VOTES).filter(v => v.v < 0).length;
  const src = (FEED && FEED.sources || []).slice().sort((a, b) => (TOPICS.findIndex(t => t[0] === a.topic) - TOPICS.findIndex(t => t[0] === b.topic)));
  $('#sheetin').innerHTML = `<h2>My Feed</h2>
    <p>Your own feed of photos and videos. No comments, followers or sharing. Your 👍 and 👎 stay on this phone and only change what this feed shows you. It refreshes itself every couple of hours from public sources. Sport is always left out.</p>
    <a class="btn pri" href="${MY_APP}">← Back to My App</a>
    <p>📌 <b>For You</b> shows your own things from My App on this phone (cars, birthdays, calendar, to-dos, deliveries, flagged events, roads, weather and solar). They never leave this phone, and bills and money are always left out.</p>
    <div class="row"><span>Your votes</span><span>${ups} 👍 · ${downs} 👎</span></div>
    ${TOPICS.filter(t => !['all', 'life', 'liked'].includes(t[0])).map(t => `<div class="row"><span>${t[2]} ${t[1]}</span><span>${W.topic(t[0]) > 1.05 ? 'More' : W.topic(t[0]) < 0.95 ? 'Less' : 'Normal'}</span></div>`).join('')}
    <button class="btn" id="resetv">Clear my votes</button>
    <h2 style="margin-top:18px">Sources</h2>
    ${src.map(s => `<div class="row"><span>${(TOPIC[s.topic] || TOPIC.all)[2]} ${esc(s.name)}</span><span>${s.ok ? esc(ago(s.ok)) + ' ago' : 'waiting'}</span></div>`).join('')}
    <div class="row"><span>🌱 Northland garden calendar</span><span>monthly</span></div>
    <p>Feed data: TVmaze, YouTube, Reddit, RNZ, Stuff, Eventfinda, NASA, Space.com, NME and Rolling Stone. Every post links back to where it came from. Version ${APP_VERSION}.</p>
    <button class="btn" data-close>Close</button>`;
  $('#sheet').classList.add('on');
}
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }

/* ---- events ---- */
document.addEventListener('click', e => {
  const t = e.target;
  const c = t.closest('[data-tab]'); if (c) { tab = c.dataset.tab; ls.set('tab', tab); draw(); window.scrollTo({ top: 0 }); return; }
  const v = t.closest('[data-vote]'); if (v) { vote(v, +v.dataset.vote); return; }
  const u = t.closest('[data-undo]'); if (u) { const id = u.dataset.undo; delete VOTES[id]; ls.set('votes', VOTES); const it = order.find(x => x.id === id); const card0 = u.closest('.card'); if (it && card0) card0.outerHTML = card(it); return; }
  const p = t.closest('[data-play]'); if (p) { const id = p.dataset.play; p.outerHTML = `<div class="media"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Video"></iframe></div>`; return; }
  const dm = t.closest('[data-dismiss]'); if (dm) { DISMISS[dm.dataset.dismiss] = Date.now(); ls.set('dismiss', DISMISS); const c0 = dm.closest('.card'); if (c0) { c0.style.transition = 'opacity .25s, transform .25s'; c0.style.opacity = 0; c0.style.transform = 'scale(.97)'; setTimeout(() => c0.remove(), 260); } toast('Hidden from My Feed'); return; }
  const mo = t.closest('[data-more]'); if (mo) { mo.classList.toggle('open'); return; }
  if (t.id === 'rf') { load(true); return; }
  if (t.id === 'st') { settings(); return; }
  if (t.id === 'resetv') { if (confirm('Clear all your 👍 and 👎?')) { VOTES = {}; ls.set('votes', VOTES); $('#sheet').classList.remove('on'); draw(); toast('Votes cleared'); } return; }
  if (t.id === 'sheet' || t.closest('[data-close]')) $('#sheet').classList.remove('on');
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && FEED && Date.now() - (FEED._got || 0) > 20 * 60e3) { FEED._got = Date.now(); load(false); } });

window.addEventListener('storage', e => { if (e.key === 'myFeedLife' && (tab === 'life' || tab === 'all')) draw(); }); // My App updated your items
{ const cut = Date.now() - 30 * 864e5; for (const k in DISMISS) if (DISMISS[k] < cut) delete DISMISS[k]; ls.set('dismiss', DISMISS); }
draw();
load(false);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
