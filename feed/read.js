/* 1.9.108 Reading time as a small, local nudge for the next ranking.
   Counts only while a text card is actually on screen, the app is visible and
   focused, and the person has touched or scrolled in the last 45s.
   Hidden tabs, idle time, and time on another website are not counted.
   Nothing is sent off this phone. Ranking is not redrawn mid-read. */
(function (root) {
  const MIN_MS = 8000, CAP_MS = 120000, IDLE_MS = 45000, HALFLIFE = 21 * 864e5, KEEP = 60 * 864e5, MAX_ITEMS = 160;
  const KEY = 'readDw';
  function blank() { return { items: {} }; }
  function creditMs(prevActive, active, gap) {
    if (!prevActive || !active) return 0;
    if (!(gap > 0) || gap >= 2000) return 0;
    return gap;
  }
  function prune(model, now) {
    const items = model.items || {};
    const ids = Object.keys(items).filter(id => items[id] && items[id].sec && now - (items[id].at || 0) <= KEEP);
    ids.sort((a, b) => (items[b].at || 0) - (items[a].at || 0));
    const next = {};
    ids.slice(0, MAX_ITEMS).forEach(id => { next[id] = items[id]; });
    model.items = next;
    return model;
  }
  function note(model, rec, now) {
    model = model || blank();
    model.items = model.items || {};
    if (!rec || rec.away || !rec.active || !rec.id || !rec.topic || !(rec.ms > 0)) return model;
    const it = model.items[rec.id] || { sec: 0, visit: 0, at: now, topic: rec.topic };
    it.topic = rec.topic;
    it.visit = (it.visit || 0) + rec.ms;
    it.at = now;
    model.items[rec.id] = it;
    return model;
  }
  function finish(model, id, now) {
    model = model || blank();
    const it = model.items && model.items[id];
    if (!it) return model;
    if ((it.visit || 0) >= MIN_MS) {
      const room = Math.max(0, CAP_MS - (it.sec || 0));
      it.sec = (it.sec || 0) + Math.min(room, it.visit);
      it.at = now || Date.now();
    }
    it.visit = 0;
    if (!it.sec) delete model.items[id];
    return prune(model, now || Date.now());
  }
  function boost(model, topic, now) {
    if (!model || !topic) return 0;
    let sec = 0;
    for (const it of Object.values(model.items || {})) {
      if (!it || it.topic !== topic || !it.sec) continue;
      const age = Math.max(0, (now || Date.now()) - (it.at || 0));
      if (age > KEEP) continue;
      sec += (it.sec / 1000) * Math.pow(0.5, age / HALFLIFE);
    }
    return Math.min(0.22, (sec / 90) * 0.22);
  }
  function factor(voteWeight, b) { const w = Number(voteWeight) || 1; return Math.min(2.5, Math.max(0.3, w * (1 + Math.min(0.22, b || 0)))); }
  function articleOk(text, opts) {
    const n = String(text || '').trim().length;
    if (n < 80) return false;
    if (opts && opts.video && !opts.expanded && n < 160) return false;
    return true;
  }
  root.ibRead = { KEY, MIN_MS, CAP_MS, IDLE_MS, creditMs, note, finish, boost, factor, articleOk, blank, redraws: false };
  function readW(i) {
    if (!i || !i.topic || i.topic === 'life' || i.topic === 'all') return 1;
    try {
      const store = (typeof root.ls === 'object' && root.ls.get) ? root.ls.get(KEY, blank()) : blank();
      return 1 + boost(store, i.topic, Date.now());
    } catch (e) { return 1; }
  }
  root.readW = readW;
  if (!root.document) return;
  const visits = new Map();
  let prevOn = false, lastTick = 0, lastInput = Date.now();
  function bump() { lastInput = Date.now(); }
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(ev => root.addEventListener(ev, bump, { passive: true, capture: true }));
  function pageOn() {
    return root.document.visibilityState === 'visible' && root.document.hasFocus() && (Date.now() - lastInput) < IDLE_MS;
  }
  function save(model) { try { if (root.ls && root.ls.set) root.ls.set(KEY, model); } catch (e) {} }
  function load() { try { const s = root.ls && root.ls.get ? root.ls.get(KEY, blank()) : blank(); if (!s.items) s.items = {}; return s; } catch (e) { return blank(); } }
  function topicOf(id, el) {
    if (el && el.dataset && el.dataset.topic) return el.dataset.topic;
    try { const it = (root.order || []).find(x => x && x.id === id); return it && it.topic || ''; } catch (e) { return ''; }
  }
  function textOf(el) {
    const bits = [];
    el.querySelectorAll('.bd p, .bd li, .wtb, .plcopy, .xq, h3').forEach(n => bits.push(n.textContent || ''));
    return bits.join(' ');
  }
  function isArticle(el) {
    if (!el || el.closest('.stview, .stories')) return false;
    const video = !!el.querySelector('.media.vid, video');
    const expanded = !!el.querySelector('[data-more].open, .bd p.open');
    return articleOk(textOf(el), { video, expanded });
  }
  function mostly(el) {
    const r = el.getBoundingClientRect(), h = root.innerHeight || 0;
    if (!h || r.height < 40) return false;
    const vis = Math.max(0, Math.min(r.bottom, h) - Math.max(r.top, 0));
    return vis / Math.min(r.height, h) >= 0.55;
  }
  function flush(id) {
    const v = visits.get(id); if (!v) return;
    let model = load();
    if (v.acc > 0) model = note(model, { id, topic: v.topic, ms: v.acc, active: true }, Date.now());
    model = finish(model, id, Date.now());
    save(model);
    visits.delete(id);
  }
  function tick() {
    const now = Date.now();
    const visible = root.document.visibilityState === 'visible' && root.document.hasFocus();
    const on = pageOn();
    const gap = lastTick ? now - lastTick : 0;
    const credit = creditMs(prevOn, on, gap);
    prevOn = on;
    lastTick = now;
    if (!visible) { for (const id of [...visits.keys()]) flush(id); return; }
    const seen = new Set();
    root.document.querySelectorAll('#feed article.card[data-id]').forEach(el => {
      if (!mostly(el) || !isArticle(el)) return;
      const id = el.dataset.id, topic = topicOf(id, el); if (!topic) return;
      seen.add(id);
      const v = visits.get(id) || { topic, acc: 0 };
      v.topic = topic;
      if (on && credit) v.acc += credit;
      visits.set(id, v);
    });
    for (const id of [...visits.keys()]) if (!seen.has(id)) flush(id);
  }
  setInterval(tick, 1000);
  root.document.addEventListener('visibilitychange', () => { if (root.document.visibilityState !== 'visible') { prevOn = false; for (const id of [...visits.keys()]) flush(id, true); } });
  const prevSettings = root.settings;
  if (typeof prevSettings === 'function') root.settings = function () {
    prevSettings();
    const box = root.document.getElementById('sheetin'), anchor = box && box.querySelector('#resetv');
    if (!anchor || box.querySelector('#readnote')) return;
    const store = load(), now = Date.now();
    const topics = [...new Set(Object.values(store.items || {}).map(it => it.topic).filter(t => boost(store, t, now) >= 0.05))];
    const names = topics.map(t => (root.TOPIC && root.TOPIC[t] && root.TOPIC[t][1]) || t).slice(0, 4);
    anchor.insertAdjacentHTML('afterend', `<h2 id="readnote" style="margin-top:18px">Reading time</h2>
      <p>If you linger on a story card while Info Book is open and you are using the phone, that topic can show up a little more next time. It will not turn a topic back on, and a thumbs-down still counts for more. Time on another website is not counted, because Info Book cannot see it. This stays on this phone.</p>
      <p>${names.length ? 'A small nudge just now: ' + names.map(esc).join(', ') + '.' : 'No reading nudge yet.'}</p>
      <button class="btn" id="readreset" type="button">Clear reading time</button>`);
  };
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  // If the saved feed painted before these scripts wrapped card/festive, paint once more
  // before anyone has scrolled. Later updates wait for the next refresh.
  if (root.document.querySelector('#feed article') && !root.document.querySelector('article.puzzle, article.zoomq') && typeof root.draw === 'function' && (root.scrollY || 0) < 8) {
    try { root.draw(); } catch (e) {}
  }
  root.document.addEventListener('click', e => {
    if (!e.target || e.target.id !== 'readreset') return;
    if (!root.confirm || root.confirm('Clear reading time on this phone?')) {
      save(blank());
      const box = root.document.getElementById('sheet'); if (box) box.classList.remove('on');
      if (typeof root.toast === 'function') root.toast('Reading time cleared');
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
