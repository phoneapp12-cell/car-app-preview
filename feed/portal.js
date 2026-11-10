/* 1.9.126 Opening portal. Once per browser session, not on scroll or topic changes.
   The phone's own splash screen finishes before this runs, so they do not play together.
   Skipped when the phone asks for less motion. The feed keeps loading underneath.
   Rings stay behind the feed. Cards stay hidden until a rise animation starts,
   even when the card was already painted. The overlay fades with a CSS animation
   and the node is removed on animationend (timeout if the phone skips it). */
(function (root) {
  const KEY = 'ibPortal';
  function reduced() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
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
  (doc.body || doc.documentElement).prepend(el);

  let rose = false, done = false, timer = 0, hard = 0, bye = 0, armed = [];
  const cards = () => doc.querySelectorAll('#feed > .card, #feed > .hrow');
  function kill() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    clearTimeout(hard);
    clearTimeout(bye);
    doc.removeEventListener('pointerdown', finish, true);
    if (el.parentNode) el.remove();
    doc.documentElement.classList.remove('portal-on');
    doc.querySelectorAll('.portal-rise').forEach(n => {
      n.classList.add('portal-rose');
      n.classList.remove('portal-rise');
    });
  }
  function finish() {
    if (done || el.classList.contains('out')) return;
    clearTimeout(timer);
    clearTimeout(hard);
    doc.removeEventListener('pointerdown', finish, true);
    el.classList.add('out');
    el.addEventListener('animationend', ev => {
      if (ev.target !== el || !el.classList.contains('out')) return;
      if (ev.animationName && ev.animationName !== 'portalFade') return;
      kill();
    });
    bye = setTimeout(kill, 900);
  }
  doc.addEventListener('pointerdown', finish, true);
  // The rise class is added on a later frame. A class set in the same turn the
  // card is inserted can be skipped on mobile Safari, which leaves the card popped
  // in at full size. Two frames of the hidden rule, then the animation runs.
  function stamp() {
    if (done || !el.isConnected) return;
    const list = Array.prototype.slice.call(cards(), 0, 4).filter(n => !n.classList.contains('portal-rise') && !n.classList.contains('portal-rose') && n.dataset.riseArm !== '1');
    if (!list.length) return;
    // A later script can replace the feed after the first paint. Those new cards
    // have to rise too, and the fade waits for that rise instead of the old one.
    const replaced = armed.length > 0 && armed.every(n => !n.isConnected);
    list.forEach((n, i) => {
      n.dataset.riseArm = '1';
      n.style.setProperty('--rise', (i * 0.12) + 's');
    });
    armed = list.slice();
    const go = () => {
      if (done) return;
      list.forEach(n => { if (n.isConnected) n.classList.add('portal-rise'); });
      if (rose && !replaced) return;
      rose = true;
      if (el.classList.contains('out')) el.classList.remove('out');
      clearTimeout(bye);
      clearTimeout(timer);
      timer = setTimeout(finish, 1200);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(go));
    else setTimeout(go, 32);
  }
  root.ibPortalRise = stamp;
  const feed = doc.getElementById('feed');
  if (feed && typeof MutationObserver === 'function') {
    const mo = new MutationObserver(() => stamp());
    mo.observe(feed, { childList: true });
    setTimeout(() => mo.disconnect(), 6000);
  }
  stamp();
  hard = setTimeout(() => { if (!done && el.isConnected) finish(); }, 5000);
})(typeof window !== 'undefined' ? window : globalThis);
