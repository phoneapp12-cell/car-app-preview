/* 1.9.124 A short opening portal. Once per browser session, not on scroll or topic changes.
   Skipped when the phone asks for less motion. The feed keeps loading underneath. */
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
  doc.documentElement.classList.add('portal-on');
  const el = doc.createElement('div');
  el.id = 'ibportal';
  el.setAttribute('aria-hidden', 'true');
  const beams = [18, 36, 50, 64, 82].map((x, i) => `<i class="beam" style="left:${x}%;animation-delay:${(i * 0.16).toFixed(2)}s"></i>`).join('');
  const sparks = [24, 42, 58, 76, 33, 67].map((x, i) => `<i class="spark" style="left:${x}%;animation-delay:${(0.08 + i * 0.17).toFixed(2)}s"></i>`).join('');
  el.innerHTML = `<div class="stage">${beams}${sparks}<i class="ring a"></i><i class="ring b"></i><i class="ring c"></i></div>`;
  doc.body.append(el);

  let rose = false, done = false, timer = 0;
  const cards = () => doc.querySelectorAll('#feed > .card, #feed > .hrow');
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    doc.removeEventListener('pointerdown', finish, true);
    cards().forEach(n => n.classList.remove('portal-rise'));
    el.classList.add('out');
    doc.documentElement.classList.remove('portal-on');
    setTimeout(() => { if (el.parentNode) el.remove(); }, 380);
  }
  doc.addEventListener('pointerdown', finish, true);
  root.ibPortalRise = function () {
    if (done || !el.isConnected) return;
    const list = cards();
    if (!list.length || list[0].classList.contains('portal-rise')) return;
    const n = Math.min(4, list.length);
    for (let i = 0; i < n; i++) {
      list[i].style.setProperty('--rise', (i * 0.12) + 's');
      list[i].classList.add('portal-rise');
    }
    if (rose) return;
    rose = true;
    clearTimeout(timer);
    timer = setTimeout(finish, 1500);
  };
  timer = setTimeout(() => { if (!rose) finish(); }, 2200);
})(typeof window !== 'undefined' ? window : globalThis);
