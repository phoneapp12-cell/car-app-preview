/* 1.9.127 Opening portal. Once per browser session, not on scroll or topic changes.
   The phone's own splash screen finishes before this runs, so they do not play together.
   Skipped when the phone asks for less motion.
   The rise is a Web Animations clip on copies that live outside the feed. A feed
   refresh used to delete the animating cards, so the rings showed for a second and
   the real cards then popped in full size. These copies keep travelling. */
(function (root) {
  const KEY = 'ibPortal';
  const DUR = 1100;
  const STAGGER = 180;
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
  if (reduced()) return;
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
  (doc.body || doc.documentElement).prepend(el);
  el.insertAdjacentElement('afterend', layer);
  dbg('start', { phase: 'portal', mode: (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) ? 'standalone' : 'browser' });

  let done = false, started = false, riseDone = false, fadeDone = false, tries = 0;
  let timer = 0, hard = 0, bye = 0;
  const anims = [];
  const cards = () => doc.querySelectorAll('#feed > .card, #feed > .hrow');

  function kill() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    clearTimeout(hard);
    clearTimeout(bye);
    doc.removeEventListener('pointerdown', skip, true);
    anims.forEach(a => { try { a.cancel(); } catch (e) {} });
    if (layer.parentNode) layer.remove();
    if (el.parentNode) el.remove();
    doc.documentElement.classList.remove('portal-on');
    doc.querySelectorAll('.portal-rise').forEach(n => {
      n.classList.add('portal-rose');
      n.classList.remove('portal-rise');
    });
  }
  function maybeKill() {
    if (!done && riseDone && fadeDone) kill();
  }
  function finish() {
    if (done || el.classList.contains('out')) return;
    clearTimeout(hard);
    el.classList.add('out');
    dbg('start', { name: 'portalFade' });
    el.addEventListener('animationend', ev => {
      if (ev.target !== el || !el.classList.contains('out')) return;
      if (ev.animationName && ev.animationName !== 'portalFade') return;
      dbg('finish', { name: 'portalFade' });
      fadeDone = true;
      clearTimeout(bye);
      maybeKill();
    });
    bye = setTimeout(() => {
      if (fadeDone || done) return;
      dbg('finish', { name: 'portalFade', timeout: true });
      fadeDone = true;
      maybeKill();
    }, 900);
  }
  function skip() {
    if (done) return;
    riseDone = true;
    fadeDone = true;
    kill();
  }
  doc.addEventListener('pointerdown', skip, true);

  function ringBox() {
    const ring = el.querySelector('.ring.a');
    const b = ring && ring.getBoundingClientRect();
    if (b && b.width > 20 && b.height > 8) return b;
    const w = root.innerWidth || 360, h = root.innerHeight || 700;
    return { left: w * 0.08, width: w * 0.84, top: h * 0.62, height: Math.max(36, h * 0.1) };
  }
  function begin(list) {
    const ring = ringBox();
    const ringCx = ring.left + ring.width / 2;
    const ringCy = ring.top + ring.height * 0.5;
    let pending = 0;
    list.forEach((card, i) => {
      if (!card.isConnected) return;
      const end = card.getBoundingClientRect();
      if (end.width < 20 || end.height < 20) return;
      const ghost = card.cloneNode(true);
      ghost.removeAttribute('id');
      ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      ghost.querySelectorAll('iframe, video, audio').forEach(node => node.remove());
      ghost.classList.add('ib-ghost');
      ghost.style.animation = 'none';
      ghost.style.visibility = 'visible';
      ghost.style.position = 'fixed';
      ghost.style.boxSizing = 'border-box';
      ghost.style.left = end.left + 'px';
      ghost.style.top = end.top + 'px';
      ghost.style.width = end.width + 'px';
      ghost.style.height = end.height + 'px';
      ghost.style.margin = '0';
      ghost.style.zIndex = String(12 - i);
      ghost.style.transformOrigin = '50% 50%';
      ghost.style.pointerEvents = 'none';
      layer.appendChild(ghost);
      const dx = Math.round(ringCx - (end.left + end.width / 2));
      const dy = Math.round(ringCy - (end.top + end.height / 2));
      let anim;
      try {
        anim = ghost.animate([
          { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) scale(0.3)', opacity: 0.48, clipPath: 'ellipse(44% 38% at 50% 60%)', offset: 0 },
          { transform: 'translate3d(' + Math.round(dx * 0.72) + 'px,' + Math.round(dy * 0.72) + 'px,0) scale(0.42)', opacity: 0.62, clipPath: 'ellipse(52% 46% at 50% 58%)', offset: 0.38 },
          { transform: 'translate3d(' + Math.round(dx * 0.28) + 'px,' + Math.round(dy * 0.28) + 'px,0) scale(0.78)', opacity: 0.9, clipPath: 'ellipse(100% 96% at 50% 52%)', offset: 0.72 },
          { transform: 'translate3d(0px,0px,0) scale(1)', opacity: 1, clipPath: 'ellipse(150% 150% at 50% 50%)', offset: 1 }
        ], { duration: DUR, delay: i * STAGGER, easing: 'linear', fill: 'both' });
      } catch (err) { return; }
      anims.push(anim);
      pending++;
      dbg('start', { card: i, dur: DUR, delay: i * STAGGER, dx: dx, dy: dy });
      let closed = false;
      const ended = why => {
        if (closed) return;
        closed = true;
        dbg('finish', { card: i, why: why });
        pending--;
        if (pending <= 0) { riseDone = true; maybeKill(); }
      };
      anim.addEventListener('finish', () => ended('finish'));
      anim.addEventListener('cancel', () => ended('cancel'));
    });
    if (!anims.length) {
      started = false;
      if (tries++ < 8 && !done) {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(stamp);
        else setTimeout(stamp, 32);
      }
      return;
    }
    timer = setTimeout(finish, 780);
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
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(go));
    else setTimeout(go, 32);
  }
  root.ibPortalRise = stamp;
  const feed = doc.getElementById('feed');
  if (feed && typeof MutationObserver === 'function') {
    const mo = new MutationObserver(() => { if (!started) stamp(); });
    mo.observe(feed, { childList: true });
    setTimeout(() => mo.disconnect(), 6000);
  }
  stamp();
  hard = setTimeout(() => { if (!done && el.isConnected) kill(); }, 5000);
})(typeof window !== 'undefined' ? window : globalThis);
