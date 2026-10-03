/* Car & Life Due Dates – the app. Data lives on this device (IndexedDB). Settings can also sync it to another device. */
'use strict';
const { DAY, MONL, WDL, todayT, todayISO, parseD, isoT, daysLeft, addDays, addMonths, fmt, fmtY, fmtW, fmtLong, fmtTime,
  money, holidaysBetween, REPEATS, nextDue, billDates, nextBday, bdayAge, bdayDates, ordinal, repeatDates, REPEAT_LABEL, repeatText, PET_CARE, careDue, careNextAfter, careEvery, dueItems, status, kvGet, kvSet, runCheck, GARDEN_IDS, gardenJobs } = DD;
const APP_VERSION = '1.95.0';
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
  bridge: '<path d="M2.5 16.5h7.5M15.5 16.5h6M10 16.5l6-8.5"/><path d="M4.5 16.5V20M9 16.5V20M17 16.5V20M20 16.5V20"/>',
  meal: '<path d="M4 3v6a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V3M7 3v18M20 15V3a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2zm0 0v6"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21.5 8H6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  flag: '<path d="M5.5 21V4"/><path d="M5.5 4.5h11.5l-2.5 4.25 2.5 4.25H5.5"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>', grip: '<path d="M5 8h14M5 12h14M5 16h14"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  doc: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  warn: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13v4H6a2 2 0 0 1-2-2zM9 7h6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
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
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/>',
  phoneDown: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  moonnew: '<circle cx="12" cy="12" r="8" fill="currentColor" stroke="none"/>',
  moonwaxingcrescent: '<path d="M12 3a9 9 0 1 0 0 18 7 9 0 0 1 0-18z" fill="currentColor" stroke="none"/>',
  moonfirstquarter: '<path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>',
  moonwaxinggibbous: '<path d="M12 3a9 9 0 1 0 0 18 3 9 0 0 1 0-18z" fill="currentColor" stroke="none"/>',
  moonfull: '<circle cx="12" cy="12" r="8" fill="currentColor" stroke="none"/>',
  moonwaninggibbous: '<path d="M12 3a9 9 0 1 1 0 18 3 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>',
  moonlastquarter: '<path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  moonwaningcrescent: '<path d="M12 3a9 9 0 1 1 0 18 7 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>',
  cloud: '<path d="M7 19h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 10.1 4.5 4.5 0 0 0 7 19z"/>',
  cloudsun: '<path d="M8 2.5v1.5M2.5 8H4M4.1 4.1l1 1M11.9 4.1l-1 1"/><path d="M5.2 11a3.5 3.5 0 0 1 6.2-3.6"/><path d="M9 20.5h8.5a3.5 3.5 0 0 0 .5-6.96 5 5 0 0 0-9.6-.94A4 4 0 0 0 9 20.5z"/>',
  cloudmoon: '<path d="M11.5 7.2A4.2 4.2 0 0 1 6.3 2.5a4.2 4.2 0 0 0-1.6 7.3"/><path d="M9 20.5h8.5a3.5 3.5 0 0 0 .5-6.96 5 5 0 0 0-9.6-.94A4 4 0 0 0 9 20.5z"/>',
  rain: '<path d="M7 14.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 5.6 4.5 4.5 0 0 0 7 14.5z"/><path d="M8.5 17.5l-1 3M12.5 17.5l-1 3M16.5 17.5l-1 3"/>',
  drizzle: '<path d="M7 14.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 5.6 4.5 4.5 0 0 0 7 14.5z"/><path d="M8 18v.01M12 18v.01M16 18v.01M10 21v.01M14 21v.01"/>',
  storm: '<path d="M7 14.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 5.6 4.5 4.5 0 0 0 7 14.5z"/><path d="M12.5 15.5l-2 3h3l-2 3"/>',
  snow: '<path d="M7 14.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 5.6 4.5 4.5 0 0 0 7 14.5z"/><path d="M8 17.5v3M6.5 19h3M16 17.5v3M14.5 19h3M12 18.5v3M10.5 20h3"/>',
  fog: '<path d="M4 8h16M3 12h18M5 16h14M8 20h8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  paw: '<circle cx="5.5" cy="10" r="2"/><circle cx="9.2" cy="5.3" r="2"/><circle cx="14.8" cy="5.3" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 12c-2.6 0-5 3.2-5 5.6 0 1.7 1.3 2.6 2.8 2.4 1-.1 1.4-.6 2.2-.6s1.2.5 2.2.6c1.5.2 2.8-.7 2.8-2.4 0-2.4-2.4-5.6-5-5.6z"/>',
  syringe: '<path d="M17 3l4 4M19 5l-3.5 3.5M15 5l4 4-9.5 9.5H5.5v-4zM5.5 18.5L3 21M9 11l2 2M12 8l2 2"/>',
  scissors: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5L20 18M8 16.5L20 6"/>',
  pill: '<path d="M10.5 3.5a5 5 0 0 1 7.07 7.07l-7 7a5 5 0 0 1-7.07-7.07zM7 7l7 7"/>',
  heart: '<path d="M12 20s-7.5-4.6-9-9.3C2 7.5 4.2 4.5 7.3 4.5c1.9 0 3.5 1 4.7 2.7 1.2-1.7 2.8-2.7 4.7-2.7 3.1 0 5.3 3 4.3 6.2C19.5 15.4 12 20 12 20z"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  coins: '<ellipse cx="9" cy="6.5" rx="6" ry="2.5"/><path d="M3 6.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/><path d="M15 10.5c3.3 0 6 1.1 6 2.5s-2.7 2.5-6 2.5-6-1.1-6-2.5"/><path d="M9 13v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  tooth: '<path d="M7.5 3.5c-2.5 0-4 2-4 4.5 0 2 .8 3.3 1.3 5 .6 2.2.8 7.5 2.7 7.5 1.7 0 1.6-4.5 2.5-5.8.5-.8 1.5-.8 2 0 .9 1.3.8 5.8 2.5 5.8 1.9 0 2.1-5.3 2.7-7.5.5-1.7 1.3-3 1.3-5 0-2.5-1.5-4.5-4-4.5-1.9 0-2.7 1-4.5 1s-2.6-1-4.5-1z"/>',
  stetho: '<path d="M5 3H4v5a4 4 0 0 0 8 0V3h-1M8 12v2a5 5 0 0 0 10 0v-2"/><circle cx="18" cy="10" r="2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  spine: '<path d="M12 3v18M9 5h6M8.5 9h7M8.5 13h7M9 17h6"/>',
  medkit: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M12 10.5v6M9 13.5h6"/>',
  ticket: '<path d="M3 8.5V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 0 0 5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.5a2.5 2.5 0 0 0 0-5z"/><path d="M14 5v12" stroke-dasharray="2 2.2"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10.2 8.8v6.4L16.2 12z"/>',
  music: '<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
  leaf: '<path d="M12 21V11"/><path d="M12 13C8 12 4 9.5 4 5c5 .2 8 3.2 8 8z"/><path d="M12 11c4-1 7.2-3.6 8-7-4.2.8-7 4-8 7z"/>'
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
    birthdays: [], ideas: [], ideaCats: IDEA_CATS.slice(), feeds: [], drivers: seedDrivers(), meals: newMeals(), shop: newShop(), pets: [], myEvents: [], loans: [],
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
    if (!storedPhoto(c.photo)) delete c.photo; // only a small JPEG taken on this phone, never a web address
  });
  d.meals = normMeals(d.meals); // first time on 1.4.0: Fri and Sat, with the starter ideas
  d.shop = normShop(d.shop, d); // 1.15.0: shopping list tab (open Shopping to-dos move here the first time)
  d.myEvents = normMine(d.myEvents); // 1.6.0: my events (repeating), older data has none
  d.commission = normComm(d.commission); // 1.7.0: commission tracker (older data and backups have none)
  d.loans = normLoans(d.loans); // 1.10.0: loans (older data and backups have none)
  d.reminders = normReminders(d.reminders); // 1.27.0: reminders (older data and backups have none)
  d.pets = normPets(d.pets); // 1.5.0: Pets & Vet (older data and backups have none)
  d.health = normHealth(d.health); // 1.8.0: Health (older data and backups have none)
  d.garden = normGarden(d.garden); // 1.20.0: Gardening (older data and backups have none)
  d.settings = Object.assign({ name: 'Shane', reminders: true, apptReminders: true, bdayReminders: true }, d.settings || {});
  d.version = 1;
  return d;
}
async function save() {
  S.updatedAt = new Date().toISOString();
  try { await kvSet('data', S); } catch (e) { toast('Sorry, that couldn’t be saved on this phone.'); throw e; }
  queueCheck();
  schedulePhoneSync();
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
// 1.92.0: day counts on Home, Bills and Upcoming are solid pills. 0–2 days (and overdue) red/orange, 3–5 yellow, 6+ green/blue.
function dueTone(d) { return d <= 2 ? 'hot' : d <= 5 ? 'warm' : 'cool'; }
function duePill(d, prefix = '') {
  const w = d < 0 ? (-d) + (d === -1 ? ' day' : ' days') + ' overdue' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d + ' days';
  return `<span class="pill duepill ${dueTone(d)}">${prefix}${w}</span>`;
}
function moneyBadge(amount, label) {
  const under = label ? `<small>${esc(label)}</small>` : '';
  return `<span class="moneybadge"><b>${money(amount)}</b>${under}</span>`;
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
  openSheet(title, `<p class="muted" style="font-size:0.9375rem;margin:0 0 6px">${text}</p>`, async () => fn(), okLabel);
  const b = $('#sf button[type=submit]'); b.classList.remove('primary'); b.classList.add('danger');
}
const field = (label, input, hint = '') => `<label class="field"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
const inp = (name, val, attrs = '') => `<input name="${name}" value="${esc(val)}" ${attrs}>`;
const sel = (name, opts, val) => `<select name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const area = (name, val, ph = '') => `<textarea name="${name}" placeholder="${esc(ph)}">${esc(val)}</textarea>`;

/* ================= HOME ================= */
function rowFor(x) {
  let icon = 'todo', sub, cash = '';
  if (x.kind === 'car') { icon = { wof: 'shield', rego: 'doc', svc: 'wrench' }[x.part]; sub = (x.car.plate ? esc(x.car.plate) + ' · ' : '') + 'Due ' + fmtW(x.date); }
  else if (x.kind === 'bill') { icon = billIcon(x.bill.name); sub = 'Due ' + fmtW(x.date); cash = moneyBadge(x.bill.amount, x.bill.name); }
  else if (x.kind === 'pet') { icon = 'paw'; sub = 'Pet · ' + esc(careEvery(x.care)) + ' · Due ' + fmtW(x.date); }
  else if (x.kind === 'health') { icon = HEALTH_ICON[x.item.kind] || 'medkit'; sub = 'Health · ' + (x.item.clinic ? esc(x.item.clinic) + ' · ' : '') + 'Due ' + fmtW(x.date); }
  else if (x.kind === 'driver') { icon = 'idcard'; sub = (x.part === 'aa' ? 'AA expires ' : 'Licence expires ') + fmtW(x.date); }
  else sub = 'To-do · ' + esc(x.todo.list || '') + ' · ' + fmtW(x.date);
  const body = `<div class="ic ${x.kind}">${I(icon)}</div><div class="tx"><div class="t">${esc(x.title)}</div><div class="s">${sub}</div></div><div class="badgestack">${duePill(x.days)}${cash}</div>`;
  // 1.82.0: a to-do in Upcoming or the overdue list can be marked done here. It stays on the to-do list.
  if (x.kind === 'todo' && x.todo) return `<div class="row"><button type="button" class="tick donelabel" aria-label="Mark complete: ${esc(x.title)}" onclick="tick('${x.todo.id}')"><span>${I('check')}</span><b>Done</b></button><button type="button" class="tapzone" onclick="go('${x.go}')">${body}</button></div>`;
  return `<button class="row" onclick="go('${x.go}')">${body}</button>`;
}
/* 1.14.0: Home cards can be reordered and switched on or off (Home › Customise). Saved as settings.homeOrder / settings.homeHidden.
   Cards with nothing to show hide themselves. The reminder and install prompts always stay at the top. */
const HOME = { // key: [icon, icon colour class, name, what it shows, on by default]
  bridge: ['bridge', 'br', 'Lifting bridge', 'Lift times and closures when you’re nearby or it matters', 1],
  weather: ['cloudsun', 'appt', 'Weather', 'Whangārei weather today', 1],
  roadworks: ['wrench', 'rw', 'Roadworks', 'Upcoming roadworks near Whangārei', 1],
  tv: ['tv', 'tv', 'What’s on TV', 'TVNZ 1, TVNZ 2, Three and Sky Starter, right now', 1],
  holidays: ['flag', 'hol', 'Public holidays', 'The next public holiday when it’s close', 1],
  meals: ['meal', 'meal', 'Upcoming meals', 'Your planned cooking nights', 1],
  shopping: ['cart', 'shop', 'Shopping list', 'Things still to get, with a tick button', 1],
  summary: ['shield', 'car', 'Overdue, due soon, all good', 'The three counters', 1],
  attention: ['warn', 'bill', 'Upcoming', 'Everything due soon or overdue, plus this week’s appointments and calendar events', 1],
  events: ['ticket', 'ev', 'What’s on in Whangārei', 'Local events coming up', 1],
  videos: ['play', 'vid', 'Videos', 'A few suggestions from the video categories you leave on', 0],
  todo: ['todo', 'todo', 'To-do', 'Your next to-dos, with a Done button (ones due soon are in Upcoming)', 1],
  loans: ['coins', 'loan', 'Loans', 'How much is still owed', 1],
  commission: ['cash', 'comm', 'Commission', 'This fortnight’s total', 1],
  birthdays: ['cake', 'bday', 'Birthdays', 'Tomorrow through 30 days away. They can also show in Upcoming.', 1],
  pets: ['paw', 'pet', 'Pets', 'Next flea treatment, grooming and vet dates', 0],
  bills: ['bill', 'bill', 'Bills', 'The next bills to pay', 0],
  cars: ['car', 'car', 'Cars at a glance', 'Each car’s next WOF and rego', 0],
  ideas: ['bulb', 'idea', 'Starred ideas', 'Ideas you’ve starred', 0]
};
const HOME_DEFAULT = Object.keys(HOME);
let homeEdit = false;
let homeShownNow = new Set();
function homeOrder() {
  const src = Array.isArray(S.settings.homeOrder) ? S.settings.homeOrder : [];
  const o = src.filter((k, i, a) => HOME[k] && a.indexOf(k) === i);
  HOME_DEFAULT.forEach(k => { if (!o.includes(k)) o.splice(Math.min(HOME_DEFAULT.indexOf(k), o.length), 0, k); });
  return o;
}
function homeOn(k) {
  // Videos uses its own switch (settings.homeVideos), off until turned on, so Home stays as it was.
  if (k === 'videos') return !!(S.settings && S.settings.homeVideos === true);
  const h = S.settings.homeHidden;
  if (h && typeof h === 'object' && k in h) return !h[k];
  return !!HOME[k][4];
}
async function setHomeOrder(o) {
  const keys = o.filter(k => HOME[k]);
  S.settings.homeOrder = keys;
  // 1.79.0: the summary row shares this list. Its place is how many cards sit above it.
  if (o.includes('homesum')) {
    S.settings.homeSumIndex = o.slice(0, o.indexOf('homesum')).filter(k => HOME[k]).length;
    delete S.settings.homeSumAt;
  }
  await save(); render();
}
async function toggleHomeCard(k) {
  const on = homeOn(k); S.settings.homeHidden = Object.assign({}, S.settings.homeHidden, { [k]: on });
  if (k === 'videos') S.settings.homeVideos = !on;
  await save(); render();
}
// 1.17.0: when the Weather card is switched off, Upcoming can show the weather instead (on unless turned off)
const wxInUp = () => !homeOn('weather') && homeOn('attention') && S.settings.wxUpcoming !== false;
async function toggleWxUpcoming() { S.settings.wxUpcoming = S.settings.wxUpcoming === false; await save(); render(); }
const homeEventCount = () => { const n = Number(S.settings.homeEvents); return n >= 1 && n <= 6 ? n : 2; };
async function setHomeEventCount(n) { S.settings.homeEvents = n; await save(); render(); }
const homeVideoCount = () => { const n = Number(S.settings.homeVideoCount); return n >= 1 && n <= 4 ? n : 2; };
async function setHomeVideoCount(n) { S.settings.homeVideoCount = n; await save(); render(); }
async function resetHome() { const s = snap(); delete S.settings.homeOrder; delete S.settings.homeHidden; S.settings.homeVideos = false; delete S.settings.homeVideoCount; delete S.settings.homeSum; delete S.settings.homeSumAt; delete S.settings.homeSumIndex; await save(); render(); toast('Home is back to the usual layout.', 'Undo', undoTo(s)); }
// 1.69.0: the homepage summary can be hidden. Missing means on.
// 1.79.0: homeSumIndex is how many Home cards it sits after. Missing means 0, under the date and weather.
// An older homeSumAt of bottom, with no index yet, still means after every section.
const showHomeSum = () => !(S.settings && S.settings.homeSum === false);
function homeSumBefore() {
  const st = (S && S.settings) || {};
  if (st.homeSumAt === 'bottom' && !Number.isInteger(st.homeSumIndex)) return Infinity;
  const n = st.homeSumIndex;
  return Number.isInteger(n) && n >= 0 ? n : 0;
}
async function toggleHomeSum() { S.settings.homeSum = !showHomeSum(); await save(); render(); }
async function moveHomeSum(dir) {
  const order = homeOrder();
  let i = homeSumBefore();
  if (!Number.isFinite(i)) i = order.length;
  i = Math.max(0, Math.min(order.length, i));
  const n = Math.max(0, Math.min(order.length, i + (dir < 0 ? -1 : 1)));
  if (n === i) return;
  S.settings.homeSumIndex = n;
  delete S.settings.homeSumAt;
  await save();
  render();
}
function homeEditRows() {
  const rows = homeOrder().map(k => ({ kind: 'card', k }));
  if (!showHomeSum()) return rows;
  let i = homeSumBefore();
  if (!Number.isFinite(i)) i = rows.length;
  i = Math.max(0, Math.min(rows.length, i));
  rows.splice(i, 0, { kind: 'sum' });
  return rows;
}
const homeSec = (title, link) => `<div class="sec">${title}${link ? ' ' + link : ''}</div>`;
const HOME_CARD = {
  bridge: () => { const br = brOnHome(); return br === 'card' ? brCard() : br === 'line' ? brLine() : ''; },
  weather: () => wxCard(),
  roadworks: () => homeRoadworks(),
  tv: () => homeTv(),
  holidays: () => homeHolidays(),
  meals: () => homeMeal(),
  shopping: () => homeShop(),
  summary: () => {
    const items = dueItems(S), over = items.filter(x => x.days < 0).length, soon = items.filter(x => x.days >= 0 && x.days <= 30).length, fine = items.length - over - soon;
    return `<div class="tiles">
      <div class="tile over"><b>${over}</b><span>Overdue</span></div>
      <div class="tile soon"><b>${soon}</b><span>Due soon</span></div>
      <div class="tile fine"><b>${fine}</b><span>All good</span></div></div>`;
  },
  attention: () => homeSec('Upcoming', '<a href="#calendar">See calendar</a>') + attentionHtml(),
  events: () => homeEvents(),
  videos: () => homeVideosCard(),
  todo: () => {
    const att = homeOn('attention'); // to-dos due within 30 days are already in Needs attention
    const open = S.todos.filter(t => !t.done && !(att && t.due && daysLeft(t.due) <= 30)).sort((a, b) => (a.due ? parseD(a.due) : 9e15) - (b.due ? parseD(b.due) : 9e15) || (b.created || 0) - (a.created || 0));
    if (!open.length) return '';
    return homeSec('To-do', '<a href="#todo">See all</a>') + `<div class="list" id="hometodo">${open.slice(0, 5).map(t => `<div class="row"><button type="button" class="tick donelabel" aria-label="Mark complete: ${esc(t.title)}" onclick="tick('${t.id}')"><span>${I('check')}</span><b>Done</b></button>
      <button class="tapzone" onclick="todoForm('${t.id}')"><div class="tx"><div class="t">${esc(t.title)}</div><div class="s">${esc(t.list)}${t.due ? ' · ' + fmtW(t.due) : ' · no date'}${todoAppt(t) ? ' · in your calendar' : ''}</div></div>${t.due ? duePill(daysLeft(t.due)) : ''}</button>${todoCalBtn(t)}</div>`).join('')}</div>` +
      (open.length > 5 ? `<div class="homemore"><a href="#todo">${plural(open.length - 5, 'more to-do')}</a></div>` : '');
  },
  loans: () => {
    const act = loanActive(); if (!act.length) return '';
    return homeSec('Loans', '<a href="#loans">See all</a>') + `<div class="list" id="homeloans">${act.map(l => { const k = loanCalc(l); return `<button class="row" onclick="go('#loan/${l.id}')"><div class="ic loan">${I('coins')}</div>
      <div class="tx"><div class="t">${esc(l.from)} · ${centsMoney(k.owed)} to go</div>${loanBar(k.pct, `${k.pct}% paid back`)}<div class="s">${k.pct}% paid back of ${centsMoney(l.cents)}</div></div>${I('right')}</button>`; }).join('')}</div>`;
  },
  commission: () => {
    if (!CM().anchor) return '';
    return homeSec('Commission', '<a href="#commission">See all</a>') + `<div class="list" id="homecomm"><div class="row"><button class="tapzone" onclick="go('#commission')"><div class="ic comm">${I('cash')}</div><div class="tx"><div class="t">This fortnight</div><div class="s">${commMoreSub().replace(/^This fortnight: /, '')}</div></div></button>
      <button class="paybtn" onclick="go('#commission/add')">Add</button></div></div>`;
  },
  birthdays: () => {
    // Tomorrow through 30 days. Today stays off this list. The same birthdays can still show in Upcoming. No cap.
    const list = S.birthdays.map(b => Object.assign({ b }, bdayInfo(b))).filter(x => x.d >= 1 && x.d <= 30).sort((x, y) => x.d - y.d || x.b.name.localeCompare(y.b.name));
    if (!list.length) return '';
    return homeSec('Birthdays', '<a href="#birthdays">See all</a>') + `<div class="list" id="homebdays">${list.map(x => `<button class="row" onclick="birthdayForm('${x.b.id}')"><div class="ic bday">${I('cake')}</div>
      <div class="tx"><div class="t">${esc(x.b.name)}</div><div class="s">${fmtW(x.iso)}${x.age > 0 ? ` · turns ${x.age}` : ''}</div></div>
      ${x.d === 0 ? '<span class="pill bdaypill">Today! 🎂</span>' : `<span class="pill ${x.d <= 7 ? 'bdaysoon' : 'none'}">${x.d === 1 ? 'Tomorrow' : x.d + ' days'}</span>`}</button>`).join('')}</div>`;
  },
  pets: () => {
    const list = dueItems(S).filter(x => x.kind === 'pet').slice(0, 4); if (!list.length) return '';
    return homeSec('Pets', '<a href="#pets">See all</a>') + `<div class="list" id="homepets">${list.map(rowFor).join('')}</div>`;
  },
  bills: () => {
    const list = S.bills.filter(b => !b.paid && b.due).sort((a, b) => parseD(a.due) - parseD(b.due)).slice(0, 4); if (!list.length) return '';
    return homeSec('Bills', '<a href="#bills">See all</a>') + `<div class="list" id="homebills">${list.map(b => `<div class="row bill"><button class="tapzone" onclick="go('#bills')"><div class="ic bill">${I(billIcon(b.name))}</div>
      <div class="tx"><div class="t">${esc(b.name)}</div><div class="s">Due ${fmtW(b.due)}</div></div><div class="badgestack">${duePill(daysLeft(b.due))}${moneyBadge(b.amount, b.name)}</div></button>
      <button class="paybtn" onclick="markPaid('${b.id}')">Paid</button></div>`).join('')}</div>`;
  },
  cars: () => {
    if (!S.cars.length) return '';
    const cell = (l, d) => d ? `<span class="cg"><small>${l}</small> ${fmt(d)} ${duePill(daysLeft(d))}</span>` : '';
    return homeSec('Cars', '<a href="#cars">See all</a>') + `<div class="list" id="homecars">${S.cars.map(c => `<button class="row" onclick="go('#car/${c.id}')">${carMark(c)}
      <div class="tx"><div class="t">${esc(c.name)}${c.plate ? ` <span class="plate small">${esc(c.plate)}</span>` : ''}</div><div class="cgrow">${cell('WOF', c.wof)}${cell('Rego', c.rego)}</div></div></button>`).join('')}</div>`;
  },
  ideas: () => {
    const list = S.ideas.filter(i => i.pinned).sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 5); if (!list.length) return '';
    return homeSec('Starred ideas', '<a href="#ideas">See all</a>') + `<div class="list" id="homeideas">${list.map(i => `<button class="row" onclick="go('#ideas')"><div class="ic idea">${I('star')}</div>
      <div class="tx"><div class="t">${esc(i.title)}</div>${i.cat ? `<div class="s">${esc(i.cat)}</div>` : ''}</div></button>`).join('')}</div>`;
  }
};
function HomeEdit() {
  const rows = homeEditRows();
  const sumOn = showHomeSum();
  const last = rows.length - 1;
  return header('Customise Home', 'Press and hold a row, then drag it up or down') +
    `<div class="reordhelp">Use the switches to show or hide cards. Cards with nothing to show stay hidden until there’s something in them. Drag the summary between sections, or use Up and Down.</div>
    <div class="list" id="homesumopt" style="margin-bottom:12px"><div class="srow"><div class="tx"><div class="t">Summary</div><div class="s">A short summary of this page. It starts under the date and weather. Up and Down move it one section at a time.</div></div><button class="switch ${sumOn ? 'on' : ''}" role="switch" aria-checked="${sumOn}" aria-label="Show the homepage summary" onclick="toggleHomeSum()"></button></div></div>
    <div class="list reorder" id="reorderlist" data-save="home">${rows.map((r, i) => {
      if (r.kind === 'sum') return `<div class="row mrow sumrow" data-k="homesum" aria-label="Summary"><div class="ic idea">${I('bulb')}</div>
      <div class="tx"><div class="t">Summary</div><div class="s">Between the sections on Home.</div></div>
      <span class="summoves"><button type="button" class="summove" aria-label="Move the summary up one section" onclick="event.stopPropagation();moveHomeSum(-1)" ${i === 0 ? 'disabled' : ''}>Up</button><button type="button" class="summove" aria-label="Move the summary down one section" onclick="event.stopPropagation();moveHomeSum(1)" ${i === last ? 'disabled' : ''}>Down</button></span></div>`;
      const k = r.k, d = HOME[k], on = homeOn(k);
      return `<div class="row mrow${on ? '' : ' cardoff'}" data-k="${k}" aria-label="${esc(d[2])}"><div class="ic ${d[1]}">${I(d[0])}</div>
      <div class="tx"><div class="t">${d[2]}</div><div class="s">${d[3]}</div></div>
      <button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="Show ${esc(d[2])} on Home" onclick="event.stopPropagation();toggleHomeCard('${k}')"></button>
      <span class="grip" aria-hidden="true">${I('grip')}</span></div>`;
    }).join('')}
    </div>
    ${homeOn('events') ? `<div class="list" id="evcountopt" style="margin-top:12px"><div class="srow" style="flex-wrap:wrap"><div class="tx" style="flex-basis:100%"><div class="t">Events on Home</div><div class="s">How many to show under What’s on in Whangārei. The rest stay on the Events page.</div></div>
      <div class="seg" id="evcount" role="group" aria-label="How many events on Home" style="width:100%">${[1,2,3,4,5,6].map(n => `<button type="button" class="${homeEventCount() === n ? 'on' : ''}" aria-pressed="${homeEventCount() === n}" onclick="setHomeEventCount(${n})">${n}</button>`).join('')}</div></div></div>` : ''}
    ${homeOn('videos') ? `<div class="list" id="vidcountopt" style="margin-top:12px"><div class="srow" style="flex-wrap:wrap"><div class="tx" style="flex-basis:100%"><div class="t">Videos on Home</div><div class="s">How many to show under Videos. The rest stay on the Videos page.</div></div>
      <div class="seg" id="vidcount" role="group" aria-label="How many videos on Home" style="width:100%">${[1,2,3,4].map(n => `<button type="button" class="${homeVideoCount() === n ? 'on' : ''}" aria-pressed="${homeVideoCount() === n}" onclick="setHomeVideoCount(${n})">${n}</button>`).join('')}</div></div></div>` : ''}
    <div style="display:flex;gap:10px;margin-top:14px"><button class="btn" onclick="resetHome()">Reset to default</button><button class="btn primary" id="homedone" onclick="homeEdit=false;render();$('#view').scrollTop=0">Done</button></div>
    <div class="foot">The reminder and install prompts always show at the top when they’re needed.</div>`;
}
/* Daily quote (1.54.0). One real, attributed line per Pacific/Auckland calendar day.
   The choice is S.settings.dailyQuote (missing means on, so it is in backups) and is copied to
   localStorage under the key dailyQuote, the same way theme and text size are kept on this phone. */
const DAILY_QUOTES = [
  { t: 'Well done is better than well said.', w: 'Benjamin Franklin', img: 'images/quote-01.jpg' },
  { t: 'Trust thyself: every heart vibrates to that iron string.', w: 'Ralph Waldo Emerson', img: 'images/quote-02.jpg' },
  { t: 'Nothing can bring you peace but yourself.', w: 'Ralph Waldo Emerson', img: 'images/quote-03.jpg' },
  { t: 'Insist on yourself; never imitate.', w: 'Ralph Waldo Emerson', img: 'images/quote-04.jpg' },
  { t: 'Do your work, and you shall reinforce yourself.', w: 'Ralph Waldo Emerson', img: 'images/quote-05.jpg' },
  { t: 'What I must do is all that concerns me, not what the people think.', w: 'Ralph Waldo Emerson', img: 'images/quote-06.jpg' },
  { t: 'Life only avails, not the having lived.', w: 'Ralph Waldo Emerson', img: 'images/quote-07.jpg' },
  { t: 'Resolve to perform what you ought. Perform without fail what you resolve.', w: 'Benjamin Franklin', img: 'images/quote-08.jpg' },
  { t: 'Lose no time. Be always employed in something useful.', w: 'Benjamin Franklin', img: 'images/quote-09.jpg' },
  { t: 'It is never too late to give up our prejudices.', w: 'Henry David Thoreau', img: 'images/quote-10.jpg' },
  { t: 'I think that we may safely trust a good deal more than we do.', w: 'Henry David Thoreau', img: 'images/quote-11.jpg' },
  { t: 'In the long run men hit only what they aim at.', w: 'Henry David Thoreau', img: 'images/quote-12.jpg' },
  { t: 'Optimism is the faith that leads to achievement.', w: 'Helen Keller', img: 'images/quote-13.jpg' },
  { t: "Do what you can, with what you've got, where you are.", w: 'Bill Widener', img: 'images/quote-14.jpg' },
  { t: 'The only thing we have to fear is fear itself.', w: 'Franklin D. Roosevelt', img: 'images/quote-15.jpg' },
  { t: 'This above all: to thine own self be true.', w: 'William Shakespeare', img: 'images/quote-16.jpg' },
  { t: 'The fault, dear Brutus, is not in our stars, but in ourselves, that we are underlings.', w: 'William Shakespeare', img: 'images/quote-17.jpg' },
  { t: 'How far that little candle throws his beams! So shines a good deed in a naughty world.', w: 'William Shakespeare', img: 'images/quote-18.jpg' },
  { t: 'First say to yourself what you would be; and then do what you have to do.', w: 'Epictetus', img: 'images/quote-19.jpg' },
  { t: 'Hope is the thing with feathers that perches in the soul.', w: 'Emily Dickinson', img: 'images/quote-20.jpg' }
];
function aklDayNumber(now) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now || new Date()).map(x => [x.type, x.value]));
  return Math.floor(Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000);
}
function showDailyQuote() {
  if (S && S.settings && typeof S.settings.dailyQuote === 'boolean') return S.settings.dailyQuote;
  try {
    const v = localStorage.getItem('dailyQuote');
    if (v === '0') return false;
    if (v === '1') return true;
  } catch (e) {}
  return true;
}
function dailyQuoteFor(now) {
  const n = DAILY_QUOTES.length;
  const i = ((aklDayNumber(now) % n) + n) % n;
  return DAILY_QUOTES[i];
}
function dailyQuoteCard() {
  if (!showDailyQuote()) return '';
  const q = dailyQuoteFor();
  return `<div class="card quotecard" id="dailyquote"><img class="qphoto" src="${q.img}" alt=""><div class="qshade"><p class="qtext">${esc(q.t)}</p><div class="qwho">${esc(q.w)}</div></div></div>`;
}
async function toggleDailyQuote() {
  const on = !showDailyQuote();
  S.settings.dailyQuote = on;
  try { localStorage.setItem('dailyQuote', on ? '1' : '0'); } catch (e) {}
  await save();
  render();
}
function engList(arr) {
  const a = arr.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  if (a.length === 2) return a[0] + ' and ' + a[1];
  return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
}
// 1.64.0: a few sentences under the greeting, only for sections actually on Home. No invented items.
// 1.68.0: the summary does not mention television. The TV card is unchanged.
// 1.70.0: name the first four Upcoming items that fall today through 30 days ahead (Pacific/Auckland).
// Car dates (WOF, rego, service) and every other Upcoming item use that same window. Overdue items
// and anything further out are not named. Television is still not mentioned. Nothing is invented.
// 1.72.0: also name up to two real What’s on events (Silver Festival is left out; if fewer than two
// exist, name however many exist) and this fortnight’s commission when an amount is recorded.
// Cars, pet care, bills, to-dos and other categories already inside Upcoming are not listed again.
// 1.77.0: the same facts, as warm bullet points. Rain or sun only if Whangārei weather is already loaded
// and the app’s own words say so. At most two real to-dos or ideas that fit that weather. One or two
// real video titles from the list he already has, for the forecast or for early spring. No television.
// English only. No gluten foods are suggested (he has coeliac disease).
// 1.78.0: roadworks stay on their own card and are not repeated in this summary. Each bullet has a warm
// tint. The weather line and any overdue line are highlighted a little more.
// 1.80.0: once Gmail or Outlook is connected, one line covers mail from the last 2 hours
// (a count and up to two real subjects, or no new mail). Subjects are never invented.
// Television is still not mentioned.
// 1.81.0: those same lines sit in numbered coloured bars. A bar about something overdue,
// or one that names something due today, is red.
// 1.84.0: the same title is named only once. “Tonight” and a clock time do not make it a different item.
// 1.87.0: one summary line uses the lifting bridge status already on Home (the same short status and next change). No extra times.
// 1.88.0: the same line adds NZTA live traffic when a queue is reported at this bridge. If that feed cannot be read, it says so and does not invent a closure.
// 1.89.0: one line names comedy programmes on now, only when the TV guide’s own category says Comedy. Other lines still skip television.
// 1.90.0: the suggestion line picks two different titles once each time the app is opened. Not from a Netflix or Prime account.
// JustWatch NZ on 3 Oct 2026 said these are streaming (not buy-only). The Good Place was buy-only that day, so it is not listed.
function homeSaysTv(s) { return /\b(tv|television)\b/i.test(String(s || '')); }
function homeGlutenFood(s) {
  const t = String(s || '').toLowerCase();
  if (/gluten[-\s]?free|\bcoeliac\b|\bceliac\b/.test(t)) return false;
  return /\b(bread|cake|cakes|biscuit|biscuits|cookie|cookies|pastry|pastries|pie|pies|pizza|pasta|noodle|noodles|sandwich|sandwiches|muffin|muffins|scone|scones|doughnut|donut|donuts|bun|buns|flour|beer|toast|wrap|wraps|bagel|croissant|pancake|pancakes|waffle|waffles|dumpling|dumplings)\b/.test(t);
}
function homeWxRead() {
  if (typeof WX === 'undefined' || !WX || !validWx(WX.data)) return { mood: '', line: '' };
  const c = WX.data.current;
  const nowW = wmo(c.weather_code, wxIsDay(), c.wind_speed_10m);
  const today = wxDays().find(x => x.iso === todayISO());
  const dayW = today ? wmo(today.code, true, today.wind) : null;
  const saysRain = w => !!w && (['drizzle', 'rain', 'showers', 'storm', 'snow'].includes(w.kind) || /\b(rain|drizzle|showers|thunderstorm|snow)\b/i.test(w.words));
  const saysSun = w => !!w && /^(Mostly sunny|Sunny|Mostly clear|Clear)\b/.test(w.words);
  if (saysRain(nowW)) return { mood: 'wet', line: `It’s ${nowW.words.toLowerCase()} in Whangārei. A perfectly good excuse to take the indoors slowly.` };
  if (saysSun(nowW)) return { mood: 'sun', line: `It’s ${nowW.words.toLowerCase()} in Whangārei. Early spring, and the light’s out if you fancy a step outside.` };
  if (saysRain(dayW)) return { mood: 'wet', line: `Whangārei’s forecast today is ${dayW.words.toLowerCase()}. A handy reason to keep things easy.` };
  if (saysSun(dayW)) return { mood: 'sun', line: `Whangārei’s forecast today is ${dayW.words.toLowerCase()}. Spring is being kind.` };
  return { mood: '', line: '' };
}
// Indoor jobs for rain, outdoor jobs for sun. Title and category only, so a long note cannot invent a match.
const HOME_WET_JOB = /\b(indoor|indoors|inside|laundry|ironing|declutter|paperwork|filing|vacuum|vacuuming|mop|mopping|dishwasher|wardrobe|cupboard|drawer|inbox|emails?|photo|photos|album|puzzle|reading|cook|cooking|recipe|bake|baking)\b/i;
const HOME_SUN_JOB = /\b(garden|gardening|mow|mowing|lawn|lawns|weed|weeding|plant|planting|prune|pruning|outdoor|outdoors|outside|beach|picnic|walk|walking|compost|greenhouse|deck|wash the car|car wash)\b/i;
function homeDayJobs(mood) {
  if (mood !== 'wet' && mood !== 'sun') return [];
  const re = mood === 'wet' ? HOME_WET_JOB : HOME_SUN_JOB;
  const other = mood === 'wet' ? HOME_SUN_JOB : HOME_WET_JOB;
  const todos = (S.todos || []).filter(t => t && !t.done && t.title);
  const ideas = (S.ideas || []).filter(i => i && i.title);
  const seen = new Set(), out = [];
  todos.concat(ideas).forEach(item => {
    if (out.length >= 2) return;
    const title = String(item.title).replace(/\s+/g, ' ').trim();
    const key = title.toLowerCase();
    if (!title || seen.has(key)) return;
    const blob = title + ' ' + (item.cat || '');
    if (homeSaysTv(blob) || homeGlutenFood(blob)) return;
    if (!re.test(blob) || other.test(blob)) return;
    seen.add(key);
    out.push(title);
  });
  return out;
}
function homeVideoPicks(mood) {
  let list = [];
  try { list = videoSuggestions(); } catch (e) { list = []; }
  list = list.filter(v => v && v.title && !homeSaysTv(v.title) && !homeGlutenFood(v.title));
  const foodOk = v => {
    if (v.category === 'cook' || v.category === 'gf') return /gluten|coeliac|celiac/i.test((v.title || '') + ' ' + (v.reason || ''));
    return true;
  };
  list = list.filter(foodOk);
  const garden = list.filter(v => v.category === 'garden');
  const indoorOrder = ['cook', 'gf', 'time', 'reno', 'pets', 'diy', 'wood', 'nz', 'tech'];
  const indoor = indoorOrder.flatMap(cat => list.filter(v => v.category === cat));
  if (mood === 'wet') {
    const first = indoor[0];
    const second = (first && garden.find(v => v !== first)) || indoor[1] || garden[0];
    return [first, second].filter(Boolean).slice(0, 2);
  }
  // Sunny, or no rain/sun line: early October is spring in New Zealand, so garden titles only.
  return garden.slice(0, 2);
}
// Same event, task or title, even if one line says Tonight or Today and another does not.
// Words already on the Home bridge card or line. Times come only from that status.
function homeBridgeBit(shown) {
  if (!shown || !shown.has('bridge')) return null;
  const st = brStatus();
  const row = BR_TXT[st && st.state];
  if (!row || !row[3]) return null;
  const next = String(brNextText(st) || '').trim();
  const traffic = bridgeTrafficSentence();
  let text = next ? `Lifting bridge: ${row[3]}. ${next}.` : `Lifting bridge: ${row[3]}.`;
  if (traffic) text += ' ' + traffic;
  return { text, urgent: st.state === 'closed' || st.state === 'noon' || bridgeTrafficLikely() };
}
function homeMentionKey(s) {
  let t = String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
  t = t.replace(/^[“"']+|[”"']+$/g, '');
  let prev = '';
  while (t && t !== prev) {
    prev = t;
    t = t.replace(/^(tonight|today|tomorrow|yesterday|in \d+ days?)\s*[:\-–—]?\s*/, '');
    t = t.replace(/\s+\d{1,2}:\d{2}\s*(am|pm)\s*$/, '');
    t = t.replace(/\s+all day\s*$/, '');
  }
  return t.trim();
}
function homeTake(seen, titles, limit) {
  const out = [];
  (titles || []).forEach(title => {
    if (limit && out.length >= limit) return;
    const raw = String(title || '').replace(/\s+/g, ' ').trim();
    const key = homeMentionKey(raw);
    if (!raw || !key || seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });
  return out;
}

// Comedy on now comes only from guide categories. Suggestions are labelled, and not an account.
// Streaming on Netflix NZ or Prime Video NZ, JustWatch NZ, 3 Oct 2026. English titles only.
const HOME_STREAM_PICKS = [
  { title: 'Brooklyn Nine-Nine', kind: 'comedy', service: 'Netflix' },
  { title: 'Grace and Frankie', kind: 'comedy', service: 'Netflix' },
  { title: 'Sex Education', kind: 'comedy', service: 'Netflix' },
  { title: 'Derry Girls', kind: 'comedy', service: 'Netflix' },
  { title: 'Stranger Things', kind: 'scifi', service: 'Netflix' },
  { title: 'Black Mirror', kind: 'scifi', service: 'Netflix' },
  { title: 'The Umbrella Academy', kind: 'scifi', service: 'Netflix' },
  { title: 'The Marvelous Mrs. Maisel', kind: 'comedy', service: 'Prime Video' },
  { title: 'Fleabag', kind: 'comedy', service: 'Prime Video' },
  { title: 'The Boys', kind: 'both', service: 'Prime Video' },
  { title: 'Upload', kind: 'both', service: 'Prime Video' },
  { title: 'Good Omens', kind: 'both', service: 'Prime Video' },
  { title: 'The Expanse', kind: 'scifi', service: 'Prime Video' },
  { title: 'Fallout', kind: 'scifi', service: 'Prime Video' }
];
let homeStreamChosen = null;
function homeStreamPair() {
  if (homeStreamChosen) return homeStreamChosen;
  const pool = HOME_STREAM_PICKS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  homeStreamChosen = [pool[0], pool[1]];
  return homeStreamChosen;
}
function homeStreamBit(p) {
  const kind = p.kind === 'comedy' ? 'a comedy' : p.kind === 'both' ? 'a comedy and science fiction series' : 'science fiction';
  return '“' + p.title + '”, ' + kind + ' on ' + p.service;
}
function homeComedyOnNow() {
  if (typeof TV === 'undefined' || !TV || !TV.data || !TV.data.feeds) return { kind: 'missing', hits: [] };
  const now = Date.now();
  const hits = [];
  let feed = false, onAir = false, classified = false;
  TV_CHANNELS.forEach(ch => {
    if (!(TV.data.feeds && TV.data.feeds[ch.feed])) return;
    feed = true;
    const item = tvOn(ch.id, now);
    if (!item || !item.title) return;
    onAir = true;
    if (!Array.isArray(item.cats)) return;
    classified = true;
    if (item.cats.some(c => /\bcomedy\b/i.test(String(c)))) hits.push('“' + item.title.trim() + '” on ' + ch.name);
  });
  if (!feed) return { kind: 'missing', hits: [] };
  if (onAir && !classified) return { kind: 'checking', hits: [] };
  return { kind: 'ready', hits };
}
function homeComedyLines() {
  const c = homeComedyOnNow();
  let first;
  if (c.kind === 'missing') first = 'The TV guide isn’t available, so no comedy is listed.';
  else if (c.kind === 'checking') first = 'Checking the TV guide for comedy.';
  else if (!c.hits.length) first = 'No comedy is on TVNZ 1, TVNZ 2, Three or Sky Starter right now.';
  else {
    const named = c.hits.slice(0, 4);
    first = 'Comedy on now: ' + engList(named) + '.';
    const more = c.hits.length - named.length;
    if (more) first += ' ' + plural(more, 'more comedy programme') + (more === 1 ? ' is' : ' are') + ' on as well.';
  }
  const pair = homeStreamPair();
  return [first, 'Suggestions, not from your account: ' + homeStreamBit(pair[0]) + ', and ' + homeStreamBit(pair[1]) + '.'];
}
function homeOverview(shown) {
  const bits = [];
  const add = (kind, text, urgent) => { if (text) bits.push({ kind, text, urgent: !!urgent }); };
  const wx = homeWxRead();
  if (wx.line) add('wx', wx.line);
  const mailLine = homeMailLine();
  if (mailLine) add('mail', mailLine);
  const brBit = homeBridgeBit(shown);
  if (brBit) add('bridge', brBit.text, brBit.urgent);
  homeComedyLines().forEach(line => add('comedy', line));
  const items = dueItems(S), over = items.filter(x => x.days < 0).length, soon = items.filter(x => x.days >= 0 && x.days <= 30).length;
  if (over && soon) add('late', `${plural(over, 'thing')} ${over === 1 ? 'is' : 'are'} a little late, and ${plural(soon, 'more')} ${soon === 1 ? 'is' : 'are'} due in the next 30 days. No fuss. They can wait their turn.`);
  else if (over) add('late', `${plural(over, 'thing')} ${over === 1 ? 'is' : 'are'} a little late, and the next 30 days are clear. Whenever you get to ${over === 1 ? 'it' : 'them'} is absolutely fine.`);
  else if (soon) add('due', `Nothing is overdue. ${plural(soon, 'thing')} ${soon === 1 ? 'is' : 'are'} due in the next 30 days, and there’s no rush.`);
  else add('due', 'Nothing is overdue, and nothing is due in the next 30 days. A nice open stretch.');
  const mentioned = new Set();
  const soonItems = homeAttention().filter(x => x.kind !== 'tv' && x.days >= 0 && x.days <= 30 && x.name && !homeSaysTv(x.name));
  const soonUnique = [];
  const soonKeys = new Set();
  soonItems.forEach(x => {
    const key = homeMentionKey(x.name);
    if (!key || soonKeys.has(key)) return;
    soonKeys.add(key);
    soonUnique.push(x);
  });
  const named = soonUnique.slice(0, 4);
  named.forEach(x => mentioned.add(homeMentionKey(x.name)));
  const names = named.map(x => x.name);
  if (names.length) add('soon', `First up in the next 30 days: ${engList(names)}.`, named.some(x => x.days === 0));
  else add('soon', 'Nothing is coming up in the next 30 days.');
  if (EVS) {
    const allEv = upcomingEvents().map(e => e && typeof e.title === 'string' ? e.title.trim() : '').filter(t => t && !homeSaysTv(t));
    const evNames = homeTake(mentioned, allEv, 2);
    if (evNames.length) add('out', `Out locally: ${engList(evNames)}.`);
    else if (!allEv.length) add('out', 'No local events are listed right now.');
  }
  if (CM().anchor) {
    const f = curFortnight();
    const recorded = CM().entries.filter(e => e.date >= f.start && e.date <= f.end);
    if (recorded.length) add('pay', `This fortnight’s commission is ${centsMoney(commSum(CM().entries, f.start, f.end))}.`);
    else add('pay', 'No commission amount is recorded for this fortnight.');
  } else add('pay', 'No commission amount is recorded for this fortnight.');
  if (shown.has('meals')) {
    const today = todayISO(), meals = upcomingMeals();
    const mealTitle = meals.includes(today) && M().plan[today] && M().plan[today].title ? M().plan[today].title : '';
    const freshMeal = mealTitle ? homeTake(mentioned, [mealTitle], 1) : [];
    if (freshMeal.length) add('meal', `Today’s meal is ${freshMeal[0]}.`);
    else if (meals.length && !mealTitle) add('meal', `${plural(meals.length, 'meal')} ${meals.length === 1 ? 'is' : 'are'} planned, and none is set for today.`);
  }
  if (shown.has('birthdays')) {
    const list = S.birthdays.map(b => Object.assign({ b }, bdayInfo(b))).filter(x => x.d >= 1 && x.d <= 30).sort((a, b) => a.d - b.d || a.b.name.localeCompare(b.b.name));
    if (list.length && list.length <= 3) {
      const bnames = homeTake(mentioned, list.map(x => x.b.name), 3);
      if (bnames.length) add('bday', `Birthdays in the next 30 days: ${engList(bnames)}.`);
    } else if (list.length) {
      const bnames = homeTake(mentioned, list.map(x => x.b.name), 1);
      if (bnames.length) add('bday', `${plural(list.length, 'birthday')} in the next 30 days, the next being ${bnames[0]}.`);
    }
  }
  const jobs = homeTake(mentioned, homeDayJobs(wx.mood), 2);
  if (jobs.length) {
    const quoted = engList(jobs.map(t => '“' + t + '”'));
    if (wx.mood === 'wet') add('job', `If you want something easy while it’s wet, your list already has ${quoted}. Only if you feel like it.`);
    else add('job', `If you want to use the sun, your list already has ${quoted}. Only if you feel like it.`);
  }
  const vids = homeVideoPicks(wx.mood).filter(v => {
    const key = homeMentionKey(v.title);
    return key && !mentioned.has(key);
  });
  if (vids.length) {
    homeTake(mentioned, vids.map(v => v.title), 2);
    const q = v => '“' + v.title + '”';
    if (wx.mood === 'wet' && vids.length === 2 && vids[0].category !== 'garden' && vids[1].category === 'garden')
      add('vid', `From your video list: ${q(vids[0])} for a rainy day, and ${q(vids[1])} for this spring.`);
    else if (wx.mood === 'wet') add('vid', `For a rainy day, your video list has ${engList(vids.map(q))}.`);
    else if (wx.mood === 'sun') add('vid', `For a sunny spring day, your video list has ${engList(vids.map(q))}.`);
    else add('vid', `For early spring, your video list has ${engList(vids.map(q))}.`);
  }
  if (!bits.length) return '';
  const bars = ['#0F766E', '#1D4ED8', '#6D28D9', '#047857', '#9A3412', '#BE185D', '#1E3A8A', '#0369A1', '#3F6212', '#155E75', '#5B21B6', '#134E4A'];
  return `<div class="card homesum" id="homesum"><ul>${bits.map((b, i) => {
    const n = String(i + 1).padStart(2, '0');
    const urgent = !!(b.urgent || b.kind === 'late');
    const style = urgent ? '' : ` style="--bar:${bars[i % bars.length]}"`;
    return `<li class="${b.kind}${urgent ? ' urgent' : ''}"${style}><span class="n">${n}</span><span class="tx">${esc(b.text)}</span></li>`;
  }).join('')}</ul></div>`;
}

// 1.95.0: every Home section uses one transparent darker grey-blue (rgba(48,62,80,.55)). Numbered summary bars are not these sections.
function homeTintStyle() {
  return '--hsec:#303e50;--hmix:55%';
}
function Home() {
  if (homeEdit) return HomeEdit();
  const now = new Date();
  let cards = '';
  if ('Notification' in window && Notification.permission === 'default' && S.settings.reminders !== false)
    cards += `<div class="callout green">${I('bell')}<div style="flex:1"><b>Get reminders on this phone</b><br>We’ll nudge you before WOFs, rego, bills and to-dos are due.
      <div class="btns" style="margin-top:8px"><button class="btn primary small" onclick="turnOnReminders()">Turn on reminders</button></div></div></div>`;
  if (deferredPrompt && !isStandalone())
    cards += `<div class="callout blue">${I('phoneDown')}<div style="flex:1"><b>Put this app on your home screen</b><br>It opens like a normal app and works without internet.
      <div class="btns" style="margin-top:8px"><button class="btn primary small" onclick="installApp()">Install app</button></div></div></div>`;
  const keys = homeOrder().filter(k => homeOn(k) || (k === 'videos' && currentSarahVideo())), br = brOnHome();
  let top = '';
  // As before 1.14.0: when the bridge is first, the full card (near the bridge, or a closure) goes right under the greeting,
  // and the compact line sits under the weather if the weather card comes next
  if (keys[0] === 'bridge' && br === 'card') { top = brCard(); keys.shift(); }
  const bi = keys.indexOf('bridge');
  if (br === 'line' && bi >= 0 && keys[bi + 1] === 'weather') { keys[bi] = 'weather'; keys[bi + 1] = 'bridge'; }
  // 1.15.0: each Home section sits in its own block with a divider line between them (the compact bridge line stays with the weather above it)
  const parts = keys.map(k => { try { return [k, HOME_CARD[k]()]; } catch (e) { console.error('Home card', k, e); return [k, '']; } }).filter(([, h]) => h && h.trim());
  const groups = [];
  parts.forEach(([k, h]) => { const g = groups[groups.length - 1]; if (k === 'bridge' && br === 'line' && g && g.k === 'weather') { g.h += h; g.keys.push(k); } else groups.push({ k, keys: [k], h }); });
  const tintN = groups.length + (top ? 1 : 0);
  const shown = new Set(parts.map(([k]) => k));
  if (top) shown.add('bridge');
  homeShownNow = shown;
  const sum = showHomeSum() ? homeOverview(shown) : '';
  let before = homeSumBefore();
  if (!Number.isFinite(before)) before = homeOrder().length;
  const precede = new Set(homeOrder().slice(0, before));
  const sections = [];
  if (top) sections.push({ keys: ['bridge'], html: `<section class="hsec hsectop" data-k="bridge" style="${homeTintStyle(0, tintN)}">${top}</section>` });
  groups.forEach((g, i) => sections.push({ keys: g.keys, html: `<section class="hsec" data-k="${g.k}" style="${homeTintStyle(i + (top ? 1 : 0), tintN)}">${g.h}</section>` }));
  let at = 0;
  if (before > 0) sections.forEach((sec, i) => { if (sec.keys.some(k => precede.has(k))) at = i + 1; });
  const sumTop = sum && before === 0 ? sum : '';
  const sumIn = sum && before > 0 ? sum : '';
  let head = '', feed = '';
  sections.forEach((sec, i) => {
    const piece = (sumIn && i === at ? sumIn : '') + sec.html;
    if (top && i === 0) head += piece; else feed += piece;
  });
  if (sumIn && at >= sections.length) feed += sumIn;
  return header('Hi ' + esc(S.settings.name || 'Shane'), `${WDL[now.getDay()]} ${now.getDate()} ${MONL[now.getMonth()]} · good to see you`) + wxGreet() + sumTop + dailyQuoteCard() + head + cards +
    feed + `${syncNote()}
    <div class="foot">${savedWhere()}</div>
    <button class="linkbtn" id="homecustomise" style="display:block;margin:8px 0 6px auto" onclick="homeEdit=true;render();$('#view').scrollTop=0">Customise</button>`;
}

/* ---------- photos (1.25.0) ----------
   A car or recipe photo is a JPEG the user took or picked on this phone, shrunk to about 400px wide,
   and saved in the same local data as everything else. Nothing is downloaded from the web. */
const PHOTO_MAX = 400;
const PHOTO_LIMIT = 160000;
function storedPhoto(s) {
  return typeof s === 'string' && s.length > 30 && s.length < PHOTO_LIMIT && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(s) ? s : '';
}
function photoOwner(kind, id) {
  if (kind === 'car') return getCar(id) || null;
  if (kind === 'recipe') return (M().ideas || []).find(x => x.id === id) || null;
  return null;
}
function loadPhotoEl(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('read')); };
    img.src = url;
  });
}
function drawPhoto(src, sw, sh, max, q) {
  const k = Math.min(1, max / sw, max / sh);
  const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(src, 0, 0, w, h);
  return c.toDataURL('image/jpeg', q);
}
async function fileToJpeg(file) {
  if (!file || (file.type && !/^image\//i.test(file.type))) throw new Error('type');
  let src, sw, sh, close = () => {};
  try {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await createImageBitmap(file); }
    src = bmp; sw = bmp.width; sh = bmp.height; close = () => { if (bmp.close) bmp.close(); };
  } catch (e) {
    src = await loadPhotoEl(file); sw = src.naturalWidth; sh = src.naturalHeight;
  }
  try {
    if (!sw || !sh) throw new Error('read');
    for (const max of [PHOTO_MAX, 320]) {
      for (const q of (max === PHOTO_MAX ? [0.72, 0.55, 0.42] : [0.6, 0.45])) {
        const url = drawPhoto(src, sw, sh, max, q);
        if (storedPhoto(url)) return url;
      }
    }
    throw new Error('big');
  } finally { close(); }
}
async function photoPicked(input, kind, id) {
  const file = input.files && input.files[0];
  input.value = '';
  const owner = photoOwner(kind, id);
  if (!file || !owner) return;
  try {
    owner.photo = await fileToJpeg(file);
    await save(); render();
    toast('Photo saved on this phone.');
  } catch (e) {
    toast('Couldn’t use that photo. Try another from your camera or gallery.');
  }
}
async function clearPhoto(kind, id) {
  const owner = photoOwner(kind, id);
  if (!owner || !owner.photo) return;
  delete owner.photo;
  await save(); render();
  toast('Photo removed.');
}
function photoBtns(kind, id) {
  const has = !!storedPhoto((photoOwner(kind, id) || {}).photo);
  const what = kind === 'car' ? 'this car' : 'this recipe';
  const cam = 'pcam-' + kind + '-' + id, pick = 'ppick-' + kind + '-' + id;
  return `<div class="btns photobtns" onclick="event.stopPropagation()">
    <input type="file" accept="image/*" capture="environment" id="${esc(cam)}" hidden onchange="photoPicked(this,${jsArg(kind)},${jsArg(id)})">
    <input type="file" accept="image/*" id="${esc(pick)}" hidden onchange="photoPicked(this,${jsArg(kind)},${jsArg(id)})">
    <button type="button" class="btn small" aria-label="${has ? 'Take a new photo' : 'Take a photo'} of ${what}" onclick="event.stopPropagation();document.getElementById(${jsArg(cam)}).click()">${I('camera')} Take a photo</button>
    <button type="button" class="btn small" aria-label="Choose a photo of ${what} from your gallery" onclick="event.stopPropagation();document.getElementById(${jsArg(pick)}).click()">${I('image')} Choose a photo</button>
    ${has ? `<button type="button" class="btn small" aria-label="Remove the photo of ${what}" onclick="event.stopPropagation();clearPhoto(${jsArg(kind)},${jsArg(id)})">Remove</button>` : ''}</div>`;
}
function carPic(c, shot) {
  const src = storedPhoto(c.photo);
  const cls = 'carpic' + (shot ? ' carshot' : '') + (src ? ' hasphoto' : '');
  const bg = esc(c.hex || colourHex(c.colour));
  if (src) return `<div class="${cls}" style="background:${bg}"><img alt="" src="${esc(src)}"></div>`;
  return `<div class="${cls}" style="background:${bg}">${I('car')}</div>`;
}
function carMark(c) {
  const src = storedPhoto(c.photo);
  if (src) return `<div class="ic car hasphoto"><img alt="" src="${esc(src)}"></div>`;
  return `<div class="ic car">${I('car')}</div>`;
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
      ${carPic(c, true)}
      <div style="flex:1;min-width:0"><div class="carname">${esc(c.name)}</div><div class="carmodel">${esc(carSub(c))}</div></div>
      ${c.plate ? `<span class="plate">${esc(c.plate)}</span>` : ''}</div>${photoBtns('car', c.id)}${carTriple(c)}</div>`).join('')
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
      <div class="big">${c.svcDate ? fmtY(c.svcDate) + (km ? ` <span style="font-size:0.9375rem;color:var(--ink2);font-weight:600">or ${km}</span>` : '') : km}</div>
      <div class="muted">${c.svcDate && c.svcKm ? 'Whichever comes first. ' : ''}${c.odo ? `Odometer: ${Number(c.odo).toLocaleString('en-NZ')} km${kmTo != null ? ` (${kmTo >= 0 ? kmTo.toLocaleString('en-NZ') + ' km to go' : (-kmTo).toLocaleString('en-NZ') + ' km over'})` : ''}.` : 'Add an odometer reading to see how many km are left.'}</div>
      <div class="btns"><button class="btn" onclick="kmForm('${c.id}')">Update km</button><button class="btn" onclick="serviceForm('${c.id}',true)">${I('check')} Serviced</button></div>${serviceHistory(c)}</div>`;
  } else {
    svc = `<div class="dcard"><div class="h">${I('wrench')} Next service <span class="pill none">Not set</span></div>
      <div class="muted" style="margin-top:8px">No service date yet. Check the sticker on the windscreen or the service book, then add the date or km it’s next due.</div>
      <div class="btns"><button class="btn primary" onclick="serviceForm('${c.id}',false)">${I('plus')} Add service date</button><button class="btn" onclick="serviceForm('${c.id}',true)">${I('check')} Serviced</button></div>${serviceHistory(c)}</div>`;
  }
  return `<div style="display:flex;justify-content:space-between;align-items:center"><button class="back" onclick="go('#cars')">${I('left')} Cars</button>
    <button class="btn small" onclick="carForm('${c.id}')">${I('edit')} Edit</button></div>
  <div class="hero">${carPic(c, false)}
   <div style="min-width:0"><h2>${esc(c.name)}</h2><div class="muted">${esc(carSub(c))}${c.details ? '<br>' + esc(c.details) : ''}</div>${c.plate ? `<div style="margin-top:6px"><span class="plate">${esc(c.plate)}</span></div>` : ''}</div></div>
  ${photoBtns('car', c.id)}
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
// Bills are grouped by pay cycle: payday up to the day before the next payday (fortnightly).
// Payday comes from S.settings.payday (any payday, picked in Bills) or else a fortnightly "Payday" event in Calendar › My events.
const BILL_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, yearly: 1 };
let payOff = 0;
const payEvent = () => (S.myEvents || []).find(e => /\bpay ?day\b/i.test(e.title) && e.repeat === 'fortnightly');
function paydays() {
  const T = todayT(), from = T - 420 * DAY, to = T + 420 * DAY;
  let ev = null;
  if (S.settings.payday && parseD(S.settings.payday) != null) { const a = parseD(S.settings.payday), k = Math.ceil((a - from) / (14 * DAY)); ev = { start: isoT(a - k * 14 * DAY), repeat: 'fortnightly' }; }
  else ev = payEvent();
  if (!ev) return null;
  const ds = repeatDates(ev, from, to).map(x => x.date);
  if (!ds.length) return null;
  if (ds[0] > todayISO()) ds.unshift(addDays(ds[0], -14));
  return ds;
}
function payPeriod(off) {
  const ds = paydays(); if (!ds) return null;
  const T = todayISO(); let i = 0; ds.forEach((d, j) => { if (d <= T) i = j; });
  const j = Math.max(0, Math.min(ds.length - 2, i + off));
  return { start: ds[j], next: ds[j + 1], end: addDays(ds[j + 1], -1), off: j - i, canBack: j > 0, canFwd: j < ds.length - 2 };
}
const payLabel = o => o === 0 ? 'This pay' : o === 1 ? 'Next pay' : o === -1 ? 'Last pay' : o > 1 ? `In ${o} pays` : `${-o} pays ago`;
async function payShift(n) { payOff += n; render(); }
function paydayForm() {
  const ds = paydays(), T = todayISO(), nxt = ds ? (ds.find(d => d > T) || T) : T;
  openSheet('Your payday',
    `<p class="muted" style="margin:0 0 12px">You’re paid every fortnight. Pick your next payday and Bills will show what’s due from each payday up to the next one.</p>` +
    field('Next payday', inp('payday', nxt, 'type="date" required')),
    async v => {
      if (!parseD(v.payday)) return 'Please choose your next payday.';
      S.settings.payday = v.payday; payOff = 0; await save(); render(); toast('Payday saved.');
    }, 'Save');
}
function Bills() {
  const unpaid = S.bills.filter(b => !b.paid);
  const over = unpaid.filter(b => daysLeft(b.due) < 0).length;
  const sorted = [...unpaid].sort((a, b) => parseD(a.due) - parseD(b.due));
  const paid = S.bills.filter(b => b.paid);
  const reg = unpaid.filter(b => BILL_PER_YEAR[b.repeat]);
  const avg = reg.reduce((t, b) => t + (Number(b.amount) || 0) * BILL_PER_YEAR[b.repeat] / 26, 0);
  const row = b => {
    const d = daysLeft(b.due);
    return `<div class="row bill"><button class="tapzone" onclick="billForm('${b.id}')" aria-label="Edit ${esc(b.name)}"><div class="ic bill">${I(billIcon(b.name))}</div>
      <div class="tx"><div class="t">${esc(b.name)}</div><div class="s">${REPEATS[b.repeat] || 'One-off'} · ${b.paid ? 'paid ' + fmt(b.paidOn || b.due) : 'due ' + fmtW(b.due)}</div></div></button>
      <div class="right badgestack">${b.paid ? '<span class="pill paid">Paid ✓</span>' : duePill(d)}${moneyBadge(b.amount, b.name)}
      ${b.paid ? `<button class="paybtn" onclick="unpay('${b.id}')">Undo</button>` : `<button class="paybtn" onclick="markPaid('${b.id}')">Mark paid</button>`}</div></div>`;
  };
  let pay = '';
  const pp = S.bills.length ? payPeriod(payOff) : null;
  if (S.bills.length && !pp) {
    pay = `<div class="callout green" id="paysetup">${I('cal')}<div style="flex:1"><b>Line your bills up with your pay</b><br>Set your payday and we’ll show what’s due from each payday up to the next one.
      <div style="margin-top:10px"><button class="btn small primary" onclick="paydayForm()">Set payday</button></div></div></div>`;
  } else if (pp) {
    payOff = pp.off;
    const sT = parseD(pp.start), eT = parseD(pp.end), items = [];
    unpaid.forEach(b => {
      billDates(b, sT, eT).forEach(d => items.push({ b, d }));
      if (pp.off === 0 && parseD(b.due) < sT) items.push({ b, d: b.due, late: 1 });
    });
    items.sort((x, y) => x.d < y.d ? -1 : x.d > y.d ? 1 : 0);
    const tot = items.reduce((t, x) => t + (Number(x.b.amount) || 0), 0), late = items.filter(x => x.late).length;
    const prow = x => { const cur = x.d === x.b.due, dl = daysLeft(x.d);
      return `<div class="row bill payrow"><button class="tapzone" onclick="billForm('${x.b.id}')" aria-label="Edit ${esc(x.b.name)}"><div class="ic bill">${I(billIcon(x.b.name))}</div>
        <div class="tx"><div class="t">${esc(x.b.name)}</div><div class="s">${x.late ? 'Overdue, was due ' : 'Due '}${fmtW(x.d)}</div></div></button>
        <div class="right badgestack">${pp.off <= 0 || dl <= 7 ? duePill(dl) : ''}${moneyBadge(x.b.amount, x.b.name)}${cur ? `<button class="paybtn" onclick="markPaid('${x.b.id}')">Mark paid</button>` : ''}</div></div>`; };
    pay = `<div class="summary" id="paysum">
      <div class="paynav"><button class="paystep" id="payprev" aria-label="Previous pay" ${pp.canBack ? '' : 'disabled'} onclick="payShift(-1)">${I('left')}</button>
        <div class="paytitle"><b>${payLabel(pp.off)}</b><span>${fmtW(pp.start)} to ${fmtW(pp.end)}</span></div>
        <button class="paystep" id="paynext" aria-label="Next pay" ${pp.canFwd ? '' : 'disabled'} onclick="payShift(1)">${I('right')}</button></div>
      <div class="muted">${pp.off < 0 ? 'Bills that were due' : 'To pay before the next payday'}</div><div class="amt" id="paytotal">${money(tot)}</div>
      <div class="muted">${items.length ? plural(items.length, 'bill') : 'Nothing due'}${late ? ` · <b style="color:var(--onbrand)">${late} overdue</b>` : ''} · next payday ${fmtW(pp.next)}</div>
      <div class="muted billsub">${reg.length ? `Your regular bills average ${money(avg)} a fortnight. ` : ''}<button class="linkbtn" id="paychange" onclick="paydayForm()">Change payday</button></div></div>
      <div class="sec">Due ${pp.off === 0 ? 'this pay' : pp.off === 1 ? 'next pay' : pp.off === -1 ? 'last pay' : fmtW(pp.start) + ' to ' + fmtW(pp.end)}</div>
      ${items.length ? `<div class="list" id="paylist">${items.map(prow).join('')}</div>` : `<div class="card muted" id="paylist">No bills due ${pp.off < 0 ? 'in that pay' : 'in this pay'}.</div>`}`;
  }
  return header('Bills', 'Regular bills and due dates', addBtn('Add a bill', 'billForm()')) +
    (S.bills.length ? `${pay}
      <div class="sec">All bills${over && !pp ? ` · ${over} overdue` : ''}</div>
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
  const row = t => `<div class="row ${t.done ? 'done' : ''}"><button type="button" class="tick${t.done ? '' : ' donelabel'}" aria-label="${t.done ? 'Mark not done' : 'Mark complete'}: ${esc(t.title)}" onclick="tick('${t.id}')"><span>${I('check')}</span>${t.done ? '' : '<b>Done</b>'}</button>
    <button class="tapzone" onclick="todoForm('${t.id}')"><div class="tx"><div class="t">${esc(t.title)}</div><div class="s">${esc(t.list)}${t.due && !t.done ? ' · ' + fmtW(t.due) : ''}${!t.due && !t.done ? ' · no date' : ''}${todoAppt(t) ? ' · in your calendar' : ''}</div></div>
    ${t.due && !t.done ? pill(daysLeft(t.due)) : ''}</button>${t.done ? '' : todoCalBtn(t)}</div>`;
  const openCount = S.todos.filter(t => !t.done).length;
  return header('To-do', openCount ? plural(openCount, 'thing') + ' to do' : 'Nothing to do', addBtn('Add a to-do', 'todoForm()')) +
    `<div class="chips">${['All', ...S.lists].map(l => `<button class="chip ${l === todoFilter ? 'on' : ''}" onclick="setTodoFilter(${jsArg(l)})">${esc(l)}</button>`).join('')}
      <button class="chip plus" onclick="listForm()">+ New list</button></div>
    ${todoFilter !== 'All' ? `<div style="display:flex;gap:18px;margin:-2px 4px 10px;font-size:0.875rem;font-weight:600"><button style="color:var(--brand);padding:4px 0" onclick="listForm(${jsArg(todoFilter)})">Rename list</button><button style="color:var(--red);padding:4px 0" onclick="deleteList(${jsArg(todoFilter)})">Delete list</button></div>` : ''}
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
  const t = S.todos.find(x => x.id === id); if (!t) return;
  const s = snap();
  t.done = !t.done;
  if (t.done) t.doneAt = Date.now(); else delete t.doneAt;
  await save();
  if (sheetOpen) await closeSheet();
  render();
  toast(t.done ? `Marked done: ${t.title}` : `${t.title} marked not done.`, 'Undo', undoTo(s));
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
    field('Notes', area('notes', t.notes)) +
    (id ? `<div class="btns" style="margin-top:4px"><button type="button" class="btn" onclick="tick('${id}')">${I('check')} ${t.done ? 'Mark not done' : 'Mark complete'}</button>${t.done ? '' : `<button type="button" class="btn" onclick="addTodoCal('${id}')">${I('cal')} ${todoAppt(t) ? 'In your calendar' : 'Add to calendar'}</button>`}</div>` : ''),
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
// 1.67.0: a to-do can become an appointment in this app's calendar (S.appts). The to-do stays.
const TODO_CAL_TIME = '09:00';
function todoClock(t) {
  const raw = t && (t.time || t.dueTime || '');
  return /^\d{2}:\d{2}$/.test(String(raw)) ? String(raw) : '';
}
function todoAppt(t) { return t && t.apptId ? S.appts.find(a => a.id === t.apptId) || null : null; }
function todoCalBtn(t) {
  const on = !!todoAppt(t);
  const label = on ? 'In your calendar' : 'Add to calendar';
  return `<button class="paybtn" style="margin-top:0;align-self:center" onclick="addTodoCal('${t.id}')" aria-label="${label}: ${esc(t.title)}">${label}</button>`;
}
async function addTodoCal(id) {
  const t = S.todos.find(x => x.id === id);
  if (!t || t.done) return;
  const f = document.getElementById('sf');
  const fromForm = !!(sheetOpen && f && f.title && f.list && f.due);
  let title = t.title, list = t.list, due = t.due, notes = t.notes || '';
  if (fromForm) {
    title = f.title.value.trim();
    if (!title) { toast('Please type the to-do.'); return; }
    list = f.list.value;
    due = f.due.value;
    if (f.notes) notes = f.notes.value.trim();
  }
  const have = todoAppt(t);
  if (have) { if (sheetOpen) await closeSheet(); apptForm(have.id); return; }
  if (!parseD(due)) { toast('Set a due date on this to-do first.'); return; }
  const s = snap();
  t.title = title; t.list = list; t.due = due; t.notes = notes;
  const own = todoClock(t);
  const time = own || TODO_CAL_TIME;
  const appt = { id: uid('appt'), title: t.title, date: t.due, time, notes: t.notes || '', todoId: t.id };
  S.appts.push(appt);
  t.apptId = appt.id;
  await save();
  if (sheetOpen) await closeSheet();
  render();
  toast(own ? `Added to your calendar at ${fmtTime(time)}.` : `Added to your calendar at ${fmtTime(time)}. Change the time if you want.`, 'Change', () => apptForm(appt.id));
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
  S.appts.filter(a => inR(a.date)).forEach(a => ev.push({ src: 'appt', title: a.title, date: a.date, time: a.time ? fmtTime(a.time) : 'All day', sort: a.time || '00:00', go: `apptForm('${a.id}')`, notes: a.notes, tag: a.evId ? 'Event' : undefined }));
  S.birthdays.forEach(b => bdayDates(b, fromT, toT).forEach(d => {
    const age = bdayAge(b, d);
    ev.push({ src: 'bday', title: `${b.name}’s ${age > 0 ? ordinal(age) + ' ' : ''}birthday`, date: d, time: 'Birthday', sort: '', tag: 'Birthday', go: `birthdayForm('${b.id}')` });
  }));
  holItems(fromT, toT).forEach(x => ev.push(x));
  extEvents(fromT, toT).forEach(x => ev.push(x));
  mealCalItems(inR).forEach(x => ev.push(x));
  petCalItems(inR).forEach(x => ev.push(x));
  gardenCalItems(fromT, toT).forEach(x => ev.push(x));
  healthCalItems(fromT, toT, inR).forEach(x => ev.push(x));
  mineItems(fromT, toT).forEach(x => ev.push(x));
  const rank = { due: 0, pet: 0, garden: 0, hol: 1, bday: 1, appt: 2, health: 2, mine: 2, ext: 2, meal: 3 };
  return ev.sort((a, b) => parseD(a.date) - parseD(b.date) || rank[a.src] - rank[b.src] || (a.sort || '').localeCompare(b.sort || ''));
}
/* NZ public holidays: built in (core.js), on unless turned off in Settings */
const showHolidays = () => !S.settings || S.settings.holidays !== false;
const holList = (fromT, toT) => showHolidays() ? holidaysBetween(fromT, toT) : [];
function holNote(h) {
  if (h.observedFor) return `Day off for ${h.name.replace(' (observed)', '')} (${fmtW(h.observedFor)})`;
  if (h.observedOn) return `Most people get ${fmtW(h.observedOn)} off`;
  return h.regional || '';
}
function holItems(fromT, toT) {
  return holList(fromT, toT).map(h => ({ src: 'hol', title: h.name, date: h.date, time: 'Holiday', sort: '', tag: 'Public holiday', notes: holNote(h),
    go: `showHol('${h.date}',${JSON.stringify(h.name).replace(/"/g, '&quot;')})` }));
}
// A connected calendar (e.g. Google's NZ holidays) that has the same holiday on the same day isn't shown twice
const normT = t => String(t || '').toLowerCase().replace(/[’‘`]/g, "'");
function holDup(e, byDate) {
  const hs = byDate[e.date]; if (!hs || (e.endDate && e.endDate !== e.date)) return false;
  const t = normT(e.title);
  return hs.some(h => h.kw.some(k => t.includes(k)));
}
function showHol(date, name) {
  const h = holidaysBetween(parseD(date), parseD(date)).find(x => x.name === name); if (!h) return;
  const note = holNote(h);
  openSheet(esc(h.name), `<div class="dcard"><div class="h"><i class="dot" style="background:var(--hol)"></i> Public holiday</div>
      <div class="big" style="font-size:1.125rem">${fmtLong(h.date)}</div>
      ${note ? `<div class="muted" style="margin-top:6px">${esc(note)}</div>` : ''}</div>
    <p class="muted" style="margin:0 2px 6px">New Zealand public holidays are built into the app, using the official dates from employment.govt.nz. You can hide them in Settings.</p>`);
}
function homeHolidays() {
  const T = todayT(), list = holList(T, T + 14 * DAY);
  // show each holiday once: its actual day, plus the day off if it moves to a Monday
  const shown = list.filter(h => !(h.observedFor && list.some(x => x.date === h.observedFor)));
  if (!shown.length) return '';
  return `<div class="list holhome">${shown.slice(0, 3).map(h => {
    const d = daysLeft(h.date), off = h.observedOn ? ` · day off ${fmtW(h.observedOn)}` : '';
    return `<button class="row" onclick="showHol('${h.date}',${JSON.stringify(h.name).replace(/"/g, '&quot;')})"><div class="ic hol">${I('flag')}</div>
      <div class="tx"><div class="t">${esc(h.name)}, ${fmtW(h.date)}</div><div class="s">Public holiday · ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days'}${off}${h.regional ? ' · ' + esc(h.regional) : ''}</div></div></button>`;
  }).join('')}</div>`;
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
    // v1.9.0: coloured chips (short label where it fits, a plain bar on narrow screens), up to 3, else 2 and "+N more"
    const iso = isoT(t), all = byDay[iso] || [], hol = all.some(e => e.src === 'hol'), dow = d.getUTCDay();
    const items = [...all.filter(e => e.src === 'hol'), ...all.filter(e => e.src !== 'hol')];
    const shown = items.length > 3 ? items.slice(0, 2) : items, more = items.length - shown.length;
    cells += `<button class="${other ? 'other' : ''} ${t === T ? 'today' : ''} ${t === calSel ? 'sel' : ''} ${dow === 0 || dow === 6 ? 'we' : ''} ${hol ? 'holday' : ''}" aria-label="${fmtLong(iso)}" data-d="${iso}" data-n="${items.length}" onclick="pickDay(${t})">
      <span class="n">${d.getUTCDate()}</span><span class="dots">${shown.map(e => `<i class="cc" title="${esc(e.title)}" style="--c:${e.color ? esc(e.color) : `var(--${e.src})`}">${esc(chipLabel(e))}</i>`).join('')}${more ? `<b class="more">+${more}<span class="mw"> more</span></b>` : ''}</span></button>`;
  }
  const evRow = (e, ic) => {
    const inner = `<span class="bar" style="background:${e.color || `var(--${e.src})`}"></span>${ic ? `<span class="evic" style="--c:${e.color ? esc(e.color) : `var(--${e.src})`}">${I(calIcon(e))}</span>` : ''}<span class="time">${esc(e.time)}</span>
     <div style="flex:1;min-width:0"><div class="t">${esc(e.title)}</div>${e.notes ? `<div class="s">${esc(e.notes)}</div>` : ''}</div><span class="tag ${e.src}" ${e.color ? `style="background:${e.color}"` : ''}>${esc(e.done ? 'Done' : (e.tag || (e.src === 'appt' ? 'Appt' : 'Due')))}</span>`;
    if (e.src === 'mine' && e.id && e.orig) {
      const act = e.done ? 'Mark not done' : 'Mark complete';
      return `<div class="ev${ic ? ' evi' : ''}${e.done ? ' done' : ''}"><button type="button" class="tapzone" onclick="${e.go}">${inner}</button><button type="button" class="paybtn" aria-label="${act}: ${esc(e.title)}" onclick="completeMine(${jsArg(e.id)},${jsArg(e.orig)})">${e.done ? 'Undo' : 'Done'}</button></div>`;
    }
    return `<button class="ev${ic ? ' evi' : ''}" onclick="${e.go}">${inner}</button>`;
  };
  const dayLabel = s => { const d = daysLeft(s); return (d === 0 ? 'Today · ' : d === 1 ? 'Tomorrow · ' : '') + fmtW(s); };
  let agenda;
  if (calSel !== null) {
    agenda = dayView(calSel, evRow);
  } else {
    const overdue = dueItems(S).filter(x => x.days < 0 && (x.kind !== 'pet' || showPetsCal()) && (x.kind !== 'health' || showHealthCal()));
    const groups = {};
    calItems(T, T + 21 * DAY).forEach(e => (groups[e.date] = groups[e.date] || []).push(e));
    agenda = (overdue.length ? `<div class="sec">Overdue</div><div class="list">${overdue.map(rowFor).join('')}</div>` : '') +
      `<div class="sec">Next 3 weeks <button onclick="apptForm()">Add appointment</button></div>` +
      (Object.keys(groups).length ? Object.keys(groups).map(k => `<div class="agday">${dayLabel(k)}</div>${groups[k].map(evRow).join('')}`).join('')
        : empty('Nothing in the next 3 weeks', 'Add an appointment, or tap a day on the calendar.', 'Add an appointment', 'apptForm()'));
  }
  return header('Calendar', S.feeds.length ? 'Due dates, appointments and ' + S.feeds.map(f => esc(f.name)).join(' & ') : 'Due dates and appointments', addBtn('Add an appointment', 'apptForm()')) +
    `<div class="card calcard"><div class="monthbar"><button class="iconbtn" aria-label="Previous month" onclick="shiftMonth(-1)">${I('left')}</button>
      <b>${MONL[m]} ${y}</b><button class="iconbtn" aria-label="Next month" onclick="shiftMonth(1)">${I('right')}</button></div>
     <div class="legend"><span><i class="dot" style="background:var(--due)"></i>Due dates</span><span><i class="dot" style="background:var(--appt)"></i>Appointments</span>${showMine() && S.myEvents.length ? '<span><i class="dot" style="background:var(--mine)"></i>My events</span>' : ''}${S.birthdays.length ? '<span><i class="dot" style="background:var(--bday)"></i>Birthdays</span>' : ''}${showHolidays() ? '<span><i class="dot" style="background:var(--hol)"></i>Public holidays</span>' : ''}${showMealsCal() && Object.keys(M().plan).length ? '<span><i class="dot" style="background:var(--meal)"></i>Meals</span>' : ''}${showPetsCal() && S.pets.some(p => p.care.some(c => careDue(c))) ? '<span><i class="dot" style="background:var(--pet)"></i>Pets</span>' : ''}${gardenCalItems(gridStart, gridEnd).length ? '<span><i class="dot" style="background:var(--garden)"></i>Garden</span>' : ''}${showHealthCal() && S.health.some(p => p.items.some(it => it.apptDate || careDue(it))) ? '<span><i class="dot" style="background:var(--health)"></i>Health</span>' : ''}${S.feeds.map(f => `<span><i class="dot" style="background:${esc(f.colour)}"></i>${esc(f.name)}</span>`).join('')}
      ${y !== now.getFullYear() || m !== now.getMonth() ? `<button style="margin-left:auto;color:var(--brand);font-weight:700" onclick="calMonth=null;calSel=null;render()">Back to today</button>` : ''}</div>
     <div class="grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div></div>
    <div class="btns addev"><button class="btn primary" id="addevent" onclick="mineForm(null${calSel !== null ? `,'${isoT(calSel)}'` : ''})">${I('plus')} Add event${calSel !== null ? ' on ' + fmtW(isoT(calSel)) : ''}</button></div>
    ${agenda}
    ${S.feeds.length ? syncNote(true) : `<div class="callout blue" style="margin-top:16px">${I('link')}<div><b>Bring in your Outlook or Google calendar.</b> Paste your calendar link once and your appointments show up here, with reminders.
      <div class="btns" style="margin-top:8px"><button class="btn primary small" onclick="go('#settings');setTimeout(()=>{const x=document.getElementById('calsec');x&&x.scrollIntoView()},50)">Connect a calendar</button></div></div></div>`}`;
}
function pickDay(t) { calSel = calSel === t ? null : t; render(); if (calSel !== null) setTimeout(dayIntoView, 30); }
// v1.9.0 calendar helpers: short chip label, an icon per kind, and the day view (all-day items, then timed items)
// month chips are narrow: long labels are cut to their first word ("Rubbish day" -> "Rubbish", "Labour Day" -> "Labour")
function chipLabel(e) { const l = chipFull(e).trim(), w = l.split(/\s+/)[0]; return l.length > 8 && w.length >= 3 ? w.replace(/[’',:·-]+$/, '') : l; }
function chipFull(e) {
  if (e.src === 'due') return ({ Bill: e.title.split(' · ')[0] })[e.time] || (e.time === 'To-do' ? e.title : e.time);
  if (e.src === 'bday') return e.title.replace(/’s .*$/, '');
  if (e.src === 'health') return e.title.replace(/^[^–]*– /, '');
  return e.title;
}
function calIcon(e) {
  if (e.src === 'due') return { WOF: 'shield', Rego: 'doc', Service: 'wrench', Bill: 'bill', 'To-do': 'todo', AA: 'idcard', Licence: 'idcard' }[e.time] || 'cal';
  return { appt: e.tag === 'Event' ? 'ticket' : 'clock', bday: 'cake', hol: 'flag', ext: 'link', meal: 'meal', pet: 'paw', garden: 'leaf', health: 'heart', mine: 'repeat' }[e.src] || 'cal';
}
// timed = has a clock time (appointments, events, health bookings) or a set slot (tonight's dinner at 6 pm)
const isTimed = e => /^\d\d:\d\d/.test(e.sort || '') && e.time !== 'All day';
function dayView(t, evRow) {
  const iso = isoT(t), list = calItems(t, t), d = daysLeft(iso);
  const allDay = list.filter(e => !isTimed(e)), timed = list.filter(isTimed).sort((a, b) => a.sort.localeCompare(b.sort));
  const hols = list.filter(e => e.src === 'hol');
  const head = `<div class="dayhead" id="dayview"><div><div class="dwhen">${d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d === -1 ? 'Yesterday' : d > 1 ? 'In ' + d + ' days' : -d + ' days ago'}</div>
    <div class="ddate">${fmtLong(iso)}</div>${hols.length ? `<div class="dhol">${I('flag')} ${hols.map(h => esc(h.title)).join(', ')}</div>` : ''}</div>
    <span class="dcount">${list.length ? plural(list.length, 'item') : 'Free day'}</span></div>`;
  const grp = (label, arr) => arr.length ? `<div class="agday">${label}</div>${arr.map(e => evRow(e, true)).join('')}` : '';
  return `<div class="sec">Day view <button onclick="calSel=null;render()">Show all</button></div>
    <div class="dayview">${head}
    ${list.length ? grp('All day', allDay) + grp('At a set time', timed) : '<div class="card muted" style="margin-bottom:8px">Nothing on this day.</div>'}
    <div class="btns" style="margin-top:4px"><button class="btn" onclick="apptForm(null,'${iso}')">${I('plus')} Add an appointment on this day</button></div></div>`;
}
function dayIntoView() {
  const el = document.getElementById('dayview'), v = document.getElementById('view'); if (!el || !v) return;
  const r = el.getBoundingClientRect(); if (r.top > innerHeight - 200) v.scrollBy({ top: r.top - innerHeight + 260, behavior: 'smooth' });
}
function shiftMonth(n) { let { y, m } = calMonth; m += n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } calMonth = { y, m }; calSel = null; render(); }
function apptForm(id, date) {
  const a = id ? S.appts.find(x => x.id === id) : { title: '', date: date || (calSel != null ? isoT(calSel) : todayISO()), time: '', notes: '' };
  openSheet(id ? 'Edit appointment' : 'Add an appointment',
    field('What is it?', inp('title', a.title, 'placeholder="e.g. Haircut" required maxlength="80"')) +
    `<div class="two">${field('Date', inp('date', a.date, 'type="date" required'))}${field('Time', inp('time', a.time, 'type="time"'), 'Leave blank for all day')}</div>` +
    field('Where / notes', area('notes', a.notes)) +
    (a.evUrl ? `<p class="muted" style="margin:4px 0 0">From Whangārei events. <a href="${esc(a.evUrl)}" target="_blank" rel="noopener">Open the event page</a></p>` : ''),
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
// don't let web apps read calendar links directly. It keeps nothing.
const RELAY_DEFAULT = 'https://due-dates-calendar-relay.phoneapp12.workers.dev';
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
  const out = [], hol = {};
  holList(fromT, toT).forEach(h => (hol[h.date] = hol[h.date] || []).push(h));
  S.feeds.forEach(f => {
    const c = CAL[f.id]; if (!c || !c.events) return;
    c.events.forEach(e => {
      if (e.birthday && bdayMatch(e)) return; // already in Birthdays, don't show it twice
      if (holDup(e, hol)) return; // already shown as a built-in public holiday
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
      <div class="big" style="font-size:1.125rem">${when}</div>
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
  return card ? `<div class="callout blue" style="margin-top:16px">${I('refresh')}<div>${txt}</div></div>` : `<div class="muted" style="margin:8px 4px 0;font-size:0.8125rem">${txt}</div>`;
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
      <div class="srow" style="padding:10px 0 0;border:0;min-height:0"><div class="tx"><div class="t" style="font-size:0.875rem">Reminders</div><div class="s">1 hour before, all-day ones in the morning</div></div>
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
    field('Calendar link', `<textarea name="url" rows="3" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://outlook.live.com/owa/calendar/…/calendar.ics" style="font-size:0.875rem;word-break:break-all">${esc(f.url)}</textarea>`,
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

/* ================= MEAL PLANNER ================= */
// Everything lives in S.meals (so it's in backups): { nights: [weekday numbers, 0 = Sunday], plan: { 'YYYY-MM-DD': { title, notes, ideaId, cooked, cookedAt } },
// ideas: [{ id, title, tag, ingr: [..], link, notes, fav, hidden, builtin }], list: to-do list for shopping }
const MEAL_TAGS = ['Quick', 'BBQ', 'Slow cook', 'Oven bake', 'Budget', 'Takeaway-style'];
const MEAL_WEEKS = 4, MEAL_GAP = 21; // plan shows about 4 weeks; Suggest avoids meals planned within 3 weeks either side
// Shane has coeliac disease: every starter is written gluten free (explicit GF products, cornflour, rice noodles, corn tortillas).
// [title, tag, ingredients, notes]. The id comes from the title, so keep titles stable (see MEAL_REPLACED for swapped dishes).
const MEAL_STARTERS = [
  ['Butter chicken', 'Takeaway-style', 'chicken thighs, gluten-free butter chicken sauce, onion, cream, rice, gluten-free naan bread'],
  ['Spaghetti bolognese', 'Budget', 'beef mince, onion, garlic, tinned tomatoes, tomato paste, gluten-free Worcestershire sauce, gluten-free spaghetti, parmesan'],
  ['Roast lamb with veges', 'Oven bake', 'leg of lamb, potatoes, pumpkin, carrots, frozen peas, gluten-free gravy, mint sauce'],
  ['Fish and chips night', 'Takeaway-style', 'white fish fillets, potatoes, gluten-free flour, eggs, gluten-free breadcrumbs, lemons, tartare sauce, coleslaw', 'Crumbed at home with gluten-free crumbs – no beer batter. Chips cooked in clean oil.'],
  ['Homemade burgers', 'Takeaway-style', 'beef mince, gluten-free burger buns, cheese slices, lettuce, tomatoes, sliced beetroot, onion, gluten-free burger sauce'],
  ['Beef nachos', 'Quick', 'beef mince, kidney beans, gluten-free taco seasoning, corn chips, grated cheese, sour cream, avocado, salsa'],
  ['Chicken stir fry', 'Quick', 'chicken breast, stir fry veges, garlic, ginger, gluten-free soy sauce (tamari), gluten-free oyster sauce, rice noodles'],
  ['Sausage casserole', 'Slow cook', 'gluten-free sausages, onion, carrots, tinned tomatoes, baked beans, potatoes'],
  ['Mince and cheese pies', 'Oven bake', 'beef mince, onion, gluten-free gravy, grated cheese, gluten-free pastry'],
  ['Lasagne', 'Oven bake', 'beef mince, onion, tinned tomatoes, gluten-free lasagne sheets, milk, cornflour, butter, grated cheese'],
  ['BBQ – sausages, steak and salads', 'BBQ', 'gluten-free sausages, steak, gluten-free bread, onions, coleslaw, potato salad, tomato sauce'],
  ['Crispy pork belly', 'Oven bake', 'pork belly, salt, potatoes, apple sauce, broccoli'],
  ['Fish tacos', 'Quick', 'white fish fillets, corn tortillas, red cabbage, limes, avocado, sour cream, coriander'],
  ['Chicken curry', 'Slow cook', 'chicken thighs, gluten-free curry paste, coconut milk, onion, spinach, rice'],
  ['Roast chicken', 'Oven bake', 'whole chicken, potatoes, pumpkin, carrots, gluten-free stuffing, gluten-free gravy'],
  ['Shepherd’s pie', 'Budget', 'lamb mince, onion, carrots, frozen peas, gluten-free gravy, potatoes, grated cheese'],
  ['Chilli con carne', 'Slow cook', 'beef mince, kidney beans, tinned tomatoes, onion, chilli powder, rice, sour cream'],
  ['Beef and vege stew', 'Slow cook', 'gravy beef, onions, carrots, potatoes, gluten-free beef stock, cornflour, gluten-free bread rolls'],
  ['Corned beef with white sauce', 'Slow cook', 'corned silverside, potatoes, carrots, cabbage, milk, butter, cornflour, mustard'],
  ['Honey soy chicken drumsticks', 'Budget', 'chicken drumsticks, honey, gluten-free soy sauce (tamari), garlic, rice, broccoli'],
  ['Homemade pizza', 'Takeaway-style', 'gluten-free pizza bases, pizza sauce, mozzarella, ham, pineapple, capsicum, mushrooms'],
  ['Beef tacos', 'Quick', 'beef mince, corn taco shells, gluten-free taco seasoning, lettuce, tomatoes, grated cheese, sour cream'],
  ['Bacon and egg pie', 'Budget', 'gluten-free pastry, bacon, eggs, frozen peas, onion, tomatoes'],
  ['Steak, chips and salad', 'Quick', 'steaks, potatoes for home-made chips, salad greens, tomatoes, mushrooms', 'Bought oven chips often have a wheat coating, so home-made chips are the safe bet.'],
  ['Lamb chops, mash and peas', 'Quick', 'lamb chops, potatoes, butter, milk, frozen peas, mint sauce'],
  ['Pork chops with apple and mash', 'Quick', 'pork chops, apples, potatoes, green beans, butter'],
  ['Pulled pork burgers', 'Slow cook', 'pork shoulder, gluten-free BBQ sauce, gluten-free burger buns, coleslaw'],
  ['Chicken schnitzel with salad', 'Quick', 'chicken breasts, gluten-free breadcrumbs, eggs, gluten-free flour, potatoes, salad greens, lemons'],
  ['Macaroni cheese', 'Budget', 'gluten-free macaroni, grated cheese, milk, butter, cornflour, bacon'],
  ['Savoury mince on toast', 'Budget', 'beef mince, onion, carrots, frozen peas, gluten-free gravy, gluten-free bread'],
  ['Fried rice', 'Budget', 'rice, eggs, bacon, frozen peas and corn, spring onions, gluten-free soy sauce (tamari)'],
  ['Sweet and sour pork', 'Takeaway-style', 'pork pieces, cornflour, pineapple pieces, capsicum, onion, gluten-free sweet and sour sauce, rice', 'Toss the pork in cornflour instead of batter.'],
  ['Beef and broccoli stir fry', 'Takeaway-style', 'beef strips, broccoli, garlic, ginger, gluten-free soy sauce (tamari), cornflour, rice'],
  ['Chicken kebabs on the BBQ', 'BBQ', 'chicken thighs, capsicum, red onion, kebab skewers, gluten-free wraps, tzatziki'],
  ['BBQ lamb steaks', 'BBQ', 'lamb leg steaks, rosemary, garlic, potatoes, salad greens'],
  ['BBQ chicken thighs with corn', 'BBQ', 'chicken thighs, smoked paprika, garlic, lemons, corn cobs, potatoes, salad greens'],
  ['Chicken pasta bake', 'Oven bake', 'gluten-free pasta, chicken breast, bacon, cream, spinach, grated cheese'],
  ['Meatballs and spaghetti', 'Budget', 'beef mince, gluten-free breadcrumbs, egg, pasta sauce, gluten-free spaghetti, parmesan'],
  ['Salmon with rice and greens', 'Quick', 'salmon fillets, rice, broccoli, bok choy, gluten-free soy sauce (tamari), lemon'],
  ['Satay chicken', 'Quick', 'chicken thighs, peanut butter, coconut milk, gluten-free soy sauce (tamari), rice, green beans']
];
// v1.4.1 swapped two v1.4.0 starters that don't work well gluten free (old id → new id)
const MEAL_REPLACED = { 'meal-beef-and-black-bean': 'meal-beef-and-broccoli-stir-fry', 'meal-sausage-sizzle': 'meal-bbq-chicken-thighs-with-corn' };
const MEAL_REPLACED_NAMES = { 'meal-beef-and-black-bean': 'Beef and black bean', 'meal-sausage-sizzle': 'Sausage sizzle' };
const STARTER_VER = 2;
// Ingredients where gluten often hides: shown with a "check label" hint on the shopping list
const CHECK_LABEL = /stock|sauce|tamari|gravy|curry paste|salsa|mustard|tzatziki|sausage|seasoning|chilli powder|stuffing|bacon|\bham\b|corned|corn chips|baked beans|cornflour|coleslaw|potato salad|tortillas|taco shells|rice noodles|mayonnaise|marinade|spice/i;
const needsCheck = g => CHECK_LABEL.test(g);
const GF_NOTE = 'All ideas are written gluten free. Always check labels for “gluten free”, especially stock, sauces, sausages and seasonings.';
const mealSlug = t => t.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const starterMeals = () => MEAL_STARTERS.map(([title, tag, ingr, notes]) => ({ id: 'meal-' + mealSlug(title), title, tag, ingr: ingr.split(', '), link: '', notes: notes || '', fav: false, hidden: false, gf: true, builtin: true }));
const newMeals = () => ({ nights: [5, 6], plan: {}, ideas: starterMeals(), list: '', starterVer: STARTER_VER });
// Bring saved starter ideas up to date (v1.4.1: gluten-free ingredients) without touching Shane's own ideas or planned nights.
// Starter ideas keep his favourite/hidden/notes/link; the two swapped dishes are replaced, and upcoming (not cooked) nights
// holding them switch to the replacement. Past nights keep their name. Own ideas from before this had no GF tick, so they
// start unticked (not assumed gluten free).
function migrateStarters(m) {
  const fresh = new Map(starterMeals().map(i => [i.id, i])), T = todayISO(), switched = [];
  const keep = [];
  m.ideas.forEach(i => {
    if (!i.builtin) { if (typeof i.gf !== 'boolean') i.gf = false; keep.push(i); return; }
    if (MEAL_REPLACED[i.id]) { const n = fresh.get(MEAL_REPLACED[i.id]); if (n && i.fav) n._fav = true; return; }
    const n = fresh.get(i.id);
    if (n && !i.edited) Object.assign(i, { title: n.title, tag: n.tag, ingr: n.ingr.slice(), gf: true, notes: i.notes || n.notes });
    else if (typeof i.gf !== 'boolean') i.gf = true;
    keep.push(i);
  });
  const have = new Set(keep.map(i => i.id)), titles = new Set(keep.map(i => mNorm(i.title)));
  fresh.forEach(n => { if (!have.has(n.id) && !titles.has(mNorm(n.title))) { n.fav = !!n._fav; delete n._fav; keep.push(n); } });
  keep.forEach(i => delete i._fav);
  m.ideas = keep;
  Object.entries(m.plan).forEach(([d, e]) => {
    const oldId = e.ideaId || Object.keys(MEAL_REPLACED_NAMES).find(k => mNorm(MEAL_REPLACED_NAMES[k]) === mNorm(e.title));
    if (oldId && MEAL_REPLACED[oldId]) {
      const n = m.ideas.find(i => i.id === MEAL_REPLACED[oldId]);
      if (d >= T && !e.cooked && n) { switched.push({ d, from: e.title, to: n.title }); e.title = n.title; e.ideaId = n.id; }
      else e.ideaId = '';
      return;
    }
    const i = e.ideaId && m.ideas.find(x => x.id === e.ideaId); if (i) e.title = i.title;
  });
  m.starterVer = STARTER_VER;
  m.gfNote = switched.length ? 'Updated for gluten free: ' + switched.map(x => `${x.from} → ${x.to} (${fmtW(x.d)})`).join(', ') + '.' : 'Meal ideas updated: all starter ideas are now written gluten free.';
}
function normMeals(m) {
  m = m && typeof m === 'object' && !Array.isArray(m) ? m : newMeals();
  if (!Array.isArray(m.nights)) m.nights = [5, 6];
  m.nights = [...new Set(m.nights.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
  if (!m.plan || typeof m.plan !== 'object' || Array.isArray(m.plan)) m.plan = {};
  Object.keys(m.plan).forEach(k => { const e = m.plan[k]; if (!/^\d{4}-\d\d-\d\d$/.test(k) || !e || typeof e !== 'object' || !String(e.title || '').trim()) delete m.plan[k]; });
  if (!Array.isArray(m.ideas)) m.ideas = starterMeals();
  m.ideas = m.ideas.filter(i => i && i.id && String(i.title || '').trim());
  m.ideas.forEach(i => { if (!Array.isArray(i.ingr)) i.ingr = String(i.ingr || '').split(/\n|,/).map(s => s.trim()).filter(Boolean); if (!MEAL_TAGS.includes(i.tag)) i.tag = i.tag ? String(i.tag) : ''; if (!storedPhoto(i.photo)) delete i.photo; });
  if (typeof m.list !== 'string') m.list = '';
  if ((m.starterVer || 1) < STARTER_VER) migrateStarters(m);
  m.ideas.forEach(i => { if (typeof i.gf !== 'boolean') i.gf = !!i.builtin; });
  return m;
}
const M = () => S.meals;
const mNorm = t => String(t || '').trim().toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ');
const mealIdeaFor = t => { const n = mNorm(t); return n ? M().ideas.find(i => mNorm(i.title) === n) : null; };
const visibleIdeas = () => M().ideas.filter(i => !i.hidden);
const gfIdeas = () => visibleIdeas().filter(i => i.gf);
const gfTag = (short = false) => `<span class="gftag">${short ? 'GF' : 'Gluten free'}</span>`;
const isCookNight = iso => M().nights.includes(new Date(parseD(iso)).getUTCDay());
const dayGap = (a, b) => Math.round((parseD(a) - parseD(b)) / DAY);
const showMealsCal = () => !S.settings || S.settings.mealsCal !== false;
function mealNights(weeks = MEAL_WEEKS) {
  const T = todayISO(), out = [];
  for (let i = 0; i < weeks * 7; i++) { const d = addDays(T, i); if (isCookNight(d)) out.push(d); }
  return out;
}
function nightLabel(iso) {
  const d = daysLeft(iso);
  return d === 0 ? 'Tonight · ' + fmtW(iso) : d === 1 ? 'Tomorrow · ' + fmtW(iso) : d === -1 ? 'Last night · ' + fmtW(iso) : fmtW(iso);
}
// Pick a meal for a night: only from visible ideas ticked gluten free, avoiding anything planned within 3 weeks either side (favourites 3× as likely)
function pickMeal(iso, plan = M().plan) {
  const near = new Set(Object.entries(plan).filter(([d, e]) => d !== iso && e.title && Math.abs(dayGap(d, iso)) < MEAL_GAP).map(([, e]) => mNorm(e.title)));
  const cur = plan[iso] ? mNorm(plan[iso].title) : '';
  let pool = gfIdeas().filter(i => !near.has(mNorm(i.title)) && mNorm(i.title) !== cur);
  if (!pool.length) pool = gfIdeas().filter(i => mNorm(i.title) !== cur);
  if (!pool.length) return null;
  const bag = pool.flatMap(i => i.fav ? [i, i, i] : [i]);
  return bag[Math.floor(Math.random() * bag.length)];
}
const planEntry = (idea, notes = '') => ({ title: idea.title, ideaId: idea.id, notes, cooked: false });
async function suggestNight(iso) {
  const i = pickMeal(iso);
  if (!i) { toast('Add some gluten-free meal ideas first.'); return; }
  const s = snap(); const old = M().plan[iso];
  M().plan[iso] = planEntry(i, old ? old.notes : '');
  await save(); render(); toast(`${fmtW(iso)}: ${i.title}`, 'Undo', undoTo(s));
}
async function surpriseAll() {
  const empty = mealNights().filter(d => !M().plan[d]);
  if (!M().nights.length) { toast('Pick your cooking nights first.'); return; }
  if (!empty.length) { toast('Every cooking night is already planned.'); return; }
  if (!gfIdeas().length) { toast('Add some gluten-free meal ideas first.'); return; }
  const s = snap(); let n = 0;
  for (const d of empty) { const i = pickMeal(d); if (i) { M().plan[d] = planEntry(i); n++; } }
  await save(); render(); toast(`Planned ${plural(n, 'night')}.`, 'Undo', undoTo(s));
}
async function toggleCooked(iso) {
  const e = M().plan[iso]; if (!e) return;
  e.cooked = !e.cooked; if (e.cooked) e.cookedAt = Date.now(); else delete e.cookedAt;
  await save(); render(); if (e.cooked) toast(`Cooked: ${e.title}. Nice one!`);
}
async function toggleNight(n) {
  const a = M().nights; M().nights = a.includes(n) ? a.filter(x => x !== n) : [...a, n].sort();
  await save(); render();
}
async function toggleMealsCal() { S.settings.mealsCal = !showMealsCal(); await save(); render(); }
let mealHistAll = false;
// A recipe photo is optional: a small JPEG saved on this phone. If there isn’t one, keep the drawn meal icon. Never a web address.
function mealPic(idea) {
  const src = idea && storedPhoto(idea.photo);
  if (src) return `<div class="mealpic hasphoto"><img alt="" src="${esc(src)}"></div>`;
  const plate = `<svg class="mealplate" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="40" r="22" fill="var(--card)"/><circle cx="36" cy="40" r="16.5" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".4"/><ellipse cx="36" cy="38" rx="9" ry="5.5" fill="currentColor" opacity=".5"/><ellipse cx="29.5" cy="36.5" rx="4.2" ry="3" fill="currentColor" opacity=".32"/><circle cx="43" cy="37" r="3.2" fill="currentColor" opacity=".28"/></svg>`;
  return `<div class="mealpic" aria-hidden="true">${plate}${P.meal ? I('meal') : ''}</div>`;
}
function mealRow(iso, hist = false) {
  const e = M().plan[iso], idea = e ? (M().ideas.find(i => i.id === e.ideaId) || mealIdeaFor(e.title)) : null;
  const past = iso <= todayISO();
  const mark = !e ? '' : idea ? (idea.gf ? gfTag(true) : '<span class="nogf">Not marked gluten free</span>') : '<span class="nogf">Check it’s gluten free</span>';
  const sub = [mark, hist ? fmtW(iso) : nightLabel(iso), idea && idea.tag ? idea.tag : '', e && e.notes ? esc(e.notes.split('\n')[0].slice(0, 60)) : '', hist && e ? (e.cooked ? 'Cooked' : 'Not ticked') : ''].filter(Boolean).join(' · ');
  return `<div class="row meal ${e && e.cooked ? 'done' : ''}" data-date="${iso}">
    ${e ? mealPic(idea) : `<div class="ic meal">${I('meal')}</div>`}
    ${e && past ? `<button class="tick" aria-label="${e.cooked ? 'Untick' : 'Tick'} cooked: ${esc(e.title)}" onclick="toggleCooked('${iso}')"><span>${I('check')}</span></button>` : ''}
    <button class="tapzone" onclick="mealNight('${iso}')"><div class="tx"><div class="t">${e ? esc(e.title) : '<span class="muted">Nothing planned</span>'}</div><div class="s">${sub}</div></div></button>
    ${!e && !hist ? `<button class="btn small" onclick="suggestNight('${iso}')">Suggest</button>` : ''}</div>`;
}
const mealTabs = on => `<div class="chips mealtabs"><button class="chip ${on === 'plan' ? 'on' : ''}" id="tabplan" onclick="go('#meals')">Meal plan</button><button class="chip ${on === 'recipes' ? 'on' : ''}" id="tabrecipes" onclick="go('#recipes')">Recipes (${visibleIdeas().length})</button><button class="chip ${on === 'shop' ? 'on' : ''}" id="tabshop" onclick="go('#shopping')">Shopping${S.shop.items.some(x => !x.done) ? ` (${S.shop.items.filter(x => !x.done).length})` : ''}</button></div>`;
function nightsText() {
  const n = M().nights; if (!n.length) return 'No cooking nights picked';
  const names = n.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => WDL[x]);
  return 'Cooking nights: ' + (names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);
}
function Meals(arg) {
  if (arg === 'ideas') return Recipes(); // older link
  const nights = mealNights(), T = todayISO();
  const planned = nights.filter(d => M().plan[d]).length;
  const hist = Object.keys(M().plan).filter(d => d < T).sort().reverse();
  const cooked8 = hist.filter(d => dayGap(T, d) <= 56 && M().plan[d].cooked).length;
  const days = [1, 2, 3, 4, 5, 6, 0];
  return header('Meal planner', nightsText()) + mealTabs('plan') +
    `<div class="card mealset"><div class="t">Your cooking nights</div>
      <div class="daychips" role="group" aria-label="Cooking nights">${days.map(n => `<button class="${M().nights.includes(n) ? 'on' : ''}" aria-pressed="${M().nights.includes(n)}" aria-label="${WDL[n]}" onclick="toggleNight(${n})">${WDL[n].slice(0, 3)}</button>`).join('')}</div>
      <div class="s">The plan shows only these nights, for the next ${MEAL_WEEKS} weeks.</div></div>
    <div class="gfnote" id="gfnote">${gfTag()}<span>${GF_NOTE}</span></div>
    ${nights.length ? `<div class="btns mealbtns"><button class="btn primary" id="surprise" onclick="surpriseAll()">${I('shuffle')} Surprise me for all</button><button class="btn" id="shopbtn" onclick="shopForm()">${I('cart')} Shopping list</button></div>
    <div class="sec">Next ${MEAL_WEEKS} weeks <span class="muted" style="font-weight:600;text-transform:none;letter-spacing:0">${planned} of ${nights.length} planned</span></div>
    <div class="list" id="mealplan">${nights.map(d => mealRow(d)).join('')}</div>`
      : `<div class="card empty"><div class="t">No cooking nights picked</div><div class="s">Tap the days you cook above, and they’ll show here.</div></div>`}
    <div class="sec">History${hist.length ? ` <span class="muted" style="font-weight:600;text-transform:none;letter-spacing:0">${cooked8} cooked in the last 8 weeks</span>` : ''}</div>
    ${hist.length ? `<div class="list" id="mealhist">${hist.slice(0, mealHistAll ? 200 : 6).map(d => mealRow(d, true)).join('')}</div>
      ${hist.length > 6 ? `<div class="btns"><button class="btn" onclick="mealHistAll=!mealHistAll;render()">${mealHistAll ? 'Show less' : `Show all (${hist.length})`}</button></div>` : ''}`
      : `<div class="card muted">Past meals show here. Tick “Cooked” on the night to keep track.</div>`}
    <div class="list" style="margin-top:12px"><div class="srow"><div class="tx"><div class="t">Show meals on the Calendar</div><div class="s">Planned meals appear with a “Meal” tag.</div></div><button class="switch ${showMealsCal() ? 'on' : ''}" role="switch" aria-checked="${showMealsCal()}" aria-label="Show meals on the Calendar" onclick="toggleMealsCal()"></button></div></div>
    <div class="foot">Suggestions only use ideas ticked “Gluten free”, and skip anything planned in the 3 weeks before or after. Favourites come up more often.</div>`;
}
function mealNight(iso) {
  const e = M().plan[iso] || { title: '', notes: '', cooked: false };
  const favs = visibleIdeas().filter(i => i.fav).slice(0, 8);
  const idea = e.title ? mealIdeaFor(e.title) : null;
  openSheet(esc(nightLabel(iso)),
    `<label class="field"><span>Meal</span><div style="display:flex;gap:8px"><input name="title" id="mealin" value="${esc(e.title)}" list="mealdl" placeholder="Pick from your ideas or type one" maxlength="80" style="flex:1;min-width:0">
      <button type="button" class="btn small" id="mealsug" style="flex:none" onclick="sheetSuggest('${iso}')">${I('shuffle')} Suggest</button></div>
      <datalist id="mealdl">${visibleIdeas().map(i => `<option value="${esc(i.title)}">`).join('')}</datalist><small id="mealhint">${idea ? mealHint(idea) : 'Choose an idea, or type one in – check it’s gluten free.'}</small></label>` +
    (favs.length ? `<div class="chips" style="margin:-4px 0 10px">${favs.map(i => `<button type="button" class="chip" onclick="setMealIn(${jsArg(i.title)})">★ ${esc(i.title)}</button>`).join('')}</div>` : '') +
    field('Notes', area('notes', e.notes || '', 'Optional: who’s coming, sides, defrost the lamb…')) +
    (iso <= todayISO() ? `<div class="field"><span>Cooked</span>${segHtml('cooked', [['0', 'Not yet'], ['1', '✓ Cooked']], e.cooked ? '1' : '0')}</div>` : ''),
    async v => {
      const had = M().plan[iso];
      if (!v.title) { if (had) delete M().plan[iso]; await save(); render(); if (had) toast('Night cleared.'); return; }
      const i = mealIdeaFor(v.title), cooked = v.cooked === '1';
      M().plan[iso] = { title: i ? i.title : v.title, ideaId: i ? i.id : '', notes: v.notes, cooked, ...(cooked ? { cookedAt: had && had.cookedAt || Date.now() } : {}) };
      await save(); render(); toast(`${fmtW(iso)}: ${M().plan[iso].title}`);
    }, 'Save',
    M().plan[iso] ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Clear this night" onclick="clearNight('${iso}')">${I('trash')}</button>` : '');
  if (iso <= todayISO()) wireSeg('cooked');
  $('#mealin').addEventListener('input', () => { const i = mealIdeaFor($('#mealin').value); $('#mealhint').innerHTML = i ? mealHint(i) : 'Choose an idea, or type one in – check it’s gluten free.'; });
}
const mealHint = i => (i.gf ? gfTag() + ' ' : '<span class="nogf">Not marked gluten free</span> ') + esc([i.tag, i.ingr.slice(0, 6).join(', ') + (i.ingr.length > 6 ? '…' : '')].filter(Boolean).join(' · ')) + ` · <a href="#recipe/${i.id}">See recipe</a>`;
function setMealIn(t) { const x = $('#mealin'); x.value = t; x.dispatchEvent(new Event('input')); }
function sheetSuggest(iso) {
  const plan = Object.assign({}, M().plan); const cur = $('#mealin').value.trim();
  plan[iso] = cur ? { title: cur } : undefined; if (!cur) delete plan[iso];
  const i = pickMeal(iso, plan); if (!i) { toast('Add some gluten-free meal ideas first.'); return; }
  setMealIn(i.title);
}
async function clearNight(iso) { const s = snap(); delete M().plan[iso]; await save(); await closeSheet(); render(); toast('Night cleared.', 'Undo', undoTo(s)); }

/* ================= RECIPES (1.15.0) =================
   Recipes are the meal planner's ideas (S.meals.ideas), so everything planned or saved before carries over.
   Each recipe: { id, title, tag, ingr: [..], method, serves, time, source, link, notes, fav, hidden, gf, builtin, scanned, photo }.
   Pages: #recipes (list), #recipe/<id> (one recipe). "Scan" reads a recipe book page with the camera (text is read on the phone). */
let mealFilter = 'All', mealQuery = '';
const recipeOf = e => e ? (M().ideas.find(i => i.id === e.ideaId) || mealIdeaFor(e.title)) : null;
function mealIdeaList() {
  const q = mealQuery.trim().toLowerCase();
  const vis = M().ideas.filter(i => (mealFilter === 'Hidden' ? i.hidden : !i.hidden) && (mealFilter === 'All' || mealFilter === 'Hidden' || (mealFilter === '★' ? i.fav : mealFilter === 'Mine' ? !i.builtin : i.tag === mealFilter)) &&
    (!q || (i.title + ' ' + i.ingr.join(' ') + ' ' + (i.tag || '') + ' ' + (i.notes || '') + ' ' + (i.method || '') + ' ' + (i.source || '')).toLowerCase().includes(q)))
    .sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || a.title.localeCompare(b.title));
  if (!vis.length) return `<div class="card empty"><div class="t">No recipes match</div><div class="s">${q ? 'Try a different word.' : mealFilter === 'Hidden' ? 'Nothing hidden.' : mealFilter === 'Mine' ? 'Recipes you add or scan show here.' : 'Nothing with this tag yet.'}</div></div>`;
  return `<div class="list">${vis.map(i => `<div class="row idea mealidea" data-id="${i.id}">${mealPic(i)}<button class="star ${i.fav ? 'on' : ''}" aria-label="${i.fav ? 'Unfavourite' : 'Favourite'} ${esc(i.title)}" aria-pressed="${!!i.fav}" onclick="toggleMealFav('${i.id}')">${I('star')}</button>
    <button class="tapzone" onclick="go('#recipe/${i.id}')"><div class="tx"><div class="t">${esc(i.title)}${i.method ? ` <span class="muted" style="font-weight:600;font-size:0.75rem">· method</span>` : i.link ? ` <span class="muted" style="font-weight:600;font-size:0.75rem">· link</span>` : ''}</div>
    <div class="s">${i.gf ? gfTag(true) + ' ' : '<span class="nogf">Not marked gluten free</span> '}${i.tag ? `<span class="cattag">${esc(i.tag)}</span> ` : ''}${esc(i.ingr.slice(0, 5).join(', ') + (i.ingr.length > 5 ? '…' : ''))}</div></div></button>
    ${i.hidden ? `<button class="btn small" onclick="toggleMealHidden('${i.id}')">Show</button>` : `<button class="btn small" onclick="planIdea('${i.id}')">Plan</button>`}</div>`).join('')}</div>`;
}
function Recipes() {
  const hidden = M().ideas.filter(i => i.hidden).length, mine = M().ideas.some(i => !i.builtin && !i.hidden);
  if ((mealFilter === 'Hidden' && !hidden) || (mealFilter === 'Mine' && !mine)) mealFilter = 'All';
  return header('Recipes', plural(visibleIdeas().length, 'recipe') + (hidden ? ` · ${hidden} hidden` : ''), addBtn('Add a recipe', 'mealIdeaForm()')) + mealTabs('recipes') +
    `<div class="btns recbtns"><button class="btn primary" id="scanbtn" onclick="scanForm()">${I('camera')} Scan a recipe</button><button class="btn" onclick="mealIdeaForm()">${I('plus')} Type one in</button></div>
    <label class="search">${I('search')}<input id="mealq" type="search" placeholder="Search recipes or ingredients" value="${esc(mealQuery)}" aria-label="Search recipes" oninput="mealQuery=this.value;document.getElementById('meallist').innerHTML=mealIdeaList()"></label>
    <div class="chips scroll">${['All', '★', ...(mine ? ['Mine'] : []), ...MEAL_TAGS, ...(hidden ? ['Hidden'] : [])].map(c => `<button class="chip ${c === mealFilter ? 'on' : ''}" onclick="mealFilter=${jsArg(c)};render()">${c === '★' ? '★ Favourites' : c === 'Mine' ? 'Added by me' : c === 'Hidden' ? `Hidden (${hidden})` : esc(c)}</button>`).join('')}</div>
    <div id="meallist">${mealIdeaList()}</div>
    <div class="foot">${gfTag(true)} marks recipes written gluten free – still check labels, especially stock, sauces, sausages and seasonings. Only recipes ticked “Gluten free” are suggested in the meal planner. Starter recipes can be edited or hidden.</div>`;
}
// One recipe: ingredients (with "check label" and gluten hints), method, and buttons for the planner and shopping list
function RecipeDetail(id) {
  const i = M().ideas.find(x => x.id === id);
  if (!i) return `<button class="back" onclick="go('#recipes')">${I('left')} Recipes</button>` + empty('Recipe not found', 'It may have been deleted.', '', '');
  const T = todayISO(), planned = Object.keys(M().plan).filter(d => d >= T && (M().plan[d].ideaId === i.id || mNorm(M().plan[d].title) === mNorm(i.title))).sort();
  const last = Object.keys(M().plan).filter(d => d < T && M().plan[d].cooked && (M().plan[d].ideaId === i.id || mNorm(M().plan[d].title) === mNorm(i.title))).sort().pop();
  const facts = [i.serves ? 'Serves ' + esc(i.serves) : '', i.time ? esc(i.time) : '', i.tag ? esc(i.tag) : ''].filter(Boolean).join(' · ');
  const steps = methodSteps(i.method);
  const onList = new Set(S.shop.items.filter(x => !x.done).map(x => mNorm(x.name)));
  return `<div style="display:flex;justify-content:space-between;align-items:center"><button class="back" onclick="go('#recipes')">${I('left')} Recipes</button>
    <button class="btn small" id="recedit" aria-label="Edit recipe" onclick="mealIdeaForm('${i.id}')">${I('edit')} Edit</button></div>
    <div class="rechead">${mealPic(i)}<div style="min-width:0"><h1 class="rectitle">${esc(i.title)}</h1><div class="sub recsub">${facts || (i.builtin ? 'Starter recipe' : 'Your recipe')}</div></div></div>
    <div class="recmeta">${i.gf ? gfTag() : '<span class="nogf">Not marked gluten free</span>'}${i.fav ? ' <span class="cattag">★ Favourite</span>' : ''}${i.source ? ` <span class="muted">From ${esc(i.source)}</span>` : ''}</div>
    ${photoBtns('recipe', i.id)}
    <div class="btns recbtns"><button class="btn primary" id="recplan" onclick="planRecipeForm('${i.id}')">${I('cal')} Plan it</button><button class="btn" id="recshop" onclick="recipeToShop('${i.id}')">${I('cart')} Add to shopping list</button></div>
    ${planned.length || last ? `<div class="card recplanned">${planned.length ? `Planned for ${planned.map(d => `<button class="linkbtn" onclick="openNight('${d}')">${fmtW(d)}</button>`).join(', ')}.` : ''}${last ? ` Last cooked ${fmtW(last)}.` : ''}</div>` : ''}
    <div class="sec">Ingredients <span class="muted" style="font-weight:600;text-transform:none;letter-spacing:0">${i.ingr.length}</span></div>
    ${i.ingr.length ? `<div class="card recingr" id="recingr"><ul>${i.ingr.map(g => `<li>${esc(g)}${glutenRisk(g) ? ' <span class="nogf">may have gluten</span>' : needsCheck(g) ? ' <span class="chk">check label</span>' : ''}${onList.has(mNorm(shopName(g))) ? ' <span class="onlist">on list</span>' : ''}</li>`).join('')}</ul></div>` : `<div class="card muted">No ingredients yet. <button class="linkbtn" onclick="mealIdeaForm('${i.id}')">Add them</button></div>`}
    <div class="sec">Method</div>
    ${steps.length ? `<div class="card recmethod" id="recmethod"><ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : `<div class="card muted">No method saved.${i.link ? '' : ` <button class="linkbtn" onclick="mealIdeaForm('${i.id}')">Add one</button> or scan it from the book.`}</div>`}
    ${i.link ? `<div class="btns"><a class="btn" href="${esc(i.link)}" target="_blank" rel="noopener">${I('link')} Open the recipe link</a></div>` : ''}
    ${i.notes ? `<div class="sec">Notes</div><div class="card" style="white-space:pre-wrap">${esc(i.notes)}</div>` : ''}
    <div class="foot">${i.gf ? 'Written gluten free. Still check labels for “gluten free”, especially stock, sauces, sausages and seasonings.' : 'This recipe isn’t ticked gluten free, so the planner won’t suggest it. Swap anything marked “may have gluten” for a gluten-free version, then tick “Gluten free” in Edit.'}</div>`;
}
// Method text: numbered lines ("1.", "Step 2") or blank lines start a new step; other line breaks are joined (scanned text breaks lines mid-sentence)
function methodSteps(m) {
  const lines = String(m || '').split('\n').map(s => s.trim());
  const out = []; let cur = '';
  const flush = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  lines.forEach(l => {
    if (!l) { flush(); return; }
    const n = l.match(/^(?:step\s*)?\d{1,2}\s*[.):]\s*(.*)$/i);
    if (n) { flush(); cur = n[1]; return; }
    cur += (cur ? ' ' : '') + l;
  });
  flush();
  return out;
}
// Common gluten ingredients, unless the line already says gluten free (or is a naturally gluten-free version)
const GLUTEN_RX = /\b(flour|bread|breadcrumbs?|panko|pasta|spaghetti|penne|fettuccine|macaroni|lasagne|noodles?|couscous|barley|wheat|semolina|bulgur|soy sauce|beer|pastry|filo|biscuits?|crackers?|tortillas?|wraps?|pita|naan|rolls?|buns?|oats|rye|malt|spelt|udon|oyster sauce|hoisin|worcestershire|stock cubes?|gravy|cake|crumbs?|batter|self[- ]raising|baking powder)\b/i;
const GF_SAFE_RX = /gluten[- ]?free|\bgf\b|\b(rice|corn|maize|tapioca|almond|coconut|potato|chickpea|buckwheat|sorghum|quinoa)\s+(flour|noodles?|pasta|tortillas?|starch|crackers?|wraps?)|cornflour|tamari|rice paper|rolled up|gravy beef/i;
const glutenRisk = g => GLUTEN_RX.test(g) && !GF_SAFE_RX.test(g);
function planRecipeForm(id) {
  const i = M().ideas.find(x => x.id === id); if (!i) return;
  const nights = mealNights();
  if (!nights.length) { toast('Pick your cooking nights in the meal planner first.'); return; }
  const free = nights.find(d => !M().plan[d]) || nights[0];
  openSheet('Plan ' + esc(i.title),
    `<p class="muted" style="margin:-4px 0 10px">Pick a cooking night. ${i.gf ? '' : '<span class="nogf">Not marked gluten free</span>'}</p>
    <div class="list plannights">${nights.map(d => { const e = M().plan[d]; return `<label class="srow"><input type="radio" name="night" value="${d}" ${d === free ? 'checked' : ''}><div class="tx"><div class="t">${nightLabel(d)}</div><div class="s">${e ? 'Replaces ' + esc(e.title) : 'Free'}</div></div></label>`; }).join('')}</div>` +
    `<label class="gfcheck"><input type="checkbox" name="shop" checked><span><b>Add the ingredients to the shopping list</b><small>Skips anything already on it.</small></span></label>`,
    async v => {
      if (!v.night) return 'Pick a night.';
      const s = snap(), old = M().plan[v.night];
      M().plan[v.night] = planEntry(i, old && mNorm(old.title) === mNorm(i.title) ? old.notes : '');
      const n = v.shop === 'on' ? addToShop(i.ingr, i.title) : 0;
      await save(); render();
      return () => toast(`Planned for ${fmtW(v.night)}${n ? ` · ${plural(n, 'item')} added to the shopping list` : ''}.`, 'Undo', undoTo(s));
    }, 'Plan it');
}
async function recipeToShop(id) {
  const i = M().ideas.find(x => x.id === id); if (!i) return;
  if (!i.ingr.length) { toast('This recipe has no ingredients yet.'); return; }
  const s = snap(), n = addToShop(i.ingr, i.title);
  await save(); render();
  toast(n ? `Added ${plural(n, 'item')} to the shopping list${n < i.ingr.length ? ` (${i.ingr.length - n} already there)` : ''}.` : 'Everything’s already on the shopping list.', n ? 'Undo' : 'View', n ? undoTo(s) : () => go('#shopping'));
}
async function toggleMealFav(id) { const i = M().ideas.find(x => x.id === id); i.fav = !i.fav; await save(); render(); }
async function toggleMealHidden(id) {
  const i = M().ideas.find(x => x.id === id); i.hidden = !i.hidden; if (i.hidden) i.fav = false;
  await save(); await closeSheet(); render(); toast(i.hidden ? `Hidden: ${i.title}. It won’t be suggested.` : `${i.title} is back in your recipes.`);
}
async function planIdea(id) {
  const i = M().ideas.find(x => x.id === id), d = mealNights().find(x => !M().plan[x]);
  if (!d) { toast(M().nights.length ? 'Every cooking night in the next 4 weeks is planned.' : 'Pick your cooking nights first.'); return; }
  const s = snap(); M().plan[d] = planEntry(i); await save(); await closeSheet(); render();
  toast(`Planned for ${fmtW(d)}: ${i.title}${i.gf ? '' : ' (not marked gluten free)'}`, 'Undo', undoTo(s));
}
// Add or edit a recipe. pre = values from a scan (title, ingr, method, serves, time).
function mealIdeaForm(id, pre) {
  const i = id ? M().ideas.find(x => x.id === id) : Object.assign({ title: '', tag: MEAL_TAGS.includes(mealFilter) ? mealFilter : '', ingr: [], method: '', serves: '', time: '', source: '', link: '', notes: '', fav: mealFilter === '★', gf: true }, pre || {});
  if (!i) return;
  const risky = i.ingr.filter(glutenRisk);
  openSheet(id ? 'Edit recipe' : pre ? 'Check the scanned recipe' : 'Add a recipe',
    (pre ? `<p class="muted" style="margin:-4px 0 10px">Here’s what the app read from the page. Fix anything it got wrong, then save.</p>` : '') +
    field('Recipe name', inp('title', i.title, 'placeholder="e.g. Nana’s mince stew" required maxlength="80"')) +
    `<div class="two">${field('Serves', inp('serves', i.serves || '', 'placeholder="e.g. 4" maxlength="20"'), 'Optional')}${field('Time', inp('time', i.time || '', 'placeholder="e.g. 45 min" maxlength="30"'), 'Optional')}</div>` +
    `<div class="two">${field('Type', sel('tag', [['', 'None'], ...MEAL_TAGS.map(t => [t, t])], i.tag || ''))}<div class="field"><span>Favourite</span>${segHtml('fav', [['0', 'No'], ['1', '★ Yes']], i.fav ? '1' : '0')}</div></div>` +
    (risky.length ? `<div class="gfwarn" id="gfwarn"><b>Check for gluten:</b> ${esc(risky.slice(0, 6).join(', '))}${risky.length > 6 ? '…' : ''}. Swap these for gluten-free versions (e.g. gluten-free flour, tamari), then tick “Gluten free”.</div>` : '') +
    `<label class="gfcheck"><input type="checkbox" name="gf" ${i.gf !== false ? 'checked' : ''}><span><b>Gluten free</b><small>Only recipes ticked here are suggested. Write ingredients as gluten-free versions, e.g. gluten-free soy sauce (tamari).</small></span></label>` +
    field('Ingredients', area('ingr', i.ingr.join('\n'), 'One per line, e.g.\n500 g beef mince\ngluten-free gravy'), 'One per line. Used for the shopping list.') +
    field('Method', `<textarea name="method" class="tall" placeholder="${esc('One step per line, e.g.\n1. Brown the mince\n2. Add the vegetables')}">${esc(i.method || '')}</textarea>`, 'Optional. Start each step on a new line, or number them.') +
    field('From', inp('source', i.source || '', 'placeholder="e.g. Edmonds Cookbook, page 42" maxlength="80"'), 'Optional: the book or person it came from') +
    field('Recipe link', inp('link', i.link || '', 'type="url" inputmode="url" placeholder="https://…" maxlength="500"'), 'Optional') +
    field('Notes', area('notes', i.notes || '', 'Optional')) +
    (id ? `<div class="btns" style="margin:0 0 4px"><button type="button" class="btn" onclick="planIdea('${id}')">${I('cal')} Plan for the next free night</button><button type="button" class="btn" onclick="toggleMealHidden('${id}')">${i.hidden ? 'Show again' : 'Hide'}</button></div>` : ''),
    async v => {
      if (!v.title) return 'Please type the recipe name.';
      const dup = mealIdeaFor(v.title); if (dup && dup.id !== id) return 'You already have a recipe with that name.';
      let link = v.link; if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
      if (link) { try { new URL(link); } catch (e) { return 'That recipe link doesn’t look right.'; } }
      const upd = { title: v.title, tag: v.tag, ingr: v.ingr.split('\n').map(s => s.replace(/^[•·\-*–]\s*/, '').trim()).filter(Boolean), method: v.method, serves: v.serves, time: v.time, source: v.source, link, notes: v.notes, fav: v.fav === '1', gf: v.gf === 'on' };
      let nid = id;
      if (id) {
        const oldN = mNorm(i.title);
        if (i.builtin && (upd.title !== i.title || upd.ingr.join('\n') !== i.ingr.join('\n'))) upd.edited = true; // keep his changes in future starter updates
        Object.assign(i, upd);
        Object.values(M().plan).forEach(e => { if (e.ideaId === id || mNorm(e.title) === oldN) { e.title = i.title; e.ideaId = id; } });
      } else { nid = uid('meal'); M().ideas.push(Object.assign({ id: nid, hidden: false, builtin: false, created: Date.now(), scanned: !!pre }, upd)); }
      await save();
      const msg = (id ? 'Recipe updated' : 'Recipe saved') + (upd.gf ? '.' : ' – not ticked gluten free, so it won’t be suggested.');
      if (!id) return () => { go('#recipe/' + nid); toast(msg); };
      render(); return () => toast(msg);
    }, id ? 'Save' : 'Save recipe',
    id && !i.builtin ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete recipe" onclick="deleteMealIdea('${id}')">${I('trash')}</button>` : '');
  wireSeg('fav');
}
async function deleteMealIdea(id) {
  const s = snap(); M().ideas = M().ideas.filter(x => x.id !== id); await save(); await closeSheet();
  if (location.hash.startsWith('#recipe/')) location.hash = '#recipes'; else render();
  toast('Recipe deleted.', 'Undo', undoTo(s));
}

/* ---- Scan a recipe book page (1.15.0) ----
   Uses Tesseract (vendor/tesseract, loaded only when you scan). The photo is read on the phone; nothing is uploaded.
   The first scan downloads the text reader (about 7 MB); after that it's saved on the phone and works offline. */
const OCR_BASE = new URL('vendor/tesseract/', location.href).href;
let ocrWorker = null, ocrLoading = null, scanPages = [], scanBusy = false;
function loadScriptOnce(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = res; s.onerror = () => { s.remove(); rej(new Error('load')); };
    document.head.appendChild(s);
  });
}
function getOcr(progress) {
  if (ocrWorker) return Promise.resolve(ocrWorker);
  if (!ocrLoading) ocrLoading = (async () => {
    await loadScriptOnce(OCR_BASE + 'tesseract.min.js');
    const w = await Tesseract.createWorker('eng', 1, {
      workerPath: OCR_BASE + 'worker.min.js', corePath: OCR_BASE, langPath: OCR_BASE, workerBlobURL: false,
      logger: m => { if (scanLog) scanLog(m); }
    });
    await w.setParameters({ preserve_interword_spaces: '1' });
    ocrWorker = w; return w;
  })().catch(e => { ocrLoading = null; throw e; });
  return ocrLoading;
}
let scanLog = null;
function scanForm() {
  scanPages = []; scanBusy = false;
  openSheet('Scan a recipe', scanInner(), async () => {
    if (scanBusy) return 'Still reading the page. Hang on a moment.';
    const text = scanPages.join('\n\n').trim();
    if (!text) return 'Take a photo of the recipe first.';
    const pre = parseRecipe(text);
    return () => mealIdeaForm(null, pre);
  }, 'Next');
  scanButtons();
}
function scanInner() {
  return `<p class="muted" style="margin:-4px 0 10px">Take a photo of a recipe book page. The app reads the text on your phone, then you check it and save.</p>
    <div class="scantips">For the best result, lay the book flat in good light, fill the photo with the recipe and hold the phone straight over it.</div>
    <input type="file" accept="image/*" capture="environment" id="scancam" hidden onchange="scanFile(this)">
    <input type="file" accept="image/*" id="scanpick" hidden onchange="scanFile(this)">
    <div class="btns" id="scanbtns"></div>
    <div id="scanstat" class="scanstat" hidden><div class="t" id="scanmsg"></div><div class="bar"><i id="scanbar"></i></div></div>
    <div id="scanpages"></div>`;
}
function scanButtons() {
  const b = $('#scanbtns'); if (!b) return;
  const more = scanPages.length > 0;
  b.innerHTML = `<button type="button" class="btn ${more ? '' : 'primary'}" id="scantake" onclick="document.getElementById('scancam').click()" ${scanBusy ? 'disabled' : ''}>${I('camera')} ${more ? 'Add another page' : 'Take a photo'}</button>
    <button type="button" class="btn" id="scanchoose" onclick="document.getElementById('scanpick').click()" ${scanBusy ? 'disabled' : ''}>${I('image')} ${more ? 'Choose another' : 'Choose a photo'}</button>`;
  const p = $('#scanpages');
  if (p) p.innerHTML = scanPages.map((t, n) => `<div class="scanpage"><div class="scanhead"><b>Page ${n + 1}</b> <span class="muted">${plural(t.split('\n').filter(Boolean).length, 'line')} read</span><button type="button" class="linkbtn" onclick="scanPages.splice(${n},1);scanButtons()">Remove</button></div><pre>${esc(t.slice(0, 600))}${t.length > 600 ? '…' : ''}</pre></div>`).join('');
}
function scanStatus(msg, pct) {
  const box = $('#scanstat'); if (!box) return;
  box.hidden = !msg; $('#scanmsg').textContent = msg || ''; $('#scanbar').style.width = Math.round((pct || 0) * 100) + '%';
}
// Shrink and grey the photo first: faster, and Tesseract reads it better
async function scanImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = await createImageBitmap(file); }
  const max = 2000, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d'); x.filter = 'grayscale(1) contrast(1.15)'; x.drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  return c;
}
async function scanFile(input) {
  const file = input.files && input.files[0]; input.value = '';
  if (!file || scanBusy) return;
  scanBusy = true; scanButtons();
  const first = !ocrWorker;
  scanLog = m => {
    if (m.status === 'recognizing text') scanStatus('Reading the page…', m.progress);
    else if (/load|initiali/.test(m.status)) scanStatus(first ? 'Getting the text reader ready (first time only, about 7 MB)…' : 'Getting ready…', m.progress);
  };
  try {
    scanStatus('Preparing the photo…', 0.02);
    const img = await scanImage(file);
    scanStatus(first ? 'Getting the text reader ready (first time only, about 7 MB)…' : 'Getting ready…', 0.05);
    const w = await getOcr();
    scanStatus('Reading the page…', 0);
    const { data } = await w.recognize(img);
    const text = cleanOcr(data.text || '');
    if (!sheetOpen) return;
    if (text.replace(/[^a-z]/gi, '').length < 15) { scanStatus(''); toast('Couldn’t find much text in that photo. Try again closer, in better light.'); }
    else { scanPages.push(text); scanStatus(''); toast(scanPages.length === 1 ? 'Page read. Tap Next to check it, or add another page.' : `Page ${scanPages.length} read.`); }
  } catch (e) {
    scanStatus('');
    toast(navigator.onLine ? 'Sorry, the photo couldn’t be read. Try again.' : 'The first scan needs internet to get the text reader. Try again when you’re online.');
  } finally { scanBusy = false; scanLog = null; scanButtons(); }
}
// Tidy what Tesseract returns: odd characters, bullets, broken hyphenation
function cleanOcr(t) {
  return t.replace(/\r/g, '').replace(/[|¦]/g, 'I').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/(\w)-\n(\w)/g, '$1$2').replace(/[ \t]+/g, ' ').split('\n').map(l => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
// Split scanned text into name, serves, time, ingredients and method. Headings like "Ingredients" and "Method" are used when present;
// otherwise short lines starting with an amount are ingredients and the rest is method.
function parseRecipe(text) {
  const lines = text.split('\n').map(l => l.replace(/^[•·●○▪■*\-–]\s*/, '').trim());
  const ING = /^(ingredients?|you will need|you'?ll need|what you need)\b[:\s]*$/i, MET = /^(method|directions?|instructions?|preparation|steps|to make|how to make( it)?)\b[:\s]*$/i;
  const QTY = /^(\d|½|¼|¾|⅓|⅔|⅛|a |an |one |two |three |four |pinch|handful|dash|few |some |salt|pepper|oil\b)/i;
  let serves = '', time = '', title = '';
  const sv = text.match(/\b(?:serves|makes|servings?|feeds)\s*:?\s*(\d+(?:\s*(?:-|–|to)\s*\d+)?)/i); if (sv) serves = sv[1].replace(/\s+/g, '');
  const tm = [...text.matchAll(/\b(prep(?:aration)?|cook(?:ing)?|total)\s*(?:time)?\s*:?\s*(\d+\s*(?:-|–)?\s*\d*\s*(?:min(?:ute)?s?|hrs?|hours?))/gi)].map(m => m[1][0].toUpperCase() + m[1].slice(1).toLowerCase().replace(/aration|ing/, '') + ' ' + m[2].replace(/\s+/g, ' ').replace(/minutes?|mins?/i, 'min'));
  if (tm.length) time = tm.join(', ').slice(0, 30);
  const meta = l => /^(serves|makes|servings?|feeds|prep|preparation|cook|cooking|total)\b/i.test(l) || /^page\s*\d+$/i.test(l) || /^\d+$/.test(l);
  let iIng = lines.findIndex(l => ING.test(l)), iMet = lines.findIndex(l => MET.test(l));
  for (const l of lines) { if (!l || meta(l) || ING.test(l) || MET.test(l)) continue; if (/[a-z]{3}/i.test(l) && l.length <= 70 && !QTY.test(l)) { title = l; break; } if (QTY.test(l)) break; }
  title = title.replace(/[.:]+$/, '');
  if (title && title === title.toUpperCase()) title = title.toLowerCase().replace(/^\w/, c => c.toUpperCase());
  let ingr = [], method = [];
  const body = (a, b) => lines.slice(a, b < 0 ? undefined : b).filter(l => l && !meta(l) && l !== title && !ING.test(l) && !MET.test(l));
  if (iIng >= 0) {
    ingr = body(iIng + 1, iMet > iIng ? iMet : -1);
    method = iMet > iIng ? body(iMet + 1, -1) : [];
    if (iMet < 0) { // no Method heading: ingredients stop at the first long sentence
      const k = ingr.findIndex(l => l.length > 60 && /[a-z]/.test(l) && !QTY.test(l)); if (k > 0) { method = ingr.slice(k); ingr = ingr.slice(0, k); }
    }
  } else if (iMet >= 0) {
    const before = body(0, iMet); ingr = before.filter(l => QTY.test(l) || l.length <= 45); method = body(iMet + 1, -1);
  } else {
    body(0, -1).forEach(l => ((QTY.test(l) && l.length <= 60 && !method.length) ? ingr : method).push(l));
  }
  // Join an ingredient's wrapped second line (starts lower case) onto the line above
  ingr = ingr.reduce((a, l) => { if (a.length && /^[a-z(]/.test(l) && !QTY.test(l)) a[a.length - 1] += ' ' + l; else a.push(l); return a; }, []).map(l => l.slice(0, 120));
  return { title: title.slice(0, 80), serves, time, ingr, method: methodSteps(method.join('\n')).map((s, n) => (n + 1) + '. ' + s).join('\n'), gf: !ingr.some(glutenRisk) };
}

/* ================= SHOPPING LIST (1.15.0) =================
   S.shop = { items: [{ id, name, done, doneAt, created, meals: [recipe names] }] }. Its own tab; the meal planner and recipes add to it.
   Before 1.15.0 the planner added ingredients to a "Shopping" to-do list: open ones move here the first time. */
const newShop = () => ({ items: [], v: 1 });
function normShop(sh, d) {
  sh = sh && typeof sh === 'object' && !Array.isArray(sh) ? sh : newShop();
  if (!Array.isArray(sh.items)) sh.items = [];
  sh.items = sh.items.filter(x => x && x.id && String(x.name || '').trim());
  sh.items.forEach(x => { if (!Array.isArray(x.meals)) x.meals = []; x.done = !!x.done; });
  if (!sh.moved && d && Array.isArray(d.todos)) {
    const lists = d.meals && d.meals.list ? [d.meals.list] : [];
    const isShop = t => !t.done && (t.fromMeal || /^(shopping|groceries|grocery)$/i.test(t.list || '') || lists.includes(t.list) && t.fromMeal);
    const move = d.todos.filter(isShop);
    if (move.length) {
      const have = new Set(sh.items.map(x => mNorm(x.name)));
      move.forEach((t, n) => { const name = shopName(t.title); if (have.has(mNorm(name))) return; have.add(mNorm(name));
        sh.items.push({ id: uid('shop'), name, done: false, created: (t.created || Date.now()) + n, meals: t.notes && /^For /.test(t.notes) ? t.notes.slice(4).split(', ') : [] }); });
      const ids = new Set(move.map(t => t.id)); d.todos = d.todos.filter(t => !ids.has(t.id));
      sh.movedNote = `Your shopping list has its own tab now. ${plural(move.length, 'item')} moved there from To-do.`;
    }
    sh.moved = true;
  }
  return sh;
}
const shopName = g => String(g || '').replace(/\s*\(check label\)\s*$/i, '').trim();
// Add ingredients, skipping any already on the list (not yet ticked). Returns how many were added.
function addToShop(names, meal) {
  const open = new Map(S.shop.items.filter(x => !x.done).map(x => [mNorm(x.name), x])); let n = 0;
  names.map(shopName).filter(Boolean).forEach(g => {
    const k = mNorm(g), had = open.get(k);
    if (had) { if (meal && !had.meals.includes(meal)) had.meals.push(meal); return; }
    const it = { id: uid('shop'), name: g.slice(0, 120), done: false, created: Date.now() + n, meals: meal ? [meal] : [] };
    S.shop.items.push(it); open.set(k, it); n++;
  });
  return n;
}
function shopRow(x) {
  const hint = needsCheck(x.name) ? ' <span class="chk">check label</span>' : '';
  const sub = x.meals.length ? 'For ' + esc(x.meals.slice(0, 3).join(', ')) + (x.meals.length > 3 ? '…' : '') : '';
  return `<div class="row shopitem ${x.done ? 'done' : ''}" data-id="${x.id}"><button class="tick" aria-label="${x.done ? 'Untick' : 'Tick off'} ${esc(x.name)}" onclick="shopTick('${x.id}')"><span>${I('check')}</span></button>
    <button class="tapzone" onclick="shopEdit('${x.id}')"><div class="tx"><div class="t">${esc(x.name)}${hint}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div></button></div>`;
}
function Shopping() {
  const open = S.shop.items.filter(x => !x.done).sort((a, b) => (a.created || 0) - (b.created || 0));
  const got = S.shop.items.filter(x => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const nights = shopNights().length;
  return header('Shopping list', open.length ? plural(open.length, 'thing') + ' to get' : 'Nothing to get') + mealTabs('shop') +
    `<form class="addbar" onsubmit="shopQuickAdd(event)"><input id="newshop" placeholder="Add an item…" autocomplete="off" enterkeyhint="done" maxlength="120" aria-label="New shopping item"><button aria-label="Add">${I('plus')}</button></form>
    <div class="btns shopbtns"><button class="btn primary" id="shopfrommeals" onclick="shopForm()">${I('meal')} Add from meal plan${nights ? ` (${nights})` : ''}</button>${open.length ? `<button class="btn" id="copyshop" onclick="copyShopList()">${I('copy')} Copy</button>` : ''}</div>
    ${open.length ? `<div class="list" id="shoplist">${open.map(shopRow).join('')}</div>` : got.length ? '<div class="card empty"><div class="t">All got. Good as gold!</div></div>' : empty('Your shopping list is empty', 'Type an item above and tap +, or add the ingredients for your planned meals.', '', '')}
    ${got.length ? `<div class="sec">Got <button onclick="clearGot()">Clear</button></div><div class="list" id="shopgot">${got.map(shopRow).join('')}</div>` : ''}
    <div class="foot">“Check label” means gluten often hides in it, so look for “gluten free” on the pack. Tap an item to change or delete it.</div>`;
}
async function shopQuickAdd(e) {
  e.preventDefault();
  const v = $('#newshop').value.trim(); if (!v) return;
  const n = addToShop(v.split(/\s*,\s*/), '');
  await save(); render(); $('#newshop').focus(); toast(n ? (n === 1 ? 'Added.' : `Added ${n} items.`) : 'That’s already on the list.');
}
async function shopTick(id) {
  const x = S.shop.items.find(i => i.id === id); if (!x) return;
  x.done = !x.done; if (x.done) x.doneAt = Date.now(); else delete x.doneAt;
  await save(); render();
}
function clearGot() {
  const n = S.shop.items.filter(x => x.done).length;
  const s = snap(); S.shop.items = S.shop.items.filter(x => !x.done);
  save().then(() => { render(); toast(`Cleared ${plural(n, 'item')}.`, 'Undo', undoTo(s)); });
}
function shopEdit(id) {
  const x = S.shop.items.find(i => i.id === id); if (!x) return;
  openSheet('Edit item', field('Item', inp('name', x.name, 'required maxlength="120"')) + (x.meals.length ? `<p class="muted" style="margin:-4px 0 8px">For ${esc(x.meals.join(', '))}</p>` : ''),
    async v => { if (!v.name) return 'Please type the item.'; x.name = v.name; await save(); render(); }, 'Save',
    `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete item" onclick="shopDelete('${id}')">${I('trash')}</button>`);
}
async function shopDelete(id) { const s = snap(); S.shop.items = S.shop.items.filter(i => i.id !== id); await save(); await closeSheet(); render(); toast('Item deleted.', 'Undo', undoTo(s)); }
async function copyText(text) {
  let ok = false;
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { }
  if (!ok) { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { ok = document.execCommand('copy'); } catch (e) { } t.remove(); }
  return ok;
}
async function copyShopList() {
  const items = S.shop.items.filter(x => !x.done); if (!items.length) { toast('Nothing to copy.'); return; }
  const ok = await copyText(items.map(x => shopLine(x.name)).join('\n'));
  toast(ok ? `Copied ${plural(items.length, 'item')}. Paste them into your grocery list app.` : 'Couldn’t copy on this phone.');
}
/* ---- add from the meal plan (the planner's "Shopping list" button, and "Add from meal plan") ---- */
function shopNights() { const T = todayISO(); return Object.keys(M().plan).filter(d => d >= T && dayGap(d, T) < MEAL_WEEKS * 7 && !M().plan[d].cooked).sort(); }
const shopLine = g => g + (needsCheck(g) ? ' (check label)' : '');
function shopItems(dates) {
  const seen = new Map(), none = [];
  dates.forEach(d => { const e = M().plan[d], i = recipeOf(e);
    if (!i || !i.ingr.length) { none.push(e.title); return; }
    i.ingr.forEach(g => { const k = mNorm(g); if (!seen.has(k)) seen.set(k, g); }); });
  return { items: [...seen.values()], none };
}
const shopDates = () => [...document.querySelectorAll('#sf input[data-night]:checked')].map(x => x.dataset.night);
function shopPreview() {
  const { items, none } = shopItems(shopDates()), box = $('#shopprev'); if (!box) return;
  const open = new Set(S.shop.items.filter(x => !x.done).map(x => mNorm(x.name)));
  const already = items.filter(g => open.has(mNorm(g))).length;
  box.innerHTML = items.length ? `<b>${plural(items.length, 'item')}</b>${already ? ` <span class="muted" style="font-size:0.78125rem">· ${already} already on the list</span>` : ''} <span class="muted" style="font-size:0.78125rem">· “check label”: gluten often hides in these, look for “gluten free” on the pack</span><ul>${items.map(g => `<li>${esc(g)}${needsCheck(g) ? ' <span class="chk">check label</span>' : ''}</li>`).join('')}</ul>` : '<span class="muted">Tick at least one planned night with ingredients.</span>';
  if (none.length) box.innerHTML += `<div class="muted" style="margin-top:6px">No ingredients saved for ${esc(none.join(', '))}. Add them in Recipes.</div>`;
}
function shopForm() {
  const dates = shopNights();
  if (!dates.length) { toast('Plan some meals first, then add their ingredients.'); return; }
  const week = dates.filter(d => dayGap(d, todayISO()) < 7), pre = new Set(week.length ? week : dates);
  openSheet('Add from meal plan',
    `<p class="muted" style="margin:-4px 0 10px">Pick the nights to shop for.</p>
    <div class="list shopnights">${dates.map(d => `<label class="srow"><input type="checkbox" data-night="${d}" ${pre.has(d) ? 'checked' : ''} onchange="shopPreview()"><div class="tx"><div class="t">${esc(M().plan[d].title)}</div><div class="s">${nightLabel(d)}${(recipeOf(M().plan[d]) || {}).gf ? '' : ' · <span class="nogf">Check it’s gluten free</span>'}</div></div></label>`).join('')}</div>
    <div class="shopprev" id="shopprev"></div>`,
    async () => {
      const ds = shopDates(); if (!ds.length) return 'Tick at least one planned night with ingredients.';
      const { items } = shopItems(ds);
      if (!items.length) return 'Tick at least one planned night with ingredients.';
      let add = 0;
      ds.forEach(d => { const i = recipeOf(M().plan[d]); if (i) add += addToShop(i.ingr, M().plan[d].title); });
      await save();
      const onPage = location.hash === '#shopping';
      if (onPage) render(); 
      return () => toast(`Added ${plural(add, 'item')} to the shopping list${add < items.length ? ` (${items.length - add} already there)` : ''}.`, onPage ? '' : 'View', onPage ? null : () => go('#shopping'));
    }, 'Add to shopping list',
    `<button type="button" class="btn" id="copylist" style="flex:0 0 auto" onclick="copyShop()">${I('copy')} Copy</button>`);
  shopPreview();
}
async function copyShop() {
  const { items } = shopItems(shopDates());
  if (!items.length) { toast('Tick at least one planned night with ingredients.'); return; }
  const ok = await copyText(items.map(shopLine).join('\n'));
  toast(ok ? `Copied ${plural(items.length, 'item')}. Paste them into your grocery list app.` : 'Couldn’t copy on this phone. Use “Add to shopping list” instead.');
}
function shopMoreSub() { const n = S.shop.items.filter(x => !x.done).length; return n ? `${plural(n, 'thing')} to get` : 'Groceries for your meals and more'; }
function homeShop() {
  const open = S.shop.items.filter(x => !x.done); if (!open.length) return '';
  return homeSec('Shopping list', '<a href="#shopping">See all</a>') + `<div class="list" id="homeshop">${open.slice(0, 5).map(shopRow).join('')}</div>` +
    (open.length > 5 ? `<div class="homemore"><a href="#shopping">${plural(open.length - 5, 'more item')}</a></div>` : '');
}
function takeShopNote() { const n = S && S.shop && S.shop.movedNote; if (n) delete S.shop.movedNote; return n || ''; }

// One-off message after the gluten-free update of the starter ideas (set by migrateStarters)
function takeMealNote() { const n = S && S.meals && S.meals.gfNote; if (n) delete S.meals.gfNote; return n || ''; }

/* ---- Home: "Upcoming meals" card ---- */
// Nights with a meal entered, including today until that calendar day has passed. Cooking nights within the planner's 4 weeks, up to 6.
const HOME_MEALS_MAX = 6;
function upcomingMeals() {
  const T = todayISO();
  // Today's meal stays on the list all of that calendar day, cooked or not, and drops off only once the day has passed.
  return Object.keys(M().plan).filter(d => d >= T && dayGap(d, T) < MEAL_WEEKS * 7 && isCookNight(d) && M().plan[d] && M().plan[d].title).sort();
}
function homeMeal() {
  const list = upcomingMeals(); if (!list.length) return '';
  const T = todayISO(), when = d => { const n = dayGap(d, T); return n === 0 ? 'Tonight' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days'; };
  const row = d => { const e = M().plan[d], idea = M().ideas.find(i => i.id === e.ideaId) || mealIdeaFor(e.title);
    const mark = idea ? (idea.gf ? gfTag(true) : '<span class="nogf">Not marked gluten free</span>') : '<span class="nogf">Check it’s gluten free</span>';
    return `<button class="row mealup" data-date="${d}" onclick="openNight('${d}')">${mealPic(idea)}<div class="tx"><div class="t">${fmtW(d)} – ${esc(e.title)}</div>
      <div class="s">${[mark, when(d), idea && idea.tag ? esc(idea.tag) : ''].filter(Boolean).join(' · ')}</div></div>${I('right')}</button>`; };
  return `<div class="list mealhome" id="mealcard"><div class="mealcardhead"><span>${I('meal')} Upcoming meals</span><a href="#meals">See all${list.length > HOME_MEALS_MAX ? ` (${list.length})` : ''}</a></div>
    ${list.slice(0, HOME_MEALS_MAX).map(row).join('')}</div>`;
}
// Open one night in the planner: go to #meals, then open that night's sheet (after the page change has rendered)
let pendingNight = null;
function openNight(iso) { pendingNight = iso; if (location.hash === '#meals') render(); else location.hash = '#meals'; }
function showPendingNight() {
  const d = pendingNight; pendingNight = null; if (!d) return;
  setTimeout(() => {
    const r = document.querySelector(`#mealplan .row[data-date="${d}"]`);
    if (r) { r.scrollIntoView({ block: 'center' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 1600); }
    mealNight(d);
  }, 0);
}
function mealsMoreSub() {
  const d = mealNights().find(x => !M().plan[x] || !M().plan[x].cooked);
  if (!d) return M().nights.length ? 'Plan your cooking nights' : 'Pick your cooking nights';
  const e = M().plan[d];
  return `${daysLeft(d) === 0 ? 'Tonight' : fmtW(d)}: ${e ? esc(e.title) : 'nothing planned'}`;
}
function mealCalItems(inR) {
  if (!showMealsCal()) return [];
  return Object.entries(M().plan).filter(([d]) => inR(d)).map(([d, e]) => ({ src: 'meal', title: e.title, date: d, time: 'Dinner', sort: '18:00', tag: 'Meal', notes: e.notes || (e.cooked ? 'Cooked' : ''), go: `mealNight('${d}')` }));
}

/* ================= MY EVENTS (Calendar › Add event), e.g. payday, rubbish day ================= */
// S.myEvents: see core.js (repeatDates). Shown on the Calendar ("My events"), on Home as a Today / Tomorrow line, with optional reminders.
// 1.82.0: Done keeps the event. That date leaves Upcoming and does not count as overdue. A repeating event marks one date, not the whole series.
const REPEATS_ORDER = ['none', 'weekly', 'fortnightly', '4weekly', 'monthly', 'lastday', 'yearly'];
const MINE_SUGGEST = [['Payday', 'fortnightly'], ['Rubbish day', 'weekly'], ['Recycling day', 'fortnightly']];
const REMIND_TIMES = (() => { const o = []; for (let m = 7 * 60; m <= 20 * 60 + 30; m += 30) { const v = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); o.push([v, fmtTime(v)]); } return o; })();
const showMine = () => !S.settings || S.settings.mineCal !== false;
async function toggleMineCal() { S.settings.mineCal = !showMine(); await save(); render(); }
const getMine = id => S.myEvents.find(e => e.id === id);
function normMine(list) {
  return (Array.isArray(list) ? list : []).filter(e => e && e.id && parseD(e.start) != null).map(e => {
    e.title = String(e.title || 'Event'); if (!REPEATS_ORDER.includes(e.repeat)) e.repeat = 'none';
    ['time', 'notes', 'until', 'remindAt'].forEach(k => { if (typeof e[k] !== 'string') e[k] = ''; });
    if (!['off', 'day', 'before'].includes(e.remind)) e.remind = 'off';
    if (!Array.isArray(e.skips)) e.skips = [];
    if (!e.moves || typeof e.moves !== 'object' || Array.isArray(e.moves)) e.moves = {};
    e.done = e.done === true;
    const rawDates = Array.isArray(e.doneDates) ? e.doneDates : [];
    const seen = new Set();
    e.doneDates = [];
    rawDates.forEach(d => {
      if (typeof d !== 'string' || parseD(d) == null || seen.has(d)) return;
      seen.add(d); e.doneDates.push(d);
    });
    e.doneDates.sort();
    if (e.doneDates.length > 400) e.doneDates = e.doneDates.slice(-400);
    return e;
  });
}
function mineDoneSet(ev) {
  return new Set((ev && Array.isArray(ev.doneDates) ? ev.doneDates : []).filter(d => typeof d === 'string' && parseD(d) != null));
}
function mineOccDone(ev, orig) {
  return !!(ev && orig && (ev.done || mineDoneSet(ev).has(orig)));
}
function mineNextOrig(ev) {
  if (!ev || !ev.repeat || ev.repeat === 'none') return ev && ev.start || '';
  const T = todayT();
  const hit = repeatDates(ev, T, T + 800 * DAY).find(o => !mineOccDone(ev, o.orig));
  return hit ? hit.orig : '';
}
function mineCompleteLabel(ev) {
  if (!ev) return '';
  if (!ev.repeat || ev.repeat === 'none') return mineOccDone(ev, ev.start) ? 'Mark not done' : 'Mark complete';
  return mineNextOrig(ev) ? 'Mark the next one done' : '';
}
async function completeMine(id, orig) {
  const ev = getMine(id);
  if (!ev || !orig || parseD(orig) == null) return;
  const s = snap(), was = mineOccDone(ev, orig);
  if (!ev.repeat || ev.repeat === 'none') {
    ev.done = !was;
    if (ev.done) ev.doneAt = Date.now(); else delete ev.doneAt;
  } else {
    const set = mineDoneSet(ev);
    if (was) set.delete(orig); else set.add(orig);
    ev.done = false;
    ev.doneDates = [...set].sort();
    if (ev.doneDates.length > 400) ev.doneDates = ev.doneDates.slice(-400);
  }
  await save();
  if (sheetOpen) await closeSheet();
  render();
  toast(was ? `${ev.title} marked not done.` : `${ev.title} marked done.`, 'Undo', undoTo(s));
}
// Calendar entries for my events between two UTC-midnight times
function mineItems(fromT, toT, all = false) {
  if (!all && !showMine()) return [];
  const out = [];
  S.myEvents.forEach(ev => repeatDates(ev, fromT, toT).forEach(o => out.push({ src: 'mine', id: ev.id, orig: o.orig, done: mineOccDone(ev, o.orig), title: ev.title, date: o.date, time: ev.time ? fmtTime(ev.time) : 'All day', hm: ev.time, sort: ev.time || '00:00', tag: 'My event',
    notes: [ev.repeat === 'none' ? '' : repeatText(ev), o.moved ? 'Moved from ' + fmtW(o.orig) : '', ev.notes ? ev.notes.split('\n')[0].slice(0, 60) : ''].filter(Boolean).join(' · '),
    go: `mineSheet('${ev.id}','${o.orig}')` })));
  return out;
}
/* ---------- Home: Needs attention (1.7.0) ----------
   One combined list of everything due soon, from every section. Each source below returns items
   { days, rank, sort, html } and keeps its own window; to add a section, write a source and add it to ATT_SOURCES.
   Only real due dates (cars, drivers, bills, to-dos, pets, health check-ups) can be overdue and count in the tiles. */
const ATT_MAX = 8; // shown before "Show all" (overdue items are always shown)
let attShowAll = false;
const attWhen = d => d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : 'In ' + d + ' days';
// 1.16.0: appointments and calendar events for the next 7 days (the old Later this week card) say the day name after tomorrow
const attDay = (d, iso) => d < 2 ? attWhen(d) : new Date(parseD(iso)).toLocaleDateString('en-NZ', { weekday: 'long', timeZone: 'UTC' });
const ATT_WEEK = 7;
// 1.24.0: weather is the line under the greeting (wxGreet), not a row or forecast chip in Upcoming
function attWxChip(iso) { return ''; }
function attWxRow() { return ''; }
function attRow(o) {
  if (o.wx) o = Object.assign({}, o, { sub: o.sub + attWxChip(o.date) });
  const ico = `<div class="ic ${o.ic}"${o.icStyle ? ` style="${o.icStyle}"` : ''}>${I(o.icon)}</div>`;
  const tx = `<div class="tx"><div class="t">${o.title}</div><div class="s">${o.sub}</div></div>`;
  const attrs = `class="row att ${o.cls || ''}" data-kind="${o.kind}"${o.date ? ` data-date="${o.date}"` : ''}`;
  if (o.complete) return `<div ${attrs}>${o.complete}<button type="button" class="tapzone" onclick="${o.go}">${ico}${tx}${o.right || ''}</button></div>`;
  return `<button ${attrs} onclick="${o.go}">${ico}${tx}${o.right || I('right')}</button>`;
}
// A feeding job, not a spray, prune or planting reminder. Matched on the built-in job, not a new date.
const gardenIsFeed = j => /feed/i.test(j.jobKey || '') || /^Feed\b/.test(j.title || '');
const ATT_SOURCES = {
  // WOF / rego / service, AA and licence, bills, to-dos with a due date, pet care: within 30 days or overdue (as before)
  due: T => dueItems(S).filter(x => x.days <= 30 && x.kind !== 'health').map(x => ({ days: x.days, rank: 0, sort: '', kind: x.kind, name: x.title, html: rowFor(x).replace('class="row"', `class="row att" data-kind="${x.kind}" data-date="${x.date}"`) })),
  // My events (payday, rubbish day…), today and tomorrow. Skipped dates are left out and moved ones show on their new date.
  // 1.82.0: a date marked done stays saved and is left out of Upcoming.
  mine: T => [0, 1].flatMap(d => mineItems(T + d * DAY, T + d * DAY, true).filter(e => !e.done).map(e => ({ days: d, rank: 1, sort: e.hm || '', kind: 'mine', name: `${attWhen(d)}: ${e.title}${e.hm ? ' ' + fmtTime(e.hm) : ''}`,
    html: attRow({ wx: 1, kind: 'mine', cls: 'mineatt', date: e.date, go: `calOpenDay(${T + d * DAY})`, ic: 'mine', icon: 'repeat', title: `${attWhen(d)}: ${esc(e.title)}${e.hm ? ' ' + fmtTime(e.hm) : ''}`,
      sub: `My event · ${fmtW(e.date)}${e.hm ? '' : ' · All day'}${e.notes.includes('Moved from') ? ' · ' + esc(e.notes.split(' · ').find(x => x.startsWith('Moved from'))) : ''}`,
      complete: `<button type="button" class="tick donelabel" aria-label="Mark complete: ${esc(e.title)}" onclick="completeMine(${jsArg(e.id)},${jsArg(e.orig)})"><span>${I('check')}</span><b>Done</b></button>` }) }))),
  // Appointments, including What's On events you added, today and the next 7 days
  appt: T => S.appts.filter(a => { const d = daysLeft(a.date); return d >= 0 && d <= ATT_WEEK; }).map(a => { const d = daysLeft(a.date); return { days: d, rank: 1, sort: a.time || '', kind: 'appt', name: `${attDay(d, a.date)}: ${a.title}${a.time ? ' ' + fmtTime(a.time) : ''}`,
    html: attRow({ wx: 1, kind: 'appt', date: a.date, go: `calOpenDay(${parseD(a.date)})`, ic: a.evId ? 'ev' : 'appt', icon: a.evId ? 'ticket' : 'cal', title: `${attDay(d, a.date)}: ${esc(a.title)}${a.time ? ' ' + fmtTime(a.time) : ''}`,
      sub: `${a.evId ? 'Event you added' : 'Appointment'} · ${fmtW(a.date)}${a.time ? '' : ' · All day'}` }) }; }),
  // Connected Outlook / Google / iCloud calendars, today and the next 7 days (an event spanning several days shows once, on its first day here)
  ext: T => { const seen = new Set(); return extEvents(T, T + ATT_WEEK * DAY).filter(e => { const k = (e.tag || '') + '|' + e.title; if (seen.has(k)) return false; seen.add(k); return true; }).map(e => { const d = daysLeft(e.date); return { days: d, rank: 1, sort: e.sort || '', kind: 'ext', name: `${attDay(d, e.date)}: ${e.title}${e.time && e.time !== 'All day' && e.time !== 'Cont.' ? ' ' + e.time : ''}`,
    html: attRow({ wx: 1, kind: 'ext', date: e.date, go: `calOpenDay(${parseD(e.date)})`, ic: 'ext', icStyle: e.color ? `background:${e.color}1f;color:${e.color}` : '', icon: 'cal',
      title: `${attDay(d, e.date)}: ${esc(e.title)}${e.time && e.time !== 'All day' && e.time !== 'Cont.' ? ' ' + esc(e.time) : ''}`, sub: `${esc(e.tag || 'Calendar')} · ${fmtW(e.date)}${e.time === 'All day' ? ' · All day' : ''}` }) }; }); },
  // Birthdays, today and the next 7 days
  bday: T => S.birthdays.map(b => Object.assign({ b }, bdayInfo(b))).filter(x => x.d >= 0 && x.d <= 7).map(x => ({ days: x.d, rank: 2, sort: '', kind: 'bday', name: `${x.b.name}’s ${x.age > 0 ? ordinal(x.age) + ' ' : ''}birthday`,
    html: attRow({ kind: 'bday', cls: x.d === 0 ? 'bdtoday' : '', date: x.iso, go: `go('#birthdays')`, ic: 'bday', icon: 'cake', title: `${esc(x.b.name)}’s ${x.age > 0 ? ordinal(x.age) + ' ' : ''}birthday`,
      sub: `Birthday · ${fmtW(x.iso)}`, right: `<span class="pill ${x.d === 0 ? 'bdaypill' : 'bdaysoon'}">${x.d === 0 ? 'Today!' : attWhen(x.d)}</span>` }) })),
  // Today's planned dinner, on the day it is scheduled (it also stays on the Upcoming meals card).
  meal: T => { const d = todayISO(), e = M().plan[d]; if (!e || !e.title || !isCookNight(d)) return [];
    return [{ days: 0, rank: 3, sort: '', kind: 'meal', name: e.title ? `Tonight: ${e.title}` : '', html: attRow({ kind: 'meal', date: d, go: `openNight('${d}')`, ic: 'meal', icon: 'meal', title: `Tonight: ${esc(e.title)}`, sub: 'Dinner · tap to see it or tick it cooked' }) }]; },
  // Health (1.8.0): check-ups due within 30 days or overdue (real due dates, like pets), and booked appointments today and tomorrow.
  // A booked check-up has no due row (core.js dueItems leaves it out), so it never shows twice.
  health: T => dueItems({ health: S.health }).filter(x => x.days <= 30).map(x => ({ days: x.days, rank: 0, sort: '', kind: 'health', name: x.title,
    html: attRow({ kind: 'health', cls: 'hdue', date: x.date, go: `go('${x.go}')`, ic: 'health', icon: HEALTH_ICON[x.item.kind] || 'medkit', title: esc(x.title),
      sub: `Health · ${x.item.clinic ? esc(x.item.clinic) + ' · ' : ''}Due ${fmtW(x.date)}`, right: duePill(x.days) }) }))
    .concat(healthAppts(S, T, T + DAY).map(a => { const d = daysLeft(a.date); return { days: d, rank: 1, sort: a.time || '',
      kind: 'health', name: `${attWhen(d)}: ${a.title}${a.time ? ' ' + fmtTime(a.time) : ''}`, html: attRow({ wx: 1, kind: 'health', cls: 'happt', date: a.date, go: `go('#health/${a.person.id}/${a.item.id}')`, ic: 'health', icon: HEALTH_ICON[a.item.kind] || 'medkit',
        title: `${attWhen(d)}: ${esc(a.title)}${a.time ? ' ' + fmtTime(a.time) : ''}`, sub: `Health appointment · ${a.item.clinic ? esc(a.item.clinic) + ' · ' : ''}${fmtW(a.date)}${a.time ? '' : ' · All day'}` }) }; })),
  // Gardening (1.20.0): other jobs for the next 14 days, not marked done, and not once the day has passed.
  // Feeding jobs (1.61.0) stay on Home and in Upcoming on the day they are due, and after that day, until marked done for the year.
  garden: T => {
    const y0 = parseD(todayISO().slice(0, 4) + '-01-01');
    return gardenJobs(S, y0, T + 14 * DAY).filter(j => !j.done && (gardenIsFeed(j) ? j.days <= 14 : j.days >= 0 && j.days <= 14)).map(j => ({ days: j.days, rank: 0, sort: j.title, kind: 'garden', name: j.title,
      html: attRow({ kind: 'garden', date: j.date, go: `go('#garden/${j.go}')`, ic: 'garden', icon: 'leaf', title: esc(j.title),
        sub: `Garden · ${fmtW(j.date)}`, right: duePill(j.days) }) }));
  },
  // Commission tracker set up and nothing entered for yesterday
  comm: T => { if (!CM().anchor) return []; const y = yesterdayISO(); if (commDay(y).length) return [];
    return [{ days: 0, rank: 0, sort: '', kind: 'comm', name: 'Enter yesterday’s commission', html: attRow({ kind: 'comm', go: `go('#commission/add')`, ic: 'comm', icon: 'cash', title: 'Enter yesterday’s commission', sub: `Commission · nothing entered for ${fmtW(y)} yet` }) }]; }
};
function homeAttention() {
  const T = todayT(), all = [];
  Object.values(ATT_SOURCES).forEach(src => { try { src(T).forEach(x => all.push(x)); } catch (e) { /* one broken source mustn't hide the rest */ } });
  // overdue first (most overdue at the top), then by date; on the same day, due dates, then events by time, birthdays, dinner
  return all.sort((a, b) => a.days - b.days || a.rank - b.rank || a.sort.localeCompare(b.sort));
}
function attentionHtml() {
  const list = homeAttention(), wx = attWxRow();
  if (!list.length && wx) return `<div class="list" id="attention">${wx}</div><div class="card empty"><div class="t">All good for the next 30 days</div><div class="s">Nothing is overdue or due soon. Sweet as.</div></div>`;
  if (!list.length) return `<div class="card empty"><div class="t">All good for the next 30 days</div><div class="s">Nothing is overdue or due soon. Sweet as.</div></div>`;
  const over = list.filter(x => x.days < 0).length, n = attShowAll ? list.length : Math.max(ATT_MAX, over);
  return `<div class="list" id="attention">${wx}${list.slice(0, n).map(x => x.html).join('')}</div>` +
    (list.length > n ? `<div class="btns"><button class="btn" id="attmore" onclick="attShowAll=true;render()">Show all ${list.length}</button></div>` : attShowAll && list.length > ATT_MAX ? `<div class="btns"><button class="btn" id="attmore" onclick="attShowAll=false;render()">Show fewer</button></div>` : '');
}
function calOpenDay(t) { const d = new Date(t); calMonth = { y: d.getUTCFullYear(), m: d.getUTCMonth() }; calSel = t; go('#calendar'); }
function mineForm(id, date) {
  const ev = id ? getMine(id) : { title: '', start: date || (calSel != null ? isoT(calSel) : todayISO()), time: '', notes: '', repeat: 'none', until: '', remind: 'off', remindAt: '' };
  if (!ev) return;
  const changed = id ? [...ev.skips.map(d => [d, 'skip']), ...Object.keys(ev.moves).map(d => [d, 'move'])].sort((a, b) => a[0].localeCompare(b[0])) : [];
  openSheet(id ? 'Edit event' : 'Add event',
    (id ? '' : `<div class="chips minesuggest">${MINE_SUGGEST.map(([t, r]) => `<button type="button" class="chip" data-t="${t}" data-r="${r}">${I('plus')} ${t}</button>`).join('')}</div>`) +
    field('Title', inp('title', ev.title, 'placeholder="e.g. Payday" required maxlength="60"')) +
    field('Start date', inp('start', ev.start, 'type="date" required')) +
    `<div class="field"><span>Time</span>${segHtml('when', [['allday', 'All day'], ['time', 'At a time']], ev.time ? 'time' : 'allday')}</div>` +
    `<div id="timebox" style="${ev.time ? '' : 'display:none'}">${field('At', inp('time', ev.time, 'type="time"'))}</div>` +
    field('Repeat', sel('repeat', REPEATS_ORDER.map(k => [k, REPEAT_LABEL[k]]), ev.repeat)) +
    `<p class="muted rephint" id="rephint"></p>` +
    `<div id="untilbox">${field('End date (optional)', inp('until', ev.until, 'type="date"'), 'Leave blank to keep repeating.')}</div>` +
    `<div class="two">${field('Reminder', sel('remind', [['off', 'Off'], ['day', 'On the day'], ['before', 'The day before']], ev.remind))}<div id="rtimebox">${field('At', sel('remindAt', REMIND_TIMES, ev.remindAt || (ev.remind === 'before' ? '19:00' : '07:00')))}</div></div>` +
    field('Notes', area('notes', ev.notes, 'Optional')) +
    (id && mineCompleteLabel(ev) ? `<div class="btns" style="margin-top:4px"><button type="button" class="btn" onclick="completeMine(${jsArg(id)},${jsArg((!ev.repeat || ev.repeat === 'none') ? ev.start : mineNextOrig(ev))})">${I('check')} ${esc(mineCompleteLabel(ev))}</button></div>` : '') +
    (changed.length ? `<div class="field"><span>Changed dates</span><div class="list changed">${changed.map(([d, k]) => `<div class="srow" data-changed="${d}"><div class="tx"><div class="t">${fmtW(d)}</div><div class="s">${k === 'skip' ? 'Skipped' : 'Moved to ' + fmtW(ev.moves[d])}</div></div><button type="button" class="btn small" onclick="putBack('${id}','${d}',this)">Put back</button></div>`).join('')}</div></div>` : ''),
    async v => {
      if (!v.title) return 'Please give the event a title.';
      if (!parseD(v.start)) return 'Please choose the start date.';
      const time = v.when === 'time' ? v.time : '';
      if (v.when === 'time' && !/^\d{2}:\d{2}$/.test(time)) return 'Please choose a time, or pick “All day”.';
      const until = v.repeat === 'none' ? '' : v.until;
      if (until && (!parseD(until) || until < v.start)) return 'The end date can’t be before the start date.';
      const s = snap(), upd = { title: v.title, start: v.start, time, repeat: v.repeat, until, notes: v.notes, remind: v.remind, remindAt: v.remind === 'off' ? '' : v.remindAt };
      if (id) Object.assign(ev, upd); else S.myEvents.push(Object.assign({ id: uid('myev'), skips: [], moves: {}, done: false, doneDates: [] }, upd));
      await save(); render();
      toast(id ? 'Event updated.' : `${v.title} added${v.repeat === 'none' ? '' : ' · ' + repeatText(upd).toLowerCase()}.`, 'Undo', undoTo(s));
    }, id ? 'Save' : 'Add event',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete event" onclick="deleteMine('${id}')">${I('trash')}</button>` : '');
  const f = $('#sf');
  const upd = () => {
    const x = { start: f.start.value, repeat: f.repeat.value, until: f.until.value };
    $('#untilbox').style.display = x.repeat === 'none' ? 'none' : '';
    $('#rtimebox').style.visibility = f.remind.value === 'off' ? 'hidden' : 'visible';
    const h = $('#rephint'); if (!parseD(x.start)) { h.textContent = ''; return; }
    const day = +x.start.slice(8), next = repeatDates(x, parseD(x.start), parseD(x.start) + 800 * DAY).slice(0, 4).map(o => fmtW(o.date));
    h.textContent = x.repeat === 'none' ? `On ${fmtLong(x.start)}.` : `${repeatText(x)}. Next: ${next.join(', ')}${next.length === 4 ? '…' : ''}` +
      (x.repeat === 'monthly' && day > 28 ? ` In months without a ${ordinal(day)}, it’s on the last day of the month.` : '') + (x.repeat === 'fortnightly' ? ' Counted from the start date.' : '');
  };
  f.querySelectorAll('input,select').forEach(x => { x.addEventListener('input', upd); x.addEventListener('change', upd); });
  f.remind.addEventListener('change', () => { if (f.remind.value === 'before' && f.remindAt.value === '07:00') f.remindAt.value = '19:00'; if (f.remind.value === 'day' && f.remindAt.value === '19:00') f.remindAt.value = '07:00'; upd(); });
  wireSeg('when', w => { $('#timebox').style.display = w === 'time' ? '' : 'none'; if (w === 'time' && !f.time.value) f.time.value = '09:00'; });
  f.querySelectorAll('.minesuggest .chip').forEach(b => b.onclick = () => { f.title.value = b.dataset.t; f.repeat.value = b.dataset.r; upd(); });
  upd();
}
async function putBack(id, d, btn) {
  const ev = getMine(id); ev.skips = ev.skips.filter(x => x !== d); delete ev.moves[d];
  await save(); const r = btn.closest('.srow'); r.querySelector('.s').textContent = 'Back on ' + fmtW(d); btn.remove(); toast(`${ev.title} is back on ${fmtW(d)}.`);
}
function mineSheet(id, orig) {
  const ev = getMine(id); if (!ev) return;
  const cur = (ev.moves || {})[orig] || orig, moved = cur !== orig, rep = ev.repeat !== 'none';
  openSheet(esc(ev.title), `<div class="dcard"><div class="h"><i class="dot" style="background:var(--mine)"></i> My event</div>
      <div class="big" style="font-size:1.125rem">${fmtLong(cur)}</div>
      <div class="muted" style="margin-top:4px">${ev.time ? fmtTime(ev.time) : 'All day'} · ${esc(repeatText(ev))}${moved ? `<br>Moved from ${fmtW(orig)}` : ''}${ev.remind !== 'off' ? `<br>Reminder ${ev.remind === 'day' ? 'on the day' : 'the day before'} at ${fmtTime(ev.remindAt)}` : ''}</div>
      ${ev.notes ? `<div class="muted notes" style="margin-top:6px">${esc(ev.notes)}</div>` : ''}</div>
    <div class="minebtns">
      <button type="button" class="btn primary" onclick="completeMine(${jsArg(id)},${jsArg(orig)})">${I('check')} ${mineOccDone(ev, orig) ? 'Mark not done' : 'Done'}</button>
      ${rep ? `<button type="button" class="btn" onclick="skipDate('${id}','${orig}')">${I('x')} Skip this date</button><button type="button" class="btn" onclick="moveForm('${id}','${orig}')">${I('cal')} Move this date</button>` : ''}
      ${moved ? `<button type="button" class="btn" onclick="unmove('${id}','${orig}')">${I('refresh')} Put back on ${fmtW(orig)}</button>` : ''}
      <button type="button" class="btn" onclick="mineForm('${id}')">${I('edit')} Edit ${rep ? 'series' : 'event'}</button>
      <button type="button" class="btn danger" onclick="deleteMine('${id}')">${I('trash')} Delete ${rep ? 'series' : 'event'}</button></div>`, null);
}
async function skipDate(id, orig) {
  const ev = getMine(id), s = snap(); if (!ev.skips.includes(orig)) ev.skips.push(orig); delete ev.moves[orig];
  await save(); await closeSheet(); render(); toast(`${ev.title} skipped on ${fmtW(orig)}.`, 'Undo', undoTo(s));
}
async function unmove(id, orig) {
  const ev = getMine(id), s = snap(); delete ev.moves[orig];
  await save(); await closeSheet(); render(); toast(`${ev.title} is back on ${fmtW(orig)}.`, 'Undo', undoTo(s));
}
function moveForm(id, orig) {
  const ev = getMine(id); if (!ev) return;
  openSheet(`Move ${esc(ev.title)}`, `<p class="muted" style="margin:-4px 0 12px">Just this one: ${fmtLong(orig)}. The rest of the series stays the same.</p>` +
    field('New date', inp('date', ev.moves[orig] || addDays(orig, 1), 'type="date" required')),
    async v => {
      if (!parseD(v.date)) return 'Please choose the new date.';
      const s = snap();
      if (v.date === orig) delete ev.moves[orig]; else ev.moves[orig] = v.date;
      ev.skips = ev.skips.filter(x => x !== orig);
      await save(); render(); toast(v.date === orig ? `${ev.title} is back on ${fmtW(orig)}.` : `${ev.title} moved from ${fmtW(orig)} to ${fmtW(v.date)}.`, 'Undo', undoTo(s));
    }, 'Move');
}
function deleteMine(id) {
  const ev = getMine(id); if (!ev) return;
  confirmSheet(`Delete ${esc(ev.title)}?`, ev.repeat === 'none' ? 'It will be removed from the Calendar.' : 'Every date in this series will be removed from the Calendar.', ev.repeat === 'none' ? 'Delete event' : 'Delete series', async () => {
    const s = snap(); S.myEvents = S.myEvents.filter(x => x.id !== id); await save();
    return () => { render(); toast(`${ev.title} deleted.`, 'Undo', undoTo(s)); };
  });
}

/* ================= PETS & VET (More › Pets & Vet) ================= */
// S.pets = [{ id, name, type: 'dog'|'cat'|'other', breed, birthday, chip, vet, vetPhone, notes, care: [care item], history: [{ id, careId, name, date, notes, cost }] }]
// Care items and their due dates are worked out in core.js (careDue), so the service worker can remind too.
const PET_TYPES = [['dog', 'Dog'], ['cat', 'Cat'], ['other', 'Other']];
const PET_HEX = { dog: '#8B5A2B', cat: '#64748B', other: '#0E7C86' };
const CARE_ICON = { flea: 'drop', worm: 'pill', vacc: 'syringe', groom: 'scissors', check: 'heart', reg: 'idcard', custom: 'pill' };
const CARE_NOTE_PH = { flea: 'e.g. which product, or cost', worm: 'e.g. which product, or cost', vacc: 'e.g. which vaccine, or cost', groom: 'e.g. where, or cost', check: 'e.g. what the vet said, or cost', reg: 'e.g. tag number, or cost', custom: 'e.g. dose, or cost' };
const CARE_SUGGEST = ['Medication', 'Heartworm', 'Tick treatment', 'Dental clean', 'Nail trim', 'Kennel booking'];
const UNITS = [['weeks', 'weeks'], ['months', 'months'], ['years', 'years'], ['none', 'Doesn’t repeat']];
const careItem = kind => Object.assign({ id: 'care-' + kind, kind, last: '', due: '' }, PET_CARE[kind]);
const defaultCare = type => ['flea', 'worm', 'vacc', 'groom', 'check'].concat(type === 'dog' ? ['reg'] : []).map(careItem);
function normPets(list) {
  return (Array.isArray(list) ? list : []).filter(p => p && typeof p === 'object' && p.id).map(p => {
    p.name = String(p.name || 'Pet'); if (!['dog', 'cat', 'other'].includes(p.type)) p.type = 'other';
    ['breed', 'birthday', 'chip', 'vet', 'vetPhone', 'notes'].forEach(k => { if (typeof p[k] !== 'string') p[k] = ''; });
    p.care = (Array.isArray(p.care) ? p.care : []).filter(c => c && c.id).map(c => Object.assign({ kind: 'custom', name: 'Care', every: 1, unit: 'months', last: '', due: '' }, c));
    p.history = (Array.isArray(p.history) ? p.history : []).filter(h => h && h.id && parseD(h.date) != null);
    return p;
  });
}
const getPet = id => S.pets.find(p => p.id === id);
const getCare = (p, cid) => p && p.care.find(c => c.id === cid);
const showPetsCal = () => !S.settings || S.settings.petsCal !== false;
async function togglePetsCal() { S.settings.petsCal = !showPetsCal(); await save(); render(); }
const petItems = p => dueItems({ pets: [p] });
function petAge(b) {
  const T = todayISO(); if (!parseD(b) || b > T) return '';
  let m = (+T.slice(0, 4) - +b.slice(0, 4)) * 12 + (+T.slice(5, 7) - +b.slice(5, 7)); if (+T.slice(8) < +b.slice(8)) m--;
  return m >= 12 ? plural(Math.floor(m / 12), 'year') : m >= 1 ? plural(m, 'month') : 'under a month';
}
const petSub = p => [PET_TYPES.find(t => t[0] === p.type)[1], p.breed ? esc(p.breed) : '', p.birthday ? petAge(p.birthday) : ''].filter(Boolean).join(' · ');
const petPic = (p, big) => `<div class="carpic petpic" style="background:${PET_HEX[p.type]}">${I('paw')}</div>`;
const telHref = n => 'tel:' + String(n || '').replace(/[^\d+]/g, '');
function Pets() {
  return header('Pets & Vet', S.pets.length ? plural(S.pets.length, 'pet') : 'Flea treatment, worming, vaccinations and more', addBtn('Add a pet', 'petForm()')) +
    (S.pets.length ? S.pets.map(p => {
      const next = petItems(p).slice(0, 3);
      return `<div class="carcard petcard" role="button" tabindex="0" data-pet="${p.id}" onclick="go('#pet/${p.id}')"><div class="carhead">${petPic(p)}
        <div style="flex:1;min-width:0"><div class="carname">${esc(p.name)}</div><div class="carmodel">${petSub(p)}</div></div>${I('right')}</div>
        ${next.length ? `<div class="petnext">${next.map(x => `<div><span class="pn">${esc(x.care.name)}</span><b>${fmtW(x.date)}</b>${pill(x.days)}</div>`).join('')}</div>` : '<div class="muted" style="margin-top:10px;font-size:0.875rem">No dates yet. Tap to add when things were last done.</div>'}</div>`;
    }).join('') + `<div class="btns"><button class="btn" onclick="petForm()">${I('plus')} Add another pet</button></div>`
      : empty('No pets yet', 'Keep track of flea treatment, worming, vaccinations, grooming, vet check-ups and dog registration.', 'Add your first pet', 'petForm()')) +
    `<div class="foot">Due pet care shows on Home and the Calendar.<br>${savedWhere()}</div>`;
}
let petHistAll = false;
function careRow(p, it) {
  const due = careDue(it), d = due ? daysLeft(due) : null;
  const bits = [careEvery(it), it.last ? 'Last done ' + fmt(it.last) : 'Not done yet'].concat(it.due ? ['Date set by you'] : []);
  return `<div class="row care" data-care="${it.id}"><button class="tapzone" aria-label="Edit ${esc(it.name)}" onclick="careForm('${p.id}','${it.id}')"><div class="ic pet">${I(CARE_ICON[it.kind] || 'pill')}</div>
    <div class="tx"><div class="t">${esc(it.name)}</div><div class="s">${due ? `<b class="duewhen">Due ${fmtW(due)}</b> ${pill(d)}` : '<span class="pill none">No date yet</span>'}</div><div class="s">${bits.join(' · ')}</div></div></button>
    <button class="btn small" aria-label="Done: ${esc(it.name)}" onclick="doneForm('${p.id}','${it.id}')">${I('check')} Done</button></div>`;
}
function PetDetail(id) {
  const p = getPet(id);
  if (!p) return `<button class="back" onclick="go('#pets')">${I('left')} Pets &amp; Vet</button>` + empty('That pet isn’t here any more', 'It may have been deleted.', '', '');
  const order = it => { const d = careDue(it); return d ? parseD(d) : Infinity; };
  const care = [...p.care].sort((a, b) => order(a) - order(b));
  const hist = [...p.history].sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0));
  const shown = petHistAll ? hist : hist.slice(0, 8);
  const info = [p.birthday ? `Born ${fmtY(p.birthday)}` : '', p.chip ? `Microchip ${esc(p.chip)}` : ''].filter(Boolean);
  return `<div style="display:flex;justify-content:space-between;align-items:center"><button class="back" onclick="go('#pets')">${I('left')} Pets &amp; Vet</button>
    <button class="btn small" onclick="petForm('${p.id}')">${I('edit')} Edit</button></div>
  <div class="hero">${petPic(p, true)}<div style="min-width:0"><h2>${esc(p.name)}</h2><div class="muted">${petSub(p)}${info.length ? '<br>' + info.join(' · ') : ''}</div></div></div>
  ${p.vet || p.vetPhone ? `<div class="dcard vetcard"><div class="h">${I('heart')} Vet</div><div class="big" style="font-size:1.125rem">${esc(p.vet || 'Vet clinic')}</div>
    ${p.vetPhone ? `<div class="btns"><a class="btn primary" href="${telHref(p.vetPhone)}">${I('call')} Call ${esc(p.vetPhone)}</a></div>` : ''}</div>` : ''}
  <div class="sec">Care <button onclick="careForm('${p.id}')">Add care item</button></div>
  ${care.length ? `<div class="list" id="carelist">${care.map(it => careRow(p, it)).join('')}</div>` : empty('No care items', 'Add flea treatment, a medication or anything else you want reminding about.', 'Add care item', `careForm('${p.id}')`)}
  <div class="sec">History ${hist.length > 8 ? `<button onclick="petHistAll=!petHistAll;render()">${petHistAll ? 'Show less' : `Show all (${hist.length})`}</button>` : ''}</div>
  ${hist.length ? `<div class="list" id="pethist">${shown.map(h => `<button class="row hrowpet" data-hist="${h.id}" onclick="histForm('${p.id}','${h.id}')"><div class="tx"><div class="t">${esc(h.name)}</div>
      <div class="s">${fmtW(h.date)}${h.date.slice(0, 4) !== todayISO().slice(0, 4) ? ' ' + h.date.slice(0, 4) : ''}${h.notes ? ' · ' + esc(h.notes) : ''}</div></div>${h.cost !== '' && h.cost != null ? `<b class="cost">${money(h.cost)}</b>` : ''}</button>`).join('')}</div>`
    : `<div class="card muted" style="font-size:0.875rem">Nothing logged yet. Tap “Done” on a care item and it’s saved here with the date and any notes.</div>`}
  ${p.notes ? `<div class="dcard" style="margin-top:12px"><div class="h">${I('doc')} Notes</div><div class="muted notes" style="margin-top:6px">${esc(p.notes)}</div></div>` : ''}
  <div class="card muted" style="margin-top:12px;font-size:0.84375rem">Reminders: 3 days before and on the day. Dog registration is due every 1 July (the registration year runs 1 July to 30 June).</div>
  <div class="btns" style="margin-top:12px"><button class="btn danger" onclick="deletePet('${p.id}')">${I('trash')} Delete ${esc(p.name)}</button></div>`;
}
function petForm(id) {
  const p = id ? getPet(id) : { name: '', type: 'dog', breed: '', birthday: '', chip: '', vet: '', vetPhone: '', notes: '' };
  if (!p) return;
  const vets = [...new Set(S.pets.map(x => x.vet).filter(Boolean))];
  openSheet(id ? 'Edit pet' : 'Add a pet',
    field('Name', inp('name', p.name, 'placeholder="e.g. Max" required maxlength="40"')) +
    `<div class="field"><span>Type</span>${segHtml('type', PET_TYPES, p.type)}</div>` +
    `<div class="two">${field('Breed', inp('breed', p.breed, 'placeholder="Optional" maxlength="50"'))}${field('Birthday', inp('birthday', p.birthday, 'type="date"'), 'Optional')}</div>` +
    field('Microchip number', inp('chip', p.chip, 'inputmode="numeric" placeholder="Optional" maxlength="20"')) +
    `<div class="two">${field('Vet clinic', inp('vet', p.vet, 'list="vetlist" placeholder="Optional" maxlength="60"') + `<datalist id="vetlist">${vets.map(v => `<option value="${esc(v)}">`).join('')}</datalist>`)}${field('Vet phone', inp('vetPhone', p.vetPhone, 'type="tel" inputmode="tel" placeholder="Optional" maxlength="20"'))}</div>` +
    field('Notes', area('notes', p.notes, 'Optional, e.g. allergies, food, insurance')) +
    (id ? '' : `<p class="muted" style="margin:2px 2px 0;font-size:0.84375rem" id="petcarehint"></p>`),
    async v => {
      if (!v.name) return 'Please give your pet a name.';
      if (v.birthday && (!parseD(v.birthday) || v.birthday > todayISO())) return 'The birthday can’t be in the future.';
      if (v.vetPhone && digits(v.vetPhone).length < 6) return 'Please check the vet’s phone number.';
      const upd = { name: v.name, type: v.type, breed: v.breed, birthday: v.birthday, chip: v.chip, vet: v.vet, vetPhone: v.vetPhone, notes: v.notes };
      if (id) {
        const s = snap(); let note = '';
        Object.assign(p, upd);
        const reg = p.care.find(c => c.kind === 'reg');
        if (p.type === 'dog' && !reg) { p.care.push(careItem('reg')); note = ' Dog registration added.'; }
        if (p.type !== 'dog' && reg) { p.care = p.care.filter(c => c !== reg); note = ' Dog registration removed.'; }
        await save(); render(); toast('Pet updated.' + note, note ? 'Undo' : '', note ? undoTo(s) : null);
      } else {
        upd.id = uid('pet'); upd.care = defaultCare(v.type); upd.history = []; S.pets.push(upd);
        await save(); toast(`${v.name} added. Tap a care item to add when it was last done.`);
        return () => go('#pet/' + upd.id);
      }
    }, id ? 'Save' : 'Add pet',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete pet" onclick="deletePet('${id}')">${I('trash')}</button>` : '');
  const hint = t => { const h = $('#petcarehint'); if (h) h.textContent = `We’ll add flea treatment (monthly), worming (every 3 months), vaccinations (yearly), grooming (every 6 weeks) and a yearly vet check-up${t === 'dog' ? ', plus dog registration (every 1 July)' : ''}. You can change or remove any of them.`; };
  wireSeg('type', hint); hint(p.type);
}
function deletePet(id) {
  const p = getPet(id); if (!p) return;
  confirmSheet(`Delete ${esc(p.name)}?`, `${esc(p.name)}’s care items and history will be removed from this phone.`, 'Delete pet', async () => {
    const s = snap(); S.pets = S.pets.filter(x => x.id !== id); await save();
    return () => { go('#pets'); toast(`${p.name} deleted.`, 'Undo', undoTo(s)); };
  });
}
function careForm(petId, cid) {
  const p = getPet(petId); if (!p) return;
  const it = cid ? getCare(p, cid) : { kind: 'custom', name: '', every: 1, unit: 'months', last: '', due: '' };
  if (!it) return;
  const reg = it.kind === 'reg';
  openSheet(cid ? esc(it.name) : 'Add care item',
    field('Name', inp('name', it.name, `placeholder="e.g. Medication" required maxlength="40" ${cid ? '' : 'list="caresuggest"'}`) + (cid ? '' : `<datalist id="caresuggest">${CARE_SUGGEST.map(x => `<option value="${x}">`).join('')}</datalist>`)) +
    (reg ? `<p class="muted" style="margin:-2px 2px 12px;font-size:0.875rem">Due every 1 July. The dog registration year runs 1 July to 30 June; paying from May counts for the coming year.</p>`
      : `<div class="two">${field('Repeat every', inp('every', it.unit === 'none' ? '' : it.every, 'type="number" inputmode="numeric" min="1" max="99"'))}${field('&nbsp;', sel('unit', UNITS, it.unit || 'months'))}</div>`) +
    field('Last done', inp('last', it.last, 'type="date"')) + field('Next due (optional)', inp('due', it.due, 'type="date"')) +
    `<p class="muted" style="margin:0 2px 4px;font-size:0.84375rem" id="carehint"></p>`,
    async v => {
      if (!v.name) return 'Please give it a name.';
      const unit = reg ? 'years' : v.unit, every = reg ? 1 : Math.round(+v.every);
      if (!reg && unit !== 'none' && !(every >= 1 && every <= 99)) return 'Please choose how often, e.g. every 1 month.';
      if (v.last && (!parseD(v.last) || v.last > todayISO())) return 'The last done date can’t be in the future.';
      const s = snap(), upd = { name: v.name, every: unit === 'none' ? 0 : every, unit, last: v.last, due: v.due };
      if (cid) Object.assign(it, upd); else p.care.push(Object.assign({ id: uid('care'), kind: 'custom' }, upd));
      await save(); render(); toast(cid ? 'Saved.' : `${v.name} added.`, 'Undo', undoTo(s));
    }, cid ? 'Save' : 'Add',
    cid ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete care item" onclick="deleteCare('${petId}','${cid}')">${I('trash')}</button>` : '');
  const f = $('#sf'), upd = () => {
    const x = { kind: it.kind, every: reg ? 1 : +f.every.value, unit: reg ? 'years' : f.unit.value, last: f.last.value, due: f.due.value };
    const d = careDue(x);
    $('#carehint').textContent = x.due ? `Next due ${fmtLong(x.due)} (the date you set).` : d ? `Next due ${fmtLong(d)}, worked out from the last date. Or set a date yourself.` : 'Add the date it was last done and we’ll work out when it’s next due, or set the next due date.';
  };
  f.querySelectorAll('input,select').forEach(x => { x.addEventListener('input', upd); x.addEventListener('change', upd); }); upd();
}
async function deleteCare(petId, cid) {
  const p = getPet(petId), it = getCare(p, cid), s = snap();
  p.care = p.care.filter(c => c.id !== cid); await save(); await closeSheet(); render(); toast(`${it.name} removed.`, 'Undo', undoTo(s));
}
function doneForm(petId, cid) {
  const p = getPet(petId), it = getCare(p, cid); if (!it) return;
  openSheet(`Done: ${esc(it.name)}`,
    `<div class="two">${field('Done on', inp('date', todayISO(), 'type="date" required'))}${field('Cost ($)', inp('cost', '', 'inputmode="decimal" placeholder="Optional"'))}</div>` +
    field('Notes', area('notes', '', 'Optional, ' + (CARE_NOTE_PH[it.kind] || CARE_NOTE_PH.custom))) +
    `<p class="muted" style="margin:0 2px 4px;font-size:0.84375rem" id="donehint"></p>`,
    async v => {
      if (!parseD(v.date)) return 'Please choose the date it was done.';
      if (v.date > todayISO()) return 'The date can’t be in the future.';
      const cost = parseMoney(v.cost); if (Number.isNaN(cost)) return 'Please type the cost as a number, like 45.90.';
      const s = snap();
      p.history.push({ id: uid('ph'), careId: it.id, kind: it.kind, name: it.name, date: v.date, notes: v.notes, cost, at: Date.now() });
      if (!it.last || v.date >= it.last) { it.last = v.date; it.due = ''; }
      await save(); render();
      const nd = careDue(it);
      toast(`${it.name} done.${nd ? ' Next due ' + fmtW(nd) + '.' : ''}`, 'Undo', undoTo(s));
    }, 'Save');
  const upd = () => { const d = $('#sf input[name=date]').value, n = parseD(d) ? careNextAfter(it, d) : ''; $('#donehint').textContent = n ? `Next due: ${fmtLong(n)}.` : it.unit === 'none' ? 'This one doesn’t repeat.' : ''; };
  $('#sf input[name=date]').addEventListener('input', upd); $('#sf input[name=date]').addEventListener('change', upd); upd();
}
function syncCareLast(p, careId) {
  const it = getCare(p, careId); if (!it) return;
  const l = p.history.filter(h => h.careId === careId).map(h => h.date).sort().pop();
  if (l) it.last = l;
}
function histForm(petId, hid) {
  const p = getPet(petId), h = p && p.history.find(x => x.id === hid); if (!h) return;
  openSheet(esc(h.name),
    `<div class="two">${field('Done on', inp('date', h.date, 'type="date" required'))}${field('Cost ($)', inp('cost', h.cost === '' || h.cost == null ? '' : Number(h.cost).toFixed(2), 'inputmode="decimal" placeholder="Optional"'))}</div>` +
    field('Notes', area('notes', h.notes, 'Optional')),
    async v => {
      if (!parseD(v.date)) return 'Please choose the date it was done.';
      if (v.date > todayISO()) return 'The date can’t be in the future.';
      const cost = parseMoney(v.cost); if (Number.isNaN(cost)) return 'Please type the cost as a number, like 45.90.';
      const s = snap(); Object.assign(h, { date: v.date, notes: v.notes, cost }); syncCareLast(p, h.careId);
      await save(); render(); toast('History updated.', 'Undo', undoTo(s));
    }, 'Save',
    `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete history entry" onclick="deleteHist('${petId}','${hid}')">${I('trash')}</button>`);
}
async function deleteHist(petId, hid) {
  const p = getPet(petId), s = snap(), h = p.history.find(x => x.id === hid);
  p.history = p.history.filter(x => x.id !== hid); syncCareLast(p, h.careId);
  await save(); await closeSheet(); render(); toast('Entry deleted.', 'Undo', undoTo(s));
}
function petCalItems(inR) {
  if (!showPetsCal()) return [];
  return dueItems({ pets: S.pets }).filter(x => inR(x.date)).map(x => ({ src: 'pet', title: x.title, date: x.date, time: 'Pet', sort: '', tag: 'Pet', notes: careEvery(x.care), go: `go('#pet/${x.pet.id}')` }));
}
function petsMoreSub() {
  if (!S.pets.length) return 'Flea treatment, vaccinations, grooming…';
  const n = dueItems({ pets: S.pets })[0];
  return n ? `Next: ${esc(n.title)}, ${n.days < 0 ? 'overdue' : n.days === 0 ? 'today' : fmtW(n.date)}` : plural(S.pets.length, 'pet');
}

/* ================= GARDENING (1.20.0, More › Gardening) ================= */
// Seven built-in plants. S.garden.off lists the ones the user does not grow. S.garden.done marks a job done for that year.
// Job dates and reminder text live in core.js (gardenJobs) so the service worker can notify too.
const GARDEN_META = {
  lemon: { name: 'Lemon' },
  orange: { name: 'Orange' },
  mandarin: { name: 'Mandarin' },
  peach: { name: 'Golden Queen peach' },
  plum: { name: 'Plum' },
  strawberries: { name: 'Strawberries' },
  tomatoes: { name: 'Tomatoes' }
};
const GARDEN_COPY = {
  lemon: {
    intro: 'Full sun, free-draining soil, and out of the wind. It fruits most of the year. Yellow leaves in spring often want magnesium or a trace-element spray.',
    planting: 'Plant March to May while the soil is warm, or any time from March through November. Do not bury the graft.',
    feeding: 'Feed on the job dates below, and not from May through August.',
    care: 'Water deeply in dry spells while fruit is sizing. Mulch, but keep it off the trunk.'
  },
  orange: {
    intro: 'Same planting, feeding and watering as the lemon. Navel types are usually ready about June to September. Later varieties hold into summer. Taste one before you strip the tree.',
    planting: 'Plant March to May while the soil is warm, or any time from March through November. Full sun, free-draining soil, out of the wind. Do not bury the graft.',
    feeding: 'Same feeding as the lemon: on the job dates below, and not from May through August.',
    care: 'Water deeply in dry spells while fruit is sizing. Mulch, but keep it off the trunk.'
  },
  mandarin: {
    intro: 'Same planting, feeding and watering as the lemon. Easy-peel types are usually ready about June to August. Later types can hold into January. Taste one first, and do not leave an early type on the tree until it dries out.',
    planting: 'Plant March to May while the soil is warm, or any time from March through November. Full sun, free-draining soil, out of the wind. Do not bury the graft.',
    feeding: 'Same feeding as the lemon: on the job dates below, and not from May through August.',
    care: 'Water deeply in dry spells while fruit is sizing. Mulch, but keep it off the trunk.'
  },
  peach: {
    intro: 'Fruit is late, typically February into March here, when the shoulder turns deep gold and gives slightly. Good for bottling. It is a clingstone. Whangārei’s mild winter can mean a lighter crop.',
    planting: 'Plant June to August. Full sun, shelter, free-draining soil. Self-fertile, so one tree is enough. About 3 to 4 metres.',
    feeding: 'Feed in late August as the buds move, and again in March after harvest. Do not push nitrogen late in autumn.',
    care: 'Water from flowering through harvest. Uneven watering splits the fruit. Prune in late August as the buds swell, not in mid-winter, because silverleaf gets into winter cuts. Keep an open vase. Fruit grows on last year’s wood. Leaf curl is prevented, not cured: copper at leaf fall in May and again at bud swell in August before any green shows. A spray after the leaves are out does little. Rake up fallen leaves. Thin the fruit once they are marble sized. If it flowers and sets little fruit, a low-chill peach is the more reliable tree here.'
  },
  plum: {
    intro: 'Japanese plums such as Santa Rosa, Omega, Luisa and Billington suit Whangārei. European plums want a colder winter. Most need a second Japanese plum that flowers at the same time. European and Japanese plums do not pollinate each other.',
    planting: 'Plant June to August. Santa Rosa, Duff’s Early Jewel, Luisa and Hawera fruit on their own or close to it.',
    feeding: 'Feed in September and December.',
    care: 'Water in dry spells while fruit is sizing. Too much water near harvest splits them. Prune in late summer after harvest, not from March through July. Thin a heavy crop. Ripe when they soften on the tree, any time from December to March depending on the variety.'
  },
  strawberries: {
    intro: 'Winter planting often gives a bigger crop. Pick every couple of days once they colour. Replace the plants every 2 or 3 years.',
    planting: 'Plant June to November. Late August to October is the easy window. The crown sits just above the soil, about 30 cm apart.',
    feeding: 'Feed every 4 weeks from September through February. Too much nitrogen gives leaves instead of fruit.',
    care: 'Straw under the fruit. Net them once they flower or the birds will take them. Water at the base. Pick every couple of days once they colour, about November through February.'
  },
  tomatoes: {
    intro: 'Full sun. Cover them if a night looks like 4 degrees or under. Pick as they colour, roughly December through April.',
    planting: 'Sow in pots from August. Plant seedlings outside from early to mid-September through to January.',
    feeding: 'Once the first flowers open, feed every two weeks with a high-potash tomato food until the fruit is finishing (the reminders cover November through March).',
    care: 'Stake them, and pinch the side shoots on tall types. Water evenly. A dry spell followed by a soak splits the fruit.'
  }
};
function normGarden(g) {
  const ids = new Set(GARDEN_IDS);
  const src = g && typeof g === 'object' ? g : {};
  const off = [];
  (Array.isArray(src.off) ? src.off : []).forEach(id => { if (ids.has(id) && !off.includes(id)) off.push(id); });
  const done = {};
  const d = src.done && typeof src.done === 'object' && !Array.isArray(src.done) ? src.done : {};
  Object.keys(d).forEach(k => { if (d[k] === true && /^[a-z0-9-]{1,60}$/.test(k)) done[k] = true; });
  return { off, done };
}
const gardenGrowing = id => !S.garden.off.includes(id);
function gardenAhead(id) {
  const T = todayT();
  return gardenJobs(S, T, T + 400 * DAY).filter(j => !j.done && j.plants.includes(id) && j.days >= 0);
}
function gardenNextLine(id) {
  if (!gardenGrowing(id)) return 'Off';
  const n = gardenAhead(id)[0];
  return n ? n.title + ' · ' + fmt(n.date) : 'Nothing due soon';
}
function gardenYearJobs(id) {
  const y = +todayISO().slice(0, 4);
  return gardenJobs(S, parseD(y + '-01-01'), parseD(y + '-12-31')).filter(j => j.plants.includes(id));
}
function gardenCalItems(fromT, toT) {
  return gardenJobs(S, fromT, toT).filter(j => !j.done && j.days >= 0).map(j => ({
    src: 'garden', title: j.title, date: j.date, time: 'Garden', sort: '', tag: 'Garden', notes: j.body, go: `go('#garden/${j.go}')`
  }));
}
function gardenMoreSub() {
  const nOn = GARDEN_IDS.filter(gardenGrowing).length;
  if (!nOn) return 'All plants are off';
  const T = todayT(), n = gardenJobs(S, T, T + 400 * DAY).find(j => !j.done && j.days >= 0);
  return n ? `Next: ${n.title}, ${n.days === 0 ? 'today' : fmtW(n.date)}` : 'Planting and feeding reminders';
}
async function toggleGrow(id) {
  if (!GARDEN_IDS.includes(id)) return;
  const i = S.garden.off.indexOf(id);
  if (i >= 0) S.garden.off.splice(i, 1); else S.garden.off.push(id);
  await save(); render();
}
async function gardenDone(key) {
  if (!/^[a-z0-9-]{1,60}$/.test(key)) return;
  S.garden.done[key] = true;
  await save(); render();
  toast('Done for this year. It won’t remind you again until next year.');
}
function gardenSwitch(id) {
  const on = gardenGrowing(id);
  return `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="I grow this" onclick="toggleGrow('${id}')"></button>`;
}
function Garden() {
  const back = `<button class="back" onclick="go('#more')">${I('left')} More</button>`;
  return back + header('Gardening', 'Planting, feeding and spraying') +
    `<div class="callout green" id="gardennote">${I('info')}<div>Times are for Whangārei. A cold spring or a dry summer can move them by a couple of weeks. Reminders use the app’s existing notifications. Turn a plant off if you don’t grow it.</div></div>` +
    `<div id="gardenlist">${GARDEN_IDS.map(id => {
      const on = gardenGrowing(id);
      return `<div class="carcard gardencard" data-plant="${id}"><div class="carhead"><div class="carpic" style="background:var(--garden)">${I('leaf')}</div>
        <button class="tapzone" onclick="go('#garden/${id}')"><span class="carname">${esc(GARDEN_META[id].name)}</span><span class="carmodel">${esc(gardenNextLine(id))}</span></button>
        ${gardenSwitch(id)}</div></div>`;
    }).join('')}</div>` +
    `<div class="foot">A job only reminds you on the morning it is due.<br>${savedWhere()}</div>`;
}
function gardenJobRows(id) {
  const jobs = gardenYearJobs(id), today = todayISO();
  const upcoming = jobs.filter(j => !j.done && j.date >= today);
  const nextDate = upcoming.length ? upcoming[0].date : '';
  if (!jobs.length) return '<div class="card muted">No jobs this year.</div>';
  return `<div class="list" id="gardenjobs">${jobs.map(j => {
    const feedDue = gardenIsFeed(j) && !j.done && j.date <= today;
    const btn = (nextDate && j.date === nextDate) || feedDue ? `<button class="btn small" onclick="gardenDone('${j.key}')">Done for this year</button>` : '';
    const pillHtml = j.done ? '<span class="pill paid">Done</span>' : j.date < today ? '<span class="pill none">Passed</span>' : '';
    return `<div class="row gjob" data-job="${j.key}"><div class="tx"><div class="t">${esc(j.title)}</div><div class="s">${fmtW(j.date)}${j.body ? ' · ' + esc(j.body) : ''}</div></div>${pillHtml}${btn}</div>`;
  }).join('')}</div>`;
}
function GardenDetail(id) {
  const meta = GARDEN_META[id], copy = GARDEN_COPY[id];
  const back = `<button class="back" onclick="go('#garden')">${I('left')} Gardening</button>`;
  if (!meta) return back + empty('That plant isn’t here', 'It isn’t one of the plants built into the app.', '', '');
  const on = gardenGrowing(id);
  const block = (h, t) => `<div class="sec">${h}</div><div class="card"><div class="muted notes">${esc(t)}</div></div>`;
  return back +
    `<div class="hero"><div class="carpic" style="background:var(--garden)">${I('leaf')}</div><div style="min-width:0"><h2>${esc(meta.name)}</h2><div class="muted">${on ? 'I grow this' : 'Off'}</div></div></div>` +
    `<div class="list" style="margin-bottom:12px"><div class="srow"><div class="tx"><div class="t">I grow this</div><div class="s">${on ? 'Jobs and reminders are on.' : 'Jobs and reminders are hidden.'}</div></div>${gardenSwitch(id)}</div></div>` +
    `<div class="card" style="margin-bottom:4px"><div class="muted notes">${esc(copy.intro)}</div></div>` +
    block('Planting', copy.planting) + block('Feeding', copy.feeding) + block('Care', copy.care) +
    `<div class="sec">This year’s jobs</div>` +
    (on ? gardenJobRows(id) : '<div class="card muted">Jobs and reminders are hidden while this plant is off.</div>') +
    `<div class="card muted" style="margin-top:12px;font-size:0.84375rem">Reminders use the app’s existing notifications, on the morning of each job. Mark the next one done and it will not notify again until next year.</div>`;
}


/* ================= HEALTH (1.8.0, More › Health) ================= */
// S.health = [{ id, name, nhi, notes, items: [check-up], history: [{ id, itemId, kind, name, date, notes, cost, at }] }]
// check-up = { id, kind, name, clinic, phone, every, unit, last, due, apptDate, apptTime }. Due dates are worked out in core.js
// (careDue, the same maths as pet care), so the service worker can remind too. A booked appointment (today or later)
// stands in for the due date until it's ticked Done, so the same check-up never shows twice.
const { HEALTH_TYPES, healthAppts } = DD;
const HEALTH_ORDER = ['dentist', 'doctor', 'chiro', 'opto', 'hyg', 'physio', 'skin', 'flu', 'script'];
const HEALTH_ICON = { dentist: 'tooth', hyg: 'tooth', doctor: 'stetho', chiro: 'spine', physio: 'spine', opto: 'eye', skin: 'sun', flu: 'syringe', script: 'pill', custom: 'medkit' };
const HEALTH_PEOPLE = ['Shane', 'Sarah', 'Cass']; // quick-add chips only; nobody is added unless tapped
const NHI_RE = /^[A-HJ-NP-Z]{3}(\d{4}|\d{2}[A-HJ-NP-Z]{2})$/;
function normHealth(list) {
  return (Array.isArray(list) ? list : []).filter(p => p && typeof p === 'object' && p.id).map(p => {
    p.name = String(p.name || 'Person'); ['nhi', 'notes'].forEach(k => { if (typeof p[k] !== 'string') p[k] = ''; });
    p.items = (Array.isArray(p.items) ? p.items : []).filter(it => it && typeof it === 'object' && it.id).map(it => {
      it = Object.assign({ kind: 'custom', name: 'Check-up', clinic: '', phone: '', every: 0, unit: 'none', last: '', due: '', apptDate: '', apptTime: '' }, it);
      if (!HEALTH_TYPES[it.kind]) it.kind = 'custom';
      if (!['weeks', 'months', 'years', 'none'].includes(it.unit)) it.unit = 'none';
      ['name', 'clinic', 'phone', 'last', 'due', 'apptDate', 'apptTime'].forEach(k => { if (typeof it[k] !== 'string') it[k] = ''; });
      if (parseD(it.apptDate) == null) it.apptDate = '';
      if (!it.apptDate || !/^\d{2}:\d{2}$/.test(it.apptTime)) it.apptTime = '';
      return it;
    });
    p.history = (Array.isArray(p.history) ? p.history : []).filter(h => h && h.id && parseD(h.date) != null);
    return p;
  });
}
const getPerson = id => S.health.find(p => p.id === id);
const getHItem = (p, iid) => p && p.items.find(it => it.id === iid);
const showHealthCal = () => !S.settings || S.settings.healthCal !== false;
async function toggleHealthCal() { S.settings.healthCal = !showHealthCal(); await save(); render(); }
const isBooked = it => !!it.apptDate && it.apptDate >= todayISO();
const apptWhen = it => fmtW(it.apptDate) + (it.apptTime ? ' ' + fmtTime(it.apptTime) : '');
const hEvery = it => it.unit === 'none' || !(+it.every > 0) ? 'One-off' : careEvery(it);
const initials = n => esc(String(n).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?');
const hPic = p => `<div class="carpic hpic" aria-hidden="true">${initials(p.name)}</div>`;
// What's next for one person: booked appointments and due dates, soonest first
function healthNext(p) {
  const T = todayT();
  const bk = healthAppts({ health: [p] }, T, Infinity).map(a => ({ booked: true, item: a.item, date: a.date, time: a.time, days: daysLeft(a.date) }));
  const due = dueItems({ health: [p] }).map(x => ({ booked: false, item: x.item, date: x.date, time: '', days: x.days }));
  return bk.concat(due).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}
const bookedPill = d => `<span class="pill booked">${d === 0 ? 'Booked today' : d === 1 ? 'Booked tomorrow' : 'Booked'}</span>`;
function Health(arg, iid) {
  if (arg) return PersonDetail(arg, iid);
  const missing = HEALTH_PEOPLE.filter(n => !S.health.some(p => p.name.toLowerCase() === n.toLowerCase()));
  const chips = missing.length ? `<div class="chips hpeople">${missing.map(n => `<button class="chip" data-name="${n}" onclick="quickPerson('${n}')">${I('plus')} ${n}</button>`).join('')}</div>` : '';
  return header('Health', S.health.length ? plural(S.health.length, 'person', 'people') : 'Dentist, doctor, check-ups and more', addBtn('Add a person', 'personForm()')) +
    (S.health.length ? S.health.map(p => {
      const next = healthNext(p).slice(0, 3);
      return `<div class="carcard petcard hcard" role="button" tabindex="0" data-person="${p.id}" onclick="go('#health/${p.id}')"><div class="carhead">${hPic(p)}
        <div style="flex:1;min-width:0"><div class="carname">${esc(p.name)}</div><div class="carmodel">${p.items.length ? plural(p.items.length, 'check-up') : 'No check-ups yet'}</div></div>${I('right')}</div>
        ${next.length ? `<div class="petnext">${next.map(x => `<div><span class="pn">${esc(x.item.name)}</span><b>${x.booked ? apptWhen(x.item) : fmtW(x.date)}</b>${x.booked ? bookedPill(x.days) : pill(x.days)}</div>`).join('')}</div>`
          : `<div class="muted" style="margin-top:10px;font-size:0.875rem">${p.items.length ? 'No dates yet. Tap to add when things were last done.' : 'Tap to add a dentist, doctor or other check-up.'}</div>`}</div>`;
    }).join('') + (chips ? `<div class="muted" style="margin:14px 2px 6px;font-size:0.875rem">Quick add</div>${chips}` : '') + `<div class="btns"><button class="btn" onclick="personForm()">${I('plus')} Add ${S.health.length ? 'another person' : 'a person'}</button></div>`
      : `<div class="card empty"><div class="t">No one added yet</div><div class="s">Add each person, then their dentist, doctor, chiropractor and other check-ups. You’ll get a reminder when each one is due.</div>
        ${chips ? `<div class="s" style="margin-top:4px">Quick add:</div>${chips}` : ''}<button class="btn primary" style="flex:none;padding:12px 22px" onclick="personForm()">${I('plus')} Add a person</button></div>`) +
    `<div class="foot">Due check-ups and booked appointments show on Home and the Calendar.<br>${savedWhere()}</div>`;
}
let hHistAll = false;
function hRow(p, it) {
  const bk = isBooked(it), due = careDue(it), d = due ? daysLeft(due) : null;
  const bits = [it.clinic ? esc(it.clinic) : '', hEvery(it), it.last ? 'Last done ' + fmt(it.last) : 'Not done yet'].concat(it.due && !bk ? ['Date set by you'] : []).filter(Boolean);
  if (it.apptDate && !bk) bits.push(`Booked for ${fmtW(it.apptDate)}: tap Done if it happened`);
  const top = bk ? `<b class="duewhen">Booked ${apptWhen(it)}</b> ${bookedPill(daysLeft(it.apptDate))}`
    : due ? `<b class="duewhen">Due ${fmtW(due)}</b> ${pill(d)}` : `<span class="pill none">${it.last && it.unit === 'none' ? 'Done' : 'No date yet'}</span>`;
  return `<div class="row care hrow" data-item="${it.id}"><button class="tapzone" aria-label="Edit ${esc(it.name)}" onclick="hItemForm('${p.id}','${it.id}')"><div class="ic health">${I(HEALTH_ICON[it.kind] || 'medkit')}</div>
    <div class="tx"><div class="t">${esc(it.name)}</div><div class="s">${top}</div><div class="s">${bits.join(' · ')}</div></div></button>
    <div class="hbtns">${it.phone ? `<a class="iconbtn hcall" href="${telHref(it.phone)}" aria-label="Call ${esc(it.clinic || it.name)} on ${esc(it.phone)}">${I('call')}</a>` : ''}<button class="btn small" aria-label="Done: ${esc(it.name)}" onclick="hDoneForm('${p.id}','${it.id}')">${I('check')} Done</button></div></div>`;
}
function PersonDetail(id, iid) {
  const p = getPerson(id);
  if (!p) return `<button class="back" onclick="go('#health')">${I('left')} Health</button>` + empty('That person isn’t here any more', 'They may have been deleted.', '', '');
  const order = it => { if (isBooked(it)) return parseD(it.apptDate); const d = careDue(it); return d ? parseD(d) : Infinity; };
  const items = [...p.items].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
  const hist = [...p.history].sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0));
  const shown = hHistAll ? hist : hist.slice(0, 8);
  const have = new Set(p.items.map(it => it.kind));
  const quick = HEALTH_ORDER.filter(k => !have.has(k));
  if (iid) setTimeout(() => { const el = document.querySelector(`.hrow[data-item="${iid}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); } }, 30);
  return `<div style="display:flex;justify-content:space-between;align-items:center"><button class="back" onclick="go('#health')">${I('left')} Health</button>
    <button class="btn small" onclick="personForm('${p.id}')">${I('edit')} Edit</button></div>
  <div class="hero">${hPic(p)}<div style="min-width:0"><h2>${esc(p.name)}</h2><div class="muted">${p.items.length ? plural(p.items.length, 'check-up') : 'No check-ups yet'}${p.nhi ? `<br><span class="nhi">NHI number ${esc(p.nhi)}</span>` : ''}</div></div></div>
  ${p.notes ? `<div class="dcard hnotes"><div class="h">${I('doc')} Notes</div><div class="muted notes" style="margin-top:6px">${esc(p.notes)}</div></div>` : ''}
  <div class="sec">Check-ups <button onclick="hItemForm('${p.id}')">Add check-up</button></div>
  ${items.length ? `<div class="list" id="hlist">${items.map(it => hRow(p, it)).join('')}</div>` : `<div class="card muted" id="hnone" style="font-size:0.875rem">No check-ups yet. Tap one below to add it, or add your own.</div>`}
  ${quick.length ? `<div class="muted" style="margin:14px 2px 6px;font-size:0.875rem">${items.length ? 'Add another' : 'Quick add'}</div><div class="chips hquick">${quick.map(k => `<button class="chip" data-kind="${k}" onclick="hItemForm('${p.id}',null,'${k}')">${I('plus')} ${HEALTH_TYPES[k].name}</button>`).join('')}<button class="chip" data-kind="custom" onclick="hItemForm('${p.id}',null,'custom')">${I('plus')} Something else</button></div>` : ''}
  <div class="sec">History ${hist.length > 8 ? `<button onclick="hHistAll=!hHistAll;render()">${hHistAll ? 'Show less' : `Show all (${hist.length})`}</button>` : ''}</div>
  ${hist.length ? `<div class="list" id="hhist">${shown.map(h => `<button class="row hrowpet hrowh" data-hist="${h.id}" onclick="hHistForm('${p.id}','${h.id}')"><div class="tx"><div class="t">${esc(h.name)}</div>
      <div class="s">${fmtW(h.date)}${h.date.slice(0, 4) !== todayISO().slice(0, 4) ? ' ' + h.date.slice(0, 4) : ''}${h.notes ? ' · ' + esc(h.notes) : ''}</div></div>${h.cost !== '' && h.cost != null ? `<b class="cost">${money(h.cost)}</b>` : ''}</button>`).join('')}</div>`
    : `<div class="card muted" style="font-size:0.875rem">Nothing logged yet. Tap “Done” on a check-up and it’s saved here with the date and any notes.</div>`}
  <div class="card muted" style="margin-top:12px;font-size:0.84375rem">Reminders: 3 days before a check-up is due and on the day. For a booked appointment, the evening before at 7 pm and 2 hours before. Never between 9 pm and 7 am.</div>
  <div class="btns" style="margin-top:12px"><button class="btn danger" onclick="deletePerson('${p.id}')">${I('trash')} Delete ${esc(p.name)}</button></div>`;
}
async function quickPerson(name) {
  if (S.health.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
  const s = snap(), p = { id: uid('hp'), name, nhi: '', notes: '', items: [], history: [] };
  S.health.push(p); await save(); go('#health/' + p.id); toast(`${name} added. Now add their check-ups.`, 'Undo', undoTo(s));
}
function personForm(id) {
  const p = id ? getPerson(id) : { name: '', nhi: '', notes: '' };
  if (!p) return;
  const missing = id ? [] : HEALTH_PEOPLE.filter(n => !S.health.some(x => x.name.toLowerCase() === n.toLowerCase()));
  openSheet(id ? 'Edit person' : 'Add a person',
    (missing.length ? `<div class="chips hpeople">${missing.map(n => `<button type="button" class="chip" data-name="${n}">${n}</button>`).join('')}</div>` : '') +
    field('Name', inp('name', p.name, 'placeholder="e.g. Sarah" required maxlength="40"')) +
    field('NHI number (optional)', inp('nhi', p.nhi, 'placeholder="e.g. ABC1234" maxlength="9" autocapitalize="characters" autocomplete="off"'), 'The National Health Index number on prescriptions and hospital letters.') +
    field('Notes', area('notes', p.notes, 'Optional, e.g. allergies or medications')),
    async v => {
      if (!v.name) return 'Please type a name.';
      if (S.health.some(x => x !== p && x.name.toLowerCase() === v.name.toLowerCase())) return `${v.name} is already in Health.`;
      const nhi = v.nhi.replace(/\s+/g, '').toUpperCase();
      if (nhi && !NHI_RE.test(nhi)) return 'Please check the NHI number. It’s 3 letters then 4 numbers (like ABC1234), or 3 letters, 2 numbers and 2 letters.';
      const upd = { name: v.name, nhi, notes: v.notes };
      if (id) { const s = snap(); Object.assign(p, upd); await save(); render(); toast('Saved.', 'Undo', undoTo(s)); }
      else {
        const s = snap(); upd.id = uid('hp'); upd.items = []; upd.history = []; S.health.push(upd);
        await save(); toast(`${v.name} added. Now add their check-ups.`, 'Undo', undoTo(s));
        return () => go('#health/' + upd.id);
      }
    }, id ? 'Save' : 'Add person',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete person" onclick="deletePerson('${id}')">${I('trash')}</button>` : '');
  document.querySelectorAll('#sf .hpeople .chip').forEach(b => b.addEventListener('click', () => { $('#sf input[name=name]').value = b.dataset.name; }));
}
function deletePerson(id) {
  const p = getPerson(id); if (!p) return;
  confirmSheet(`Delete ${esc(p.name)}?`, `${esc(p.name)}’s check-ups, booked appointments and history will be removed from this phone.`, 'Delete person', async () => {
    const s = snap(); S.health = S.health.filter(x => x.id !== id); await save();
    return () => { go('#health'); toast(`${p.name} deleted.`, 'Undo', undoTo(s)); };
  });
}
function hItemForm(pid, iid, kind) {
  const p = getPerson(pid); if (!p) return;
  const k0 = kind || 'dentist', t0 = HEALTH_TYPES[k0];
  const it = iid ? getHItem(p, iid) : { kind: k0, name: t0 ? t0.name : '', clinic: '', phone: '', every: t0 ? t0.every : 1, unit: t0 ? t0.unit : 'years', last: '', due: '', apptDate: '', apptTime: '' };
  if (!it) return;
  // clinics already used (for the same kind first), so a second person at the same dentist is quick
  const clinics = []; S.health.forEach(x => x.items.forEach(y => { if (y.clinic && !clinics.some(c => c[0] === y.clinic)) clinics.push([y.clinic, y.phone, y.kind]); }));
  clinics.sort((a, b) => (b[2] === it.kind) - (a[2] === it.kind));
  const types = HEALTH_ORDER.map(k => [k, HEALTH_TYPES[k].name]).concat([['custom', 'Something else']]);
  openSheet(iid ? esc(it.name) : 'Add a check-up',
    `<div class="two">${field('Type', sel('kind', types, it.kind))}${field('Name', inp('name', it.name, 'placeholder="e.g. Blood test" required maxlength="40"'))}</div>` +
    `<div class="two">${field('Clinic', inp('clinic', it.clinic, 'list="hcliniclist" placeholder="Optional" maxlength="60"') + `<datalist id="hcliniclist">${clinics.map(c => `<option value="${esc(c[0])}">`).join('')}</datalist>`)}${field('Clinic phone', inp('phone', it.phone, 'type="tel" inputmode="tel" placeholder="Optional" maxlength="20"'))}</div>` +
    `<div class="two">${field('Repeat every', inp('every', it.unit === 'none' ? '' : it.every, 'type="number" inputmode="numeric" min="1" max="99"'))}${field('&nbsp;', sel('unit', UNITS, it.unit || 'none'))}</div>` +
    `<p class="muted" style="margin:-4px 2px 10px;font-size:0.84375rem" id="htypehint"></p>` +
    field('Last done', inp('last', it.last, 'type="date"')) + field('Next due (optional)', inp('due', it.due, 'type="date"')) +
    `<p class="muted" style="margin:-4px 2px 12px;font-size:0.84375rem" id="hhint"></p>` +
    field('Booked appointment (optional)', inp('apptDate', it.apptDate, 'type="date"')) +
    field('Appointment time', inp('apptTime', it.apptTime, 'type="time"'), 'Optional. The booking shows on the Calendar and is cleared when you tick Done.') +
    (it.apptDate ? `<div class="btns" style="margin:-4px 0 8px"><button type="button" class="btn small" id="hclearappt">${I('x')} Clear booking</button></div>` : ''),
    async v => {
      if (!v.name) return 'Please give it a name.';
      const unit = v.unit, every = Math.round(+v.every);
      if (unit !== 'none' && !(every >= 1 && every <= 99)) return 'Please choose how often, e.g. every 6 months, or pick “Doesn’t repeat”.';
      if (v.last && (!parseD(v.last) || v.last > todayISO())) return 'The last done date can’t be in the future.';
      if (v.due && !parseD(v.due)) return 'Please check the next due date.';
      if (v.phone && digits(v.phone).length < 6) return 'Please check the clinic’s phone number.';
      if (v.apptTime && !v.apptDate) return 'Please choose the appointment date as well as the time.';
      if (v.apptDate && !parseD(v.apptDate)) return 'Please check the appointment date.';
      const s = snap(), upd = { kind: v.kind, name: v.name, clinic: v.clinic, phone: v.phone, every: unit === 'none' ? 0 : every, unit, last: v.last, due: v.due, apptDate: v.apptDate, apptTime: v.apptDate ? v.apptTime : '' };
      if (iid) Object.assign(it, upd); else p.items.push(Object.assign({ id: uid('hi') }, upd));
      await save(); render(); toast(iid ? 'Saved.' : `${v.name} added.`, 'Undo', undoTo(s));
    }, iid ? 'Save' : 'Add',
    iid ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete check-up" onclick="deleteHItem('${pid}','${iid}')">${I('trash')}</button>` : '');
  const f = $('#sf'); let nameTouched = !!iid;
  const upd = () => {
    const x = { kind: f.kind.value, every: +f.every.value, unit: f.unit.value, last: f.last.value, due: f.due.value }, d = careDue(x), t = HEALTH_TYPES[x.kind];
    $('#htypehint').textContent = (t && t.note) || (x.unit === 'none' ? 'A one-off: set a due date or book an appointment, and tick Done when it’s sorted.' : '');
    $('#hhint').textContent = x.due ? `Next due ${fmtLong(x.due)} (the date you set).` : d ? `Next due ${fmtLong(d)}, worked out from the last date. Or set a date yourself.` : x.unit === 'none' ? '' : 'Add the date it was last done and we’ll work out when it’s next due, or set the next due date.';
  };
  f.name.addEventListener('input', () => { nameTouched = true; });
  f.kind.addEventListener('change', () => {
    const t = HEALTH_TYPES[f.kind.value];
    if (t) { if (!nameTouched || Object.values(HEALTH_TYPES).some(y => y.name === f.name.value)) f.name.value = t.name; f.unit.value = t.unit; f.every.value = t.unit === 'none' ? '' : t.every; }
    else if (!nameTouched || Object.values(HEALTH_TYPES).some(y => y.name === f.name.value)) { f.name.value = ''; f.name.focus(); }
    const c = clinics.find(c => c[2] === f.kind.value); if (c && !f.clinic.value) { f.clinic.value = c[0]; if (!f.phone.value) f.phone.value = c[1] || ''; }
    upd();
  });
  f.clinic.addEventListener('change', () => { const c = clinics.find(c => c[0] === f.clinic.value); if (c && c[1] && !f.phone.value) f.phone.value = c[1]; });
  const cb = $('#hclearappt'); if (cb) cb.addEventListener('click', () => { f.apptDate.value = ''; f.apptTime.value = ''; f.apptDate.dispatchEvent(new Event('change')); cb.parentNode.remove(); });
  if (!iid && kind === 'custom') setTimeout(() => f.name.focus(), 50);
  if (!iid && kind && kind !== 'custom') { const c = clinics.find(c => c[2] === kind); if (c) { f.clinic.value = c[0]; f.phone.value = c[1] || ''; } }
  f.querySelectorAll('input,select').forEach(x => { x.addEventListener('input', upd); x.addEventListener('change', upd); }); upd();
}
async function deleteHItem(pid, iid) {
  const p = getPerson(pid), it = getHItem(p, iid), s = snap();
  p.items = p.items.filter(x => x.id !== iid); await save(); await closeSheet(); render(); toast(`${it.name} removed.`, 'Undo', undoTo(s));
}
function hDoneForm(pid, iid) {
  const p = getPerson(pid), it = getHItem(p, iid); if (!it) return;
  openSheet(`Done: ${esc(it.name)}`,
    `<div class="two">${field('Done on', inp('date', it.apptDate && it.apptDate <= todayISO() ? it.apptDate : todayISO(), 'type="date" required'))}${field('Cost ($)', inp('cost', '', 'inputmode="decimal" placeholder="Optional"'))}</div>` +
    field('Notes', area('notes', '', 'Optional, e.g. what they said, or what’s next')) +
    `<p class="muted" style="margin:0 2px 4px;font-size:0.84375rem" id="donehint"></p>`,
    async v => {
      if (!parseD(v.date)) return 'Please choose the date it was done.';
      if (v.date > todayISO()) return 'The date can’t be in the future.';
      const cost = parseMoney(v.cost); if (Number.isNaN(cost)) return 'Please type the cost as a number, like 45.90.';
      const s = snap(), had = !!it.apptDate;
      p.history.push({ id: uid('hh'), itemId: it.id, kind: it.kind, name: it.name, date: v.date, notes: v.notes, cost, at: Date.now() });
      if (!it.last || v.date >= it.last) { it.last = v.date; it.due = ''; }
      it.apptDate = ''; it.apptTime = '';
      await save(); render();
      const nd = careDue(it);
      toast(`${it.name} done.${nd ? ' Next due ' + fmtW(nd) + '.' : ''}${had ? ' Booking cleared.' : ''}`, 'Undo', undoTo(s));
    }, 'Save');
  const upd = () => {
    const d = $('#sf input[name=date]').value, n = parseD(d) ? careNextAfter(it, d) : '';
    $('#donehint').textContent = (n ? `Next due: ${fmtLong(n)}.` : it.unit === 'none' ? 'This one doesn’t repeat.' : '') + (it.apptDate ? ` The booking for ${apptWhen(it)} will be cleared.` : '');
  };
  $('#sf input[name=date]').addEventListener('input', upd); $('#sf input[name=date]').addEventListener('change', upd); upd();
}
function syncHLast(p, itemId) {
  const it = getHItem(p, itemId); if (!it) return;
  const l = p.history.filter(h => h.itemId === itemId).map(h => h.date).sort().pop();
  if (l) it.last = l;
}
function hHistForm(pid, hid) {
  const p = getPerson(pid), h = p && p.history.find(x => x.id === hid); if (!h) return;
  openSheet(esc(h.name),
    `<div class="two">${field('Done on', inp('date', h.date, 'type="date" required'))}${field('Cost ($)', inp('cost', h.cost === '' || h.cost == null ? '' : Number(h.cost).toFixed(2), 'inputmode="decimal" placeholder="Optional"'))}</div>` +
    field('Notes', area('notes', h.notes, 'Optional')),
    async v => {
      if (!parseD(v.date)) return 'Please choose the date it was done.';
      if (v.date > todayISO()) return 'The date can’t be in the future.';
      const cost = parseMoney(v.cost); if (Number.isNaN(cost)) return 'Please type the cost as a number, like 45.90.';
      const s = snap(); Object.assign(h, { date: v.date, notes: v.notes, cost }); syncHLast(p, h.itemId);
      await save(); render(); toast('History updated.', 'Undo', undoTo(s));
    }, 'Save',
    `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete history entry" onclick="hDeleteHist('${pid}','${hid}')">${I('trash')}</button>`);
}
async function hDeleteHist(pid, hid) {
  const p = getPerson(pid), s = snap(), h = p.history.find(x => x.id === hid);
  p.history = p.history.filter(x => x.id !== hid); syncHLast(p, h.itemId);
  await save(); await closeSheet(); render(); toast('Entry deleted.', 'Undo', undoTo(s));
}
function healthCalItems(fromT, toT, inR) {
  if (!showHealthCal()) return [];
  const bk = healthAppts(S, fromT, toT).map(a => ({ src: 'health', title: a.title, date: a.date, time: a.time ? fmtTime(a.time) : 'All day', sort: a.time || '00:00', tag: 'Health', notes: a.item.clinic, go: `go('#health/${a.person.id}/${a.item.id}')` }));
  const due = dueItems({ health: S.health }).filter(x => inR(x.date)).map(x => ({ src: 'health', title: x.title + ' due', date: x.date, time: 'Due', sort: '', tag: 'Health', notes: [x.item.clinic, hEvery(x.item)].filter(Boolean).join(' · '), go: `go('${x.go}')` }));
  return bk.concat(due);
}
function healthMoreSub() {
  if (!S.health.length) return 'Dentist, doctor, check-ups…';
  const n = S.health.flatMap(p => healthNext(p).map(x => Object.assign({ p }, x))).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];
  if (!n) return plural(S.health.length, 'person', 'people');
  const title = esc(n.p.name + ' – ' + n.item.name);
  if (n.booked) return `Next: ${title}, ${n.days === 0 ? 'today' : n.days === 1 ? 'tomorrow' : fmtW(n.date)}${n.time ? ' ' + fmtTime(n.time) : ''}`;
  return `Next: ${title} due, ${n.days < 0 ? 'overdue' : n.days === 0 ? 'today' : fmtW(n.date)}`;
}

/* ================= COMMISSION (1.7.0) ================= */
// Pay fortnights run Monday to the Sunday 13 days later, lined up on a Monday Shane picks (S.commission.anchor).
// Amounts are kept in whole cents so totals never pick up rounding errors. Adjustments (clawbacks) are stored as minus amounts.
const { isMonday, lastMonday, fortnightOf, commSum, taxYearOf, centsMoney, parseCents } = DD;
let commShowAll = false;
const commOpenSet = new Set();
function normComm(c) {
  c = c && typeof c === 'object' ? c : {};
  const entries = (Array.isArray(c.entries) ? c.entries : []).filter(e => e && parseD(e.date) != null && Number.isFinite(+e.cents) && Math.round(+e.cents) !== 0)
    .map(e => ({ id: e.id || uid('comm'), date: e.date, cents: Math.round(+e.cents), note: String(e.note || '').slice(0, 80) }));
  return { anchor: isMonday(c.anchor) ? c.anchor : '', entries, remind: c.remind === true };
}
const CM = () => S.commission;
const yesterdayISO = () => addDays(todayISO(), -1);
const commRange = f => `${fmtW(f.start)} – ${fmtW(f.end)}`;
const curFortnight = () => fortnightOf(CM().anchor, todayISO());
const commDay = iso => CM().entries.filter(e => e.date === iso);
function commEntryLine(e) {
  const adj = e.cents < 0;
  return `<button class="centry" data-id="${e.id}" onclick="commForm('${e.id}')" aria-label="Edit ${adj ? 'adjustment' : 'commission'} ${esc(centsMoney(e.cents))} on ${fmtW(e.date)}">
    <span class="cn">${adj ? '<span class="tag adj">Adjustment</span> ' : ''}${e.note ? esc(e.note) : `<span class="muted">${adj ? 'No note' : 'Commission'}</span>`}</span>
    <span class="ca${adj ? ' neg' : ''}">${centsMoney(e.cents)}</span></button>`;
}
function commDayRow(iso, T) {
  const list = commDay(iso), future = iso > T, tot = list.reduce((n, e) => n + e.cents, 0);
  const cls = ['cday', iso === T ? 'today' : '', future ? 'future' : '', list.length ? '' : 'none'].join(' ').trim();
  const add = future ? '' : list.length ? `<button class="cplus" aria-label="Add another for ${fmtW(iso)}" onclick="commForm(null,'${iso}')">${I('plus')}</button>`
    : `<button class="cadd" aria-label="Add commission for ${fmtW(iso)}" onclick="commForm(null,'${iso}')">${I('plus')} Add</button>`;
  return `<div class="${cls}" data-date="${iso}"><div class="cdh"><span class="dn">${fmtW(iso)}</span>${iso === T ? '<span class="tag due">Today</span>' : ''}
    ${list.length > 1 ? `<span class="dt">Day total <b>${centsMoney(tot)}</b></span>` : '<span class="dt"></span>'}${add}</div>
    ${list.map(commEntryLine).join('')}</div>`;
}
function anchorPicker(cur) {
  const m0 = lastMonday(), m1 = addDays(m0, -7), T = todayISO();
  const pick = cur ? fortnightOf(cur, T).start : m0;
  const other = pick !== m0 && pick !== m1;
  return `<div class="seg anchorseg" data-seg="anchor">${[[m0, 'most recent'], [m1, 'the week before']].map(([v, l]) => `<button type="button" class="${!other && pick === v ? 'on' : ''}" data-v="${v}">${fmtW(v)}<small>${l}${v === m0 ? ' · suggested' : ''}</small></button>`).join('')}</div>
    <input type="hidden" name="anchor" value="${pick}">
    <label class="field" style="margin-top:12px"><span>Or another Monday</span><input type="date" name="anchorother" value="${other ? pick : ''}" max="${T}" step="7" min="2000-01-03"></label>
    <div class="anchorhint" id="anchorhint"></div>`;
}
function anchorCheck(v) {
  if (!parseD(v)) return 'Please pick the Monday your pay fortnight started.';
  if (!isMonday(v)) return `${fmtW(v)} is a ${WDL[new Date(parseD(v)).getUTCDay()]}. Please pick a Monday.`;
  if (v > todayISO()) return 'Please pick a Monday that’s today or earlier.';
  return '';
}
function wireAnchor(root) {
  const box = root.querySelector('[data-seg="anchor"]'), hid = root.querySelector('input[name=anchor]'), oth = root.querySelector('input[name=anchorother]'), hint = root.querySelector('#anchorhint');
  const upd = () => {
    const err = anchorCheck(hid.value), f = err ? null : fortnightOf(hid.value, todayISO());
    hint.innerHTML = err ? `<span class="bad">${esc(err)}</span>` : `This pay fortnight: <b>${commRange(f)}</b><br>Next one starts ${fmtW(addDays(f.end, 1))}.`;
  };
  box.querySelectorAll('button').forEach(b => b.onclick = () => { box.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); hid.value = b.dataset.v; oth.value = ''; oth.dispatchEvent(new Event('change')); upd(); });
  const onOther = () => { if (!oth.value) return; box.querySelectorAll('button').forEach(x => x.classList.remove('on')); hid.value = oth.value; upd(); };
  oth.addEventListener('input', onOther); oth.addEventListener('change', onOther);
  upd();
}
async function setAnchor(v, fromSetup) {
  const err = anchorCheck(v); if (err) return err;
  const s = snap(), was = CM().anchor;
  CM().anchor = v; await save(); render();
  const f = curFortnight();
  if (fromSetup) toast(`Set. This pay fortnight is ${commRange(f)}.`);
  else if (was !== v) toast(`Fortnights now start ${fmtW(f.start)}. Entries regrouped – nothing lost.`, 'Undo', undoTo(s));
  return '';
}
async function commSetupGo() {
  const root = $('#commsetup'), err = await setAnchor(root.querySelector('input[name=anchor]').value, true);
  if (err) { const x = root.querySelector('#anchorhint'); x.innerHTML = `<span class="bad">${esc(err)}</span>`; }
}
function anchorForm() {
  openSheet('When does your pay fortnight start?', `<p class="muted" style="margin:0 0 12px">Pick the Monday your current pay fortnight started. Your entries are just regrouped – nothing is lost.</p>` + anchorPicker(CM().anchor),
    async v => { const err = anchorCheck(v.anchor); if (err) return err; return () => setAnchor(v.anchor, !CM().anchor); }, 'Save');
  wireAnchor($('#sf'));
}
function commShort(c) { const a = Math.abs(c), s = c < 0 ? '−' : ''; return a >= 100000 ? s + '$' + (a / 100000).toFixed(a >= 1000000 ? 0 : 1).replace(/\.0$/, '') + 'k' : s + '$' + Math.round(a / 100); }
function commChart() {
  const c = CM(), cur = curFortnight(), bars = [];
  for (let i = 7; i >= 0; i--) { const st = addDays(cur.start, -14 * i), en = addDays(st, 13); bars.push({ st, en, v: commSum(c.entries, st, en), now: i === 0 }); }
  const max = Math.max(1, ...bars.map(b => b.v)), W = 320, top = 20, base = 122, bw = 26, step = W / 8;
  const g = bars.map((b, i) => {
    const x = i * step + (step - bw) / 2, h = b.v > 0 ? Math.max(3, Math.round(b.v / max * (base - top))) : 0;
    return `<g class="bar${b.now ? ' now' : ''}" data-start="${b.st}" data-total="${b.v}"><rect x="${x.toFixed(1)}" y="${base - h}" width="${bw}" height="${h}" rx="4"></rect>
      <text class="v" x="${(x + bw / 2).toFixed(1)}" y="${base - h - 5}">${b.v ? commShort(b.v) : '$0'}</text>
      <text class="d" x="${(x + bw / 2).toFixed(1)}" y="${base + 14}">${b.now ? 'Now' : fmtW(b.st).replace(/^\w+ /, '').replace(/ \d{4}$/, '')}</text></g>`;
  }).join('');
  const label = 'Fortnight totals: ' + bars.map(b => `${b.now ? 'this fortnight' : 'from ' + fmtW(b.st)} ${centsMoney(b.v)}`).join(', ');
  const first = c.entries.length ? fortnightOf(c.anchor, c.entries.reduce((m, e) => e.date < m ? e.date : m, '9999')).start : null;
  const done = bars.filter(b => !b.now && first && b.st >= first), avg = done.length ? Math.round(done.reduce((n, b) => n + b.v, 0) / done.length) : null;
  return `<div class="card commchartcard"><svg class="commchart" viewBox="0 0 ${W} 142" role="img" aria-label="${esc(label)}"><line x1="0" x2="${W}" y1="${base + .5}" y2="${base + .5}"></line>${g}</svg>
    <div class="muted" style="text-align:center;font-size:0.78125rem">Each bar is one pay fortnight, labelled with its Monday.${avg != null ? ` Average of the finished ones: <b>${centsMoney(avg)}</b>.` : ''}</div></div>`;
}
function commPast() {
  const c = CM(), cur = curFortnight();
  if (!c.entries.length) return '<div class="card muted">Past fortnights will show here with their totals.</div>';
  const first = fortnightOf(c.anchor, c.entries.reduce((m, e) => e.date < m ? e.date : m, '9999'));
  const out = [];
  for (let st = addDays(cur.start, -14); st >= first.start; st = addDays(st, -14)) out.push({ start: st, end: addDays(st, 13) });
  if (!out.length) return '<div class="card muted">Past fortnights will show here with their totals.</div>';
  const shown = commShowAll ? out : out.slice(0, 13);
  return `<div class="list pastlist">${shown.map(f => {
    const es = c.entries.filter(e => e.date >= f.start && e.date <= f.end).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0), tot = es.reduce((n, e) => n + e.cents, 0);
    const days = [...new Set(es.map(e => e.date))];
    return `<details class="pastf" data-start="${f.start}" ${commOpenSet.has(f.start) ? 'open' : ''} ontoggle="this.open?commOpenSet.add('${f.start}'):commOpenSet.delete('${f.start}')">
      <summary><span class="pr">${commRange(f)}<small>${es.length ? plural(es.length, 'entry', 'entries') : 'No entries'}</small></span><b class="pt${tot < 0 ? ' neg' : ''}">${es.length ? centsMoney(tot) : '–'}</b></summary>
      <div class="pastdays">${days.length ? days.map(d => commDayRow(d, todayISO())).join('') : '<div class="muted" style="padding:6px 2px 12px">Nothing entered for this fortnight.</div>'}</div></details>`;
  }).join('')}</div>${out.length > shown.length ? `<div class="btns"><button class="btn" onclick="commShowAll=true;render()">Show all ${out.length} past fortnights</button></div>` : ''}`;
}
function commRemindCard() {
  const c = CM();
  if (c.remind) return '';
  return `<div class="card commremind"><div class="tx"><b>Want a reminder?</b><div class="muted">A nudge at 9 am the next morning – “Enter yesterday’s commission?” – only if nothing’s been entered for that day.</div></div>
    <button class="btn small" onclick="toggleCommRemind()">${I('bell')} Turn on</button></div>`;
}
function Commission(arg) {
  const back = `<button class="back" onclick="go('#more')">${I('left')} More</button>`, c = CM(), T = todayISO();
  if (!c.anchor) {
    return back + header('Commission', 'Paid fortnightly · Mon to Sun') +
      `<div class="card" id="commsetup"><div class="t" style="font-weight:750;font-size:1.0625rem">When did your current pay fortnight start?</div>
      <p class="muted" style="margin:6px 0 14px">Each pay fortnight runs Monday to the Sunday 13 days later. Pick the Monday this one started and every fortnight lines up from there. You can change it later.</p>
      ${anchorPicker('')}
      <div class="btns"><button class="btn primary" id="commstart" onclick="commSetupGo()">Start tracking</button></div></div>
      <div class="foot">Enter each day’s commission the day after you earn it.<br>${savedWhere()}</div>`;
  }
  const f = curFortnight(), tot = commSum(c.entries, f.start, f.end), n = c.entries.filter(e => e.date >= f.start && e.date <= f.end).length;
  const dl = daysLeft(f.end), y = yesterdayISO(), yHas = commDay(y).length;
  const week = (w) => { const st = addDays(f.start, 7 * w), en = addDays(st, 6), wt = commSum(c.entries, st, en), days = []; for (let i = 0; i < 7; i++) days.push(addDays(st, i));
    return `<div class="sec"><span>Week ${w + 1} · ${fmtW(st).replace(/ \d{4}$/, '')} – ${fmtW(en)}</span>${wt ? `<span class="wk${wt < 0 ? ' neg' : ''}">${centsMoney(wt)}</span>` : ''}</div>
      <div class="list cdays">${days.map(d => commDayRow(d, T)).join('')}</div>`; };
  const mo = T.slice(0, 7), yr = T.slice(0, 4), tx = taxYearOf(T);
  const mTot = commSum(c.entries, mo + '-01', mo + '-31'), yTot = commSum(c.entries, yr + '-01-01', yr + '-12-31'), tTot = commSum(c.entries, tx.start, tx.end);
  return back + header('Commission', 'Paid fortnightly · Mon to Sun', addBtn('Add commission', `commForm(null,'${y}')`)) +
    `<div class="summary commsum"><div class="muted">This pay fortnight</div><div class="crange">${commRange(f)}</div>
      <div class="amt" id="commtotal">${centsMoney(tot)}</div>
      <div class="muted">${dl <= 0 ? 'Last day today' : `${dl + 1} days left, counting today`} · ${plural(n, 'entry', 'entries')}</div></div>
    <div class="btns"><button class="btn primary" id="addyest" onclick="commForm(null,'${y}')">${I('plus')} Add yesterday <span class="soft">(${fmtW(y)})</span></button></div>
    ${yHas ? `<div class="muted" style="margin:6px 4px 0">${I('check')} Yesterday is entered. Tap a day below to add to another day.</div>` : ''}
    ${commRemindCard()}
    ${week(0)}${week(1)}
    <div class="muted fnote">Fortnights start on Mondays, lined up with ${fmtW(f.start)}. <button class="linkbtn" onclick="anchorForm()">Change</button></div>
    <div class="sec">Totals</div>
    <div class="list"><div class="srow"><div class="tx"><div class="t">This month</div><div class="s">${MONL[+mo.slice(5) - 1]} ${yr}</div></div><b class="v" id="commmonth">${centsMoney(mTot)}</b></div>
      <div class="srow"><div class="tx"><div class="t">This year</div><div class="s">1 Jan – 31 Dec ${yr}</div></div><b class="v" id="commyear">${centsMoney(yTot)}</b></div>
      <div class="srow"><div class="tx"><div class="t">NZ tax year ${tx.label}</div><div class="s">1 Apr ${tx.start.slice(0, 4)} – 31 Mar ${tx.end.slice(0, 4)}</div></div><b class="v" id="commtax">${centsMoney(tTot)}</b></div></div>
    <div class="muted" style="margin:6px 4px 0;font-size:0.78125rem">Totals go by the day the commission was earned. Adjustments are taken off.</div>
    <div class="sec">Last 8 fortnights</div>${commChart()}
    <div class="sec">Past fortnights</div>${commPast()}
    ${c.remind ? `<div class="foot">Reminder on: 9 am if yesterday is blank. <button class="linkbtn" onclick="toggleCommRemind()">Turn off</button></div>` : ''}
    <div class="foot">${savedWhere()}</div>`;
}
function commForm(id, date) {
  const e = id ? CM().entries.find(x => x.id === id) : { date: date || yesterdayISO(), cents: '', note: '' };
  if (!e) return;
  const T = todayISO(), adj = id && e.cents < 0;
  openSheet(id ? (adj ? 'Edit adjustment' : 'Edit commission') : 'Add commission',
    field('Day earned', inp('date', e.date, `type="date" max="${T}" required`)) +
    `<div class="field"><span>Type</span>${segHtml('kind', [['comm', 'Commission'], ['adj', 'Adjustment (minus)']], adj ? 'adj' : 'comm')}<small id="kindhint">${adj ? 'Taken off the total, e.g. a clawback or a correction.' : 'Money you earned that day.'}</small></div>` +
    field('Amount (NZD)', `<div class="moneyin"><span>$</span><input name="amount" inputmode="decimal" placeholder="0.00" autocomplete="off" value="${e.cents === '' ? '' : (Math.abs(e.cents) / 100).toFixed(2)}" aria-label="Amount in dollars"></div>`) +
    field('Note (optional)', inp('note', e.note, 'maxlength="80" placeholder="e.g. the sale or customer"')),
    async v => {
      if (!parseD(v.date)) return 'Please choose the day you earned it.';
      if (v.date > todayISO()) return 'That day is in the future. Commission can only be entered for today or earlier.';
      if (/-/.test(v.amount)) return 'Please type the amount without a minus sign. For a clawback, choose “Adjustment (minus)”.';
      const c = parseCents(v.amount);
      if (c == null) return 'Please type the amount in dollars and cents, like 120 or 85.50.';
      if (c === 0) return 'The amount can’t be $0.00.';
      if (c > 100000000) return 'That amount looks too big. Please check it.';
      const s = snap(), upd = { date: v.date, cents: v.kind === 'adj' ? -c : c, note: v.note.slice(0, 80) };
      if (id) Object.assign(e, upd); else CM().entries.push(Object.assign({ id: uid('comm') }, upd));
      await save(); render();
      const f = curFortnight(), other = v.date < f.start ? ` It’s in the fortnight ${commRange(fortnightOf(CM().anchor, v.date))}.` : '';
      toast(id ? (upd.cents < 0 ? 'Adjustment updated.' : 'Commission updated.') + other : `${upd.cents < 0 ? 'Adjustment of ' + centsMoney(upd.cents) : 'Added ' + centsMoney(upd.cents)} for ${fmtW(v.date)}.${other}`, 'Undo', undoTo(s));
    }, id ? 'Save' : 'Add',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete this entry" onclick="deleteComm('${id}')">${I('trash')}</button>` : '');
  wireSeg('kind', k => { $('#kindhint').textContent = k === 'adj' ? 'Taken off the total, e.g. a clawback or a correction.' : 'Money you earned that day.'; });
}
async function deleteComm(id) {
  const e = CM().entries.find(x => x.id === id); if (!e) return;
  const s = snap(); CM().entries = CM().entries.filter(x => x.id !== id);
  await save(); await closeSheet(); render();
  toast(`Deleted ${centsMoney(e.cents)} for ${fmtW(e.date)}.`, 'Undo', undoTo(s));
}
async function toggleCommRemind() {
  const c = CM();
  if (c.remind) { c.remind = false; await save(); render(); toast('Commission reminder off.'); return; }
  if (!('Notification' in window)) { toast('This browser can’t show notifications.'); return; }
  let p = Notification.permission;
  if (p !== 'granted') p = await Notification.requestPermission();
  if (p !== 'granted') { toast(p === 'denied' ? 'Notifications are blocked. You can allow them in Chrome’s site settings.' : 'Please allow notifications to get the reminder.'); render(); return; }
  c.remind = true; if (S.settings.reminders === false) S.settings.reminders = true;
  await save(); requestPersist(); await setupBackground(); render();
  toast('Reminder on. You’ll get a nudge at 9 am if yesterday is blank.');
}
function commMoreSub() {
  if (!CM().anchor) return 'Track commission by pay fortnight';
  const f = curFortnight();
  return `This fortnight: <b>${centsMoney(commSum(CM().entries, f.start, f.end))}</b> · ${fmt(f.start)} – ${fmt(f.end)}`;
}

/* ================= LOANS (1.10.0, More › Loans) ================= */
// Money Shane has borrowed, e.g. an interest-free loan from Mum. S.loans = [{ id, from, note, cents, startPaid, date, planCents, planFreq, payments: [{ id, date, cents, note, at }] }]
// All amounts are whole cents. Owed = borrowed − already paid back (before tracking) − payments, never below $0. No interest.
// A loan is paid off when nothing is owed; the paid-off date is the date of the latest payment.
const LOAN_FREQ = [['week', 'Weekly', 'a week', 'weekly'], ['fortnight', 'Fortnightly', 'a fortnight', 'fortnightly'], ['month', 'Monthly', 'a month', 'monthly']];
const MAX_CENTS = 100000000;
let loanDoneOpen = false;
function normLoans(list) {
  const c = v => Number.isFinite(+v) && +v > 0 ? Math.min(Math.round(+v), MAX_CENTS) : 0;
  return (Array.isArray(list) ? list : []).filter(l => l && typeof l === 'object' && l.id && c(l.cents) > 0).map(l => ({
    id: String(l.id), from: String(l.from || 'Loan').slice(0, 40), note: String(l.note || '').slice(0, 80), cents: c(l.cents),
    startPaid: Math.min(c(l.startPaid), c(l.cents)), date: parseD(l.date) != null ? l.date : todayISO(),
    planCents: c(l.planCents), planFreq: LOAN_FREQ.some(f => f[0] === l.planFreq) ? l.planFreq : 'fortnight',
    payments: (Array.isArray(l.payments) ? l.payments : []).filter(p => p && parseD(p.date) != null && c(p.cents) > 0)
      .map(p => ({ id: String(p.id || uid('lp')), date: p.date, cents: c(p.cents), note: String(p.note || '').slice(0, 80), at: +p.at || 0 }))
  }));
}
const getLoan = id => S.loans.find(l => l.id === id);
const loanPaysSorted = l => l.payments.map((p, i) => [p, i]).sort(([a, i], [b, j]) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0) || j - i).map(x => x[0]); // newest first; same day: the one entered last first
function loanCalc(l) {
  const paid = l.startPaid + l.payments.reduce((n, p) => n + p.cents, 0), owed = Math.max(0, l.cents - paid);
  const pct = owed === 0 ? 100 : Math.min(99, Math.floor(Math.min(paid, l.cents) / l.cents * 100));
  const last = l.payments.reduce((m, p) => p.date > m ? p.date : m, '');
  return { paid, owed, pct, done: owed === 0, doneDate: owed === 0 ? (last || l.date) : '', last };
}
const loanStep = (iso, f, k) => f === 'week' ? addDays(iso, 7 * k) : f === 'fortnight' ? addDays(iso, 14 * k) : addMonths(iso, k);
// Repayment plan: how many payments are left and roughly when the last one lands (the next one is one step after the latest
// payment, or today if that's already gone by)
function loanPlan(l) {
  const k = loanCalc(l); if (!l.planCents || k.done) return null;
  const n = Math.ceil(k.owed / l.planCents), lastAmt = k.owed - (n - 1) * l.planCents;
  let next = loanStep(k.last || l.date, l.planFreq, 1); if (next < todayISO()) next = todayISO();
  return { n, lastAmt, next, end: loanStep(next, l.planFreq, n - 1), per: LOAN_FREQ.find(f => f[0] === l.planFreq)[2] };
}
const loanPlanText = (l, p) => `At ${centsMoney(l.planCents)} ${p.per}, paid off around ${fmtW(p.end)}`;
const loanBar = (pct, label) => `<div class="lbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(label)}"><i style="width:${pct}%"></i></div>`;
const loanActive = () => S.loans.filter(l => !loanCalc(l).done);
function loanCard(l) {
  const k = loanCalc(l), p = loanPlan(l);
  return `<div class="carcard loancard" role="button" tabindex="0" data-loan="${l.id}" onclick="go('#loan/${l.id}')">
    <div class="carhead"><div class="carpic loanpic">${I('coins')}</div>
      <div style="flex:1;min-width:0"><div class="carname">${esc(l.from)}</div><div class="carmodel">${[l.note ? esc(l.note) : '', 'Borrowed ' + fmt(l.date)].filter(Boolean).join(' · ')}</div></div>${I('right')}</div>
    <div class="lowed"><small>Still owed</small><b class="lamt">${centsMoney(k.owed)}</b></div>
    ${loanBar(k.pct, `${k.pct}% paid back`)}
    <div class="lstats"><span>Borrowed <b>${centsMoney(l.cents)}</b></span><span>Paid <b>${centsMoney(k.paid)}</b></span><span class="lpct">${k.pct}% paid</span></div>
    ${p ? `<div class="lplan">${I('repeat')} ${loanPlanText(l, p)}</div>` : ''}
    <div class="btns"><button class="btn primary lpaybtn" onclick="event.stopPropagation();payForm('${l.id}')">${I('plus')} Record payment</button></div></div>`;
}
function Loans() {
  const back = `<button class="back" onclick="go('#more')">${I('left')} More</button>`;
  const act = loanActive(), done = S.loans.filter(l => loanCalc(l).done).sort((a, b) => loanCalc(b).doneDate.localeCompare(loanCalc(a).doneDate));
  const total = act.reduce((n, l) => n + loanCalc(l).owed, 0);
  const sub = act.length ? `${plural(act.length, 'loan')} being paid back` : S.loans.length ? 'All paid off' : 'Money you’ve borrowed';
  if (!S.loans.length) return back + header('Loans', sub, addBtn('Add a loan', 'loanForm()')) +
    empty('No loans yet', 'Keep track of money you’ve borrowed, like an interest-free loan from family. Add how much you borrowed, record each payment as you make it, and you’ll always know how much you still owe.', 'Add a loan', 'loanForm()') +
    `<div class="foot">${savedWhere()}</div>`;
  return back + header('Loans', sub, addBtn('Add a loan', 'loanForm()')) +
    (act.length > 1 ? `<div class="summary loansum"><div class="muted">Total owed</div><div class="amt" id="loantotal">${centsMoney(total)}</div><div class="muted">Across ${plural(act.length, 'loan')}</div></div>` : '') +
    (act.length ? `<div id="loanlist">${act.map(loanCard).join('')}</div>` : `<div class="card muted" style="margin-bottom:12px">${I('check')} Nothing owed. Every loan is paid off.</div>`) +
    (done.length ? `<details class="list pastf loansdone" id="loansdone" ${loanDoneOpen ? 'open' : ''} ontoggle="loanDoneOpen=this.open">
      <summary><span class="pr">Paid off<small>${plural(done.length, 'loan')}</small></span></summary>
      ${done.map(l => { const k = loanCalc(l); return `<button class="row" data-loan="${l.id}" onclick="go('#loan/${l.id}')"><div class="ic loan">${I('check')}</div>
        <div class="tx"><div class="t">${esc(l.from)}${l.note ? ` <span class="muted">· ${esc(l.note)}</span>` : ''}</div><div class="s">Paid off ${fmtW(k.doneDate)} · ${centsMoney(l.cents)} borrowed</div></div>${I('right')}</button>`; }).join('')}</details>` : '') +
    `<div class="btns" style="margin-top:12px"><button class="btn" onclick="loanForm()">${I('plus')} Add a loan</button></div>
    <div class="foot">Interest free: what you owe only goes down when you record a payment.<br>${savedWhere()}</div>`;
}
const centsIn = c => c ? (c / 100).toFixed(2) : '';
const moneyField = (label, name, cents, ph = '0.00', hint = '') => field(label, `<div class="moneyin"><span>$</span><input name="${name}" inputmode="decimal" placeholder="${ph}" autocomplete="off" value="${centsIn(cents)}" aria-label="${esc(label.replace(/<[^>]+>/g, ''))}"></div>`, hint);
function loanForm(id) {
  const l = id ? getLoan(id) : { from: '', note: '', cents: 0, startPaid: 0, date: todayISO(), planCents: 0, planFreq: 'fortnight', payments: [] };
  if (!l) return;
  const T = todayISO();
  openSheet(id ? 'Edit loan' : 'Add a loan',
    field('Who it’s from', inp('from', l.from, 'placeholder="e.g. Mum" required maxlength="40" autocapitalize="words"')) +
    field('Note (optional)', inp('note', l.note, 'maxlength="80" placeholder="e.g. Car deposit"')) +
    moneyField('Amount borrowed (NZD)', 'amount', l.cents) +
    field('Date borrowed', inp('date', l.date, `type="date" max="${T}" required`)) +
    moneyField('Already paid back (optional)', 'startpaid', l.startPaid, '0.00', 'Only if you’d paid some back before you started tracking it here.') +
    `<div class="subhead" style="margin-top:4px">Repayment plan (optional)</div>
    <div>${moneyField('Regular amount (NZD)', 'plan', l.planCents, 'e.g. 50')}</div><div class="field"><span>How often</span>${segHtml('freq', LOAN_FREQ.map(f => [f[0], f[1]]), l.planFreq)}</div>
    <p class="muted" style="margin:-4px 2px 6px;font-size:0.8125rem">Interest free, so there’s no interest to add. Leave the plan blank if there isn’t one.</p>`,
    async v => {
      if (!v.from) return 'Please say who the loan is from, e.g. Mum.';
      const cents = parseCents(v.amount);
      if (cents == null) return 'Please type the amount borrowed in dollars and cents, like 2000 or 1250.50.';
      if (cents === 0) return 'The amount borrowed can’t be $0.00.';
      if (cents > MAX_CENTS) return 'That amount looks too big. Please check it.';
      if (!parseD(v.date)) return 'Please choose the date you borrowed it.';
      if (v.date > todayISO()) return 'The date borrowed can’t be in the future.';
      const startPaid = v.startpaid ? parseCents(v.startpaid) : 0;
      if (startPaid == null) return 'Please type the amount already paid back in dollars and cents, or leave it blank.';
      if (startPaid > cents) return 'Already paid back can’t be more than the amount borrowed.';
      const pays = l.payments.reduce((n, p) => n + p.cents, 0);
      if (startPaid + pays > cents) return `The amount borrowed can’t be less than what’s been paid back so far (${centsMoney(startPaid + pays)}).`;
      const planCents = v.plan ? parseCents(v.plan) : 0;
      if (planCents == null || (v.plan && planCents === 0)) return 'Please type the regular amount in dollars and cents, like 50, or leave it blank.';
      if (v.date > (l.payments.reduce((m, p) => p.date < m ? p.date : m, '9999'))) return 'There’s a payment before that date. Please check the date borrowed.';
      const s = snap(), upd = { from: v.from.slice(0, 40), note: v.note.slice(0, 80), cents, startPaid, date: v.date, planCents, planFreq: v.freq };
      if (id) { Object.assign(l, upd); await save(); render(); toast('Loan updated.', 'Undo', undoTo(s)); return; }
      const nl = Object.assign({ id: uid('loan'), payments: [] }, upd); S.loans.push(nl); await save();
      toast(`Loan from ${nl.from} added. You owe ${centsMoney(loanCalc(nl).owed)}.`, 'Undo', undoTo(s));
      return () => go('#loan/' + nl.id);
    }, id ? 'Save' : 'Add loan',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete loan" onclick="deleteLoan('${id}')">${I('trash')}</button>` : '');
  wireSeg('freq');
}
function deleteLoan(id) {
  const l = getLoan(id); if (!l) return;
  confirmSheet(`Delete the loan from ${esc(l.from)}?`, `The loan and ${plural(l.payments.length, 'payment')} will be removed from this phone.`, 'Delete loan', async () => {
    const s = snap(); S.loans = S.loans.filter(x => x.id !== id); await save();
    return () => { go('#loans'); toast(`Loan from ${l.from} deleted.`, 'Undo', undoTo(s)); };
  });
}
function loansMoreSub() {
  if (!S.loans.length) return 'Money you’ve borrowed, and what’s left to pay';
  const act = loanActive();
  if (!act.length) return 'All paid off';
  return `You owe <b>${centsMoney(act.reduce((n, l) => n + loanCalc(l).owed, 0))}</b>${act.length > 1 ? ' · ' + plural(act.length, 'loan') : ' to ' + esc(act[0].from)}`;
}
function LoanDetail(id) {
  const l = getLoan(id);
  if (!l) return `<button class="back" onclick="go('#loans')">${I('left')} Loans</button>` + empty('That loan isn’t here any more', 'It may have been deleted.', '', '');
  const k = loanCalc(l), p = loanPlan(l), pays = loanPaysSorted(l);
  const planCard = k.done ? '' : p
    ? `<div class="dcard" id="loanplan"><div class="h">${I('repeat')} Repayment plan</div>
        <div class="big" style="font-size:1.125rem">${loanPlanText(l, p)}</div>
        <div class="muted">${plural(p.n, 'payment')} left${p.n > 1 && p.lastAmt !== l.planCents ? `, the last one ${centsMoney(p.lastAmt)}` : ''}. Next one around ${fmtW(p.next)}.</div>
        <div class="btns"><button class="btn small" onclick="planForm('${l.id}')">${I('edit')} Change plan</button></div></div>`
    : `<div class="dcard" id="loanplan"><div class="h">${I('repeat')} Repayment plan <span class="pill none">Not set</span></div>
        <div class="muted" style="margin-top:6px">Paying back a set amount regularly? Add it to see roughly when the loan will be paid off.</div>
        <div class="btns"><button class="btn" onclick="planForm('${l.id}')">${I('plus')} Set a plan</button></div></div>`;
  return `<div style="display:flex;justify-content:space-between;align-items:center"><button class="back" onclick="go('#loans')">${I('left')} Loans</button>
    <button class="btn small" onclick="loanForm('${l.id}')">${I('edit')} Edit</button></div>
  <div class="hero"><div class="carpic loanpic">${I('coins')}</div><div style="min-width:0"><h2>${esc(l.from)}</h2><div class="muted">${[l.note ? esc(l.note) : '', 'Borrowed ' + fmtY(l.date), 'Interest free'].filter(Boolean).join(' · ')}</div></div></div>
  <div class="summary loandet" id="loansummary">${k.done
      ? `<div class="muted">${I('check')} Paid off</div><div class="amt">${centsMoney(0)}</div><div class="muted" id="paidoffon">Paid off ${fmtLong(k.doneDate)}</div>`
      : `<div class="muted">Still owed</div><div class="amt" id="loanowed">${centsMoney(k.owed)}</div><div class="muted">of ${centsMoney(l.cents)} borrowed</div>`}
    ${loanBar(k.pct, `${k.pct}% paid back`)}
    <div class="lsumrow"><span>Paid <b id="loanpaid">${centsMoney(k.paid)}</b></span><span><b>${k.pct}%</b> paid</span></div></div>
  ${k.done ? `<div class="callout green">${I('check')}<div><b>All paid back.</b> Nice work. It’s been moved to Paid off on the Loans list.</div></div>`
      : `<div class="btns" style="margin:0 0 12px"><button class="btn primary xl" id="recordpay" onclick="payForm('${l.id}')">${I('plus')} Record payment</button></div>`}
  ${planCard}
  <div class="sec">Payments ${pays.length ? `<span class="wk">${plural(pays.length, 'payment')}</span>` : ''}</div>
  ${pays.length || l.startPaid ? `<div class="list" id="loanpays">${pays.map(x => `<button class="row lpay" data-pay="${x.id}" onclick="payForm('${l.id}','${x.id}')" aria-label="Edit payment of ${esc(centsMoney(x.cents))} on ${fmtW(x.date)}">
      <div class="tx"><div class="t">${fmtW(x.date)}</div>${x.note ? `<div class="s">${esc(x.note)}</div>` : ''}</div><b class="lpa">${centsMoney(x.cents)}</b></button>`).join('')}
      ${l.startPaid ? `<button class="row lpay start" onclick="loanForm('${l.id}')"><div class="tx"><div class="t">Paid back before tracking</div><div class="s">Set when the loan was added. Tap to change.</div></div><b class="lpa">${centsMoney(l.startPaid)}</b></button>` : ''}</div>`
    : `<div class="card muted" style="font-size:0.875rem">No payments yet. Tap “Record payment” each time you pay some back.</div>`}
  <div class="btns" style="margin-top:16px"><button class="btn danger" onclick="deleteLoan('${l.id}')">${I('trash')} Delete loan</button></div>
  <div class="foot">${savedWhere()}</div>`;
}
function payForm(loanId, pid) {
  const l = getLoan(loanId); if (!l) return;
  const x = pid ? l.payments.find(p => p.id === pid) : { date: todayISO(), cents: 0, note: '' };
  if (!x) return;
  const k = loanCalc(l), room = k.owed + (pid ? x.cents : 0), T = todayISO();
  const quick = pid ? '' : [l.planCents && l.planCents < room ? [l.planCents, `${centsMoney(l.planCents)} (plan)`] : null, [room, `All of it (${centsMoney(room)})`]].filter(Boolean);
  openSheet(pid ? 'Edit payment' : 'Record payment',
    `<p class="muted" style="margin:-4px 2px 12px">To ${esc(l.from)} · ${centsMoney(k.owed)} still owed</p>` +
    moneyField('Amount paid (NZD)', 'amount', x.cents) +
    (quick ? `<div class="chips lquick">${quick.map(([c, t]) => `<button type="button" class="chip" data-cents="${c}">${t}</button>`).join('')}</div>` : '') +
    field('Date paid', inp('date', x.date, `type="date" min="${l.date}" max="${T}" required`)) +
    field('Note (optional)', inp('note', x.note, 'maxlength="80" placeholder="e.g. Bank transfer"')),
    async v => {
      const c = parseCents(v.amount);
      if (c == null) return 'Please type the amount in dollars and cents, like 200 or 85.50.';
      if (c === 0) return 'The amount can’t be $0.00.';
      if (c > room) return `That’s more than the ${centsMoney(room)} still owed. Please check the amount.`;
      if (!parseD(v.date)) return 'Please choose the date you paid it.';
      if (v.date > todayISO()) return 'The date paid can’t be in the future.';
      if (v.date < l.date) return `That’s before the loan was borrowed (${fmtY(l.date)}). Please check the date.`;
      const s = snap(), upd = { date: v.date, cents: c, note: v.note.slice(0, 80) };
      if (pid) Object.assign(x, upd); else l.payments.push(Object.assign({ id: uid('lp'), at: Date.now() }, upd));
      await save(); render();
      const nk = loanCalc(l);
      toast(nk.done ? `That’s the loan from ${l.from} paid off. Well done!` : pid ? `Payment updated. You owe ${centsMoney(nk.owed)}.` : `Payment of ${centsMoney(c)} recorded. You owe ${centsMoney(nk.owed)}.`, 'Undo', undoTo(s));
    }, pid ? 'Save' : 'Save payment',
    pid ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete this payment" onclick="deletePayment('${loanId}','${pid}')">${I('trash')}</button>` : '');
  document.querySelectorAll('#sf .lquick .chip').forEach(b => b.onclick = () => { $('#sf input[name=amount]').value = (+b.dataset.cents / 100).toFixed(2); });
}
async function deletePayment(loanId, pid) {
  const l = getLoan(loanId), x = l && l.payments.find(p => p.id === pid); if (!x) return;
  const s = snap(); l.payments = l.payments.filter(p => p.id !== pid);
  await save(); await closeSheet(); render();
  toast(`Deleted the payment of ${centsMoney(x.cents)}. You owe ${centsMoney(loanCalc(l).owed)}.`, 'Undo', undoTo(s));
}
function planForm(loanId) {
  const l = getLoan(loanId); if (!l) return;
  openSheet('Repayment plan',
    `<p class="muted" style="margin:-4px 2px 12px">How much you plan to pay back, and how often. It’s just for working out when the loan will be paid off – there are no reminders.</p>` +
    moneyField('Regular amount (NZD)', 'plan', l.planCents, 'e.g. 50') +
    `<div class="field"><span>How often</span>${segHtml('freq', LOAN_FREQ.map(f => [f[0], f[1]]), l.planFreq)}</div>
    <p class="muted" id="planhint" style="margin:0 2px 4px;font-size:0.875rem;min-height:20px"></p>`,
    async v => {
      const c = parseCents(v.plan);
      if (c == null || c === 0) return 'Please type the regular amount in dollars and cents, like 50.';
      const s = snap(); l.planCents = c; l.planFreq = v.freq; await save(); render();
      toast('Repayment plan saved.', 'Undo', undoTo(s));
    }, 'Save plan',
    l.planCents ? `<button type="button" class="btn danger" style="flex:0 0 auto" onclick="removePlan('${loanId}')">Remove</button>` : '');
  const hint = () => {
    const c = parseCents($('#sf input[name=plan]').value), f = $('#sf input[name=freq]').value;
    const p = c ? loanPlan(Object.assign({}, l, { planCents: c, planFreq: f })) : null;
    $('#planhint').textContent = p ? `${loanPlanText({ planCents: c }, p)} (${plural(p.n, 'payment')} left).` : '';
  };
  wireSeg('freq'); document.querySelectorAll('#sf [data-seg=freq] button').forEach(b => b.addEventListener('click', hint)); $('#sf input[name=plan]').addEventListener('input', hint); hint();
}
async function removePlan(loanId) {
  const l = getLoan(loanId), s = snap(); l.planCents = 0; await save(); await closeSheet(); render(); toast('Repayment plan removed.', 'Undo', undoTo(s));
}

/* ================= APPEARANCE: colour themes (v1.9.0, Settings › Appearance) ================= */
// The colours live in CSS variables (index.html); a theme just sets html[data-theme]. The choice is in S.settings
// (so it's in backups) and copied to localStorage so the inline script in index.html can apply it before first paint.
// [key, name, note, brand, background, card, ink, browser bar colour]
const THEMES = [
  ['teal', 'Teal', 'Standard', '#0F766E', '#F4F6F5', '#FFFFFF', '#15201D', '#0F766E'],
  ['blue', 'Blue', '', '#1D5FBF', '#F3F5F9', '#FFFFFF', '#15201D', '#1D5FBF'],
  ['green', 'Green', '', '#2E7D32', '#F3F6F2', '#FFFFFF', '#15201D', '#2E7D32'],
  ['purple', 'Purple', '', '#6D3FC4', '#F6F4FA', '#FFFFFF', '#15201D', '#6D3FC4'],
  ['orange', 'Orange', '', '#B4530A', '#F8F5F2', '#FFFFFF', '#15201D', '#B4530A'],
  ['dark', 'Dark', 'Easy on the eyes at night', '#3CC4B3', '#0E1412', '#18201E', '#E8EEEC', '#0E1412']
];
const themeKey = () => { const t = S && S.settings && S.settings.theme; return THEMES.some(x => x[0] === t) ? t : 'teal'; };
const phoneDark = () => { try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } };
// Match phone: Dark when the phone is in dark mode, otherwise the chosen light theme (Teal if Dark was chosen)
function effectiveTheme() {
  const t = themeKey();
  if (!S || !S.settings || !S.settings.themeAuto) return t;
  return phoneDark() ? 'dark' : t === 'dark' ? 'teal' : t;
}
function applyTheme() {
  const t = effectiveTheme(), root = document.documentElement;
  if (t === 'teal') root.removeAttribute('data-theme'); else if (root.getAttribute('data-theme') !== t) root.setAttribute('data-theme', t);
  const th = THEMES.find(x => x[0] === t), m = document.querySelector('meta[name="theme-color"]');
  if (m && m.content !== th[7]) m.content = th[7];
  try { localStorage.setItem('theme', JSON.stringify({ t: themeKey(), auto: !!(S.settings && S.settings.themeAuto) })); } catch (e) { }
}
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S && S.settings.themeAuto) { applyTheme(); render(); } }); } catch (e) { }
async function setTheme(k) {
  if (!THEMES.some(x => x[0] === k)) return;
  const s = snap(); S.settings.theme = k; applyTheme(); await save(); render();
  const th = THEMES.find(x => x[0] === k);
  toast(`${th[1]} theme on.${S.settings.themeAuto && (k === 'dark' ? !phoneDark() : phoneDark()) ? ' Match phone is on, so you’ll see it when the phone is in ' + (k === 'dark' ? 'dark' : 'light') + ' mode.' : ''}`, 'Undo', undoTo(s));
}
async function toggleThemeAuto() { S.settings.themeAuto = !S.settings.themeAuto; applyTheme(); await save(); render(); }
function themePicker() {
  const cur = themeKey();
  return `<div class="themes" id="themepicker" role="radiogroup" aria-label="Colour theme">${THEMES.map(([k, name, note, brand, bg, card, ink]) =>
    `<button class="theme ${k === cur ? 'on' : ''}" role="radio" aria-checked="${k === cur}" data-theme-key="${k}" aria-label="${name} theme${note ? ' (' + note.toLowerCase() + ')' : ''}" onclick="setTheme('${k}')">
      <span class="tprev" style="background:${bg}"><span class="tbar" style="background:${k === 'dark' ? card : brand}"></span><span class="tcard" style="background:${card}"><i style="background:${brand}"></i><i style="background:${ink};opacity:.35"></i></span><span class="tbtn" style="background:${brand}"></span></span>
      <span class="tname">${k === cur ? I('check') : ''}${name}</span></button>`).join('')}</div>`;
}

/* Text size (v1.21.0). Stored as S.settings.textSize (sm, md, lg, xl, xxl) and copied to localStorage
   so the inline script in index.html can set the class before first paint. Missing or unknown = Normal. */
const TEXT_SIZES = [['sm', 'Small', 'text-sm'], ['md', 'Normal', ''], ['lg', 'Large', 'text-lg'], ['xl', 'Extra large', 'text-xl'], ['xxl', 'Huge', 'text-xxl']];
const TEXT_SIZE_CLASSES = ['text-sm', 'text-lg', 'text-xl', 'text-xxl'];
const textSizeKey = () => { const t = S && S.settings && S.settings.textSize; return TEXT_SIZES.some(x => x[0] === t) ? t : 'md'; };
function applyTextSize() {
  const k = textSizeKey(), root = document.documentElement, cls = TEXT_SIZES.find(x => x[0] === k)[2];
  TEXT_SIZE_CLASSES.forEach(c => { if (c !== cls) root.classList.remove(c); });
  if (cls) root.classList.add(cls);
  try { localStorage.setItem('textSize', k); } catch (e) { }
}
async function setTextSize(k) {
  if (!TEXT_SIZES.some(x => x[0] === k)) return;
  S.settings.textSize = k; applyTextSize(); await save(); render();
}
function textSizePicker() {
  const cur = textSizeKey(), name = TEXT_SIZES.find(x => x[0] === cur)[1];
  return `<div class="list" id="textsize" style="margin-top:10px"><div class="srow" style="flex-wrap:wrap"><div class="tx" style="flex-basis:100%"><div class="t">Text size</div><div class="s">${name}</div></div>
    <div class="seg" id="textsizepick" role="group" aria-label="Text size" style="width:100%">${TEXT_SIZES.map(([k, label]) => `<button type="button" class="${k === cur ? 'on' : ''}" aria-pressed="${k === cur}" onclick="setTextSize('${k}')">${label}</button>`).join('')}</div></div></div>`;
}


/* ================= REMINDERS (1.27.0, repeat in 1.28.0) ================= */
// A title plus a date and time in Pacific/Auckland, and whether it repeats.
// The list stays on this phone. The relay sends the push at that minute, including evenings
// and weekends (not held until 7 am). Daily, weekly and monthly stay in the list after they fire.
const REM_REPEAT_OPTS = [['none', 'Does not repeat'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
const REM_REPEAT_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
function remRepeat(r) { return r && REM_REPEAT_LABEL[r.repeat] ? r.repeat : 'none'; }
function normReminders(list) {
  if (!Array.isArray(list)) return [];
  const out = [], seen = new Set();
  for (const r of list) {
    if (!r || typeof r !== 'object') continue;
    const title = String(r.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const date = String(r.date || ''), time = String(r.time || '');
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) continue;
    let id = String(r.id || '');
    if (!/^rem-[a-z0-9]{4,32}$/i.test(id)) id = uid('rem');
    if (seen.has(id)) continue;
    seen.add(id);
    const repeat = remRepeat(r);
    out.push(repeat === 'none' ? { id, title, date, time, repeat: 'none' } : { id, title, date, time, repeat });
    if (out.length >= 40) break;
  }
  return out;
}
function nzStampLocal(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
const remKey = r => r.date + 'T' + r.time;
// Next date this reminder fires, in Pacific/Auckland. The stored date is the anchor the user picked
// (so a monthly 31st stays the 31st). Shorter months use the last day, then the 31st returns.
function remNextDate(r, now = new Date()) {
  const repeat = remRepeat(r);
  if (repeat === 'none') return r.date;
  const nowK = nzStampLocal(now);
  const dom = Number(r.date.slice(8, 10));
  let date = r.date;
  if (date + 'T' + r.time < nowK) {
    const today = nowK.slice(0, 10);
    if (repeat === 'daily') date = addDays(today, -1);
    else if (repeat === 'weekly') {
      const want = new Date(parseD(r.date)).getUTCDay();
      let d = today;
      for (let i = 0; i < 7; i++) {
        if (new Date(parseD(d)).getUTCDay() === want) { date = addDays(d, -7); break; }
        d = addDays(d, -1);
      }
    } else date = addMonths(today, -1, dom);
    if (date < r.date) date = r.date;
  }
  for (let i = 0; i < 50; i++) {
    if (date + 'T' + r.time >= nowK) return date;
    const n = repeat === 'daily' ? addDays(date, 1) : repeat === 'weekly' ? addDays(date, 7) : addMonths(date, 1, dom);
    if (!n || n <= date) break;
    date = n;
  }
  return date;
}
function remWhenKey(r, now) { return (remRepeat(r) === 'none' ? r.date : remNextDate(r, now)) + 'T' + r.time; }
function upcomingReminders(now) {
  const k = nzStampLocal(now);
  return (S.reminders || []).filter(r => remRepeat(r) !== 'none' || remKey(r) >= k).sort((a, b) => remWhenKey(a, now).localeCompare(remWhenKey(b, now)));
}
function remindersMoreSub() {
  const n = upcomingReminders();
  if (!n.length) return 'None set';
  const r = n[0], when = remRepeat(r) === 'none' ? r.date : remNextDate(r);
  const tag = REM_REPEAT_LABEL[r.repeat];
  return `Next: ${esc(r.title)}, ${fmtW(when)} ${fmtTime(r.time)}${tag ? ' · ' + tag : ''}`;
}
function remPermCard() {
  if (!pushOK()) return `<div class="card muted">This phone or browser can’t get push notifications. On Android, open the app from its icon (installed from Chrome).</div>`;
  if (Notification.permission === 'granted') return '';
  const denied = Notification.permission === 'denied';
  if (denied) return `<div class="card muted">Notifications are blocked for this app. Allow them in the phone’s settings for this app, then come back here.</div>`;
  return `<div class="callout green">${I('bell')}<div style="flex:1"><b>Allow notifications</b><br>Reminders can only alert you if notifications are allowed.
    <div class="btns" style="margin-top:8px"><button class="btn primary small" onclick="enableReminderPush()">Allow notifications</button></div></div></div>`;
}
function Reminders() {
  const back = `<button class="back" onclick="go('#more')">${I('left')} More</button>`;
  const nowK = nzStampLocal();
  const up = upcomingReminders(), past = (S.reminders || []).filter(r => remRepeat(r) === 'none' && remKey(r) < nowK).sort((a, b) => remKey(b).localeCompare(remKey(a)));
  const row = r => {
    const repeat = remRepeat(r), when = repeat === 'none' ? r.date : remNextDate(r), tag = REM_REPEAT_LABEL[repeat];
    return `<button class="row" onclick="remForm('${r.id}')"><div class="ic rem">${I('bell')}</div><div class="tx"><div class="t">${esc(r.title)}</div><div class="s">${fmtW(when)} · ${fmtTime(r.time)}${tag ? ' · ' + tag : ''}</div></div>${I('right')}</button>`;
  };
  const list = (S.reminders || []).length
    ? `<div class="list" id="remlist">${up.map(row).join('')}${past.map(row).join('')}</div>`
    : `<p class="muted" id="remempty">No reminders yet.</p>`;
  return back + header('Reminders', 'Once, or every day, week or month', addBtn('Add a reminder', 'remForm()')) + remPermCard() + list +
    `<div class="foot">Times are New Zealand time. With notifications on, it still arrives if the app is closed.</div>`;
}
function undoRem(s) {
  return async () => {
    const had = !!S.settings.remOnRelay;
    S = JSON.parse(s);
    if (had) S.settings.remOnRelay = true; // so a cancelled add or edit is cleared on the relay too
    await save(); await scheduleReminders(); render();
  };
}
async function scheduleReminders() {
  if (!S || !pushOK() || !RELAY_URL) return 'unsupported';
  if (Notification.permission !== 'granted') return 'need';
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    const k = nzStampLocal();
    const reminders = (S.reminders || []).filter(r => remRepeat(r) !== 'none' || remKey(r) >= k).map(r => ({ id: r.id, title: r.title, date: r.date, time: r.time, repeat: remRepeat(r) }));
    if (!sub) {
      if (!reminders.length && !S.settings.remOnRelay) return '';
      if (!reminders.length) { /* still clear the relay below once we have a subscription */ }
      else sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() });
    }
    if (!sub) return reminders.length ? 'fail' : '';
    if (!reminders.length && !S.settings.remOnRelay) return '';
    await pushPost('/push/reminders', { subscription: sub.toJSON(), reminders });
    const on = reminders.length > 0;
    if (!!S.settings.remOnRelay !== on) { S.settings.remOnRelay = on; await save(); }
    return '';
  } catch (e) { return 'fail'; }
}
async function enableReminderPush() {
  if (!pushOK()) { toast('This phone or browser can’t get push notifications. On Android, open the app from its icon (installed from Chrome).'); return; }
  let p = Notification.permission;
  if (p !== 'granted') p = await Notification.requestPermission();
  if (p !== 'granted') { toast(p === 'denied' ? 'Notifications are blocked. You can allow them in the phone’s settings for this app.' : 'Notifications weren’t allowed.'); render(); return; }
  const sync = await scheduleReminders();
  render();
  toast(sync === 'fail' ? 'Notifications are allowed, but the alert couldn’t be set just now.' : 'Notifications are on. You’ll be alerted at the time you set, even if the app is closed.');
}
function remHintText(r) {
  const repeat = remRepeat(r);
  if (!parseD(r.date) || !/^\d{2}:\d{2}$/.test(r.time || '')) return '';
  const when = fmtW(remNextDate(r)) + ' at ' + fmtTime(r.time);
  if (repeat === 'none') return 'One notification, at that time.';
  if (repeat === 'daily') return 'Every day at ' + fmtTime(r.time) + '. Next: ' + when + '.';
  if (repeat === 'weekly') return 'Every ' + fmtLong(r.date).split(' ')[0] + ' at ' + fmtTime(r.time) + '. Next: ' + when + '.';
  const dom = Number(r.date.slice(8, 10));
  const tail = dom >= 29 ? ', or the last day of a shorter month' : '';
  return 'Every month on the ' + ordinal(dom) + tail + '. Next: ' + when + '.';
}
function remHintLive() {
  const f = $('#sf'), hint = $('#rephint');
  if (!f || !hint || !f.date) return;
  hint.textContent = remHintText({ date: f.date.value, time: f.time.value, repeat: f.repeat ? f.repeat.value : 'none' });
}
function remForm(id) {
  const e = id ? (S.reminders || []).find(x => x.id === id) : { title: '', date: nzStampLocal().slice(0, 10), time: '', repeat: 'none' };
  if (!e) return;
  const repeat = remRepeat(e);
  openSheet(id ? 'Edit reminder' : 'Add a reminder',
    field('Title', inp('title', e.title, 'required maxlength="80" placeholder="What to remember"')) +
    `<div class="two">${field('Date', inp('date', e.date, 'type="date" required'))}${field('Time', inp('time', e.time, 'type="time" required'))}</div>` +
    field('Repeats', sel('repeat', REM_REPEAT_OPTS, repeat)) +
    `<p class="muted" id="rephint" style="margin:0 2px 8px;font-size:0.8125rem">${esc(remHintText(e))}</p>`,
    async v => {
      const title = String(v.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!title) return 'Please type what to remember.';
      if (!parseD(v.date)) return 'Please choose a date.';
      if (!/^\d{2}:\d{2}$/.test(v.time || '')) return 'Please choose a time.';
      const repeat = remRepeat({ repeat: v.repeat });
      if (repeat === 'none' && v.date + 'T' + v.time < nzStampLocal()) return 'That time has already passed.';
      if (pushOK() && Notification.permission === 'default') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') { /* saved anyway; the section keeps asking */ }
      }
      const snapS = snap();
      const upd = { title, date: v.date, time: v.time, repeat };
      if (id) Object.assign(e, upd); else S.reminders.push(Object.assign({ id: uid('rem') }, upd));
      await save();
      const sync = await scheduleReminders();
      render();
      const again = repeat === 'daily' ? 'every day' : repeat === 'weekly' ? 'every week' : repeat === 'monthly' ? 'every month' : '';
      const extra = sync === 'fail' ? ' Saved on this phone. The notification will be set when you next open the app online.'
        : (sync === 'need' || sync === 'unsupported') ? ' Allow notifications to be alerted at that time.'
        : again ? ' You’ll be notified ' + again + ' at that time, even if the app is closed.'
        : ' You’ll be notified then, even if the app is closed.';
      toast((id ? 'Reminder updated.' : 'Reminder added.') + extra, 'Undo', undoRem(snapS));
    }, id ? 'Save' : 'Add',
    id ? `<button type="button" class="btn danger" style="flex:0 0 auto" aria-label="Delete this reminder" onclick="deleteRem('${id}')">${I('trash')}</button>` : '');
  const f = $('#sf');
  if (f) ['date', 'time', 'repeat'].forEach(n => { if (f[n]) { f[n].addEventListener('input', remHintLive); f[n].addEventListener('change', remHintLive); } });
}
async function deleteRem(id) {
  if (!(S.reminders || []).some(x => x.id === id)) return;
  const snapS = snap();
  S.reminders = S.reminders.filter(x => x.id !== id);
  await save();
  const sync = await scheduleReminders();
  await closeSheet(); render();
  toast(sync === 'fail' ? 'Deleted on this phone. The notification couldn’t be cancelled just now.' : 'Reminder deleted.', 'Undo', undoRem(snapS));
}

/* ================= MORE ================= */
function More() {
  const T = todayT(), t30 = T + 30 * DAY;
  const unpaid = S.bills.filter(b => !b.paid), over = unpaid.filter(b => daysLeft(b.due) < 0).length;
  const due30 = unpaid.filter(b => parseD(b.due) <= t30).length;
  const nb = S.birthdays.map(b => Object.assign({ b }, bdayInfo(b))).sort((x, y) => x.d - y.d)[0];
  const starred = S.ideas.filter(i => i.pinned).length;
  const ne = upcomingEvents()[0];
  const petOver = dueItems({ pets: S.pets }).filter(x => x.days < 0).length;
  const hOver = dueItems({ health: S.health }).filter(x => x.days < 0).length;
  const openTodos = S.todos.filter(t => !t.done).length;
  const R = navDefs({
    cars: () => `${plural(S.cars.length, 'car')} · rego, WOF and servicing`,
    calendar: () => 'Appointments, events and holidays',
    todo: () => openTodos ? `${openTodos} to do` : 'Your lists',
    commission: () => commMoreSub(),
    reminders: () => remindersMoreSub(),
    loans: () => loansMoreSub(),
    events: () => ne ? `Next: ${esc(ne.title)}, ${daysLeft(ne.date) === 0 ? 'today' : fmtW(ne.date)}` : 'What’s on in Whangārei',
    tv: () => 'TVNZ 1, TVNZ 2, Three and Sky Starter',
    meals: () => mealsMoreSub(),
    recipes: () => plural(visibleIdeas().length, 'recipe') + (M().ideas.some(i => i.fav && !i.hidden) ? ` · ${M().ideas.filter(i => i.fav && !i.hidden).length} favourites` : ''),
    shopping: () => shopMoreSub(),
    pets: () => petsMoreSub(),
    garden: () => gardenMoreSub(),
    health: () => healthMoreSub(),
    bridge: () => 'Dave Culham Drive · ' + BR_TXT[brStatus().state][3],
    bills: () => S.bills.length ? `${plural(due30, 'bill')} due in the next 30 days` : 'Power, phone, insurance…',
    birthdays: () => nb ? `Next: ${esc(nb.b.name)}, ${nb.d === 0 ? 'today!' : nb.d === 1 ? 'tomorrow' : fmtW(nb.iso)}` : 'Never miss one',
    ideas: () => S.ideas.length ? plural(S.ideas.length, 'idea') + (starred ? ` · ${starred} starred` : '') : 'Jot things down',
    videos: () => { const n = enabledVideoCats().length; return n ? plural(n, 'category') + ' on' : 'All categories are off'; },
    top40: () => 'Official Top 40 · chart as of 3 Oct 2026'
  });
  const pills = { pets: petOver ? `<span class="pill over">${petOver} overdue</span>` : '', health: hOver ? `<span class="pill over">${hOver} overdue</span>` : '',
    bills: over ? `<span class="pill over">${over} overdue</span>` : '', birthdays: nb && nb.d === 0 ? '<span class="pill bdaypill">Today!</span>' : '' };
  const order = navOrder();
  const item = k => { const d = R[k]; return `<button class="row" onclick="go('#${k}')"><div class="ic ${d.cls}">${I(d.icon)}</div><div class="tx"><div class="t">${d.t}</div><div class="s">${d.sub()}</div></div>${pills[k] || ''}${I('right')}</button>`; };
  return header('More', 'Everything else in the app', '') +
    `<div class="list">
      ${order.slice(NAV_TABS).map(item).join('')}
      <button class="row" onclick="go('#settings')"><div class="ic set">${I('gear')}</div><div class="tx"><div class="t">Settings</div><div class="s">Reminders, calendars and backup</div></div>${I('right')}</button>
    </div>
    <div class="foot">${savedWhere()}</div>`;
}
/* 1.12.0: one list for the left strip and More. 1.51.0 lists every section on the strip.
   The More page still skips the first NAV_TABS.
   1.94.0: the strip is grouped and colour-coded. The reorder screen is gone.
   A saved settings.navOrder is left in backups and is not used. */
const NAV_TABS = 3;
const NAV = { // key: [icon, icon colour class, name, short name for the tab]
  cars: ['car', 'car', 'Cars', 'Cars'], calendar: ['cal', 'appt', 'Calendar', 'Calendar'], todo: ['todo', 'todo', 'To-do', 'To-do'],
  reminders: ['bell', 'rem', 'Reminders', 'Reminders'], commission: ['cash', 'comm', 'Commission', 'Commission'], loans: ['coins', 'loan', 'Loans', 'Loans'], events: ['ticket', 'ev', 'Events', 'Events'],
  tv: ['tv', 'tv', 'TV guide', 'TV'],
  meals: ['meal', 'meal', 'Meal planner', 'Meals'], recipes: ['book', 'recipe', 'Recipes', 'Recipes'], shopping: ['cart', 'shop', 'Shopping list', 'Shopping'], pets: ['paw', 'pet', 'Pets &amp; Vet', 'Pets'], garden: ['leaf', 'garden', 'Gardening', 'Garden'], health: ['medkit', 'health', 'Health', 'Health'],
  bridge: ['bridge', 'br', 'Lifting bridge', 'Bridge'], bills: ['bill', 'bill', 'Bills', 'Bills'], birthdays: ['cake', 'bday', 'Birthdays', 'Birthdays'], ideas: ['bulb', 'idea', 'Ideas', 'Ideas'],
  videos: ['play', 'vid', 'Videos', 'Videos'],
  top40: ['music', 't40', 'Top 40', 'Top 40']
};
const NAV_DEFAULT = Object.keys(NAV);
const navDefs = subs => Object.fromEntries(NAV_DEFAULT.map(k => [k, { icon: NAV[k][0], cls: NAV[k][1], t: NAV[k][2], sub: subs[k] }]));
/* Side panel groups (1.94.0). Keys are the real sections. Home is with the everyday items. Settings and More sit under the groups. */
const NAV_GROUPS = [
  { id: 'day', title: 'Everyday', keys: ['home', 'calendar', 'todo', 'reminders'] },
  { id: 'money', title: 'Money', keys: ['bills', 'commission', 'loans'] },
  { id: 'people', title: 'People', keys: ['birthdays', 'pets', 'health'] },
  { id: 'cars', title: '', keys: ['cars'] },
  { id: 'life', title: 'Home life', keys: ['meals', 'recipes', 'shopping', 'garden', 'ideas'] },
  { id: 'near', title: 'Nearby', keys: ['events', 'bridge'] },
  { id: 'media', title: 'Media', keys: ['tv', 'videos', 'top40'] }
];
function navOrder() {
  return NAV_DEFAULT.slice();
}

/* Press-and-hold drag on Customise Home. Works with touch (Android) and a mouse. */
const HOLD_MS = 350;
let rd = null; // the drag in progress
function wireReorder() {
  const list = $('#reorderlist'); if (!list) return;
  list.addEventListener('contextmenu', e => e.preventDefault());
  const pt = e => e.touches ? e.touches[0] || e.changedTouches[0] : e;
  const down = e => {
    if (rd || (e.type === 'pointerdown' && e.pointerType !== 'mouse')) return;
    const row = e.target.closest('.mrow'); if (!row || e.target.closest('.summove')) return;
    const p = pt(e), st = { row, x: p.clientX, y: p.clientY, lastY: p.clientY, on: false };
    st.timer = setTimeout(() => startDrag(st), e.type === 'pointerdown' ? 200 : HOLD_MS);
    rd = st;
  };
  const move = e => {
    if (!rd) return;
    const p = pt(e);
    if (!rd.on) { if (Math.abs(p.clientY - rd.y) > 8 || Math.abs(p.clientX - rd.x) > 8) cancelHold(); return; } // moved before the hold: it's a scroll
    if (e.cancelable) e.preventDefault();
    rd.lastY = p.clientY; dragTo();
  };
  const up = () => { if (!rd) return; if (rd.on) endDrag(); else cancelHold(); };
  list.addEventListener('touchstart', down, { passive: true });
  list.addEventListener('touchmove', move, { passive: false });
  list.addEventListener('touchend', up); list.addEventListener('touchcancel', up);
  list.addEventListener('pointerdown', down);
  rdMouse = { move, up };
  if (!rdWired) { rdWired = true; window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && rdMouse) rdMouse.move(e); }); window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && rdMouse) rdMouse.up(); }); }
}
let rdMouse = null, rdWired = false;
function cancelHold() { if (rd) clearTimeout(rd.timer); rd = null; }
function startDrag(st) {
  if (rd !== st) return;
  const list = $('#reorderlist'), rows = [...list.querySelectorAll('.mrow')], lr = list.getBoundingClientRect();
  st.on = true; st.rows = rows; st.from = rows.indexOf(st.row); st.to = st.from;
  st.mids = rows.map(r => { const b = r.getBoundingClientRect(); return b.top - lr.top + b.height / 2; });
  st.h = st.row.getBoundingClientRect().height; st.startTop = lr.top; st.startScroll = $('#view').scrollTop;
  list.classList.add('dragging'); st.row.classList.add('lifted');
  try { navigator.vibrate && navigator.vibrate(15); } catch (e) { }
  const loop = () => { if (rd !== st || !st.on) return; autoScroll(); st.raf = requestAnimationFrame(loop); };
  st.raf = requestAnimationFrame(loop);
}
function autoScroll() {
  const v = $('#view'), vr = v.getBoundingClientRect(), y = rd.lastY;
  const step = y < vr.top + 70 ? -8 : y > vr.bottom - 70 ? 8 : 0;
  if (step) { const b = v.scrollTop; v.scrollTop += step; if (v.scrollTop !== b) dragTo(); }
}
function dragTo() {
  const st = rd, scrolled = $('#view').scrollTop - st.startScroll, dy = st.lastY - st.y + scrolled;
  const mid = st.mids[st.from] + dy;
  let to = 0; st.mids.forEach((m, i) => { if (i !== st.from && m < mid) to++; });
  st.to = to;
  st.row.style.transform = `translateY(${dy}px)`;
  st.rows.forEach((r, i) => { if (i === st.from) return; const shift = st.from < to && i > st.from && i <= to ? -st.h : st.from > to && i >= to && i < st.from ? st.h : 0; r.style.transform = shift ? `translateY(${shift}px)` : ''; });
}
async function endDrag() {
  const st = rd; rd = null; cancelAnimationFrame(st.raf);
  const o = st.rows.map(r => r.dataset.k), [k] = o.splice(st.from, 1); o.splice(st.to, 0, k);
  if (st.to === st.from) { render(); return; }
  if ($('#reorderlist').dataset.save !== 'home') { render(); return; }
  await setHomeOrder(o);
}

/* ================= LIFTING BRIDGE (Dave Culham Drive, Te Matau ā Pohe) ================= */
// Not live: the council doesn't publish lift status. The rules are in core.js (bridgeStatus); planned closures come from
// the relay's /closures (the council's Roadworks and closures page); wind is the Open-Meteo forecast.
const BRIDGE_TRAFFIC_URL = 'https://www.google.com/maps/@?api=1&map_action=map&center=-35.73498%2C174.33534&zoom=16&layer=traffic';
const WDC_BRIDGE_URL = 'https://www.wdc.govt.nz/Services/Roads-and-Transportation/Transportation/Te-Matau-a-Pohe-bridge';
const WDC_CLOSURES_URL = 'https://www.wdc.govt.nz/Services/Roads-and-Transportation/Roads/Roadworks-and-closures';
const BR_NEAR_M = 2000, CLS_MAX_AGE = 3 * 3600 * 1000;
let CLS = null, clsBusy = false, clsFailed = false;
let brNear = null, brDist = null, brLocBusy = false, brLocAt = 0; // location is only kept in memory while the app is open
function loadCls() { try { const c = JSON.parse(localStorage.getItem('closures') || 'null'); CLS = c && c.at && c.data && Array.isArray(c.data.closures) ? c : null; } catch (e) { CLS = null; } }
async function refreshClosures(force = false) {
  if (!RELAY_URL || clsBusy || (!force && CLS && Date.now() - CLS.at < CLS_MAX_AGE)) return;
  clsBusy = true;
  let data = null;
  try { data = await getJSON(RELAY_URL + '/closures', 20000); } catch (e) { }
  clsBusy = false;
  if (data && Array.isArray(data.closures)) { CLS = { at: Date.now(), data }; clsFailed = false; try { localStorage.setItem('closures', JSON.stringify(CLS)); } catch (e) { } }
  else clsFailed = true;
  updBridge(true);
}
function brWind() {
  if (!WX || Date.now() - WX.at > 3 * 3600 * 1000) return null;
  const v = WX.data.current && WX.data.current.wind_speed_10m;
  return typeof v === 'number' ? v : null;
}
function brWindToday() {
  if (!WX || Date.now() - WX.at > 12 * 3600 * 1000) return null;
  const d = wxDays()[0]; return d && d.iso === todayISO() && typeof d.wind === 'number' ? d.wind : null;
}
const brStatus = () => DD.bridgeStatus(new Date(), { windKmh: brWind(), closures: CLS ? CLS.data.closures : [] });
const NZTA_NORTHLAND_EVENTS = 'https://trafficnz.info/service/traffic/rest/4/events/byregion/1/-1';
let BR_TR = null, brTrBusy = false;
const BR_TR_MAX = 10 * 60 * 1000;
function bridgeTrafficSentence() {
  return BR_TR && BR_TR.settled && BR_TR.line ? BR_TR.line : '';
}
function bridgeTrafficLikely() { return !!(BR_TR && BR_TR.settled && BR_TR.likely); }
function brTrafficHtml() {
  const line = bridgeTrafficSentence();
  if (!line) return '';
  return `<div class="brtraffic${bridgeTrafficLikely() ? ' queued' : ''}">${esc(line)}</div>`;
}
async function refreshBridgeTraffic(force = false) {
  if (brTrBusy || (!force && BR_TR && BR_TR.at && Date.now() - BR_TR.at < BR_TR_MAX)) return;
  brTrBusy = true;
  let data = null;
  try { data = await getJSON(NZTA_NORTHLAND_EVENTS, 12000); } catch (e) { data = null; }
  let judged = data ? DD.judgeBridgeTraffic(data) : null;
  if ((!judged || !judged.read) && RELAY_URL) {
    try { data = await getJSON(RELAY_URL + '/bridge-traffic', 12000); } catch (e) { data = null; }
    judged = data ? DD.judgeBridgeTraffic(data) : null;
  }
  brTrBusy = false;
  const line = judged && judged.line ? judged.line : 'Live traffic was not available.';
  BR_TR = { at: Date.now(), settled: true, likely: !!(judged && judged.likelyClosed), line };
  updBridge();
}
const brMode = () => (S && S.settings.bridgeHome) || 'near';
const pad = n => String(n).padStart(2, '0');
const hmStr = m => pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
function brWhen(iso, min, prep) {
  const d = daysLeft(iso), t = fmtTime(hmStr(min));
  return (d === 0 ? '' : d === 1 ? 'tomorrow ' : WDL[new Date(parseD(iso)).getUTCDay()] + ' ') + (prep ? prep + ' ' : '') + t;
}
const brStamp = st => { const [d, t] = st.split('T'); const [h, m] = t.split(':').map(Number); return { iso: d, min: h * 60 + m }; };
const BR_TXT = {
  closed: ['over', 'Closed', 'Road closed – planned closure', 'Closed (planned closure)'],
  windy: ['fine', 'No lifts', 'Too windy for lifts (forecast)', 'Too windy for lifts (forecast)'],
  peak: ['fine', 'No lifts', 'No lifts now – peak traffic', 'No lifts now (peak traffic)'],
  noon: ['over', 'Noon lift', 'Noon lift – the road may be closed for about 5–7 minutes', 'Noon lift now'],
  request: ['soon', 'Lifts possible', 'Lifts on request – each stops traffic for about 5–7 minutes', 'Lifts possible'],
  after: ['none', 'After hours', 'After hours – lifts only on call', 'After hours']
};
function brNextText(st) {
  if (st.state === 'closed') { const u = brStamp(st.closure.until); return 'Closed until ' + brWhen(u.iso, u.min) + ', according to the council’s notice'; }
  if (st.state === 'windy') return 'Normal lift times apply again once the wind drops below gale force';
  const n = st.next; if (!n) return '';
  if (n.state === 'peak') return `Next: no lifts ${brWhen(n.iso, n.min, 'from')} (peak traffic)`;
  if (n.state === 'noon') return `Next: noon lift ${brWhen(n.iso, n.min, 'at')}`;
  if (n.state === 'request') return `Next: lifts possible ${brWhen(n.iso, n.min, 'from')}`;
  return `Next: after hours ${brWhen(n.iso, n.min, 'from')}`;
}
function brDetail(st) {
  if (st.state === 'closed') return esc([st.closure.where, clip(st.closure.desc || '', 220)].filter(Boolean).join(' – '));
  if (st.state === 'windy') return `Forecast wind about ${Math.round(st.windKmh)} km/h. The council doesn’t lift the bridge in gale-force wind (over 34 knots, about 63 km/h), so the road should stay open.`;
  return { peak: 'The bridge isn’t lifted on weekdays from 7 to 9 am or from 4 to 6 pm.',
    noon: 'The council’s scheduled lift is at 12:00 noon every day, when conditions allow.',
    request: 'In staffed hours boats can ask for a lift at any time, usually within 5 minutes. It lifts about 5 times a day.',
    after: 'Outside staffed hours the bridge is only lifted on call, usually booked ahead, so lifts are uncommon.' }[st.state];
}
const clip = (t, n) => t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '…';
function brClosureWhen(c) {
  const a = brStamp(c.from), b = brStamp(c.until), sameDay = a.iso === b.iso;
  const t = (x, allDay) => allDay ? '' : ', ' + fmtTime(hmStr(x.min));
  const allDay = c.from.endsWith('T00:00') && c.until.endsWith('T23:59');
  return allDay ? (sameDay ? fmtW(a.iso) : `${fmtW(a.iso)} to ${fmtW(b.iso)}`) + ' (all day)'
    : sameDay ? `${fmtW(a.iso)}, ${fmtTime(hmStr(a.min))} – ${fmtTime(hmStr(b.min))}` : `${fmtW(a.iso)}${t(a)} to ${fmtW(b.iso)}${t(b)}`;
}
function brWindNote(st) {
  if (st.state === 'windy' || st.state === 'closed') return '';
  const w = brWindToday();
  return w != null && w > DD.BRIDGE.galeKmh ? `<div class="brwarn">${I('warn')} Strong wind forecast today (up to ${Math.round(w)} km/h), so lifts may be stopped.</div>` : '';
}
function brCard(full = false) {
  const st = brStatus(), [pc, pl, head] = BR_TXT[st.state];
  const up = st.upcoming[0];
  return `<div class="card bridge" id="brcard" data-state="${st.state}">
    <div class="brhead"><div class="ic br">${I('bridge')}</div><div class="tx"><div class="t">Lifting bridge – Dave Culham Drive</div><div class="s">Te Matau ā Pohe</div></div><span class="pill ${pc}">${pl}</span></div>
    <div class="brstate">${head}</div>
    ${full ? `<div class="brsub">${brDetail(st)}</div>` : ''}
    <div class="brnext">${brNextText(st)}</div>
    ${brTrafficHtml()}
    ${up ? `<div class="brclose">${I('warn')} Planned closure: ${brClosureWhen(up)}</div>` : ''}
    ${brWindNote(st)}
    <div class="brnote">Not live – based on the council’s lift times</div>
    <div class="btns"><a class="btn" id="brtraffic" href="${BRIDGE_TRAFFIC_URL}" target="_blank" rel="noopener">${I('car')} Live traffic</a>${full ? '' : `<button class="btn" onclick="go('#bridge')">Details</button>`}</div></div>`;
}
function brLine() {
  const st = brStatus();
  return `<div class="list brlist" id="brline" data-state="${st.state}"><button class="row" onclick="go('#bridge')"><div class="ic br">${I('bridge')}</div>
    <div class="tx"><div class="t">Lifting bridge: ${BR_TXT[st.state][3]}</div><div class="s">${brNextText(st)}${bridgeTrafficSentence() ? ' · ' + bridgeTrafficSentence() : ''} · Not live – based on the council’s lift times</div></div>${I('right')}</button></div>`;
}
function brOnHome() {
  const m = brMode();
  if (m === 'always' || (m === 'near' && S.settings.bridgeLoc && brNear === true)) return 'card';
  if (m === 'near' && !S.settings.bridgeLoc) return 'line';
  return '';
}
function brSeasonText(iso) {
  const y = +iso.slice(0, 4), sum = DD.bridgeSeason(iso) === 'summer';
  const lastSunSep = yy => { const t = Date.UTC(yy, 9, 0); return isoT(t - new Date(t).getUTCDay() * DAY); };
  const firstSunApr = yy => { const t = Date.UTC(yy, 3, 1); return isoT(t + ((7 - new Date(t).getUTCDay()) % 7) * DAY); };
  if (sum) { const a = iso >= lastSunSep(y) ? lastSunSep(y) : lastSunSep(y - 1), b = addDays(firstSunApr(+a.slice(0, 4) + 1), -1); return `Summer hours (${fmtY(a)} to ${fmtY(b)})`; }
  const a = firstSunApr(y), b = addDays(lastSunSep(y), -1); return `Winter hours (${fmtY(a)} to ${fmtY(b)})`;
}
function Bridge() {
  if (!CLS && !clsBusy && !clsFailed) setTimeout(() => refreshClosures(), 0);
  if (!BR_TR && !brTrBusy) setTimeout(() => refreshBridgeTraffic(), 0);
  const st = brStatus(), T = st.iso, we = [0, 6].includes(new Date(parseD(T)).getUTCDay());
  const rng = ([a, b]) => `${fmtTime(hmStr(a))} – ${fmtTime(hmStr(b))}`;
  const hours = st.hours.map(rng).join(' and ');
  const cl = CLS ? CLS.data.closures : [];
  const clRows = cl.map(c => {
    const now = DD.nzClock().stamp;
    const dates = (c.dates || []).map(d => ({ from: d.start + 'T' + (d.time || '00:00'), until: (d.end || d.start) + 'T' + (d.endTime || '23:59') })).filter(d => d.until > now).slice(0, 4);
    return `<div class="srow"><div class="tx"><div class="t">${esc(c.title)}</div>
      <div class="s">${esc(c.where || '')}${dates.length ? '<br>' + dates.map(brClosureWhen).map(esc).join('<br>') : ''}${c.desc ? '<br>' + esc(clip(c.desc, 240)) : ''}</div>
      <div class="s"><a href="${esc(c.url)}" target="_blank" rel="noopener">Council notice</a></div></div></div>`;
  }).join('');
  const locOn = !!S.settings.bridgeLoc;
  return `<button class="back" onclick="go('#home')">${I('left')} Home</button>` +
    header('Lifting bridge', 'Dave Culham Drive · Te Matau ā Pohe') + brCard(true) +
    `<div class="sec">Lift times today</div>
    <div class="list"><div class="srow"><div class="tx"><div class="t">${brSeasonText(T)}</div>
      <div class="s">Staffed ${we ? 'today (weekend)' : 'today'}: ${hours}<br>
      ${we ? 'No peak-traffic breaks at weekends' : 'No lifts: 7:00 am – 9:00 am and 4:00 pm – 6:00 pm (weekdays)'}<br>
      Scheduled lift: 12:00 noon every day<br>
      Other times: on call, usually booked ahead</div></div></div>
      <div class="srow"><div class="tx"><div class="t">How long a lift takes</div><div class="s">About 5–7 minutes to raise and lower. The council says it lifts about 5 times a day. No lifts in gale-force wind (over 34 knots).</div></div></div></div>
    <div class="sec">Planned closures</div>
    ${cl.length ? `<div class="list" id="brclosures">${clRows}</div>`
      : CLS ? `<div class="card muted" id="brclosures">No planned closures for the bridge or Dave Culham Drive on the council’s Roadworks and closures page.</div>`
      : clsBusy ? `<div class="card muted">Checking the council’s planned closures…</div>`
      : `<div class="muted" style="margin:0 4px">Planned closures couldn’t be checked just now.</div>`}
    <div class="sec">Closure alerts</div>
    ${brPushSection()}
    <div class="sec">Show when I’m near</div>
    <div class="list"><div class="srow"><div class="tx"><div class="t">${locOn ? 'On' : 'Off'}</div>
      <div class="s">${locOn ? `The card shows at the top of Home when you open the app within about 2 km of the bridge.${brDist != null ? ` You’re about ${brDist < 1000 ? Math.round(brDist / 10) * 10 + ' m' : (brDist / 1000).toFixed(1) + ' km'} away.` : ''}` : 'Uses your location only while the app is open, to put this card at the top of Home within about 2 km of the bridge.'} Your location isn’t saved.</div></div>
      ${locOn ? `<button class="btn small" onclick="stopBridgeLoc()">Stop</button>` : `<button class="btn primary small" id="brnearbtn" onclick="enableBridgeLoc()">${I('pin')} Show when I’m near</button>`}</div></div>
    <div class="btns"><a class="btn" href="${WDC_BRIDGE_URL}" target="_blank" rel="noopener">${I('ext')} Council bridge page</a></div>
    <div class="foot">Lift times from Whangārei District Council. Planned closures from the council’s <a href="${WDC_CLOSURES_URL}" target="_blank" rel="noopener">Roadworks and closures</a> page. Wind from the Open-Meteo forecast. The council doesn’t publish live lift status, so this can’t tell you if the bridge is up right now.</div>`;
}
function updBridge(force = false) {
  if (!S || sheetOpen) return;
  const h = (location.hash || '#home').slice(1).split('/')[0];
  if (h === 'bridge') { const v = $('#view'), top = v.scrollTop; render(); v.scrollTop = top; return; }
  if (h !== 'home' && h !== '') return;
  if (homeEdit) return;
  const want = brOnHome(), has = document.getElementById('brcard') ? 'card' : document.getElementById('brline') ? 'line' : '';
  if (want !== has) { const v = $('#view'), top = v.scrollTop; render(); v.scrollTop = top; return; }
  const c = document.getElementById('brcard'); if (c) c.outerHTML = brCard();
  const l = document.getElementById('brline'); if (l) l.outerHTML = brLine();
  paintHomeSum();
}
function gotPos(pos) {
  brLocAt = Date.now(); brDist = DD.bridgeMetres(pos.coords.latitude, pos.coords.longitude);
  brNear = brDist <= BR_NEAR_M;
}
async function checkBridgeLoc(force = false) {
  if (!S || brMode() !== 'near' || !S.settings.bridgeLoc || brLocBusy || !navigator.geolocation) return;
  if (!force && brNear !== null && Date.now() - brLocAt < 4 * 60 * 1000) return;
  try { if (navigator.permissions && navigator.permissions.query) { const p = await navigator.permissions.query({ name: 'geolocation' }); if (p.state !== 'granted') { brNear = null; updBridge(); return; } } } catch (e) { }
  brLocBusy = true;
  navigator.geolocation.getCurrentPosition(pos => { brLocBusy = false; gotPos(pos); updBridge(); }, () => { brLocBusy = false; },
    { enableHighAccuracy: false, maximumAge: force ? 0 : 2 * 60 * 1000, timeout: 15000 }); // fresh fix when the app is opened
}
function enableBridgeLoc() {
  if (!navigator.geolocation) { toast('This phone or browser can’t share your location.'); return; }
  brLocBusy = true;
  navigator.geolocation.getCurrentPosition(async pos => {
    brLocBusy = false; gotPos(pos);
    S.settings.bridgeLoc = true; if (brMode() !== 'near') S.settings.bridgeHome = 'near';
    await save(); render();
    toast(brNear ? 'You’re near the bridge, so it’s now at the top of Home.' : 'Done. The bridge will show at the top of Home when you’re within about 2 km.');
  }, err => {
    brLocBusy = false;
    toast(err && err.code === 1 ? 'Location wasn’t allowed, so the bridge stays as a short line on Home.' : 'Couldn’t get your location just now. Try again in a moment.');
  }, { enableHighAccuracy: false, maximumAge: 60 * 1000, timeout: 20000 });
}
async function stopBridgeLoc() { S.settings.bridgeLoc = false; brNear = null; brDist = null; await save(); render(); toast('The app won’t use your location for the bridge.'); }
async function setBridgeHome(v) { S.settings.bridgeHome = v; await save(); render(); if (v === 'near') checkBridgeLoc(true); if (v !== 'off') { refreshClosures(); refreshBridgeTraffic(); } }

/* ---- Bridge closure alerts (push, v1.13.0) ----
   The relay checks the council's closures page every 10 minutes. When a new notice about the bridge or Dave Culham Drive
   appears (or it's 6 pm the evening before a closure) it sends a push notification, which shows even when the app is closed. */
const VAPID_PUBLIC = 'BEsNn0TcOiNQqSE7AbDFgYGL_v45EEm-mma2_6DtecoG5c7ZvwZ7lKpAXOQry7cqfvWM0JTjtPPdK93arc0VXMU';
let brPush = null, brPushBusy = false, brPushChecked = false; // null = unknown, true/false = on/off on this phone
const pushOK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const vapidKey = () => { const b = VAPID_PUBLIC.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - VAPID_PUBLIC.length % 4) % 4); return Uint8Array.from(atob(b), c => c.charCodeAt(0)); };
async function pushPost(path, data) {
  const r = await fetch(RELAY_URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'relay_' + r.status); return j;
}
async function pushSub() { const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); }
// On opening the bridge page (and app start if alerts are on): find out if alerts are on, re-register quietly if the relay lost it
async function checkBridgePush() {
  if (!pushOK() || brPushBusy) return;
  try {
    const sub = await pushSub();
    // A reminder-only subscription must not switch bridge alerts on.
    if (!sub || Notification.permission !== 'granted' || !S.settings.bridgePush) { brPush = false; }
    else {
      const st = await pushPost('/push/status', { endpoint: sub.endpoint });
      if (!st.subscribed || st.bridge === false) await pushPost('/push/subscribe', { subscription: sub.toJSON(), quiet: true, bridge: true });
      brPush = true;
    }
  } catch (e) { /* offline: keep what we know */ if (brPush === null) brPush = !!S.settings.bridgePush; }
  brPushChecked = true; updBridge();
}
function brPushSection() {
  if (!pushOK()) return `<div class="card muted">This phone or browser can’t get push notifications. On Android, open the app from its icon (installed from Chrome).</div>`;
  if (!brPushChecked) setTimeout(checkBridgePush, 0);
  const on = brPush === true, denied = Notification.permission === 'denied';
  return `<div class="list" id="brpush"><div class="srow"><div class="tx"><div class="t">Notify me about bridge closures</div>
    <div class="s">${denied ? 'Notifications are blocked for this app. Allow them in the phone’s settings for this app, then come back here.'
      : on ? 'On. You’ll get a notification when the council posts a new closure for the bridge or Dave Culham Drive, and again at 6 pm the evening before. Works even when the app is closed.'
      : 'Get a notification when the council posts a new closure for the bridge or Dave Culham Drive, and at 6 pm the evening before. Works even when the app is closed.'}</div></div>
    <button class="switch ${on ? 'on' : ''}" id="brpushsw" role="switch" aria-checked="${on}" aria-label="Notify me about bridge closures" ${brPushBusy || denied ? 'disabled' : ''} onclick="toggleBridgePush()"></button></div>
    ${on ? `<div class="srow"><div class="tx"><div class="s">Not sure it’s working? Send a test notification to this phone.</div></div><button class="btn small" id="brpushtest" onclick="testBridgePush()">Send test</button></div>` : ''}</div>`;
}
async function toggleBridgePush() {
  if (brPushBusy) return; brPushBusy = true; updBridge();
  try {
    if (brPush) {
      const sub = await pushSub();
      if (sub) {
        const res = await pushPost('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => ({}));
        if (!res || !res.kept) await sub.unsubscribe(); // keep the address while a reminder still needs it
      }
      brPush = false; S.settings.bridgePush = false; await save();
      toast('Bridge closure alerts are off.');
    } else {
      let p = Notification.permission; if (p !== 'granted') p = await Notification.requestPermission();
      if (p !== 'granted') { toast('Notifications weren’t allowed, so bridge alerts are still off.'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() });
      await pushPost('/push/subscribe', { subscription: sub.toJSON() });
      brPush = true; S.settings.bridgePush = true; await save();
      toast('Bridge closure alerts are on. A notification should pop up in a moment to confirm.');
    }
  } catch (e) {
    toast(navigator.onLine === false ? 'You’re offline. Try again when you have signal.' : 'Couldn’t change bridge alerts just now. Try again in a moment.');
  } finally { brPushBusy = false; updBridge(); }
}
async function testBridgePush() {
  const b = $('#brpushtest'); if (b) b.disabled = true;
  try {
    const sub = await pushSub(); if (!sub) throw new Error('none');
    const r = await pushPost('/push/test', { endpoint: sub.endpoint });
    toast(r.test === 'ok' ? 'Test sent. It should appear in a few seconds.' : r.test === 'gone' ? 'This phone’s alert address expired. Turn the switch off and on again.' : 'The test didn’t go through. Try again in a moment.');
    if (r.test === 'gone') { brPush = false; updBridge(); }
  } catch (e) { toast('The test didn’t go through. Try again in a moment.'); }
  finally { if (b) b.disabled = false; }
}

/* ================= WEATHER (Open-Meteo, Whangārei) ================= */
// Open-Meteo is free, needs no key and allows browser requests. Credit: "Weather data by Open-Meteo.com" (CC BY 4.0).
const WX_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-35.7251&longitude=174.3237' +
  '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation' +
  '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,is_day' + // v1.9.0: hourly strip
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset' +
  '&timezone=Pacific%2FAuckland&forecast_days=7&forecast_hours=48&wind_speed_unit=kmh';
const WX_MAX_AGE = 30 * 60 * 1000;
const METSERVICE_URL = 'https://www.metservice.com/towns-cities/regions/northland/locations/whangarei';
const OPEN_METEO_URL = 'https://open-meteo.com/';
let WX = null, wxBusy = false, wxFailed = false;
function loadWx() { try { const w = JSON.parse(localStorage.getItem('wx') || 'null'); WX = w && w.at && validWx(w.data) ? w : null; } catch (e) { WX = null; } }
function validWx(d) { return !!(d && d.current && typeof d.current.temperature_2m === 'number' && d.daily && Array.isArray(d.daily.time) && d.daily.time.length); }
async function getJSON(url, ms) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' }); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function refreshWx(force = false) {
  if (wxBusy || (!force && WX && Date.now() - WX.at < WX_MAX_AGE)) return;
  wxBusy = true; if (force) updWx();
  let data = null;
  try { data = await getJSON(WX_URL, 10000); } catch (e) { }
  // If Open-Meteo can't be reached from this phone (or it's busy), ask the app's own service for its 20-minute copy
  if (!validWx(data) && RELAY_URL) { try { data = await getJSON(RELAY_URL + '/weather', 12000); } catch (e) { } }
  wxBusy = false;
  if (validWx(data)) { WX = { at: Date.now(), data }; wxFailed = false; try { localStorage.setItem('wx', JSON.stringify(WX)); } catch (e) { } }
  else wxFailed = true;
  updWx();
}
function updWx() {
  if (sheetOpen) return;
  const h = (location.hash || '#home').slice(1);
  if (h === 'weather') { render(); return; }
  const el = document.getElementById('wxcard'); if (el) el.outerHTML = wxCard();
  const greet = document.getElementById('wxgreet'); if (greet) greet.outerHTML = wxGreet();
  else if ((h === 'home' || h === '') && !homeEdit && wxInUp()) render();
  paintHomeSum();
}
function paintHomeSum() {
  if (sheetOpen) return;
  const h = (location.hash || '#home').slice(1);
  if ((h !== 'home' && h !== '') || homeEdit) return;
  const sum = document.getElementById('homesum');
  if (!sum) return;
  const next = homeOverview(homeShownNow);
  if (next) sum.outerHTML = next;
}
// Open-Meteo weather codes → words (day, night) and the icon kind drawn by wxIcon() (v1.9.0: coloured inline SVG icons)
const WMO = {
  0: ['Sunny', 'Clear', 'clear'], 1: ['Mostly sunny', 'Mostly clear', 'pc'], 2: ['Partly cloudy', 'Partly cloudy', 'pc'], 3: ['Cloudy', 'Cloudy', 'cloud'],
  45: ['Fog', 0, 'fog'], 48: ['Fog', 0, 'fog'], 51: ['Light drizzle', 0, 'drizzle'], 53: ['Drizzle', 0, 'drizzle'], 55: ['Heavy drizzle', 0, 'drizzle'], 56: ['Freezing drizzle', 0, 'drizzle'], 57: ['Freezing drizzle', 0, 'drizzle'],
  61: ['Light rain', 0, 'rain'], 63: ['Rain', 0, 'rain'], 65: ['Heavy rain', 0, 'rain'], 66: ['Freezing rain', 0, 'rain'], 67: ['Freezing rain', 0, 'rain'],
  71: ['Light snow', 0, 'snow'], 73: ['Snow', 0, 'snow'], 75: ['Heavy snow', 0, 'snow'], 77: ['Snow', 0, 'snow'],
  80: ['Light showers', 0, 'showers'], 81: ['Showers', 0, 'showers'], 82: ['Heavy showers', 0, 'showers'], 85: ['Snow showers', 0, 'snow'], 86: ['Snow showers', 0, 'snow'],
  95: ['Thunderstorms', 0, 'storm'], 96: ['Thunderstorms with hail', 0, 'storm'], 99: ['Thunderstorms with hail', 0, 'storm']
};
const WX_WINDY = 40; // km/h: a dry day or hour this windy gets the wind icon
// kind: clear | pc | cloud | fog | drizzle | rain | showers | snow | storm | wind (+ day/night for clear and pc)
function wmo(code, day = true, wind = null) {
  const w = WMO[code] || ['Weather', 0, 'cloud'];
  let words = day || !w[1] ? w[0] : w[1], kind = w[2];
  if (typeof wind === 'number' && wind >= WX_WINDY && ['clear', 'pc', 'cloud'].includes(kind)) { kind = 'wind'; words += ', windy'; }
  const legacy = { clear: day ? 'sun' : 'moon', pc: day ? 'cloudsun' : 'cloudmoon', cloud: 'cloud', fog: 'fog', drizzle: 'drizzle', rain: 'rain', showers: 'rain', snow: 'snow', storm: 'storm', wind: 'cloud' }[kind];
  return { words, kind, day, icon: legacy };
}
// Coloured weather icons, drawn inline (no image hosts). Colours come from CSS variables so they suit every theme.
const WXP = {
  sun: '<g class="w-sun"><circle cx="16" cy="16" r="6"/><path d="M16 3.5v3M16 25.5v3M3.5 16h3M25.5 16h3M7.2 7.2l2.1 2.1M22.7 22.7l2.1 2.1M7.2 24.8l2.1-2.1M22.7 9.3l2.1-2.1"/></g>',
  sunS: '<g class="w-sun"><circle cx="11.5" cy="11.5" r="4.6"/><path d="M11.5 2.8v2M11.5 18.2v2M2.8 11.5h2M18.2 11.5h2M5.3 5.3l1.4 1.4M16.3 16.3l1.4 1.4M5.3 17.7l1.4-1.4M16.3 6.7l1.4-1.4"/></g>',
  moon: '<path class="w-moon" d="M20.5 25.5A10 10 0 0 1 13.2 6.6a10.5 10.5 0 1 0 12.2 14.1 10 10 0 0 1-4.9 4.8z"/>',
  moonS: '<path class="w-moon" d="M14.6 18.4A6.6 6.6 0 0 1 9.8 5.9a7 7 0 1 0 8.1 9.4 6.6 6.6 0 0 1-3.3 3.1z"/>',
  cloud: '<path class="w-cloud" d="M10 26h14.5a5.2 5.2 0 0 0 .8-10.3 7.4 7.4 0 0 0-14-1.7A6 6 0 0 0 10 26z"/>',
  cloudUp: '<path class="w-cloud dk" d="M10 21.5h14.5a5.2 5.2 0 0 0 .8-10.3 7.4 7.4 0 0 0-14-1.7A6 6 0 0 0 10 21.5z"/>',
  rain: '<path class="w-rain" d="M12 24.5l-1.6 4.2M17 24.5l-1.6 4.2M22 24.5l-1.6 4.2"/>',
  showers: '<path class="w-rain" d="M14.5 24.5l-1.6 4.2M20.5 24.5l-1.6 4.2"/>',
  drizzle: '<g class="w-drop"><circle cx="12" cy="26" r="1.2"/><circle cx="17" cy="27.5" r="1.2"/><circle cx="22" cy="26" r="1.2"/></g>',
  snow: '<g class="w-snow"><circle cx="12" cy="26" r="1.5"/><circle cx="17" cy="28" r="1.5"/><circle cx="22" cy="26" r="1.5"/></g>',
  bolt: '<path class="w-bolt" d="M17.5 18.5l-4.5 6.5h3.6l-1.6 5.5 6-8h-3.7l1.8-4z"/>',
  fog: '<path class="w-fog" d="M5 20.5h22M8 24.5h18M6 28.5h14"/>',
  fogCloud: '<path class="w-cloud" d="M9.5 17h15a4.8 4.8 0 0 0 .5-9.5 7 7 0 0 0-13.2-1.4A5.6 5.6 0 0 0 9.5 17z"/>',
  wind: '<path class="w-wind" d="M3.5 12.5h15.5a3.8 3.8 0 1 0-3.8-3.8M3.5 18h21a3.8 3.8 0 1 1-3.8 3.8M3.5 23.5h9"/>'
};
function wxIcon(w, cls = '') {
  const k = w.kind, parts = {
    clear: w.day ? WXP.sun : WXP.moon, pc: (w.day ? WXP.sunS : WXP.moonS) + WXP.cloud, cloud: WXP.cloud, fog: WXP.fogCloud + WXP.fog,
    drizzle: WXP.cloudUp + WXP.drizzle, rain: WXP.cloudUp + WXP.rain, showers: (w.day ? WXP.sunS : WXP.moonS) + WXP.cloudUp + WXP.showers,
    snow: WXP.cloudUp + WXP.snow, storm: WXP.cloudUp + WXP.bolt, wind: WXP.wind
  }[k] || WXP.cloud;
  return `<svg class="wxsvg ${cls}" data-kind="${k}" viewBox="0 0 32 32" role="img" aria-label="${esc(w.words)}">${parts}</svg>`;
}
const deg = n => typeof n === 'number' && isFinite(n) ? Math.round(n) + '°' : '–';
const num = n => typeof n === 'number' && isFinite(n);
const compass = d => num(d) ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((d % 360) + 360) % 360 / 45) % 8] : '';
const arr = (o, k, i) => o && Array.isArray(o[k]) ? o[k][i] : null;
function wxDays() {
  if (!WX) return [];
  const d = WX.data.daily, T = todayISO();
  return d.time.map((iso, i) => ({ iso, code: arr(d, 'weather_code', i), hi: arr(d, 'temperature_2m_max', i), lo: arr(d, 'temperature_2m_min', i), rain: num(arr(d, 'precipitation_probability_max', i)) ? arr(d, 'precipitation_probability_max', i) : null,
    wind: num(arr(d, 'wind_speed_10m_max', i)) ? arr(d, 'wind_speed_10m_max', i) : null, sunrise: arr(d, 'sunrise', i) || '', sunset: arr(d, 'sunset', i) || '' })).filter(x => x.iso >= T);
}
// Hourly forecast from this hour on (older saved forecasts just drop the hours that have passed). Empty if the data has no hourly part.
function wxHours(n) {
  const h = WX && WX.data.hourly;
  if (!h || !Array.isArray(h.time)) return [];
  const now = new Date(), key = todayISO() + 'T' + pad2(now.getHours());
  const out = [];
  h.time.forEach((t, i) => {
    if (typeof t !== 'string' || t.slice(0, 13) < key || out.length >= n) return;
    const hr = +t.slice(11, 13), isDay = num(arr(h, 'is_day', i)) ? arr(h, 'is_day', i) !== 0 : hr >= 6 && hr < 19;
    out.push({ t, hr, temp: arr(h, 'temperature_2m', i), rain: num(arr(h, 'precipitation_probability', i)) ? arr(h, 'precipitation_probability', i) : null,
      w: wmo(arr(h, 'weather_code', i), isDay, arr(h, 'wind_speed_10m', i)), now: t.slice(0, 13) === key });
  });
  return out;
}
const pad2 = n => String(n).padStart(2, '0');
const hourLabel = x => x.now ? 'Now' : x.hr === 0 ? WDL[new Date(parseD(x.t.slice(0, 10))).getUTCDay()].slice(0, 3) : (x.hr % 12 || 12) + (x.hr < 12 ? ' am' : ' pm');
const dayLabel = iso => iso === todayISO() ? 'Today' : WDL[new Date(parseD(iso)).getUTCDay()].slice(0, 3);
function wxUpdated() {
  if (!WX) return '';
  const off = typeof navigator !== 'undefined' && navigator.onLine === false;
  return 'Updated ' + ago(WX.at) + (off ? ' · offline' : wxFailed ? ' · couldn’t refresh just now' : '');
}
function hoursStrip(hours) {
  if (!hours.length) return '';
  return `<div class="wxhours" role="list" aria-label="Next ${hours.length} hours">${hours.map(x => `<div class="wxh${x.now ? ' now' : ''}" role="listitem" aria-label="${hourLabel(x)}: ${deg(x.temp)}, ${esc(x.w.words)}${x.rain != null ? ', ' + x.rain + '% chance of rain' : ''}">
    <span class="t">${hourLabel(x)}</span>${wxIcon(x.w)}<b>${deg(x.temp)}</b><span class="p${x.rain != null && x.rain >= 30 ? ' wet' : ''}">${x.rain != null ? x.rain + '%' : ''}</span></div>`).join('')}</div>`;
}
// 7-day rows with the high/low drawn as a bar on a shared scale for the week
function weekRows(days, cls = '') {
  const his = days.map(x => x.hi).filter(num), los = days.map(x => x.lo).filter(num);
  const min = los.length ? Math.min(...los) : 0, max = his.length ? Math.max(...his) : 1, span = Math.max(1, max - min);
  return days.map(x => {
    const w = wmo(x.code, true, x.wind);
    const bar = num(x.hi) && num(x.lo) ? `<span class="rng" aria-hidden="true"><i style="left:${Math.round((x.lo - min) / span * 100)}%;width:${Math.max(6, Math.round((x.hi - x.lo) / span * 100))}%"></i></span>` : '<span class="rng"></span>';
    return `<div class="wxd ${cls}" data-day="${x.iso}" aria-label="${x.iso === todayISO() ? 'Today' : WDL[new Date(parseD(x.iso)).getUTCDay()]}: ${esc(w.words)}, high ${deg(x.hi)}, low ${deg(x.lo)}${x.rain != null ? ', ' + x.rain + '% chance of rain' : ''}">
      <span class="d">${dayLabel(x.iso)}</span>${wxIcon(w)}<span class="p${x.rain != null && x.rain >= 30 ? ' wet' : ''}">${x.rain != null ? I('drop') + x.rain + '%' : ''}</span><span class="lo">${deg(x.lo)}</span>${bar}<span class="hi">${deg(x.hi)}</span></div>`;
  }).join('');
}
let wxAll = false; // Home card: show all 7 days
function wxCard() {
  const days = wxDays();
  if (!WX || !days.length) {
    const msg = wxBusy || (!wxFailed && navigator.onLine !== false) ? 'Getting the Whangārei weather…' : 'The weather isn’t available right now. Tap to try again.';
    return `<button class="card wx wxempty" id="wxcard" onclick="refreshWx(true)">${I('cloudsun')}<span>${msg}</span></button>`;
  }
  const c = WX.data.current, day = wxIsDay(), now = wmo(c.weather_code, day, c.wind_speed_10m), t = days[0].iso === todayISO() ? days[0] : null;
  const phase = moonPhaseName();
  const facts = [num(c.apparent_temperature) ? `Feels like ${deg(c.apparent_temperature)}` : '', num(c.wind_speed_10m) ? `Wind ${Math.round(c.wind_speed_10m)} km/h${compass(c.wind_direction_10m) ? ' ' + compass(c.wind_direction_10m) : ''}` : '', !day ? `<span class="wxphase">${I(wxPhaseIcon(phase))}${esc(phase)}</span>` : ''].filter(Boolean);
  const shown = wxAll ? days : days.slice(0, 3);
  return `<div class="card wx" id="wxcard">
    <button class="wxnow" onclick="go('#weather')" aria-label="Whangārei weather: ${deg(c.temperature_2m)}, ${esc(now.words)}. Tap for the full forecast.">
      <span class="wxic">${wxIcon(now, 'big')}</span>
      <span class="wxmain"><b class="wxtemp">${deg(c.temperature_2m)}</b><span class="wxwords">${esc(now.words)}</span></span>
      ${t ? `<span class="wxmeta"><span>H ${deg(t.hi)} · L ${deg(t.lo)}</span>${t.rain != null ? `<span>${I('drop')} ${t.rain}% rain</span>` : ''}</span>` : ''}</button>
    ${facts.length ? `<div class="wxfacts2">${facts.map(f => f.startsWith('<span') ? f : `<span>${f}</span>`).join('')}</div>` : ''}
    ${hoursStrip(wxHours(12))}
    <div class="wxweek" id="wxweek">${weekRows(shown)}</div>
    <div class="wxacts">${days.length > 3 ? `<button class="wxmore" id="wxmore" onclick="wxAll=!wxAll;updWx()" aria-expanded="${wxAll}">${wxAll ? 'Show fewer days' : `Show all ${days.length} days`}</button>` : '<span></span>'}<button class="wxfull" onclick="go('#weather')">Full forecast ${I('right')}</button></div>
    <div class="wxfoot">Whangārei · ${wxUpdated()} · Open-Meteo</div></div>`;
}
// Moon phase for the current instant, which is today's date in Pacific/Auckland (Whangārei).
// Age is measured from the new moon of 6 January 2000, 18:14 UTC, over the mean synodic month.
// Eight equal bins are centred on the principal phases, so the name is the phase in the sky now, not a guessed label.
function moonPhaseName(now = new Date()) {
  const phases = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  const synodic = 29.530588853 * 86400000;
  let age = (now.getTime() - Date.UTC(2000, 0, 6, 18, 14, 0)) % synodic;
  if (age < 0) age += synodic;
  return phases[Math.floor((age / synodic) * 8 + 0.5) % 8];
}
// Compact home line, directly under "Hi Shane" and the date. Tap opens the full forecast.
// Compare wall-clock times in Whangārei so the line follows Open-Meteo's real sunrise/sunset,
// even if the phone's own timezone is different.
function wxLocalNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}
function wxIsDay() {
  const local = wxLocalNow(), d = WX && WX.data && WX.data.daily;
  const i = d && Array.isArray(d.time) ? d.time.indexOf(local.iso) : -1;
  const sunrise = i >= 0 && Array.isArray(d.sunrise) ? d.sunrise[i] : '';
  const sunset = i >= 0 && Array.isArray(d.sunset) ? d.sunset[i] : '';
  if (sunrise && sunset) {
    const rise = String(sunrise).slice(11, 16), set = String(sunset).slice(11, 16);
    return local.hm >= rise && local.hm < set;
  }
  return local.hm >= '07:00' && local.hm < '19:00';
}
function wxPhaseIcon(phase) {
  return { 'New moon': 'moonnew', 'Waxing crescent': 'moonwaxingcrescent', 'First quarter': 'moonfirstquarter', 'Waxing gibbous': 'moonwaxinggibbous', 'Full moon': 'moonfull', 'Waning gibbous': 'moonwaninggibbous', 'Last quarter': 'moonlastquarter', 'Waning crescent': 'moonwaningcrescent' }[phase] || 'moon';
}
function wxCompactIcon(w, day, phase) {
  if (day) return I(({ clear: 'sun', pc: 'cloudsun', cloud: 'cloud', fog: 'fog', drizzle: 'drizzle', rain: 'rain', showers: 'rain', snow: 'snow', storm: 'storm', wind: 'cloud' }[w.kind] || 'cloud'));
  if (w.kind === 'clear') return I(wxPhaseIcon(phase));
  const condition = ({ pc: 'cloud', cloud: 'cloud', fog: 'fog', drizzle: 'drizzle', rain: 'rain', showers: 'rain', snow: 'snow', storm: 'storm', wind: 'cloud' }[w.kind] || 'cloud');
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[condition]}<g transform="translate(12 0) scale(.55)">${P[wxPhaseIcon(phase)]}</g></svg>`;
}
// 1.83.0: the banner names today's sunset after sunrise, and the next sunrise after sunset.
// The clock and the times are both Pacific/Auckland, from the forecast already loaded. No time is invented.
function wxSunMention(now = new Date()) {
  const d = WX && WX.data && WX.data.daily;
  if (!d || !Array.isArray(d.time) || !Array.isArray(d.sunrise) || !Array.isArray(d.sunset)) return '';
  const local = wxLocalNow(now), nowKey = local.iso + 'T' + local.hm;
  const events = [];
  for (let i = 0; i < d.time.length; i++) {
    const rise = d.sunrise[i], set = d.sunset[i];
    if (typeof rise === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(rise)) events.push({ kind: 'sunrise', at: rise.slice(0, 16) });
    if (typeof set === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(set)) events.push({ kind: 'sunset', at: set.slice(0, 16) });
  }
  events.sort((a, b) => a.at < b.at ? -1 : a.at > b.at ? 1 : 0);
  const next = events.find(e => e.at > nowKey);
  if (!next) return '';
  const hm = fmtTime(next.at.slice(11, 16));
  if (!/^\d{1,2}:\d{2} (am|pm)$/.test(hm)) return '';
  const day = next.at.slice(0, 10);
  let when = '';
  if (day !== local.iso) {
    if (parseD(local.iso) != null && day === addDays(local.iso, 1)) when = ' tomorrow';
    else if (parseD(day) != null) when = ', ' + fmtW(day);
    else return '';
  }
  return (next.kind === 'sunrise' ? 'Sunrise' : 'Sunset') + when + ', ' + hm;
}
function wxGreet() {
  const moon = moonPhaseName();
  if (!WX || !validWx(WX.data)) {
    const loading = wxBusy || (!wxFailed && navigator.onLine !== false);
    const msg = loading ? 'Getting the Whangārei weather…' : 'Not available right now. Tap to try again.';
    return `<button class="wxgreet" id="wxgreet" onclick="refreshWx(true)">${I('cloudsun')}<span>${msg}</span></button>`;
  }
  const c = WX.data.current, day = wxIsDay(), nowW = wmo(c.weather_code, day, c.wind_speed_10m);
  const words = day ? nowW.words : nowW.kind === 'clear' ? moon : `${nowW.words} · ${moon}`;
  const sun = wxSunMention();
  const shown = sun ? `${words} · ${sun}` : words;
  const line = `${deg(c.temperature_2m)} ${shown}`;
  return `<button class="wxgreet" id="wxgreet" onclick="go('#weather')" aria-label="Whangārei weather: ${esc(line)}. Tap for the full forecast.">
    <span class="wxgico">${wxCompactIcon(nowW, day, moon)}</span><span class="wxgtx"><b>${deg(c.temperature_2m)}</b> ${esc(shown)}</span></button>`;
}
function Weather() {
  const back = `<button class="back" onclick="go('#home')">${I('left')} Home</button>`;
  const days = wxDays();
  if (!WX || !days.length) return back + header('Weather', 'Whangārei') +
    `<div class="card empty"><div class="t">${wxBusy ? 'Getting the weather…' : 'The weather isn’t available right now'}</div><div class="s">Check your internet connection, then try again.</div>
     <button class="btn primary" style="flex:none;padding:12px 22px" onclick="refreshWx(true)">${I('refresh')} Try again</button></div>
     <div class="btns"><a class="btn" href="${METSERVICE_URL}" target="_blank" rel="noopener">MetService forecast ${I('ext')}</a></div>`;
  const c = WX.data.current, now = wmo(c.weather_code, c.is_day !== 0, c.wind_speed_10m), t = days[0].iso === todayISO() ? days[0] : null;
  const hm = s => s ? fmtTime(String(s).slice(11, 16)) : '';
  const hours = wxHours(24);
  const rows = days.map(x => {
    const w = wmo(x.code, true, x.wind), label = x.iso === todayISO() ? 'Today' : daysLeft(x.iso) === 1 ? 'Tomorrow' : WDL[new Date(parseD(x.iso)).getUTCDay()];
    return `<div class="row wxrow"><div class="wxri">${wxIcon(w)}</div><div class="tx"><div class="t">${label}</div><div class="s">${esc(w.words)}${x.rain != null ? ` · ${x.rain}% rain` : ''}${x.wind != null ? ` · wind ${Math.round(x.wind)} km/h` : ''}</div></div>
      <div class="wxhl"><b>${deg(x.hi)}</b><span>${deg(x.lo)}</span></div></div>`;
  }).join('');
  return back + header('Weather', 'Whangārei') +
    `<div class="card wxbig"><div class="wxnow"><span class="wxic">${wxIcon(now, 'big')}</span><div class="wxmain"><b class="wxtemp">${deg(c.temperature_2m)}</b><span class="wxwords">${esc(now.words)}</span></div></div>
      <div class="wxfacts">
        <div><small>Moon</small><b>${esc(moonPhaseName())}</b></div>
        ${num(c.apparent_temperature) ? `<div><small>Feels like</small><b>${deg(c.apparent_temperature)}</b></div>` : ''}
        ${t ? `<div><small>High / low</small><b>${deg(t.hi)} / ${deg(t.lo)}</b></div>` : ''}
        ${t && t.rain != null ? `<div><small>Chance of rain</small><b>${t.rain}%</b></div>` : ''}
        ${num(c.wind_speed_10m) ? `<div><small>Wind</small><b>${Math.round(c.wind_speed_10m)} km/h${compass(c.wind_direction_10m) ? ' ' + compass(c.wind_direction_10m) : ''}</b></div>` : ''}
        ${t && t.sunrise ? `<div><small>Sunrise</small><b>${hm(t.sunrise)}</b></div><div><small>Sunset</small><b>${hm(t.sunset)}</b></div>` : ''}
      </div></div>
    ${hours.length ? `<div class="sec">Next 24 hours</div><div class="card wxhcard">${hoursStrip(hours)}</div>` : ''}
    <div class="sec">Next 7 days <button onclick="refreshWx(true)">${wxBusy ? 'Updating…' : 'Refresh'}</button></div>
    <div class="card wxweekcard"><div class="wxweek">${weekRows(days)}</div></div>
    <div class="list" style="margin-top:10px">${rows}</div>
    <div class="btns"><a class="btn" href="${METSERVICE_URL}" target="_blank" rel="noopener">MetService forecast for Whangārei ${I('ext')}</a></div>
    <div class="foot">${wxUpdated()}<br>Weather data by <a href="${OPEN_METEO_URL}" target="_blank" rel="noopener">Open-Meteo.com</a> (CC BY 4.0). For warnings, check MetService.</div>`;
}

/* ================= ROADWORKS (NZTA TREIS open data, near Whangārei) ================= */
// NZ Transport Agency highway events, the public ArcGIS copy of the TREIS feed.
// Browser-friendly (CORS). Fixed box around Whangārei. Nothing is invented: an empty list stays empty.
// 1.73.0: council projects on the roading-improvements page whose expected start is within the next 12 months.
// That page sends no CORS header, so it is read through the relay. Past starts and anything further than a year out are left out.
const RW_LAT = -35.7251, RW_LON = 174.3237, RW_KM = 40;
const RW_MAX_AGE = 20 * 60 * 1000;
const RW_NZTA = 'https://www.journeys.nzta.govt.nz/';
const RW_WDC = 'https://www.wdc.govt.nz/Council/Projects/Roading-improvements';
const RW_LAYER = 'https://services.arcgis.com/XTtANUDT8Va4DLwI/arcgis/rest/services/NZTA_Highway_Information_TREIS_Feature_Layer_View/FeatureServer/';
let RW = null, rwBusy = false, rwFailed = false;
function loadRoadworks() {
  try {
    const r = JSON.parse(localStorage.getItem('roadworks') || 'null');
    RW = r && r.at && r.data && Array.isArray(r.data.items) ? r : null;
  } catch (e) { RW = null; }
}
function rwIso(ms) {
  if (ms == null || ms === '') return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  if (!p.year || !p.month || !p.day) return '';
  return p.year + '-' + p.month + '-' + p.day;
}
function rwKm(lat, lon) {
  const R = 6371, p1 = RW_LAT * Math.PI / 180, p2 = lat * Math.PI / 180;
  const dp = (lat - RW_LAT) * Math.PI / 180, dl = (lon - RW_LON) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function rwDist(geom) {
  const pts = [];
  if (geom && typeof geom.x === 'number' && typeof geom.y === 'number') pts.push([geom.y, geom.x]);
  (geom && geom.paths || []).forEach(path => (path || []).forEach(xy => { if (xy && xy.length >= 2) pts.push([xy[1], xy[0]]); }));
  if (!pts.length) return null;
  let best = Infinity;
  pts.forEach(([lat, lon]) => { const d = rwKm(lat, lon); if (d < best) best = d; });
  return best;
}
function rwIsWork(a) {
  const t = String(a.eventType || '').toLowerCase();
  const d = String(a.eventDescription || '').toLowerCase();
  if (t === 'road work' || t === 'scheduled road work') return true;
  return /road ?work|maintenance|pavement|resurfac|construction|asphalt/.test(d);
}
function rwParse(features) {
  const today = todayISO();
  const out = [];
  (features || []).forEach(f => {
    const a = f && f.attributes; if (!a || !rwIsWork(a)) return;
    const status = String(a.status || '');
    if (status && status !== 'Active' && status !== 'Scheduled') return;
    const start = rwIso(a.startDate), end = rwIso(a.endDate);
    if (end && end < today) return;
    const km = rwDist(f.geometry);
    if (km == null || km > RW_KM) return;
    const road = String(a.locationArea || a.eventDescription || '').replace(/\s+/g, ' ').trim();
    if (!road) return;
    const resolution = String(a.expectedResolution || '');
    out.push({
      id: a.eventId || road,
      road,
      start, end,
      until: !end && /further notice/i.test(resolution),
      near: String(a.directLineDistance1 || '').replace(/\s+/g, ' ').trim(),
      km
    });
  });
  const seen = new Set();
  return out.filter(x => { const k = String(x.id); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.km - b.km || (a.start || '').localeCompare(b.start || ''));
}
function rwQuery(layer) {
  const lat = RW_KM / 111, lon = RW_KM / (111 * Math.cos(RW_LAT * Math.PI / 180));
  const env = (RW_LON - lon) + ',' + (RW_LAT - lat) + ',' + (RW_LON + lon) + ',' + (RW_LAT + lat);
  const q = new URLSearchParams({
    f: 'json', where: '1=1', geometry: env, geometryType: 'esriGeometryEnvelope', inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'eventId,eventType,eventDescription,locationArea,startDate,endDate,status,expectedResolution,directLineDistance1',
    returnGeometry: 'true', outSR: '4326'
  });
  return RW_LAYER + layer + '/query?' + q.toString();
}
const RW_MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function rwCouncilInYear(start) {
  const s = String(start || '').replace(/\s+/g, ' ').trim();
  let day = 0, name, year;
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) { day = +m[1]; name = m[2]; year = +m[3]; }
  else { m = s.match(/^([A-Za-z]+)\s+(\d{4})$/); if (!m) return false; name = m[1]; year = +m[2]; }
  const month = RW_MONTHS[name.toLowerCase()];
  if (!month || year < 1990 || year > 2100 || (day && (day < 1 || day > 31))) return false;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  const ty = +parts.year, tm = +parts.month, td = +parts.day;
  if (!ty || !tm || !td) return false;
  if (day) {
    const idx = ty * 12 + (tm - 1) + 12, ey = Math.floor(idx / 12), em = (idx % 12) + 1;
    const dim = new Date(Date.UTC(ey, em, 0)).getUTCDate(), ed = Math.min(td, dim);
    const key = year * 10000 + month * 100 + day, today = ty * 10000 + tm * 100 + td, end = ey * 10000 + em * 100 + ed;
    return key >= today && key <= end;
  }
  const startIdx = year * 12 + (month - 1), nowIdx = ty * 12 + (tm - 1);
  return startIdx >= nowIdx && startIdx <= nowIdx + 12;
}
function rwCouncilItems(data) {
  const list = data && Array.isArray(data.projects) ? data.projects : null;
  if (!list) return null;
  return list.filter(p => p && p.name && rwCouncilInYear(p.start)).map(p => ({
    id: 'wdc-' + String(p.id || p.name),
    road: String(p.name),
    start: '', end: '', until: false,
    near: [p.status, p.start ? 'Expected start ' + p.start : '', p.detail].filter(Boolean).join(' · '),
    km: null,
    url: typeof p.url === 'string' && p.url.startsWith('https://www.wdc.govt.nz/') ? p.url : RW_WDC,
    source: 'wdc'
  }));
}
async function refreshRoadworks(force = false) {
  if (rwBusy || (!force && RW && Date.now() - RW.at < RW_MAX_AGE)) return;
  rwBusy = true; if (force) updRoadworks();
  let nzta = null, council = null;
  try {
    const [a, b] = await Promise.all([getJSON(rwQuery(0), 12000), getJSON(rwQuery(1), 12000)]);
    nzta = rwParse([].concat(a && a.features || [], b && b.features || []));
  } catch (e) { nzta = null; }
  if (RELAY_URL) { try { council = rwCouncilItems(await getJSON(RELAY_URL + '/roadworks', 12000)); } catch (e) { council = null; } }
  rwBusy = false;
  if (nzta || council) {
    RW = { at: Date.now(), data: { items: [].concat(nzta || [], council || []), nzta: !!nzta, council: !!council } };
    rwFailed = false;
    try { localStorage.setItem('roadworks', JSON.stringify(RW)); } catch (e) { }
  } else rwFailed = true;
  updRoadworks();
}
function updRoadworks() {
  if (sheetOpen) return;
  const h = (location.hash || '#home').slice(1);
  if ((h === 'home' || h === '') && !homeEdit) {
    const v = $('#view'), top = v ? v.scrollTop : 0;
    render(); if (v) v.scrollTop = top;
  }
}
function rwWhen(w) {
  let dates = '';
  if (w.start && w.end) dates = w.start === w.end ? fmt(w.start) : fmt(w.start) + ' – ' + fmt(w.end);
  else if (w.start) dates = 'From ' + fmt(w.start) + (w.until ? ' · until further notice' : '');
  else if (w.end) dates = 'Until ' + fmt(w.end);
  return [dates, w.near].filter(Boolean).join(' · ');
}
const RW_HOME_SHORT = 2;
let rwMore = false;
function toggleRwMore() {
  rwMore = !rwMore;
  updRoadworks();
}
function homeRoadworks() {
  const link = `<a href="${RW_NZTA}" target="_blank" rel="noopener">NZTA</a> · <a href="${RW_WDC}" target="_blank" rel="noopener">Council</a>`;
  const head = `<div class="sec">Roadworks near Whangārei ${link}</div>`;
  const items = RW && RW.data && Array.isArray(RW.data.items) ? RW.data.items : null;
  if (!items) {
    const loading = rwBusy || (!rwFailed && navigator.onLine !== false);
    const msg = loading ? 'Checking NZTA and the council…' : 'Couldn’t load roadworks. Tap to try again.';
    return head + `<div class="list" id="homeroadworks"><button class="row" onclick="refreshRoadworks(true)"><div class="ic rw">${I('wrench')}</div><div class="tx"><div class="t">${loading ? 'Roadworks' : 'Not available'}</div><div class="s">${msg}</div></div></button></div>`;
  }
  if (!items.length) {
    const d = RW.data || {};
    const bits = [];
    if (d.nzta !== false) bits.push('nothing within 40 km of Whangārei on the NZTA list');
    if (d.council) bits.push('no council project is due to start in the next 12 months');
    const msg = bits.length ? bits[0][0].toUpperCase() + bits[0].slice(1) + (bits[1] ? ', and ' + bits[1] : '') + '.' : 'Nothing to show right now.';
    return head + `<div class="list" id="homeroadworks"><div class="row"><div class="ic rw">${I('wrench')}</div><div class="tx"><div class="t">No roadworks nearby</div><div class="s">${msg}</div></div></div></div>`;
  }
  // Both NZTA and council rows stay in the list. Only the first two show until Show more.
  const shown = rwMore ? items : items.slice(0, RW_HOME_SHORT);
  const rows = shown.map(w => {
    const href = w.url || (w.source === 'wdc' ? RW_WDC : RW_NZTA);
    return `<a class="row" href="${esc(href)}" target="_blank" rel="noopener"><div class="ic rw">${I('wrench')}</div><div class="tx"><div class="t">${esc(w.road)}</div><div class="s">${esc(rwWhen(w))}</div></div></a>`;
  }).join('');
  const rest = items.length - RW_HOME_SHORT;
  const more = rest > 0 ? `<button class="row" id="rwmore" type="button" aria-expanded="${rwMore ? 'true' : 'false'}" onclick="toggleRwMore()"><div class="ic rw">${I('wrench')}</div><div class="tx"><div class="t">${rwMore ? 'Show less' : 'Show more'}</div><div class="s">${rwMore ? 'Just the first two' : plural(rest, 'more roadwork')}</div></div></button>` : '';
  return head + `<div class="list" id="homeroadworks">${rows}${more}</div>`;
}

/* ================= TV (TVNZ 1, TVNZ 2, Three, plus Sky Starter) ================= */
// Freeview titles: Matt Huisman’s public NZ EPG (GitHub raw copy of i.mjh.nz). CORS is open.
// Sky Starter titles: NZXMLTV Sky, built from Sky’s own guide (sky.co.nz/tvguide) and published
// in the same GitHub repo as SkyGo/epg.xml.gz. Titles come only from those files.
// Nothing is invented: a channel with no current programme, or a failed fetch, says so.
const TV_EPG = 'https://raw.githubusercontent.com/matthuisman/i.mjh.nz/master/nz/epg.xml.gz';
const TV_SKY_EPG = 'https://raw.githubusercontent.com/matthuisman/i.mjh.nz/master/SkyGo/epg.xml.gz';
const TV_GUIDE = 'https://freeviewnz.tv/whats-on/tv-guide/';
const TV_SKY_GUIDE = 'https://www.sky.co.nz/tvguide';
const TV_AHEAD = 6 * 3600 * 1000;
const TV_SKY_MAX_AGE = 60 * 60 * 1000;
const TV_CHANNELS = [
  { id: 'mjh-tvnz-1', name: 'TVNZ 1', feed: 'freeview' },
  { id: 'mjh-tvnz-2', name: 'TVNZ 2', feed: 'freeview' },
  { id: 'mjh-three', name: 'Three', feed: 'freeview' },
  // Sky Starter, from the channel logos on Sky’s help page (help.sky.co.nz, Sky Starter). 001–003 are the three above.
  { id: 'sky.4', name: 'Sky Open', feed: 'sky' },
  { id: 'sky.5', name: 'Sky 5', feed: 'sky' },
  { id: 'sky.6', name: 'Vibe', feed: 'sky' },
  { id: 'sky.11', name: 'Sky Comedy', feed: 'sky' },
  { id: 'sky.12', name: 'Bravo', feed: 'sky' },
  { id: 'sky.13', name: 'eden', feed: 'sky' },
  { id: 'sky.16', name: 'TLC', feed: 'sky' },
  { id: 'sky.19', name: 'Whakaata Māori', feed: 'sky' },
  { id: 'sky.21', name: 'HGTV', feed: 'sky' },
  { id: 'sky.23', name: 'TVNZ DUKE', feed: 'sky' },
  { id: 'sky.24', name: 'Rush', feed: 'sky' },
  { id: 'sky.25', name: 'Juice TV', feed: 'sky' },
  { id: 'sky.26', name: 'J2', feed: 'sky' },
  { id: 'sky.62', name: 'Trackside 1', feed: 'sky' },
  { id: 'sky.63', name: 'Trackside 2', feed: 'sky' },
  { id: 'sky.70', name: 'Discovery', feed: 'sky' },
  { id: 'sky.83', name: 'Face TV', feed: 'sky' },
  { id: 'sky.86', name: 'Parliament TV', feed: 'sky' },
  { id: 'sky.90', name: 'Al Jazeera', feed: 'sky' },
  { id: 'sky.101', name: 'Sky Kids', feed: 'sky' },
  { id: 'sky.103', name: 'CBeebies', feed: 'sky' },
  { id: 'sky.201', name: 'Shine', feed: 'sky' },
  { id: 'sky.202', name: 'Daystar', feed: 'sky' },
  { id: 'sky.204', name: 'Hope Channel', feed: 'sky' },
  { id: 'sky.206', name: 'Firstlight', feed: 'sky' },
  { id: 'sky.309', name: 'CGTN Documentary', feed: 'sky' },
  { id: 'sky.310', name: 'CGTN', feed: 'sky' },
  { id: 'sky.311', name: 'Real Good Life Chinese Radio', feed: 'sky' },
  { id: 'sky.312', name: 'AM936', feed: 'sky' },
  { id: 'sky.313', name: 'FM 104.2', feed: 'sky' },
  { id: 'sky.421', name: 'RNZ National', feed: 'sky' },
  { id: 'sky.422', name: 'RNZ Concert', feed: 'sky' },
  { id: 'sky.423', name: 'Tahu FM', feed: 'sky' },
  { id: 'sky.501', name: 'TVNZ 1 +1', feed: 'sky' },
  { id: 'sky.502', name: 'TVNZ 2 +1', feed: 'sky' },
  { id: 'sky.503', name: 'Three +1', feed: 'sky' },
  { id: 'sky.504', name: 'TVNZ DUKE +1', feed: 'sky' }
];
const TV_IDS = new Set(TV_CHANNELS.map(c => c.id));
// Collapsed homepage card: free-to-air plus the main Sky channels. Show more reveals the rest of Sky Starter.
const TV_HOME_SHORT = new Set(['mjh-tvnz-1', 'mjh-tvnz-2', 'mjh-three', 'sky.4', 'sky.5', 'sky.6', 'sky.11', 'sky.12', 'sky.13']);
let tvMore = false;
let TV = null, tvBusy = false, tvFailed = false, tvTimer = null;
function loadTv() {
  try {
    const r = JSON.parse(localStorage.getItem('tv') || 'null');
    TV = r && r.at && r.data && r.data.now && typeof r.data.now === 'object' ? r : null;
    if (TV && TV.data) {
      if (!TV.data.slots || typeof TV.data.slots !== 'object') TV.data.slots = {};
      if (!TV.data.seen || typeof TV.data.seen !== 'object') TV.data.seen = {};
      if (!TV.data.feeds || typeof TV.data.feeds !== 'object') TV.data.feeds = { freeview: !!TV.data.now['mjh-tvnz-1'], sky: false };
    }
  } catch (e) { TV = null; }
}
function tvUnesc(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return ''; } })
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch (e) { return ''; } })
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function tvStamp(s) {
  const d = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-])(\d{2})(\d{2})?/.exec(String(s || '').trim());
  if (!d) return null;
  const utc = Date.UTC(+d[1], +d[2] - 1, +d[3], +d[4], +d[5], +d[6]);
  const off = (d[7] === '-' ? -1 : 1) * ((+d[8]) * 60 + (+d[9] || 0)) * 60000;
  const ms = utc - off;
  return Number.isFinite(ms) ? ms : null;
}
function tvTake(attrs, body, now, acc) {
  const ch = /\bchannel="([^"]+)"/.exec(attrs);
  if (!ch || !TV_IDS.has(ch[1])) return;
  acc.seen[ch[1]] = true;
  const start = tvStamp((/\bstart="([^"]+)"/.exec(attrs) || [])[1]);
  const until = tvStamp((/\bstop="([^"]+)"/.exec(attrs) || [])[1]);
  if (start == null || until == null || until <= now || start >= now + TV_AHEAD) return;
  const titleM = /<title\b[^>]*>([\s\S]*?)<\/title>/.exec(body);
  const title = titleM ? tvUnesc(titleM[1]).replace(/\s+/g, ' ').trim() : '';
  if (!title) return;
  const cats = [];
  const catRe = /<category\b[^>]*>([\s\S]*?)<\/category>/g;
  let catM;
  while ((catM = catRe.exec(body))) {
    const cat = tvUnesc(catM[1]).replace(/\s+/g, ' ').trim();
    if (cat && cats.indexOf(cat) === -1) cats.push(cat);
  }
  (acc.slots[ch[1]] || (acc.slots[ch[1]] = [])).push({ title, start, until, cats });
}
function tvFinish(acc, now) {
  const nowMap = {};
  Object.keys(acc.slots).forEach(id => {
    acc.slots[id].sort((a, b) => a.start - b.start);
    const cur = acc.slots[id].find(p => p.start <= now && now < p.until);
    if (cur) nowMap[id] = cur;
  });
  return { now: nowMap, seen: acc.seen, slots: acc.slots };
}
function tvEat(carry, now, acc) {
  let cut;
  while ((cut = carry.indexOf('</programme>')) !== -1) {
    const end = cut + 12;
    const start = carry.lastIndexOf('<programme', cut);
    if (start !== -1) {
      const open = carry.indexOf('>', start);
      if (open !== -1 && open < cut) tvTake(carry.slice(start, open), carry.slice(open + 1, cut), now, acc);
    }
    carry = carry.slice(end);
  }
  if (carry.length > 500000) {
    const keep = carry.lastIndexOf('<programme');
    carry = keep > 0 ? carry.slice(keep) : '';
  }
  return carry;
}
async function tvReadFeed(url, timeout) {
  if (typeof DecompressionStream !== 'function') throw new Error('gzip');
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeout);
  let res;
  try { res = await fetch(url, { signal: ctl.signal, cache: 'no-store' }); }
  finally { clearTimeout(timer); }
  if (!res.ok || !res.body) throw new Error('http ' + (res ? res.status : 0));
  const reader = res.body.pipeThrough(new DecompressionStream('gzip')).getReader();
  const dec = new TextDecoder();
  const acc = { seen: {}, slots: {} };
  const now = Date.now();
  let carry = '';
  while (true) {
    const step = await reader.read();
    carry += dec.decode(step.value || new Uint8Array(), { stream: !step.done });
    carry = tvEat(carry, now, acc);
    if (step.done) break;
  }
  return tvFinish(acc, now);
}
function tvClock(ms) {
  return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
}
function tvStillOn(item, now) {
  return !!(item && item.title && item.until > now && item.start <= now);
}
function tvOn(id, now) {
  const slots = TV && TV.data && TV.data.slots && TV.data.slots[id];
  if (slots && slots.length) {
    for (let i = 0; i < slots.length; i++) if (slots[i].start <= now && now < slots[i].until) return slots[i];
    return null;
  }
  const item = TV && TV.data && TV.data.now && TV.data.now[id];
  return tvStillOn(item, now) ? item : null;
}
function tvFeedFresh(feed, now) {
  if (!TV || !TV.data || !TV.data.feeds || !TV.data.feeds[feed]) return false;
  const at = feed === 'sky' ? (TV.data.skyAt || 0) : (TV.data.freeAt || TV.at || 0);
  if (feed === 'sky') return now - at < TV_SKY_MAX_AGE && now < at + TV_AHEAD;
  if (now - at >= 45000) return false;
  return TV_CHANNELS.filter(c => c.feed === 'freeview').every(c => {
    const item = tvOn(c.id, now);
    const seen = TV.data.seen && TV.data.seen[c.id];
    if (!seen) return false;
    if (!item) return true;
    return item.until - now > 45000;
  });
}
function scheduleTvRefresh() {
  if (tvTimer) { clearTimeout(tvTimer); tvTimer = null; }
  if (!TV || !TV.data) return;
  const now = Date.now();
  let next = Infinity;
  TV_CHANNELS.forEach(c => {
    const slots = (TV.data.slots && TV.data.slots[c.id]) || [];
    slots.forEach(p => {
      if (p.until > now) next = Math.min(next, p.until);
      if (p.start > now) next = Math.min(next, p.start);
    });
    const item = TV.data.now && TV.data.now[c.id];
    if ((!slots.length) && item && item.until > now) next = Math.min(next, item.until);
  });
  if (TV.data.feeds && TV.data.feeds.freeview) next = Math.min(next, (TV.data.freeAt || TV.at) + 45000);
  if (TV.data.feeds && TV.data.feeds.sky) next = Math.min(next, (TV.data.skyAt || TV.at) + TV_SKY_MAX_AGE);
  if (!Number.isFinite(next)) return;
  const wait = Math.min(Math.max(1500, next - now + 800), 6 * 3600 * 1000);
  tvTimer = setTimeout(() => { tvTimer = null; refreshTv(false); }, wait);
}
async function refreshTv(force = false) {
  const now = Date.now();
  const needFree = force || !tvFeedFresh('freeview', now);
  const needSky = force || !tvFeedFresh('sky', now);
  if (tvBusy || (!needFree && !needSky)) { scheduleTvRefresh(); return; }
  tvBusy = true; if (force) updTv();
  const jobs = [];
  if (needFree) jobs.push(tvReadFeed(TV_EPG, 20000).then(d => ({ feed: 'freeview', d })).catch(() => ({ feed: 'freeview', d: null })));
  if (needSky) jobs.push(tvReadFeed(TV_SKY_EPG, 45000).then(d => ({ feed: 'sky', d })).catch(() => ({ feed: 'sky', d: null })));
  const results = await Promise.all(jobs);
  tvBusy = false;
  if (!TV || !TV.data) TV = { at: 0, data: { now: {}, seen: {}, slots: {}, feeds: {} } };
  const data = TV.data;
  data.now = data.now || {}; data.seen = data.seen || {}; data.slots = data.slots || {}; data.feeds = Object.assign({}, data.feeds);
  let ok = 0;
  results.forEach(r => {
    if (!r.d) {
      if (!data.feeds[r.feed]) data.feeds[r.feed] = false;
      return;
    }
    ok++;
    data.feeds[r.feed] = true;
    if (r.feed === 'sky') data.skyAt = Date.now(); else data.freeAt = Date.now();
    TV_CHANNELS.filter(c => c.feed === r.feed).forEach(c => {
      delete data.now[c.id]; delete data.seen[c.id]; delete data.slots[c.id];
      if (r.d.seen[c.id]) data.seen[c.id] = true;
      if (r.d.slots[c.id]) data.slots[c.id] = r.d.slots[c.id];
      if (r.d.now[c.id]) data.now[c.id] = r.d.now[c.id];
    });
  });
  tvFailed = ok === 0 && results.length > 0 && TV_CHANNELS.every(c => !(data.feeds && data.feeds[c.feed]));
  if (ok) {
    TV.at = Date.now();
    try { localStorage.setItem('tv', JSON.stringify(TV)); } catch (e) { }
  }
  scheduleTvRefresh();
  updTv();
}
function updTv() {
  if (sheetOpen) return;
  const h = (location.hash || '#home').slice(1);
  if (((h === 'home' || h === '') && !homeEdit) || h === 'tv') {
    const v = $('#view'), top = v ? v.scrollTop : 0;
    render(); if (v) v.scrollTop = top;
  }
}
function toggleTvMore() {
  tvMore = !tvMore;
  updTv();
}
function tvGuideBody() {
  const now = Date.now();
  const channels = tvMore ? TV_CHANNELS : TV_CHANNELS.filter(ch => TV_HOME_SHORT.has(ch.id));
  const rows = channels.map(ch => {
    const data = TV && TV.data;
    const item = tvOn(ch.id, now);
    if (item) {
      return `<div class="row"><div class="ic tv">${I('tv')}</div><div class="tx"><div class="t">${esc(ch.name)}</div><div class="s">${esc(item.title)} · until ${esc(tvClock(item.until))}</div></div></div>`;
    }
    const seen = data && data.seen && data.seen[ch.id];
    const feedOk = !!(data && data.feeds && data.feeds[ch.feed]);
    const loading = (tvBusy && !feedOk) || (!data && !tvFailed && navigator.onLine !== false);
    let sub = 'Nothing listed right now.';
    if (loading) sub = 'Checking the guide…';
    else if (!feedOk) sub = 'Couldn’t load the listing.';
    else if (!seen) sub = ch.feed === 'sky' ? 'Not in the Sky guide.' : 'Couldn’t load the listing.';
    return `<button class="row" onclick="refreshTv(true)"><div class="ic tv">${I('tv')}</div><div class="tx"><div class="t">${esc(ch.name)}</div><div class="s">${esc(sub)}</div></div></button>`;
  });
  const more = `<button class="row" id="tvmore" type="button" aria-expanded="${tvMore ? 'true' : 'false'}" onclick="toggleTvMore()"><div class="ic tv">${I('tv')}</div><div class="tx"><div class="t">${tvMore ? 'Show less' : 'Show more'}</div><div class="s">${tvMore ? 'Main channels only' : 'The rest of Sky Starter'}</div></div></button>`;
  return `<div class="list" id="hometv">${rows.join('')}${more}</div>`;
}
function homeTv() {
  const link = `<a href="${TV_GUIDE}" target="_blank" rel="noopener">Freeview</a> · <a href="${TV_SKY_GUIDE}" target="_blank" rel="noopener">Sky</a>`;
  return `<div class="sec">What’s on TV ${link}</div>` + tvGuideBody();
}
// 1.91.0: the same listings as the Home card, on their own tab. Titles come only from those guides.
function TvGuide() {
  const link = `<a href="${TV_GUIDE}" target="_blank" rel="noopener">Freeview</a> · <a href="${TV_SKY_GUIDE}" target="_blank" rel="noopener">Sky</a>`;
  return header('TV guide', 'What’s on now') +
    `<div class="sec">What’s on TV ${link}</div>` + tvGuideBody() +
    `<div class="foot">TVNZ 1, TVNZ 2, Three and Sky Starter, from the Freeview and Sky guides. Show more lists the rest of Sky Starter. Nothing is added that isn’t in those listings.</div>`;
}

/* ================= EVENTS (Whangārei District Council "What's On", via the app's service) ================= */
const EV_MAX_AGE = 3 * 3600 * 1000;
const WDC_WHATSON = 'https://www.wdc.govt.nz/Events/Whats-On';
let EVS = null, evBusy = false, evFailed = false, evQuery = '', evCat = 'All';
function loadEvs() { try { const e = JSON.parse(localStorage.getItem('events') || 'null'); EVS = e && e.at && e.data && Array.isArray(e.data.events) ? e : null; } catch (x) { EVS = null; } }
async function refreshEvents(force = false) {
  const thin = EVS && !(EVS.data.events || []).some(e => (e.cats || []).includes('Movies'));
  if (evBusy || (!force && EVS && Date.now() - EVS.at < EV_MAX_AGE && !thin)) return;
  if (!RELAY_URL) { evFailed = true; updEvents(); return; }
  evBusy = true; if (force) updEvents();
  let data = null;
  try { data = await getJSON(RELAY_URL + '/events', 25000); } catch (e) { }
  evBusy = false;
  if (data && Array.isArray(data.events)) { EVS = { at: Date.now(), data }; evFailed = false; try { localStorage.setItem('events', JSON.stringify(EVS)); } catch (e) { } }
  else evFailed = true;
  updEvents();
}
function updEvents() {
  if (sheetOpen) return;
  const h = (location.hash || '#home').slice(1);
  if (h === 'events' || ((h === 'home' || h === '') && !homeEdit) || h === 'more') {
    const v = $('#view'), top = v.scrollTop, q = document.activeElement && document.activeElement.id === 'evq';
    render(); v.scrollTop = top;
    if (q) { const i = document.getElementById('evq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }
}
// Leave out anything tagged Silver Festival (title, tags, categories, or the event text).
function isSilverFestival(e) {
  if (!e || typeof e !== 'object') return false;
  const bits = [e.title, e.venue, e.desc, e.url, ...(Array.isArray(e.cats) ? e.cats : []), ...(Array.isArray(e.tags) ? e.tags : [])];
  return bits.join('\n').toLowerCase().includes('silver festival');
}
function upcomingEvents() {
  if (!EVS) return [];
  const T = todayISO(), d = new Date(), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return EVS.data.events.filter(e => !isSilverFestival(e) && (e.end || e.date) >= T && !(e.date === T && !e.end && e.endTime && e.endTime <= hm))
    .map(e => e.date < T ? Object.assign({}, e, { date: T }) : e);
}
const evById = id => (EVS ? EVS.data.events.find(e => e.id === id && !isSilverFestival(e)) : null);
const evAppt = id => S.appts.find(a => a.evId === id);
function evWhen(e) {
  if (e.time) return fmtTime(e.time) + (e.endTime ? ' – ' + fmtTime(e.endTime) : '');
  return e.timeKnown === false ? 'Time on the event page' : 'All day';
}
function evCats() {
  const n = {};
  upcomingEvents().forEach(e => (e.cats || []).forEach(c => { n[c] = (n[c] || 0) + 1; }));
  return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b)).slice(0, 10);
}
function evMatches(e) {
  if (evCat !== 'All' && !(e.cats || []).includes(evCat)) return false;
  const q = evQuery.trim().toLowerCase();
  return !q || [e.title, e.venue, e.desc, (e.cats || []).join(' ')].join(' ').toLowerCase().includes(q);
}
function evCard(e) {
  const a = evAppt(e.id);
  const head = isWhangareiGrowersMarket(e)
    ? `<div class="evhead">${growersMarketThumb()}<div class="evt">${esc(e.title)}</div></div>`
    : `<div class="evt">${esc(e.title)}</div>`;
  return `<div class="card evcard" data-ev="${esc(e.id)}">${head}
    <div class="evm">${I('clock')}<span>${esc(evWhen(e))}${e.end ? ` · until ${fmtW(e.end)}` : ''}</span></div>
    ${e.venue ? `<div class="evm">${I('pin')}<span>${esc(e.venue)}</span></div>` : ''}
    ${e.desc ? `<div class="evd">${esc(e.desc)}</div>` : ''}
    ${(e.cats && e.cats.length) || e.cost ? `<div class="evtags">${(e.cats || []).map(c => `<span>${esc(c)}</span>`).join('')}${e.cost ? `<span class="cost">${esc(e.cost)}</span>` : ''}</div>` : ''}
    <div class="btns">${a ? `<button class="btn small added" onclick="apptForm('${a.id}')" aria-label="Added to your calendar: ${esc(e.title)}">${I('check')} Added</button>`
      : `<button class="btn small primary" onclick="addEvent(${jsArg(e.id)})" aria-label="Add to calendar: ${esc(e.title)}">${I('plus')} Add to calendar</button>`}
      <a class="btn small" href="${esc(e.url)}" target="_blank" rel="noopener">Details ${I('ext')}</a></div></div>`;
}
function evList() {
  const list = upcomingEvents().filter(evMatches);
  if (!list.length) return `<div class="card empty"><div class="t">No events match</div><div class="s">Try another word or category.</div></div>`;
  const groups = {};
  list.forEach(e => (groups[e.date] = groups[e.date] || []).push(e));
  const dayLabel = s => { const d = daysLeft(s); return (d === 0 ? 'Today · ' : d === 1 ? 'Tomorrow · ' : '') + fmtW(s); };
  return Object.keys(groups).map(k => `<div class="agday">${dayLabel(k)}</div>${groups[k].map(evCard).join('')}`).join('');
}
function setEvCat(c) { evCat = c; render(); }
function Events() {
  const back = `<button class="back" onclick="go('#more')">${I('left')} More</button>`;
  const head = back + header('Events', 'What’s on in Whangārei · next 60 days');
  const src = `<a href="${WDC_WHATSON}" target="_blank" rel="noopener">Whangārei District Council’s What’s On</a>, <a href="https://www.eventcinemas.co.nz/Cinema/Whangarei" target="_blank" rel="noopener">Event Cinemas</a> and local markets`;
  const town = `<div class="card" id="towncard"><div class="t" style="font-weight:800;margin-bottom:6px">Around town</div>
    <div class="s">Movies are at Event Cinemas, 18 James Street. CineNexus has been mentioned for Bank Street, but there’s no opening date, so the sessions here are Event’s.</div>
    <div class="s" style="margin-top:6px">Worth a look when something’s on: the Butter Factory at 8 Butter Factory Lane and 1905 for live music, Octagon Theatre and Forum North for shows, Quarry Arts Centre and Reyburn House for art, and McKay Stadium for expos. The Canopy Night Market is Friday evenings at the Town Basin in season.</div></div>`;
  if (!EVS) {
    if (evBusy || (!evFailed && navigator.onLine !== false)) return head + town + `<div class="card empty"><div class="t">Loading events…</div><div class="s">Getting what’s on from the council’s events page, plus movies and markets.</div></div>`;
    return head + town + `<div class="card empty" id="everr"><div class="t">Couldn’t load events</div><div class="s">Check your internet connection and try again. You can also look at ${src}.</div>
      <button class="btn primary" style="flex:none;padding:12px 22px" onclick="refreshEvents(true)">${I('refresh')} Try again</button></div>`;
  }
  const up = upcomingEvents(), cats = evCats();
  return head + town +
    (evFailed ? `<div class="callout">${I('wifi')}<div>Couldn’t refresh events just now. Showing the list saved on this phone (${ago(EVS.at)}). <button style="color:inherit;font-weight:700;text-decoration:underline" onclick="refreshEvents(true)">Try again</button></div></div>` : '') +
    (up.length ? `<label class="search">${I('search')}<input id="evq" type="search" placeholder="Search events" value="${esc(evQuery)}" aria-label="Search events" oninput="evQuery=this.value;document.getElementById('evlist').innerHTML=evList()"></label>
      ${cats.length ? `<div class="chips scroll">${['All', ...cats].map(c => `<button class="chip ${c === evCat ? 'on' : ''}" onclick="setEvCat(${jsArg(c)})">${esc(c)}</button>`).join('')}</div>` : ''}
      <div id="evlist">${evList()}</div>`
      : `<div class="card empty"><div class="t">No events listed for the next 60 days</div><div class="s">Have a look at ${src} for anything new.</div></div>`) +
    `<div class="foot">Events from ${src}. Movies and markets are added alongside the council’s list. Check times and details with the organiser before you go.<br>Updated ${ago(EVS.data.updated ? Date.parse(EVS.data.updated) : EVS.at)}</div>`;
}
async function addEvent(id) {
  const e = evById(id);
  if (!e || evAppt(id)) return;
  const s = snap();
  const notes = [e.time && e.endTime ? evWhen(e) : (!e.time && e.timeKnown === false ? 'Check the time on the event page' : ''), e.venue, e.end ? 'Runs until ' + fmtLong(e.end) : ''].filter(Boolean).join(' · ');
  S.appts.push({ id: uid('appt'), title: e.title, date: e.date < todayISO() ? todayISO() : e.date, time: e.time || '', notes, evId: e.id, evUrl: e.url });
  await save(); updEvents(); toast('Added to your calendar.', 'Undo', undoTo(s));
}
function ytTrailerId(v) {
  if (v && typeof v === 'object') v = v.id || v.youtube || v.youtubeId || v.url || v.src || '';
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/|i\.ytimg\.com\/vi\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}
function movieField(e, re) {
  for (const k of Object.keys(e)) {
    if (!re.test(k) || e[k] == null || e[k] === '') continue;
    return e[k];
  }
  return '';
}
// Confirmed trailers for current Event Cinemas titles that arrive without a YouTube id.
// The key is the title with punctuation and extra spaces removed, so a different film cannot match.
const MOVIE_TRAILERS = {
  'verity': 'xdPMKhjMSFs',
  'the social reckoning': '3RFFgrB9YlI',
  'tad and the magic lamp': '8-Bjo_rXCkM',
  'wildwood': 'dtr5JL1zkiM'
};
function movieTitleKey(title) {
  return String(title || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
// Home only. A movie shows a trailer still from a YouTube id or https image already on the event,
// or from MOVIE_TRAILERS when the title matches a film above.
function movieTrailerPicture(e) {
  if (!e || !Array.isArray(e.cats) || !e.cats.includes('Movies')) return '';
  const id = ytTrailerId(movieField(e, /^(trailer|trailerId|trailerUrl|youtube|youtubeId|yt|ytId|videoId)$/i)) || MOVIE_TRAILERS[movieTitleKey(e.title)] || '';
  if (id) return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
  let raw = movieField(e, /^(image|imageUrl|img|poster|thumb|thumbnail|picture|photo)$/i);
  const fromYt = ytTrailerId(raw);
  if (fromYt) return 'https://i.ytimg.com/vi/' + fromYt + '/hqdefault.jpg';
  if (raw && typeof raw === 'object') raw = raw.url || raw.src || raw.href || '';
  if (typeof raw !== 'string') return '';
  const url = raw.trim();
  if (!/^https:\/\/\S+$/i.test(url) || url.length > 500 || url === e.url) return '';
  return url;
}
// Shane's photo of the Whangārei Growers Market stall. Only this title, not other markets or movies.
const GROWERS_MARKET_PIC = 'images/whangarei-growers-market.jpg';
function isWhangareiGrowersMarket(e) {
  const t = String(e && e.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t.includes('whangarei growers market');
}
function growersMarketThumb() {
  return `<img class="evthumb" src="${esc(GROWERS_MARKET_PIC)}" alt="" width="92" height="52" loading="lazy" decoding="async">`;
}
function homeEvents() {
  const next = upcomingEvents().slice(0, homeEventCount());
  const row = e => {
    const pic = movieTrailerPicture(e) || (isWhangareiGrowersMarket(e) ? GROWERS_MARKET_PIC : '');
    const mark = pic
      ? `<img class="evthumb" src="${esc(pic)}" alt="" width="92" height="52" loading="lazy" decoding="async">`
      : `<div class="ic ev">${I('ticket')}</div>`;
    return `<button class="row" onclick="go('#events')">${mark}<div class="tx"><div class="t">${esc(e.title)}</div>
    <div class="s">${daysLeft(e.date) === 0 ? 'Today' : fmtW(e.date)}${e.time ? ' · ' + fmtTime(e.time) : ''}${e.venue ? ' · ' + esc(e.venue.split(',')[0]) : ''}</div></div>${evAppt(e.id) ? '<span class="pill fine">Added</span>' : ''}</button>`;
  };
  return `<div class="sec">What’s on in Whangārei <a href="#events">All events</a></div>
    <div class="list">${next.length ? next.map(row).join('') : `<button class="row" onclick="go('#events')"><div class="ic ev">${I('ticket')}</div><div class="tx"><div class="t">See what’s on</div><div class="s">Local events for the next 60 days</div></div>${I('right')}</button>`}</div>`;
}


/* ================= VIDEOS ================= */
// VIDEO_LIST_UPDATED = '2026-10-03'
const VIDEO_CATS = [
  { id: 'tech', name: 'Latest technology', sub: 'New technology, explained' },
  { id: 'nz', name: 'NZ product reviews', sub: 'Product tech reviews from New Zealand' },
  { id: 'garden', name: 'Gardening', sub: 'Citrus, tomatoes, strawberries and peaches' },
  { id: 'time', name: 'Time organisation', sub: 'Planning the week and using your time' },
  { id: 'cook', name: 'Cooking', sub: 'Gluten-free dinners only' },
  { id: 'reno', name: 'Renovation', sub: 'Beginner room and painting jobs' },
  { id: 'cars', name: 'Cars', sub: 'Maintenance and the Warrant of Fitness' },
  { id: 'pets', name: 'Cats and dogs', sub: 'Care, training and day-to-day with cats and dogs' },
  { id: 'travel', name: 'Travel', sub: 'Trip ideas and how to plan them' },
  // extra: not on until he adds it from search, so today's categories stay as they are
  { id: 'diy', name: 'DIY', sub: 'Small jobs around the house', extra: true },
  { id: 'gf', name: 'Gluten-free cooking', sub: 'Gluten-free baking and bread', extra: true },
  { id: 'wood', name: 'Woodworking', sub: 'Beginner projects with basic tools', extra: true }
];
const VIDEOS = [
  { id: 'ohqxP8EEumo', title: 'iPhone 18 Pro Review: All About that Chip', channel: 'Marques Brownlee', category: 'tech', url: 'https://www.youtube.com/watch?v=ohqxP8EEumo', reason: 'MKBHD’s review of the iPhone 18 Pro and what the new chip changes.' },
  { id: 'zt0JA5rxdfM', title: 'AI Trends 2026: Quantum, Agentic AI & Smarter Automation', channel: 'IBM Technology', category: 'tech', url: 'https://www.youtube.com/watch?v=zt0JA5rxdfM', reason: 'What IBM expects from AI, quantum computing and automation in 2026.' },
  { id: '9OQ5vaYbGV0', title: 'Google’s AI endgame is here… everything you missed at I/O 2026', channel: 'Fireship', category: 'tech', url: 'https://www.youtube.com/watch?v=9OQ5vaYbGV0', reason: 'A short recap of what Google showed at I/O 2026.' },
  { id: 'No-JPdFvYWU', title: 'The one OpenAI announcement that can actually make you money...', channel: 'Fireship', category: 'tech', url: 'https://www.youtube.com/watch?v=No-JPdFvYWU', reason: 'A short recap of OpenAI DevDay 2026 and the one launch that could earn developers money.' },
  { id: 'O9kNF_xOM5s', title: 'AV Access iDock C10 vs M10 vs B23 — Which One Do You Need?', channel: 'PB Tech', category: 'nz', url: 'https://www.youtube.com/watch?v=O9kNF_xOM5s', reason: 'PB Tech compares three docks that let a laptop and a desktop share one screen and keyboard.' },
  { id: 'l7814Pw_eMU', title: 'I Bought The CHEAPEST Gaming PC from Bunnings...', channel: 'TechSauce', category: 'nz', url: 'https://www.youtube.com/watch?v=l7814Pw_eMU', reason: 'A full look at a budget gaming PC bought from Bunnings in New Zealand.' },
  { id: 'nvFEGPOXXi0', title: 'I Bought An EXPENSIVE Gaming PC from JB Hi-Fi…', channel: 'TechSauce', category: 'nz', url: 'https://www.youtube.com/watch?v=nvFEGPOXXi0', reason: 'A full look at a high-end gaming PC bought from JB Hi-Fi in New Zealand.' },
  { id: '7xSWkBSLmEM', title: 'I BOUGHT THE CHEAPEST GAMING LAPTOP FROM JB HI-FI 😭🫣', channel: 'TechSauce', category: 'nz', url: 'https://www.youtube.com/watch?v=7xSWkBSLmEM', reason: 'A hands-on look at a cheap gaming laptop from JB Hi-Fi in New Zealand.' },
  { id: 'jkAKY0Gic3E', title: 'How to plant citrus: The Ian Tolley Way', channel: 'Gardening Australia', category: 'garden', url: 'https://www.youtube.com/watch?v=jkAKY0Gic3E', reason: 'How to plant citrus trees and pick the right rootstock for the soil.' },
  { id: 'HBFNA-Evkag', title: 'How To Grow PERFECT Citrus In Containers', channel: 'Epic Gardening', category: 'garden', url: 'https://www.youtube.com/watch?v=HBFNA-Evkag', reason: 'How to grow citrus in containers, useful for a New Zealand spring garden.' },
  { id: 'stw9KEpSNEg', title: 'Growing Strawberries In Pots Or Containers!', channel: 'The Ripe Tomato Farms', category: 'garden', url: 'https://www.youtube.com/watch?v=stw9KEpSNEg', reason: 'How to grow strawberries in pots or containers.' },
  { id: '5XXwMdPRhbw', title: "21 Tomatoes We're Planting This Year", channel: 'Epic Gardening', category: 'garden', url: 'https://www.youtube.com/watch?v=5XXwMdPRhbw', reason: 'Twenty-one tomato varieties to plant this season, for spring planting.' },
  { id: 'jozNEpY8iik', title: 'How to Plan Your Week Effectively', channel: 'The Art of Improvement', category: 'time', url: 'https://www.youtube.com/watch?v=jozNEpY8iik', reason: 'A simple way to plan the week so the important jobs get a time.' },
  { id: 'n3kNlFMXslo', title: 'How to gain control of your free time | Laura Vanderkam | TED', channel: 'TED', category: 'time', url: 'https://www.youtube.com/watch?v=n3kNlFMXslo', reason: 'Laura Vanderkam on making room in a busy week for what matters.' },
  { id: 'NL2Vq32jyeo', title: '8 Simple Habits That Save Me 20+ Hours a Week', channel: 'Ali Abdaal', category: 'time', url: 'https://www.youtube.com/watch?v=NL2Vq32jyeo', reason: 'Eight simple habits that free up more time in the week.' },
  { id: 'WONRS7BLh4g', title: 'How To Actually Achieve Your Goals in 2026 (Evidence-Based)', channel: 'Ali Abdaal', category: 'time', url: 'https://www.youtube.com/watch?v=WONRS7BLh4g', reason: 'Evidence-based ways to set and actually hit goals for the year.' },
  { id: 'MkfYM6oiLMo', title: 'Easy Gluten-Free Chicken Piccata In Just 20 Minutes!', channel: 'Matthew Augusta', category: 'cook', url: 'https://www.youtube.com/watch?v=MkfYM6oiLMo', reason: 'A gluten-free chicken piccata you can cook in about 20 minutes.' },
  { id: '20MqQoe8rtA', title: "Becky Excell's Air Fryer Creamy Cheesy Stuffed Chicken", channel: 'Coeliac UK', category: 'cook', url: 'https://www.youtube.com/watch?v=20MqQoe8rtA', reason: 'Becky Excell’s gluten-free air-fryer creamy cheesy stuffed chicken.' },
  { id: 'pXslUEvVXoc', title: 'One Pan Chicken Marsala (Dairy Free & Gluten Free) | Giada De Laurentiis', channel: 'Giada De Laurentiis', category: 'cook', url: 'https://www.youtube.com/watch?v=pXslUEvVXoc', reason: 'A one-pan gluten-free chicken marsala for a weeknight dinner.' },
  { id: 'eMQ1LcUm-n4', title: '30 Days of Budget Meals 💕 Day 9 - Creamy Chicken Tomato Pasta - an easy gluten free recipe', channel: 'Becky Excell', category: 'cook', url: 'https://www.youtube.com/watch?v=eMQ1LcUm-n4', reason: 'Becky Excell’s creamy gluten-free chicken tomato pasta for a budget dinner.' },
  { id: 'LBpkMqVOJmk', title: 'Home Remodeling Tips For Beginners - The Family Room Remodel Part 1', channel: 'JFKreations', category: 'reno', url: 'https://www.youtube.com/watch?v=LBpkMqVOJmk', reason: 'Beginner tips for remodelling a family room, from the start of the job.' },
  { id: 'CRXCB_3gLok', title: 'How to Paint a Room - Basic Painting Tips', channel: 'Lowe\'s Home Improvement', category: 'reno', url: 'https://www.youtube.com/watch?v=CRXCB_3gLok', reason: 'The basic steps for painting a room.' },
  { id: 'ZcilSwuaHog', title: 'How to Renovate a Living Room - D.I.Y. At Bunnings', channel: 'Bunnings Warehouse', category: 'reno', url: 'https://www.youtube.com/watch?v=ZcilSwuaHog', reason: 'How to renovate a living room, shown with materials from Bunnings.' },
  { id: 'kbocoSRrVOI', title: 'How To Install Plasterboard - Bunnings Warehouse', channel: 'Bunnings Warehouse', category: 'reno', url: 'https://www.youtube.com/watch?v=kbocoSRrVOI', reason: 'How to install plasterboard, shown with materials from Bunnings.' },
  { id: 'HJZXHfs0fgA', title: 'How To Maintain Your Car For Beginners | The Ultimate Guide to Making Your Car Last Longer', channel: 'The Car Care Nut', category: 'cars', url: 'https://www.youtube.com/watch?v=HJZXHfs0fgA', reason: 'A beginner’s guide to the checks that help a car last.' },
  { id: '25-HG471MIc', title: 'A Mechanics Guide To Maintaining Your Car', channel: 'EricTheCarGuy', category: 'cars', url: 'https://www.youtube.com/watch?v=25-HG471MIc', reason: 'A mechanic’s walk-through of routine car maintenance.' },
  { id: 'CY1MLjYOf1o', title: 'Top tips to passing your WoF', channel: 'VTNZ', category: 'cars', url: 'https://www.youtube.com/watch?v=CY1MLjYOf1o', reason: 'VTNZ’s tips for getting a car through its Warrant of Fitness.' },
  { id: 'w_wNj7387Ck', title: 'Warrant of Fitness (WoF) in New Zealand: Everything You Need to Know', channel: 'Euromotive', category: 'cars', url: 'https://www.youtube.com/watch?v=w_wNj7387Ck', reason: 'What a Warrant of Fitness covers for a car in New Zealand.' },
  { id: 'vHrHBZIA5h4', title: 'How to train your dog to leave your cat alone', channel: 'Zak George', category: 'pets', url: 'https://www.youtube.com/watch?v=vHrHBZIA5h4', reason: 'How to train a dog to leave a cat alone.' },
  { id: 'GvgDcBpKhAQ', title: 'How to Train a High Energy Dog Who Doesn’t Listen', channel: 'Zak George', category: 'pets', url: 'https://www.youtube.com/watch?v=GvgDcBpKhAQ', reason: 'How to train a high-energy dog that doesn’t listen.' },
  { id: '2Ex99RuKqAw', title: "Instantly Improve Your Cat's Life with these 7 Things", channel: 'Jackson Galaxy', category: 'pets', url: 'https://www.youtube.com/watch?v=2Ex99RuKqAw', reason: "Seven things that can improve a cat's day-to-day life." },
  { id: 'AW77b_qat1g', title: "7 Secrets to a Long, Healthy Dog Life: Dr. Jones' Tips for Aging Dogs", channel: 'Veterinary Secrets', category: 'pets', url: 'https://www.youtube.com/watch?v=AW77b_qat1g', reason: "A vet's tips for a longer, healthier life for an aging dog." },
  { id: 'nWjBe3P_JiA', title: 'NORTH ISLAND, NEW ZEALAND (2025) | 13 Beautiful Places to Visit on a North Island Road Trip (+ Tips)', channel: 'World Wild Hearts', category: 'travel', url: 'https://www.youtube.com/watch?v=nWjBe3P_JiA', reason: 'Thirteen places to visit on a North Island road trip, with travel tips.' },
  { id: 'XCsMvEMX11Y', title: 'New Zealand -  Watch BEFORE You Go! Essential Travel Tips NZ', channel: 'CJ Explores', category: 'travel', url: 'https://www.youtube.com/watch?v=XCsMvEMX11Y', reason: 'Essential travel tips to watch before a trip to New Zealand.' },
  { id: 'E47FGfv14Mc', title: 'How to Plan a Trip for Solo or Group Travel', channel: 'Brady Skye', category: 'travel', url: 'https://www.youtube.com/watch?v=E47FGfv14Mc', reason: 'How to plan a trip for solo or group travel.' },
  { id: 'PR0iIva4Ues', title: "You're Planning Trips Wrong (Do This Instead)", channel: 'Away Together w/ Nik and Allie', category: 'travel', url: 'https://www.youtube.com/watch?v=PR0iIva4Ues', reason: 'A clearer way to plan trips than packing the schedule full.' },
  { id: 'zMH61Yabdj0', title: 'How to Repair a Leaking Faucet | This Old House', channel: 'This Old House', category: 'diy', url: 'https://www.youtube.com/watch?v=zMH61Yabdj0', reason: 'How to stop a tap from leaking.' },
  { id: 'PLGmTzEGSIY', title: 'How to Patch a Drywall Hole | Ask This Old House', channel: 'This Old House', category: 'diy', url: 'https://www.youtube.com/watch?v=PLGmTzEGSIY', reason: 'How to patch small, medium and large holes in a wall.' },
  { id: '3-zmU6upbUo', title: 'How to Understand Two-Prong Outlets | Ask This Old House', channel: 'This Old House', category: 'diy', url: 'https://www.youtube.com/watch?v=3-zmU6upbUo', reason: 'What two-prong outlets mean and when they need updating.' },
  { id: 'cWmb1D4Wciw', title: 'DIY Floating Shelves | $15 Per Shelf', channel: 'Nathan Builds', category: 'diy', url: 'https://www.youtube.com/watch?v=cWmb1D4Wciw', reason: 'How to build simple floating shelves from a sheet of plywood.' },
  { id: '4PU336S-fA4', title: 'GREGGS-STYLE! Gluten-free Iced Buns Recipe 🤤 | Baking with Becky', channel: 'Becky Excell', category: 'gf', url: 'https://www.youtube.com/watch?v=4PU336S-fA4', reason: 'Becky Excell’s gluten-free iced buns, baked from scratch.' },
  { id: 'obvokggK0ag', title: 'The Softest Gluten-Free Sandwich Bread | Easy, Fluffy & Stays Fresh for Days!', channel: 'theloopywhisk', category: 'gf', url: 'https://www.youtube.com/watch?v=obvokggK0ag', reason: 'A soft gluten-free sandwich bread that stays fresh for days.' },
  { id: 'WQyK_jTLMsY', title: '3-Ingredient Gluten-Free Flatbread | Liv Baking', channel: 'Bigger Bolder Baking with Gemma Stafford', category: 'gf', url: 'https://www.youtube.com/watch?v=WQyK_jTLMsY', reason: 'A gluten-free flatbread made with almond flour and tapioca starch.' },
  { id: 'H5gZO37HX0E', title: 'How to Make Gluten Free Banana BREAD (ONE BOWL,  SUGAR FREE, DAIRY FREE OPTION) || How To Coeliac', channel: 'How To Coeliac', category: 'gf', url: 'https://www.youtube.com/watch?v=H5gZO37HX0E', reason: 'A one-bowl gluten-free banana bread.' },
  { id: '8vFGrNjT4P4', title: 'How to make a basic box. And why you need to know how | Woodworking BASICS | Power Tools', channel: 'Steve Ramsey - Woodworking for Mere Mortals', category: 'wood', url: 'https://www.youtube.com/watch?v=8vFGrNjT4P4', reason: 'Why a simple box is the first woodworking project to learn.' },
  { id: 'mvO6zaIUO18', title: 'Beginner\'s guide to pocket hole joinery | WOODWORKING BASICS', channel: 'Steve Ramsey - Woodworking for Mere Mortals', category: 'wood', url: 'https://www.youtube.com/watch?v=mvO6zaIUO18', reason: 'How pocket-hole joints work, for a beginner.' },
  { id: 'T5nt7f8tMXA', title: 'Make this simple patio table with just a miter saw', channel: 'Steve Ramsey - Woodworking for Mere Mortals', category: 'wood', url: 'https://www.youtube.com/watch?v=T5nt7f8tMXA', reason: 'A simple outdoor table you can build with a miter saw.' },
  { id: 'QLSYADN_BzM', title: "2026 BEGINNERS' GUIDE to the TOOLS and SUPPLIES you need to start a woodworking hobby", channel: 'Steve Ramsey - Woodworking for Mere Mortals', category: 'wood', url: 'https://www.youtube.com/watch?v=QLSYADN_BzM', reason: 'Which tools and supplies a beginner needs to start woodworking in 2026.' }
];
// Extra videos for each category. They stay off the list until a left swipe, then the next one takes that row's place.
// Every id was confirmed with YouTube oembed. Titles and channels are the oembed text, not written by hand.
const VIDEO_RESERVE = [
  {"id": "0Rp9KJCEIvg", "title": "The most interesting hack in history just got weirder...", "channel": "Fireship", "category": "tech", "reserve": true, "url": "https://www.youtube.com/watch?v=0Rp9KJCEIvg", "reason": "Another video from this category, ready when you skip one."},
  {"id": "TbkUKCm3CHQ", "title": "An ex-OpenAI researcher just deleted language from the LLM...", "channel": "Fireship", "category": "tech", "reserve": true, "url": "https://www.youtube.com/watch?v=TbkUKCm3CHQ", "reason": "Another video from this category, ready when you skip one."},
  {"id": "Fx0x3oI_ngo", "title": "How Expensive is the Fastest PC of 2026?", "channel": "Linus Tech Tips", "category": "tech", "reserve": true, "url": "https://www.youtube.com/watch?v=Fx0x3oI_ngo", "reason": "Another video from this category, ready when you skip one."},
  {"id": "B9UYbXqBnhk", "title": "I Bought The CHEAPEST Gaming PC from PB Tech…", "channel": "TechSauce", "category": "nz", "reserve": true, "url": "https://www.youtube.com/watch?v=B9UYbXqBnhk", "reason": "Another video from this category, ready when you skip one."},
  {"id": "N2iC1NpHuNQ", "title": "I Bought an Alienware for 50% Off... WHAT COULD GO WRONG?!", "channel": "TechSauce", "category": "nz", "reserve": true, "url": "https://www.youtube.com/watch?v=N2iC1NpHuNQ", "reason": "Another video from this category, ready when you skip one."},
  {"id": "9FRJbXQciDY", "title": "Is THIS the BEST Budget Gaming Laptop?! 🤔", "channel": "TechSauce", "category": "nz", "reserve": true, "url": "https://www.youtube.com/watch?v=9FRJbXQciDY", "reason": "Another video from this category, ready when you skip one."},
  {"id": "9seQurhbLPM", "title": "EVERYTHING I Wish I Knew When I Started Growing Tomatoes 🍅", "channel": "Epic Gardening", "category": "garden", "reserve": true, "url": "https://www.youtube.com/watch?v=9seQurhbLPM", "reason": "Another video from this category, ready when you skip one."},
  {"id": "LwDmsd-nOrg", "title": "How to Treat Leaf Curl in Peach and Nectarine Trees", "channel": "Urban Farmstead", "category": "garden", "reserve": true, "url": "https://www.youtube.com/watch?v=LwDmsd-nOrg", "reason": "Another video from this category, ready when you skip one."},
  {"id": "vMG2FEQG8k0", "title": "How to get the most success from your spring gardening | Gardening 101 | Gardening Australia", "channel": "Gardening Australia", "category": "garden", "reserve": true, "url": "https://www.youtube.com/watch?v=vMG2FEQG8k0", "reason": "Another video from this category, ready when you skip one."},
  {"id": "iDbdXTMnOmE", "title": "How to manage your time more effectively (according to machines) - Brian Christian", "channel": "TED-Ed", "category": "time", "reserve": true, "url": "https://www.youtube.com/watch?v=iDbdXTMnOmE", "reason": "Another video from this category, ready when you skip one."},
  {"id": "VpN78TXMSUM", "title": "How I Manage My Time - The Triage System", "channel": "Ali Abdaal", "category": "time", "reserve": true, "url": "https://www.youtube.com/watch?v=VpN78TXMSUM", "reason": "Another video from this category, ready when you skip one."},
  {"id": "Y-jbe-je5XM", "title": "How to Actually Stick to Your Schedule (2 Simple Rules)", "channel": "Justin Sung", "category": "time", "reserve": true, "url": "https://www.youtube.com/watch?v=Y-jbe-je5XM", "reason": "Another video from this category, ready when you skip one."},
  {"id": "VrB-Te3PQnE", "title": "Gluten Free Italian Classics | Chicken Marsala & Chicken Parm", "channel": "Giada De Laurentiis", "category": "cook", "reserve": true, "url": "https://www.youtube.com/watch?v=VrB-Te3PQnE", "reason": "Another video from this category, ready when you skip one."},
  {"id": "ClLFs6CcGS0", "title": "Slow Cooker Tuscan Chicken Recipe - a delicious #glutenfree dinner #recipe made in the #slowcooker", "channel": "The Gluten Free Blogger", "category": "cook", "reserve": true, "url": "https://www.youtube.com/watch?v=ClLFs6CcGS0", "reason": "Another video from this category, ready when you skip one."},
  {"id": "RztbzEKrEvc", "title": "One pot dinner recipe (gluten free)", "channel": "kayla cappiello", "category": "cook", "reserve": true, "url": "https://www.youtube.com/watch?v=RztbzEKrEvc", "reason": "Another video from this category, ready when you skip one."},
  {"id": "bLbUIevOxzY", "title": "How To Paint A Room | DIY For Beginners", "channel": "Home RenoVision DIY", "category": "reno", "reserve": true, "url": "https://www.youtube.com/watch?v=bLbUIevOxzY", "reason": "Another video from this category, ready when you skip one."},
  {"id": "L2R0qKAxdzc", "title": "How to Paint a Room for Beginners", "channel": "MrsAshleyFrench", "category": "reno", "reserve": true, "url": "https://www.youtube.com/watch?v=L2R0qKAxdzc", "reason": "Another video from this category, ready when you skip one."},
  {"id": "xNEiUeGfOv0", "title": "How To Paint Concrete Floors - Bunnings Warehouse", "channel": "Bunnings Warehouse", "category": "reno", "reserve": true, "url": "https://www.youtube.com/watch?v=xNEiUeGfOv0", "reason": "Another video from this category, ready when you skip one."},
  {"id": "ScIazz59kwo", "title": "Top 5 Car Maintenance Checklist for Beginners | Tips and Tricks to Maintaining your Vehicle", "channel": "Driveology", "category": "cars", "reserve": true, "url": "https://www.youtube.com/watch?v=ScIazz59kwo", "reason": "Another video from this category, ready when you skip one."},
  {"id": "rXNJs4xPY5I", "title": "How To Learn To Fix Cars (Beginner’s Guide)", "channel": "Lucky Seven Flips", "category": "cars", "reserve": true, "url": "https://www.youtube.com/watch?v=rXNJs4xPY5I", "reason": "Another video from this category, ready when you skip one."},
  {"id": "u6FY_X12Bqo", "title": "Car Maintenance MOST People Ignore! Make Your Engine Last 200,000+ Miles!", "channel": "The Car Guy Online", "category": "cars", "reserve": true, "url": "https://www.youtube.com/watch?v=u6FY_X12Bqo", "reason": "Another video from this category, ready when you skip one."},
  {"id": "peUVLEUj-AM", "title": "OWNING A DOG | Things to Know Before Getting a Puppy! | Doctor Mike", "channel": "Doctor Mike", "category": "pets", "reserve": true, "url": "https://www.youtube.com/watch?v=peUVLEUj-AM", "reason": "Another video from this category, ready when you skip one."},
  {"id": "03XSrxEGPYs", "title": "YOU’RE DOING CAT LITTER WRONG & Here’s Why!", "channel": "Jackson Galaxy", "category": "pets", "reserve": true, "url": "https://www.youtube.com/watch?v=03XSrxEGPYs", "reason": "Another video from this category, ready when you skip one."},
  {"id": "sctuy_arPMg", "title": "10 Things I Wish I Knew Before Adopting A Cat", "channel": "Jackson Galaxy", "category": "pets", "reserve": true, "url": "https://www.youtube.com/watch?v=sctuy_arPMg", "reason": "Another video from this category, ready when you skip one."},
  {"id": "PxDB8a4swb4", "title": "9 Things to Do to Plan the PERFECT Trip (Travel 101: Episode 1)", "channel": "Aly Smalls", "category": "travel", "reserve": true, "url": "https://www.youtube.com/watch?v=PxDB8a4swb4", "reason": "Another video from this category, ready when you skip one."},
  {"id": "DS3qVi8p_e4", "title": "How to Make a Travel Budget", "channel": "Wolters World", "category": "travel", "reserve": true, "url": "https://www.youtube.com/watch?v=DS3qVi8p_e4", "reason": "Another video from this category, ready when you skip one."},
  {"id": "H0wGjEUDkQ4", "title": "Explore Paihia & Russell: Gateway to New Zealand’s Bay of Islands | New Zealand Travel Guide", "channel": "OziTraveler", "category": "travel", "reserve": true, "url": "https://www.youtube.com/watch?v=H0wGjEUDkQ4", "reason": "Another video from this category, ready when you skip one."},
  {"id": "taO2_XYX4M4", "title": "10 HOME RENOVATION TIPS for DIYers & Beginners *What I Wish I Knew Before* | XO, MaCenna", "channel": "XO, MaCenna", "category": "diy", "reserve": true, "url": "https://www.youtube.com/watch?v=taO2_XYX4M4", "reason": "Another video from this category, ready when you skip one."},
  {"id": "qbupCzSPW9o", "title": "How to Patch Small Holes in Walls | Ask This Old House", "channel": "This Old House", "category": "diy", "reserve": true, "url": "https://www.youtube.com/watch?v=qbupCzSPW9o", "reason": "Another video from this category, ready when you skip one."},
  {"id": "xOiXbP5QIrM", "title": "DIY Home Upgrades that You WON'T REGRET! ✨ BIG Impact on a SMALL Budget", "channel": "Living with LK", "category": "diy", "reserve": true, "url": "https://www.youtube.com/watch?v=xOiXbP5QIrM", "reason": "Another video from this category, ready when you skip one."},
  {"id": "LgR1OxUdbxg", "title": "BUTTERY GLUTEN FREE BREAD | King Arthur Gluten Free Bread Flour Recipe", "channel": "SavorySaver", "category": "gf", "reserve": true, "url": "https://www.youtube.com/watch?v=LgR1OxUdbxg", "reason": "Another video from this category, ready when you skip one."},
  {"id": "zFkDZ1ljNC8", "title": "Gluten-Free Basics & Beyond | GF Tips, Ingredient Swaps, Guides, Recipes from America's Test Kitchen", "channel": "America's Test Kitchen", "category": "gf", "reserve": true, "url": "https://www.youtube.com/watch?v=zFkDZ1ljNC8", "reason": "Another video from this category, ready when you skip one."},
  {"id": "9e4F2DXNYV8", "title": "NEVER FAILS! Gluten-free Scones Recipe ✅ | Baking with Becky", "channel": "Becky Excell", "category": "gf", "reserve": true, "url": "https://www.youtube.com/watch?v=9e4F2DXNYV8", "reason": "Another video from this category, ready when you skip one."},
  {"id": "GeH-QUwdeic", "title": "BEST First Woodworking Project for Beginners", "channel": "YouCanMakeThisToo", "category": "wood", "reserve": true, "url": "https://www.youtube.com/watch?v=GeH-QUwdeic", "reason": "Another video from this category, ready when you skip one."},
  {"id": "ZKmtQiKgyFI", "title": "Storage Shelf - Cheap and Easy Build Plans", "channel": "Dave Wirth", "category": "wood", "reserve": true, "url": "https://www.youtube.com/watch?v=ZKmtQiKgyFI", "reason": "Another video from this category, ready when you skip one."},
  {"id": "Xv_YNpLiODA", "title": "3 EASY Woodworking Projects That Sell Or Make AMAZING Gifts", "channel": "Knot Just Wood", "category": "wood", "reserve": true, "url": "https://www.youtube.com/watch?v=Xv_YNpLiODA", "reason": "Another video from this category, ready when you skip one."},
];

function videoCatOn(id) {
  const c = S.settings.videoCats;
  if (c && typeof c === 'object' && Object.prototype.hasOwnProperty.call(c, id)) return !!c[id];
  const built = VIDEO_CATS.find(x => x.id === id);
  if (built) return !built.extra;
  return false;
}
function cleanCustomVideos(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [], seen = new Set();
  arr.forEach(v => {
    if (!v || typeof v.id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(v.id) || seen.has(v.id)) return;
    const title = String(v.title || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    const channel = String(v.channel || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!title || !channel) return;
    seen.add(v.id);
    out.push({ id: v.id, title, channel, reserve: !!v.reserve });
  });
  return out.slice(0, 8);
}
function videoCustomList() {
  const a = S.settings && S.settings.videoCustom;
  if (!Array.isArray(a)) return [];
  const out = [], seen = new Set();
  a.forEach(x => {
    if (!x || typeof x.id !== 'string' || typeof x.name !== 'string') return;
    const name = x.name.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!name || !x.id || seen.has(x.id) || VIDEO_CATS.some(c => c.id === x.id)) return;
    seen.add(x.id);
    out.push({ id: x.id, name, sub: '', custom: true, videos: cleanCustomVideos(x.videos) });
  });
  return out;
}
function allVideoCats() {
  return VIDEO_CATS.concat(videoCustomList());
}
function enabledVideoCats() {
  return allVideoCats().filter(c => videoCatOn(c.id));
}
let videoTab = '';
let videoCatQuery = '';
function selectVideoCat(id) {
  videoTab = id;
  render();
  const v = document.getElementById('view'); if (v) v.scrollTop = 0;
}
// Hide a category tab. The videos stay in the lists; videoCats false keeps the tab off after reopen.
// A custom category stays in videoCustom so search can turn it back on.
function askRemoveVideoCat(id) {
  const cat = allVideoCats().find(c => c.id === id);
  if (!cat || !videoCatOn(id)) return;
  confirmSheet('Remove ' + esc(cat.name) + '?', 'This tab and its videos will be hidden. You can add it again from search.', 'Remove', async () => {
    const shot = snap();
    S.settings.videoCats = Object.assign({}, S.settings.videoCats, { [id]: false });
    const left = enabledVideoCats();
    if (!left.some(c => c.id === videoTab)) videoTab = left.length ? left[0].id : '';
    await save();
    render();
    toast(cat.name + ' removed.', 'Undo', async () => { S = JSON.parse(shot); videoTab = id; await save(); render(); });
  });
}
function customVideoId(name) {
  let base = 'cus-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  if (base === 'cus-') base = 'cus-x';
  let id = base, n = 2;
  const taken = new Set(allVideoCats().map(c => c.id));
  while (taken.has(id)) { id = base.slice(0, 20) + n; n++; }
  return id;
}
async function addVideoCat(id) {
  const cat = allVideoCats().find(c => c.id === id);
  if (!cat || videoCatOn(id)) { if (cat) selectVideoCat(id); return; }
  S.settings.videoCats = Object.assign({}, S.settings.videoCats, { [id]: true });
  videoTab = id;
  videoCatQuery = '';
  await save();
  render();
  const v = document.getElementById('view'); if (v) v.scrollTop = 0;
  toast(cat.name + ' added.');
}
// Food topics are always searched gluten-free. He has coeliac disease.
function isFoodTopic(s) {
  return /\b(food|cook(?:ing)?|recipe|recipes|bake|baking|bread|dinner|lunch|breakfast|meal|meals|cake|cakes|pasta|pizza|soup|salad|dessert|biscuit|biscuits|cookie|cookies|pastry|gluten|coeliac|celiac|noodle|noodles|chicken|beef|pork|lamb|fish|pie|pies|muffin|muffins|pancake|pancakes|roast|stew|curry|sandwich|sandwiches|flour)\b/i.test(String(s || ''));
}
function videoSearchQuery(name) {
  let q = String(name || '').replace(/\s+/g, ' ').trim();
  if (isFoodTopic(q) && !/gluten[-\s]?free/i.test(q)) q = (q + ' gluten free').trim();
  return q.slice(0, 80);
}
let videoCatBusy = false;
async function findCategoryVideos(name) {
  const q = videoSearchQuery(name);
  const food = isFoodTopic(name);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  let list = [];
  try {
    const r = await fetch(RELAY_URL + '/videos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q }), signal: ctl.signal, cache: 'no-store'
    });
    if (!r.ok) throw new Error('search');
    const j = await r.json();
    list = Array.isArray(j.videos) ? j.videos : [];
  } finally { clearTimeout(timer); }
  const out = [], seen = new Set();
  for (const v of list) {
    const id = v && v.id;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(id) || seen.has(id)) continue;
    let title = '', channel = '';
    let unreachable = false;
    try {
      const o = await fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json');
      if (!o.ok) continue;
      const d = await o.json();
      title = String(d.title || '').replace(/\s+/g, ' ').trim();
      channel = String(d.author_name || '').replace(/\s+/g, ' ').trim();
      if (!title || !channel) continue;
    } catch (e) {
      unreachable = true;
    }
    if (unreachable) {
      // The relay already confirmed this id with oembed. Use that only if the phone could not reach oembed itself.
      title = String(v.title || '').replace(/\s+/g, ' ').trim();
      channel = String(v.channel || '').replace(/\s+/g, ' ').trim();
      if (!title || !channel) continue;
    }
    if (food && !/gluten|coeliac|celiac|\bgf\b/i.test(title)) continue;
    seen.add(id);
    out.push({ id, title: title.slice(0, 180), channel: channel.slice(0, 80), reserve: out.length >= 4 });
    if (out.length >= 8) break;
  }
  return out;
}
async function addCustomVideoCat(name) {
  name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!name || videoCatBusy) return;
  const existing = allVideoCats().find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return addVideoCat(existing.id);
  videoCatBusy = true;
  const box = document.getElementById('vidcatres');
  if (box) box.innerHTML = '<div class="card empty" id="vidlooking"><div class="t">Looking for videos…</div><div class="s">Checking YouTube for this topic.</div></div>';
  try {
    const videos = await findCategoryVideos(name);
    if (!videos.length) {
      toast('No videos found for that. Try a different name.');
      if (box && document.body.contains(box)) box.innerHTML = videoCatSearchHtml();
      return;
    }
    const id = customVideoId(name);
    S.settings.videoCustom = videoCustomList().concat([{ id, name, videos }]);
    S.settings.videoCats = Object.assign({}, S.settings.videoCats, { [id]: true });
    videoTab = id;
    videoCatQuery = '';
    await save();
    render();
    const v = document.getElementById('view'); if (v) v.scrollTop = 0;
    toast(name + ' added.');
  } catch (e) {
    toast('Couldn’t look up videos just now. Try again.');
    if (box && document.body.contains(box)) box.innerHTML = videoCatSearchHtml();
  } finally { videoCatBusy = false; }
}
function videoCatSearchHtml() {
  const q = videoCatQuery.replace(/\s+/g, ' ').trim();
  const nq = q.toLowerCase();
  if (!nq) return '';
  const all = allVideoCats();
  const hits = all.filter(c => !videoCatOn(c.id) && c.name.toLowerCase().includes(nq));
  if (hits.length) {
    return `<div class="list" id="vidcathits">${hits.map(c => `<button type="button" class="row" onclick="addVideoCat(${jsArg(c.id)})"><div class="tx"><div class="t">${esc(c.name)}</div>${c.sub ? `<div class="s">${esc(c.sub)}</div>` : ''}</div>${I('plus')}</button>`).join('')}</div>`;
  }
  const owned = all.filter(c => videoCatOn(c.id) && c.name.toLowerCase().includes(nq));
  if (owned.length) return `<div class="card empty"><div class="t">You already have this</div><div class="s">${esc(owned[0].name)} is already a tab.</div></div>`;
  if (q.length > 40) return `<div class="card empty"><div class="s">Use a shorter name, up to 40 characters.</div></div>`;
  return `<div class="list"><button type="button" class="row" onclick="addCustomVideoCat(${jsArg(q)})"><div class="tx"><div class="t">Add ${esc(q)}</div><div class="s">Use this exact name</div></div>${I('plus')}</button></div>`;
}
function videoSuggestions() {
  const on = VIDEO_CATS.map(c => c.id).filter(videoCatOn);
  const by = {};
  on.forEach(id => { by[id] = VIDEOS.filter(v => v.category === id); });
  const out = [];
  let i = 0, added = true;
  while (added) {
    added = false;
    on.forEach(id => { if (by[id][i]) { out.push(by[id][i]); added = true; } });
    i++;
  }
  return out;
}
function videoReason(v) {
  const r = (v.reason || '').trim();
  if (r) return r;
  return 'A video about this topic.';
}
// Publish dates read from each video's YouTube watch page (publishDate). oEmbed does not include a date.
// Stored here so the phone shows a real date and does not look it up again on every tap.
const VIDEO_DATES = {
  // 3 Oct 2026 list. Dates are the publishDate on each video's YouTube watch page.
  '6Db-cEgbmC4': '2026-06-26',
  '2f4gu97XWFg': '2026-04-23',
  'lrS1LC2cu-U': '2025-09-25',
  'kXOKQCtttbw': '2026-09-25',
  'tZnNLoPKriU': '2026-09-25',
  'jfVVXYTZykw': '2026-09-25',
  'mw3kSNIxjqo': '2026-09-29',
  'RztbzEKrEvc': '2024-09-29',
  'vMG2FEQG8k0': '2021-09-04',
  'N2iC1NpHuNQ': '2026-02-15',
  'QLSYADN_BzM': '2026-04-15',
  'obvokggK0ag': '2025-03-10',
  '3-zmU6upbUo': '2021-10-06',
  'kbocoSRrVOI': '2025-10-14',
  'eMQ1LcUm-n4': '2025-01-22',
  'WONRS7BLh4g': '2024-12-20',
  '5XXwMdPRhbw': '2026-03-12',
  'l7814Pw_eMU': '2026-01-31',
  'No-JPdFvYWU': '2026-10-01',
  'ohqxP8EEumo': '2026-09-16',
  'TbkUKCm3CHQ': '2026-09-21',
  '9LRozsApCWA': '2015-09-08',
  'rlO4Zqw-6WQ': '2025-05-27',
  '9UhNYzdZNb8': '2023-09-26',
  'NL2Vq32jyeo': '2023-07-31',
  '20MqQoe8rtA': '2024-04-26',
  'YK90uKtx8pQ': '2026-01-22',
  'xNEiUeGfOv0': '2025-09-29',
  'GvgDcBpKhAQ': '2026-05-22',
  'nWjBe3P_JiA': '2025-05-10',
  '0Rp9KJCEIvg': '2026-09-02',
  'VpN78TXMSUM': '2025-02-18',
  'lRH0jNgfkKs': '2026-01-09',
  'EKOU3JWDNLI': '2026-01-14',
  'zt0JA5rxdfM': '2025-12-22',
  '9OQ5vaYbGV0': '2026-05-22',
  'FluKUJyeYD8': '2026-09-04',
  'O9kNF_xOM5s': '2026-09-21',
  'B9UYbXqBnhk': '2025-09-07',
  'CdjZEmeUwX4': '2025-07-08',
  '7xSWkBSLmEM': '2025-07-27',
  'jkAKY0Gic3E': '2019-08-16',
  'LwDmsd-nOrg': '2020-02-29',
  'stw9KEpSNEg': '2020-04-24',
  'OMIbtIZ2E-Q': '2022-06-10',
  'jozNEpY8iik': '2022-01-23',
  'n3kNlFMXslo': '2017-02-07',
  'iONDebHX9qk': '2021-04-18',
  'iDbdXTMnOmE': '2018-01-02',
  'MkfYM6oiLMo': '2023-10-01',
  '7ZjAdGLfIv4': '2025-02-18',
  'pXslUEvVXoc': '2023-01-03',
  '_U-caadWVgE': '2025-03-07',
  'LBpkMqVOJmk': '2018-12-24',
  'CRXCB_3gLok': '2014-07-10',
  'ZcilSwuaHog': '2018-05-23',
  'pOZFn3kexsc': '2024-11-08',
  'HJZXHfs0fgA': '2025-03-01',
  '25-HG471MIc': '2023-09-01',
  'CY1MLjYOf1o': '2016-04-18',
  'w_wNj7387Ck': '2023-11-01',
  'vHrHBZIA5h4': '2013-07-24',
  'peUVLEUj-AM': '2018-02-18',
  '2Ex99RuKqAw': '2022-09-17',
  'AW77b_qat1g': '2023-10-24',
  'H0wGjEUDkQ4': '2025-01-22',
  'XCsMvEMX11Y': '2024-06-14',
  'E47FGfv14Mc': '2020-01-10',
  'PxDB8a4swb4': '2024-10-07',
  'zMH61Yabdj0': '2014-08-22',
  'PLGmTzEGSIY': '2021-10-18',
  'qbupCzSPW9o': '2016-11-07',
  'cWmb1D4Wciw': '2025-05-25',
  '4PU336S-fA4': '2020-06-14',
  'zFkDZ1ljNC8': '2016-07-28',
  'WQyK_jTLMsY': '2019-03-10',
  'H5gZO37HX0E': '2022-06-24',
  '8vFGrNjT4P4': '2019-02-15',
  'mvO6zaIUO18': '2016-02-26',
  'T5nt7f8tMXA': '2026-05-19',
  'ZKmtQiKgyFI': '2013-10-29',
  'Otim2mDjsYM': '2025-07-30',
  '83TiUbFY6fY': '2026-01-09',
  'Fx0x3oI_ngo': '2026-09-26',
  'nvFEGPOXXi0': '2025-12-13',
  'DD_ECSPFL-A': '2017-01-25',
  '9FRJbXQciDY': '2025-11-04',
  '9seQurhbLPM': '2024-07-11',
  'k-cH10nkM7A': '2020-06-08',
  'HBFNA-Evkag': '2026-08-07',
  'sZyDy69JK6M': '2024-02-20',
  'bWLizOvhZXY': '2025-09-11',
  'Y-jbe-je5XM': '2024-04-26',
  'VrB-Te3PQnE': '2024-02-06',
  'ClLFs6CcGS0': '2025-07-11',
  '1p6ro_0ST6Q': '2024-09-06',
  'bLbUIevOxzY': '2022-01-15',
  'L2R0qKAxdzc': '2024-02-20',
  '8JCoJvYPKBE': '2018-10-09',
  'ScIazz59kwo': '2024-03-20',
  'rXNJs4xPY5I': '2024-08-20',
  'u6FY_X12Bqo': '2025-02-09',
  'YreSGULrnx8': '2021-01-27',
  '03XSrxEGPYs': '2021-03-24',
  'sctuy_arPMg': '2024-02-02',
  'PR0iIva4Ues': '2026-08-08',
  'DS3qVi8p_e4': '2024-03-06',
  'HrDpZT9xtls': '2023-04-01',
  'taO2_XYX4M4': '2021-06-06',
  '4GvI55Of41M': '2022-02-17',
  'xOiXbP5QIrM': '2024-07-28',
  'LgR1OxUdbxg': '2023-07-08',
  'CZhMCVFTz6c': '2022-05-12',
  '9e4F2DXNYV8': '2020-05-24',
  'GeH-QUwdeic': '2023-05-18',
  'RLaqxMZ3cEw': '2026-03-18',
  'Xv_YNpLiODA': '2025-10-04',
  'nUsrYVxrDwI': '2026-04-01',
  '3triLkS0nq4': '2025-06-20',
  'oIv_Y2RPQ_A': '2025-08-15',
  '3sB4Iv_tM7U': '2026-09-03',
  '0ijm2Xui5N8': '2026-07-23',
  '3sur4BmjQt8': '2025-09-26',
  'B452TVVco2Q': '2026-07-03',
  'Xh0GyxWgKPs': '2026-06-10',
  'VI0NDsh2b8k': '2025-05-30',
  'mh4AQkw4Jjc': '2026-02-15',
  'B402rKl4bUg': '2026-05-21',
  'Rt9tW3cMLhI': '2026-06-11',
  'SenovvZlWIA': '2024-10-18',
  's3a4OQR-10M': '2025-09-03',
  'DLV8FpyxZPQ': '2026-08-07',
  'mrV8kK5t0V8': '2026-01-08',
  'n7QlUH0zrPg': '2026-05-22',
  'Dg47eNL_Usw': '2026-02-12',
  'lY5V4hSLWY8': '2026-02-26',
  'ofywN3NgGqY': '2026-06-25',
  'EZOiy1-cnxM': '2026-04-30',
  'FOJ4A4wixDg': '2026-06-04',
  'ko70cExuzZM': '2025-10-05',
  'rK5TyISxZ_M': '2025-09-18',
  'mQezde_qeXw': '2026-02-05',
  'c8zq4kAn_O0': '2025-04-03',
  'Y4AgCABdZ3Y': '2026-02-25',
  '82-jTNka3uc': '2026-06-01',
  'KFMYx1TibeQ': '2025-06-26',
  'hohuFW0zQUw': '2025-07-03',
  'SOJpE1KMUbo': '2026-01-09',
  'uvY8fdgezLQ': '2025-06-23',
  '5RNy_1odv20': '2026-01-23',
  'cZgUiR31m-Y': '2025-07-24',
  'Pz-SZlU4C10': '2026-01-22',
};
function videoThumb(id) {
  return `<img class="vthumb" src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" width="112" height="63" loading="lazy" decoding="async">`;
}
const VIDEO_DATE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function videoDateText(id) {
  const iso = VIDEO_DATES[id] || '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const mon = Number(m[2]), day = Number(m[3]);
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return '';
  return day + ' ' + VIDEO_DATE_MONTHS[mon - 1] + ' ' + m[1];
}
function videoDateLine(id) {
  const t = videoDateText(id);
  return t ? `<div class="s vdate">${esc(t)}</div>` : '';
}
function videoOpenLink(id) {
  return `<a class="ytopen" href="https://www.youtube.com/watch?v=${esc(id)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${I('ext')} Open on YouTube</a>`;
}
function videoDateOverlay(id) {
  const t = videoDateText(id);
  // No date: no strip. Videos page only; Home and Top 40 do not pass this.
  return t ? `<span class="vdatecap">${esc(t)}</span>` : '';
}
function videoThumbBox(id, opts) {
  const withDate = !!(opts && opts.date);
  return `<span class="vthumbbox" data-yt="${esc(id)}"${withDate ? ' data-vdate="1"' : ''}>${videoThumb(id)}${withDate ? videoDateOverlay(id) : ''}</span>`;
}
let playingVideoId = '';
function stopInlineVideo() {
  document.querySelectorAll('.vthumbbox.playing').forEach(box => {
    box.classList.remove('playing');
    const id = box.getAttribute('data-yt') || '';
    box.innerHTML = videoThumb(id) + (box.hasAttribute('data-vdate') ? videoDateOverlay(id) : '');
  });
  playingVideoId = '';
}
// Play in the thumbnail box beside the title and description. No sheet, and the page does not change.
function playInlineVideo(id, title) {
  id = String(id || '');
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
  const current = document.querySelector('.vthumbbox.playing');
  if (playingVideoId === id && current && current.getAttribute('data-yt') === id) return;
  stopInlineVideo();
  const box = document.querySelector('.vthumbbox[data-yt="' + id + '"]');
  if (!box) return;
  title = String(title || '').replace(/\s+/g, ' ').trim() || 'Video';
  const embed = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1';
  box.classList.add('playing');
  box.innerHTML = `<iframe src="${embed}" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  playingVideoId = id;
}
function onVideoRowClick(e, id, title) {
  if (e && e.target && e.target.closest && e.target.closest('a')) return;
  playInlineVideo(id, title);
}
function videoRow(v, swipe) {
  // Without swipe, the row is a link that leaves for YouTube. The Videos page plays in the thumbnail box.
  if (!swipe) {
    const body = `${videoThumb(v.id)}
    <div class="tx"><div class="t">${esc(v.title)}</div><div class="s">${esc(v.channel)}</div><div class="s">${esc(videoReason(v))}</div></div>${I('ext')}`;
    return `<a class="row vrow" href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener">${body}</a>`;
  }
  // Same layout as Home: large picture on the left, bold title (and channel) on the right, description full width underneath.
  // Tap still plays in that picture. The date is on the bottom of the picture and again under the description.
  const link = `<div class="row vrow hvrow" data-yt="${esc(v.id)}" onclick="onVideoRowClick(event,${jsArg(v.id)},${jsArg(v.title)})"><div class="hvhead">${videoThumbBox(v.id, { date: true })}
    <div class="tx"><div class="t">${esc(v.title)}</div><div class="s">${esc(v.channel)}</div></div></div>
    <div class="s hvwhy">${esc(videoReason(v))}</div>${videoDateLine(v.id)}${videoOpenLink(v.id)}</div>`;
  return `<div class="vsw" data-vid="${esc(v.id)}" data-cat="${esc(v.category)}"><div class="vswbg" aria-hidden="true">Skip</div>${link}</div>`;
}
// Videos skipped on the Videos page, for today only. A refresh keeps them out; tomorrow they can come back.
function knownVideoIds() {
  const s = new Set();
  VIDEOS.forEach(v => s.add(v.id));
  VIDEO_RESERVE.forEach(v => s.add(v.id));
  videoCustomList().forEach(c => (c.videos || []).forEach(v => s.add(v.id)));
  return s;
}
function videoDismissedIds() {
  const d = S.settings && S.settings.videoDismissed;
  if (!d || d.day !== todayISO() || !Array.isArray(d.ids)) return [];
  const known = knownVideoIds();
  const out = [];
  d.ids.forEach(id => { if (known.has(id) && !out.includes(id)) out.push(id); });
  return out;
}
function poolForCat(id) {
  const custom = videoCustomList().find(c => c.id === id);
  if (custom) return (custom.videos || []).map(v => ({ id: v.id, title: v.title, channel: v.channel, category: id, reserve: !!v.reserve, url: 'https://www.youtube.com/watch?v=' + v.id }));
  return VIDEOS.filter(v => v.category === id).concat(VIDEO_RESERVE.filter(v => v.category === id));
}
// The category tab lists the curated videos. A left swipe hides that one for today and the next video
// from this category that is not already on screen takes its place. When none are left, the row goes.
function videosForCat(id) {
  const skip = new Set(videoDismissedIds());
  const all = poolForCat(id);
  const reserves = all.filter(v => v.reserve && !skip.has(v.id));
  let ri = 0;
  const out = [];
  for (const v of all) {
    if (v.reserve) continue;
    if (!skip.has(v.id)) out.push(v);
    else if (ri < reserves.length) out.push(reserves[ri++]);
  }
  return out;
}
async function skipVideo(id) {
  let cat = '';
  for (const c of allVideoCats()) {
    if (poolForCat(c.id).some(v => v.id === id)) { cat = c.id; break; }
  }
  if (!cat || videoDismissedIds().includes(id)) return;
  const before = videosForCat(cat);
  if (!before.some(v => v.id === id)) return;
  const beforeIds = new Set(before.map(v => v.id));
  const shot = snap();
  const dismissed = videoDismissedIds();
  dismissed.push(id);
  S.settings.videoDismissed = { day: todayISO(), ids: dismissed };
  await save();
  const repl = videosForCat(cat).some(v => !beforeIds.has(v.id));
  render();
  toast(repl ? 'Next video.' : 'No more in that category today.', 'Undo', undoTo(shot));
}
let vs = null;
function wireVideoSwipe() {
  const list = document.getElementById('videolist');
  if (!list) return;
  const end = e => {
    if (!vs || e.pointerId !== vs.pid) return;
    const st = vs; vs = null;
    const w = st.wrap.getBoundingClientRect().width || 1;
    const gone = st.drag && -st.dx > Math.max(72, w * 0.34);
    st.a.style.transition = 'transform .18s ease';
    if (st.drag) {
      const block = ev => { ev.preventDefault(); ev.stopPropagation(); st.a.removeEventListener('click', block, true); };
      st.a.addEventListener('click', block, true);
    }
    if (!gone) { st.a.style.transform = ''; return; }
    st.a.style.transform = 'translateX(-100%)';
    setTimeout(() => skipVideo(st.id), 180);
  };
  list.addEventListener('pointerdown', e => {
    if (vs || (e.button != null && e.button !== 0)) return;
    const wrap = e.target.closest('.vsw'); if (!wrap) return;
    const a = wrap.querySelector('.vrow'); if (!a) return;
    vs = { wrap, a, id: wrap.dataset.vid, x: e.clientX, y: e.clientY, dx: 0, drag: false, pid: e.pointerId };
  });
  list.addEventListener('pointermove', e => {
    if (!vs || e.pointerId !== vs.pid) return;
    const dx = e.clientX - vs.x, dy = e.clientY - vs.y;
    if (!vs.drag) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { vs = null; return; }
      if (dx > -8) return;
      vs.drag = true;
      try { vs.wrap.setPointerCapture(e.pointerId); } catch (err) { }
    }
    vs.dx = Math.min(0, dx);
    vs.a.style.transition = 'none';
    vs.a.style.transform = `translateX(${vs.dx}px)`;
  });
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);
}
// Sarah Jenkins, @sarahjenkins1510. Confirmed 2 Oct 2026 (oembed). A newer one from the channel replaces it.
const SARAH_CHANNEL_ID = 'UC2sjJeoD0gLkf66iLbm28hg';
const SARAH_KNOWN = { id: 'hyuecefG9Aw', title: '2 October 2026', channel: 'Sarah Jenkins', published: '2026-10-02T04:54:17+00:00' };
let sarahMem = null;
function sarahPick(a, b) {
  if (!a || typeof a.id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(a.id)) return b || null;
  if (!b || typeof b.id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(b.id)) return a;
  const ap = a.published || '', bp = b.published || '';
  if (ap && bp && ap !== bp) return ap > bp ? a : b;
  return b;
}
function currentSarahVideo() {
  let v = SARAH_KNOWN;
  const saved = S && S.settings && S.settings.sarahLatest;
  if (saved && typeof saved === 'object') v = sarahPick(v, saved) || v;
  if (sarahMem) v = sarahPick(v, sarahMem) || v;
  if (!v || v.channel !== 'Sarah Jenkins' || !v.title) return null;
  return { id: v.id, title: v.title, channel: v.channel, published: v.published || '', category: 'sarah', url: 'https://www.youtube.com/watch?v=' + v.id, reason: 'A new video from Sarah Jenkins.' };
}
let sarahBusy = false;
async function refreshSarah() {
  if (!S) return;
  let announced = '';
  if (!sarahBusy && RELAY_URL) {
    sarahBusy = true;
    try {
      const data = await getJSON(RELAY_URL + '/sarah', 12000);
      if (data.channelId && data.channelId !== SARAH_CHANNEL_ID) return;
      announced = typeof data.announced === 'string' ? data.announced : '';
      const top = Array.isArray(data.videos) ? data.videos[0] : null;
      if (top && typeof top.id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(top.id)) {
        let title = String(top.title || '').replace(/\s+/g, ' ').trim();
        let channel = String(top.channel || '').replace(/\s+/g, ' ').trim();
        const published = typeof top.published === 'string' ? top.published : '';
        try {
          const o = await fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + top.id) + '&format=json');
          if (o.ok) {
            const d = await o.json();
            const ot = String(d.title || '').replace(/\s+/g, ' ').trim();
            const oc = String(d.author_name || '').replace(/\s+/g, ' ').trim();
            if (ot && oc) { title = ot; channel = oc; }
          }
        } catch (e) { /* the relay already confirmed this id */ }
        if (title && channel === 'Sarah Jenkins') {
          const next = { id: top.id, title: title.slice(0, 180), channel, published };
          const cur = currentSarahVideo();
          if (!cur || next.id !== cur.id || next.published > (cur.published || '') || next.title !== cur.title) {
            const picked = sarahPick(cur, next);
            if (picked && picked.id === next.id) {
              sarahMem = next;
              S.settings.sarahLatest = next;
              save().catch(() => { });
              const h = (location.hash || '#home').slice(1).split('/')[0];
              if (!sheetOpen && (h === 'home' || h === '')) render();
            }
          }
        }
      }
    } catch (e) { /* keep the video already confirmed */ }
    finally { sarahBusy = false; }
  }
  await notifySarah(currentSarahVideo(), announced);
}
// Same notification as other reminders: the service worker shows it once per video id.
async function notifySarah(video, announced) {
  if (!video || !S) return;
  const key = 'sarah|' + video.id;
  let fired;
  try { fired = (await kvGet('fired')) || {}; } catch (e) { return; }
  if (fired[key]) return;
  if (announced === video.id) {
    fired[key] = Date.now();
    try { await kvSet('fired', fired); } catch (e) { }
    return;
  }
  if (S.settings.reminders === false) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const reg = await getReg();
  const opts = { body: video.title, tag: 'sarah-' + video.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: '#home' } };
  try {
    if (reg) await reg.showNotification('New video from Sarah Jenkins', opts);
    else new Notification('New video from Sarah Jenkins', opts);
  } catch (e) { return; }
  fired[key] = Date.now();
  try { await kvSet('fired', fired); } catch (e) { }
  if (RELAY_URL) {
    try { await fetch(RELAY_URL + '/sarah/seen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: video.id }) }); } catch (e) { }
  }
}

// Home only. The box, title and description all come from this one video.
// The box stays a still thumbnail. It does not play on its own while scrolling.
// Sarah Jenkins is pinned at the top. A tap plays that video in the picture, same as Videos and Top 40.
// Open on YouTube is the only control that leaves the app.
function sarahDateText(v) {
  const t = Date.parse(v && v.published || '');
  if (!Number.isFinite(t)) return '';
  const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(new Date(t));
  const day = (parts.find(p => p.type === 'day') || {}).value;
  const mon = (parts.find(p => p.type === 'month') || {}).value;
  const year = (parts.find(p => p.type === 'year') || {}).value;
  return day && mon && year ? day + ' ' + mon + ' ' + year : '';
}
function homeVideoRow(v) {
  const id = v && v.id;
  const sarah = !!(v && v.category === 'sarah');
  const click = sarah ? ` onclick="onVideoRowClick(event,${jsArg(id)},${jsArg(v.title)})"` : '';
  const when = sarah ? sarahDateText(v) : '';
  const date = when ? `<div class="s vdate">${esc(when)}</div>` : '';
  const open = sarah ? videoOpenLink(id) : '';
  // Picture on the left, bold title (and channel) top-aligned on the right, description full width underneath.
  return `<div class="row vrow hvrow" data-yt="${esc(id)}"${click}><div class="hvhead">${videoThumbBox(id)}
    <div class="tx"><div class="t">${esc(v.title)}</div><div class="s">${esc(v.channel)}</div></div></div>
    <div class="s hvwhy">${esc(videoReason(v))}</div>${date}${open}</div>`;
}
function homeVideosCard() {
  const sarah = currentSarahVideo();
  const on = homeOn('videos');
  let list = on ? videoSuggestions() : [];
  if (sarah) list = [sarah].concat(list.filter(v => v.id !== sarah.id));
  // Sarah takes the top slot. The usual count still applies underneath when that card is on.
  list = on ? list.slice(0, homeVideoCount() + (sarah ? 1 : 0)) : (sarah ? [sarah] : []);
  if (!list.length) return '';
  return `<div class="sec"><a class="sechead" href="#videos">Videos</a><a href="#videos">All videos</a></div>
    <div class="list" id="homevideos">${list.map(homeVideoRow).join('')}</div>`;
}
function Videos() {
  const cats = enabledVideoCats();
  if (!cats.some(c => c.id === videoTab)) videoTab = cats.length ? cats[0].id : '';
  const tabs = cats.length ? `<div class="chips scroll" id="videotabs" role="tablist" aria-label="Video categories">${cats.map(c => {
    const on = c.id === videoTab;
    const name = esc(c.name);
    if (!on) return `<button type="button" class="chip" role="tab" aria-selected="false" onclick="selectVideoCat(${jsArg(c.id)})">${name}</button>`;
    return `<div class="chip on vsel" role="tab" aria-selected="true"><button type="button" class="vname" onclick="selectVideoCat(${jsArg(c.id)})">${name}</button><button type="button" class="vidx" id="vidcatdel" aria-label="Remove ${name}" onclick="askRemoveVideoCat(${jsArg(c.id)})">${I('x')}</button></div>`;
  }).join('')}</div>` : '';
  const list = videoTab ? videosForCat(videoTab) : [];
  const curated = videoTab ? poolForCat(videoTab).some(v => !v.reserve) : false;
  const body = !cats.length
    ? `<div class="card empty" id="videonone"><div class="t">No categories yet</div><div class="s">Add a category to see videos.</div></div>`
    : list.length
      ? `<div class="list" id="videolist">${list.map(v => videoRow(v, true)).join('')}</div>`
      : curated
        ? `<div class="card empty" id="videonone"><div class="t">No videos left today</div><div class="s">Skipped videos come back tomorrow.</div></div>`
        : `<div class="card empty" id="videonone"><div class="t">No videos for this yet</div></div>`;
  const search = `<div class="field" id="vidadd" style="margin-bottom:6px"><span>Add a category</span></div><label class="search">${I('search')}<input id="vidcatq" type="search" placeholder="Search for a category" value="${esc(videoCatQuery)}" aria-label="Add a category" autocomplete="off" enterkeyhint="search" maxlength="40" oninput="videoCatQuery=this.value;document.getElementById('vidcatres').innerHTML=videoCatSearchHtml()"></label><div id="vidcatres">${videoCatSearchHtml()}</div>`;
  return header('Videos', 'One category at a time') + tabs + body + search +
    `<div class="foot">Swipe a video left to skip it for today. Another from this category takes its place.<br>Skipped ones stay hidden until tomorrow.<br>The × on the selected tab hides that category. You can add it again from search.<br>Updated 2 Oct 2026. These refresh every day.<br>Tap a video to play it in the picture beside the description. Open on YouTube opens the YouTube site.</div>`;
}


/* ================= TOP 40 ================= */
// New Zealand Official Top 40 singles, chart week 2 October to 8 October 2026.
// Listed as of this date. Only songs with an official video that resolved on YouTube.
const TOP40_UPDATED = '2026-10-03';
const TOP40 = [
  { rank: 1, id: 'mw3kSNIxjqo', title: 'Patient Zero', artist: 'Taylor Swift', url: 'https://www.youtube.com/watch?v=mw3kSNIxjqo' },
  { rank: 2, id: 'nUsrYVxrDwI', title: "Choosin' Texas", artist: 'Ella Langley', url: 'https://www.youtube.com/watch?v=nUsrYVxrDwI' },
  { rank: 3, id: 'oIv_Y2RPQ_A', title: 'Man I Need', artist: 'Olivia Dean', url: 'https://www.youtube.com/watch?v=oIv_Y2RPQ_A' },
  { rank: 4, id: '3triLkS0nq4', title: 'Rein Me In', artist: 'Sam Fender feat. Olivia Dean', url: 'https://www.youtube.com/watch?v=3triLkS0nq4' },
  { rank: 5, id: '3sB4Iv_tM7U', title: 'Nicole Kidman', artist: 'ADÉLA', url: 'https://www.youtube.com/watch?v=3sB4Iv_tM7U' },
  { rank: 6, id: 'jfVVXYTZykw', title: 'Cleveland!', artist: 'Taylor Swift', url: 'https://www.youtube.com/watch?v=jfVVXYTZykw' },
  { rank: 7, id: 'tZnNLoPKriU', title: 'Babylon', artist: 'Taylor Swift', url: 'https://www.youtube.com/watch?v=tZnNLoPKriU' },
  { rank: 8, id: 'kXOKQCtttbw', title: 'Pink Clouding', artist: 'Taylor Swift', url: 'https://www.youtube.com/watch?v=kXOKQCtttbw' },
  { rank: 9, id: '0ijm2Xui5N8', title: "Ain't In LA", artist: 'ADÉLA', url: 'https://www.youtube.com/watch?v=0ijm2Xui5N8' },
  { rank: 10, id: 'B452TVVco2Q', title: 'Great Expectation', artist: 'Sienna Spiro', url: 'https://www.youtube.com/watch?v=B452TVVco2Q' },
  { rank: 11, id: '3sur4BmjQt8', title: 'So Easy (To Fall In Love)', artist: 'Olivia Dean', url: 'https://www.youtube.com/watch?v=3sur4BmjQt8' },
  { rank: 12, id: 'Xh0GyxWgKPs', title: 'Boston', artist: 'Stella Lefty', url: 'https://www.youtube.com/watch?v=Xh0GyxWgKPs' },
  { rank: 13, id: 'ko70cExuzZM', title: 'The Fate Of Ophelia', artist: 'Taylor Swift', url: 'https://www.youtube.com/watch?v=ko70cExuzZM' },
  { rank: 14, id: 'lrS1LC2cu-U', title: 'A Couple Minutes', artist: 'Olivia Dean', url: 'https://www.youtube.com/watch?v=lrS1LC2cu-U' },
  { rank: 15, id: 'B402rKl4bUg', title: 'The Cure', artist: 'Olivia Rodrigo', url: 'https://www.youtube.com/watch?v=B402rKl4bUg' },
  { rank: 16, id: 'Rt9tW3cMLhI', title: 'stupid song', artist: 'Olivia Rodrigo', url: 'https://www.youtube.com/watch?v=Rt9tW3cMLhI' },
  { rank: 17, id: 'mh4AQkw4Jjc', title: 'Self Aware', artist: 'Temper City', url: 'https://www.youtube.com/watch?v=mh4AQkw4Jjc' },
  { rank: 18, id: 'VI0NDsh2b8k', title: 'Nice To Each Other', artist: 'Olivia Dean', url: 'https://www.youtube.com/watch?v=VI0NDsh2b8k' },
  { rank: 19, id: 's3a4OQR-10M', title: 'Loser', artist: 'Tame Impala', url: 'https://www.youtube.com/watch?v=s3a4OQR-10M' },
  { rank: 20, id: 'DLV8FpyxZPQ', title: 'Stop The Wedding!', artist: 'Ashe', url: 'https://www.youtube.com/watch?v=DLV8FpyxZPQ' },
  { rank: 21, id: 'n7QlUH0zrPg', title: "Movin' To The Sun", artist: 'HUGEL, Imael Angel and Ultra Naté', url: 'https://www.youtube.com/watch?v=n7QlUH0zrPg' },
  { rank: 22, id: 'ofywN3NgGqY', title: "My Body Isn't Ready", artist: 'sombr', url: 'https://www.youtube.com/watch?v=ofywN3NgGqY' },
  { rank: 23, id: 'Dg47eNL_Usw', title: 'Be Her', artist: 'Ella Langley', url: 'https://www.youtube.com/watch?v=Dg47eNL_Usw' },
  { rank: 24, id: 'rK5TyISxZ_M', title: 'WHERE IS MY HUSBAND!', artist: 'RAYE', url: 'https://www.youtube.com/watch?v=rK5TyISxZ_M' },
  { rank: 25, id: 'EZOiy1-cnxM', title: 'Material Lover', artist: 'Sienna Spiro', url: 'https://www.youtube.com/watch?v=EZOiy1-cnxM' },
  { rank: 26, id: 'SenovvZlWIA', title: 'No Broke Boys', artist: 'Tinashe and Disco Lines', url: 'https://www.youtube.com/watch?v=SenovvZlWIA' },
  { rank: 27, id: 'SOJpE1KMUbo', title: 'Raindance', artist: 'Dave feat. Tems', url: 'https://www.youtube.com/watch?v=SOJpE1KMUbo' },
  { rank: 28, id: 'mQezde_qeXw', title: 'Homewrecker', artist: 'sombr', url: 'https://www.youtube.com/watch?v=mQezde_qeXw' },
  { rank: 29, id: '82-jTNka3uc', title: 'hate that i made you love me', artist: 'Ariana Grande', url: 'https://www.youtube.com/watch?v=82-jTNka3uc' },
  { rank: 30, id: 'uvY8fdgezLQ', title: 'Midnight Sun', artist: 'Zara Larsson', url: 'https://www.youtube.com/watch?v=uvY8fdgezLQ' },
  { rank: 31, id: 'mrV8kK5t0V8', title: 'I Just Might', artist: 'Bruno Mars', url: 'https://www.youtube.com/watch?v=mrV8kK5t0V8' },
  { rank: 32, id: 'c8zq4kAn_O0', title: 'back to friends', artist: 'sombr', url: 'https://www.youtube.com/watch?v=c8zq4kAn_O0' },
  { rank: 33, id: '2f4gu97XWFg', title: 'Willing And Able', artist: 'Noah Kahan', url: 'https://www.youtube.com/watch?v=2f4gu97XWFg' },
  { rank: 34, id: 'hohuFW0zQUw', title: 'Golden', artist: 'KPop Demon Hunters Cast', url: 'https://www.youtube.com/watch?v=hohuFW0zQUw' },
  { rank: 35, id: 'FOJ4A4wixDg', title: 'bloodstream', artist: 'Alyssa Grace', url: 'https://www.youtube.com/watch?v=FOJ4A4wixDg' },
  { rank: 36, id: '5RNy_1odv20', title: 'Die On This Hill', artist: 'Sienna Spiro', url: 'https://www.youtube.com/watch?v=5RNy_1odv20' },
  { rank: 37, id: '6Db-cEgbmC4', title: 'Mi Chico', artist: 'DJ Goja', url: 'https://www.youtube.com/watch?v=6Db-cEgbmC4' },
  { rank: 38, id: 'KFMYx1TibeQ', title: 'Folded', artist: 'Kehlani', url: 'https://www.youtube.com/watch?v=KFMYx1TibeQ' },
  { rank: 39, id: 'lY5V4hSLWY8', title: 'Risk It All', artist: 'Bruno Mars', url: 'https://www.youtube.com/watch?v=lY5V4hSLWY8' },
  { rank: 40, id: 'Y4AgCABdZ3Y', title: 'iloveitiloveitiloveit', artist: 'Bella Kay', url: 'https://www.youtube.com/watch?v=Y4AgCABdZ3Y' }
];
function top40Row(v) {
  const reason = (v.reason || '').trim() || ('Official video for ' + v.title + ' by ' + v.artist + '.');
  // Same layout as Home: large picture on the left, bold title on the right, description full width underneath.
  // Tap still plays in that picture. The date and Open on YouTube stay under the description.
  return `<div class="row vrow hvrow" data-rank="${v.rank}" data-yt="${esc(v.id)}" onclick="onVideoRowClick(event,${jsArg(v.id)},${jsArg(v.title)})"><div class="hvhead">${videoThumbBox(v.id)}
    <div class="tx"><div class="t">${v.rank}. ${esc(v.title)}</div><div class="s">${esc(v.artist)}</div></div></div>
    <div class="s hvwhy">${esc(reason)}</div>${videoDateLine(v.id)}${videoOpenLink(v.id)}</div>`;
}
function Top40() {
  return header('Top 40', 'Current chart music videos') +
    `<div class="top40bar" id="top40bar"><button type="button" class="btn primary" id="top40surprise" onclick="surpriseTop40()">${I('shuffle')} Surprise me</button></div>` +
    `<div class="list" id="top40list">${TOP40.map(top40Row).join('')}</div>` +
    `<div class="foot">Chart as of 3 Oct 2026. New Zealand Official Top 40 singles, 2 October to 8 October 2026. Songs with an official video.<br>Surprise me scrolls to a song, highlights it, then plays it in that row. Tap a song to play it in the picture beside the description.</div>`;
}
let top40SurpriseToken = 0;
function surpriseTop40() {
  const scroller = document.getElementById('view');
  const rows = [...document.querySelectorAll('#top40list .row.vrow')];
  if (!scroller || !rows.length) return;
  const i = Math.floor(Math.random() * rows.length);
  const row = rows[i];
  const id = TOP40[i].id;
  const token = ++top40SurpriseToken;
  rows.forEach(r => r.classList.remove('surprise'));
  const destFor = () => {
    const s = scroller.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const bar = document.getElementById('top40bar');
    const barH = bar ? bar.offsetHeight : 0;
    const raw = scroller.scrollTop + (r.top - s.top) - barH - 8;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    return Math.max(0, Math.min(max, raw));
  };
  // A short jump back to the top, when the row is not already well below, makes the scroll down visible.
  if (destFor() - scroller.scrollTop < 240) scroller.scrollTop = 0;
  const from = scroller.scrollTop;
  const dest = destFor();
  const dist = dest - from;
  const finish = () => {
    if (token !== top40SurpriseToken) return;
    row.classList.add('surprise');
    setTimeout(() => { if (token === top40SurpriseToken) row.classList.remove('surprise'); }, 1700);
    setTimeout(() => {
      if (token !== top40SurpriseToken) return;
      playInlineVideo(id, TOP40[i].title);
    }, 450);
  };
  if (dist < 28) { finish(); return; }
  const ms = Math.min(1600, Math.max(900, Math.abs(dist) * 0.55));
  const t0 = performance.now();
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const step = now => {
    if (token !== top40SurpriseToken) return;
    const p = Math.min(1, (now - t0) / ms);
    scroller.scrollTop = from + dist * ease(p);
    if (p < 1) requestAnimationFrame(step);
    else finish();
  };
  requestAnimationFrame(step);
}

/* ================= SYNC (this phone and another device) ================= */
/* The whole record is one blob. S.updatedAt is the only stamp, so the newer save replaces the older one.
   A phone that still has only the starter records does not wipe a phone that already has real records.
   The cloud copy is encrypted with the sync code. The relay stores the ciphertext in its existing KV. */
function savedWhere() {
  return syncCode()
    ? 'Your information is saved on this phone and syncs to your other device.'
    : 'Your information is saved on this phone only.';
}
function syncCode() {
  try {
    const ls = SyncLogic.normSyncCode(localStorage.getItem('syncCode') || '');
    if (ls) return ls;
  } catch (e) { }
  const fromS = S && S.settings && SyncLogic.normSyncCode(S.settings.syncCode || '');
  if (fromS) { try { localStorage.setItem('syncCode', SyncLogic.formatSyncCode(fromS)); } catch (e) { } return fromS; }
  return '';
}
function setSyncCode(code) {
  const n = SyncLogic.normSyncCode(code);
  try { if (n) localStorage.setItem('syncCode', SyncLogic.formatSyncCode(n)); else localStorage.removeItem('syncCode'); } catch (e) { }
  if (S && S.settings) { if (n) S.settings.syncCode = SyncLogic.formatSyncCode(n); else delete S.settings.syncCode; }
  return n;
}
function syncBundle() {
  let dailyQuote = null, theme = null, textSize = null;
  try { dailyQuote = localStorage.getItem('dailyQuote'); theme = localStorage.getItem('theme'); textSize = localStorage.getItem('textSize'); } catch (e) { }
  return { data: S, local: { dailyQuote, theme, textSize } };
}
function foldLocalPrefs(d, local) {
  d.settings = Object.assign({}, d.settings || {});
  if (!local) return d;
  if (!d.settings.theme && local.theme) {
    try { const t = JSON.parse(local.theme); if (t && typeof t.t === 'string') d.settings.theme = t.t; if (t && t.auto) d.settings.themeAuto = true; } catch (e) { }
  }
  if (!d.settings.textSize && local.textSize) d.settings.textSize = local.textSize;
  if (typeof d.settings.dailyQuote !== 'boolean' && (local.dailyQuote === '0' || local.dailyQuote === '1')) d.settings.dailyQuote = local.dailyQuote === '1';
  return d;
}
function mirrorSyncedPrefs() {
  applyTheme();
  applyTextSize();
  try { if (S && S.settings && typeof S.settings.dailyQuote === 'boolean') localStorage.setItem('dailyQuote', S.settings.dailyQuote ? '1' : '0'); } catch (e) { }
}
function setSyncStatus(ok, msg) {
  try { localStorage.setItem('syncStatus', JSON.stringify({ at: Date.now(), ok: !!ok, msg: msg || '' })); } catch (e) { }
  const el = document.getElementById('syncstatus'); if (el) el.textContent = syncStatusLine();
}
function syncStatusLine() {
  let st = null; try { st = JSON.parse(localStorage.getItem('syncStatus') || 'null'); } catch (e) { }
  if (!st || !st.at) return 'Not synced yet.';
  return (st.ok ? 'Last sync ' : 'Last try ') + ago(st.at) + (st.msg ? '. ' + st.msg : '.');
}
let phoneSyncMute = false, phoneSyncTimer = null, phoneSyncJob = null, phoneSyncPending = null, phoneSyncBigTold = false;
function schedulePhoneSync() {
  if (phoneSyncMute || !syncCode()) return;
  clearTimeout(phoneSyncTimer);
  phoneSyncTimer = setTimeout(() => queuePhoneSync('push'), 1200);
}
function queuePhoneSync(mode) {
  if (phoneSyncMute || !syncCode() || !S) return Promise.resolve();
  if (phoneSyncJob) { if (mode === 'open' || phoneSyncPending === 'open') phoneSyncPending = 'open'; else phoneSyncPending = 'push'; return phoneSyncJob; }
  phoneSyncJob = (async () => {
    try {
      let m = mode;
      while (m) {
        phoneSyncPending = null;
        if (m === 'open') await phoneSyncOpenOnce(); else await phoneSyncPushOnce();
        m = phoneSyncPending;
      }
    } finally {
      phoneSyncJob = null;
      const again = phoneSyncPending;
      phoneSyncPending = null;
      if (again) queuePhoneSync(again);
    }
  })();
  return phoneSyncJob;
}
async function syncPost(body) {
  const res = await fetch(RELAY_URL + '/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let data = {}; try { data = await res.json(); } catch (e) { }
  if (!res.ok) { const err = new Error((data && data.error) || 'sync_unavailable'); err.status = res.status; throw err; }
  return data;
}
async function applyPhoneSync(pack) {
  if (sheetOpen) return;
  const remote = pack && pack.data && typeof pack.data === 'object' ? pack.data : pack;
  const code = syncCode();
  phoneSyncMute = true;
  try {
    const next = normalise(foldLocalPrefs(remote, pack && pack.local));
    if (code) next.settings.syncCode = SyncLogic.formatSyncCode(code);
    S = next;
    await kvSet('data', S);
    mirrorSyncedPrefs();
    if (!sheetOpen) render();
  } finally { phoneSyncMute = false; }
}
async function phoneSyncPushOnce() {
  const code = syncCode();
  if (!code || !S || sheetOpen && phoneSyncPending) return;
  if (!S.updatedAt) {
    phoneSyncMute = true;
    try { S.updatedAt = new Date().toISOString(); await kvSet('data', S); } finally { phoneSyncMute = false; }
  }
  let enc;
  try { enc = await SyncLogic.encryptSync(code, syncBundle()); }
  catch (e) {
    if (e && e.message === 'too_big') {
      setSyncStatus(false, 'Too big to sync');
      if (!phoneSyncBigTold) { phoneSyncBigTold = true; toast('Your data is too big to sync. Photos can make it large. A backup file still works.'); }
      return;
    }
    throw e;
  }
  const res = await syncPost({ op: 'push', code, updatedAt: S.updatedAt, iv: enc.iv, ct: enc.ct });
  if (res.stored) { setSyncStatus(true, 'Synced'); return; }
  if (res.reason === 'older' && res.ct) {
    const pack = await SyncLogic.decryptSync(code, res.iv, res.ct);
    if (SyncLogic.decideSync(S, pack) === 'pull' && !sheetOpen) {
      await applyPhoneSync(pack);
      setSyncStatus(true, 'Updated from your other device');
    }
  }
}
async function phoneSyncOpenOnce() {
  const code = syncCode();
  if (!code || !S) return;
  if (sheetOpen) return;
  const res = await syncPost({ op: 'pull', code });
  if (res.empty) { await phoneSyncPushOnce(); return; }
  const pack = await SyncLogic.decryptSync(code, res.iv, res.ct);
  const choice = SyncLogic.decideSync(S, pack);
  if (choice === 'pull') {
    await applyPhoneSync(pack);
    setSyncStatus(true, 'Updated from your other device');
  } else if (choice === 'push') await phoneSyncPushOnce();
  else setSyncStatus(true, 'Synced');
}
function phoneSyncOpen() {
  if (!syncCode() || !S) return Promise.resolve();
  return Promise.resolve(queuePhoneSync('open')).catch(e => { syncFail(e, false); });
}
function syncFail(e, loud) {
  const bad = e && (e.message === 'bad_code' || e.name === 'OperationError');
  const msg = bad ? 'That code doesn’t match this sync.' : (e && e.message === 'sync_too_large' ? 'Your data is too big to sync.' : 'Couldn’t sync just now. Your data is still on this phone.');
  setSyncStatus(false, msg);
  if (loud) toast(msg);
  return msg;
}
async function createSyncCode() {
  const n = setSyncCode(SyncLogic.newSyncCode());
  phoneSyncMute = true;
  try { await save(); } finally { phoneSyncMute = false; }
  render();
  try { await queuePhoneSync('push'); toast('Sync is on. Enter this code on your other device.'); }
  catch (e) { syncFail(e, true); }
  render();
}
function enterSyncCode() {
  openSheet('Enter a code', field('Sync code', inp('code', '', 'autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-EFGH-JKLM-NPQR"'), 'The code from the other device. It looks like ABCD-EFGH-JKLM-NPQR.'), async v => {
    const n = SyncLogic.normSyncCode(v.code);
    if (!n) return 'Enter the 16-character code from your other device.';
    const prev = syncCode();
    setSyncCode(n);
    phoneSyncMute = true;
    try { if (S && S.settings) S.settings.syncCode = SyncLogic.formatSyncCode(n); await kvSet('data', S); }
    finally { phoneSyncMute = false; }
    try { await queuePhoneSync('open'); }
    catch (e) {
      if (e && (e.message === 'bad_code' || e.name === 'OperationError')) {
        setSyncCode(prev);
        phoneSyncMute = true;
        try { await kvSet('data', S); } catch (e2) { } finally { phoneSyncMute = false; }
      }
      return syncFail(e, false);
    }
    return () => { render(); toast('Sync is on.'); };
  }, 'Sync');
}
async function copySyncCode() {
  const c = SyncLogic.formatSyncCode(syncCode());
  if (!c) return;
  let ok = false;
  try { await navigator.clipboard.writeText(c); ok = true; } catch (e) {
    try { const ta = document.createElement('textarea'); ta.value = c; ta.setAttribute('readonly', ''); document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) { }
  }
  toast(ok ? 'Sync code copied.' : 'Couldn’t copy. The code is on the screen to copy by hand.');
}
function stopSync() {
  confirmSheet('Stop syncing on this phone?', 'This phone keeps its information. It will stop sending and receiving changes. Your other device is not wiped.', 'Stop sync', async () => {
    setSyncCode('');
    phoneSyncMute = true;
    try { await save(); } finally { phoneSyncMute = false; }
    try { localStorage.removeItem('syncStatus'); } catch (e) { }
    render();
    toast('Sync is off on this phone.');
  });
}
const WEBSITE_ADDRESS = 'phoneapp12-cell.github.io/car-app-preview';
function websiteSettingsRow() {
  return `<div class="list" id="websiterow" style="margin-top:10px"><div class="srow" style="flex-wrap:wrap">
    <div class="tx" style="flex-basis:100%"><div class="t">On a computer, open</div>
      <div class="s" id="websiteaddr" style="user-select:text;-webkit-user-select:text;word-break:break-all">${esc(WEBSITE_ADDRESS)}</div></div>
    <div class="btns" style="flex-basis:100%;margin:0">
      <button type="button" class="btn small" id="websitecopy" onclick="copyWebsiteAddress()">${I('copy')} Copy</button>
    </div>
  </div></div>`;
}
async function copyWebsiteAddress() {
  const ok = await copyText(WEBSITE_ADDRESS);
  toast(ok ? 'Website address copied.' : 'Couldn’t copy. The address is on the screen to copy by hand.');
}
function syncSettingsRow() {
  const code = syncCode();
  const pretty = code ? SyncLogic.formatSyncCode(code) : '';
  return `<div class="sec" id="syncsec">Sync</div>
  <div class="list" id="syncrow"><div class="srow" style="flex-wrap:wrap">
    <div class="tx" style="flex-basis:100%"><div class="t">Sync</div>
      <div class="s">${code
        ? 'On. Cars, to-dos, meals, bills, birthdays, reminders, settings and your other records sync to your other device. If both devices have changes, the newer save replaces the older one. A brand-new device does not replace a device that already has your records.'
        : 'Off. Create a code here, then enter it on your other device. Or enter the code from that device. Nothing is synced until you do.'}</div></div>
    ${pretty ? `<div class="tx" style="flex-basis:100%"><div class="t" id="synccode" style="font-family:ui-monospace,monospace;letter-spacing:.06em">${esc(pretty)}</div><div class="s" id="syncstatus">${esc(syncStatusLine())}</div></div>` : `<div class="s" id="syncstatus" style="flex-basis:100%">${esc(syncStatusLine())}</div>`}
    <div class="btns" style="flex-basis:100%;margin:0">
      ${code ? `<button type="button" class="btn small" id="synccopy" onclick="copySyncCode()">${I('copy')} Copy</button>` : `<button type="button" class="btn primary small" id="synccreate" onclick="createSyncCode()">Create a code</button>`}
      <button type="button" class="btn small" id="syncenter" onclick="enterSyncCode()">Enter a code</button>
      ${code ? `<button type="button" class="btn small" id="syncstop" onclick="stopSync()">Stop</button>` : ''}
    </div>
  </div></div>`;
}

/* ================= MAIL (Gmail and Outlook, last 2 hours) ================= */
const MAIL_REDIRECT = 'https://phoneapp12-cell.github.io/car-app-preview/';
const MAIL_WINDOW = 2 * 60 * 60 * 1000;
let MAIL = { google: null, microsoft: null };
let MAIL_CFG = null;
let MAIL_VIEW = '';
let MAIL_VIEW_AT = 0;
let mailBusy = false;

function mailSummaryLine(items, opts) {
  opts = opts || {};
  const connected = opts.connected | 0;
  if (connected <= 0) return '';
  const failed = opts.failed | 0;
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const subjects = (Array.isArray(items) ? items : []).map(x => clean(x && x.subject)).filter(Boolean);
  const count = typeof opts.count === 'number' && opts.count >= 0 ? opts.count : subjects.length;
  const quote = (s) => '“' + s + '”';
  if (count <= 0 && failed >= connected) return 'Couldn’t check mail just now.';
  if (count <= 0 && failed > 0) return 'Couldn’t check every inbox just now.';
  if (count <= 0) return 'No new mail in the last 2 hours.';
  const shown = subjects.slice(0, 2).map(quote);
  const head = opts.atLeast ? 'At least ' + count + ' new emails' : (count === 1 ? '1 new email' : count + ' new emails');
  let line;
  if (!shown.length) line = head + ' in the last 2 hours.';
  else if (shown.length === 1 || count === 1) line = head + ' in the last 2 hours: ' + shown[0] + '.';
  else if (count === 2) line = head + ' in the last 2 hours: ' + shown[0] + ' and ' + shown[1] + '.';
  else line = head + ' in the last 2 hours, including ' + shown[0] + ' and ' + shown[1] + '.';
  if (failed > 0) line = line.slice(0, -1) + ' (one inbox couldn’t be checked).';
  return line;
}

async function loadMail() {
  try {
    const m = await kvGet('mailboxes');
    if (m && typeof m === 'object') MAIL = { google: m.google || null, microsoft: m.microsoft || null };
  } catch (e) { MAIL = { google: null, microsoft: null }; }
}
async function saveMail() {
  const keep = {};
  ['google', 'microsoft'].forEach(p => {
    const b = MAIL[p];
    if (!b || !b.refreshToken) return;
    keep[p] = { refreshToken: b.refreshToken, accessToken: b.accessToken || '', expiresAt: b.expiresAt || 0, email: b.email || '' };
  });
  try { await kvSet('mailboxes', keep); } catch (e) { }
}
const mailConnected = p => !!(MAIL[p] && MAIL[p].refreshToken);
const mailAnyConnected = () => mailConnected('google') || mailConnected('microsoft');
function homeMailLine() {
  if (!mailAnyConnected()) return '';
  return MAIL_VIEW || 'Checking mail from the last 2 hours.';
}
function b64urlBytes(bytes) {
  let s = '';
  const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
async function makePkce() {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const verifier = b64urlBytes(raw);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: b64urlBytes(digest) };
}
async function mailConfig() {
  if (MAIL_CFG && !MAIL_CFG.offline) return MAIL_CFG;
  const blank = { google: { clientId: '', secretSet: false, authorize: 'https://accounts.google.com/o/oauth2/v2/auth', scope: 'https://www.googleapis.com/auth/gmail.readonly', pkce: true }, microsoft: { clientId: '', secretSet: false, authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', scope: 'offline_access Mail.Read User.Read', pkce: true }, redirect: MAIL_REDIRECT };
  if (!RELAY_URL) { MAIL_CFG = blank; return MAIL_CFG; }
  try {
    const c = await getJSON(RELAY_URL + '/mail/config', 12000);
    if (c && c.google && c.microsoft) { MAIL_CFG = c; return MAIL_CFG; }
  } catch (e) { }
  MAIL_CFG = Object.assign({ offline: true }, blank);
  return MAIL_CFG;
}
async function mailSignIn(provider) {
  const cfg = await mailConfig();
  const c = cfg[provider] || {};
  if (!c.clientId) {
    toast(provider === 'google' ? 'Gmail needs GOOGLE_CLIENT_ID on the calendar link service first.' : 'Outlook needs MICROSOFT_CLIENT_ID on the calendar link service first.');
    return;
  }
  const pkce = await makePkce();
  const state = b64urlBytes(crypto.getRandomValues(new Uint8Array(16))) + '.' + provider;
  try { localStorage.setItem('ddMailPkce', JSON.stringify({ verifier: pkce.verifier, state, provider, at: Date.now() })); }
  catch (e) { toast('This browser won’t keep the sign-in step. Try Chrome.'); return; }
  const u = new URL(c.authorize);
  u.searchParams.set('client_id', c.clientId);
  u.searchParams.set('redirect_uri', MAIL_REDIRECT);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', c.scope);
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', pkce.challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  if (provider === 'google') {
    u.searchParams.set('access_type', 'offline');
    u.searchParams.set('prompt', 'consent');
    u.searchParams.set('include_granted_scopes', 'true');
  } else {
    u.searchParams.set('prompt', 'select_account');
    u.searchParams.set('response_mode', 'query');
  }
  location.href = u.toString();
}
async function mailToken(body) {
  const r = await fetch(RELAY_URL + '/mail/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'mail'), { data, status: r.status });
  return data;
}
async function finishMailSignIn() {
  let q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  const code = q.get('code');
  const err = q.get('error');
  const state = q.get('state') || '';
  if (!code && !err) return;
  try { history.replaceState(null, '', location.pathname + (location.hash || '')); } catch (e) { }
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('ddMailPkce') || 'null'); } catch (e) { saved = null; }
  try { localStorage.removeItem('ddMailPkce'); } catch (e) { }
  const provider = state.endsWith('.google') ? 'google' : state.endsWith('.microsoft') ? 'microsoft' : '';
  if (!provider) { toast('That sign-in link was not recognised.'); return; }
  if (location.hash !== '#settings') location.hash = '#settings';
  if (err) { toast('Sign-in was cancelled.'); return; }
  if (!saved || saved.state !== state || saved.provider !== provider || !saved.verifier || Date.now() - saved.at > 15 * 60 * 1000) {
    toast('That sign-in step expired. Try again from Settings.');
    return;
  }
  try {
    const tok = await mailToken({ provider, code, codeVerifier: saved.verifier, redirectUri: MAIL_REDIRECT });
    if (!tok.accessToken) throw new Error('mail');
    if (!tok.refreshToken) { toast('Sign-in did not grant offline access, so it cannot be kept. Try again.'); return; }
    const box = { refreshToken: tok.refreshToken, accessToken: tok.accessToken, expiresAt: Date.now() + (Number(tok.expiresIn) || 3600) * 1000 - 60000, email: '' };
    MAIL[provider] = box;
    try { box.email = await mailAddress(provider, box.accessToken); } catch (e) { }
    await saveMail();
    toast(provider === 'google' ? 'Gmail connected.' : 'Outlook connected.');
    refreshMail(true);
  } catch (e) {
    const miss = e.data && e.data.missing;
    toast(miss ? 'Sign-in needs ' + miss + ' on the calendar link service.' : 'Couldn’t finish sign-in.');
  }
}
async function mailAccess(provider) {
  const box = MAIL[provider];
  if (!box || !box.refreshToken) return '';
  if (box.accessToken && box.expiresAt > Date.now() + 30000) return box.accessToken;
  const tok = await mailToken({ provider, refreshToken: box.refreshToken, redirectUri: MAIL_REDIRECT });
  box.accessToken = tok.accessToken;
  if (tok.refreshToken) box.refreshToken = tok.refreshToken;
  box.expiresAt = Date.now() + (Number(tok.expiresIn) || 3600) * 1000 - 60000;
  await saveMail();
  return box.accessToken;
}
async function mailSignOut(provider) {
  MAIL[provider] = null;
  await saveMail();
  if (!mailAnyConnected()) { MAIL_VIEW = ''; MAIL_VIEW_AT = 0; }
  render();
  toast(provider === 'google' ? 'Gmail signed out on this phone.' : 'Outlook signed out on this phone.');
  if (mailAnyConnected()) refreshMail(true);
}
async function getJSONAuth(url, token) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
    if (r.status === 401) throw Object.assign(new Error('auth'), { status: 401 });
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
async function mailAddress(provider, token) {
  if (provider === 'google') {
    const p = await getJSONAuth('https://gmail.googleapis.com/gmail/v1/users/me/profile', token);
    return (p && p.emailAddress) || '';
  }
  const p = await getJSONAuth('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', token);
  return (p && (p.mail || p.userPrincipalName)) || '';
}
function cleanSubject(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > 80 ? t.slice(0, 79) + '…' : t;
}
async function gmailRecent(token) {
  const after = Math.floor((Date.now() - MAIL_WINDOW) / 1000);
  const list = await getJSONAuth('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=' + encodeURIComponent('in:inbox after:' + after), token);
  const ids = (list.messages || []).map(m => m && m.id).filter(Boolean);
  const metas = await Promise.all(ids.slice(0, 10).map(id => getJSONAuth('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + encodeURIComponent(id) + '?format=metadata&metadataHeaders=Subject', token).catch(() => null)));
  const since = Date.now() - MAIL_WINDOW;
  const items = [];
  let old = false;
  metas.forEach(m => {
    if (!m) return;
    const at = Number(m.internalDate) || 0;
    if (at && at < since) { old = true; return; }
    const headers = (m.payload && m.payload.headers) || [];
    const h = headers.find(x => x && /^subject$/i.test(x.name));
    const subject = cleanSubject(h && h.value);
    if (subject) items.push({ subject, at });
  });
  const more = !!list.nextPageToken && !old && ids.length >= 20;
  return { items, count: more ? Math.max(20, items.length) : items.length, atLeast: more };
}
async function outlookRecent(token) {
  const data = await getJSONAuth('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=25&$select=subject,receivedDateTime&$orderby=receivedDateTime%20desc', token);
  const rows = Array.isArray(data.value) ? data.value : [];
  const since = Date.now() - MAIL_WINDOW;
  const items = [];
  let old = false;
  rows.forEach(m => {
    const at = Date.parse(m && m.receivedDateTime || '') || 0;
    if (at && at < since) { old = true; return; }
    const subject = cleanSubject(m && m.subject);
    if (subject) items.push({ subject, at });
  });
  const more = !!data['@odata.nextLink'] && !old && rows.length >= 25;
  return { items, count: more ? Math.max(25, items.length) : items.length, atLeast: more };
}
async function refreshMail(force) {
  if (!mailAnyConnected()) { MAIL_VIEW = ''; return; }
  if (mailBusy) return;
  if (!force && MAIL_VIEW_AT && Date.now() - MAIL_VIEW_AT < 3 * 60 * 1000) return;
  mailBusy = true;
  if (!MAIL_VIEW) MAIL_VIEW = 'Checking mail from the last 2 hours.';
  const providers = ['google', 'microsoft'].filter(mailConnected);
  let failed = 0;
  const items = [];
  let count = 0;
  let atLeast = false;
  for (const p of providers) {
    try {
      let token = await mailAccess(p);
      let got;
      try { got = p === 'google' ? await gmailRecent(token) : await outlookRecent(token); }
      catch (e) {
        if (e && e.status === 401) {
          MAIL[p].expiresAt = 0;
          token = await mailAccess(p);
          got = p === 'google' ? await gmailRecent(token) : await outlookRecent(token);
        } else throw e;
      }
      items.push.apply(items, got.items);
      count += got.count;
      if (got.atLeast) atLeast = true;
    } catch (e) { failed++; }
  }
  items.sort((a, b) => (b.at || 0) - (a.at || 0));
  MAIL_VIEW = mailSummaryLine(items, { connected: providers.length, failed, count, atLeast });
  MAIL_VIEW_AT = Date.now();
  mailBusy = false;
  paintHomeSum();
}
function mailSettingsSection() {
  const cfg = MAIL_CFG || { google: {}, microsoft: {}, offline: false };
  const row = (p, title) => {
    const on = mailConnected(p);
    const c = cfg[p] || {};
    let sub;
    if (on) sub = (MAIL[p].email ? MAIL[p].email + '. ' : 'Signed in on this phone. ') + 'Recent mail from the last 2 hours can show on Home.';
    else if (cfg.offline && !c.clientId) sub = 'Not connected. The calendar link service could not be reached, so sign-in cannot start yet.';
    else if (!c.clientId) sub = p === 'google'
      ? 'Not connected. Sign-in needs GOOGLE_CLIENT_ID on the calendar link service. A Google web client also needs GOOGLE_CLIENT_SECRET stored there, not in the app.'
      : 'Not connected. Sign-in needs MICROSOFT_CLIENT_ID on the calendar link service. A public Outlook app using PKCE does not need a secret. A confidential app also needs MICROSOFT_CLIENT_SECRET stored there, not in the app.';
    else if (p === 'google' && !c.secretSet) sub = 'GOOGLE_CLIENT_ID is set. GOOGLE_CLIENT_SECRET is not on the calendar link service yet, so a Google web client may refuse sign-in.';
    else sub = 'Not connected. Sign in to show recent mail on Home.';
    const btn = on
      ? `<button class="btn small" type="button" onclick="mailSignOut('${p}')">Sign out</button>`
      : (c.clientId ? `<button class="btn primary small" type="button" onclick="mailSignIn('${p}')">Sign in</button>` : '');
    return `<div class="srow" id="mail-${p}"><div class="tx"><div class="t">${title}</div><div class="s">${esc(sub)}</div></div>${btn}</div>`;
  };
  return `<div class="sec" id="mailsec">Mail</div>
  <div class="list">${row('google', 'Gmail')}${row('microsoft', 'Outlook')}</div>
  <p class="muted" style="margin:8px 4px 0">One short line on Home once an inbox is connected: how many emails arrived in the last 2 hours, and a couple of real subjects. Nothing is invented. Sign-in uses a private code (PKCE). A client secret, if Google or Microsoft requires one, stays on the calendar link service.</p>`;
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
  <div class="top" style="padding-top:0"><div><h1>Settings</h1><div class="sub">Appearance, sync, reminders, mail, calendars and backup</div></div></div>
  ${syncSettingsRow()}
  ${websiteSettingsRow()}
  <div class="sec" id="appearance">Appearance</div>
  ${themePicker()}
  ${textSizePicker()}
  <div class="list" style="margin-top:10px">
   <div class="srow"><div class="tx"><div class="t">Match phone</div><div class="s">Use Dark when the phone is in dark mode${themeKey() === 'dark' ? ', Teal when it isn’t' : ', ' + THEMES.find(x => x[0] === themeKey())[1] + ' when it isn’t'}.</div></div><button class="switch ${S.settings.themeAuto ? 'on' : ''}" role="switch" aria-checked="${!!S.settings.themeAuto}" aria-label="Match phone light or dark mode" onclick="toggleThemeAuto()"></button></div>
  </div>
  <div class="sec">Home</div>
  <div class="list">
   <div class="srow"><div class="tx"><div class="t">Daily quote</div><div class="s">A short quote and a photo under the greeting on Home. One for each day.</div></div><button class="switch ${showDailyQuote() ? 'on' : ''}" role="switch" aria-checked="${showDailyQuote()}" aria-label="Daily quote" onclick="toggleDailyQuote()"></button></div>
  </div>
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
   Service: 14 days before. Bills: 3 days before and on the day. To-dos: on the day, at 8 am, noon, 4 pm and 8 pm, until you tick them off.<br>
   Appointments and connected calendars: 1 hour before (all-day ones in the morning).<br>
   Birthdays: 3 days before and on the day, never between 9 pm and 7 am.<br>
   Pets: 3 days before and on the day, never between 9 pm and 7 am.<br>
   Health: check-ups 3 days before and on the day; booked appointments the evening before at 7 pm and 2 hours before. Never between 9 pm and 7 am.<br>
   My events: if you turn it on for the event, on the day or the day before at the time you pick.<br>
   Commission: if you turn it on, 9 am the next morning when nothing’s entered for yesterday.<br><br>
   Reminders are checked every time you open the app. Background checks skip 9 pm to 7 am.
   <b>Android may delay background reminders if you don’t open the app for a while.</b> Opening it every few days keeps them coming.</div></div>

  <div class="sec">Commission</div>
  <div class="list" id="commsettings">
   <div class="srow"><div class="tx"><div class="t">Pay fortnight starts</div><div class="s">${S.commission.anchor ? `Mondays. This pay fortnight: ${commRange(curFortnight())}.` : 'Not set up yet. Pick the Monday your pay fortnight started.'}</div></div><button class="btn small" onclick="anchorForm()">${S.commission.anchor ? 'Change' : 'Set up'}</button></div>
   <div class="srow"><div class="tx"><div class="t">Commission reminder</div><div class="s">9 am the next morning, only if nothing’s entered for yesterday</div></div><button class="switch ${S.commission.remind ? 'on' : ''}" role="switch" aria-checked="${S.commission.remind}" aria-label="Commission reminder" onclick="toggleCommRemind()"></button></div>
  </div>

  <div class="sec">Backup</div>
  <div class="list">
   <div class="srow"><div class="tx"><div class="t">${syncCode() ? 'Your data syncs to your other device' : 'Your data stays on this phone'}</div><div class="s">${syncCode() ? 'Sync is on, so a copy also goes to your other device. A backup file is still worth keeping somewhere safe, like Google Drive or an email to yourself.' : 'Nothing is sent anywhere, apart from your calendar links when the app syncs them. If you lose or reset your phone it’s gone, so make a backup now and then and save it somewhere safe, like Google Drive or an email to yourself.'} ${last}.</div></div></div>
  </div>
  <div class="btns" style="margin-top:10px">
   <button class="btn" onclick="exportData()">${I('download')} Export backup</button>
   <button class="btn" onclick="importData()">${I('upload')} Import backup</button>
   ${canShare ? `<button class="btn" onclick="shareBackup()">${I('share')} Share backup</button>` : ''}</div>
  <input type="file" id="importfile" accept=".json,application/json" style="display:none" onchange="importFile(this)">

  <div class="sec">Lifting bridge</div>
  <div class="list">
   <div class="srow" style="flex-wrap:wrap"><div class="tx" style="flex-basis:100%"><div class="t">On Home</div><div class="s">The lifting bridge on Dave Culham Drive (Te Matau ā Pohe). Not live – based on the council’s lift times.</div></div>
    <div class="seg" id="brmode" style="width:100%">${[['near', 'Near only'], ['always', 'Always on Home'], ['off', 'Off']].map(([v, l]) => `<button type="button" class="${brMode() === v ? 'on' : ''}" aria-pressed="${brMode() === v}" onclick="setBridgeHome('${v}')">${l}</button>`).join('')}</div>
    <div class="s" style="flex-basis:100%;color:var(--ink2);font-size:0.8125rem">${brMode() === 'near' ? (S.settings.bridgeLoc ? 'Shows at the top of Home when you open the app within about 2 km of the bridge.' : 'Shows as a short line under the weather. Tap “Show when I’m near” to see it at the top of Home only when you’re close.') : brMode() === 'always' ? 'Always at the top of Home.' : 'Not on Home. It’s still under More.'}</div></div>
   <div class="srow"><div class="tx"><div class="t">Use my location</div><div class="s">${S.settings.bridgeLoc ? 'On, only while the app is open. Your location isn’t saved.' : 'Off. Only used if you tap “Show when I’m near”.'}</div></div>
    ${S.settings.bridgeLoc ? `<button class="btn small" onclick="stopBridgeLoc()">Stop</button>` : `<button class="btn small" onclick="enableBridgeLoc()">${I('pin')} Show when I’m near</button>`}</div>
  </div>

  ${mailSettingsSection()}

  <div class="sec">Calendar</div>
  <div class="list">
   <div class="srow"><div class="tx"><div class="t">Show public holidays</div><div class="s">New Zealand public holidays and Auckland Anniversary Day (Northland’s regional holiday). Built in, works offline.</div></div><button class="switch ${showHolidays() ? 'on' : ''}" role="switch" aria-checked="${showHolidays()}" aria-label="Show public holidays" onclick="toggleSetting('holidays')"></button></div>
   <div class="srow"><div class="tx"><div class="t">Show planned meals</div><div class="s">Meals from the Meal planner, tagged “Meal”.</div></div><button class="switch ${showMealsCal() ? 'on' : ''}" role="switch" aria-checked="${showMealsCal()}" aria-label="Show planned meals on the Calendar" onclick="toggleMealsCal()"></button></div>
   <div class="srow"><div class="tx"><div class="t">Show my events</div><div class="s">Your own events like payday or rubbish day, tagged “My event”.</div></div><button class="switch ${showMine() ? 'on' : ''}" role="switch" aria-checked="${showMine()}" aria-label="Show my events on the Calendar" onclick="toggleMineCal()"></button></div>
   <div class="srow"><div class="tx"><div class="t">Show pets</div><div class="s">Flea treatment, vaccinations and other pet care from Pets &amp; Vet, tagged “Pet”.</div></div><button class="switch ${showPetsCal() ? 'on' : ''}" role="switch" aria-checked="${showPetsCal()}" aria-label="Show pet care on the Calendar" onclick="togglePetsCal()"></button></div>
   <div class="srow"><div class="tx"><div class="t">Show health</div><div class="s">Check-ups and booked appointments from Health, tagged “Health”.</div></div><button class="switch ${showHealthCal() ? 'on' : ''}" role="switch" aria-checked="${showHealthCal()}" aria-label="Show health on the Calendar" onclick="toggleHealthCal()"></button></div>
  </div>

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
  <div class="foot">Car &amp; Life Due Dates · version ${APP_VERSION}<br>${savedWhere()}</div>`;
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
    confirmSheet('Restore this backup?', `This replaces everything on this phone with the backup${when}: ${plural(d.cars.length, 'car')}, ${plural(d.bills.length, 'bill')}, ${plural(d.todos.length, 'to-do')}, ${plural((d.appts || []).length, 'appointment')}, ${plural((d.birthdays || []).length, 'birthday')}, ${plural((d.ideas || []).length, 'idea')}, ${plural((d.drivers || []).length, 'driver')}, ${plural(Object.keys((d.meals && d.meals.plan) || {}).length, 'planned meal')}, ${plural(Array.isArray(d.pets) ? d.pets.length : 0, 'pet')}, ${plural(Array.isArray(d.health) ? d.health.length : 0, 'person', 'people')} in Health, ${plural(Array.isArray(d.myEvents) ? d.myEvents.length : 0, 'event')} of your own, ${plural(d.commission && Array.isArray(d.commission.entries) ? d.commission.entries.length : 0, 'commission entry', 'commission entries')} and ${plural(Array.isArray(d.loans) ? d.loans.length : 0, 'loan')}.`, 'Restore', async () => {
      const s = snap(); S = normalise(d); const mn = takeMealNote(); await save(); render(); toast('Backup restored.' + (mn && mn.includes('→') ? ' ' + mn : ''), 'Undo', undoTo(s)); syncFeeds(true);
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
const MORE_PAGES = ['more', 'settings', 'pet', 'loan']; // pages that always light up More
const ROUTE_ITEM = { car: 'cars', driver: 'cars', pet: 'pets', loan: 'loans', recipe: 'recipes' }; // detail pages belong to their section
function tabbar(active) {
  const over = dueItems(S).filter(x => x.days < 0).length;
  const moreBadge = S.bills.filter(b => !b.paid && daysLeft(b.due) < 0).length + S.birthdays.filter(b => daysLeft(nextBday(b)) === 0).length;
  const listed = new Set(NAV_GROUPS.flatMap(g => g.keys));
  const badge = k => k === 'home' && over ? `<span class="badge">${over}</span>` : k === 'more' && moreBadge && !(listed.has('bills') && listed.has('birthdays')) ? `<span class="badge">${moreBadge}</span>` : '';
  const meta = k => k === 'home' ? ['Home', 'home'] : k === 'settings' ? ['Settings', 'gear'] : k === 'more' ? ['More', 'more'] : [NAV[k][2], NAV[k][0]];
  const btn = k => {
    const [l, ic] = meta(k);
    return `<button class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''} onclick="setTabsOpen(false);go('#${k}')"><span class="w">${I(ic)}${badge(k)}</span><span class="lbl">${l}</span></button>`;
  };
  const groups = NAV_GROUPS.map(g => `<div class="tabgrp g-${g.id}">${g.title ? `<div class="tabgh">${g.title}</div>` : ''}${g.keys.map(btn).join('')}</div>`).join('');
  $('#tabbar').innerHTML = groups + `<div class="tabend">${['settings', 'more'].map(btn).join('')}</div>`;
}
function activeTab(r) {
  const item = ROUTE_ITEM[r] || r, tabs = navOrder();
  if (r === 'settings') return 'settings';
  if (tabs.includes(item)) return item;
  if (r === 'home' || r === 'weather' || r === 'drivers' || !r) return 'home';
  return NAV[item] || MORE_PAGES.includes(r) ? 'more' : 'home';
}
let renderedDay = todayISO();
function render() {
  if (!S) return;
  applyTheme();
  applyTextSize();
  renderedDay = todayISO(); extReg = [];
  const h = (location.hash || '#home').slice(1), [r, arg] = h.split('/');
  const map = { home: Home, cars: Cars, bills: Bills, todo: Todo, calendar: Calendar, settings: Settings, more: More, birthdays: Birthdays, ideas: Ideas, events: Events, weather: Weather, bridge: Bridge, meals: Meals, recipes: Recipes, shopping: Shopping, pets: Pets, loans: Loans, videos: Videos, top40: Top40, reminders: Reminders, tv: TvGuide };
  if (r !== 'home' && r !== '') homeEdit = false;
  $('#view').innerHTML = r === 'car' ? CarDetail(arg) : r === 'driver' ? DriverDetail(arg) : r === 'meals' ? Meals(arg) : r === 'recipe' ? RecipeDetail(arg) : r === 'pet' ? PetDetail(arg) : r === 'commission' ? Commission(arg) : r === 'loan' ? LoanDetail(arg) : r === 'health' ? Health(arg, h.split('/')[2]) : r === 'garden' ? (arg ? GardenDetail(arg) : Garden()) : (map[r] || Home)();
  if (pendingNight && r === 'meals' && !arg) showPendingNight(); else pendingNight = null;
  if (r === 'commission') { const sc = $('#commsetup'); if (sc) wireAnchor(sc); else if (arg === 'add') { history.replaceState(history.state, '', '#commission'); setTimeout(() => commForm(null, yesterdayISO()), 0); } }
  tabbar(activeTab(map[r] || NAV[ROUTE_ITEM[r] || r] || MORE_PAGES.includes(r) ? r : 'home'));
  if ((r === 'home' || r === '') && homeEdit) wireReorder();
  if (r === 'videos') { wireVideoSwipe(); const tab = document.querySelector('#videotabs .chip.on'); if (tab) tab.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }
}
window.addEventListener('online', () => { if (S) { syncFeeds(); refreshWx(); refreshEvents(); refreshRoadworks(); refreshTv(); } });
window.addEventListener('offline', () => { if (S) updWx(); });
window.addEventListener('hashchange', () => { setTabsOpen(false); if (sheetOpen) hideSheet(); render(); $('#view').scrollTop = 0; });

/* ---------- on-screen keyboard (v1.6.1) ----------
   Only #view scrolls. When the Android keyboard opens (interactive-widget=resizes-content shrinks
   the viewport) a text field can sit under the keys, so body.kb tightens the bottom padding while
   a text field has focus and the viewport is clearly shorter than its full height. The tab strip
   is on the left (v1.50.0), not along the bottom. Also keep the page itself from ever scrolling. */
const kbState = { full: 0, w: 0 };
function isTextField(el) {
  if (!el || !el.tagName) return false;
  if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
  if (el.tagName !== 'INPUT') return false;
  return !/^(checkbox|radio|date|time|datetime-local|month|week|file|range|color|button|submit|reset|image|hidden)$/i.test(el.type || 'text');
}
function kbCheck() {
  const h = window.visualViewport ? Math.round(visualViewport.height * (visualViewport.scale || 1)) : window.innerHeight;
  const w = window.innerWidth, typing = isTextField(document.activeElement);
  if (w !== kbState.w) { kbState.w = w; kbState.full = h; } // rotated: start again
  if (!typing || h > kbState.full) kbState.full = h;
  const open = typing && kbState.full - h > 150;
  document.body.classList.toggle('kb', open);
  if (document.scrollingElement && document.scrollingElement.scrollTop) document.scrollingElement.scrollTop = 0;
  const app = document.getElementById('app'); if (app && app.scrollTop) app.scrollTop = 0;
}
window.addEventListener('resize', kbCheck);
kbCheck();
if (window.visualViewport) visualViewport.addEventListener('resize', kbCheck);
document.addEventListener('focusin', () => setTimeout(kbCheck, 0));
document.addEventListener('focusout', () => setTimeout(kbCheck, 0));
window.addEventListener('scroll', () => { if (!document.body.classList.contains('kb') && document.scrollingElement.scrollTop) document.scrollingElement.scrollTop = 0; });

/* ---------- left tab strip (v1.50.0) ----------
   Hidden off the left edge. A swipe that starts on that edge pulls it open. A swipe back,
   or a tap outside the strip, hides it. 1.94.0 groups the items. Press-and-hold reorder stays on Customise Home. */
let tabsOpen = false;
const TABS_HIDDEN = 'translateX(calc(-100% - 16px))';
function setTabsOpen(on, animate) {
  tabsOpen = !!on;
  document.body.classList.toggle('tabs-open', tabsOpen);
  const bar = document.getElementById('tabbar');
  const scrim = document.getElementById('tabscrim');
  if (bar) {
    bar.style.transition = animate === false ? 'none' : 'transform .22s cubic-bezier(.2,.8,.2,1)';
    if (animate !== false) void bar.offsetWidth;
    bar.style.transform = tabsOpen ? 'translateX(0)' : TABS_HIDDEN;
    bar.setAttribute('aria-hidden', tabsOpen ? 'false' : 'true');
    bar.inert = !tabsOpen;
    if (!tabsOpen && bar.contains(document.activeElement)) document.activeElement.blur();
  }
  if (scrim) scrim.hidden = !tabsOpen;
}
let tabSwallow = false;
function armTabSwallow() {
  tabSwallow = true;
  setTimeout(() => { tabSwallow = false; }, 400);
}
function wireTabSwipe() {
  const EDGE = 20;
  let g = null;
  const barEl = () => document.getElementById('tabbar');
  const appEl = () => document.getElementById('app');
  const barW = () => { const b = barEl(); return (b && b.offsetWidth) || 96; };
  document.addEventListener('pointerdown', e => {
    if (g || sheetOpen || e.isPrimary === false || (e.button != null && e.button !== 0)) return;
    if (rd) return;
    const app = appEl(); if (!app) return;
    const left = app.getBoundingClientRect().left;
    const onBar = !!e.target.closest('#tabbar');
    if (!tabsOpen) {
      if (e.clientX - left > EDGE) return;
      if (e.target.closest('.reorder')) return;
    } else if (!onBar) {
      g = { mode: 'outside', x: e.clientX, y: e.clientY, pid: e.pointerId, dx: 0, drag: false, left, t: performance.now(), lx: e.clientX, vx: 0 };
      return;
    }
    g = { mode: tabsOpen ? 'close' : 'open', x: e.clientX, y: e.clientY, pid: e.pointerId, dx: 0, drag: false, left, t: performance.now(), lx: e.clientX, vx: 0 };
  }, true);
  document.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.pid) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    const now = performance.now();
    g.vx = (e.clientX - g.lx) / Math.max(1, now - g.t);
    g.lx = e.clientX; g.t = now;
    if (g.mode === 'outside') {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }
      if (dx > -10) return;
      g.mode = 'close';
    }
    if (!g.drag) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }
      if (g.mode === 'open' && dx < 8) return;
      if (g.mode === 'close' && dx > -8) return;
      if (Math.abs(dx) < 8) return;
      g.drag = true;
      document.body.classList.add('tabs-drag');
      const b = barEl();
      if (b) b.style.transition = 'none';
    }
    g.dx = dx;
    if (e.cancelable) e.preventDefault();
    const b = barEl(); if (!b) return;
    const w = barW() + 16;
    const tx = g.mode === 'open' ? Math.min(0, -w + dx) : Math.max(-w, Math.min(0, dx));
    b.style.transform = 'translateX(' + tx + 'px)';
  }, { passive: false });
  const end = e => {
    if (!g || (e && e.pointerId != null && e.pointerId !== g.pid)) return;
    const st = g; g = null;
    document.body.classList.remove('tabs-drag');
    if (st.drag) {
      armTabSwallow();
      if (st.mode === 'open') setTabsOpen(st.dx > 52 || st.vx > 0.45);
      else setTabsOpen(!(st.dx < -40 || st.vx < -0.45));
      return;
    }
    if (tabsOpen && st.mode === 'outside') { armTabSwallow(); setTabsOpen(false); }
  };
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);
  document.addEventListener('click', e => {
    if (!tabSwallow) return;
    tabSwallow = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  const bar = barEl();
  if (bar) bar.inert = true;
}
wireTabSwipe();

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
  await loadMail();
  await finishMailSignIn();
  loadWx(); loadEvs(); loadCls(); loadRoadworks(); loadTv();
  render();
  const shopNote = takeShopNote(); if (shopNote) { save().catch(() => { }); setTimeout(() => toast(shopNote, 'View', () => go('#shopping')), 900); }
  const mealNote = takeMealNote(); if (mealNote) { save().catch(() => { }); setTimeout(() => toast(mealNote), 700); }
  phoneSyncOpen();
  syncFeeds(); refreshWx(); refreshEvents(); refreshRoadworks(); refreshTv(); refreshSarah();
  mailConfig().then(() => { if (!sheetOpen && location.hash === '#settings') render(); });
  refreshMail();
  if (brMode() !== 'off' || location.hash === '#bridge') { refreshClosures(); refreshBridgeTraffic(); }
  checkBridgeLoc(true);
  if ('serviceWorker' in navigator) {
    let hadController = !!navigator.serviceWorker.controller, reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloading) { reloading = true; if (sheetOpen) reloadPending = true; else location.reload(); }
      hadController = true;
    });
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'go') go(e.data.hash); });
    try { swReg = await navigator.serviceWorker.register('sw.js'); } catch (e) { swReg = null; }
    scheduleReminders().catch(() => { });
  }
  if (isStandalone()) requestPersist();
  await setupBackground();
  if (!sheetOpen && location.hash === '#settings') render();
  check();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!sheetOpen) { try { const d = await kvGet('data'); if (d) S = normalise(d); } catch (e) { } render(); }
    phoneSyncOpen();
    check();
    syncFeeds(); refreshWx(); refreshEvents(); refreshRoadworks(); refreshTv(); refreshSarah();
    refreshMail();
    if (brMode() !== 'off') { refreshClosures(); refreshBridgeTraffic(); }
    checkBridgeLoc(true);
    if (swReg) swReg.update().catch(() => { });
    scheduleReminders().catch(() => { });
  });
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (todayISO() !== renderedDay && !sheetOpen) render();
    check();
    syncFeeds(); refreshWx(); refreshMail();
    updBridge(); checkBridgeLoc();
  }, 60 * 1000);
}
start();
