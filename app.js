/* Car & Life Due Dates – the app. Data lives only on this device (IndexedDB). */
'use strict';
const { DAY, MONL, WDL, todayT, todayISO, parseD, isoT, daysLeft, addDays, addMonths, fmt, fmtY, fmtW, fmtLong, fmtTime,
  money, REPEATS, nextDue, billDates, nextBday, bdayAge, bdayDates, ordinal, dueItems, status, kvGet, kvSet, runCheck } = DD;
const APP_VERSION = '1.1.1';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));

/* ---------- icons ---------- */
const P = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  car: '<path d="M3 13l2.2-5.3A2.5 2.5 0 0 1 7.5 6h9a2.5 2.5 0 0 1 2.3 1.7L21 13v4a1 1 0 0 1-1 1h-1.2M3 13v4a1 1 0 0 0 1 1h1.2M3 13h18M9.8 18h4.4"/><circle cx="7.5" cy="17.5" r="2"/><circle cx="16.5" cy="17.5" r="2"/>',
  bill: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  todo: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M8 12l3 3 5-6"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  doc: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  warn: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>', upload: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0M2 8.8a16 16 0 0 1 20 0M12 20h.01"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
  tv: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8M9 2l3 4 3-4"/>',
  house: '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/>',
  umbrella: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 12v7a2 2 0 0 0 4 0"/>',
  drop: '<path d="M12 2.7l5.7 5.7a8 8 0 1 1-11.3 0z"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2c.6-1.5 1.8-2.3 3.2-2.3s2.6.8 3.2 2.3M14.5 10h4M14.5 13.5h3"/>',
  call: '<path d="M21 16.9v2.6a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.7 2 2 0 0 1 3 1.5h2.6a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L6.8 9.2a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  cake: '<path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M5 16c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 1.5-.6 2-.8M12 12V8M12 5.5c-.8-.8-.8-1.8 0-3 .8 1.2.8 2.2 0 3z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/>',
  more: '<circle cx="6" cy="6" r="1.6"/><circle cx="12" cy="6" r="1.6"/><circle cx="18" cy="6" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.8-3.5M4 4v4h4M4 13a8 8 0 0 0 14.8 3.5M20 20v-4h-4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  phoneDown: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/>'
};
const I = (n, a = '') => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" ${a}>${P[n]}</svg>`;

/* ---------- data ---------- */
let S = null;          // all app data
let swReg = null;      // service worker registration
let deferredPrompt = null;
let bgStatus = 'unknown';

function seed() {
  const car = (id, name, plate, year, model, colour, details, hex, wof, rego) =>
    ({ id, name, plate, year, model, colour, details, hex, wof, rego, wofMonths: 12, svcDate: '', svcKm: '', odo: '', notes: '' });
  return {
    version: 1, createdAt: new Date().toISOString(),
    cars: [
      car('car-mul27', "Shane's car", 'MUL27', '2014', 'Honda Fit', 'Silver', 'Hatch · petrol hybrid', '#9AA3A8', '2027-09-25', '2026-12-25'),
      car('car-pnu312', "Sarah's car", 'PNU312', '2022', 'Haval H6 Ultra Hybrid', 'Blue', 'SUV · petrol hybrid', '#2F5DA8', '2026-10-16', '2026-11-09'),
      car('car-kbz234', "Cass's car", 'KBZ234', '2007', 'Honda Fit', 'Blue', 'Hatch · petrol', '#3C7DD9', '2026-11-24', '2026-11-15')
    ],
    bills: [], todos: [], appts: [], lists: ['Home', 'Cars', 'Shopping'],
    birthdays: [], ideas: [], ideaCats: IDEA_CATS.slice(), feeds: [], drivers: seedDrivers(),
    settings: { name: 'Shane', reminders: true, apptReminders: true, bdayReminders: true }
  };
}
const IDEA_CATS = ['Gifts', 'Home', 'Trips', 'Other'];
const blankDriver = (id, name) => ({ id, name, aaNo: '', aaType: '', aaExpiry: '', licNo: '', licClass: '', licExpiry: '', notes: '' });
const seedDrivers = () => [blankDriver('drv-shane', 'Shane'), blankDriver('drv-sarah', 'Sarah'), blankDriver('drv-cass', 'Cass')];
function normalise(d) {
  d = d && typeof d === 'object' ? d : {};
  ['cars', 'bills', 'todos', 'appts', 'birthdays', 'ideas', 'feeds'].forEach(k => { if (!Array.isArray(d[k])) d[k] = []; });
  if (!Array.isArray(d.lists) || !d.lists.length) d.lists = ['Home', 'Cars', 'Shopping'];
  if (!Array.isArray(d.ideaCats)) d.ideaCats = IDEA_CATS.slice();
  if (!Array.isArray(d.drivers)) d.drivers = seedDrivers(); // first time on this version: Shane, Sarah and Cass
  d.cars.forEach(c => {
    if (!Array.isArray(c.services)) c.services = [];
    // Older versions only kept the date of the last service: turn it into a history entry
    if (c.lastService && !c.services.length) c.services.push({ id: 'svc-' + c.id + '-' + c.lastService, date: c.lastService, km: '', garage: '', cost: '', notes: '', migrated: true });
  });
  d.settings = Object.assign({ name: 'Shane', reminders: true, apptReminders: true, bdayReminders: true }, d.settings || {});
  d.version = 1;
  return d;
}
async function save() {
  S.updatedAt = new Date().toISOString();
  try { await kvSet('data', S); } catch (e) { toast('Sorry, that couldn’t be saved on this phone.'); throw e; }
  queueCheck();
}
// Take a copy so an action can be undone
const snap = () => JSON.stringify(S);
const undoTo = s => async () => { S = JSON.parse(s); await save(); render(); };

const COLOURS = { silver: '#9AA3A8', grey: '#6B7280', gray: '#6B7280', white: '#B6C0C8', black: '#1F2937', blue: '#2F5DA8', navy: '#1E3A8A', red: '#C0392B',
  maroon: '#7F1D1D', green: '#2E7D4F', yellow: '#D4A017', gold: '#B8860B', orange: '#E67E22', brown: '#8B5A2B', purple: '#7C3AED', pink: '#DB2777', beige: '#B8A07E', champagne: '#C2A878' };
function colourHex(name) {
  const n = String(name || '').toLowerCase();
  for (const k of Object.keys(COLOURS)) if (n.includes(k)) return COLOURS[k];
  return '#0F766E';
}
function billIcon(name) {
  const n = String(name || '').toLowerCase();
  if (/power|electric|ecotricity|energy|gas|contact|mercury|genesis|meridian/.test(n)) return 'zap';
  if (/phone|mobile|spark|one nz|2degrees|vodafone/.test(n)) return 'phone';
  if (/internet|broadband|fibre|wifi/.test(n)) return 'wifi';
  if (/netflix|tv|sky|stream|disney|neon|spotify/.test(n)) return 'tv';
  if (/insur/.test(n)) return 'umbrella';
  if (/rates|rent|mortgage|council|house/.test(n)) return 'house';
  if (/water/.test(n)) return 'drop';
  return 'bill';
}
const carSub = c => [c.year, c.model].filter(Boolean).join(' ') + (c.colour ? ' · ' + c.colour : '');
const getCar = id => S.cars.find(c => c.id === id);

/* ---------- small UI helpers ---------- */
function pill(d, prefix = '') {
  const w = d < 0 ? (-d) + (d === -1 ? ' day' : ' days') + ' overdue' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d + ' days';
  return `<span class="pill ${status(d)}">${prefix}${w}</span>`;
}
function header(title, sub, extra = '') {
  return `<div class="top"><div style="min-width:0"><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
  <div class="iconrow">${extra}<button class="iconbtn" aria-label="Settings" onclick="go('#settings')">${I('gear')}</button></div></div>`;
}
const addBtn = (label, fn) => `<button class="iconbtn add" aria-label="${label}" onclick="${fn}">${I('plus')}</button>`;
const empty = (t, s, btnLabel, fn) => `<div class="card empty"><div class="t">${t}</div><div class="s">${s}</div>${btnLabel ? `<button class="btn primary" style="flex:none;padding:12px 22px" onclick="${fn}">${I('plus')} ${btnLabel}</button>` : ''}</div>`;
function go(h) { if (location.hash === h) render(); else location.hash = h; }
let toastTimer;
function toast(msg, btn, fn) {
  const t = $('#toast'); $('#toastmsg').textContent = msg;
  const b = $('#toastbtn'); b.textContent = btn || ''; b.style.display = btn ? '' : 'none';
  b.onclick = () => { t.classList.remove('show'); fn && fn(); };
  t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), btn ? 6000 : 3500);
}

/* ---------- pop-up sheet (forms), closes with Android back ---------- */
let sheetOpen = false, sheetResolve = null, reloadPending = false, sheetSubmit = null;
function openSheet(title, inner, onSubmit, submitLabel = 'Save', extraBtns = '') {
  const el = $('#sheet');
  sheetSubmit = onSubmit;
  el.innerHTML = `<div class="scrim" onclick="closeSheet()"></div><div class="panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="grab"></div><h3>${title}</h3>
    <form id="sf" novalidate autocomplete="off">${inner}<div class="formerr" id="ferr"></div>
    <div class="btns">${extraBtns}<button type="button" class="btn" onclick="closeSheet()">${onSubmit ? 'Cancel' : 'Close'}</button>${onSubmit ? `<button type="submit" class="btn primary">${submitLabel}</button>` : ''}</div></form></div>`;
  el.classList.add('show');
  // Show the chosen date in words, whatever date format the phone uses
  el.querySelectorAll('input[type=date]').forEach(i => {
    const h = document.createElement('small'); h.className = 'datehint'; i.after(h);
    const upd = () => { h.textContent = parseD(i.value) ? fmtLong(i.value) : ''; };
    i.addEventListener('input', upd); i.addEventListener('change', upd); upd();
  });
  $('#sf').addEventListener('submit', async e => {
    e.preventDefault();
    if (!sheetSubmit) return;
    const f = e.target, v = {};
    new FormData(f).forEach((val, k) => { v[k] = typeof val === 'string' ? val.trim() : val; });
    const err = await sheetSubmit(v, f);
    if (typeof err === 'string') { const x = $('#ferr'); x.textContent = err; x.style.display = 'block'; return; }
    await closeSheet();
    if (typeof err === 'function') err();
  });
  if (!sheetOpen) { history.pushState({ sheet: true }, '', location.href); sheetOpen = true; }
}
function hideSheet() { const el = $('#sheet'); el.classList.remove('show'); el.innerHTML = ''; sheetOpen = false; sheetSubmit = null; if (reloadPending) location.reload(); }
function closeSheet() {
  return new Promise(res => {
    if (!sheetOpen) return res();
    hideSheet();
    if (history.state && history.state.sheet) { sheetResolve = res; history.back(); } else res();
  });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetOpen) closeSheet(); });
window.addEventListener('popstate', () => {
  if (sheetResolve) { const r = sheetResolve; sheetResolve = null; r(); return; }
  if (sheetOpen) hideSheet();
});
function confirmSheet(title, text, okLabel, fn) {
  openSheet(title, `<p class="muted" style="font-size:15px;margin:0 0 6px">${text}</p>`, async () => fn(), okLabel);
  const b = $('#sf button[type=submit]'); b.classList.remove('primary'); b.classList.add('danger');
}
const field = (label, input, hint = '') => `<label class="field"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
const inp = (name, val, attrs = '') => `<input name="${name}" value="${esc(val)}" ${attrs}>`;
const sel = (name, opts, val) => `<select name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const area = (name, val, ph = '') => `<textarea name="${name}" placeholder="${esc(ph)}">${esc(val)}</textarea>`;

/* ================= HOME ================= */
function rowFor(x) {
  let icon = 'todo', sub;
  if (x.kind === 'car') { icon = { wof: 'shield', rego: 'doc', svc: 'wrench' }[x.part]; sub = (x.car.plate ? esc(x.car.plate) + ' · ' : '') + 'Due ' + fmtW(x.date); }
  else if (x.kind === 'bill') { icon = billIcon(x.bill.name); sub = money(x.bill.amount) + ' · ' + fmtW(x.date); }
  else if (x.kind === 'driver') { icon = 'idcard'; sub = (x.part === 'aa' ? 'AA expires ' : 'Licence expires ') + fmtW(x.date); }
  else sub = 'To-do · ' + esc(x.todo.list || '') + ' · ' + fmtW(x.date);
  return `<button class="row" onclick="go('${x.go}')"><div class="ic ${x.kind}">${I(icon)}</div>
    <div class="tx"><div class="t">${esc(x.title)}</div><div class="s">${sub}</div></div>${pill(x.days)}</button>`;
}
function Home() {
  const items = dueItems(S);
  const over = items.filter(x => x.days < 0).length, soon = items.filter(x => x.days >= 0 && x.days <= 30).length, fine = items.length - over - soon;
  const attention = items.filter(x => x.days <= 30);
  const now = new Date();
  let cards = '';
  if ('Notification' in window && Notification.permission === 'default' && S.settings.reminders !== false)
    cards += `<div class="callout green">${I('bell')}<div style="flex:1"><b>Get reminders on this phone</b><br>We’ll nudge you before WOFs, rego, bills and to-dos are due.
      <div class="btns" style="margin-top:8px"><button class="btn primary small" onclick="turnOnReminders()">Turn on reminders</button></div></div></div>`;
  if (deferredPrompt && !isStandalone())
    cards += `<div class="callout blue">${I('phoneDown')}<div style="flex:1"><b>Put this app on your home screen</b><br>It opens like a normal app and works without internet.
      <div class="btns" style="margin-top:8px"><button class="btn primary small" onclick="installApp()">Install app</button></div></div></div>`;
  const glance = S.cars.map(c => {
    const n = [['WOF', c.wof], ['Rego', c.rego]].filter(a => a[1]).sort((a, b) => parseD(a[1]) - parseD(b[1]))[0];
    const d = n ? daysLeft(n[1]) : null;
    return `<button onclick="go('#car/${c.id}')"><span class="plate">${esc(c.plate || '—')}</span><div class="who">${esc(c.name)}</div>
      ${n ? `<span class="pill ${status(d)}">${n[0]} ${d < 0 ? 'overdue' : d === 0 ? 'today' : d + 'd'}</span>` : '<span class="pill none">No dates</span>'}</button>`;
  }).join('');
  const t7 = todayT() + 7 * DAY;
  const upcoming = calItems(todayT(), t7).filter(e => e.src !== 'due');
  return header('Hi, ' + esc(S.settings.name || 'Shane'), `${WDL[now.getDay()]} ${now.getDate()} ${MONL[now.getMonth()]}`) + cards +
    `<div class="tiles">
      <div class="tile over"><b>${over}</b><span>Overdue</span></div>
      <div class="tile soon"><b>${soon}</b><span>Due soon</span></div>
      <div class="tile fine"><b>${fine}</b><span>All good</span></div></div>
    <div class="sec">Cars at a glance <a href="#cars">All cars</a></div>
    ${S.cars.length ? `<div class="glance">${glance}</div>` : empty('No cars yet', 'Add a car to keep track of its WOF, rego and servicing.', 'Add a car', 'carForm()')}
    <div class="sec">Needs attention <a href="#calendar">See calendar</a></div>
    ${attention.length ? `<div class="list">${attention.map(rowFor).join('')}</div>` : `<div class="card empty"><div class="t">All good for the next 30 days</div><div class="s">Nothing is overdue or due soon. Sweet as.</div></div>`}
    <div class="sec">Coming up this week <button onclick="apptForm()">Add</button></div>
    ${upcoming.length ? `<div class="list">${upcoming.map(e => `<button class="row" onclick="${e.go}"><div class="ic ${e.src}" ${e.color ? `style="background:${e.color}1f;color:${e.color}"` : ''}>${I(e.src === 'bday' ? 'cake' : 'cal')}</div>
      <div class="tx"><div class="t">${esc(e.title)}</div><div class="s">${fmtW(e.date)} · ${e.src === 'bday' ? 'Birthday' : esc(e.time)}${e.src === 'ext' ? ' · ' + esc(e.tag) : ''}</div></div></button>`).join('')}</div>`
      : empty('Nothing booked this week', 'Add appointments like a haircut or the dentist and we’ll remind you an hour before.', 'Add an appointment', 'apptForm()')}
    ${syncNote()}
    <div class="foot">Your information is saved on this phone only.</div>`;
}

/* ================= CARS ================= */
function svcCell(c) {
  if (c.svcDate) return `<div><small>Service</small><b>${fmt(c.svcDate)}</b>${pill(daysLeft(c.svcDate))}</div>`;
  if (c.svcKm) return `<div><small>Service</small><b>${Number(c.svcKm).toLocaleString('en-NZ')} km</b><span class="pill none">By km</span></div>`;
  return `<div><small>Service</small><span class="addsvc" role="button" onclick="event.stopPropagation();serviceForm('${c.id}',false)">+ Add service date</span></div>`;
}
function carTriple(c) {
  const cell = (l, s) => s ? `<div><small>${l}</small><b>${fmt(s)}</b>${pill(daysLeft(s))}</div>` : `<div><small>${l}</small><b>Not set</b><span class="pill none">Add date</span></div>`;
  return `<div class="triple">${cell('WOF', c.wof)}${cell('Rego', c.rego)}${svcCell(c)}</div>`;
}
function Cars() {
  return header('Cars', S.cars.length ? plural(S.cars.length, 'car') + ' in the family' : 'WOF, rego and servicing', addBtn('Add a car', 'carForm()')) +
    (S.cars.length ? S.cars.map(c => `<div class="carcard" role="button" tabindex="0" onclick="go('#car/${c.id}')"><div class="carhead">
      <div class="carpic" style="background:${esc(c.hex || colourHex(c.colour))}">${I('car')}</div>
      <div style="flex:1;min-width:0"><div class="carname">${esc(c.name)}</div><div class="carmodel">${esc(carSub(c))}</div></div>
      ${c.plate ? `<span class="plate">${esc(c.plate)}</span>` : ''}</div>${carTriple(c)}</div>`).join('')
      : empty('No cars yet', 'Add a car to keep track of its WOF, rego and servicing.', 'Add a car', 'carForm()')) +
    `<div class="callout blue">${I('info')}<div>NZTA won’t renew rego unless the WOF is current, so the app warns you when the WOF runs out first.</div></div>` +
    driversSection();
}
function wofWarning(c) {
  if (!c.wof) return '';
  const wd = daysLeft(c.wof);
  if (wd < 0) return `<div class="callout red">${I('warn')}<div><b>The WOF has expired${c.rego ? '. Get the WOF done first' : ''}.</b> It ran out on ${fmt(c.wof)}. ${c.rego ? 'NZTA won’t renew the rego without a current WOF, and ' : ''}you can be fined $200 for driving without one.</div></div>`;
  if (c.rego && parseD(c.wof) <= parseD(c.rego)) return `<div class="callout">${I('info')}<div><b>Get the WOF done first.</b> The WOF runs out ${fmt(c.wof)}, before the rego is due on ${fmt(c.rego)}, and NZTA won’t renew the rego without a current WOF.</div></div>`;
  return '';
}
function CarDetail(id) {
  const c = getCar(id);
  if (!c) return `<button class="back" onclick="go('#cars')">${I('left')} Cars</button>` + empty('That car isn’t here any more', 'It may have been deleted.', '', '');
  const wd = c.wof ? daysLeft(c.wof) : null, rd = c.rego ? daysLeft(c.rego) : null;
  let svc;
  if (c.svcDate || c.svcKm) {
    const kmTo = c.svcKm && c.odo ? Number(c.svcKm) - Number(c.odo) : null;
    const km = c.svcKm ? Number(c.svcKm).toLocaleString('en-NZ') + ' km' : '';
    svc = `<div class="dcard"><div class="h">${I('wrench')} Next service ${c.svcDate ? pill(daysLeft(c.svcDate)) : ''}</div>
      <div class="big">${c.svcDate ? fmtY(c.svcDate) + (km ? ` <span style="font-size:15px;color:var(--ink2);font-weight:600">or ${km}</span>` : '') : km}</div>
      <div class="muted">${c.svcDate && c.svcKm ? 'Whichever comes first. ' : ''}${c.odo ? `Odometer: ${Number(c.odo).toLocaleString('en-NZ')} km${kmTo != null ? ` (${kmTo >= 0 ? kmTo.toLocaleString('en-NZ') + ' km to go' : (-kmTo).toLocaleString('en-NZ') + ' km over'})` : ''}.` : 'Add an odometer reading to see how many km are left.'}</div>
      <div class="btns"><button class="btn" onclick="kmForm('${c.id}')">Update km</button><button class="btn" onclick="serviceForm('${c.id}',true)">${I('check')} Serviced</button></div>${serviceHistory(c)}</div>`;
  } else {
    svc = `<div class="dcard"><div class="h">${I('wrench')} Next service <span class="pill none">Not set</span></div>
      <div class="muted" style="margin-top:8px">No service date yet. Check the sticker on the windscreen or the service book, then add the date or km it’s next due.</div>
      <div class="btns"><button class="btn primary" onclick="serviceForm('${c.id}',false)">${I('plus')} Add service date</button><button class="btn" onclick="serviceForm('${c.id}',true)">${I('check')} Serviced</button></div>${serviceHistory(c)}</div>`;
  }
  return `<div style="display:flex;justify-content:space-between;align-items:center"><button class="back" onclick="go('#cars')">${I('left')} Cars</button>
    <button class="btn small" onclick="carForm('${c.id}')">${I('edit')} Edit</button></div>
  <div class="hero"><div class="carpic" style="background:${esc(c.hex || colourHex(c.colour))}">${I('car')}</div>
   <div style="min-width:0"><h2>${esc(c.name)}</h2><div class="muted">${esc(carSub(c))}${c.details ? '<br>' + esc(c.details) : ''}</div>${c.plate ? `<div style="margin-top:6px"><span class="plate">${esc(c.plate)}</span></div>` : ''}</div></div>
  ${wofWarning(c)}
  <div class="dcard"><div class="h">${I('shield')} Warrant of fitness (WOF) ${wd != null ? pill(wd) : '<span class="pill none">Not set</span>'}</div>
   <div class="big">${c.wof ? fmtLong(c.wof) : 'No date yet'}</div>
   <div class="muted" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">Needed every
     <select class="sel" aria-label="How often a WOF is needed" onchange="setWofMonths('${c.id}',this.value)">${[6, 12, 24].map(m => `<option value="${m}" ${m === +c.wofMonths ? 'selected' : ''}>${m} months</option>`).join('')}</select></div>
   <div class="btns"><button class="btn primary" onclick="wofForm('${c.id}')">${I('check')} Got a new WOF</button>
     <a class="btn" href="https://transact.nzta.govt.nz/v2/check-expiry" target="_blank" rel="noopener">${I('ext')} Check on NZTA</a></div></div>
  <div class="dcard"><div class="h">${I('doc')} Rego (vehicle licence) ${rd != null ? pill(rd) : '<span class="pill none">Not set</span>'}</div>
   <div class="big">${c.rego ? fmtLong(c.rego) : 'No date yet'}</div>
   <div class="muted">Renew online for 3, 6 or 12 months (petrol and hybrid car prices incl. online fee, Sep 2026):</div>
   <div class="prices"><div><b>$51.85</b>3 months</div><div><b>$95.06</b>6 months</div><div><b>$181.45</b>12 months</div></div>
   <div class="btns"><a class="btn primary" href="https://transact.nzta.govt.nz/v2/vehicle-licence-renewal" target="_blank" rel="noopener">${I('ext')} Renew rego on NZTA</a>
     <button class="btn" onclick="regoForm('${c.id}')">${I('check')} Renewed rego</button></div>
   <div class="muted" style="margin-top:8px">Or pop into AA, VTNZ, VINZ or a selected NZ Post shop.</div></div>
  ${svc}
  ${c.notes ? `<div class="dcard"><div class="h">${I('doc')} Notes</div><div class="muted notes" style="margin-top:6px">${esc(c.notes)}</div></div>` : ''}
  <div class="dcard"><div class="h">${I('bell')} Reminders for this car</div>
   <div class="muted" style="margin-top:6px">WOF and rego: 30, 14 and 3 days before, on the day, then every 3 days until it’s sorted. Service: 14 days before the date.</div></div>
  <div class="callout blue">${I('info')}<div><b>WOF rules change from 1 Nov 2026.</b> Many cars aged 4–14 years move to a WOF every 2 years (some from 1 Nov 2026, some from 1 Nov 2027). Cars over 14 stay yearly. Always go by the date on the sticker, set how often this car needs one above, and check with your testing station.</div></div>
  <div class="btns"><button class="btn danger" onclick="deleteCar('${c.id}')">${I('trash')} Delete this car</button></div>
  <div class="foot">Fines: $200 for an expired WOF and $200 for expired rego, with no grace period.<br>From 1 Nov 2026, a WOF more than 2 months out of date is $350.</div>`;
}
async function setWofMonths(id, v) { const c = getCar(id); c.wofMonths = +v; await save(); toast(`${c.name}: WOF needed every ${v} months.`); }
const digits = s => String(s || '').replace(/[^\d]/g, '');

function carForm(id) {
  const c = id ? getCar(id) : { name: '', plate: '', year: '', model: '', colour: '', details: '', wof: '', rego: '', wofMonths: 12, svcDate: '', svcKm: '', odo: '', notes: '' };
  openSheet(id ? 'Edit car' : 'Add a car',
    field('Name', inp('name', c.name, 'placeholder="e.g. Shane’s car" required maxlength="40"')) +
    `<div class="two">${field('Plate', inp('plate', c.plate, 'placeholder="ABC123" maxlength="8" autocapitalize="characters" style="text-transform:uppercase"'))}${field('Year', inp('year', c.year, 'inputmode="numeric" placeholder="2014" maxlength="4"'))}</div>` +
    field('Make and model', inp('model', c.model, 'placeholder="e.g. Honda Fit" maxlength="60"')) +
    `<div class="two">${field('Colour', inp('colour', c.colour, 'placeholder="e.g. Silver" maxlength="30"'))}${field('Type', inp('details', c.details, 'placeholder="e.g. Hatch · petrol" maxlength="60"'))}</div>` +
    `<div class="two">${field('WOF expires', inp('wof', c.wof, 'type="date"'))}${field('Rego expires', inp('rego', c.rego, 'type="date"'))}</div>` +
    field('WOF needed every', sel('wofMonths', [[6, '6 months'], [12, '12 months'], [24, '24 months']], c.wofMonths || 12), 'The dates are on the stickers on the windscreen.') +
    `<div class="two">${field('Next service date', inp('svcDate', c.svcDate, 'type="date"'))}${field('Or service at (km)', inp('svcKm', c.svcKm, 'inputmode="numeric" placeholder="e.g. 95000"'))}</div>` +
    field('Odometer now (km)', inp('odo', c.odo, 'inputmode="numeric" placeholder="Optional"')) +
    field('Notes', area('notes', c.notes, 'Anything handy, e.g. tyre size or where the spare key is')),
    async v => {
      if (!v.name) return 'Please give the car a name.';
      const upd = { name: v.name, plate: v.plate.toUpperCase().replace(/\s+/g, ''), year: digits(v.year).slice(0, 4), model: v.model, colour: v.colour, details: v.details,
        wof: v.wof, rego: v.rego, wofMonths: +v.wofMonths || 12, svcDate: v.svcDate, svcKm: digits(v.svcKm), odo: digits(v.odo), notes: v.notes };
      if (!id || upd.colour !== c.colour) upd.hex = colourHex(upd.colour);
      if (id) Object.assign(c, upd);
      else { upd.id = uid('car'); upd.services = []; S.cars.push(upd); }
      await save();
      toast(id ? 'Car updated.' : 'Car added.');
      if (id) render(); else return () => go('#car/' + upd.id);
    }, id ? 'Save' : 'Add car',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete car" onclick="deleteCar('${id}')">${I('trash')}</button>` : '');
}
function deleteCar(id) {
  const c = getCar(id);
  confirmSheet(`Delete ${esc(c.name)}?`, 'Its WOF, rego and service dates will be removed from this phone.', 'Delete car', async () => {
    const s = snap(); S.cars = S.cars.filter(x => x.id !== id); await save();
    return () => { go('#cars'); toast(`${c.name} deleted.`, 'Undo', undoTo(s)); };
  });
}
function segHtml(name, opts, val) {
  return `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" class="${String(v) === String(val) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div><input type="hidden" name="${name}" value="${val}">`;
}
function wireSeg(name, onPick) {
  const box = document.querySelector(`[data-seg="${name}"]`), hid = document.querySelector(`input[name="${name}"]`);
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    box.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); hid.value = b.dataset.v;
    if (onPick) { onPick(b.dataset.v); $('#sf input[type=date]').dispatchEvent(new Event('input')); }
  });
}
function wofForm(id) {
  const c = getCar(id), m = +c.wofMonths || 12;
  openSheet('Got a new WOF', `<p class="muted" style="margin:-4px 0 12px">Nice one. Check the new sticker and pop in the expiry date.</p>` +
    `<div class="field"><span>How long is the new WOF for?</span>${segHtml('months', [[6, '6 months'], [12, '12 months'], [24, '24 months']], m)}</div>` +
    field('New WOF expires', inp('wof', addMonths(todayISO(), m), 'type="date" required'), 'We’ve guessed today plus the interval. Change it to match the sticker.'),
    async v => {
      if (!parseD(v.wof)) return 'Please choose the new expiry date.';
      const s = snap(); c.wof = v.wof; c.wofMonths = +v.months; await save(); render();
      toast(`WOF updated. Next one due ${fmt(c.wof)}.`, 'Undo', undoTo(s));
    }, 'Save');
  wireSeg('months', v => { $('#sf input[name=wof]').value = addMonths(todayISO(), +v); });
}
function regoForm(id) {
  const c = getCar(id);
  const base = c.rego || todayISO();
  const calc = n => addMonths(base, +n);
  openSheet('Renewed rego', `<p class="muted" style="margin:-4px 0 12px">How long did you renew it for? The new rego runs on from the old expiry date${c.rego ? ` (${fmt(c.rego)})` : ''}.</p>` +
    `<div class="field"><span>Renewed for</span>${segHtml('months', [[3, '3 months'], [6, '6 months'], [12, '12 months']], 12)}</div>` +
    field('New rego expiry', inp('rego', calc(12), 'type="date" required'), 'Or pick the date shown on your new rego.'),
    async v => {
      if (!parseD(v.rego)) return 'Please choose the new expiry date.';
      const s = snap(); c.rego = v.rego; await save(); render();
      toast(`Rego updated. Next due ${fmt(c.rego)}.`, 'Undo', undoTo(s));
    }, 'Save');
  wireSeg('months', v => { $('#sf input[name=rego]').value = calc(v); });
}
const parseMoney = v => { if (v === '' || v == null) return ''; const n = Number(String(v).replace(/[$,\s]/g, '')); return isNaN(n) || n < 0 ? NaN : Math.round(n * 100) / 100; };
function garageList() {
  const all = [];
  S.cars.forEach(c => (c.services || []).forEach(x => { if (x.garage) all.push([x.date || '', x.garage]); }));
  const seen = new Set(), out = [];
  all.sort((a, b) => b[0].localeCompare(a[0])).forEach(([, g]) => { const k = g.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(g); } });
  return out;
}
const garageField = val => field('Garage', inp('garage', val, 'list="garagelist" placeholder="e.g. Whangārei Honda" maxlength="60" autocomplete="off"') +
  `<datalist id="garagelist">${garageList().map(g => `<option value="${esc(g)}">`).join('')}</datalist>`);
const sortedServices = c => [...(c.services || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
function syncLastService(c) { const l = sortedServices(c)[0]; if (l) c.lastService = l.date; else delete c.lastService; }
function serviceHistory(c) {
  const list = sortedServices(c), yr = String(new Date().getFullYear());
  const sum = xs => xs.reduce((t, x) => t + (Number(x.cost) || 0), 0);
  const anyCost = list.some(x => x.cost !== '' && x.cost != null);
  const rows = list.map(x => {
    const bits = [x.km ? Number(x.km).toLocaleString('en-NZ') + ' km' : '', x.garage ? esc(x.garage) : ''].filter(Boolean).join(' · ');
    return `<button class="hrow" onclick="serviceEntryForm('${c.id}','${x.id}')"><div class="tx"><div class="t">${fmtY(x.date)}</div>
      ${bits ? `<div class="s">${bits}</div>` : ''}${x.notes ? `<div class="s notes">${esc(x.notes)}</div>` : ''}</div>${x.cost !== '' && x.cost != null ? `<b class="cost">${money(x.cost)}</b>` : ''}</button>`;
  }).join('');
  return `<div class="hist"><div class="hhead"><b>Service history</b><button onclick="serviceEntryForm('${c.id}')">+ Add past service</button></div>
    ${list.length ? `${anyCost ? `<div class="spent"><div><small>Spent in ${yr}</small><b>${money(sum(list.filter(x => (x.date || '').startsWith(yr))))}</b></div><div><small>All time</small><b>${money(sum(list))}</b></div></div>` : ''}
      <div class="hlist">${rows}</div>` : '<div class="muted" style="margin-top:4px">No services logged yet. Tap “Serviced” after the next one, or add past services from the service book.</div>'}</div>`;
}
function serviceForm(id, justServiced) {
  const c = getCar(id); if (!Array.isArray(c.services)) c.services = [];
  if (!justServiced) {
    openSheet('Add service date', `<p class="muted" style="margin:-4px 0 12px">When is the next service due? Fill in the date, the km, or both.</p>` +
      field('Next service date', inp('svcDate', c.svcDate || '', 'type="date"')) +
      `<div class="two">${field('Or at (km)', inp('svcKm', c.svcKm, 'inputmode="numeric" placeholder="e.g. 95000"'))}${field('Odometer now (km)', inp('odo', c.odo, 'inputmode="numeric" placeholder="Optional"'))}</div>`,
      async v => {
        if (!v.svcDate && !digits(v.svcKm)) return 'Please add a date or a km reading.';
        const s = snap(); c.svcDate = v.svcDate; c.svcKm = digits(v.svcKm); c.odo = digits(v.odo);
        await save(); render(); toast('Service date saved.', 'Undo', undoTo(s));
      }, 'Save');
    return;
  }
  openSheet('Serviced', `<p class="muted" style="margin:-4px 0 12px">Good stuff. Log the service, then set when the next one is due.</p>` +
    `<div class="two">${field('Serviced on', inp('date', todayISO(), 'type="date" required'))}${field('Odometer (km)', inp('km', c.odo, 'inputmode="numeric" placeholder="e.g. 93870"'))}</div>` +
    `<div class="two">${garageField('')}${field('Cost ($)', inp('cost', '', 'inputmode="decimal" placeholder="Optional"'))}</div>` +
    field('What was done', area('notes', '', 'Optional, e.g. oil and filter, new wiper blades')) +
    `<div class="subhead">Next service</div>` +
    field('Next service date', inp('svcDate', addMonths(todayISO(), 12), 'type="date"'), 'Usually on a sticker on the windscreen or in the service book.') +
    field('Or at (km)', inp('svcKm', '', 'inputmode="numeric" placeholder="e.g. 105000"')),
    async v => {
      if (!parseD(v.date)) return 'Please choose the date it was serviced.';
      if (parseD(v.date) > todayT()) return 'The service date can’t be in the future.';
      const cost = parseMoney(v.cost); if (Number.isNaN(cost)) return 'Please type the cost as a number, like 289.50.';
      const s = snap(), km = digits(v.km);
      c.services.push({ id: uid('svc'), date: v.date, km, garage: v.garage, cost, notes: v.notes });
      syncLastService(c);
      if (km && (!c.odo || Number(km) > Number(c.odo))) c.odo = km;
      c.svcDate = v.svcDate; c.svcKm = digits(v.svcKm);
      await save(); render();
      toast('Service logged.', 'Undo', undoTo(s));
    }, 'Save');
}
function serviceEntryForm(carId, sid) {
  const c = getCar(carId); if (!Array.isArray(c.services)) c.services = [];
  const x = sid ? c.services.find(e => e.id === sid) : { date: '', km: '', garage: '', cost: '', notes: '' };
  if (!x) return;
  openSheet(sid ? 'Edit service' : 'Add past service',
    `<div class="two">${field('Serviced on', inp('date', x.date, 'type="date" required'))}${field('Odometer (km)', inp('km', x.km, 'inputmode="numeric" placeholder="Optional"'))}</div>` +
    `<div class="two">${garageField(x.garage)}${field('Cost ($)', inp('cost', x.cost === '' || x.cost == null ? '' : Number(x.cost).toFixed(2), 'inputmode="decimal" placeholder="Optional"'))}</div>` +
    field('What was done', area('notes', x.notes, 'Optional')),
    async v => {
      if (!parseD(v.date)) return 'Please choose the date it was serviced.';
      if (parseD(v.date) > todayT()) return 'The service date can’t be in the future.';
      const cost = parseMoney(v.cost); if (Number.isNaN(cost)) return 'Please type the cost as a number, like 289.50.';
      const s = snap(), upd = { date: v.date, km: digits(v.km), garage: v.garage, cost, notes: v.notes };
      if (sid) { Object.assign(x, upd); delete x.migrated; } else c.services.push(Object.assign({ id: uid('svc') }, upd));
      syncLastService(c);
      await save(); render(); toast(sid ? 'Service updated.' : 'Past service added.', 'Undo', undoTo(s));
    }, sid ? 'Save' : 'Add',
    sid ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete service" onclick="deleteServiceEntry('${carId}','${sid}')">${I('trash')}</button>` : '');
}
async function deleteServiceEntry(carId, sid) {
  const c = getCar(carId), s = snap();
  c.services = c.services.filter(e => e.id !== sid); syncLastService(c);
  await save(); await closeSheet(); render(); toast('Service deleted.', 'Undo', undoTo(s));
}

/* ================= DRIVERS (on the Cars tab) ================= */
const AA_PHONE = '0800 500 222', AA_RENEW = 'https://www.aa.co.nz/membership/';
const getDriver = id => S.drivers.find(d => d.id === id);
function driversSection() {
  const row = d => {
    const dates = [['AA', d.aaExpiry], ['Licence', d.licExpiry]].filter(a => a[1]).sort((a, b) => parseD(a[1]) - parseD(b[1]));
    const sub = dates.length ? dates.map(([l, v]) => `${l} ${fmt(v)}`).join(' · ') : 'No AA or licence details yet';
    const n = dates[0], dl = n ? daysLeft(n[1]) : null;
    return `<button class="row" onclick="go('#driver/${d.id}')"><div class="ic driver">${I('idcard')}</div><div class="tx"><div class="t">${esc(d.name)}</div><div class="s">${sub}</div></div>
      ${n ? `<span class="pill ${status(dl)}">${n[0]} ${dl < 0 ? 'expired' : dl === 0 ? 'today' : dl + 'd'}</span>` : '<span class="pill none">Add details</span>'}</button>`;
  };
  return `<div class="sec">Drivers <button onclick="driverForm()">Add</button></div>
    ${S.drivers.length ? `<div class="list">${S.drivers.map(row).join('')}</div>` : empty('No drivers yet', 'Add a driver to keep their AA membership and licence dates handy.', 'Add a driver', 'driverForm()')}
    <div class="muted" style="margin:8px 4px 0">AA and licence details stay on this phone only.</div>`;
}
function DriverDetail(id) {
  const d = getDriver(id);
  if (!d) return `<button class="back" onclick="go('#cars')">${I('left')} Cars</button>` + empty('That driver isn’t here any more', 'They may have been deleted.', '', '');
  const ad = d.aaExpiry ? daysLeft(d.aaExpiry) : null, ld = d.licExpiry ? daysLeft(d.licExpiry) : null;
  const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>` : '';
  return `<div style="display:flex;justify-content:space-between;align-items:center"><button class="back" onclick="go('#cars')">${I('left')} Cars</button>
    <button class="btn small" onclick="driverForm('${d.id}')">${I('edit')} Edit</button></div>
  <div class="hero"><div class="carpic" style="background:#4F46E5">${I('idcard')}</div><div style="min-width:0"><h2>${esc(d.name)}</h2><div class="muted">Driver</div></div></div>
  ${ad != null && ad < 0 ? `<div class="callout red">${I('warn')}<div><b>${esc(d.name)}’s AA membership has expired.</b> Roadservice may not come out until it’s renewed.</div></div>` : ''}
  <div class="dcard"><div class="h">${I('shield')} AA membership ${ad != null ? pill(ad) : '<span class="pill none">Not set</span>'}</div>
    <div class="big">${d.aaExpiry ? fmtLong(d.aaExpiry) : 'No expiry date yet'}</div>
    ${kv('Membership number', d.aaNo)}${kv('Type', d.aaType)}
    ${!d.aaNo && !d.aaType && !d.aaExpiry ? '<div class="muted">Add the membership number and expiry from the AA card or the AA app.</div>' : ''}
    <div class="btns"><a class="btn primary" href="tel:0800500222">${I('call')} Call AA ${AA_PHONE}</a><a class="btn" href="${AA_RENEW}" target="_blank" rel="noopener">${I('ext')} Renew AA</a></div>
    <div class="muted" style="margin-top:8px">AA Roadservice, 24/7: ${AA_PHONE}. Have the membership number ready.</div></div>
  <div class="dcard"><div class="h">${I('idcard')} Driver licence ${ld != null ? pill(ld) : '<span class="pill none">Not set</span>'}</div>
    <div class="big">${d.licExpiry ? fmtLong(d.licExpiry) : 'No expiry date yet'}</div>
    ${kv('Licence number', d.licNo)}${kv('Class', d.licClass)}
    ${!d.licNo && !d.licClass && !d.licExpiry ? '<div class="muted">Optional. The expiry date is on the front of the licence card.</div>' : ''}</div>
  ${d.notes ? `<div class="dcard"><div class="h">${I('doc')} Notes</div><div class="muted notes" style="margin-top:6px">${esc(d.notes)}</div></div>` : ''}
  <div class="dcard"><div class="h">${I('bell')} Reminders</div><div class="muted" style="margin-top:6px">AA membership and licence: 30, 14 and 3 days before, and on the day (never between 9 pm and 7 am).</div></div>
  <div class="btns"><button class="btn danger" onclick="deleteDriver('${d.id}')">${I('trash')} Delete this driver</button></div>`;
}
const AA_TYPES = ['AA Membership', 'AA Membership + AA Plus'];
const LIC_CLASSES = ['Class 1 (car) – full', 'Class 1 (car) – restricted', 'Class 1 (car) – learner', 'Class 6 (motorbike)', 'Class 2 (medium rigid)'];
function driverForm(id) {
  const d = id ? getDriver(id) : blankDriver('', '');
  const dl = (lid, opts) => `<datalist id="${lid}">${opts.map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
  openSheet(id ? 'Edit driver' : 'Add a driver',
    field('Name', inp('name', d.name, 'placeholder="e.g. Shane" required maxlength="40"')) +
    `<div class="subhead">AA membership</div>` +
    `<div class="two">${field('Membership number', inp('aaNo', d.aaNo, 'inputmode="numeric" placeholder="Optional" maxlength="30" autocomplete="off"'))}${field('Expiry date', inp('aaExpiry', d.aaExpiry, 'type="date"'))}</div>` +
    field('Membership type', inp('aaType', d.aaType, 'list="aatypes" placeholder="e.g. AA Membership + AA Plus" maxlength="50" autocomplete="off"') + dl('aatypes', AA_TYPES)) +
    `<div class="subhead">Driver licence (optional)</div>` +
    `<div class="two">${field('Licence number', inp('licNo', d.licNo, 'placeholder="e.g. AB123456" maxlength="20" autocapitalize="characters" autocomplete="off"'))}${field('Expiry date', inp('licExpiry', d.licExpiry, 'type="date"'))}</div>` +
    field('Licence class', inp('licClass', d.licClass, 'list="licclasses" placeholder="e.g. Class 1 (car) – full" maxlength="50" autocomplete="off"') + dl('licclasses', LIC_CLASSES)) +
    field('Notes', area('notes', d.notes)),
    async v => {
      if (!v.name) return 'Please type the driver’s name.';
      const upd = { name: v.name, aaNo: v.aaNo, aaType: v.aaType, aaExpiry: v.aaExpiry, licNo: v.licNo.toUpperCase(), licClass: v.licClass, licExpiry: v.licExpiry, notes: v.notes };
      if (id) { Object.assign(d, upd); await save(); render(); toast('Driver updated.'); return; }
      const nid = uid('drv'); S.drivers.push(Object.assign({ id: nid }, upd)); await save(); toast('Driver added.');
      return () => go('#driver/' + nid);
    }, id ? 'Save' : 'Add driver',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete driver" onclick="deleteDriver('${id}')">${I('trash')}</button>` : '');
}
function deleteDriver(id) {
  const d = getDriver(id);
  confirmSheet(`Delete ${esc(d.name)}?`, 'Their AA and licence details will be removed from this phone.', 'Delete driver', async () => {
    const s = snap(); S.drivers = S.drivers.filter(x => x.id !== id); await save();
    return () => { go('#cars'); toast(`${d.name} deleted.`, 'Undo', undoTo(s)); };
  });
}
function kmForm(id) {
  const c = getCar(id);
  openSheet('Update km', field('Odometer now (km)', inp('odo', c.odo, 'inputmode="numeric" placeholder="e.g. 93870" required')), async v => {
    const n = digits(v.odo); if (!n) return 'Please type the reading.';
    c.odo = n; await save(); render(); toast('Odometer updated.');
  });
}

/* ================= BILLS ================= */
function Bills() {
  const unpaid = S.bills.filter(b => !b.paid);
  const t30 = todayT() + 30 * DAY;
  let total = 0, count = 0;
  unpaid.forEach(b => billDates(b, -Infinity, t30).forEach(() => { total += Number(b.amount) || 0; count++; }));
  const over = unpaid.filter(b => daysLeft(b.due) < 0).length;
  const sorted = [...unpaid].sort((a, b) => parseD(a.due) - parseD(b.due));
  const paid = S.bills.filter(b => b.paid);
  const row = b => {
    const d = daysLeft(b.due);
    return `<div class="row bill"><button class="tapzone" onclick="billForm('${b.id}')" aria-label="Edit ${esc(b.name)}"><div class="ic bill">${I(billIcon(b.name))}</div>
      <div class="tx"><div class="t">${esc(b.name)}</div><div class="s">${REPEATS[b.repeat] || 'One-off'} · ${b.paid ? 'paid ' + fmt(b.paidOn || b.due) : 'due ' + fmtW(b.due)}</div>
      <div style="margin-top:5px">${b.paid ? '<span class="pill paid">Paid ✓</span>' : pill(d)}</div></div></button>
      <div class="right"><div class="amt">${money(b.amount)}</div>
      ${b.paid ? `<button class="paybtn" onclick="unpay('${b.id}')">Undo</button>` : `<button class="paybtn" onclick="markPaid('${b.id}')">Mark paid</button>`}</div></div>`;
  };
  return header('Bills', 'Regular bills and due dates', addBtn('Add a bill', 'billForm()')) +
    (S.bills.length ? `<div class="summary"><div class="muted">Due in the next 30 days</div><div class="amt">${money(total)}</div>
      <div class="muted">${plural(count, 'payment')}${over ? ` · <b style="color:#fff">${over} overdue</b>` : ''} · reminders 3 days before and on the day</div></div>
      <div class="sec">Your bills</div>
      ${sorted.length ? `<div class="list">${sorted.map(row).join('')}</div>` : '<div class="card muted">All paid up. Good as gold!</div>'}
      ${paid.length ? `<div class="sec">Paid</div><div class="list">${paid.map(row).join('')}</div>` : ''}`
      : empty('No bills yet', 'Add your regular bills, like power, phone or insurance, and we’ll remind you 3 days before each one is due.', 'Add a bill', 'billForm()'));
}
async function markPaid(id) {
  const b = S.bills.find(x => x.id === id), s = snap();
  b.lastPaid = todayISO();
  const n = nextDue(b);
  if (n) b.due = n; else { b.paid = true; b.paidOn = todayISO(); }
  await save(); render();
  toast(n ? `${b.name} paid. Next due ${fmt(n)}.` : `${b.name} marked paid.`, 'Undo', undoTo(s));
}
async function unpay(id) { const b = S.bills.find(x => x.id === id); b.paid = false; delete b.paidOn; await save(); render(); }
function billForm(id) {
  const b = id ? S.bills.find(x => x.id === id) : { name: '', amount: '', due: '', repeat: 'monthly', notes: '' };
  openSheet(id ? 'Edit bill' : 'Add a bill',
    field('What’s the bill?', inp('name', b.name, 'placeholder="e.g. Power, phone, insurance" required maxlength="50"')) +
    `<div class="two">${field('Amount ($)', inp('amount', b.amount === '' ? '' : Number(b.amount).toFixed(2), 'inputmode="decimal" placeholder="0.00"'))}${field('Next due', inp('due', b.due, 'type="date" required'))}</div>` +
    field('Repeats', sel('repeat', Object.entries(REPEATS).map(([k, v]) => [k, k === 'none' ? 'Doesn’t repeat' : v]), b.repeat || 'none')) +
    field('Notes', area('notes', b.notes, 'e.g. account number, paid by direct debit')),
    async v => {
      if (!v.name) return 'Please give the bill a name.';
      if (!parseD(v.due)) return 'Please choose when it’s next due.';
      const amt = v.amount === '' ? 0 : Number(String(v.amount).replace(/[$,\s]/g, ''));
      if (isNaN(amt) || amt < 0) return 'Please type the amount as a number, like 65.50.';
      const dueChanged = !id || v.due !== b.due;
      const upd = { name: v.name, amount: Math.round(amt * 100) / 100, due: v.due, repeat: v.repeat, notes: v.notes };
      if (dueChanged) upd.anchor = new Date(parseD(v.due)).getUTCDate();
      if (id) { if (dueChanged) upd.paid = false; Object.assign(b, upd); }
      else S.bills.push(Object.assign({ id: uid('bill'), paid: false }, upd));
      await save(); render(); toast(id ? 'Bill updated.' : 'Bill added.');
    }, id ? 'Save' : 'Add bill',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete bill" onclick="deleteBill('${id}')">${I('trash')}</button>` : '');
}
function deleteBill(id) {
  const b = S.bills.find(x => x.id === id);
  confirmSheet(`Delete ${esc(b.name)}?`, 'This bill and its reminders will be removed.', 'Delete bill', async () => {
    const s = snap(); S.bills = S.bills.filter(x => x.id !== id); await save(); render(); toast('Bill deleted.', 'Undo', undoTo(s));
  });
}

/* ================= TO-DO ================= */
let todoFilter = 'All';
const jsArg = s => esc(JSON.stringify(s));
function Todo() {
  if (todoFilter !== 'All' && !S.lists.includes(todoFilter)) todoFilter = 'All';
  const vis = S.todos.filter(t => todoFilter === 'All' || t.list === todoFilter);
  const open = vis.filter(t => !t.done).sort((a, b) => (a.due ? parseD(a.due) : 9e15) - (b.due ? parseD(b.due) : 9e15) || (b.created || 0) - (a.created || 0));
  const done = vis.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const row = t => `<div class="row ${t.done ? 'done' : ''}"><button class="tick" aria-label="${t.done ? 'Untick' : 'Tick off'} ${esc(t.title)}" onclick="tick('${t.id}')"><span>${I('check')}</span></button>
    <button class="tapzone" onclick="todoForm('${t.id}')"><div class="tx"><div class="t">${esc(t.title)}</div><div class="s">${esc(t.list)}${t.due && !t.done ? ' · ' + fmtW(t.due) : ''}${!t.due && !t.done ? ' · no date' : ''}</div></div>
    ${t.due && !t.done ? pill(daysLeft(t.due)) : ''}</button></div>`;
  const openCount = S.todos.filter(t => !t.done).length;
  return header('To-do', openCount ? plural(openCount, 'thing') + ' to do' : 'Nothing to do', addBtn('Add a to-do', 'todoForm()')) +
    `<div class="chips">${['All', ...S.lists].map(l => `<button class="chip ${l === todoFilter ? 'on' : ''}" onclick="setTodoFilter(${jsArg(l)})">${esc(l)}</button>`).join('')}
      <button class="chip plus" onclick="listForm()">+ New list</button></div>
    ${todoFilter !== 'All' ? `<div style="display:flex;gap:18px;margin:-2px 4px 10px;font-size:14px;font-weight:600"><button style="color:var(--brand);padding:4px 0" onclick="listForm(${jsArg(todoFilter)})">Rename list</button><button style="color:var(--red);padding:4px 0" onclick="deleteList(${jsArg(todoFilter)})">Delete list</button></div>` : ''}
    <form class="addbar" onsubmit="quickAdd(event)"><input id="newtodo" placeholder="Add a to-do${todoFilter !== 'All' ? ' to ' + esc(todoFilter) : ''}…" autocomplete="off" enterkeyhint="done" maxlength="120" aria-label="New to-do"><button aria-label="Add">${I('plus')}</button></form>
    ${open.length ? `<div class="list">${open.map(row).join('')}</div>` : (S.todos.length ? '<div class="card empty"><div class="t">All done. Good as gold!</div></div>' : empty('Nothing on your list', 'Type a to-do above and tap +, or add one with a due date.', 'Add a to-do', 'todoForm()'))}
    ${done.length ? `<div class="sec">Done <button onclick="clearDone()">Clear done</button></div><div class="list">${done.map(row).join('')}</div>` : ''}`;
}
function setTodoFilter(l) { todoFilter = l; render(); }
async function quickAdd(e) {
  e.preventDefault();
  const v = $('#newtodo').value.trim(); if (!v) return;
  S.todos.push({ id: uid('todo'), title: v, list: todoFilter === 'All' ? S.lists[0] : todoFilter, due: '', notes: '', done: false, created: Date.now() });
  await save(); render(); $('#newtodo').focus(); toast('Added to your list.');
}
async function tick(id) {
  const t = S.todos.find(x => x.id === id), s = snap();
  t.done = !t.done; t.doneAt = t.done ? Date.now() : undefined;
  await save(); render();
  if (t.done) toast(`Ticked off: ${t.title}`, 'Undo', undoTo(s));
}
function clearDone() {
  const vis = S.todos.filter(t => t.done && (todoFilter === 'All' || t.list === todoFilter));
  confirmSheet('Clear done to-dos?', `${plural(vis.length, 'ticked-off to-do')} will be removed.`, 'Clear', async () => {
    const s = snap(), ids = new Set(vis.map(t => t.id)); S.todos = S.todos.filter(t => !ids.has(t.id)); await save(); render(); toast('Cleared.', 'Undo', undoTo(s));
  });
}
function todoForm(id) {
  const t = id ? S.todos.find(x => x.id === id) : { title: '', list: todoFilter === 'All' ? S.lists[0] : todoFilter, due: '', notes: '' };
  openSheet(id ? 'Edit to-do' : 'Add a to-do',
    field('To-do', inp('title', t.title, 'placeholder="e.g. Mow the lawns" required maxlength="120"')) +
    `<div class="two">${field('List', sel('list', S.lists.map(l => [l, l]), t.list))}${field('Due date', inp('due', t.due, 'type="date"'), 'Optional')}</div>` +
    field('Notes', area('notes', t.notes)),
    async v => {
      if (!v.title) return 'Please type the to-do.';
      if (id) Object.assign(t, { title: v.title, list: v.list, due: v.due, notes: v.notes });
      else S.todos.push({ id: uid('todo'), title: v.title, list: v.list, due: v.due, notes: v.notes, done: false, created: Date.now() });
      await save(); render(); toast(id ? 'To-do updated.' : 'Added to your list.');
    }, id ? 'Save' : 'Add',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete to-do" onclick="deleteTodo('${id}')">${I('trash')}</button>` : '');
}
async function deleteTodo(id) {
  const s = snap(); S.todos = S.todos.filter(x => x.id !== id); await save(); await closeSheet(); render(); toast('To-do deleted.', 'Undo', undoTo(s));
}
function listForm(name) {
  openSheet(name ? 'Rename list' : 'New list', field('List name', inp('name', name || '', 'placeholder="e.g. Garden" required maxlength="24"')), async v => {
    if (!v.name) return 'Please type a name.';
    if (v.name === 'All') return 'Please pick a different name.';
    if (S.lists.includes(v.name) && v.name !== name) return 'You already have a list with that name.';
    if (name) { S.lists = S.lists.map(l => l === name ? v.name : l); S.todos.forEach(t => { if (t.list === name) t.list = v.name; }); }
    else S.lists.push(v.name);
    todoFilter = v.name; await save(); render();
  }, name ? 'Save' : 'Add list');
}
function deleteList(name) {
  if (S.lists.length <= 1) { toast('You need at least one list.'); return; }
  const n = S.todos.filter(t => t.list === name).length;
  const dest = S.lists.find(l => l !== name);
  confirmSheet(`Delete the ${esc(name)} list?`, n ? `Its ${plural(n, 'to-do')} will move to ${esc(dest)}.` : 'The list is empty.', 'Delete list', async () => {
    const s = snap(); S.lists = S.lists.filter(l => l !== name); S.todos.forEach(t => { if (t.list === name) t.list = dest; });
    todoFilter = 'All'; await save(); render(); toast('List deleted.', 'Undo', undoTo(s));
  });
}

/* ================= CALENDAR ================= */
const apptSort = (a, b) => parseD(a.date) - parseD(b.date) || (a.time || '').localeCompare(b.time || '');
function calItems(fromT, toT) {
  const ev = [];
  const inR = s => { const t = parseD(s); return t != null && t >= fromT && t <= toT; };
  S.cars.forEach(c => {
    [['wof', 'WOF', 'WOF'], ['rego', 'rego', 'Rego'], ['svcDate', 'service', 'Service']].forEach(([k, l, L]) => { if (c[k] && inR(c[k])) ev.push({ src: 'due', title: `${c.name} ${l} due`, date: c[k], time: L, go: `go('#car/${c.id}')` }); });
  });
  S.bills.forEach(b => billDates(b, fromT, toT).forEach(d => ev.push({ src: 'due', title: `${b.name} · ${money(b.amount)}`, date: d, time: 'Bill', go: `go('#bills')` })));
  S.drivers.forEach(d => [['aaExpiry', 'AA membership expires', 'AA'], ['licExpiry', 'driver licence expires', 'Licence']].forEach(([k, l, L]) => { if (d[k] && inR(d[k])) ev.push({ src: 'due', title: `${d.name}’s ${l}`, date: d[k], time: L, go: `go('#driver/${d.id}')` }); }));
  S.todos.filter(t => !t.done && t.due && inR(t.due)).forEach(t => ev.push({ src: 'due', title: t.title, date: t.due, time: 'To-do', go: `go('#todo')` }));
  S.appts.filter(a => inR(a.date)).forEach(a => ev.push({ src: 'appt', title: a.title, date: a.date, time: a.time ? fmtTime(a.time) : 'All day', sort: a.time || '00:00', go: `apptForm('${a.id}')`, notes: a.notes }));
  S.birthdays.forEach(b => bdayDates(b, fromT, toT).forEach(d => {
    const age = bdayAge(b, d);
    ev.push({ src: 'bday', title: `${b.name}’s ${age > 0 ? ordinal(age) + ' ' : ''}birthday`, date: d, time: 'Birthday', sort: '', tag: 'Birthday', go: `birthdayForm('${b.id}')` });
  }));
  extEvents(fromT, toT).forEach(x => ev.push(x));
  const rank = { due: 0, bday: 1, appt: 2, ext: 2 };
  return ev.sort((a, b) => parseD(a.date) - parseD(b.date) || rank[a.src] - rank[b.src] || (a.sort || '').localeCompare(b.sort || ''));
}
let calMonth = null, calSel = null;
function Calendar() {
  const now = new Date();
  if (!calMonth) calMonth = { y: now.getFullYear(), m: now.getMonth() };
  const { y, m } = calMonth, T = todayT();
  const first = Date.UTC(y, m, 1), offset = (new Date(first).getUTCDay() + 6) % 7;
  const gridStart = first - offset * DAY, gridEnd = gridStart + 41 * DAY;
  const byDay = {};
  calItems(gridStart, gridEnd).forEach(e => (byDay[e.date] = byDay[e.date] || []).push(e));
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const t = gridStart + i * DAY, d = new Date(t), other = d.getUTCMonth() !== m;
    if (i >= 35 && other) break;
    const iso = isoT(t), cols = [...new Set((byDay[iso] || []).map(e => e.color || `var(--${e.src})`))].slice(0, 4);
    cells += `<button class="${other ? 'other' : ''} ${t === T ? 'today' : ''} ${t === calSel ? 'sel' : ''}" aria-label="${fmtLong(iso)}" onclick="pickDay(${t})">
      <span class="n">${d.getUTCDate()}</span><span class="dots">${cols.map(c => `<i style="background:${c}"></i>`).join('')}</span></button>`;
  }
  const evRow = e => `<button class="ev" onclick="${e.go}"><span class="bar" style="background:${e.color || `var(--${e.src})`}"></span><span class="time">${esc(e.time)}</span>
     <div style="flex:1;min-width:0"><div class="t">${esc(e.title)}</div>${e.notes ? `<div class="s">${esc(e.notes)}</div>` : ''}</div><span class="tag ${e.src}" ${e.color ? `style="background:${e.color}"` : ''}>${esc(e.tag || (e.src === 'appt' ? 'Appt' : 'Due'))}</span></button>`;
  const dayLabel = s => { const d = daysLeft(s); return (d === 0 ? 'Today · ' : d === 1 ? 'Tomorrow · ' : '') + fmtW(s); };
  let agenda;
  if (calSel !== null) {
    const iso = isoT(calSel), list = calItems(calSel, calSel);
    agenda = `<div class="sec">${fmtLong(iso)} <button onclick="calSel=null;render()">Show all</button></div>
      ${list.map(evRow).join('') || '<div class="card muted" style="margin-bottom:8px">Nothing on this day.</div>'}
      <div class="btns" style="margin-top:4px"><button class="btn" onclick="apptForm(null,'${iso}')">${I('plus')} Add an appointment on this day</button></div>`;
  } else {
    const overdue = dueItems(S).filter(x => x.days < 0);
    const groups = {};
    calItems(T, T + 21 * DAY).forEach(e => (groups[e.date] = groups[e.date] || []).push(e));
    agenda = (overdue.length ? `<div class="sec">Overdue</div><div class="list">${overdue.map(rowFor).join('')}</div>` : '') +
      `<div class="sec">Next 3 weeks <button onclick="apptForm()">Add appointment</button></div>` +
      (Object.keys(groups).length ? Object.keys(groups).map(k => `<div class="agday">${dayLabel(k)}</div>${groups[k].map(evRow).join('')}`).join('')
        : empty('Nothing in the next 3 weeks', 'Add an appointment, or tap a day on the calendar.', 'Add an appointment', 'apptForm()'));
  }
  return header('Calendar', S.feeds.length ? 'Due dates, appointments and ' + S.feeds.map(f => esc(f.name)).join(' & ') : 'Due dates and appointments', addBtn('Add an appointment', 'apptForm()')) +
    `<div class="card"><div class="monthbar"><button class="iconbtn" aria-label="Previous month" onclick="shiftMonth(-1)">${I('left')}</button>
      <b>${MONL[m]} ${y}</b><button class="iconbtn" aria-label="Next month" onclick="shiftMonth(1)">${I('right')}</button></div>
     <div class="legend"><span><i class="dot" style="background:var(--due)"></i>Due dates</span><span><i class="dot" style="background:var(--appt)"></i>Appointments</span>${S.birthdays.length ? '<span><i class="dot" style="background:var(--bday)"></i>Birthdays</span>' : ''}${S.feeds.map(f => `<span><i class="dot" style="background:${esc(f.colour)}"></i>${esc(f.name)}</span>`).join('')}
      ${y !== now.getFullYear() || m !== now.getMonth() ? `<button style="margin-left:auto;color:var(--brand);font-weight:700" onclick="calMonth=null;calSel=null;render()">Back to today</button>` : ''}</div>
     <div class="grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div></div>
    ${agenda}
    ${S.feeds.length ? syncNote(true) : `<div class="callout blue" style="margin-top:16px">${I('link')}<div><b>Bring in your Outlook or Google calendar.</b> Paste your calendar link once and your appointments show up here, with reminders.
      <div class="btns" style="margin-top:8px"><button class="btn primary small" onclick="go('#settings');setTimeout(()=>{const x=document.getElementById('calsec');x&&x.scrollIntoView()},50)">Connect a calendar</button></div></div></div>`}`;
}
function pickDay(t) { calSel = calSel === t ? null : t; render(); }
function shiftMonth(n) { let { y, m } = calMonth; m += n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } calMonth = { y, m }; calSel = null; render(); }
function apptForm(id, date) {
  const a = id ? S.appts.find(x => x.id === id) : { title: '', date: date || (calSel != null ? isoT(calSel) : todayISO()), time: '', notes: '' };
  openSheet(id ? 'Edit appointment' : 'Add an appointment',
    field('What is it?', inp('title', a.title, 'placeholder="e.g. Haircut" required maxlength="80"')) +
    `<div class="two">${field('Date', inp('date', a.date, 'type="date" required'))}${field('Time', inp('time', a.time, 'type="time"'), 'Leave blank for all day')}</div>` +
    field('Where / notes', area('notes', a.notes)),
    async v => {
      if (!v.title) return 'Please say what the appointment is.';
      if (!parseD(v.date)) return 'Please choose a date.';
      if (id) Object.assign(a, { title: v.title, date: v.date, time: v.time, notes: v.notes });
      else S.appts.push({ id: uid('appt'), title: v.title, date: v.date, time: v.time, notes: v.notes });
      await save(); render(); toast(id ? 'Appointment updated.' : 'Appointment added.');
    }, id ? 'Save' : 'Add',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete appointment" onclick="deleteAppt('${id}')">${I('trash')}</button>` : '');
}
async function deleteAppt(id) {
  const s = snap(); S.appts = S.appts.filter(x => x.id !== id); await save(); await closeSheet(); render(); toast('Appointment deleted.', 'Undo', undoTo(s));
}

/* ================= CALENDAR IMPORT (Outlook / Google / iCloud links) ================= */
// The calendar link service ("relay") fetches your .ics link for the app, because Outlook and Google
// don't let web apps read calendar links directly. It keeps nothing. Set once it's deployed:
const RELAY_DEFAULT = '';
const RELAY_URL = (() => {
  try { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('relayOverride')) return localStorage.getItem('relayOverride'); } catch (e) { }
  return RELAY_DEFAULT;
})().replace(/\/+$/, '');
const CAL_HOSTS = ['outlook.live.com', 'outlook.office365.com', 'outlook.office.com', 'calendar.google.com'];
const SYNC_EVERY = 15 * 60 * 1000;
const FEED_COLOURS = [['#0A64C8', 'Blue'], ['#E8710A', 'Orange'], ['#188038', 'Green'], ['#D01884', 'Pink'], ['#7C3AED', 'Purple'], ['#0E7C86', 'Teal']];
let CAL = {};            // feedId -> { events, syncedAt, lastAttempt, error, count }
const syncingNow = new Set();
let extReg = [];         // imported events shown on screen, for taps

function cleanFeedUrl(raw) {
  let s = String(raw || '').trim().replace(/\s+/g, '');
  if (/^webcals?:\/\//i.test(s)) s = 'https://' + s.replace(/^webcals?:\/\//i, '');
  if (/^http:\/\//i.test(s)) s = 'https://' + s.slice(7);
  let u; try { u = new URL(s); } catch (e) { return null; }
  const h = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || !(CAL_HOSTS.includes(h) || (h.endsWith('.icloud.com') && h.length > 11))) return null;
  return u.toString();
}
function feedKind(url) {
  const h = (() => { try { return new URL(url).hostname; } catch (e) { return ''; } })();
  if (/google/.test(h)) return 'Google'; if (/icloud/.test(h)) return 'iCloud'; if (/outlook/.test(h)) return 'Outlook'; return 'Calendar';
}
const feedById = id => S.feeds.find(f => f.id === id);
function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60); if (h < 24) return plural(h, 'hour') + ' ago';
  return plural(Math.round(h / 24), 'day') + ' ago';
}
function feedError(code, f) {
  const n = esc(f ? f.name : 'The calendar'), k = f ? feedKind(f.url) : 'the calendar';
  return ({
    setup: 'The calendar link service is still being set up. Your events will show up once it’s ready.',
    offline: 'No internet just now. We’ll try again next time you open the app.',
    timeout: `${k} took too long to answer. We’ll try again soon.`,
    not_found: `${k} says this link doesn’t work any more. If you unpublished or reset the calendar, remove it here and add the new link.`,
    denied: `${k} wouldn’t share the calendar with this link. Check it’s the ICS link and the calendar is still published.`,
    not_calendar: 'That link didn’t give back a calendar. Make sure you copied the ICS link (it ends in .ics), not the HTML one.',
    too_large: 'That calendar is too big to bring in (over 5 MB).',
    parse: 'The calendar came back but the app couldn’t read it.',
    bad_url: 'That isn’t an Outlook, Google or iCloud calendar link.', host_not_allowed: 'That isn’t an Outlook, Google or iCloud calendar link.',
    forbidden_origin: 'The calendar link service turned this app away.'
  })[code] || `Couldn’t reach ${n} just now. We’ll try again soon.`;
}
async function loadCal() { try { CAL = (await kvGet('calcache')) || {}; } catch (e) { CAL = {}; } }
async function saveCal() { try { await kvSet('calcache', CAL); } catch (e) { } }

// Sync on open / coming back to the app (at most every 15 min), or straight away when forced.
async function syncFeeds(force = false, onlyId = null) {
  if (!S || !S.feeds.length) return;
  const due = S.feeds.filter(f => (!onlyId || f.id === onlyId) && !syncingNow.has(f.id) &&
    (force || !CAL[f.id] || !CAL[f.id].lastAttempt || Date.now() - CAL[f.id].lastAttempt > SYNC_EVERY));
  if (!due.length) return;
  if (!RELAY_URL) { due.forEach(f => { CAL[f.id] = Object.assign(CAL[f.id] || { events: [] }, { error: 'setup' }); }); await saveCal(); if (!sheetOpen) render(); return; }
  due.forEach(f => syncingNow.add(f.id));
  if (!sheetOpen && /settings/.test(location.hash)) render();
  try { await CalImport.loadICAL(); } catch (e) { due.forEach(f => syncingNow.delete(f.id)); return; }
  await Promise.all(due.map(syncOne));
  await saveCal();
  if (!sheetOpen) render();
  queueCheck();
}
async function syncOne(f) {
  const c = CAL[f.id] = CAL[f.id] || { events: [] };
  c.lastAttempt = Date.now();
  const fail = code => { const e = new Error(code); e.code = code; return e; };
  try {
    if (navigator.onLine === false) throw fail('offline');
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
    let res;
    try {
      res = await fetch(RELAY_URL + '/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: f.url }),
        cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl.signal });
    } catch (e) { throw fail(ctl.signal.aborted ? 'timeout' : navigator.onLine === false ? 'offline' : 'relay'); }
    finally { clearTimeout(timer); }
    if (!res.ok) { let j = {}; try { j = await res.json(); } catch (e) { } throw fail(j.error || 'relay'); }
    const text = await res.text();
    let r; try { r = CalImport.parseFeed(text); } catch (e) { throw fail('parse'); }
    Object.assign(c, { events: r.events, count: r.count, calName: r.calName, syncedAt: Date.now(), error: null });
  } catch (e) { c.error = e.code || 'relay'; }
  finally { syncingNow.delete(f.id); }
}
// Imported events between two UTC-midnight day values, as calendar items
function extEvents(fromT, toT) {
  const out = [];
  S.feeds.forEach(f => {
    const c = CAL[f.id]; if (!c || !c.events) return;
    c.events.forEach(e => {
      if (e.birthday && bdayMatch(e)) return; // already in Birthdays, don't show it twice
      const s = parseD(e.date), en = Math.min(parseD(e.endDate || e.date) || s, s + 62 * DAY);
      if (en < fromT || s > toT) return;
      for (let t = Math.max(s, fromT); t <= Math.min(en, toT); t += DAY) {
        const i = extReg.length; extReg.push({ f, e });
        const multi = en > s;
        out.push({ src: 'ext', color: f.colour, tag: f.name, title: e.title, date: isoT(t),
          time: e.allDay ? (multi ? 'All day' : 'All day') : (t === s ? fmtTime(e.time) : 'Cont.'), sort: e.allDay ? '' : (t === s ? e.time : ''),
          notes: [e.location, multi ? `until ${fmtW(e.endDate)}` : ''].filter(Boolean).join(' · '), go: `showExt(${i})` });
      }
    });
  });
  if (extReg.length > 20000) extReg = [];
  return out;
}
function bdayMatch(e) {
  const [, mo, d] = e.date.split('-').map(Number), name = (e.bdayName || e.title).trim().toLowerCase();
  return S.birthdays.find(b => +b.day === d && +b.month === mo && b.name.trim().toLowerCase() === name);
}
function showExt(i) {
  const x = extReg[i]; if (!x) return;
  const { f, e } = x;
  const when = e.allDay ? (e.endDate && e.endDate !== e.date ? `${fmtW(e.date)} to ${fmtW(e.endDate)} · all day` : `${fmtLong(e.date)} · all day`)
    : `${fmtLong(e.date)}<br>${fmtTime(e.time)} – ${e.endDate !== e.date ? fmtW(e.endDate) + ' ' : ''}${fmtTime(e.endTime)}`;
  let bd = null;
  if (e.birthday) {
    const [, mo, d] = e.date.split('-').map(Number);
    bd = { name: e.bdayName || e.title, d, mo, have: bdayMatch(e) };
  }
  openSheet(esc(e.title), `<div class="dcard"><div class="h"><i class="dot" style="background:${esc(f.colour)}"></i> From ${esc(f.name)}</div>
      <div class="big" style="font-size:18px">${when}</div>
      ${e.location ? `<div class="muted" style="margin-top:6px"><b>Where:</b> ${esc(e.location)}</div>` : ''}
      ${e.desc ? `<div class="muted notes" style="margin-top:6px">${esc(e.desc)}</div>` : ''}</div>
    <p class="muted" style="margin:0 2px 6px">This is from your ${esc(f.name)} calendar, so it can’t be changed here. Change it in ${esc(feedKind(f.url))} and it updates next time the app syncs.</p>
    ${bd && bd.have ? `<p class="muted" style="margin:0 2px 6px"><span class="ok">✓</span> ${esc(bd.name)} is already in your Birthdays.</p>` : ''}`,
    bd && !bd.have ? async () => {
      S.birthdays.push({ id: uid('bday'), name: bd.name.slice(0, 60), day: bd.d, month: bd.mo, year: '', notes: '' });
      await save(); render();
      return () => toast(`${bd.name} added to Birthdays.`, 'View', () => go('#birthdays'));
    } : null, `${I('cake')} Add to Birthdays`);
}
function syncNote(card) {
  if (!S.feeds.length) return '';
  const names = S.feeds.map(f => esc(f.name)).join(' and ');
  const times = S.feeds.map(f => CAL[f.id] && CAL[f.id].syncedAt).filter(Boolean);
  const errs = S.feeds.filter(f => CAL[f.id] && CAL[f.id].error);
  const when = syncingNow.size ? 'Updating now…' : times.length ? 'Last updated ' + ago(Math.min(...times)) + '.' : 'Not updated yet.';
  const txt = `${names} events refresh each time you open the app. ${when}${errs.length ? ` <a href="#settings" style="color:var(--red);font-weight:700">${errs.length === 1 ? 'There’s a problem with ' + esc(errs[0].name) : 'Some calendars have a problem'}.</a>` : ''}`;
  return card ? `<div class="callout blue" style="margin-top:16px">${I('refresh')}<div>${txt}</div></div>` : `<div class="muted" style="margin:8px 4px 0;font-size:13px">${txt}</div>`;
}
function feedsSection() {
  const rows = S.feeds.map(f => {
    const c = CAL[f.id] || {};
    let st;
    if (syncingNow.has(f.id)) st = 'Syncing…';
    else if (c.error) st = `<span class="bad">${feedError(c.error, f)}</span>${c.syncedAt ? `<br>Showing ${plural(c.count || 0, 'event')} from ${ago(c.syncedAt)}.` : ''}`;
    else if (c.syncedAt) st = `<span class="ok">✓</span> Synced ${ago(c.syncedAt)} · ${plural(c.count || 0, 'event')}`;
    else st = 'Not synced yet';
    return `<div class="dcard feed"><div class="h" style="color:var(--ink)"><i class="dot" style="background:${esc(f.colour)};width:12px;height:12px"></i><span style="flex:1;min-width:0;overflow-wrap:anywhere">${esc(f.name)}</span>
        <button class="btn small" onclick="feedForm('${f.id}')">${I('edit')} Edit</button></div>
      <div class="muted" style="margin-top:6px">${st}</div>
      <div class="srow" style="padding:10px 0 0;border:0;min-height:0"><div class="tx"><div class="t" style="font-size:14px">Reminders</div><div class="s">1 hour before, all-day ones in the morning</div></div>
        <button class="switch ${f.reminders !== false ? 'on' : ''}" role="switch" aria-checked="${f.reminders !== false}" aria-label="Reminders for ${esc(f.name)}" onclick="toggleFeedReminders('${f.id}')"></button></div>
      <div class="btns"><button class="btn" onclick="syncFeeds(true,'${f.id}')" ${syncingNow.has(f.id) ? 'disabled' : ''}>${I('refresh')} Sync now</button>
        <button class="btn danger" onclick="removeFeed('${f.id}')">${I('trash')} Remove</button></div></div>`;
  }).join('');
  return `<div class="sec" id="calsec">Connect calendars</div>
  ${RELAY_URL ? '' : `<div class="callout">${I('info')}<div><b>The calendar link service is being set up.</b> You can add your calendar link now. It will start syncing once the service is ready.</div></div>`}
  ${rows}
  <button class="btn primary" style="width:100%" onclick="feedForm()">${I('plus')} Add a calendar</button>
  <div class="muted" style="margin:8px 4px 0">Outlook.com, Google or iCloud. Events are read-only here, refresh when you open the app, and still show when you’re offline.</div>
  ${linkHelp()}`;
}
function linkHelp() {
  return `<details class="help"><summary>How to get your Outlook.com link</summary><ol class="steps">
      <li>Outlook’s phone app can’t do this, so open <b>outlook.live.com</b> in Chrome. Tap ⋮ and tick <b>Desktop site</b>, then sign in.</li>
      <li>Go to the Calendar, then tap <b>Settings</b> (the cog, top right) › <b>Calendar</b> › <b>Shared calendars</b>.</li>
      <li>Under <b>Publish a calendar</b>, choose your calendar and <b>Can view all details</b>, then tap <b>Publish</b>.</li>
      <li>Tap the <b>ICS</b> link (not HTML) and <b>Copy link</b>. Paste it here with <b>Add a calendar</b>.</li></ol></details>
    <details class="help"><summary>How to get your Google Calendar link</summary><ol class="steps">
      <li>The Google Calendar app can’t do this, so open <b>calendar.google.com</b> in Chrome. Tap ⋮ and tick <b>Desktop site</b>.</li>
      <li>Tap <b>Settings</b> (the cog, top right). On the left, under <b>Settings for my calendars</b>, tap your calendar.</li>
      <li>Tap <b>Integrate calendar</b>. Copy the <b>Secret address in iCal format</b>.</li>
      <li>Paste it here with <b>Add a calendar</b>.</li></ol></details>
    <div class="callout red" style="margin-top:10px">${I('warn')}<div><b>Keep your link private.</b> Anyone who has it can see your calendar. Don’t share it or post it anywhere.
      If it gets out: in Outlook, go back to Shared calendars and tap <b>Unpublish</b> (the old link stops working), then publish again for a new link.
      In Google, tap <b>Reset</b> next to the secret address. Then paste the new link here.</div></div>
    <div class="muted" style="margin:0 4px">Your link is saved on this phone (and in your backups). To read it, the app passes it to our calendar link service, which fetches the calendar and hands it straight back. It doesn’t keep your link or your events.</div>`;
}
function feedForm(id) {
  const f = id ? feedById(id) : { name: '', url: '', colour: '', reminders: true };
  const used = S.feeds.map(x => x.colour);
  const col = f.colour || (FEED_COLOURS.find(c => !used.includes(c[0])) || FEED_COLOURS[0])[0];
  openSheet(id ? 'Edit calendar' : 'Add a calendar',
    field('Calendar link', `<textarea name="url" rows="3" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://outlook.live.com/owa/calendar/…/calendar.ics" style="font-size:14px;word-break:break-all">${esc(f.url)}</textarea>`,
      'Paste the ICS link (Outlook) or secret iCal address (Google). webcal:// links are fine too.') +
    field('Name', inp('name', f.name, 'placeholder="e.g. Outlook" maxlength="24"'), 'Shown on each event, e.g. “from Outlook”.') +
    `<div class="field"><span>Colour</span><div class="seg swatches" data-seg="colour">${FEED_COLOURS.map(([hex, n]) => `<button type="button" class="${hex === col ? 'on' : ''}" data-v="${hex}" aria-label="${n}" style="--sw:${hex}"><i></i></button>`).join('')}</div><input type="hidden" name="colour" value="${col}"></div>` +
    (id ? '' : linkHelp()),
    async v => {
      const url = cleanFeedUrl(v.url);
      if (!v.url) return 'Please paste your calendar link.';
      if (!url) return 'That doesn’t look like an Outlook, Google or iCloud calendar link. It should start with https:// or webcal:// and usually ends in .ics.';
      if (S.feeds.some(x => x.url === url && x.id !== id)) return 'You’ve already added that calendar.';
      const name = (v.name || feedKind(url)).slice(0, 24);
      let fid = id;
      if (id) { const changed = f.url !== url; Object.assign(f, { name, url, colour: v.colour }); if (changed) delete CAL[id]; }
      else { fid = uid('feed'); S.feeds.push({ id: fid, name, url, colour: v.colour, reminders: true, added: Date.now() }); }
      await save(); render();
      return () => { toast(RELAY_URL ? `${name} added. Syncing…` : `${name} saved. It will sync once the calendar link service is ready.`); syncFeeds(true, fid); };
    }, id ? 'Save' : 'Add calendar');
  const box = document.querySelector('[data-seg="colour"]'), hid = document.querySelector('input[name="colour"]');
  box.querySelectorAll('button').forEach(b => b.onclick = () => { box.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); hid.value = b.dataset.v; });
  const ta = document.querySelector('#sf [name=url]'), nm = document.querySelector('#sf [name=name]');
  ta.addEventListener('input', () => { const u = cleanFeedUrl(ta.value); if (u && !nm.value) nm.placeholder = 'e.g. ' + feedKind(u); });
}
async function toggleFeedReminders(id) { const f = feedById(id); f.reminders = f.reminders === false; await save(); render(); }
function removeFeed(id) {
  const f = feedById(id);
  confirmSheet(`Remove ${esc(f.name)}?`, 'Its events will disappear from the app. Nothing changes in your calendar itself.', 'Remove', async () => {
    S.feeds = S.feeds.filter(x => x.id !== id); delete CAL[id]; await saveCal(); await save(); render(); toast(`${f.name} removed.`);
  });
}

/* ================= BIRTHDAYS ================= */
function bdayInfo(b) { const iso = nextBday(b), d = daysLeft(iso), age = bdayAge(b, iso); return { iso, d, age }; }
function Birthdays() {
  const list = S.birthdays.map(b => Object.assign({ b }, bdayInfo(b))).sort((x, y) => x.d - y.d || x.b.name.localeCompare(y.b.name));
  const today = list.filter(x => x.d === 0);
  const row = x => `<button class="row ${x.d === 0 ? 'bdtoday' : ''}" onclick="birthdayForm('${x.b.id}')"><div class="ic bday">${I('cake')}</div>
    <div class="tx"><div class="t">${esc(x.b.name)}</div><div class="s">${fmtW(x.iso)}${x.age > 0 ? ` · turns ${x.age}` : ''}${x.b.notes ? ' · ' + esc(x.b.notes) : ''}</div></div>
    ${x.d === 0 ? '<span class="pill bdaypill">Today! 🎂</span>' : `<span class="pill ${x.d <= 7 ? 'bdaysoon' : 'none'}">${x.d === 1 ? 'Tomorrow' : x.d + ' days'}</span>`}</button>`;
  return header('Birthdays', S.birthdays.length ? plural(S.birthdays.length, 'person', 'people') : 'Never miss one', addBtn('Add a birthday', 'birthdayForm()')) +
    today.map(x => `<div class="callout green">${I('cake')}<div><b>Today! It’s ${esc(x.b.name)}’s birthday${x.age > 0 ? ` – they’re ${x.age}` : ''}.</b> Don’t forget to say happy birthday.</div></div>`).join('') +
    (list.length ? `<div class="list">${list.map(row).join('')}</div>`
      : empty('No birthdays yet', 'Add the people you don’t want to forget. We’ll remind you 3 days before and on the day.', 'Add a birthday', 'birthdayForm()')) +
    `<div class="card muted" style="margin-top:12px"><b>Reminders</b> go out 3 days before and on the morning of the day (never between 9 pm and 7 am). Birthdays also show on the Calendar.<br><br>
     Facebook no longer lets you export birthdays, so they can’t be brought in from there. If your Google or Outlook calendar has birthdays in it, tap one on the Calendar and choose <b>Add to Birthdays</b>.</div>`;
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function birthdayForm(id) {
  const b = id ? S.birthdays.find(x => x.id === id) : { name: '', day: '', month: '', year: '', notes: '' };
  if (!b) return;
  openSheet(id ? 'Edit birthday' : 'Add a birthday',
    field('Name', inp('name', b.name, 'placeholder="e.g. Sarah" required maxlength="60"')) +
    `<div class="two">${field('Day', sel('day', [['', 'Day'], ...Array.from({ length: 31 }, (_, i) => [i + 1, i + 1])], b.day))}${field('Month', sel('month', [['', 'Month'], ...MONTHS.map((m, i) => [i + 1, m])], b.month))}</div>` +
    field('Year born', inp('year', b.year, 'inputmode="numeric" placeholder="Optional" maxlength="4"'), 'Add the year to see how old they’re turning.') +
    field('Notes', area('notes', b.notes, 'e.g. gift ideas, likes chocolate')),
    async v => {
      if (!v.name) return 'Please type their name.';
      const d = +v.day, m = +v.month, y = v.year ? +digits(v.year) : '';
      if (!d || !m) return 'Please choose the day and month.';
      if (d > [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]) return `${MONTHS[m - 1]} doesn’t have ${d} days.`;
      const thisYear = new Date().getFullYear();
      if (v.year && (!y || y < 1900 || y > thisYear)) return `Please type the year as 4 numbers, like 1986, or leave it blank.`;
      if (y && m === 2 && d === 29 && !((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) return `${y} wasn’t a leap year, so there was no 29 February.`;
      const upd = { name: v.name, day: d, month: m, year: y, notes: v.notes };
      if (id) Object.assign(b, upd); else S.birthdays.push(Object.assign({ id: uid('bday') }, upd));
      await save(); render(); toast(id ? 'Birthday updated.' : `${v.name}’s birthday added.`);
    }, id ? 'Save' : 'Add',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete birthday" onclick="deleteBirthday('${id}')">${I('trash')}</button>` : '');
}
async function deleteBirthday(id) {
  const s = snap(), b = S.birthdays.find(x => x.id === id);
  S.birthdays = S.birthdays.filter(x => x.id !== id); await save(); await closeSheet(); render(); toast(`${b.name} deleted.`, 'Undo', undoTo(s));
}

/* ================= IDEAS ================= */
let ideaFilter = 'All', ideaQuery = '';
function ideaList() {
  const q = ideaQuery.trim().toLowerCase();
  const vis = S.ideas.filter(i => (ideaFilter === 'All' || (ideaFilter === '★' ? i.pinned : i.cat === ideaFilter)) &&
    (!q || (i.title + ' ' + (i.notes || '') + ' ' + (i.cat || '')).toLowerCase().includes(q)))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.created || 0) - (a.created || 0));
  if (!vis.length) return S.ideas.length ? `<div class="card empty"><div class="t">No ideas match</div><div class="s">${q ? 'Try a different word.' : 'Nothing in this category yet.'}</div></div>`
    : empty('Nothing jotted down yet', 'Type an idea above and tap +. Gift ideas, things to do around the house, trips – anything.', '', '');
  return `<div class="list">${vis.map(i => `<div class="row idea"><button class="star ${i.pinned ? 'on' : ''}" aria-label="${i.pinned ? 'Unstar' : 'Star'} ${esc(i.title)}" aria-pressed="${!!i.pinned}" onclick="toggleStar('${i.id}')">${I('star')}</button>
    <button class="tapzone" onclick="ideaForm('${i.id}')"><div class="tx"><div class="t">${esc(i.title)}</div>
    ${i.notes || i.cat ? `<div class="s">${i.cat ? `<span class="cattag">${esc(i.cat)}</span> ` : ''}${esc((i.notes || '').split('\n')[0].slice(0, 90))}</div>` : ''}</div></button></div>`).join('')}</div>`;
}
function Ideas() {
  if (ideaFilter !== 'All' && ideaFilter !== '★' && !S.ideaCats.includes(ideaFilter)) ideaFilter = 'All';
  return header('Ideas', S.ideas.length ? plural(S.ideas.length, 'idea') : 'Jot things down', addBtn('Add an idea', 'ideaForm()')) +
    `<form class="addbar" onsubmit="quickIdea(event)"><input id="newidea" placeholder="Jot down an idea…" autocomplete="off" enterkeyhint="done" maxlength="140" aria-label="New idea"><button aria-label="Add idea">${I('plus')}</button></form>
    ${S.ideas.length ? `<label class="search">${I('search')}<input id="ideaq" type="search" placeholder="Search ideas" value="${esc(ideaQuery)}" aria-label="Search ideas" oninput="ideaQuery=this.value;document.getElementById('idealist').innerHTML=ideaList()"></label>` : ''}
    <div class="chips">${['All', '★', ...S.ideaCats].map(c => `<button class="chip ${c === ideaFilter ? 'on' : ''}" onclick="ideaFilter=${jsArg(c)};render()">${c === '★' ? '★ Starred' : esc(c)}</button>`).join('')}
      <button class="chip plus" onclick="catsForm()">Edit categories</button></div>
    <div id="idealist">${ideaList()}</div>`;
}
async function quickIdea(e) {
  e.preventDefault();
  const v = $('#newidea').value.trim(); if (!v) return;
  const id = uid('idea');
  S.ideas.push({ id, title: v, notes: '', cat: S.ideaCats.includes(ideaFilter) ? ideaFilter : '', pinned: ideaFilter === '★', created: Date.now() });
  await save(); render(); $('#newidea').focus();
  toast('Idea saved.', 'Add notes', () => ideaForm(id));
}
async function toggleStar(id) { const i = S.ideas.find(x => x.id === id); i.pinned = !i.pinned; await save(); render(); }
function ideaForm(id) {
  const i = id ? S.ideas.find(x => x.id === id) : { title: '', notes: '', cat: S.ideaCats.includes(ideaFilter) ? ideaFilter : '', pinned: false };
  if (!i) return;
  openSheet(id ? 'Edit idea' : 'Add an idea',
    field('Idea', inp('title', i.title, 'placeholder="e.g. Kayak trip to Tutukaka" required maxlength="140"')) +
    field('Notes', area('notes', i.notes, 'Optional: links, prices, who it’s for…')) +
    `<div class="two">${field('Category', sel('cat', [['', 'None'], ...S.ideaCats.map(c => [c, c])], i.cat || ''))}<div class="field"><span>Starred</span>${segHtml('pinned', [['0', 'No'], ['1', '★ Yes']], i.pinned ? '1' : '0')}</div></div>` +
    (id ? `<button type="button" class="btn" style="width:100%;margin-bottom:4px" onclick="ideaToTodo('${id}')">${I('todo')} Turn into to-do</button>` : ''),
    async v => {
      if (!v.title) return 'Please type the idea.';
      const upd = { title: v.title, notes: v.notes, cat: v.cat, pinned: v.pinned === '1', updated: Date.now() };
      if (id) Object.assign(i, upd); else S.ideas.push(Object.assign({ id: uid('idea'), created: Date.now() }, upd));
      await save(); render(); toast(id ? 'Idea updated.' : 'Idea saved.');
    }, id ? 'Save' : 'Add',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete idea" onclick="deleteIdea('${id}')">${I('trash')}</button>` : '');
  wireSeg('pinned');
}
async function ideaToTodo(id) {
  const i = S.ideas.find(x => x.id === id);
  const list = S.lists.includes(i.cat) ? i.cat : S.lists[0];
  S.todos.push({ id: uid('todo'), title: i.title.slice(0, 120), list, due: '', notes: i.notes || '', done: false, created: Date.now(), fromIdea: id });
  await save(); await closeSheet(); render();
  toast(`Added to your ${list} to-do list.`, 'View', () => { todoFilter = 'All'; go('#todo'); });
}
async function deleteIdea(id) {
  const s = snap(); S.ideas = S.ideas.filter(x => x.id !== id); await save(); await closeSheet(); render(); toast('Idea deleted.', 'Undo', undoTo(s));
}
function catsForm() {
  openSheet('Idea categories', `<p class="muted" style="margin:-4px 0 12px">Rename a category by typing over it. Clear one to remove it (its ideas stay, with no category).</p>` +
    S.ideaCats.map((c, n) => field('Category ' + (n + 1), inp('c' + n, c, 'maxlength="20"'))).join('') +
    field('Add a category', inp('cnew', '', 'placeholder="e.g. Garden" maxlength="20"')),
    async v => {
      const next = [], seen = new Set(), ren = {};
      S.ideaCats.forEach((c, n) => { const nv = (v['c' + n] || '').trim(); ren[c] = nv && !seen.has(nv.toLowerCase()) && nv !== 'All' ? nv : ''; if (ren[c]) { next.push(nv); seen.add(nv.toLowerCase()); } });
      if (v.cnew && !seen.has(v.cnew.toLowerCase()) && v.cnew !== 'All') next.push(v.cnew);
      S.ideas.forEach(i => { if (i.cat && i.cat in ren) i.cat = ren[i.cat]; });
      S.ideaCats = next; await save(); render(); toast('Categories saved.');
    }, 'Save');
}

/* ================= MORE ================= */
function More() {
  const T = todayT(), t30 = T + 30 * DAY;
  const unpaid = S.bills.filter(b => !b.paid), over = unpaid.filter(b => daysLeft(b.due) < 0).length;
  const due30 = unpaid.filter(b => parseD(b.due) <= t30).length;
  const nb = S.birthdays.map(b => Object.assign({ b }, bdayInfo(b))).sort((x, y) => x.d - y.d)[0];
  const starred = S.ideas.filter(i => i.pinned).length;
  const item = (href, icon, cls, t, sub, pillHtml = '') => `<button class="row" onclick="go('${href}')"><div class="ic ${cls}">${I(icon)}</div><div class="tx"><div class="t">${t}</div><div class="s">${sub}</div></div>${pillHtml}${I('right')}</button>`;
  return header('More', 'Bills, birthdays, ideas and settings') +
    `<div class="list">
      ${item('#bills', 'bill', 'bill', 'Bills', S.bills.length ? `${plural(due30, 'bill')} due in the next 30 days` : 'Power, phone, insurance…', over ? `<span class="pill over">${over} overdue</span>` : '')}
      ${item('#birthdays', 'cake', 'bday', 'Birthdays', nb ? `Next: ${esc(nb.b.name)}, ${nb.d === 0 ? 'today!' : nb.d === 1 ? 'tomorrow' : fmtW(nb.iso)}` : 'Never miss one', nb && nb.d === 0 ? '<span class="pill bdaypill">Today!</span>' : '')}
      ${item('#ideas', 'bulb', 'idea', 'Ideas', S.ideas.length ? plural(S.ideas.length, 'idea') + (starred ? ` · ${starred} starred` : '') : 'Jot things down')}
      ${item('#settings', 'gear', 'set', 'Settings', 'Reminders, calendars and backup')}
    </div>
    <div class="foot">Your information is saved on this phone only.</div>`;
}

/* ================= SETTINGS ================= */
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function Settings() {
  const hasN = 'Notification' in window, perm = hasN ? Notification.permission : 'unsupported';
  const on = S.settings.reminders !== false;
  let permTxt;
  if (perm === 'granted') permTxt = on ? '<span class="ok">● On.</span> Notifications are allowed.' : '<span class="warn">● Paused.</span> Turned off in this app.';
  else if (perm === 'denied') permTxt = '<span class="bad">● Blocked.</span> In Chrome, tap ⋮, then Settings, Site settings, Notifications, and allow this app.';
  else if (perm === 'default') permTxt = '<span class="warn">● Not on yet.</span> Tap “Turn on reminders”, then Allow.';
  else permTxt = '<span class="bad">● Not available.</span> This browser can’t show notifications. On iPhone, add the app to your Home Screen first.';
  const bg = { on: '<span class="ok">● On.</span> Android checks about twice a day, even when the app is closed.',
    'needs-install': '<span class="warn">● Off.</span> Install the app on your home screen to turn this on.',
    unsupported: '<span class="warn">● Not available.</span> This phone or browser doesn’t support it. Reminders are checked when you open the app.',
    'not-granted': '<span class="warn">● Off.</span> Chrome hasn’t allowed it yet. It usually turns on once the app is installed and you’ve used it for a few days.',
    unknown: 'Checking…', off: '<span class="warn">● Off.</span> Turn on reminders first.' }[bgStatus] || '';
  const last = S.settings.lastBackup ? `Last backup: ${fmtW(isoT(todayT(new Date(S.settings.lastBackup))))}` : 'No backup made yet';
  let canShare = false;
  try { canShare = !!(navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] })); } catch (e) { }
  return `<button class="back" onclick="go('#more')">${I('left')} More</button>
  <div class="top" style="padding-top:0"><div><h1>Settings</h1><div class="sub">Reminders, calendars and backup</div></div></div>
  <div class="sec">Reminders</div>
  <div class="list">
   <div class="srow"><div class="tx"><div class="t">Notifications</div><div class="s">${permTxt}</div></div></div>
   ${perm === 'granted' ? `<div class="srow"><div class="tx"><div class="t">Reminders</div><div class="s">Show reminder notifications on this phone</div></div><button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="Reminders" onclick="toggleSetting('reminders')"></button></div>` : ''}
   <div class="srow"><div class="tx"><div class="t">Appointment reminders</div><div class="s">1 hour before (all-day ones on the day)</div></div><button class="switch ${S.settings.apptReminders !== false ? 'on' : ''}" role="switch" aria-checked="${S.settings.apptReminders !== false}" aria-label="Appointment reminders" onclick="toggleSetting('apptReminders')"></button></div>
   <div class="srow"><div class="tx"><div class="t">Birthday reminders</div><div class="s">3 days before and on the morning of the day</div></div><button class="switch ${S.settings.bdayReminders !== false ? 'on' : ''}" role="switch" aria-checked="${S.settings.bdayReminders !== false}" aria-label="Birthday reminders" onclick="toggleSetting('bdayReminders')"></button></div>
   <div class="srow"><div class="tx"><div class="t">Background checks</div><div class="s">${bg}</div></div></div>
  </div>
  <div class="btns" style="margin-top:10px">
   ${perm !== 'granted' && hasN ? `<button class="btn primary" onclick="turnOnReminders()">${I('bell')} Turn on reminders</button>` : ''}
   <button class="btn" onclick="testNotification()">${I('bell')} Send a test notification</button></div>
  <div class="card" style="margin-top:10px"><div class="muted"><b>When you get a nudge</b><br>
   WOF and rego: 30, 14 and 3 days before, on the day, then every 3 days while overdue.<br>
   Service: 14 days before. Bills: 3 days before and on the day. To-dos: on the day.<br>
   Appointments and connected calendars: 1 hour before (all-day ones in the morning).<br>
   Birthdays: 3 days before and on the day, never between 9 pm and 7 am.<br><br>
   Reminders are checked every time you open the app. Background checks skip 9 pm to 7 am.
   <b>Android may delay background reminders if you don’t open the app for a while.</b> Opening it every few days keeps them coming.</div></div>

  <div class="sec">Backup</div>
  <div class="list">
   <div class="srow"><div class="tx"><div class="t">Your data stays on this phone</div><div class="s">Nothing is sent anywhere, apart from your calendar links when the app syncs them. If you lose or reset your phone it’s gone, so make a backup now and then and save it somewhere safe, like Google Drive or an email to yourself. ${last}.</div></div></div>
  </div>
  <div class="btns" style="margin-top:10px">
   <button class="btn" onclick="exportData()">${I('download')} Export backup</button>
   <button class="btn" onclick="importData()">${I('upload')} Import backup</button>
   ${canShare ? `<button class="btn" onclick="shareBackup()">${I('share')} Share backup</button>` : ''}</div>
  <input type="file" id="importfile" accept=".json,application/json" style="display:none" onchange="importFile(this)">

  ${feedsSection()}

  <div class="sec">Install</div>
  <div class="list"><div class="srow"><div class="tx"><div class="t">${isStandalone() ? 'Installed on this phone ✓' : 'Put the app on your home screen'}</div>
   <div class="s">${isStandalone() ? 'You’re using the installed app.' : 'In Chrome, tap ⋮ (top right), then “Add to Home screen” or “Install app”. On iPhone, tap Share, then “Add to Home Screen”.'}</div></div>
   ${deferredPrompt && !isStandalone() ? `<button class="btn primary small" onclick="installApp()">Install</button>` : ''}</div></div>

  <div class="sec">Handy NZTA links</div>
  <div class="list">
   <a class="srow" href="https://transact.nzta.govt.nz/v2/check-expiry" target="_blank" rel="noopener"><div class="tx"><div class="t">Check WOF and rego expiry dates</div><div class="s">transact.nzta.govt.nz</div></div>${I('ext')}</a>
   <a class="srow" href="https://transact.nzta.govt.nz/v2/vehicle-licence-renewal" target="_blank" rel="noopener"><div class="tx"><div class="t">Renew rego online</div><div class="s">transact.nzta.govt.nz</div></div>${I('ext')}</a>
  </div>
  <div class="foot">Car &amp; Life Due Dates · version ${APP_VERSION}<br>Your information is saved on this phone only.</div>`;
}
async function toggleSetting(k) { S.settings[k] = S.settings[k] === false; await save(); await setupBackground(); render(); }

/* ---------- reminders ---------- */
async function getReg() {
  if (swReg) return swReg;
  if (!('serviceWorker' in navigator)) return null;
  try { swReg = (await navigator.serviceWorker.getRegistration()) || null; } catch (e) { swReg = null; }
  return swReg;
}
async function turnOnReminders() {
  if (!('Notification' in window)) { toast('This browser can’t show notifications.'); return; }
  const p = await Notification.requestPermission();
  if (p === 'granted') {
    S.settings.reminders = true; await save();
    requestPersist();
    await setupBackground();
    toast('Reminders are on.');
    await check();
  } else if (p === 'denied') toast('Notifications are blocked. You can allow them in Chrome’s site settings.');
  render();
}
async function testNotification() {
  if (!('Notification' in window)) { toast('This browser can’t show notifications.'); return; }
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') { toast('Please allow notifications first.'); render(); return; }
    await setupBackground(); render();
  }
  const reg = await getReg();
  const opts = { body: 'Reminders are working. This is what a WOF, rego or bill nudge will look like.', tag: 'test-' + Date.now(), icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: '#settings' } };
  try {
    if (reg) await reg.showNotification('Test reminder from Due Dates', opts); else new Notification('Test reminder from Due Dates', opts);
    toast('Test notification sent. Check the top of your screen.');
  } catch (e) { toast('Sorry, the test notification didn’t work on this browser.'); }
}
async function setupBackground() {
  const reg = await getReg();
  if (!reg || !('periodicSync' in reg)) { bgStatus = 'unsupported'; return bgStatus; }
  if (!('Notification' in window) || Notification.permission !== 'granted' || S.settings.reminders === false) { bgStatus = 'off'; return bgStatus; }
  try {
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (st.state !== 'granted') { bgStatus = isStandalone() ? 'not-granted' : 'needs-install'; return bgStatus; }
    await reg.periodicSync.register('due-check', { minInterval: 12 * 60 * 60 * 1000 });
    bgStatus = 'on';
  } catch (e) { bgStatus = isStandalone() ? 'not-granted' : 'needs-install'; }
  return bgStatus;
}
let checkTimer = null, checking = false;
function queueCheck() { clearTimeout(checkTimer); checkTimer = setTimeout(check, 800); }
async function check() {
  if (checking || !S) return; checking = true;
  try { await runCheck(await getReg(), { data: S, cal: CAL }); } catch (e) { /* ignore */ } finally { checking = false; }
}
async function requestPersist() { try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { } }

/* ---------- backup ---------- */
function backupBlob() {
  return new Blob([JSON.stringify({ app: 'car-life-due-dates', version: 1, exportedAt: new Date().toISOString(), data: S }, null, 2)], { type: 'application/json' });
}
async function markBackedUp() { S.settings.lastBackup = new Date().toISOString(); await save(); render(); }
function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(backupBlob()); a.download = `due-dates-backup-${todayISO()}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  markBackedUp(); toast('Backup saved to your Downloads folder.');
}
async function shareBackup() {
  const f = new File([backupBlob()], `due-dates-backup-${todayISO()}.json`, { type: 'application/json' });
  try { await navigator.share({ files: [f], title: 'Due Dates backup' }); markBackedUp(); } catch (e) { /* cancelled */ }
}
function importData() { $('#importfile').click(); }
function importFile(input) {
  const file = input.files && input.files[0]; input.value = '';
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    let obj; try { obj = JSON.parse(r.result); } catch (e) { toast('That file isn’t a Due Dates backup.'); return; }
    const d = obj && obj.data ? obj.data : obj;
    if (!d || !Array.isArray(d.cars) || !Array.isArray(d.bills) || !Array.isArray(d.todos)) { toast('That file isn’t a Due Dates backup.'); return; }
    const when = obj.exportedAt ? ` from ${fmtY(isoT(todayT(new Date(obj.exportedAt))))}` : '';
    confirmSheet('Restore this backup?', `This replaces everything on this phone with the backup${when}: ${plural(d.cars.length, 'car')}, ${plural(d.bills.length, 'bill')}, ${plural(d.todos.length, 'to-do')}, ${plural((d.appts || []).length, 'appointment')}, ${plural((d.birthdays || []).length, 'birthday')}, ${plural((d.ideas || []).length, 'idea')} and ${plural((d.drivers || []).length, 'driver')}.`, 'Restore', async () => {
      const s = snap(); S = normalise(d); await save(); render(); toast('Backup restored.', 'Undo', undoTo(s)); syncFeeds(true);
    });
  };
  r.readAsText(file);
}

/* ---------- install prompt ---------- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (S && !sheetOpen) render(); });
window.addEventListener('appinstalled', () => { deferredPrompt = null; if (S) { if (!sheetOpen) render(); toast('Installed. Look for “Due Dates” on your home screen.'); } });
async function installApp() {
  if (!deferredPrompt) { toast('In Chrome, tap ⋮ then “Add to Home screen”.'); return; }
  deferredPrompt.prompt();
  try { await deferredPrompt.userChoice; } catch (e) { }
  deferredPrompt = null; render();
}

/* ---------- router ---------- */
const TABS = [['home', 'Home', 'home'], ['cars', 'Cars', 'car'], ['calendar', 'Calendar', 'cal'], ['todo', 'To-do', 'todo'], ['more', 'More', 'more']];
const MORE_PAGES = ['more', 'bills', 'birthdays', 'ideas', 'settings'];
function tabbar(active) {
  const over = dueItems(S).filter(x => x.days < 0).length;
  const moreBadge = S.bills.filter(b => !b.paid && daysLeft(b.due) < 0).length + S.birthdays.filter(b => daysLeft(nextBday(b)) === 0).length;
  const badge = k => k === 'home' && over ? `<span class="badge">${over}</span>` : k === 'more' && moreBadge ? `<span class="badge">${moreBadge}</span>` : '';
  $('#tabbar').innerHTML = TABS.map(([k, l, ic]) =>
    `<button class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''} onclick="go('#${k}')"><span class="w">${I(ic)}${badge(k)}</span>${l}</button>`).join('');
}
let renderedDay = todayISO();
function render() {
  if (!S) return;
  renderedDay = todayISO(); extReg = [];
  const h = (location.hash || '#home').slice(1), [r, arg] = h.split('/');
  const map = { home: Home, cars: Cars, bills: Bills, todo: Todo, calendar: Calendar, settings: Settings, more: More, birthdays: Birthdays, ideas: Ideas };
  $('#view').innerHTML = r === 'car' ? CarDetail(arg) : r === 'driver' ? DriverDetail(arg) : (map[r] || Home)();
  tabbar(r === 'car' || r === 'driver' ? 'cars' : MORE_PAGES.includes(r) ? 'more' : map[r] ? r : 'home');
}
window.addEventListener('online', () => { if (S) syncFeeds(); });
window.addEventListener('hashchange', () => { if (sheetOpen) hideSheet(); render(); $('#view').scrollTop = 0; });

/* ---------- start ---------- */
async function start() {
  try {
    let d = await kvGet('data');
    if (!d) { d = seed(); await kvSet('data', d); }
    S = normalise(d);
  } catch (e) {
    S = normalise(seed());
    toast('This browser won’t let the app save anything. Try Chrome, not a private tab.');
  }
  await loadCal();
  render();
  syncFeeds();
  if ('serviceWorker' in navigator) {
    let hadController = !!navigator.serviceWorker.controller, reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloading) { reloading = true; if (sheetOpen) reloadPending = true; else location.reload(); }
      hadController = true;
    });
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'go') go(e.data.hash); });
    try { swReg = await navigator.serviceWorker.register('sw.js'); } catch (e) { swReg = null; }
  }
  if (isStandalone()) requestPersist();
  await setupBackground();
  if (!sheetOpen && location.hash === '#settings') render();
  check();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!sheetOpen) { try { const d = await kvGet('data'); if (d) S = normalise(d); } catch (e) { } render(); }
    check();
    syncFeeds();
    if (swReg) swReg.update().catch(() => { });
  });
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (todayISO() !== renderedDay && !sheetOpen) render();
    check();
    syncFeeds();
  }, 60 * 1000);
}
start();
