/* 1.9.125 Opening portal. Once per browser session, not on scroll or topic changes.
   The phone's own splash screen finishes before this runs, so they do not play together.
   Skipped when the phone asks for less motion. The feed keeps loading underneath.
   Rings stay behind the feed and fade out with the dark overlay. */
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
  doc.body.append(el);

  let rose = false, done = false, timer = 0, hard = 0;
  const cards = () => doc.querySelectorAll('#feed > .card, #feed > .hrow');
  function kill() {
    if (el.parentNode) el.remove();
    doc.documentElement.classList.remove('portal-on');
    doc.querySelectorAll('.portal-rise').forEach(n => n.classList.remove('portal-rise'));
  }
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    clearTimeout(hard);
    doc.removeEventListener('pointerdown', finish, true);
    el.classList.add('out');
    el.addEventListener('animationend', ev => { if (ev.target === el) kill(); });
    hard = setTimeout(kill, 700);
  }
  doc.addEventListener('pointerdown', finish, true);
  root.ibPortalRise = function () {
    if (done || !el.isConnected) return;
    const list = cards();
    if (!list.length) return;
    const n = Math.min(4, list.length);
    let stamped = false;
    for (let i = 0; i < n; i++) {
      if (list[i].classList.contains('portal-rise')) continue;
      list[i].style.setProperty('--rise', (i * 0.1) + 's');
      list[i].classList.add('portal-rise');
      stamped = true;
    }
    if (!stamped || rose) return;
    rose = true;
    clearTimeout(timer);
    timer = setTimeout(finish, 1000);
  };
  // No cards yet: keep the portal up until they arrive, then fade with them.
  // If the feed never comes, take the portal down anyway.
  hard = setTimeout(() => { if (!done && el.isConnected) finish(); }, 5000);
})(typeof window !== 'undefined' ? window : globalThis);
