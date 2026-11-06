/* 1.9.69 ✨ special effects: confetti, floating reaction emoji, weather and NZ seasonal effects, gentle photo zoom, card
   shimmer, joke pop and a glowing streak flame. Short and subtle; skipped when the phone asks for reduced motion. */
(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const off = () => RM.matches;
let layer;
function fxLayer() { if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.id = 'fxl'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); } return layer; }
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
let lastX = innerWidth / 2, lastY = innerHeight / 2;
addEventListener('pointerdown', e => { lastX = e.clientX; lastY = e.clientY; }, { capture: true, passive: true });

/* 🎉 confetti burst from a point */
function confetti(x = innerWidth / 2, y = innerHeight / 3, n = 36) {
  if (off()) return; const L = fxLayer(), C = ['#ff7eb6', '#ffd84d', '#5fe0b6', '#6cc7ff', '#b18cff', '#ffa24c'];
  for (let k = 0; k < n; k++) { const i = document.createElement('i'); i.className = 'fxc'; const a = rnd(0, Math.PI * 2), v = rnd(70, 220);
    i.style.cssText = `left:${x}px;top:${y}px;background:${pick(C)};--dx:${Math.cos(a) * v}px;--dy:${Math.sin(a) * v - 80}px;--r:${rnd(-540, 540)}deg;--t:${rnd(.9, 1.5)}s;${Math.random() < .4 ? 'border-radius:50%;' : ''}`;
    L.appendChild(i); setTimeout(() => i.remove(), 1700); }
}
/* ❤️ floating emoji rising from where you tapped */
function floatUp(emo, x = lastX, y = lastY, n = 6) {
  if (off()) return; const L = fxLayer();
  for (let k = 0; k < n; k++) { const i = document.createElement('i'); i.className = 'fxf'; i.textContent = emo;
    i.style.cssText = `left:${x + rnd(-24, 24)}px;top:${y - 10}px;--dx:${rnd(-40, 40)}px;--t:${rnd(1.1, 1.8)}s;--d:${k * 70}ms;font-size:${rnd(20, 32)}px`;
    L.appendChild(i); setTimeout(() => i.remove(), 2300); }
}
/* ❄️🌧️🎆 ambient particles that drift down the screen for a few seconds */
function drift(chars, n = 18, secs = 7, cls = 'fxd') {
  if (off()) return; const L = fxLayer();
  for (let k = 0; k < n; k++) { const i = document.createElement('i'); i.className = cls; i.textContent = pick(chars);
    i.style.cssText = `left:${rnd(0, 100)}vw;--t:${rnd(secs * .6, secs)}s;--d:${rnd(0, secs * .5)}s;--dx:${rnd(-40, 40)}px;font-size:${rnd(14, 26)}px;opacity:${rnd(.55, .9)}`;
    L.appendChild(i); setTimeout(() => i.remove(), (secs * 1.6) * 1000); }
}
function rainFx(heavy) { if (off()) return; const L = fxLayer(), n = heavy ? 60 : 32;
  for (let k = 0; k < n; k++) { const i = document.createElement('i'); i.className = 'fxr'; i.style.cssText = `left:${rnd(0, 100)}vw;--t:${rnd(.6, 1)}s;--d:${rnd(0, 4)}s`; L.appendChild(i); setTimeout(() => i.remove(), 6500); } }
function sunFx() { if (off()) return; const i = document.createElement('i'); i.className = 'fxsun'; fxLayer().appendChild(i); setTimeout(() => i.remove(), 7000); }
function fireworks(n = 5) {
  if (off()) return; const C = ['#ff7eb6', '#ffd84d', '#5fe0b6', '#6cc7ff', '#b18cff', '#ff5e5e'];
  for (let k = 0; k < n; k++) setTimeout(() => { const L = fxLayer(), x = rnd(.15, .85) * innerWidth, y = rnd(.12, .4) * innerHeight, c = pick(C);
    for (let j = 0; j < 22; j++) { const i = document.createElement('i'); i.className = 'fxk'; const a = j / 22 * Math.PI * 2, v = rnd(60, 110);
      i.style.cssText = `left:${x}px;top:${y}px;background:${c};box-shadow:0 0 6px ${c};--dx:${Math.cos(a) * v}px;--dy:${Math.sin(a) * v}px`; L.appendChild(i); setTimeout(() => i.remove(), 1500); } }, k * 650 + rnd(0, 300));
}
window.fx = { confetti, floatUp, drift, fireworks, rainFx, sunFx };

/* reactions, polls and posts trigger effects (wraps the shared family request helper) */
const EM = { love: '❤️', haha: '😂', laugh: '😂', angry: '😠', wow: '😮', surprised: '😮', meh: '😐', cool: '😎', up: '👍' };
if (typeof window.fam === 'function') { const f0 = window.fam; window.fam = async function (path, opt = {}) {
  const r = await f0.apply(this, arguments);
  try { if (opt.method === 'POST') { const b = opt.body ? JSON.parse(opt.body) : {};
    if (path === '/likes' && b.on) floatUp(b.kind === 'up' ? '👍' : (EM[b.emo] || (window.EMO_CH && EMO_CH[b.emo]) || '❤️'));
    else if (/^\/comments\/.+\/like$/.test(path)) floatUp('👍', lastX, lastY, 4);
    else if (path === '/poll') confetti(lastX, lastY, 30);
    else if (path === '/shares' || path === '/shares/link') confetti(innerWidth / 2, innerHeight / 3, 50);
    else if (path === '/comments') floatUp('💬', lastX, lastY, 3); } } catch (e) { }
  return r; }; }

/* 😂 joke pop: a little shake + burst of laughing faces on the reveal */
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-joke]'); if (!b) return;
  setTimeout(() => { if (b.classList.contains('on')) { b.classList.remove('jpop'); void b.offsetWidth; b.classList.add('jpop'); const r = b.getBoundingClientRect(); floatUp(pick(['😂', '🤣', '😆']), r.left + r.width / 2, r.top, 5); } }, 0); });

/* 🔥 streak flame glows more the longer the streak */
function glow() { const el = document.getElementById('stchip'); if (!el || el.hidden) return; const n = parseInt(el.textContent.replace(/\D+/g, ' ').trim(), 10) || 0;
  el.style.setProperty('--glow', Math.min(1, n / 30).toFixed(2)); el.classList.toggle('glow', n >= 2); }
const sc = document.getElementById('stchip'); if (sc) { new MutationObserver(glow).observe(sc, { childList: true, attributes: true, attributeFilter: ['hidden'] }); glow(); }

/* ✨ shimmer once on every swipe-row card as it comes into view (and on the first one a quick highlight on its "Swipe" hint); slow gentle zoom on big photos while they're on screen;
   🎈 balloons the first time a birthday card shows;
   1.9.81 topic / "for [user]" pill (.tp) gently highlights once for 2s the first time each card comes into view */
const shimmered = new Set();
const io = new IntersectionObserver(es => es.forEach(e => { const c = e.target;
  if (e.isIntersecting) { c.classList.add('inv'); const id = c.dataset.id || '';
    if (!shimmered.has(id)) { shimmered.add(id);
      if (c.matches('.hscroll > .card') && !off()) { c.classList.add('shim'); setTimeout(() => c.classList.remove('shim'), 1400); const h = c.matches(':first-child') && c.closest('.hrow')?.querySelector('.hrhint'); if (h) { h.classList.remove('hrflash'); void h.offsetWidth; h.classList.add('hrflash'); setTimeout(() => h.classList.remove('hrflash'), 1800); } }
      // 1.9.81 gentle one-shot highlight on the topic / For [user] pill
      if (!off()) { const tp = c.querySelector('.hd .tp'); if (tp) { tp.classList.remove('tplash'); void tp.offsetWidth; tp.classList.add('tplash'); setTimeout(() => tp.classList.remove('tplash'), 2100); } }
      if (c.classList.contains('party')) { const r = c.getBoundingClientRect(); setTimeout(() => { drift(['🎈', '🎈', '🎉', '🎂'], 14, 6, 'fxb'); confetti(innerWidth / 2, r.top + 60, 40); }, 400); } } }
  else c.classList.remove('inv'); }), { threshold: .25 });
const watch = () => document.querySelectorAll('#feed .card:not([data-fxw])').forEach(c => { c.dataset.fxw = 1; io.observe(c); });
const feed = document.getElementById('feed'); if (feed) new MutationObserver(watch).observe(feed, { childList: true, subtree: true }); watch();

/* 🌦️ weather + 🇳🇿 seasonal effects, once per app open (a few seconds, then gone) */
const nz = new Date(new Date().toLocaleString('en-US', { timeZone: 'Pacific/Auckland' })), M = nz.getMonth() + 1, D = nz.getDate(), Y = nz.getFullYear(), H = nz.getHours();
const MATARIKI = { 2026: '07-10', 2027: '06-25', 2028: '07-14', 2029: '07-06', 2030: '06-21' };
function season() {
  const md = String(M).padStart(2, '0') + '-' + String(D).padStart(2, '0'), mk = MATARIKI[Y];
  if ((M === 12 && D === 31) || (M === 1 && D <= 2)) return 'newyear';
  if (M === 11 && D === 5) return 'guyfawkes';
  if (mk) { const a = new Date(Y + '-' + mk + 'T00:00'), t = new Date(Y + '-' + md + 'T00:00'), d = (t - a) / 864e5; if (d >= -3 && d <= 3) return 'matariki'; }
  if (M === 12 && D <= 26) return 'xmas';
  if (M === 2 && D === 14) return 'valentine';
  if (M === 2 && D === 6) return 'waitangi';
  if (M === 10 && D === 31) return 'halloween';
  return '';
}
function seasonal(s) {
  if (s === 'newyear' || s === 'guyfawkes') { fireworks(H >= 18 || H < 2 ? 7 : 4); return true; }
  if (s === 'matariki') { drift(['✨', '⭐', '🌟'], 22, 8, 'fxs'); return true; }
  if (s === 'xmas') { drift(['🎄', '🌞', '🎁', '✨', '🌺', '🎅'], 16, 8); return true; } // summer Christmas – sunshine and red flowers, no snow
  if (s === 'valentine') { drift(['💖', '💕', '❤️'], 16, 7); return true; }
  if (s === 'waitangi') { drift(['🇳🇿', '✨'], 12, 7); return true; }
  if (s === 'halloween') { drift(['🎃', '👻', '🦇'], 12, 7); return true; }
  return false;
}
async function weatherFx() {
  let w = null; try { const c = JSON.parse(localStorage.getItem('fxWx') || 'null'); if (c && Date.now() - c.t < 30 * 60e3) w = c.w; } catch (e) { }
  if (!w) { try { const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-35.725&longitude=174.32&current=weather_code,temperature_2m,is_day&timezone=Pacific%2FAuckland'); const j = await r.json(); w = j.current; localStorage.setItem('fxWx', JSON.stringify({ t: Date.now(), w })); } catch (e) { return; } }
  if (!w) return; const c = w.weather_code, t = w.temperature_2m, winter = M >= 6 && M <= 8;
  if (c >= 95) rainFx(true);
  else if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) rainFx(c >= 63);
  else if (c >= 71 && c <= 86) drift(['❄️', '❅', '❆'], 22, 8);
  else if (winter && t <= 6) drift(['❄️', '❅'], 10, 8); // a few flakes on a properly cold winter morning
  else if (c <= 1 && w.is_day) sunFx();
  else if (c <= 1 && !w.is_day) drift(['✨', '⭐'], 10, 8, 'fxs');
}
setTimeout(() => { if (off() || document.hidden) return; if (!seasonal(season())) weatherFx(); }, 1800);
/* 📐 keep the snap line just under the sticky header (its height changes with text size and chips) */
const top = document.querySelector('header.top');
const setH = () => {
  const host = document.getElementById('stories-host');
  const h = (top ? top.offsetHeight : 0) + (host && host.offsetHeight ? host.offsetHeight : 0);
  if (h) document.documentElement.style.setProperty('--hdr', h + 'px');
};
setH(); if (top && 'ResizeObserver' in window) new ResizeObserver(setH).observe(top);
const sh = document.getElementById('stories-host'); if (sh && 'ResizeObserver' in window) new ResizeObserver(setH).observe(sh);
/* no snapping while a sheet/menu is open or when jumping to the top */
new MutationObserver(() => document.documentElement.classList.toggle('nosnap', document.body.classList.contains('noscroll') || !!document.querySelector('.sheet.on,.drawer.on,.celeb'))).observe(document.body, { childList: true, attributes: true, attributeFilter: ['class'] });
})();
