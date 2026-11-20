/* 1.9.299 One-off Whangārei events and local developments in the feed.
   Data comes from the existing due-dates relay (GET /events and GET /planning).
   Recurring markets and cinema listings are filtered out here — the Worker and
   relay are left unchanged. Local sport events are off until a family member
   opts in (Shane is never asked; unanswered means off). Preview origins fall
   back to whg-local.json. */
(function (root) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RELAY_PLAN = 'https://due-dates-calendar-relay.phoneapp12.workers.dev/planning';
  const CACHE_DEV = 'ib.whgDev';
  const SPORT_KEY = 'sportEvents';
  const MAX_EVENTS = 8;
  const MAX_DEVS = 6;
  const NEAR = /whang[aā]rei|kamo|onerahi|tikipunga|kensington|maunu|morningside|raumanga|otangarei|regent|parahaki|riverside|town basin|hundertwasser|forum north|tutuk[aā]k[aā]|ngunguru|matapouri|ruak[aā]k[aā]|waip[uū]\b|one tree point|marsden|hikurangi|parua bay|pataua|maungakaramea|maungatapere|portland|glenbervie|whareora|whananaki|oakleigh|tamaterau|mckinnon|bream bay|semenoff|quarry arts|octagon theatre|cameron street|water street|james street|rust avenue|selwyn avenue|kamo road|mckay stadium/i;
  const FAR = /mangawhai|kerikeri|waitangi|russell|paihia|kait[aā]ia|kaikohe|kawakawa|\bopua\b|rawene|dargaville|warkworth|wellsford|kaiwaka|maungaturoto|auckland|pukekohe|hamilton|t[aā]maki/i;
  const SPORT = /\b(hyrox|rugby|netball|cricket|hockey|soccer|football\s+(club|match|game|final)|league\s+(game|match|final)|horse\s*rac(?:e|ing)|at the races|\braces\b|marathon|triathlon|fun\s*run|sports?\s*day|boxing\s+(match|bout)|wrestling)\b/i;
  const RECUR_NAME = /\b(growers\s+market|tikipunga\s+(growers\s+)?market|farmers\s+market|weekly\s+market|club\s+night|quiz\s+night|open\s*mic|bingo\b|regular\s+class|yoga\s+class|boot\s*camp|lunchtime\s+live\s+music)\b/i;
  const MOVIE_VENUE = /event\s+cinemas|reading\s+cinemas/i;
  const DEV_KEEP = /\b(construction|wastewater|housing|homes?|campus|roadworks|repairs?|motorway|expressway|highway|\bSH\s?1\b|hospital|subdivision|upgrade|reopens?|community hub|NorthTec|Port Marsden|Hundertwasser|town basin|retail|supermarket|affordable housing|Old Boys|easement|new shops?|rebuild|roading)\b/i;
  const DEV_DROP = /looking for property|mayor'?s column|homeless camp|thinking about building or developing|freedom camping|roadworks season|beach bylaw/i;
  const DEV_FAR = /warkworth|te hana|auckland(?!\s*to)|wellsford/i;
  const DEV_SRC = /whang[aā]rei district council|nz government|beehive|rnz|nz herald|northern advocate|nzta|waka kotahi|northland regional/i;

  function nzStamp(now) {
    if (root.ibNz && typeof root.ibNz.nzStamp === 'function') return root.ibNz.nzStamp(now);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now)).map(p => [p.type, p.value]));
    return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute;
  }
  function nzDay(now) { return nzStamp(now).slice(0, 10); }
  function dayDiff(a, b) {
    const ms = Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z');
    return Math.round(ms / 864e5);
  }
  function normTitle(t) {
    return String(t || '').toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\s*[-–—:|]\s+.+$/, '')
      .replace(/\s+(christmas markets?|christmas market|2026|2027)\s*$/i, '')
      .trim();
  }
  function blob(ev) {
    return [ev && ev.title, ev && ev.venue, ev && ev.url, ev && ev.desc, ev && ev.place].join(' ');
  }
  function isMovieListing(ev) {
    if (!ev) return false;
    const cats = (ev.cats || []).join(' ');
    if (/^mov-/i.test(String(ev.id || ''))) return true;
    if (MOVIE_VENUE.test(ev.venue || '') || MOVIE_VENUE.test(ev.title || '')) return true;
    if (/\bMovies?\b/i.test(cats) && /event\s+cinemas|james street/i.test(blob(ev))) return true;
    return false;
  }
  function isSport(ev) {
    const cats = (ev.cats || []).join(' ');
    if (/\bSport\b/i.test(cats)) return true;
    return SPORT.test(blob(ev));
  }
  function isFar(ev) {
    const text = blob(ev);
    return FAR.test(text) && !NEAR.test(text);
  }
  function recurId(ev) { return /^(growers-|tiki-)/i.test(String(ev && ev.id || '')); }
  function recurName(ev) { return RECUR_NAME.test(String(ev && ev.title || '')); }
  function stillOn(ev, now) {
    if (!ev || !/^\d{4}-\d{2}-\d{2}$/.test(ev.date || '')) return false;
    const today = nzDay(now);
    const last = /^\d{4}-\d{2}-\d{2}$/.test(ev.end || '') && ev.end > ev.date ? ev.end : ev.date;
    if (last > today) return true;
    if (last < today) return false;
    const endT = ev.endTime || ev.time;
    if (ev.timeKnown && endT && /^\d{2}:\d{2}/.test(endT)) return nzStamp(now) < last + 'T' + endT.slice(0, 5);
    return true;
  }
  function weeklyish(dates) {
    const uniq = [...new Set(dates)].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (uniq.length < 3) return false;
    const gaps = [];
    for (let i = 1; i < uniq.length; i++) gaps.push(dayDiff(uniq[i - 1], uniq[i]));
    const ok = gaps.filter(g => (g >= 6 && g <= 8) || (g >= 13 && g <= 16));
    return ok.length >= 2;
  }
  function scatteredSeries(dates) {
    const uniq = [...new Set(dates)].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (uniq.length < 4) return false;
    const gaps = [];
    for (let i = 1; i < uniq.length; i++) gaps.push(dayDiff(uniq[i - 1], uniq[i]));
    const consec = gaps.filter(g => g <= 1).length;
    return consec / gaps.length < 0.7;
  }
  function fmtDay(ymd) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || '')) return '';
    const ms = Date.parse(ymd + 'T12:00:00+13:00');
    return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short' }).format(isFinite(ms) ? ms : new Date());
  }
  function fmtRange(start, end) {
    const a = fmtDay(start);
    if (!end || end === start) return a;
    const b = fmtDay(end);
    if (!a || !b) return a || b;
    const as = start.split('-'), bs = end.split('-');
    if (as[1] === bs[1] && as[0] === bs[0]) {
      const left = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric' }).format(Date.parse(start + 'T12:00:00+13:00'));
      return left + '–' + b;
    }
    return a + ' – ' + b;
  }
  function evWhen(ev) {
    const t = ev.timeKnown && ev.time ? ev.time.slice(0, 5) : '';
    const range = fmtRange(ev.date, ev.end && ev.end > ev.date ? ev.end : ev.date);
    return t && ev.date === (ev.end || ev.date) ? range + ' · ' + t : range;
  }
  function evMs(ev) {
    const t = (ev.timeKnown && ev.time) ? ev.time.slice(0, 5) : '12:00';
    for (const off of ['+13:00', '+12:00']) {
      const ms = Date.parse(ev.date + 'T' + t + ':00' + off);
      if (!isFinite(ms)) continue;
      if (nzStamp(ms).slice(0, 16) === ev.date + 'T' + t) return ms;
    }
    const ms = Date.parse(ev.date + 'T' + t + ':00+13:00');
    return isFinite(ms) ? ms : 0;
  }
  function clip(s, n) {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    if (t.length <= n) return t;
    return t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
  }

  /* Local sport events: per-member opt-in, stored with the existing ls prefix
     (mf.m.<id>.sportEvents) so each person has their own choice on this phone.
     Shane (admin / his own phone) stays off and is never asked. Unanswered = off.
     Not written to the family Worker — a /prefs field would need a Worker change. */
  function isShaneProfile(env) {
    const E = env || root;
    if (E.IS_ADMIN) return true;
    if (typeof E.PRIVATE_OK !== 'undefined' && E.PRIVATE_OK) return true;
    return false;
  }
  function sportStore(env) {
    const E = env || root;
    if (E.ls && typeof E.ls.get === 'function') return E.ls;
    if (typeof ls !== 'undefined' && ls && typeof ls.get === 'function') return ls;
    return null;
  }
  function sportPref(env) {
    const s = sportStore(env);
    if (!s) return null;
    const v = s.get(SPORT_KEY, null);
    if (v === true || v === 'true') return true;
    if (v === false || v === 'false') return false;
    return null;
  }
  function sportEventsOn(env) {
    if (isShaneProfile(env)) return false;
    return sportPref(env) === true;
  }
  function shouldAskSport(env) {
    const E = env || root;
    if (isShaneProfile(E)) return false;
    if (!E.FAM_ON) return false;
    const v = sportPref(E);
    return v !== true && v !== false;
  }
  function setSportEvents(on, env) {
    const E = env || root;
    if (isShaneProfile(E)) return false;
    const s = sportStore(E);
    if (s && typeof s.set === 'function') s.set(SPORT_KEY, !!on);
    try { if (typeof toast === 'function') toast(on ? 'Local sport events are on in your feed' : 'No local sport events in your feed'); } catch (e) {}
    try { if (typeof E.draw === 'function') E.draw(); else if (typeof draw === 'function') draw(); } catch (e) {}
    return !!on;
  }
  function showSportSettings(env) {
    const E = env || root;
    if (isShaneProfile(E)) return false;
    return !!E.FAM_ON;
  }

  function oneOffEvents(events, now, opts) {
    now = now == null ? Date.now() : now;
    const sportOk = !!(opts && opts.sport);
    const raw = (events || []).filter(ev => ev && ev.title && stillOn(ev, now));
    const byTitle = new Map();
    for (const ev of raw) {
      if (recurId(ev) || isMovieListing(ev) || isFar(ev) || recurName(ev)) continue;
      if (isSport(ev) && !sportOk) continue;
      const key = normTitle(ev.title) || ev.title;
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(ev);
    }
    const out = [];
    for (const [, list] of byTitle) {
      list.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
      const dates = list.map(e => e.date);
      if (weeklyish(dates) || scatteredSeries(dates)) continue;
      const first = list[0], last = list[list.length - 1];
      const end = last.end && last.end > last.date ? last.end : last.date;
      out.push({
        id: first.id,
        title: first.title,
        url: first.url || '',
        date: first.date,
        end: end !== first.date ? end : (first.end || ''),
        time: first.time || '',
        endTime: last.endTime || first.endTime || '',
        timeKnown: first.timeKnown,
        venue: first.venue || '',
        desc: first.desc || '',
        cats: first.cats || [],
        img: first.img || first.image || '',
        sport: isSport(first),
        dates: [...new Set(dates)]
      });
    }
    out.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    return out;
  }

  function developmentItems(items, now) {
    now = now == null ? Date.now() : now;
    const seen = new Set();
    const out = [];
    for (const it of items || []) {
      if (!it || !it.title || !it.url) continue;
      if (!DEV_SRC.test(it.src || '')) continue;
      const text = [it.title, it.desc].join(' ');
      if (DEV_DROP.test(text) || DEV_FAR.test(text)) continue;
      if (!DEV_KEEP.test(text)) continue;
      const key = normTitle(it.title) || it.url;
      if (seen.has(key) || seen.has(it.url)) continue;
      seen.add(key); seen.add(it.url);
      out.push({
        title: it.title,
        url: it.url,
        src: it.src || '',
        desc: it.desc || '',
        published: it.published || it.first || '',
        img: it.img || it.image || '',
        kind: it.kind || 'dev'
      });
    }
    out.sort((a, b) => String(b.published).localeCompare(String(a.published)));
    return out;
  }

  function evCard(i) {
    const e = i.event || i;
    const when = evWhen(e);
    const venue = String(e.venue || '').trim();
    const sub = [venue, when].filter(Boolean).join(' · ');
    const tag = e.sport ? 'Sport' : 'Whangārei';
    const xh = typeof root.xHead === 'function' ? root.xHead(e.sport ? '🏃' : '📅', 'What’s on', sub || 'Whangārei', tag) : '';
    const img = e.img || 'img/event.svg';
    const blurb = clip(e.desc, 180) || (when + (venue ? ' at ' + venue : '') + '.');
    const href = e.url || '';
    const media = href
      ? `<a class="media" href="${esc(href)}" target="_blank" rel="noopener"><img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`
      : `<div class="media"><img src="${esc(img)}" alt="" loading="lazy"></div>`;
    const btns = href ? `<div class="xbtns"><a class="btn pri" href="${esc(href)}" target="_blank" rel="noopener">Event details ↗</a></div>` : '';
    return `<article class="card xc whgev" data-id="${esc(i.id)}" data-topic="events" style="--c1:${e.sport ? '#b45309' : '#0f766e'};--c2:#0369a1">${xh}
      ${media}
      <div class="bd"><h3>${esc(e.title)}</h3>
      <p>${esc(blurb)}</p>
      <p>${esc([when, venue].filter(Boolean).join(' · '))}</p>
      ${btns}
      <p class="plsrc">What’s on around Whangārei</p></div></article>`;
  }

  function devCard(i) {
    const d = i.dev || i;
    const when = d.published ? fmtDay(String(d.published).slice(0, 10)) : '';
    const sub = [d.src, when].filter(Boolean).join(' · ');
    const xh = typeof root.xHead === 'function' ? root.xHead('🚧', 'Around Whangārei', sub || 'Local developments', 'Whangārei') : '';
    const img = d.img || 'img/whg-dev.svg';
    const blurb = clip(d.desc, 200) || (d.title + (d.src ? ' — ' + d.src : ''));
    const href = d.url || '';
    const media = href
      ? `<a class="media" href="${esc(href)}" target="_blank" rel="noopener"><img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`
      : `<div class="media"><img src="${esc(img)}" alt="" loading="lazy"></div>`;
    const btns = href ? `<div class="xbtns"><a class="btn pri" href="${esc(href)}" target="_blank" rel="noopener">Read the story ↗</a></div>` : '';
    return `<article class="card xc whgdev" data-id="${esc(i.id)}" data-topic="news" style="--c1:#9a3412;--c2:#0f766e">${xh}
      ${media}
      <div class="bd"><h3>${esc(d.title)}</h3>
      <p>${esc(blurb)}</p>
      ${btns}
      <p class="plsrc">${esc(d.src || 'Local news')}</p></div></article>`;
  }

  function sportAskCard(i) {
    const xh = typeof root.xHead === 'function' ? root.xHead('🏃', 'A question for you', 'One-off events around Whangārei', 'Whangārei') : '';
    return `<article class="card xc sportask" data-id="${esc((i && i.id) || 'whg-sport-ask')}" data-topic="events" style="--c1:#b45309;--c2:#0f766e">${xh}
      <div class="bd"><h3>Want local sport events in your feed?</h3>
      <p>Things like a one-off match, race or meet around Whangārei. Recurring games and sport news from the rest of Info Book stay out. You can change this later in Settings → Interests.</p>
      <div class="xbtns"><button type="button" class="btn pri" data-whg-sport="yes">Yes</button><button type="button" class="btn" data-whg-sport="no">No</button></div>
      </div></article>`;
  }

  function slotBusy(x) {
    return x && (x.x === 'play' || x.x === 'zoomq' || x.x === 'fallq' || x.x === 'tetq' || x.x === 'cine' || x.x === 'whgev' || x.x === 'whgdev' || x.x === 'sportask' || x.x === 'relask' || (x.x === 'row' && (x.k === 'cine' || x.k === 'whg-ev' || x.k === 'whg-dev' || x.k === 'akl-con' || x.k === 'top40' || x.k === 'religion' || x.k === 'vidrow')));
  }
  function place(order, nPins, card, now, bias) {
    if (!card) return order;
    const out = order.slice(), lo = Math.max(nPins | 0, 2);
    const day = Math.floor((now || Date.now()) / 864e5);
    let at = Math.min(out.length, lo + bias + (day % 3));
    let g = 0; while (g++ < 8 && (slotBusy(out[at]) || slotBusy(out[at - 1]) || slotBusy(out[at + 1]))) at = Math.min(out.length, at + 3);
    out.splice(at, 0, card);
    return out;
  }
  function evItem(e, day) {
    return {
      id: 'whgev-' + String(e.id || e.title).replace(/\W+/g, '').slice(0, 40) + '-' + day,
      x: 'whgev', kind: 'event', ev: evMs(e), t: e.title, s: e.venue, url: e.url,
      event: e, topic: 'events'
    };
  }
  function insertEvents(order, nPins, events, now) {
    const list = (events || []).slice(0, MAX_EVENTS);
    if (!list.length) return order;
    const day = Math.floor((now || Date.now()) / 864e5);
    const items = list.map(e => evItem(e, day));
    const card = items.length === 1
      ? items[0]
      : { id: 'whgev-row-' + day, x: 'row', k: 'whg-ev', title: 'What’s on around Whangārei', items, topic: 'events' };
    return place(order, nPins, card, now, 16);
  }
  function insertDevelopments(order, nPins, items, now) {
    const list = (items || []).slice(0, MAX_DEVS);
    if (!list.length) return order;
    const day = Math.floor((now || Date.now()) / 864e5);
    let out = order;
    list.forEach((d, n) => {
      const card = {
        id: 'whgdev-' + String(d.url || d.title).replace(/\W+/g, '').slice(0, 48) + '-' + day,
        x: 'whgdev', t: d.title, url: d.url, dev: d, topic: 'news'
      };
      out = place(out, nPins, card, now, 21 + n * 4);
    });
    return out;
  }
  function insertSportAsk(order, nPins, now, env) {
    if (!shouldAskSport(env)) return order;
    const day = Math.floor((now || Date.now()) / 864e5);
    return place(order, nPins, { id: 'whg-sport-ask-' + day, x: 'sportask', topic: 'events', t: 'Want local sport events in your feed?' }, now, 8);
  }

  function cachedEvents() {
    if (root.ibNz && typeof root.ibNz.cachedEvents === 'function') return root.ibNz.cachedEvents();
    try {
      const raw = root.localStorage && root.localStorage.getItem(root.ibNz && root.ibNz.CACHE || 'ib.cineWhg');
      if (!raw) return [];
      const pack = JSON.parse(raw);
      if (!pack || Date.now() - pack.at > 6 * 3600e3) return [];
      return Array.isArray(pack.events) ? pack.events : [];
    } catch (e) { return []; }
  }
  function cachedDevs() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(CACHE_DEV);
      if (!raw) return null;
      const pack = JSON.parse(raw);
      if (!pack || Date.now() - pack.at > 6 * 3600e3) return null;
      return Array.isArray(pack.items) ? pack.items : null;
    } catch (e) { return null; }
  }

  function insertLocal(order, nPins, now, events, devs, env) {
    now = now == null ? Date.now() : now;
    const evs = oneOffEvents(events == null ? cachedEvents() : events, now, { sport: sportEventsOn(env) });
    const dlist = developmentItems(devs == null ? (cachedDevs() || []) : devs, now);
    order = insertSportAsk(order, nPins, now, env);
    order = insertEvents(order, nPins, evs, now);
    order = insertDevelopments(order, nPins, dlist, now);
    return order;
  }

  root.ibWhg = {
    oneOffEvents, developmentItems, evCard, devCard, sportAskCard,
    insertEvents, insertDevelopments, insertSportAsk, insertLocal,
    stillOn, isSport, isFar, isMovieListing, isShaneProfile, sportEventsOn,
    shouldAskSport, setSportEvents, showSportSettings, sportPref,
    normTitle, weeklyish, scatteredSeries,
    RELAY_PLAN, CACHE_DEV, SPORT_KEY, MAX_EVENTS, MAX_DEVS
  };
  root.setSportEvents = setSportEvents;

  if (!root.document) return;

  const prevCard = root.card;
  root.card = function (i) {
    if (i && i.x === 'whgev') return evCard(i);
    if (i && i.x === 'whgdev') return devCard(i);
    if (i && i.x === 'sportask') return sportAskCard(i);
    return prevCard ? prevCard(i) : '';
  };
  const prevFest = root.festive;
  root.festive = function (order, nPins) {
    order = prevFest ? prevFest(order, nPins) : (order || []);
    return insertLocal(order, nPins, Date.now());
  };

  root.document.addEventListener('click', ev => {
    const b = ev.target && ev.target.closest && ev.target.closest('[data-whg-sport]');
    if (!b) return;
    ev.preventDefault();
    setSportEvents(b.getAttribute('data-whg-sport') === 'yes');
  });

  let drew = false;
  function maybeDraw(had) {
    if (had || drew) return;
    if (typeof root.draw !== 'function') return;
    drew = true;
    try { root.draw(); } catch (e) { drew = false; }
  }
  function saveDevs(items, had) {
    try { root.localStorage.setItem(CACHE_DEV, JSON.stringify({ at: Date.now(), items: items || [] })); } catch (e) {}
    maybeDraw(had);
  }
  function fallbackUrl() {
    const src = (root.document.currentScript && root.document.currentScript.src) || '';
    const v = /[?&]v=([^&]+)/.exec(src);
    return 'whg-local.json' + (v ? '?v=' + v[1] : '');
  }
  function loadFallback() {
    return fetch(fallbackUrl(), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('fallback ' + r.status); return r.json(); });
  }
  function refresh() {
    const had = !!cachedDevs();
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ac ? setTimeout(() => ac.abort(), 20000) : 0;
    fetch(RELAY_PLAN, { headers: { Accept: 'application/json' }, signal: ac ? ac.signal : undefined }).then(r => {
      if (!r.ok) throw new Error('planning ' + r.status);
      return r.json();
    }).then(j => {
      const items = j && Array.isArray(j.items) ? j.items : [];
      saveDevs(items, had);
    }).catch(() => {
      loadFallback().then(j => {
        const items = j && (j.planning && j.planning.items || j.items);
        if (Array.isArray(items)) saveDevs(items, had);
      }).catch(() => {});
    }).finally(() => clearTimeout(timer));
  }
  setTimeout(refresh, 450);
})(typeof window !== 'undefined' ? window : globalThis);
