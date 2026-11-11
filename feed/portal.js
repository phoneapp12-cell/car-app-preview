/* 1.9.140 Opening portal. Once per app open, not on scroll or topic changes.
   Skipped only when the phone asks for less motion (logged with ?portaldebug=1).
   The rise is a CSS animation on plain copies that sit above the rings. Nothing
   clips them, and their parents are not transformed, so a phone can paint it.
   The class is added on a later frame, after the copies have been drawn. */
(function (root) {
  const KEY = 'ibPortal';
  function reduced() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function debugging() {
    try { return /(?:\?|&)portaldebug=1(?:&|$)/.test((root.location && root.location.search) || ''); } catch (e) { return false; }
  }
  const debug = debugging();
  function dbg(kind, detail) {
    if (!debug) return;
    try {
      if (kind === 'finish') console.log('[portal] finish', detail == null ? '' : detail);
      else console.log('[portal] start', detail == null ? '' : detail);
    } catch (e) {}
  }
  root.ibPortal = { KEY, reduced };
  root.ibPortalRise = function () {};
  if (!root.document || !root.sessionStorage) return;
  if (reduced()) {
    dbg('start', { skip: 'reduced-motion' });
    return;
  }
  try {
    if (root.sessionStorage.getItem(KEY) === '1') return;
    root.sessionStorage.setItem(KEY, '1');
  } catch (e) { return; }

  const doc = root.document;
  if (doc.getElementById('ibportal')) return;
  doc.documentElement.classList.add('portal-on');
  const el = doc.createElement('div');
  el.id = 'ibportal';
  el.setAttribute('aria-hidden', 'true');
  const beams = [18, 36, 50, 64, 82].map((x, i) => `<i class="beam" style="left:${x}%;animation-delay:${(i * 0.16).toFixed(2)}s"></i>`).join('');
  const sparks = [24, 42, 58, 76, 33, 67].map((x, i) => `<i class="spark" style="left:${x}%;animation-delay:${(0.08 + i * 0.17).toFixed(2)}s"></i>`).join('');
  el.innerHTML = `<div class="stage">${beams}${sparks}<i class="ring a"></i><i class="ring b"></i><i class="ring c"></i></div>`;
  const layer = doc.createElement('div');
  layer.id = 'ibrise';
  layer.setAttribute('aria-hidden', 'true');
  (doc.body || doc.documentElement).append(el, layer);

  let done = false, started = false, tries = 0;
  let timer = 0, hard = 0, bye = 0, left = 0;
  const cards = () => doc.querySelectorAll('#feed > .card, #feed > .hrow');

  function kill() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    clearTimeout(hard);
    clearTimeout(bye);
    doc.removeEventListener('pointerdown', skip, true);
    if (layer.parentNode) layer.remove();
    if (el.parentNode) el.remove();
    doc.documentElement.classList.remove('portal-on');
    doc.querySelectorAll('.portal-rise').forEach(n => {
      n.classList.add('portal-rose');
      n.classList.remove('portal-rise');
    });
  }
  function fade() {
    if (done || el.classList.contains('out')) return;
    el.classList.add('out');
    dbg('start', { name: 'portalFade' });
    el.addEventListener('animationend', ev => {
      if (ev.target !== el || !el.classList.contains('out')) return;
      if (ev.animationName && ev.animationName !== 'portalFade') return;
      dbg('finish', { name: 'portalFade' });
      clearTimeout(bye);
      kill();
    });
    bye = setTimeout(kill, 700);
  }
  function reveal() {
    if (done) return;
    fade();
  }
  function skip() {
    if (done) return;
    kill();
  }
  doc.addEventListener('pointerdown', skip, true);

  function ringBox() {
    const ring = el.querySelector('.ring.a');
    const b = ring && ring.getBoundingClientRect();
    if (b && b.width > 20 && b.height > 8) return b;
    const w = root.innerWidth || 390, h = root.innerHeight || 800;
    return { left: w * 0.08, width: w * 0.84, top: h * 0.62, height: Math.max(40, h * 0.12) };
  }
  function begin(list) {
    const ring = ringBox();
    const ringCy = ring.top + ring.height / 2;
    const ghosts = [];
    list.forEach((card, i) => {
      if (!card.isConnected) return;
      const end = card.getBoundingClientRect();
      const viewH = root.innerHeight || 800;
      const w = end.width > 40 ? end.width : Math.max(160, (root.innerWidth || 390) - 24);
      // A face of the card, not the whole article. A very tall card would sit
      // on the ring already and would not look like it was rising out of it.
      const h = Math.min(Math.max(end.height || 0, 260), Math.round(viewH * 0.5));
      const left = end.width > 40 ? end.left : 12;
      const top = end.top > 0 && end.top < viewH ? end.top : (92 + i * 12);
      const dy = Math.round(ringCy - (top + h / 2));
      const ghost = card.cloneNode(true);
      ghost.removeAttribute('id');
      ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      ghost.querySelectorAll('iframe, video, audio').forEach(node => node.remove());
      ghost.classList.add('ib-ghost');
      ghost.style.position = 'fixed';
      ghost.style.boxSizing = 'border-box';
      ghost.style.left = left + 'px';
      ghost.style.top = top + 'px';
      ghost.style.width = w + 'px';
      ghost.style.height = h + 'px';
      ghost.style.margin = '0';
      ghost.style.zIndex = '100';
      ghost.style.visibility = 'visible';
      ghost.style.setProperty('--dy', dy + 'px');
      ghost.style.setProperty('--rise', (i * 0.3) + 's');
      ghost.style.transform = 'translateY(' + dy + 'px) scale(0.4)';
      ghost.style.opacity = '0.6';
      layer.appendChild(ghost);
      ghosts.push(ghost);
    });
    if (!ghosts.length) {
      started = false;
      if (tries++ < 8 && !done) {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(stamp);
        else setTimeout(stamp, 32);
      }
      return;
    }
    const arm = () => {
      if (done) return;
      clearTimeout(hard);
      left = ghosts.length;
      ghosts.forEach((ghost, i) => {
        if (!ghost.isConnected) { left--; return; }
        ghost.classList.add('ib-go');
        dbg('start', { card: i, animation: 'ibRise', delay: (i * 0.3) + 's' });
        ghost.addEventListener('animationend', ev => {
          if (ev.target !== ghost) return;
          if (ev.animationName && ev.animationName !== 'ibRise') return;
          dbg('finish', { card: i, animation: 'ibRise' });
          left--;
          if (left <= 0) reveal();
        });
      });
      if (left <= 0) { reveal(); return; }
      timer = setTimeout(reveal, 2100);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(arm));
    else setTimeout(arm, 32);
  }
  function stamp() {
    if (done || started || !el.isConnected) return;
    const picked = Array.prototype.slice.call(cards(), 0, 3);
    if (!picked.length) return;
    started = true;
    const go = () => {
      if (done) return;
      const live = picked.filter(n => n.isConnected);
      const use = live.length ? live : Array.prototype.slice.call(cards(), 0, 3);
      if (!use.length) { started = false; return; }
      begin(use);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go);
    else go();
  }
  root.ibPortalRise = stamp;
  const feed = doc.getElementById('feed');
  if (feed && typeof MutationObserver === 'function') {
    const mo = new MutationObserver(() => { if (!started) stamp(); });
    mo.observe(feed, { childList: true });
    setTimeout(() => mo.disconnect(), 6000);
  }
  stamp();
  hard = setTimeout(() => { if (!done && el.isConnected) kill(); }, 6000);
})(typeof window !== 'undefined' ? window : globalThis);
