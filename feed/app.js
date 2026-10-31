/* My Feed – Shane's private photo and video feed. No likes counts, comments, followers or sharing.
   Thumbs up / down are saved on this phone only (localStorage) and only change the order of this feed. */
'use strict';
const APP_VERSION = '1.3.0';
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

/* ---- For You: Shane's own things plus every board and hub in My App, read on this phone from what My App left in
   localStorage (key myFeedLife). Nothing personal is fetched from or sent to any server. Bills and money are left
   out by My App and again here. 1.2.0: every card has a big picture, and they are mixed at random through All. ---- */
const LIFE_CAT = { // emoji, label, colour 1, colour 2, My App page
  car: ['🚗', 'Cars', '#2563eb', '#0ea5e9', '#cars'], pet: ['🐾', 'Zeus & pets', '#ea580c', '#f59e0b', '#pets'], bday: ['🎂', 'Birthday', '#db2777', '#f97316', '#birthdays'],
  health: ['🩺', 'Health', '#0d9488', '#22c55e', '#health'], todo: ['✅', 'To-do', '#7c3aed', '#6366f1', '#todo'], gym: ['🏋️', 'Gym', '#0f766e', '#14b8a6', '#gym'],
  meal: ['🍽️', 'Dinner', '#c2410c', '#eab308', '#meals'], hol: ['🎉', 'Holidays', '#9333ea', '#ec4899', '#calendar'], event: ['📅', 'What’s on', '#1d4ed8', '#7c3aed', '#events'],
  reno: ['🔨', 'Reno', '#92400e', '#d97706', '#projects'], delivery: ['📦', 'Delivery', '#a16207', '#ca8a04', '#alerts'], flag: ['🎟️', 'Flagged event', '#be123c', '#f43f5e', '#events'],
  road: ['🚧', 'Roads', '#b45309', '#f59e0b', '#roadworks'], alert: ['⚠️', 'Heads up', '#b91c1c', '#f97316', '#weather'], weather: ['⛅', 'Weather', '#0284c7', '#38bdf8', '#weather'],
  solar: ['☀️', 'Solar', '#ca8a04', '#f59e0b', '#power'], power: ['⚡', 'Power (kWh)', '#ca8a04', '#16a34a', '#power'], uv: ['🕶️', 'UV', '#ea580c', '#facc15', '#weather'],
  garden: ['🌱', 'My garden', '#15803d', '#84cc16', '#garden'], gardening: ['🌿', 'Gardening board', '#15803d', '#65a30d', '#gardening'],
  space: ['🪐', 'Space board', '#312e81', '#7c3aed', '#space'], astro: ['🔭', 'Astronomy board', '#1e1b4b', '#4338ca', '#astronomy'], travel: ['✈️', 'Travel board', '#0369a1', '#14b8a6', '#travel'],
  science: ['🔬', 'Science board', '#0e7490', '#2563eb', '#science'], aitech: ['🤖', 'AI & tech', '#4f46e5', '#06b6d4', '#aitech'], diy: ['🛠️', 'DIY board', '#9a3412', '#f59e0b', '#diy'],
  coding: ['💻', 'Coding board', '#0f172a', '#2563eb', '#coding'], walk: ['🥾', 'Walks', '#166534', '#0d9488', '#walks'], video: ['▶️', 'Videos', '#dc2626', '#f97316', '#videos'],
  top40: ['🎵', 'NZ Top 40', '#be185d', '#7c3aed', '#top40'], recipe: ['🥘', 'Recipes', '#c2410c', '#eab308', '#recipes'], quote: ['💬', 'Daily quote', '#6d28d9', '#db2777', '#home'],
  fact: ['🥝', 'NZ fact', '#15803d', '#0ea5e9', '#home'], joke: ['😂', 'Joke of the day', '#f59e0b', '#ef4444', '#home'], webcam: ['📷', 'Live webcam', '#0f172a', '#0ea5e9', '#webcams'],
  cinema: ['🎬', 'Cinema', '#7f1d1d', '#dc2626', '#movies'], prime: ['🍿', 'Prime Video', '#0c4a6e', '#0ea5e9', '#prime'], tv: ['📺', 'TV guide', '#1e3a8a', '#6366f1', '#tv'],
  concert: ['🎤', 'Concerts', '#86198f', '#e11d48', '#concerts'], news: ['📰', 'News', '#334155', '#0ea5e9', '#news'], radio: ['📻', 'Radio', '#7c2d12', '#ea580c', '#radio'],
  book: ['📚', 'Kindle', '#78350f', '#a16207', '#home'], lang: ['🗣️', 'Word of the day', '#0f766e', '#7c3aed', '#lang'], blog: ['✍️', 'Blogs', '#475569', '#64748b', '#blogging'],
  podcast: ['🎧', 'Podcasts', '#6b21a8', '#4c1d95', '#podcasts'], shop: ['🛒', 'Shopping list', '#15803d', '#0d9488', '#shopping'], idea: ['💡', 'Ideas', '#a16207', '#eab308', '#ideas']
};
const PERSONAL = new Set(['car', 'pet', 'bday', 'health', 'todo', 'gym', 'meal', 'hol', 'event', 'reno', 'delivery', 'flag', 'road', 'alert', 'weather', 'solar', 'garden']);
const WX_EMOJI = { clear: '☀️', pc: '⛅', cloud: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', showers: '🌦️', storm: '⛈️', snow: '❄️', wind: '💨' };
const LIFE_MONEY = /\$\s?\d|\b(bills?|pay|payday|payments?|paid|budget|mortgages?|bank|banking|loans?|debts?|wages?|salary|commission|invoices?|refunds?|direct debit|credit card|tolls?|claims?|kiwisaver|shares?|cash ?flow|prices?)\b/i;
const nzToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const daysTo = iso => iso ? Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(nzToday() + 'T00:00:00Z')) / 864e5) : null;
let DISMISS = ls.get('dismiss', {});
function lifeSnap() { try { return JSON.parse(localStorage.getItem('myFeedLife') || 'null'); } catch (e) { return null; } }
function lifeItems(withPool) {
  const snap = lifeSnap();
  if (!snap || !Array.isArray(snap.items)) return null;
  const stale = snap.today !== nzToday();
  const mine = snap.items.map((x, n) => ({ ...x, id: 'life:' + (x.cat + '|' + x.t + '|' + (x.iso || '')).toLowerCase(), days: daysTo(x.iso), n, mine: 1 }));
  const pool = withPool && Array.isArray(snap.pool) ? snap.pool.map((x, n) => ({ ...x, id: 'app:' + x.id, days: x.iso ? daysTo(x.iso) : null, n: 1000 + n })) : [];
  return mine.concat(pool).filter(x => {
    if (DISMISS[x.id] || (VOTES[x.id] && VOTES[x.id].v < 0)) return false;
    if (LIFE_MONEY.test([x.t, x.s, x.tag].join(' ')) || SPORT.test([x.t, x.s, x.tag].join(' '))) return false;
    if (stale && (x.cat === 'weather' || x.cat === 'solar' || x.kind === 'warn' || x.now)) return false; // yesterday's weather, power and warnings
    if (x.days != null && x.days < 0 && !['car', 'todo', 'pet', 'health'].includes(x.cat)) return false; // past events (overdue jobs stay)
    return true;
  }).map(x => ({ ...x, topic: 'life', src: 'myapp-' + x.cat, sn: x.mine ? 'My App' : (x.src || (LIFE_CAT[x.cat] || LIFE_CAT.event)[1]) }));
}
const isSoon = x => x.mine && (x.cat === 'weather' || x.red || (x.days != null && x.days <= 1));
function whenChip(x) {
  if (x.days == null) return x.kind === 'warn' && x.red ? 'Now' : x.cat === 'webcam' ? 'Live' : '';
  if (x.days < 0) return `${-x.days} day${x.days === -1 ? '' : 's'} overdue`;
  if (x.days === 0) return 'Today'; if (x.days === 1) return 'Tomorrow';
  if (x.days < 7) return new Date(x.iso + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'long', timeZone: 'UTC' });
  return 'In ' + x.days + ' days · ' + new Date(x.iso + 'T12:00:00Z').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
// How much of each kind of My App card to show: 👍 and 👎 on a card nudge its kind, and cards seen a lot fade a little.
function lifeWeight(x) {
  let up = 0, dn = 0; for (const v of Object.values(VOTES)) if (v.src === x.src) { if (v.v > 0) up++; else dn++; }
  const kind = Math.max(0.25, Math.min(2.5, Math.pow(1.35, up - dn)));
  const near = x.mine ? (x.days == null ? 2.2 : x.days <= 3 ? 3.5 : x.days <= 14 ? 2.6 : 1.6) : 1;
  return kind * near * Math.pow(0.7, SEEN[x.id] || 0);
}
function wshuffle(arr, wf) { return arr.map(x => ({ x, k: Math.pow(Math.random(), 1 / Math.max(0.01, wf(x))) })).sort((a, b) => b.k - a.k).map(o => o.x); } // weighted random order, new every refresh
function lifeMix() { // the My App cards for All, in a fresh random order (today and overdue things lean early)
  const L = lifeItems(true); if (!L) return [];
  const mine = wshuffle(L.filter(x => x.mine), x => lifeWeight(x) * (isSoon(x) ? 6 : 1)), pool = wshuffle(L.filter(x => !x.mine), lifeWeight), out = [];
  while (mine.length || pool.length) out.push((mine.length && (Math.random() < 0.4 || !pool.length) ? mine : pool).shift()); // about 2 in 5 are your own things
  return out;
}
function weave(feed, life) { // one My App card every 3–5 posts, a different pattern each time
  if (!life.length) return feed;
  const out = []; let gap = 1 + Math.floor(Math.random() * 3), li = 0;
  for (let i = 0; i < feed.length; i++) {
    out.push(feed[i]);
    if (--gap <= 0 && li < life.length) { out.push(life[li++]); gap = 3 + Math.floor(Math.random() * 3); }
  }
  return out;
}

/* ---- pictures for My App cards: My App's own photo when there is one, otherwise a real photo of the subject from
   Wikipedia / Wikimedia Commons, TVmaze (TV shows) or book covers. The first picture found for a card is kept, so it
   stays the same each time. ---- */
let PICS = ls.get('pics', {}), WIKI = ls.get('wiki', {});
const KW = (s, list, d) => { for (const [re, q] of list) if (re.test(s)) return [].concat(q); return [].concat(d); };
function picQ(x) {
  const s = (x.t || '') + ' ' + (x.s || '') + ' ' + (x.tag || '');
  if (Array.isArray(x.q) && x.q.length) return x.q;
  switch (x.cat) {
    case 'car': return ['Car'];
    case 'bday': return ['Birthday_cake', 'Cake', 'Balloon'];
    case 'pet': return KW(s, [[/flea/i, 'Flea'], [/worm/i, 'Deworming'], [/vacc|vet/i, 'Veterinarian']], 'Dog');
    case 'todo': return KW(s, [[/mow|lawn/i, 'Lawn_mower'], [/dish/i, 'Dishwasher'], [/washing|laundry|clothes/i, 'Laundry'], [/vacuum|hoover/i, 'Vacuum_cleaner'], [/bin|rubbish|recycl/i, 'Waste_container'], [/shop|grocer/i, 'Supermarket'], [/garden|weed|prune|plant|hedge/i, 'Gardening'], [/clean|tidy/i, 'Housekeeping'], [/car|tyre|oil|wof/i, 'Car_wash'], [/paint/i, 'Paint'], [/hair/i, 'Hairdresser'], [/dentist/i, 'Dentistry'], [/doctor|\bgp\b/i, 'Physician'], [/pool|spa/i, 'Swimming_pool'], [/light|bulb/i, 'Light_bulb'], [/book|read/i, 'Book']], ['Checklist']);
    case 'health': return KW(s, [[/dentist|teeth/i, 'Dentistry'], [/med|pill|script|tablet/i, 'Tablet_(pharmacy)'], [/vaccin|flu jab|shot/i, 'Vaccine'], [/hospital/i, 'Hospital'], [/doctor|\bgp\b/i, 'Physician']], ['Stethoscope']);
    case 'gym': return ['Gym'];
    case 'meal': return ['Roast dinner', 'Home cooking'];
    case 'hol': return KW(s, [[/christmas|boxing/i, 'Christmas'], [/new year/i, 'Fireworks'], [/easter/i, 'Easter_egg'], [/labour/i, 'Labour_Day'], [/waitangi/i, 'Waitangi_Treaty_Grounds'], [/anzac/i, 'Anzac_Day'], [/matariki/i, 'Matariki'], [/guy fawkes|fireworks/i, 'Fireworks'], [/halloween/i, "Jack-o'-lantern"]], ['Fireworks', 'Beach']);
    case 'event': case 'flag': return KW(s, [[/market/i, "Farmers'_market"], [/movie|film|cinema/i, 'Movie_theater'], [/concert|music|band|gig|choir|jazz/i, 'Concert'], [/firework/i, 'Fireworks'], [/garden|plant/i, 'Garden'], [/art|exhibit|gallery/i, 'Art_exhibition'], [/comedy/i, 'Stand-up_comedy'], [/theatre|musical/i, 'Theatre'], [/kids|family/i, 'Playground'], [/food|wine|beer/i, 'Food_festival'], [/christmas|carol/i, 'Christmas_lights'], [/halloween/i, "Jack-o'-lantern"], [/quiz/i, 'Pub_quiz'], [/dance/i, 'Dance'], [/meeting|appointment/i, 'Calendar']], ['Whangārei', 'Calendar']);
    case 'reno': return ['Renovation', 'Carpentry'];
    case 'delivery': return ['Package_delivery', 'Courier'];
    case 'road': return ['Traffic_cone', 'Roadworks'];
    case 'alert': return KW(s, [[/earthquake|quake/i, 'Seismometer'], [/thunder|lightning/i, 'Thunderstorm'], [/rain|flood/i, 'Rain'], [/wind|gale/i, 'Wind'], [/heat|hot/i, 'Sun'], [/fog/i, 'Fog'], [/snow/i, 'Snow']], ['Storm']);
    case 'weather': return ({ clear: ['Sunset', 'Sun'], pc: ['Cumulus_cloud'], cloud: ['Stratus_cloud'], fog: ['Fog'], drizzle: ['Rain'], rain: ['Rain'], showers: ['Rain'], storm: ['Thunderstorm', 'Lightning'], snow: ['Snow'], wind: ['Wind'] })[x.wx] || ['Cumulus_cloud'];
    case 'solar': case 'power': return ['Solar_panel'];
    case 'uv': return ['Sunscreen', 'Sun'];
    case 'joke': return ['Laughter'];
    case 'fact': return ['Whangārei_Falls'];
    case 'radio': return ['Radio_broadcasting', 'Microphone'];
    case 'concert': return ['Concert'];
    case 'news': return ['Whangārei'];
    case 'blog': return ['Blog'];
    case 'podcast': return ['Podcast', 'Microphone'];
    case 'shop': return ['Supermarket'];
    case 'idea': return ['Light_bulb'];
    case 'book': return ['Book', 'Bookshelf'];
    case 'tv': case 'prime': return ['Television'];
    default: return ['Whangārei'];
  }
}
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
async function getJSON(u) { const r = await fetch(u, { headers: { accept: 'application/json' } }); if (!r.ok) throw new Error(r.status); return r.json(); }
async function wikiPic(title) {
  if (title in WIKI) return WIKI[title];
  let u = '';
  try {
    const d = await getJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title));
    const th = d.thumbnail && d.thumbnail.source, og = d.originalimage && d.originalimage.source;
    if (th && /\/thumb\//.test(th) && !/\.svg/i.test(og || th)) u = th.replace(/\/\d+px-/, '/960px-');
    else if (og && !/\.svg/i.test(og)) u = og;
  } catch (e) { return ''; } // offline: try again another time
  WIKI[title] = u; ls.set('wiki', WIKI); return u;
}
async function commonsPic(q, id) { // a different real photo per card from Wikimedia Commons, the same one every time for that card
  const k = 'c:' + q; let list = WIKI[k];
  if (!Array.isArray(list)) {
    try {
      const d = await getJSON('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=24&prop=imageinfo&iiprop=url|size&iiurlwidth=960&format=json&origin=*&gsrsearch=' + encodeURIComponent('filemime:image/jpeg ' + q.replace(/_/g, ' ')));
      list = Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index).map(p => p.imageinfo && p.imageinfo[0]).filter(i => i && i.thumburl && i.width >= 600 && i.width >= i.height * 0.6).map(i => i.thumburl).filter(u => !/\.(tiff?|pdf|djvu|xcf)(\?|$)/i.test(u)).slice(0, 8);
    } catch (e) { return ''; }
    WIKI[k] = list; ls.set('wiki', WIKI);
  }
  return list.length ? list[hash(id) % list.length] : '';
}
const SPECIFIC = new Set(['car', 'garden', 'tv', 'prime', 'fact', 'recipe', 'lang', 'news']);
async function tvPic(name) {
  const k = 'tv:' + name; if (k in WIKI) return WIKI[k];
  let u = ''; try { const d = await getJSON('https://api.tvmaze.com/singlesearch/shows?q=' + encodeURIComponent(name)); u = (d.image && (d.image.original || d.image.medium)) || ''; } catch (e) { if (!/404/.test(e.message)) return ''; }
  WIKI[k] = u; ls.set('wiki', WIKI); return u;
}
async function bookPic(b) {
  const k = 'book:' + b.join('|'); if (k in WIKI) return WIKI[k];
  let u = '';
  try { const d = await getJSON('https://openlibrary.org/search.json?limit=1&fields=cover_i&title=' + encodeURIComponent(b[0]) + '&author=' + encodeURIComponent(b[1] || '')); const c = d.docs && d.docs[0] && d.docs[0].cover_i; if (c) u = 'https://covers.openlibrary.org/b/id/' + c + '-L.jpg'; } catch (e) { }
  if (!u) try { const d = await getJSON('https://www.googleapis.com/books/v1/volumes?maxResults=1&q=intitle:' + encodeURIComponent(b[0]) + '+inauthor:' + encodeURIComponent(b[1] || '')); const l = d.items && d.items[0] && d.items[0].volumeInfo.imageLinks; if (l) u = String(l.thumbnail || l.smallThumbnail || '').replace('http:', 'https:').replace('&edge=curl', '').replace(/zoom=\d/, 'zoom=1'); } catch (e) { }
  WIKI[k] = u; ls.set('wiki', WIKI); return u;
}
async function findPic(x) {
  const bad = x._bad || (x._bad = new Set()), ok = u => u && !bad.has(u);
  if (ok(PICS[x.id])) return PICS[x.id];
  let u = '';
  if (x.book && !x._noBook) u = await bookPic(x.book);
  if (!ok(u) && (x.cat === 'tv' || x.cat === 'prime')) u = await tvPic(x.t.replace(/^#\d+\s*/, ''));
  const wt = (String(x.url || '').match(/wikipedia\.org\/wiki\/([^?#]+)/) || [])[1];
  const qs = (wt ? [decodeURIComponent(wt)] : []).concat(picQ(x));
  const spec = !!wt || SPECIFIC.has(x.cat) || (x.cat === 'pet' && Array.isArray(x.q) && x.q.length > 1);
  for (let n = 0; !ok(u) && n < qs.length; n++) { u = spec ? await wikiPic(qs[n]) : ''; if (!ok(u)) u = await commonsPic(qs[n], x.id + (bad.size ? '#' + bad.size : '')); }
  if (!ok(u) && x.img2) u = x.img2;
  if (!ok(u)) return '';
  PICS[x.id] = u; const keys = Object.keys(PICS); if (keys.length > 1500) keys.slice(0, 300).forEach(k => delete PICS[k]); ls.set('pics', PICS);
  return u;
}
let picBusy = 0; const picQueue = [];
function fillPics() {
  document.querySelectorAll('.media.need:not(.asked)').forEach(el => { el.classList.add('asked'); picQueue.push(el); });
  while (picBusy < 4 && picQueue.length) {
    const el = picQueue.shift(), x = LIFE_BY_ID.get(el.dataset.pic); if (!x) continue;
    picBusy++;
    findPic(x).then(u => { if (u) setPic(el, u, x); else el.classList.add('nopic'); }).finally(() => { picBusy--; fillPics(); });
  }
}
function setPic(el, u, x) {
  const im = new Image(); im.referrerPolicy = 'no-referrer'; im.alt = x.t; im.decoding = 'async';
  im.onload = () => { el.querySelector('.lph') && el.querySelector('.lph').remove(); el.prepend(im); el.classList.remove('need'); };
  im.onerror = () => { delete PICS[x.id]; (x._bad || (x._bad = new Set())).add(u); if (x._bad.size < 4) { x._noBook = 1; el.classList.remove('asked'); fillPics(); } else el.classList.add('nopic'); }; // try another picture
  im.src = u;
}
const LIFE_BY_ID = new Map();
function lifeCard(x) {
  LIFE_BY_ID.set(x.id, x);
  const C = LIFE_CAT[x.cat] || LIFE_CAT.event, em = x.cat === 'weather' && WX_EMOJI[x.wx] ? WX_EMOJI[x.wx] : C[0], v = VOTES[x.id] ? VOTES[x.id].v : 0;
  const w = whenChip(x), hot = x.mine && ((x.days != null && x.days <= 0) || x.red);
  const go = MY_APP + (x.go || C[4]);
  const img = x.img ? (x.live ? x.img + (x.img.includes('?') ? '&' : '?') + 'h=' + Math.floor(Date.now() / 36e5) : x.img) : (PICS[x.id] || '');
  const badge = `${w ? `<span class="lwhen${hot ? ' now' : ''}">${esc(w)}</span>` : ''}`;
  const ph = `<div class="lph"><span>${em}</span></div>`;
  const media = x.vid
    ? vidMedia(x.vid, img, x.t, badge)
    : img ? `<a class="media lm" href="${esc(go)}"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(img)}" alt="${esc(x.t)}" onerror="var m=this.closest('.media');m.classList.add('need');m.dataset.pic=this.dataset.id;this.remove();fillPics()" data-id="${esc(x.id)}">${badge}</a>`
      : `<a class="media lm need" data-pic="${esc(x.id)}" href="${esc(go)}">${ph}${badge}</a>`;
  return `<article class="card life${hot ? ' hot' : ''}${['cinema', 'prime', 'book', 'tv'].includes(x.cat) ? ' tallpic' : ''}" data-id="${esc(x.id)}" style="--c1:${C[2]};--c2:${C[3]}">
    <div class="hd"><div class="av">${em}</div><div class="who"><b>${esc(x.sn)}</b><small>${esc(x.sn === C[1] ? (x.tag || (x.mine ? '' : 'From My App')) : x.tag && x.tag !== C[1] ? C[1] + ' · ' + x.tag : C[1])}</small></div><span class="tp">For You</span></div>
    ${media}
    <div class="bd"><h3>${esc(x.t)}</h3>${x.sub ? `<p class="lsub">${esc(x.sub)}</p>` : ''}${x.s ? `<p data-more>${esc(x.s)}</p>` : ''}${x.credit ? `<small class="cred">📷 ${esc(x.credit)}</small>` : ''}</div>
    <div class="ft">
      <button class="vote up${v > 0 ? ' on' : ''}" data-vote="1" aria-pressed="${v > 0}" aria-label="Thumbs up">${THUMB.up}</button>
      <button class="vote dn${v < 0 ? ' on' : ''}" data-vote="-1" aria-pressed="${v < 0}" aria-label="Thumbs down">${THUMB.dn}</button>
      <a class="open-l" href="${esc(go)}">Open in My App</a>${x.url ? `<a class="open-l" href="${esc(x.url)}" target="_blank" rel="noopener">Source ↗</a>` : ''}
    </div></article>`;
}

/* ---- 1.3.0: videos play by themselves, Instagram-style. A video starts (muted, as browsers require) when about 60% of
   it is on screen and pauses when it scrolls away. Only one plays at a time. Tap the speaker to hear it; after that,
   later videos start with sound too for this visit if the browser allows it. Short clips loop. The YouTube player is
   only loaded when a card is close to the screen, and the thumbnail shows until the video is actually playing. ---- */
const SPK = {
  off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  on: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};
let SOUND = sessionStorage.getItem('mf.sound') === '1';
function vidMedia(id, img, title, extra = '') {
  return `<div class="media vid" data-vid="${esc(id)}" role="button" tabindex="0" aria-label="Video: ${esc(title)}"><div class="vslot"></div><img class="vthumb" loading="lazy" referrerpolicy="no-referrer" src="${esc(img || 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg')}" alt="" onerror="this.src='https://i.ytimg.com/vi/${esc(id)}/mqdefault.jpg'"><span class="play"><span></span></span><button class="snd" data-snd aria-label="${SOUND ? 'Mute' : 'Turn sound on'}">${SOUND ? SPK.on : SPK.off}</button>${extra}</div>`;
}
const PLAYERS = new Map(), RATIO = new Map(); let curVid = null, ytP = null;
function ytApi() {
  if (ytP) return ytP;
  ytP = new Promise(res => {
    if (window.YT && YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; s.onerror = () => { ytP = null; }; document.head.appendChild(s);
  });
  return ytP;
}
function sndBtn(el, on) { const b = el.querySelector('.snd'); if (b) { b.innerHTML = on ? SPK.on : SPK.off; b.setAttribute('aria-label', on ? 'Mute' : 'Turn sound on'); b.classList.toggle('on', on); } }
function mountVid(el) {
  if (PLAYERS.has(el)) return;
  const rec = { ready: false, want: false, p: null }; PLAYERS.set(el, rec);
  ytApi().then(() => {
    if (PLAYERS.get(el) !== rec) return;
    const div = document.createElement('div'); el.querySelector('.vslot').appendChild(div);
    rec.p = new YT.Player(div, {
      videoId: el.dataset.vid, host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%',
      playerVars: { autoplay: 0, mute: 1, playsinline: 1, rel: 0, modestbranding: 1, controls: 1, iv_load_policy: 3, fs: 1 },
      events: {
        onReady: () => { rec.ready = true; try { rec.p.mute(); } catch (e) { } if (rec.want) playVid(el); },
        onStateChange: e => {
          if (e.data === 1) { el.classList.add('playing'); if (curVid && curVid !== el) pauseVid(el); }
          else if (e.data === 0) { let d = 0; try { d = rec.p.getDuration(); } catch (x) { } if (d && d <= 90 && curVid === el) { rec.p.seekTo(0, true); rec.p.playVideo(); } else el.classList.remove('playing'); } // loop short clips
        },
        onError: () => { el.classList.add('verr'); el.classList.remove('playing'); }
      }
    });
  });
}
function unmountVid(el) {
  const rec = PLAYERS.get(el); if (!rec || curVid === el) return;
  try { rec.p && rec.p.destroy(); } catch (e) { }
  const s = el.querySelector('.vslot'); if (s) s.innerHTML = '';
  el.classList.remove('playing'); PLAYERS.delete(el);
}
function playVid(el, withSound) {
  if (curVid && curVid !== el) pauseVid(curVid);
  curVid = el; mountVid(el);
  const rec = PLAYERS.get(el); rec.want = true;
  if (!rec.ready) return;
  const loud = withSound || SOUND;
  try { if (loud) { rec.p.unMute(); rec.p.setVolume(100); } else rec.p.mute(); rec.p.playVideo(); } catch (e) { }
  sndBtn(el, loud);
  if (loud) { let n = 0; const chk = () => { // if the browser won't start it with sound, play it muted instead
    try { if (curVid !== el) return; const st = rec.p.getPlayerState(); if (st === 1 && !rec.p.isMuted()) return; if (st === 3 && n < 12) { n++; return setTimeout(chk, 500); } if (n++ < 4 && st !== 2) return setTimeout(chk, 500); rec.p.mute(); rec.p.playVideo(); sndBtn(el, false); } catch (e) { } }; setTimeout(chk, 700); }
}
function pauseVid(el) {
  const rec = PLAYERS.get(el); if (rec) { rec.want = false; try { rec.ready && rec.p.pauseVideo(); } catch (e) { } }
  if (curVid === el) curVid = null;
}
function pickVid() {
  let best = null, br = 0;
  for (const [el, r] of RATIO) { if (!el.isConnected) { RATIO.delete(el); continue; } if (r > br && !el.classList.contains('verr')) { best = el; br = r; } }
  if (best && br >= 0.6) { if (best !== curVid) playVid(best); }
  else if (curVid && (RATIO.get(curVid) || 0) < 0.6) pauseVid(curVid);
}
const nearIO = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? mountVid(e.target) : unmountVid(e.target)), { rootMargin: '350px 0px' });
const visIO = new IntersectionObserver(es => { es.forEach(e => RATIO.set(e.target, e.isIntersecting ? e.intersectionRatio : 0)); pickVid(); }, { threshold: [0, 0.3, 0.6, 0.8, 1] });
function watchVids() {
  for (const el of [...PLAYERS.keys()]) if (!el.isConnected) { if (curVid === el) curVid = null; unmountVid(el); }
  document.querySelectorAll('.media.vid:not(.watched)').forEach(el => { el.classList.add('watched'); nearIO.observe(el); visIO.observe(el); });
}
function toggleSound(el) {
  const rec = PLAYERS.get(el); let muted = true;
  try { muted = rec && rec.ready ? rec.p.isMuted() : !SOUND; } catch (e) { }
  SOUND = muted; sessionStorage.setItem('mf.sound', SOUND ? '1' : '0');
  document.querySelectorAll('.media.vid').forEach(v => sndBtn(v, SOUND));
  if (SOUND) { if (curVid !== el || !rec || !rec.ready || rec.p.getPlayerState() !== 1) playVid(el, true); else { rec.p.unMute(); rec.p.setVolume(100); } toast('🔊 Sound on'); }
  else { try { rec && rec.ready && rec.p.mute(); } catch (e) { } toast('🔇 Sound off'); }
}
let vScrollT = 0; // belt and braces: when scrolling stops, measure what's on screen directly
addEventListener('scroll', () => { clearTimeout(vScrollT); vScrollT = setTimeout(() => { const H = innerHeight; document.querySelectorAll('.media.vid.watched').forEach(el => { const r = el.getBoundingClientRect(), vis = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0)); RATIO.set(el, r.height ? vis / r.height : 0); if (r.bottom > -350 && r.top < H + 350) mountVid(el); }); pickVid(); }, 250); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && curVid) { const el = curVid; pauseVid(el); } else if (document.visibilityState === 'visible') pickVid(); });

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
  if (i.vid) media = vidMedia(i.vid, i.img, i.t);
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
  if (tab === 'all') order = weave(order, lifeMix()); // My App cards mixed in at random, different every refresh
  m.innerHTML = (order.length ? '' : `<div class="empty">${tab === 'liked' ? 'Nothing here yet. Tap 👍 on posts you like and they’ll be kept here.' : 'Nothing new here right now. Check back soon.'}</div>`);
  more();
  $('#upd').innerHTML = FEED.updated ? `Updated<br>${esc(ago(FEED.updated))} ago` : '';
}
function drawLife() { // For You: only My App cards. Yours first (soonest first), then the boards and hubs at random.
  const L = lifeItems(true), m = $('#feed');
  if (!L) { m.innerHTML = `<div class="empty">📌 Your own things show here: cars, birthdays, calendar, to-dos, garden, pets, meals, weather, power, and every board and hub in My App.<br><br>Open <a href="${MY_APP}">My App</a> once on this phone and they’ll appear. They stay on this phone.</div>`; return; }
  const mine = L.filter(x => x.mine).sort((a, b) => (a.days == null ? 999 : a.days) - (b.days == null ? 999 : b.days) || a.n - b.n);
  order = mine.concat(wshuffle(L.filter(x => !x.mine), lifeWeight)); shown = 0;
  const snap = lifeSnap() || {};
  m.innerHTML = `<div class="load" style="padding-top:0">From My App on this phone${snap.at ? ' · updated ' + esc(ago(snap.at)) + ' ago' : ''} · bills and money are never shown</div>`;
  more();
}
function more() {
  const m = $('#feed'), next = order.slice(shown, shown + PAGE);
  if (!next.length) return;
  shown += next.length;
  m.insertAdjacentHTML('beforeend', next.map(i => i.topic === 'life' ? lifeCard(i) : card(i)).join('') + (shown < order.length ? '<div class="load" id="sentinel">Loading more…</div>' : '<div class="load">You’re all caught up ✨</div>'));
  const old = m.querySelectorAll('#sentinel'); old.forEach((s, n) => { if (n < old.length - 1) s.remove(); });
  for (const i of next) SEEN[i.id] = (SEEN[i.id] || 0) + 1;
  saveSeen(); fillPics(); watchVids();
  const s = $('#sentinel');
  if (s) { if (io) io.disconnect(); io = new IntersectionObserver(e => { if (e[0].isIntersecting) { io.disconnect(); s.remove(); more(); } }, { rootMargin: '900px' }); io.observe(s); }
}
let seenT = 0;
function saveSeen() { clearTimeout(seenT); seenT = setTimeout(() => { const keep = new Set((FEED ? FEED.items : []).map(i => i.id)); for (const k of Object.keys(SEEN)) if (!keep.has(k) && !/^(life|app):/.test(k)) delete SEEN[k]; ls.set('seen', SEEN); }, 800); }

/* ---- votes ---- */
function vote(el, v) {
  const c = el.closest('.card'), id = c.dataset.id;
  const item = order.find(x => x.id === id) || (FEED.items || []).find(x => x.id === id) || LIFE_BY_ID.get(id) || (VOTES[id] && VOTES[id].item);
  if (!item) return;
  const prev = VOTES[id];
  if (prev && prev.v === v) { delete VOTES[id]; ls.set('votes', VOTES); c.querySelectorAll('.vote').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); toast('Vote removed'); return; }
  const { _x, ...snap } = item; if (snap.img && /^data:/.test(snap.img)) delete snap.img; // a car or pet photo stays in My App
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
    <p>▶️ Videos play by themselves (muted) when they’re on screen and pause when you scroll past. Tap the speaker on a video for sound; it stays on until you close My Feed.</p>
    <a class="btn pri" href="${MY_APP}">← Back to My App</a>
    <p>📌 <b>For You</b> cards come from My App on this phone and are mixed through All at random: cars, birthdays, calendar, to-dos, garden, pets, meals and recipes, weather, UV and power (kWh), roads, deliveries, plus every board and hub (space, travel, learn, walks, videos, Top 40, cinema, TV, Prime, events, concerts, news, radio, podcasts, webcams, quotes, facts and jokes). Your own things never leave this phone, and bills and money are always left out. Pictures come from My App, Wikimedia Commons, Wikipedia, TVmaze and Open Library.</p>
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
  const u = t.closest('[data-undo]'); if (u) { const id = u.dataset.undo; delete VOTES[id]; ls.set('votes', VOTES); const it = order.find(x => x.id === id); const card0 = u.closest('.card'); if (it && card0) { card0.outerHTML = it.topic === 'life' ? lifeCard(it) : card(it); fillPics(); watchVids(); } return; }
  const sb = t.closest('[data-snd]'); if (sb) { e.preventDefault(); toggleSound(sb.closest('.media.vid')); return; }
  const p = t.closest('.media.vid'); if (p) { if (!p.classList.contains('playing') || curVid !== p) playVid(p, true); return; } // tap: play this one with sound
  const dm = t.closest('[data-dismiss]'); if (dm) { DISMISS[dm.dataset.dismiss] = Date.now(); ls.set('dismiss', DISMISS); const c0 = dm.closest('.card'); if (c0) { c0.style.transition = 'opacity .25s, transform .25s'; c0.style.opacity = 0; c0.style.transform = 'scale(.97)'; setTimeout(() => c0.remove(), 260); } toast('Hidden from My Feed'); return; }
  const mo = t.closest('[data-more]'); if (mo) { mo.classList.toggle('open'); return; }
  if (t.id === 'rf') { load(true); return; }
  if (t.id === 'st') { settings(); return; }
  if (t.id === 'resetv') { if (confirm('Clear all your 👍 and 👎?')) { VOTES = {}; ls.set('votes', VOTES); $('#sheet').classList.remove('on'); draw(); toast('Votes cleared'); } return; }
  if (t.id === 'sheet' || t.closest('[data-close]')) $('#sheet').classList.remove('on');
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && FEED && Date.now() - (FEED._got || 0) > 20 * 60e3) { FEED._got = Date.now(); load(false); } });

window.addEventListener('storage', e => { if (e.key === 'myFeedLife' && tab === 'life' && scrollY < 200) draw(); }); // My App updated your items
{ const cut = Date.now() - 30 * 864e5; for (const k in DISMISS) if (DISMISS[k] < cut) delete DISMISS[k]; ls.set('dismiss', DISMISS); }
draw();
load(false);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
