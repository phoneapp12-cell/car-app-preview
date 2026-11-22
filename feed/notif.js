/* Info Book notifications. An in-app list for this member (no sounds, no push).
   Read/cleared state is stored in ls under 'notif', which is mf.m.{id}.notif
   for a family member and mf.notif for the admin. Opening the tab marks the
   current items seen, which clears the red count on the bell. */
(function (root) {
  'use strict';
  const KEY = 'notif';
  const STORE_MAX = 200;
  const QUAKE_URL = 'https://api.geonet.org.nz/quake?MMI=3';
  const SCRABBLE_URL = 'https://shane-my-feed-data.phoneapp12.workers.dev/api/scrabble';
  const GEONET_PAGE = 'https://www.geonet.org.nz/earthquake/';
  const FIVE_DAYS = 5 * 864e5;
  const TWO_DAYS = 2 * 864e5;
  const QUAKE_AGE = 7 * 864e5;
  const QUAKE_KM = 300;
  const HOME = { lat: -35.77, lon: 174.37, place: 'Onerahi' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function km(aLat, aLon, bLat, bLon) {
    if (![aLat, aLon, bLat, bLon].every(n => typeof n === 'number' && isFinite(n))) return Infinity;
    const toRad = d => d * Math.PI / 180, dLat = toRad(bLat - aLat), dLon = toRad(bLon - aLon);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
  function nearHome(lat, lon) { return km(lat, lon, HOME.lat, HOME.lon) <= 25; }
  function locOf(raw) {
    if (raw && typeof raw.lat === 'number' && typeof raw.lon === 'number') {
      return { lat: raw.lat, lon: raw.lon, place: raw.place || HOME.place, fallback: !!raw.fallback };
    }
    return { lat: HOME.lat, lon: HOME.lon, place: HOME.place, fallback: true };
  }
  function areaText(parts) { return (Array.isArray(parts) ? parts : [parts]).filter(Boolean).join(' ').toLowerCase(); }
  function coversPlace(text, loc) {
    const t = areaText(text);
    if (!t) return false;
    const place = String((loc && loc.place) || '').toLowerCase();
    const names = [];
    if (place) names.push(place, place.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    if (!loc || loc.fallback || nearHome(loc.lat, loc.lon)) names.push('onerahi', 'whangarei', 'whangārei', 'northland');
    return names.filter(Boolean).some(n => n.length > 2 && t.indexOf(n) !== -1);
  }
  function localWarning(w, loc) {
    if (!w) return false;
    if (w.wg && (!loc || loc.fallback || nearHome(loc.lat, loc.lon))) return true;
    return coversPlace([w.area, w.head, w.desc], loc);
  }
  function localOutage(o, loc) {
    if (!o) return false;
    if (!loc || loc.fallback || nearHome(loc.lat, loc.lon)) return true;
    return coversPlace([].concat(o.areas || [], [o.locality, o.title, o.roads && o.roads.join(' ')]), loc);
  }
  function keepQuake(f, loc, now) {
    if (!f || !f.properties) return false;
    const p = f.properties, mag = +p.magnitude, mmi = +p.mmi;
    if (!((mmi >= 4) || (mag >= 4))) return false;
    const at = Date.parse(p.time);
    if (!isFinite(at) || now - at > QUAKE_AGE || at > now + 36e5) return false;
    const c = f.geometry && f.geometry.coordinates;
    if (!c || c.length < 2) return false;
    return km(loc.lat, loc.lon, +c[1], +c[0]) <= QUAKE_KM;
  }
  function badgeLabel(n) {
    n = +n || 0;
    if (n <= 0) return '';
    return n > 9 ? '9+' : String(n);
  }
  function nzClock(ms) {
    return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' }).format(new Date(ms)).replace(':00', '');
  }
  function nzDay(ms) {
    return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(ms));
  }
  function whenLabel(ms, now) {
    if (!isFinite(ms)) return '';
    const d = now - ms;
    if (d < 0) {
      const h = -d / 36e5;
      if (h < 1) return 'in ' + Math.max(1, Math.round(-d / 6e4)) + ' min';
      if (h < 24) return 'Today, ' + nzClock(ms);
      if (h < 48) return 'Tomorrow, ' + nzClock(ms);
      return nzDay(ms) + ', ' + nzClock(ms);
    }
    if (d < 45e3) return 'Just now';
    if (d < 36e5) return Math.max(1, Math.round(d / 6e4)) + ' min ago';
    if (d < 864e5) {
      const h = Math.round(d / 36e5);
      return h === 1 ? '1 hour ago' : h + ' hours ago';
    }
    if (d < 2 * 864e5) return 'Yesterday, ' + nzClock(ms);
    if (d < 7 * 864e5) return nzDay(ms);
    return nzDay(ms);
  }
  function rankOf(it) {
    if (it.kind === 'quake' || it.kind === 'power' || (it.kind === 'wx' && it.level === 'red')) return 0;
    if (it.kind === 'wx') return 1;
    if (it.kind === 'scrabble' || it.kind === 'lives') return 2;
    if (it.kind === 'cal') return 3;
    if (it.kind === 'story') return 4;
    if (it.kind === 'todo') return 5;
    return 6;
  }
  function sortItems(a, b) {
    const ra = rankOf(a), rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    if (a.kind === 'cal' || a.kind === 'todo') return (a.at || 0) - (b.at || 0);
    return (b.at || 0) - (a.at || 0);
  }
  function emptyStore() { return { read: {}, cleared: {} }; }
  function cleanStore(raw) {
    const s = emptyStore();
    if (!raw || typeof raw !== 'object') return s;
    if (raw.read && typeof raw.read === 'object') s.read = raw.read;
    if (raw.cleared && typeof raw.cleared === 'object') s.cleared = raw.cleared;
    return s;
  }
  function trimStore(s, now) {
    const cut = now - 30 * 864e5;
    for (const bag of [s.read, s.cleared]) {
      const keys = Object.keys(bag);
      if (keys.length <= STORE_MAX) {
        for (const k of keys) if (bag[k] && bag[k] < cut) delete bag[k];
        continue;
      }
      keys.sort((a, b) => (bag[a] || 0) - (bag[b] || 0));
      for (let i = 0; i < keys.length - STORE_MAX; i++) delete bag[keys[i]];
    }
    return s;
  }

  function fromCalendar(list, now) {
    const out = [];
    for (const e of list || []) {
      if (!e || !e.id || !e.title || !e.date) continue;
      let at = typeof e.at === 'number' && isFinite(e.at) ? e.at : NaN;
      if (!isFinite(at) && e.date) {
        const clock = /^\d{2}:\d{2}$/.test(e.time || '') ? e.time : '09:00';
        for (const off of ['+13:00', '+12:00']) {
          const ms = Date.parse(e.date + 'T' + clock + ':00' + off);
          if (!isFinite(ms)) continue;
          at = ms; break;
        }
      }
      if (!isFinite(at) || at < now - 2 * 3600000 || at > now + TWO_DAYS) continue;
      const when = at < now ? 'is on now' : (at - now < 864e5 ? 'is at ' + nzClock(at) : 'is ' + nzDay(at) + ', ' + nzClock(at));
      out.push({ id: 'cal:' + e.id, kind: 'cal', icon: '📅', title: e.title + ' ' + when, at, go: 'cal' });
    }
    return out;
  }
  function fromTodos(list, now) {
    const out = [];
    for (const t of list || []) {
      if (!t || t.done || t.deleted || !t.title) continue;
      const touched = Number(t.updated || t.created) || 0;
      if (!touched || now - touched < FIVE_DAYS) continue;
      const days = Math.max(5, Math.floor((now - touched) / 864e5));
      out.push({ id: 'todo:' + t.id, kind: 'todo', icon: '✅', title: t.title + ' hasn’t been ticked for ' + days + ' days', at: touched, go: 'todo' });
    }
    return out;
  }
  function fromStories(list, me, now) {
    const out = [], myId = me && me.id, myName = me && String(me.name || '').trim();
    for (const s of list || []) {
      if (!s || s.mine || (myId && (s.mid === myId || s.member === myId))) continue;
      if (myName && s.name && String(s.name).trim() === myName) continue;
      const at = Number(s.at) || 0;
      if (!at || now - at > 7 * 864e5) continue;
      const who = firstName(s.name) || 'Someone in the family';
      const kind = s.up ? 'a photo' : (s.text || (s.snap && s.snap.kind === 'text') ? 'a note' : (s.link || (s.snap && s.snap.kind === 'link') ? 'a link' : 'a story'));
      out.push({ id: 'sh:' + (s.id || s.card), kind: 'story', icon: s.up ? '📷' : '✏️', title: who + ' shared ' + kind, at, go: 'family' });
    }
    return out;
  }
  function wxLevel(w) { return w && w.colour === 'red' ? 'red' : w && w.colour === 'orange' ? 'orange' : 'watch'; }
  function fromWeather(list, loc, now) {
    const out = [];
    for (const w of list || []) {
      if (!w || (w.expires && w.expires < now)) continue;
      if (!localWarning(w, loc)) continue;
      const lvl = wxLevel(w);
      const label = lvl === 'red' ? 'A red weather warning' : lvl === 'orange' ? 'An orange weather warning' : 'A weather watch';
      const place = (w.area || '').split(';')[0].trim().slice(0, 48) || (loc && loc.place) || 'your area';
      out.push({
        id: 'wx:' + (w.id || w.head), kind: 'wx', level: lvl, icon: lvl === 'red' ? '🔴' : (lvl === 'orange' ? '🟠' : '🟡'),
        title: label + ' for ' + place, at: Number(w.onset) || now, go: 'url',
        url: w.web || 'https://www.metservice.com/warnings/home', urgent: lvl === 'red' ? 0 : 1
      });
    }
    return out;
  }
  function fromPower(list, loc, now) {
    const out = [];
    for (const o of list || []) {
      if (!o) continue;
      if (o.kind && o.kind !== 'unplanned') continue;
      if (!localOutage(o, loc)) continue;
      const ar = (o.areas || []).join(', ') || o.title || (loc && loc.place) || 'your area';
      out.push({
        id: 'pwr:' + (o.id || ar), kind: 'power', icon: '⚡',
        title: 'A power cut is affecting ' + ar, at: Number(o.start) || now, go: 'url',
        url: 'https://outages.northpower.nz/', urgent: 0
      });
    }
    return out;
  }
  function fromLives(info, now) {
    const out = [];
    if (!info) return out;
    if (Number(info.pending) > 0) {
      out.push({ id: 'lv-pend', kind: 'lives', icon: '💝', title: 'A life is waiting for you in Sugar Rush', at: now, go: 'sugar' });
    }
    const asks = Array.isArray(info.asks) ? info.asks : (info.family || []).filter(f => f && f.asked && !f.sent);
    for (const a of asks) {
      const name = firstName(a.name) || 'A family member';
      const key = typeof a.key === 'string' ? a.key : '';
      out.push({ id: 'lv-ask:' + (key || a.name), kind: 'lives', icon: '🙏', title: name + ' would like a life in Sugar Rush', at: Number(a.at) || now, go: 'sugar', lifeTo: key, lifeName: name, lifeSent: !!a.sent });
    }
    return out;
  }
  function fromScrabble(data, now) {
    const out = [];
    if (!data) return out;
    const n = Number(data.yourTurn) || 0;
    if (!n) return out;
    const games = (data.games || []).filter(g => g && g.yourTurn && !g.over);
    const g = games[0];
    const vsNames = g && g.players ? g.players.filter(p => !p.me && !p.resigned).map(p => firstName(p.name)).filter(Boolean) : [];
    const vs = !vsNames.length ? '' : vsNames.length === 1 ? ' vs ' + vsNames[0] : ' vs ' + vsNames.slice(0, 2).join(' and ');
    const title = n > 1 ? 'Your turn in ' + n + ' Scrabble games' : 'Your turn in Scrabble' + vs;
    const gid = g && g.id && /^g[0-9a-f]{16}$/.test(g.id) ? g.id : '';
    out.push({ id: 'sc:' + (gid || 'turn'), kind: 'scrabble', icon: '🔤', title, at: Number(g && g.at) || now, go: 'scrabble', gameId: gid });
    return out;
  }
  function fromQuakes(fc, loc, now) {
    const out = [];
    const feats = (fc && fc.features) || (Array.isArray(fc) ? fc : []);
    for (const f of feats) {
      if (!keepQuake(f, loc, now)) continue;
      const p = f.properties, mag = Math.round(+p.magnitude * 10) / 10;
      const where = p.locality || 'nearby';
      out.push({
        id: 'qk:' + p.publicID, kind: 'quake', icon: '🌍',
        title: 'A magnitude ' + mag + ' earthquake, ' + where,
        at: Date.parse(p.time), go: 'url', url: GEONET_PAGE + encodeURIComponent(p.publicID), urgent: 0
      });
    }
    return out;
  }

  function collect(src, store, now) {
    now = now || (src && src.now) || Date.now();
    const loc = locOf(src && src.loc);
    const st = cleanStore(store);
    let items = []
      .concat(fromCalendar(src && src.cal, now))
      .concat(fromTodos(src && src.todos, now))
      .concat(fromStories(src && src.shares, src && src.me, now))
      .concat(fromWeather(src && src.wx, loc, now))
      .concat(fromPower(src && src.pwr, loc, now))
      .concat(fromLives(src && src.lives, now))
      .concat(fromScrabble(src && src.scrabble, now))
      .concat(fromQuakes(src && src.quakes, loc, now));
    items = items.filter(it => it && it.id && !st.cleared[it.id]);
    items.sort(sortItems);
    return items.map(it => Object.assign({}, it, { read: !!st.read[it.id], when: whenLabel(it.at, now) }));
  }
  function unreadOf(items) { return (items || []).filter(it => !it.read).length; }

  /* ---- live wiring (skipped in tests that only use collect) ---- */
  let lastItems = [], lastAt = 0, busy = false, quakeCache = null, quakeAt = 0, scrabbleCache = null;

  function loadStore() {
    try { if (typeof ls !== 'undefined') return trimStore(cleanStore(ls.get(KEY, null)), Date.now()); } catch (e) { }
    return emptyStore();
  }
  function saveStore(s) {
    try { if (typeof ls !== 'undefined') ls.set(KEY, trimStore(s, Date.now())); } catch (e) { }
  }
  function memberLoc() {
    try {
      if (typeof ibWx !== 'undefined' && ibWx) {
        const saved = typeof ls !== 'undefined' ? ls.get('wxLoc', null) : null;
        if (saved && saved.lat != null) return locOf(saved);
        if (ibWx.HOME) return locOf(Object.assign({}, ibWx.HOME, { fallback: true }));
      }
    } catch (e) { }
    return locOf(null);
  }
  function calList() {
    try { if (root.ibCal && typeof ibCal.load === 'function') return ibCal.load() || []; } catch (e) { }
    return [];
  }
  function todoList() {
    try {
      if (!root.ibTodos) return [];
      if (typeof ibTodos.cache === 'function') {
        const c = ibTodos.cache(); if (c && c.length) return c;
      }
      if (typeof ibTodos.localLoad === 'function') return ibTodos.localLoad() || [];
    } catch (e) { }
    return [];
  }
  function shareList() {
    try { return (typeof SHARES !== 'undefined' && Array.isArray(SHARES)) ? SHARES : []; } catch (e) { return []; }
  }
  function meNow() {
    try { return typeof MEMBER !== 'undefined' && MEMBER ? MEMBER : null; } catch (e) { return null; }
  }
  function wxList() {
    try { return (typeof X !== 'undefined' && X && X.wx) ? X.wx : []; } catch (e) { return []; }
  }
  function pwrList() {
    try { return (typeof X !== 'undefined' && X && X.pwr) ? X.pwr : []; } catch (e) { return []; }
  }
  async function getJson(url, ms, headers) {
    const ctl = root.AbortController ? new AbortController() : null;
    const t = ctl && setTimeout(() => ctl.abort(), ms || 8000);
    try {
      const r = await fetch(url, { signal: ctl && ctl.signal, cache: 'no-store', headers: headers || {} });
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.json();
    } finally { if (t) clearTimeout(t); }
  }
  async function loadQuakes() {
    if (quakeCache && Date.now() - quakeAt < 15 * 60e3) return quakeCache;
    try { quakeCache = await getJson(QUAKE_URL, 8000); quakeAt = Date.now(); } catch (e) { if (!quakeCache) quakeCache = { features: [] }; }
    return quakeCache;
  }
  async function loadScrabble() {
    if (scrabbleCache && Date.now() - (scrabbleCache._at || 0) < 60e3) return scrabbleCache;
    if (root.ibScrabbleTurn == null && root.ibScrabbleGames == null) {
      /* still try the live family endpoint used by play.js */
    }
    let me = null;
    try { me = JSON.parse(root.localStorage.getItem('mf.member') || 'null'); } catch (e) { }
    if (!me || !me.tok || me.pending) {
      if (root.ibScrabbleTurn) return { yourTurn: root.ibScrabbleTurn, games: root.ibScrabbleGames || [], _at: Date.now() };
      return null;
    }
    try {
      const data = await getJson(SCRABBLE_URL, 8000, { Authorization: 'Bearer ' + me.tok });
      if (data) { data._at = Date.now(); scrabbleCache = data; root.ibScrabbleTurn = data.yourTurn || 0; }
      return data;
    } catch (e) {
      if (root.ibScrabbleTurn) return { yourTurn: root.ibScrabbleTurn, games: root.ibScrabbleGames || [], _at: Date.now() };
      return null;
    }
  }
  async function loadLives() {
    try {
      if (root.IBScores && typeof IBScores.loadLives === 'function' && IBScores.who && IBScores.who()) {
        return await IBScores.loadLives();
      }
    } catch (e) { }
    return null;
  }

  function snapshot(extra) {
    return Object.assign({
      now: Date.now(),
      loc: memberLoc(),
      cal: calList(),
      todos: todoList(),
      shares: shareList(),
      me: meNow(),
      wx: wxList(),
      pwr: pwrList(),
      lives: extra && extra.lives,
      scrabble: extra && extra.scrabble,
      quakes: extra && extra.quakes
    }, extra || {});
  }
  function paint(items) {
    lastItems = items || [];
    lastAt = Date.now();
    try { if (typeof paintTabs === 'function') paintTabs(); } catch (e) { }
    setAppBadge(unreadOf(lastItems));
    try {
      if (typeof tab !== 'undefined' && tab === 'notif' && root.ibNotif && typeof ibNotif.drawPage === 'function') ibNotif.drawPage(false);
    } catch (e) { }
  }
  function setAppBadge(n) {
    try {
      if (n > 0 && navigator.setAppBadge) navigator.setAppBadge(Math.min(n, 99));
      else if ((!n || n <= 0) && navigator.clearAppBadge) navigator.clearAppBadge();
    } catch (e) { }
  }
  async function refresh() {
    if (busy) return lastItems;
    busy = true;
    try {
      const [quakes, scrabble, lives] = await Promise.all([loadQuakes(), loadScrabble(), loadLives()]);
      const items = collect(snapshot({ quakes, scrabble, lives }), loadStore());
      paint(items);
      return items;
    } catch (e) {
      const items = collect(snapshot({}), loadStore());
      paint(items);
      return items;
    } finally { busy = false; }
  }
  function itemsNow() {
    if (lastItems.length || lastAt) return lastItems;
    lastItems = collect(snapshot({ quakes: quakeCache, scrabble: scrabbleCache }), loadStore());
    return lastItems;
  }
  function unread() { return unreadOf(itemsNow()); }
  function markSeen(ids) {
    const st = loadStore(), now = Date.now();
    const list = ids && ids.length ? ids : itemsNow().map(it => it.id);
    for (const id of list) if (id && !st.read[id]) st.read[id] = now;
    saveStore(st);
    lastItems = lastItems.map(it => Object.assign({}, it, { read: st.read[it.id] ? true : !!it.read }));
    setAppBadge(unreadOf(lastItems));
    return lastItems;
  }
  function clearIds(ids) {
    const st = loadStore(), now = Date.now();
    for (const id of ids || []) if (id) st.cleared[id] = now;
    saveStore(st);
    const gone = new Set(ids || []);
    lastItems = lastItems.filter(it => !gone.has(it.id));
    setAppBadge(unreadOf(lastItems));
    return lastItems;
  }
  function openGo(it) {
    if (!it) return;
    if (it.go === 'cal' && root.ibCalOpen) { root.ibCalOpen(); return; }
    if (it.go === 'todo' && root.ibTodoOpen) { root.ibTodoOpen(); return; }
    if (it.go === 'family' && typeof goTab === 'function') { goTab('family'); return; }
    if (it.go === 'sugar' && root.ibArt && typeof ibArt.open === 'function') { ibArt.open('sugar'); return; }
    if (it.go === 'scrabble' && root.ibArt && typeof ibArt.open === 'function') {
      ibArt.open('scrabble', null, it.gameId ? { open: it.gameId } : undefined);
      return;
    }
    if (it.go === 'url' && it.url) { try { root.open(it.url, '_blank', 'noopener'); } catch (e) { } }
  }

  function rowHtml(it) {
    const send = (it.kind === 'lives' && it.lifeTo)
      ? '<button type="button" class="today-nsend' + (it.lifeSent ? ' sent' : '') + '" data-nsend="' + esc(it.lifeTo) + '" data-nid="' + esc(it.id) + '"' + (it.lifeSent ? ' disabled' : '') + ' aria-label="' + esc((it.lifeSent ? 'Already sent a life to ' : 'Send a life to ') + (it.lifeName || 'this family member')) + '">' + (it.lifeSent ? 'Sent ✓' : 'Send ❤️') + '</button>'
      : '';
    return '<div class="today-nrow' + (it.read ? ' read' : '') + '" data-nid="' + esc(it.id) + '">'
      + '<button type="button" class="today-nopen" data-nopen="' + esc(it.id) + '"><span class="nic" aria-hidden="true">' + (it.icon || '🔔') + '</span><span class="nbody"><b>' + esc(it.title) + '</b><small>' + esc(it.when || '') + '</small></span></button>'
      + send
      + '<button type="button" class="today-nclear" data-nclear="' + esc(it.id) + '" aria-label="Clear">✕</button>'
      + '</div>';
  }
  async function sendAskedLife(key) {
    if (!key) return { ok: false, err: 'no player' };
    const S = root.IBScores;
    if (!S || typeof S.postLives !== 'function' || !(S.who && S.who())) {
      return { ok: false, err: 'no family link' };
    }
    try {
      const r = await S.postLives({ act: 'send', to: key });
      if (r && (r.ok || r.err === 'already sent today')) return r;
      return r || { ok: false, err: 'unreachable' };
    } catch (e) {
      return { ok: false, err: 'unreachable' };
    }
  }
  function replaceItems(items) {
    lastItems = items || [];
    lastAt = Date.now();
    return lastItems;
  }

  const api = {
    KEY, HOME, FIVE_DAYS, QUAKE_KM,
    collect, unreadOf, badgeLabel, whenLabel, keepQuake, km, nearHome, coversPlace, localWarning, localOutage,
    fromCalendar, fromTodos, fromStories, fromWeather, fromPower, fromLives, fromScrabble, fromQuakes,
    items: itemsNow, unread, refresh, markSeen, clearIds, openGo, loadStore, rowHtml, sendAskedLife, replaceItems,
    drawPage: null
  };
  root.ibNotif = api;

  if (!root.document) return;

  function drawPage(mark) {
    const m = root.document.getElementById('feed'); if (!m) return;
    if (mark !== false) markSeen();
    const items = itemsNow();
    const empty = '<p class="lede" id="today-nempty">You’re all caught up. New things from the family, your calendar and your area will show up here.</p>';
    const acts = items.length ? `<div class="today-nacts"><button type="button" class="today-nall" data-nclearall>Clear all</button></div>` : '';
    m.innerHTML = `<div class="today-page" id="today-notif"><h1>Notifications</h1>
      <p class="lede">A quiet list of things that need a look.</p>${acts}
      <div id="today-nlist">${items.length ? items.map(rowHtml).join('') : empty}</div></div>`;
    try { if (typeof paintTabs === 'function') paintTabs(); } catch (e) { }
  }
  api.drawPage = drawPage;

  if (root.document.addEventListener) {
    root.document.addEventListener('click', function (e) {
      const t = e.target;
      if (!t || !t.closest) return;
      const sendBtn = t.closest('[data-nsend]');
      if (sendBtn) {
        e.preventDefault(); e.stopPropagation();
        if (sendBtn.disabled || sendBtn.classList.contains('sent')) return;
        const key = sendBtn.getAttribute('data-nsend');
        const id = sendBtn.getAttribute('data-nid');
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending…';
        Promise.resolve(sendAskedLife(key)).then(function (r) {
          if (r && (r.ok || r.err === 'already sent today')) {
            sendBtn.textContent = 'Sent ✓';
            sendBtn.classList.add('sent');
            sendBtn.setAttribute('aria-label', r.ok ? 'Sent a life' : 'Already sent today');
            if (id) markSeen([id]);
            lastItems = lastItems.map(function (it) {
              return (it.lifeTo === key) ? Object.assign({}, it, { lifeSent: true, read: true }) : it;
            });
          } else {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send ❤️';
            sendBtn.setAttribute('aria-label', 'Send a life' + (r && r.err === 'no family link' ? ' (needs a family link)' : ' (try again)'));
          }
        });
        return;
      }
      const clrAll = t.closest('[data-nclearall]');
      if (clrAll) {
        e.preventDefault(); e.stopPropagation();
        clearIds(itemsNow().map(it => it.id));
        drawPage(false);
        return;
      }
      const clr = t.closest('[data-nclear]');
      if (clr) {
        e.preventDefault(); e.stopPropagation();
        clearIds([clr.getAttribute('data-nclear')]);
        drawPage(false);
        return;
      }
      const open = t.closest('[data-nopen]');
      if (open) {
        e.preventDefault();
        const id = open.getAttribute('data-nopen');
        const it = itemsNow().find(x => x.id === id);
        markSeen([id]);
        openGo(it);
      }
    });
  }
  if (typeof root.setTimeout === 'function') root.setTimeout(function () { refresh().catch(function () {}); }, 800);
  if (typeof root.setInterval === 'function') root.setInterval(function () { if (!root.document.hidden) refresh().catch(function () {}); }, 120000);
  if (root.document.addEventListener) root.document.addEventListener('visibilitychange', function () { if (!root.document.hidden) refresh().catch(function () {}); });
})(typeof window !== 'undefined' ? window : globalThis);
