/* Info Book 1.9.0 – keep-coming-back features for the family network (members only; nothing here runs without a family link):
   🔔 push notifications, 💭 daily question / 📸 photo challenge, 🧠 daily trivia, 🕰️ On this day, 🔥 streaks & badges,
   🎂 birthdays & family events, 🚗 car due dates Shane shares with one person, and the gentle per-person suggestions Shane
   sets (life stage). Loaded after app.js; it adds cards through pins(), card() and popW(). */
'use strict';
const X = { daily: null, triv: null, mems: [], dates: [], cars: [], prof: null, push: null, streaks: [], st: null, reno: null, wx: [], got: 0 };
const MILES = [3, 7, 14, 30, 50, 100], MILE_NAME = { 3: '✨ Warming up', 7: '🔥 One week', 14: '⚡ Fortnight', 30: '🌟 One month', 50: '🏅 Fifty days', 100: '👑 Century' };
const NZ = (t, o) => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', ...o }).format(t);
const nzKey = (t = Date.now()) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }).replace(/-/g, '');
const dayN = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / 864e5), todayN = () => dayN(new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }));
const inDays = n => n < 0 ? (n === -1 ? 'yesterday' : -n + ' days ago') : n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days';
const ICON = '🎂';

/* ---- load everything (members only), refreshed with the family data ---- */
async function xLoad(force) {
  if (!FAM_ON || (!force && Date.now() - X.got < 60e3)) return; X.got = Date.now();
  const g = (p, d) => fam(p).catch(() => d);
  const [daily, triv, mems, dates, cars, prof, push, streaks, reno, wx, sap] = await Promise.all([g('/daily', null), g('/trivia', null), g('/memories', []), g('/dates', { list: [] }), g('/cars', { cars: [] }), g('/profile', null), g('/push/prefs', null), g('/streaks', { list: [] }), g('/reno', { reno: null }), g('/weather', { list: [] }), g('/sappts', { list: [] })]);
  const pw = await g('/power', { list: [] }); X.pwr = (pw && pw.list) || []; X.pwrAt = (pw && pw.checked) || 0;
  Object.assign(X, { daily, triv, mems: Array.isArray(mems) ? mems : [], dates: (dates && dates.list) || [], myBday: dates && 'mine' in dates ? dates.mine : undefined, bdImp: (dates && dates.imp) || 0, cars: (cars && cars.cars) || [], prof, push, streaks: (streaks && streaks.list) || [], reno: (reno && reno.reno) || null, wx: (wx && wx.list) || [], sappt: (sap && sap.list) || [], saCfg: (sap && sap.cfg) || null });
  if (prof && prof.streak) stChip(prof.streak);
  if (IS_ADMIN) { carSync(); apptSync(); bdImport().then(bdToMyApp); }
  setTimeout(bdAsk, 3500); // 1.9.35 🎂 ask once for a birthday if we don't have one
  if (tab === 'all' && scrollY < 300) draw(); else if (tab === 'family') draw();
}
async function xVisit() { // 1.9.1 just opening Info Book counts for the day's streak (NZ time)
  if (!FAM_ON) return; const k = nzKey(); if (ls.get('visitDay', '') === k && X.st) return;
  try { const r = await fam('/visit', { method: 'POST', body: JSON.stringify({ mode: STANDALONE ? 'installed' : IN_APP ? 'inapp' : 'browser', plat: IS_IOS ? 'iphone' : /Android/i.test(navigator.userAgent) ? 'android' : 'desktop' }) }); ls.set('visitDay', k); X.st = r; stChip(r); celebrate(r); } catch (e) { }
}
function stChip(s) { // 🔥 N-day streak, next to the greeting
  const el = $('#stchip'); if (!el || !s) return; X.st = s;
  if (!s.cur) { el.hidden = true; return; }
  el.hidden = false; el.innerHTML = `🔥 ${s.cur}<span class="stw">-day streak</span><span class="stn"> day${s.cur === 1 ? '' : 's'}</span>`; el.setAttribute('aria-label', `${s.cur}-day streak`); el.title = `Best ${s.best} days${s.freezeLeft ? ' · streak freeze ready this week' : ' · this week’s freeze used'}`;
  el.classList.toggle('hot', s.cur >= 7);
}
function celebrate(s) { // milestones 3/7/14/30/50/100 – once each; and a note when the weekly freeze saved the streak
  if (s.award && !$('#celeb')) { // 1.9.30 🎉 one-time streak award (+2 days), shown once; the server remembers it was seen
    document.body.insertAdjacentHTML('beforeend', `<div id="celeb" class="celeb award" role="dialog" aria-label="Streak award"><div class="cin"><div class="cfx" aria-hidden="true">${'🎉✨🔥⭐🎊'.repeat(4).match(/./gu).map((e, k) => `<i style="--x:${(k * 37) % 100}%;--d:${(k % 5) * 0.15}s">${e}</i>`).join('')}</div>
      <div class="cbig">🎉 +2</div><h2>Streak award!</h2><p>+2 days added to your 🔥 streak${s.cur ? ` – you’re on <b>${s.cur} days</b>` : ''}. Keep opening Info Book each day to keep it growing.</p><p class="sst">New badge: 🎉 Streak award</p><button class="btn pri" id="celebok">Yay!</button></div></div>`);
    fam('/visit/award', { method: 'POST', body: '{}' }).catch(() => { }); return;
  }
  const last = ls.get('stCeleb', 0), fz = (s.frozen || []).slice(-1)[0];
  if (fz && ls.get('stFrozeSeen', '') !== fz && s.cur >= 2) { ls.set('stFrozeSeen', fz); setTimeout(() => toast(`🧊 Your weekly streak freeze covered a missed day – still on ${s.cur} days!`), 2500); }
  if (!s.milestone || s.milestone <= last) return; ls.set('stCeleb', s.milestone);
  const m = s.milestone; document.body.insertAdjacentHTML('beforeend', `<div id="celeb" class="celeb" role="dialog" aria-label="Streak milestone"><div class="cin"><div class="cfx" aria-hidden="true">${'🎉✨🔥⭐🎊'.repeat(4).match(/./gu).map((e, k) => `<i style="--x:${(k * 37) % 100}%;--d:${(k % 5) * .15}s">${e}</i>`).join('')}</div>
    <div class="cbig">🔥 ${m}</div><h2>${m}-day streak!</h2><p>You’ve opened Info Book ${m} days in a row. New badge: <b>${MILE_NAME[m]}</b></p>${s.next ? `<p class="sst">Next milestone: ${s.next} days</p>` : ''}<button class="btn pri" id="celebok">Yay!</button></div></div>`);
}
/* ---- 🏠 Millesha's renovation: same for everyone, live countdown to the finish date (jobs come from My App's reno list) ---- */
function renoItem() {
  const r = X.reno; if (!r || !r.deadline) return null;
  const n = dayN(r.deadline) - todayN(); if (n < 0 && !r.finished) return null; if (r.finished && n < -3) return null; // gone once the deadline has passed
  return { id: 'reno', x: 'reno', r, n, topic: 'family', t: 'Millesha’s renovation', sn: 'Renovation' };
}
function renoCard(i) {
  const r = i.r, n = i.n, dl = new Date(r.deadline + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dshort = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const big = r.finished ? 'Finished! 🎉' : n === 0 ? 'Finish day – today!' : n === 1 ? '1 day to go' : n + ' days to go';
  return `<article class="card xc reno" data-id="reno">${xHead('🏠', 'Millesha’s renovation', 'Finish by ' + dl + ' · from Millesha’s checklist', 'Reno')}
    <div class="bd"><div class="rnbig${n <= 7 && !r.finished ? ' soon' : ''}">${big}</div>
    <div class="rnbar" role="progressbar" aria-valuenow="${r.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${r.pct}%"></i></div>
    <p class="xwho"><b>${r.pct}% done</b> · ${r.done} of ${r.total} jobs ticked off · ${r.left} to go${r.doing ? ` (${r.doing} in progress)` : ''}</p>
    ${r.finished ? '' : `<h4 class="rnh">Next up</h4><ul class="rnl">${(r.next || []).map(j => `<li><span>${j.e} <b>${esc(j.area)}</b> · ${esc(j.job)}</span><em>${j.st === 'doing' ? '🔨 in progress' : j.due ? 'due ' + esc(dshort(j.due)) : 'to do'}${j.who ? ' · ' + esc(j.who) : ''}</em></li>`).join('')}</ul>`}</div></article>`;
}
/* ---- 1.9.1 🎄 Christmas and 🎆 New Year countdowns for everyone: not pinned – dropped at random spots (new spots on each load or refresh,
   never in the first two cards, never next to each other); a celebration card on the day, then gone ---- */
const FEST = [{ k: 'xmas', iso: '2026-12-25', em: '🎄', what: 'Christmas', day: 'Merry Christmas! 🎄', img: 'img/xmas.webp' }, { k: 'ny', iso: '2027-01-01', em: '🎆', what: 'New Year’s Day', day: 'Happy New Year! 🎆', img: 'img/newyear.webp' }];
let FEST_POS = null, FEST_FOR;
window.festive = function (order, nPins) {
  const T = todayN(), list = FEST.map(f => ({ ...f, n: dayN(f.iso) - T })).filter(f => f.n >= 0); if (!list.length || order.length < 4) return order;
  const lo = Math.max(2, nPins); // always below every pinned card, even when more pins arrive later
  if (!FEST_POS || FEST_FOR !== FEED) { FEST_FOR = FEED; const span = Math.max(6, Math.min(12, order.length - lo)), r = () => Math.floor(Math.random() * span);
    let a = r(), b = r(), g = 0; while (Math.abs(a - b) < 2 && g++ < 20) b = r(); FEST_POS = [a, b]; }
  const out = order.slice(), ins = list.map((f, k) => [lo + FEST_POS[k], { id: 'fest-' + f.k, x: 'fest', f, t: f.what, topic: 'family' }]).sort((p, q) => p[0] - q[0]);
  for (const [pos, it] of ins) out.splice(Math.min(pos, out.length), 0, it);
  return out;
};
function festCard(i) {
  const f = i.f, n = dayN(f.iso) - todayN(); if (n < 0) return '';
  const when = new Date(f.iso + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const big = n === 0 ? f.day : `${f.em} ${n} ${n === 1 ? 'day' : 'days'} to ${f.what}`, sub = n === 0 ? `Have a wonderful day, whānau!` : `${n === 1 ? '1 sleep' : n + ' sleeps'} · ${when}`;
  return `<article class="card xc fest ${f.k}" data-id="fest-${f.k}"><div class="fsbg" style="background-image:url('${f.img}')"><div class="fsin"><b>${esc(big)}</b><small>${esc(sub)}</small></div></div></article>`;
}
/* ---- ⚠️ MetService severe weather (official warnings and watches) ---- */
const WXE = { rain: '🌧️', wind: '💨', snow: '❄️', thunderstorm: '⛈️', heat: '🥵', swell: '🌊', fog: '🌫️' };
const wxWhen = w => { const f = t => NZ(t, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).replace(':00', ''); return (w.onset > Date.now() ? 'From ' + f(w.onset) : 'Now') + ' until ' + f(w.expires); };
function wxCard(i) {
  const w = i.w, lvl = w.colour === 'red' ? 'RED warning' : w.colour === 'orange' ? 'Orange warning' : 'Watch', reg = 'Covers Whangārei';
  const pic = { rain: 'rain', wind: 'wind', thunderstorm: 'thunderstorm', snow: 'snow', swell: 'swell' }[w.event] || 'warn';
  return `<article class="card xc wx ${esc(w.colour)}" data-id="${esc(i.id)}">${xHead(WXE[w.event] || '⚠️', (w.test ? 'TEST – ' : '') + w.head.replace(/\s*-\s*(Orange|Red)$/i, ''), 'MetService · ' + reg, lvl)}
    <a class="media" href="${esc(w.web)}" target="_blank" rel="noopener"><img src="img/alert-${pic}.svg" alt="${esc(w.head)}"></a><div class="bd"><div class="wxlv">${w.colour === 'red' ? '🔴' : w.colour === 'orange' ? '🟠' : '🟡'} ${esc(lvl)}${w.test ? ' · <b>TEST ONLY – not a real warning</b>' : ''}</div><p class="wxa"><b>${esc(w.area)}</b></p><p class="wxt">🕑 ${esc(wxWhen(w))}</p>
    <p class="xwho">${esc(w.desc)}</p>${w.act ? `<p class="xwho">👉 ${esc(w.act)}</p>` : ''}<div class="xbtns"><a class="btn pri" href="${esc(w.web)}" target="_blank" rel="noopener">MetService warnings ↗</a>${w.link ? `<a class="btn" href="${esc(w.link)}" target="_blank" rel="noopener">Official alert</a>` : ''}</div></div></article>`;
}
/* ---- 1.9.30 ⚡ Northpower power cuts in Whangārei District (unplanned now, planned within 48 hours) ---- */
const pwT = t => NZ(t, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).replace(':00', '');
function pwrCard(i) {
  const o = i.o, un = o.kind === 'unplanned', ar = (o.areas || []).join(', ') || o.title;
  return `<article class="card xc pwr ${un ? 'un' : 'pl'}" data-id="${esc(i.id)}">${xHead('⚡', (o.test ? 'TEST – ' : '') + (un ? 'Power cut: ' : 'Planned power cut: ') + ar, 'Northpower · Whangārei District', un ? 'Unplanned' : 'Planned')}
    <a class="media" href="https://outages.northpower.nz/" target="_blank" rel="noopener"><img src="img/alert-power${un ? '' : '-planned'}.svg" alt="Power cut"></a>
    <div class="bd"><div class="wxlv">${un ? '🔴 Unplanned outage – happening now' : '🗓️ Planned (scheduled) – not a fault'}${o.test ? ' · <b>TEST ONLY – not a real outage</b>' : ''}</div>
    <p class="wxa"><b>${esc(ar)}</b>${o.roads && o.roads.length ? ` · ${esc(o.roads.slice(0, 4).join(', '))}` : ''}${o.locality ? ` · ${esc(o.locality)}` : ''}</p>
    <p class="wxt">🏠 About ${+o.customers || 'some'} ${+o.customers === 1 ? 'property' : 'properties'} affected</p>
    <p class="wxt">🕑 ${un ? (o.start ? 'Off since ' + esc(pwT(o.start)) : 'Off now') + (o.etr ? ' · back on by about ' + esc(pwT(o.etr)) : ' · no restoration time yet') : esc(pwT(o.start)) + (o.end ? ' until ' + esc(pwT(o.end)) : '')}</p>
    ${o.cause ? `<p class="xwho">🔧 ${un ? 'Cause' : 'Reason'}: ${esc(o.cause)}</p>` : ''}${o.status ? `<p class="xwho">📋 ${esc(o.status)}</p>` : ''}${o.msg ? `<p class="xwho">${esc(o.msg)}</p>` : ''}
    <p class="sst">No power and not listed? Phone Northpower on <a href="tel:0800104040">0800 10 40 40</a>. Emergencies: 111.</p>
    <div class="xbtns"><a class="btn pri" href="https://outages.northpower.nz/" target="_blank" rel="noopener">Northpower outages ↗</a></div></div></article>`;
}
function pwrListCard(i) { // several planned ones: one card
  return `<article class="card xc pwr pl" data-id="${esc(i.id)}">${xHead('⚡', 'Planned power cuts – next 48 hours', 'Northpower · Whangārei District', 'Planned')}
    <a class="media" href="https://outages.northpower.nz/" target="_blank" rel="noopener"><img src="img/alert-power-planned.svg" alt="Planned power cuts"></a>
    <div class="bd"><div class="wxlv">🗓️ Planned (scheduled) maintenance – not faults</div><ul class="rnl">${i.list.map(o => `<li><span>${o.test ? '<b>TEST</b> ' : ''}<b>${esc((o.areas || []).join(', ') || o.title)}</b> · ${+o.customers || '?'} ${+o.customers === 1 ? 'property' : 'properties'}${o.cause ? ' · ' + esc(o.cause) : ''}</span><em>${esc(pwT(o.start))}${o.end ? ' – ' + esc(NZ(o.end, { hour: 'numeric', minute: '2-digit' })) : ''}</em></li>`).join('')}</ul>
    <div class="xbtns"><a class="btn" href="https://outages.northpower.nz/" target="_blank" rel="noopener">Northpower outages ↗</a></div></div></article>`;
}
function wxNzCard(i) {
  return `<article class="card xc wx nzsum" data-id="wx-nz">${xHead('⚠️', 'Severe weather elsewhere in NZ', 'MetService warnings now and coming up', 'Weather')}
    <div class="bd"><ul class="rnl">${i.list.slice(0, 6).map(w => `<li><span>${w.colour === 'red' ? '🔴' : '🟠'} ${WXE[w.event] || '⚠️'} <b>${esc(w.head.replace(/\s*-\s*(Orange|Red)$/i, ''))}</b> · ${esc(w.area.split(';')[0].slice(0, 70))}</span><em>${esc(wxWhen(w))}</em></li>`).join('')}</ul>
    <div class="xbtns"><a class="btn" href="https://www.metservice.com/warnings/home" target="_blank" rel="noopener">All MetService warnings ↗</a></div></div></article>`;
}
/* ---- 1.9.30 📲 install prompt for anyone using Info Book in a browser tab: one-tap install (Chrome/Android), Share → Add to Home Screen
   steps (iPhone), or "open in Chrome/Safari first" with a copy-my-link button (Messenger/Facebook). "Later" hides it for 3 days. ---- */
let BIP = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); BIP = e; installBanner(true); });
addEventListener('appinstalled', () => { ls.set('installed', 1); document.querySelector('#instb')?.remove(); toast('📲 Installed – open Info Book from your home screen'); });
const SHARE_SVG = '<svg class="shic" viewBox="0 0 24 24" width="18" height="18" aria-label="Share"><path d="M12 3v12M7 8l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function installKind() { if (IN_APP) return 'inapp'; if (IS_IOS) return 'ios'; if (BIP) return 'android'; if (/Android/i.test(navigator.userAgent)) return 'android-menu'; return ''; }
function installBanner(redo) {
  if (STANDALONE || ls.get('installed', 0) || Date.now() - ls.get('instLater', 0) < 3 * 864e5) return;
  const k = installKind(); if (!k) return; const old = document.querySelector('#instb'); if (old && !redo) return; old?.remove();
  const body = k === 'inapp' ? `<b>Open Info Book in Chrome or Safari first</b><p>Messenger and Facebook open links in their own little browser, where Info Book can’t be installed or send notifications.</p><ol><li>Tap <b>⋯</b> (top right) → <b>Open in Chrome</b> / <b>Open in Safari</b> – or copy your link and paste it there.</li><li>Then install it from there.</li></ol><div class="xbtns"><button class="btn pri" id="instcopy">📋 Copy my link</button><button class="btn" id="instlater">Later</button></div><small class="sst">Your link keeps you signed in – don’t share it with anyone else.</small>`
    : k === 'ios' ? `<b>Add Info Book to your Home Screen</b><p>It opens full screen like an app, and can send family notifications.</p><ol class="iost"><li>Tap the <b>Share</b> button ${SHARE_SVG} at the bottom of Safari.</li><li>Scroll down and tap <b>Add to Home Screen</b> <span class="plus">＋</span>.</li><li>Tap <b>Add</b>, then open <b>Info Book</b> from your Home Screen.</li></ol><div class="xbtns"><button class="btn" id="instlater">Later</button></div>`
    : k === 'android' ? `<b>Install Info Book</b><p>One tap – it goes on your home screen, opens like an app and can send family notifications.</p><div class="xbtns"><button class="btn pri" id="instgo">📲 Install Info Book</button><button class="btn" id="instlater">Later</button></div>`
    : `<b>Install Info Book</b><p>Tap the <b>⋮</b> menu in Chrome → <b>Install app</b> (or <b>Add to Home screen</b>). It then opens like an app and can send notifications.</p><div class="xbtns"><button class="btn" id="instlater">Later</button></div>`;
  $('#feed').insertAdjacentHTML('beforebegin', `<section id="instb" class="instb ${k}" role="region" aria-label="Install Info Book"><div class="ic"><img src="icons/icon-192.png" width="44" height="44" alt=""></div><div class="tx">${body}</div></section>`);
}
async function copyLink() {
  const link = location.origin + location.pathname.replace(/[^/]*$/, '') + (MEMBER && MEMBER.tok ? '?invite=' + encodeURIComponent(MEMBER.tok) : '');
  try { await navigator.clipboard.writeText(link); toast('📋 Link copied – paste it into Chrome or Safari'); } catch (e) { prompt('Copy this link and open it in Chrome or Safari:', link); }
}
setTimeout(() => installBanner(), 2500);
function streakCard() { // Family tab: who's on a streak, top streaks
  const L = X.streaks || []; if (!L.length) return '';
  const on = L.filter(r => r.cur > 0), top = L.slice().sort((a, b) => b.best - a.best)[0];
  return `<article class="card xc streaks" data-id="streaks">${xHead('🔥', 'Family streaks', 'Open Info Book each day to keep yours going', 'Streaks')}
    <div class="bd">${on.length ? `<div class="srows">${on.slice(0, 9).map((r, k) => `<div class="srow${r.me ? ' me' : ''}"><span class="sn">${k < 3 ? ['🥇', '🥈', '🥉'][k] : '·'} ${esc(r.me ? 'You' : r.name)}</span><span class="sb">🔥 ${r.cur} day${r.cur === 1 ? '' : 's'}${r.today ? '' : ' <small>(not in yet today)</small>'}</span></div>`).join('')}</div>` : '<p class="xwho">Nobody’s on a streak yet – open the app tomorrow too and you’ll start one.</p>'}
    ${top && top.best > 1 ? `<p class="xwho">🏆 Longest ever: <b>${esc(top.me ? 'You' : top.name)}</b> · ${top.best} days</p>` : ''}<p class="sst">🧊 Everyone gets one free streak freeze a week, so one missed day won’t reset it. Milestones at 3, 7, 14, 30, 50 and 100 days.</p></div></article>`;
}

/* ---- cards added at the top of All (and the daily one in Family) ---- */
const basePins = pins;
const urlBase = u => String(u || '').split('?')[0].replace(/\/$/, '');
let PIN_URLS = null, PIN_FOR = null;
const pinUrls = () => (PIN_FOR === FEED && PIN_URLS) || (PIN_FOR = FEED, PIN_URLS = new Set((typeof FEED !== 'undefined' && FEED && FEED.items || []).filter(i => i.pin).map(i => urlBase(i.url))));
window.pins = function () {
  const out = [];
  const W = (X.wx || []).filter(w => w.expires > Date.now()), wl = W.filter(w => w.wg), wn = []; // 1.9.30: only warnings and watches that cover Whangārei
  for (const w of wl) out.push({ id: 'wx:' + w.id, x: 'wx', w, topic: 'family', t: w.head }); // ⚠️ Whangārei warnings go right to the top
  const PW = X.pwr || [], un = PW.filter(o => o.kind === 'unplanned'), pl = []; // 1.9.54 only unplanned power cuts // 1.9.30 ⚡ then power cuts
  for (const o of un.slice(0, 4)) out.push({ id: 'pw:' + o.id, x: 'pwr', o, topic: 'family', t: 'Power cut: ' + (o.areas || []).join(', ') });
  if (pl.length === 1) out.push({ id: 'pw:' + pl[0].id, x: 'pwr', o: pl[0], topic: 'family', t: 'Planned power cut' });
  else if (pl.length) out.push({ id: 'pw-planned', x: 'pwrl', list: pl.slice(0, 8), topic: 'family', t: 'Planned power cuts' });
  if (FAM_ON) {
    for (const c of X.cars) if (c.car && c.mid === MEMBER.id) out.push({ id: 'car:' + c.plate, x: 'car', c: c.car, at: c.at, topic: 'family' });
    for (const d of X.dates) if (d.days <= (d.kind === 'bday' ? 7 : 14) && !(VOTES['date' + d.id] && VOTES['date' + d.id].v < 0)) out.push({ id: 'date' + d.id + '-' + new Date().getFullYear(), x: 'date', d, topic: 'family', t: (d.kind === 'bday' ? '🎂 ' : '🎉 ') + d.title, sn: 'Family dates' });
    if (X.daily) out.push({ id: X.daily.key, x: 'daily', q: X.daily, topic: 'family', t: (X.daily.type === 'photo' ? '📸 ' : '💭 ') + X.daily.text, sn: 'Daily question' });
    if (X.triv && X.triv.qs) out.push({ id: 'trivia' + X.triv.day, x: 'trivia', q: X.triv, topic: 'family' });
    const sg = suggestion(); if (sg) out.push(sg);
  }
  const rn = renoItem(); return out.concat(basePins(), wn.length ? [{ id: 'wx-nz', x: 'wxnz', list: wn, topic: 'family', t: 'Severe weather elsewhere in NZ' }] : [], rn ? [rn] : []); // 🏠 reno sits just under the fireworks card
};
const baseDrawFamily = drawFamily;
window.drawFamily = function () {
  baseDrawFamily();
  if (!FAM_ON) return;
  const m = $('#feed'), first = m.querySelector('.load');
  const extra = [X.daily && { id: X.daily.key, x: 'daily', q: X.daily, topic: 'family', t: X.daily.text, sn: 'Daily question' }, X.streaks.length && { id: 'streaks', x: 'streaks', topic: 'family' }, ...memItems()].filter(Boolean); order = extra.concat(order);
  if (extra.length && first) { first.insertAdjacentHTML('afterend', extra.map(i => window.card(i)).join('')); fillFamPhotos(); famCounts(extra.filter(i => !i.x || i.x === 'daily')); }
};
function memItems() { return X.mems.slice(0, 3).map(r => { const s = { id: r.id, card: r.card, name: r.name, snap: r.snap, up: r.up, at: r.at, priv: true, likes: [], ups: [] }; const it = shareItem(s); it._mem = r.when; delete it._share; it.id = r.card; return it; }); }
const baseCard = card;
const baseCardW = i => baseCard(i);
window.card = function (i) {
  if (i && !i.x && !i.pin) nzWeatherNudge(i); // label is worked out when the card is drawn
  if (i && i._wxm && !i.x) return String(baseCardW(i)).replace(/^\s*<article /, `<article data-wxm="${esc(i._wxm)}" `);
  if (i && i.x === 'car') return carCard(i);
  if (i && i.x === 'date') return dateCard(i);
  if (i && i.x === 'daily') return dailyCard(i);
  if (i && i.x === 'streaks') return streakCard();
  if (i && i.x === 'reno') return renoCard(i);
  if (i && i.x === 'fest') return festCard(i);
  if (i && i.x === 'wx') return wxCard(i);
  if (i && i.x === 'wxnz') return wxNzCard(i);
  if (i && i.x === 'pwr') return pwrCard(i);
  if (i && i.x === 'pwrl') return pwrListCard(i);
  if (i && i.x === 'trivia') return triviaCard(i);
  if (i && i.x === 'sugg') return suggCard(i);
  const h = baseCard(i);
  return i && i._mem ? h.replace('<div class="hd">', `<div class="memb">🕰️ On this day · ${esc(i._mem)}</div><div class="hd">`) : h;
};
const xHead = (em, who, sub, tag) => `<div class="hd"><div class="av">${em}</div><div class="who"><b>${esc(who)}</b><small>${esc(sub)}</small></div><span class="tp">${esc(tag)}</span></div>`;

/* 1.9.30 the answers right on the card: photo answers (name, words, a thumbnail – tap to enlarge), the latest 3 first,
   "View all N" for the rest. Written answers show as the card's open comment thread. (Trivia never shows anyone's answers.) */
function dqLikeBtn(card, L) { L = Array.isArray(L) ? L : []; const on = L.some(x => typeof isMe === 'function' && isMe(x)); return `<button class="dqlk${on ? ' on' : ''}" data-dqlike="${esc(card)}" data-on="${on ? 1 : 0}" data-n="${L.length}" aria-pressed="${on}" title="${esc(L.map(x => x.name).join(', '))}">${on ? '❤️' : '🤍'} ${L.length || ''}</button>`; }
document.addEventListener('click', async e => {
  const t = e.target && e.target.closest; if (!t) return;
  const dm = e.target.closest('[data-dqmore]'); if (dm) { const b = dm.closest('.cmts'); b.querySelectorAll('.cl > [hidden]').forEach(x => x.hidden = false); dm.remove(); return; }
  const lk = e.target.closest('[data-dqlike]');
  if (lk) { // 1.9.33 one like per person: a repeat tap offers Undo instead
    const card = lk.dataset.dqlike, send = on => rxOnce('love:' + card, async () => { const b = document.querySelector(`[data-dqlike="${CSS.escape(card)}"]`); if (b) { b.disabled = true; if (on) b.classList.add('on', 'pend'); } try { const r = await fam('/likes', { method: 'POST', body: JSON.stringify({ card, kind: 'love', on }) }); document.querySelectorAll(`[data-dqlike="${CSS.escape(card)}"]`).forEach(x => x.outerHTML = dqLikeBtn(card, r.likes)); if (!on) toast('Like removed'); } catch (er) { if (b) { b.disabled = false; b.classList.remove('pend'); if (on) b.classList.remove('on'); } toast('Couldn’t like that – try again'); } });
    if (lk.disabled || RX_BUSY.has('love:' + card)) return;
    if (lk.dataset.on === '1') { toastUndo('You already liked this ❤️', () => send(false)); return; }
    await send(true); return; }
  const rp = e.target.closest('[data-dqrep]');
  if (rp) { const a = rp.closest('.dqa'), cid = rp.dataset.dqrep; let box = a.nextElementSibling && a.nextElementSibling.matches('.cmts.dqt') ? a.nextElementSibling : null; if (box) { if (box.dataset.auto) { const ta = box.querySelector('textarea'); if (ta) ta.focus(); } else box.remove(); return; }
    a.insertAdjacentHTML('afterend', `<div class="cmts dqt" data-cid="${esc(cid)}"><div class="cl">Loading…</div><form class="cf"><textarea rows="1" maxlength="1000" placeholder="Reply to ${esc((a.querySelector('b') || {}).textContent || 'this')}…" aria-label="Write a reply"></textarea><button class="btn pri">Send</button></form></div>`);
    box = a.nextElementSibling; try { await loadThread(box, cid); } catch (er) { box.querySelector('.cl').textContent = 'Couldn’t load replies'; } box.querySelector('textarea').focus(); }
});
/* replies on a photo answer open by themselves (the same thread loader as everywhere else) */
function dqAuto() { document.querySelectorAll('.cmts.dqt[data-auto="1"]').forEach(b => { b.dataset.auto = '2'; loadThread(b, b.dataset.cid).then(() => { const r = [...b.querySelector('.cl').children]; if (r.length > 3) { r.slice(0, -3).forEach(x => x.hidden = true); b.querySelector('.cl').insertAdjacentHTML('beforebegin', `<button class="cmall" data-dqmore>View all ${r.length} replies</button>`); } }).catch(() => { const l = b.querySelector('.cl'); if (l) l.textContent = 'Couldn’t load replies'; }); }); }
new MutationObserver(() => { if (document.querySelector('.cmts.dqt[data-auto="1"]')) dqAuto(); }).observe(document.documentElement, { childList: true, subtree: true });
function dqPics(q) {
  const P = q.pics || []; if (!P.length) return '';
  const row = p => `<div class="dqa"><img data-fph="${+((p.photos[0] || {}).id || 0)}" alt="${esc(p.name)}’s photo"><div><b>${esc(p.me ? 'You' : p.name)}</b> <small>${esc(nzTime(p.at))}</small>${p.t ? `<p>${esc(p.t)}</p>` : ''}${p.photos.length > 1 ? `<small>+${p.photos.length - 1} more photo${p.photos.length > 2 ? 's' : ''}</small>` : ''}<div class="dqbar">${dqLikeBtn(p.card, p.likes)}<button class="dqrep" data-dqrep="${esc(p.card)}">💬 ${p.nc ? `${p.nc} repl${p.nc === 1 ? 'y' : 'ies'}` : 'Reply'}</button></div></div></div>${p.nc ? `<div class="cmts dqt" data-cid="${esc(p.card)}" data-auto="1"><div class="cl">Loading replies…</div><form class="cf"><textarea rows="1" maxlength="1000" placeholder="Reply to ${esc(p.me ? 'your photo' : p.name)}…" aria-label="Write a reply"></textarea><button class="btn pri">Send</button></form></div>` : ''}`;
  return `<div class="dqas">${P.slice(0, 3).map(row).join('')}${P.length > 3 ? `<div class="dqmore" hidden>${P.slice(3).map(row).join('')}</div><button class="cmall" data-dqall>View all ${P.length} photos</button>` : ''}</div>`;
}
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-dqall]'); if (!b) return; const m = b.parentElement && b.parentElement.querySelector('.dqmore'); if (m) { m.hidden = false; b.remove(); if (typeof fillFamPhotos === 'function') fillFamPhotos(); } });
function dailyCard(i) {
  const q = i.q, photo = q.type === 'photo', ans = q.answered || [], me = ans.some(a => a.me);
  return `<article class="card xc daily" data-id="${esc(q.key)}">${xHead(photo ? '📸' : '💭', photo ? 'Today’s photo challenge' : 'Today’s family question', NZ(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' }), 'Daily')}
    <div class="bd"><h3 class="xq">${esc(q.text)}</h3>
    ${dqPics(q)}${ans.length ? '' : '<p class="xwho">Nobody’s answered yet – be the first!</p>'}
    <div class="xbtns">${photo ? `<button class="btn pri" data-dqphoto="${esc(q.key)}">📷 ${me ? 'Post another' : 'Post your photo'}</button>` : ''}<button class="btn${photo ? '' : ' pri'}" data-cmt="${esc(q.key)}">💬 ${photo ? 'Or say something' : me ? 'See answers' : 'Answer'}<span class="cc"></span></button></div></div></article>`;
}
function triviaCard(i) {
  const t = i.q, m = t.mine;
  return `<article class="card xc trivia" data-id="trivia${esc(t.day)}">${xHead('🧠', 'Daily trivia', '5 easy questions · same for everyone · one go a day', 'Trivia')}
    <div class="bd">${m ? `<h3 class="xq">You got ${m.score}/5 today ${m.score === 5 ? '🏆' : m.score >= 3 ? '🎉' : '👍'}</h3><p class="xwho">New questions tomorrow. ${t.played > 1 ? t.played + ' in the family have played today.' : ''}</p>` : `<h3 class="xq">Today’s 5 questions are ready</h3><p class="xwho">A mix of TV, science & garden, Aotearoa, music & games, and general knowledge. ${t.played ? t.played + ' played so far today.' : ''}</p>`}
    <div class="xbtns">${m ? '' : '<button class="btn pri" data-trivia="play">▶️ Play</button>'}<button class="btn" data-trivia="board">🏅 Leaderboard</button></div></div></article>`;
}
function dateCard(i) {
  const d = i.d, bd = d.kind === 'bday', today = d.days === 0, who = bd && d.mid === MEMBER.id;
  const when = new Date(Date.UTC(2000, d.m - 1, d.d)).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return `<article class="card xc date${today ? ' party' : ''}" data-id="${esc(i.id)}">${xHead(bd ? ICON : '🎉', today ? (bd ? (who ? 'Happy birthday to you!' : 'Happy birthday!') : 'It’s today!') : bd ? 'Birthday coming up' : 'Family event coming up', when, today ? 'Today' : 'Countdown')}
    <div class="media bdpic"><img src="img/${bd ? 'birthday' : 'event'}.svg" alt="${bd ? 'Birthday cake and balloons' : 'Party'}"></div>
    <div class="bd"><h3 class="xq">${today ? (bd ? '🎉 ' : '🎊 ') : ''}${esc(d.title)}${d.turns && (who || IS_ADMIN) ? ` <small>(${d.turns})</small>` : ''}</h3>${bd && !who && d.mid ? `<p class="xwho">${today ? `Send ${esc(d.title.replace(/[’']s birthday$/i, ''))} some birthday love 💜` : `Get your birthday wishes ready 🎈`}</p>` : ''}
    <div class="pinbox"><div class="cd">${today ? (bd ? '🎂 Today!' : '🎊 Today!') : d.days === 1 ? 'Tomorrow!' : 'In ' + d.days + ' days'}</div></div>
    <div class="xbtns"><button class="btn${today ? ' pri' : ''}" data-cmt="${esc(i.id)}">💬 ${today ? (who ? 'See messages' : 'Send a message') : 'Say something'}<span class="cc"></span></button></div></div></article>`;
}
function carCard(i) {
  const c = i.c, t = todayN();
  const row = (lab, iso, extra) => { if (!iso) return ''; const n = dayN(iso) - t, cls = n < 0 ? 'over' : n <= 30 ? 'soon' : ''; return `<div class="crow ${cls}"><span>${lab}</span><b>${esc(new Date(iso + 'T00:00:00Z').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }))}</b><em>${n < 0 ? '⚠️ overdue ' + -n + 'd' : n === 0 ? 'today' : n <= 30 ? inDays(n) : inDays(n)}</em>${extra || ''}</div>`; };
  const pic = c.photo ? `<div class="media"><img src="${esc(c.photo)}" alt="${esc(c.plate)}"></div>` : `<div class="hero carh" style="--c1:${esc(c.hex || '#2563eb')};--c2:#0ea5e9"><span class="em">🚗</span><h3>${esc(c.plate)}</h3></div>`;
  const wofDoing = c.wofSt && c.wofSt.st === 'doing' ? `<div class="crow soon"><span>WOF recheck</span><b>${c.wofSt.recheck ? esc(new Date(c.wofSt.recheck + 'T00:00:00Z').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'UTC' })) : 'booked'}</b><em>in progress</em></div>` : '';
  return `<article class="card xc car" data-id="${esc(i.id)}">${xHead('🚗', c.plate + (c.model ? ' · ' + c.model : ''), 'Shared with you by Shane · updated ' + ago(i.at || c.updated) + ' ago', 'Your car')}
    ${pic}<div class="bd">${wofDoing}${row('Rego due', c.rego)}${row('WOF due', c.wof)}${row('Service due', c.svc, c.svcKm ? `<small> or ${Number(c.svcKm).toLocaleString('en-NZ')} km</small>` : '')}
    ${!c.rego && !c.wof && !c.svc ? '<p class="xwho">No dates yet – Shane’s phone will fill these in.</p>' : ''}<p class="xwho">Only you (and Shane) can see this card.</p></div></article>`;
}

/* ---- trivia sheet ---- */
let TQ = null;
function triviaPlay() {
  const t = X.triv; if (!t || t.mine) return triviaBoard();
  TQ = { n: 0, ans: [] }; triviaStep();
  $('#sheet').classList.add('on');
}
function triviaStep() {
  const t = X.triv, q = t.qs[TQ.n], cat = { tv: '📺 TV & film', film: '🎬 Film', sci: '🔬 Science', kids: '🌱 Garden & kids', nz: '🇳🇿 Aotearoa', geo: '🌏 Geography', music: '🎵 Music', games: '🎮 Games', books: '📚 Books', gen: '💡 General', hist: '🏛️ History' }[q.cat] || '';
  $('#sheetin').innerHTML = `<h2>🧠 Question ${TQ.n + 1} of 5</h2><p class="sst">${cat}</p><h3 class="tq">${esc(q.q)}</h3><div class="topts">${q.opts.map((o, k) => `<button class="btn topt" data-topt="${k}">${esc(o)}</button>`).join('')}</div><p class="sst">One go a day – take your time.</p>`;
}
async function triviaAnswer(k) {
  TQ.ans.push(k);
  if (TQ.n < 4) { TQ.n++; triviaStep(); return; }
  $('#sheetin').innerHTML = '<h2>🧠 Checking…</h2>';
  try {
    const r = await fam('/trivia', { method: 'POST', body: JSON.stringify({ ans: TQ.ans }) });
    const t = X.triv; t.mine = { score: r.score, ans: TQ.ans };
    $('#sheetin').innerHTML = `<h2>You got ${r.score}/5 ${r.score === 5 ? '🏆' : r.score >= 3 ? '🎉' : '👏'}</h2>${t.qs.map((q, i) => `<div class="trev ${TQ.ans[i] === r.right[i] ? 'ok' : 'no'}"><b>${TQ.ans[i] === r.right[i] ? '✅' : '❌'} ${esc(q.q)}</b><small>Answer: ${esc(q.opts[r.right[i]])}${TQ.ans[i] !== r.right[i] ? ' · you said ' + esc(q.opts[TQ.ans[i]] || '–') : ''}</small></div>`).join('')}<button class="btn pri" data-trivia="board">🏅 See the leaderboard</button> <button class="btn" data-close>Done</button>`;
    draw();
  } catch (e) { $('#sheetin').innerHTML = `<h2>Hmm</h2><p>${esc(e.message)}</p><button class="btn" data-close>Close</button>`; }
}
async function triviaBoard() {
  $('#sheet').classList.add('on'); $('#sheetin').innerHTML = '<h2>🏅 Trivia leaderboard</h2><p>Loading…</p>';
  try {
    const b = await fam('/trivia/board'), list = (l, unit) => l.length ? l.map((r, n) => `<div class="row${r.me ? ' me' : ''}"><span>${['🥇', '🥈', '🥉'][n] || n + 1 + '.'} ${esc(r.me ? 'You' : r.name)}</span><span>${r.pts} pts${unit ? ' · ' + r.days + ' day' + (r.days > 1 ? 's' : '') : ''}</span></div>`).join('') : '<p class="sst">Nobody yet.</p>';
    $('#sheetin').innerHTML = `<h2>🏅 Trivia leaderboard</h2><h3>Today</h3>${list(b.today)}<h3>This week</h3>${list(b.week, 1)}<h3>All time</h3>${list(b.all, 1)}<p class="sst">Family only. 1 point per right answer, 5 a day. Weeks start on Monday.</p><button class="btn" data-close>Close</button>`;
  } catch (e) { $('#sheetin').innerHTML = `<p>${esc(e.message)}</p>`; }
}

/* ---- profile sheet: streak, badges, my birthday, notifications ---- */
async function profileSheet(id) {
  $('#sheet').classList.add('on'); $('#sheetin').innerHTML = '<h2>Loading…</h2>';
  let p; try { p = await fam('/profile' + (id ? '?id=' + encodeURIComponent(id) : '')); } catch (e) { $('#sheetin').innerHTML = `<p>${esc(e.message)}</p>`; return; }
  const mine = p.id === MEMBER.id, s = p.streak, got = p.badges.filter(b => b.got);
  const ab = mine ? await fam('/aibot').catch(() => null) : null;
  const bd = p.birthday;
  $('#sheetin').innerHTML = `<h2>${mine ? 'You' : esc(p.name)}${!mine && p.pron ? ` <small class="prn">${esc(PRON_LABEL[p.pron] || '')}</small>` : ''}</h2>
    <div class="streak"><span class="fl">🔥</span><div><b>${s.cur}-day streak</b><small>Best: ${s.best} · ${s.total} days opened${s.cur ? '' : ' · open Info Book tomorrow to start a new streak'}<br>${s.freezeLeft ? '🧊 Streak freeze ready this week (covers one missed day)' : '🧊 This week’s streak freeze is used'}${s.next ? ` · next milestone ${s.next} days` : ''}</small></div></div>
    <h3>Badges · ${got.length} of ${p.badges.length}</h3><div class="badges">${p.badges.map(b => `<div class="badge${b.got ? ' got' : ''}" title="${esc(b.d)}"><span>${b.e}</span><b>${esc(b.n)}</b><small>${esc(b.d)}</small></div>`).join('')}</div>
    ${mine ? `<h3>🎂 My birthday (optional)</h3><p class="sst">Shown to the family as a countdown card two weeks before, and a celebration card on the day. The year is optional (it shows the age they turn).</p>
    <div class="bdf"><select id="bdd" aria-label="Day">${['<option value="">Day</option>', ...Array.from({ length: 31 }, (_, k) => `<option${bd && bd.d === k + 1 ? ' selected' : ''}>${k + 1}</option>`)].join('')}</select><select id="bdm" aria-label="Month">${['<option value="">Month</option>', ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, k) => `<option value="${k + 1}"${bd && bd.m === k + 1 ? ' selected' : ''}>${m}</option>`)].join('')}</select><input id="bdy" inputmode="numeric" maxlength="4" placeholder="Year" value="${bd && bd.y ? bd.y : ''}" aria-label="Year (optional)"><button class="btn pri" id="bdsave">Save</button>${bd ? `<button class="btn" data-datedel="${bd.id}">Remove</button>` : ''}</div>
    <h3>🗣️ My pronouns (optional)</h3><p class="sst">Only used so the app and Info Bot word things right. Not set = they/them. Nobody sees them unless you turn on showing them.</p>
    <div class="row"><span>Pronouns</span><select id="mypron">${PRON_OPTS.map(([k, l]) => `<option value="${k}"${(p.pron || '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    <label class="row"><span>Show them next to my name on comments</span><input type="checkbox" id="mypshow"${p.pshow ? ' checked' : ''}></label>
    ${pushBox()}${ab ? `<h3>🤖 Info Bot</h3><label class="row"><span>Let Info Bot reply to my comments<small class="sst">An AI that sometimes answers comments (marked AI). Turn off to stop it replying to you and hide its replies.</small></span><input type="checkbox" id="aimute"${ab.mute ? '' : ' checked'}></label>` : ''}` : ''}<button class="btn" data-close>Close</button>`;
}

/* ---- 🔔 push notifications ---- */
const IN_APP = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|MicroMessenger/i.test(navigator.userAgent);
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const PUSH_OK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
function pushHint() {
  if (IN_APP) return 'Notifications don’t work inside Messenger or Facebook. Tap ⋯ → <b>Open in Chrome</b> (or Safari), then install Info Book to get them.';
  if (IS_IOS && !STANDALONE) return 'On iPhone, notifications need Info Book on your Home Screen first: tap Share → <b>Add to Home Screen</b>, open it from there, then turn them on here (iOS 16.4 or later).';
  if (!PUSH_OK) return 'This browser can’t do notifications. Try Chrome, or install Info Book.';
  return '';
}
function pushBox() {
  const P = (X.push && X.push.prefs) || {}, on = X.push && X.push.on && Notification.permission === 'granted', hint = pushHint();
  const T = [['reply', '↩️ Replies to me'], ['mine', '💬 Comments & likes on my posts'], ['photo', '📷 New family photos'], ['daily', '💭 Daily question & trivia (after 8am)'], ['event', '⭐ Reminders for events & shows I’m interested in'], ['comeback', '👋 Come-back reminders (if I haven’t been in for a couple of days)'], ...((X.sappt || []).length || IS_ADMIN ? [['appt', '📅 My appointments (the day before and ~2 hours before)']] : []), ['dates', '🎂 Birthdays, events & car dates'], ['alerts', '⚠️ Weather & outage alerts (orange/red warnings, power cuts)'], ['streak', '🔥 Streak reminder (about 7pm, only if it’s about to break)'], ['weather', '🔴 Red weather warnings (any time, even at night)']];
  return `<h3>🔔 Notifications</h3>${hint ? `<p class="hint">${hint}</p>` : on ? `<p class="sst">On for this phone. At most one every 30 minutes (replies to you come straight away). Quiet from ${P.qFrom}:00 to ${P.qTo}:00 – anything then waits until morning.</p>
    ${T.map(([k, l]) => `<button class="ich${P[k] ? ' on' : ''}" data-np="${k}">${P[k] ? '✓ ' : ''}${l}</button>`).join('')}
    <div class="bdf"><label>Quiet from <select id="qf">${Array.from({ length: 24 }, (_, h) => `<option value="${h}"${h === P.qFrom ? ' selected' : ''}>${h}:00</option>`).join('')}</select></label><label>to <select id="qt">${Array.from({ length: 24 }, (_, h) => `<option value="${h}"${h === P.qTo ? ' selected' : ''}>${h}:00</option>`).join('')}</select></label></div>
    <button class="btn" id="pushtest">Send me a test</button> <button class="btn" id="pushoff">Turn off on this phone</button>` : `<p class="sst">Get a ping when someone replies to you, comments on or likes your post, a new family photo goes up, the daily question drops, or a birthday is coming. Never at night (10pm–7am).</p><button class="btn pri" id="pushon">🔔 Turn on notifications</button>`}`;
}
const b64uToU8 = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function pushOn() {
  const hint = pushHint(); if (hint) { toast('See the note about notifications'); return false; }
  try {
    const perm = await Notification.requestPermission(); if (perm !== 'granted') { toast('Notifications are blocked – allow them in the browser settings'); return false; }
    const reg = await navigator.serviceWorker.ready, k = await fam('/push/key');
    let sub = await reg.pushManager.getSubscription(); if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(k.key) });
    await swAuth();
    await fam('/push/sub', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) });
    X.push = await fam('/push/prefs'); ls.set('pushAsked', 2); toast('🔔 Notifications on'); return true;
  } catch (e) { toast('Couldn’t turn on notifications: ' + e.message); return false; }
}
async function swAuth() { try { const c = await caches.open('ib-auth'); await c.put('/feed/__ib_auth', new Response(JSON.stringify({ tok: MEMBER.tok, api: FAM_API }))); } catch (e) { } } // the service worker reads this to fetch its own inbox
async function pushOff() { try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); await fam('/push/sub', { method: 'DELETE', body: JSON.stringify({ endpoint: sub ? sub.endpoint : '' }) }); if (sub) await sub.unsubscribe(); X.push = await fam('/push/prefs'); toast('Notifications off'); } catch (e) { toast(e.message); } }
function pushAsk() { // once, after their first tap on 👍 / ❤️ / 💬 – never on first load
  if (!FAM_ON || ls.get('pushAsked', 0) || (X.push && X.push.on) || document.querySelector('#pushask')) return;
  ls.set('pushAsked', 1);
  const hint = pushHint();
  document.body.insertAdjacentHTML('beforeend', `<div id="pushask" class="updbar"><span>${hint ? '🔔 ' + hint : '🔔 Want a ping when the family replies or posts photos? (never at night)'}</span>${hint ? '' : '<button class="btn pri" id="pushask-on">Turn on</button>'}<button class="btn" id="pushask-no">${hint ? 'OK' : 'Not now'}</button></div>`);
}
document.addEventListener('click', e => { if (e.target.closest('[data-vote="1"],[data-like],[data-cmt]')) setTimeout(pushAsk, 1500); }, true);

/* ---- ✨ suggestions from Shane (life stage): a card with pre-ticked topics; nothing changes until they tap Add ---- */
function suggestion() {
  const n = ls.get('nudge', null); if (!n || !Array.isArray(n.topics)) return null;
  const done = ls.get('suggDone', []), want = n.topics.filter(t => TOPIC[t] && !done.includes(t) && !(PICK ? PICK.includes(t) : (!OPTIN.has(t) || optedIn(t))));
  return want.length ? { id: 'sugg', x: 'sugg', want, ints: n.ints || [], topic: 'family' } : null;
}
function suggCard(i) {
  return `<article class="card xc sugg" data-id="sugg">${xHead('✨', 'Suggested for you', 'Things you might like – tap to untick any', 'For you')}
    <div class="bd"><div class="obg">${i.want.map(t => `<button class="obt on" data-sg="${t}" style="--c1:${TOPIC[t][3]};--c2:${TOPIC[t][4]}"><span>${TOPIC[t][2]}</span>${esc(TOPIC[t][1])}</button>`).join('')}</div>
    <div class="xbtns"><button class="btn pri" id="sgadd">Add these</button><button class="btn" id="sgno">No thanks</button></div></div></article>`;
}
function suggApply(add) {
  const n = ls.get('nudge', {}) || {}, all = [...document.querySelectorAll('[data-sg]')].map(b => b.dataset.sg), picked = add ? [...document.querySelectorAll('[data-sg].on')].map(b => b.dataset.sg) : [];
  for (const t of picked) {
    if (PICK) { if (!PICK.includes(t)) PICK.push(t); } else if (OPTIN.has(t)) ls.set('optIn', [...new Set([...ls.get('optIn', []), t])]);
    if (t === 'parent' && (n.ints || []).length) for (const x of INTERESTS) if (x.topic === 'parent' && !n.ints.includes(x.name)) INT_OFF[x.name] = 1; // only the parenting bits for their stage
  }
  if (PICK) ls.set('pick', PICK); ls.set('intOff', INT_OFF);
  ls.set('suggDone', [...new Set([...ls.get('suggDone', []), ...all])]);
  toast(picked.length ? '✨ Added – change any time in ⚙️' : 'OK – no changes'); draw();
}

/* ---- ranking: Shane's gentle life-stage nudge (never more than ×1.15, and not for topics they've 👎'd) and local events first ---- */
const basePopW = popW;
const REGION_NL = /whang[aā]rei|northland|kerikeri|paihia|russell|dargaville|kaitaia|kaikohe|ruak[aā]k[aā]|waipu|tutukaka|ngunguru|hikurangi|kamo|onerahi|bream bay|mangawhai|kawakawa|opua|hokianga|maungakaramea|tikipunga/i;
/* ---- 1.9.30 🇳🇿 NZ-first and weather/season-aware ranking (a gentle nudge on top of interests, 👍/👎 and the time-of-day mood) ----
   Weather: My App's own Whangārei forecast on this phone if there is one (the one the auto theme uses), otherwise the same open-meteo
   forecast fetched here (once every 30 min). Nothing about the theme changes. */
const NZ_RX = /\.nz\b|new zealand|aotearoa|\bkiwis?\b|whang[aā]rei|northland|auckland|wellington|christchurch|queenstown|rotorua|tauranga|hamilton|dunedin|nelson|napier|taup[oō]|coromandel|bay of islands|countdown|woolworths nz|pak'?n'?save|new world|the warehouse|mitre ?10|bunnings nz|kmart nz|briscoes|farmers|rnz|stuff\.co|nz ?herald|1news|newshub|te reo|m[aā]ori|matariki|waitangi|p[oō]hutukawa|kūmara|kumara|pavlova|\bl&p\b|whitebait|feijoa/i;
const FOREIGN_RX = /thanksgiving|4th of july|fourth of july|memorial day|labor day|black friday doorbusters?|walmart|target stores?|at target\b|costco|\bcvs\b|walgreens|trader joe'?s|kroger|whole foods|home depot|lowe'?s|\bnfl\b|super bowl|fahrenheit|\d\s?°F\b|\b(us|uk)[- ]only\b|\bnhs\b|tesco|sainsbury'?s|\basda\b|argos|bank holiday|half[- ]term|\bzip code\b|£\s?\d|\$\d+ ?usd/i;
const WRONG_SUMMER_RX = /\bsnow(fall|man|men|storm|day)?\b|blizzard|winter (warmers?|coats?|is coming|wardrobe|skin ?care|recipes?)|frost(y|bite)?\b|\bski(ing|ers?)?\b|fall foliage|autumn leaves|christmas in july|cold snap|hibernat\w*/i;
const WX_OUT = /\b(beach|bbq|barbecue|barbie|picnic|garden\w*|\bwalks?\b|walking|hik(e|es|ing)|tramp(ing)?|swim\w*|camp(ing|site)?|day trips?|outdoors?|\bparks?\b|kayak\w*|fishing|surf\w*|summer|salads?|ice ?cream|ice blocks?|strawberr\w*|sunscreen|sunny|sunshine|playground|cycle|bike ride|plant(ing)?)\b/i;
const WX_IN = /\b(cosy|cozy|indoor\w*|soups?|stews?|bak(e|es|ing)|roast\w*|crafts?|knit\w*|crochet|movies?|films?|\btv\b|series|binge|board ?games?|puzzles?|rainy[- ]day|books?|reading|slow cooker|casserole|hot chocolate|lego|colouring|painting|museum|library|cinema)\b/i;
const WX_SAFE = /\b(storm|power cuts?|outages?|emergency|civil defence|be prepared|get ready|safety|flood\w*|generator|torch|first aid)\b/i;
const nzSeason = () => { const mth = +new Date().toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland', month: 'numeric' }); return [12, 1, 2].includes(mth) ? 'summer' : [3, 4, 5].includes(mth) ? 'autumn' : [6, 7, 8].includes(mth) ? 'winter' : mth === 11 ? 'late spring' : 'spring'; };
function wxCurrent() {
  try { const o = JSON.parse(localStorage.getItem('wx') || 'null'); if (o && o.data && o.data.current && Date.now() - o.at < 3 * 36e5) return o.data.current; } catch (e) { } // My App's own forecast (same phone)
  const c = ls.get('wxNow', null); return c && Date.now() - c.at < 2 * 36e5 ? c.cur : null;
}
async function wxFetchNow() {
  const c = ls.get('wxNow', null); if (c && Date.now() - c.at < 30 * 60e3) return;
  try { const d = await (await fetch('https://api.open-meteo.com/v1/forecast?latitude=-35.7251&longitude=174.3237&current=temperature_2m,weather_code,wind_speed_10m&timezone=Pacific%2FAuckland')).json(); if (d && d.current) { ls.set('wxNow', { at: Date.now(), cur: d.current }); WXK_AT = 0; if (tab === 'all' && scrollY < 300) draw(); } } catch (e) { }
}
let WXK = null, WXK_AT = 0;
function wxKindIB() { // warm / mild / wet / cold / storm (windy counts with storm) – recomputed every 10 minutes
  if (Date.now() - WXK_AT < 10 * 60e3) return WXK; WXK_AT = Date.now(); const c = wxCurrent(); if (!c) return (WXK = null);
  const code = +c.weather_code, t = +c.temperature_2m, wind = +c.wind_speed_10m;
  WXK = code >= 95 || wind >= 45 ? 'storm' : (code >= 51 && code <= 67) || (code >= 80 && code <= 82) ? 'wet' : wind >= 35 ? 'windy' : t >= 22 && code <= 2 ? 'warm' : t <= 12 ? 'cold' : 'mild';
  return WXK;
}
const WXM_LABEL = { warm: '☀️ Good for today’s sunshine', mild: '🌤️ Nice day for it', wet: '🌧️ Rainy-day pick', cold: '🧣 Cosy pick for today', storm: '🌪️ Stormy-day pick', windy: '💨 Windy-day pick' };
const PRAC_TOPICS = new Set(['monarch', 'garden', 'diy', 'food', 'gf', 'craft', 'creative', 'fitness', 'outdoors', 'travel', 'cars', 'collect', 'selling', 'dogs', 'kids', 'parent', 'nature']);
const TIP_RE_C = /\b(how to|how i|how we|tips?|guides?|step[- ]by[- ]step|checklist|ways to|\d+ (ways|things|ideas|tips|steps)|what to (plant|do|grow|sow|pack|bring|cook|make)|when to|beginners?'?|tutorial|diy|advice|recipes?|easy|quick|hacks?|ideas?|planner|care|growing|grow|prun\w*|fix(ing)?|repair\w*|clean(ing)?|make|making|build(ing)?|patterns?|free pattern|lesson|explained|tricks?|basics|essentials|for kids|activities|routine|plan)\b/i, SHOW_RE_C = /(look at (this|my|these|him|her)|\bi (did|made|finished|built|painted|knitted|crocheted|grew|caught|found|got|bought)\b|\bmy (first|latest|new|finished|little|current|husband'?s|wife'?s)\b|rate my|finished (my|this|it)|show(ing)? off|\[oc\]|\(oc\)|\boc\b|proud of|just (finished|completed|made|got)|after \d+ (years|months|weeks|hours)|before (and|&) after|\bmy (garden|haul|collection|setup|build|car|ride|dog|cat|boy|girl|baby)\b|what do you think|thoughts\?|first attempt|finally (finished|done|got)|\bi (decided|planted|harvested|picked|tried|caught|restored|refinished)\b|\b(this year|today)'?s? (harvest|haul|bloom)|\bhaul\b|appreciation post|happy (cake|birth)day)/i;
const NZ_SRC = /^(nz-|kings-|yates|doc$|rnz|stuff|advocate|nzh|1news|newsroom|nzgeo|inat-nz|rd-nz|rd-whangarei|rd-tramping|par-|kids-kkn|kids-autismnz|nd-(autismnz|altogether|kidshealth|pp|tips)|sw-|gf-(mfb|freshstart|bargainbox|woop|hellofresh|venerdi|ceres|puredelish|ev)|events|tvm-nz)/;
const isNZ = (i, txt) => NZ_SRC.test(i.src || '') || /^https?:\/\/[^/]+\.nz(\/|$)/i.test(i.url || '') || NZ_RX.test(txt);
function nzWeatherNudge(i) {
  if (!i || i.pin || i.x) return 1; const txt = (i.t || '') + ' ' + (i.s || '') + ' ' + (i.url || '') + ' ' + (i.sn || ''); let f = 1; i._wxm = '';
  if (i.kind !== 'event') { // events already lean Whangārei/Northland
    if (PRAC_TOPICS.has(i.topic)) { // 1.9.30 interests: closer to home and practical. Stronger inside an interest chip than in All (sitcoms stay first)
      const chip = tab !== 'all', nz = isNZ(i, txt), tipT = TIP_RE_C.test(i.t || ''), show = SHOW_RE_C.test(i.t || '');
      f *= nz ? (chip ? 1.8 : 1.3) : tipT ? (chip ? 0.9 : 0.95) : (chip ? 0.55 : 0.75);
      if (REGION_NL.test(txt)) f *= 1.15;
      if (tipT) f *= chip ? 1.35 : 1.15; if (show) f *= chip ? 0.4 : 0.6;
    } else if (NZ_RX.test(txt)) f *= 1.15;
  }
  if (FOREIGN_RX.test(txt)) f *= 0.7;
  const se = nzSeason(), offSeason = (se === 'summer' || se === 'late spring') && (WRONG_SUMMER_RX.test(txt) || /\b(autumn|winter)\b/i.test(i.t || '')); if (offSeason) f *= 0.7; if (se === 'winter' && /\b(summer|beach day|bbq season)\b/i.test(txt)) f *= 0.85;
  const tt = /news|politic|world|nzlocal/.test(i.topic || '') ? '' : (i.t || ''), lab = (k2, rx) => { if (!offSeason && rx.test(tt)) i._wxm = WXM_LABEL[k2]; };
  const k = wxKindIB(), out = WX_OUT.test(txt) || ['garden', 'outdoors', 'nature'].includes(i.topic), inn = WX_IN.test(txt) || ['sitcoms', 'scifi', 'craft', 'boardg', 'fantasy'].includes(i.topic);
  if (k === 'warm' || k === 'mild') { if (out && !inn) { f *= k === 'warm' ? 1.2 : 1.1; lab(k, WX_OUT); } if (se === 'late spring' || se === 'summer') if (out) f *= 1.04; }
  else if (k === 'wet' || k === 'cold') { if (inn && !out) { f *= 1.2; lab(k, WX_IN); } else if (out && !inn) f *= 0.85; }
  else if (k === 'storm' || k === 'windy') { if (WX_SAFE.test(txt)) { f *= 1.25; lab(k, WX_SAFE); } else if (inn && !out) { f *= 1.15; lab(k, WX_IN); } else if (out) f *= 0.8; }
  return f;
}
wxFetchNow();
/* 1.9.30 situation: parenting tips for young kids, teen tips for teens, grandparent ideas, fun for singles; other people's
   life stages lower. Only soft weights from the server (the labels never reach the phone). */
const SIT_KW = { kids: /\b(bab(y|ies)|toddlers?|newborns?|preschool\w*|kindy|primary|nappy|nappies|sensory|autism|autistic|playground|school holidays?|kids?|bluey|peppa)\b/i, teens: /\b(teens?|teenagers?|tweens?|high school|ncea|secondary school|year (9|1[0-3]))\b/i, grand: /\b(grand(kids|children|child|parents?|ma|pa|parenting)|nana|koro|kuia|retire\w*)\b/i, single: /\b(meet ?ups?|make friends|solo|social club|night out|weekend away|road trip|festival|gig)\b/i, couple: /\b(date night|couples?|weekend away|for two)\b/i };
const BABY_KW = /\b(bab(y|ies)|toddlers?|newborns?|breastfeed\w*|nappy|nappies|pregnan\w*|maternity|plunket)\b/i, TEEN_KW = SIT_KW.teens, DATING = /\b(dating|tinder|hinge|bumble|first date|hook ?up)\b/i;
function sitW(i, sit) {
  if (!sit || !Object.keys(sit).length || i.pin || i.topic === 'life') return 1;
  const txt = (i.t || '') + ' ' + (i.s || ''); let f = 1;
  if (sit.kids && SIT_KW.kids.test(txt)) f *= 1.25; if (sit.teens && SIT_KW.teens.test(txt)) f *= 1.25; if (sit.grand && SIT_KW.grand.test(txt)) f *= 1.25;
  if (sit.single && SIT_KW.single.test(txt)) f *= 1.15; if (sit.couple && SIT_KW.couple.test(txt)) f *= 1.15;
  if (!sit.kids && BABY_KW.test(txt)) f *= sit.grand ? 0.5 : 0.4; // baby and toddler stuff for someone without little ones
  if (!sit.teens && !sit.kids && TEEN_KW.test(txt) && i.topic === 'parent') f *= 0.7;
  if (sit.young && i.topic === 'parent' && !sit.kids) f *= 0.6;
  if (DATING.test(txt)) f *= 0.3; // dating-free
  return f;
}
/* 1.9.30 upbeat: heavy news (deaths, crime, war, disasters, court, tragedies, political fights, health scares) is dropped from
   news topics and well down everywhere else; fun, quirky, useful, local good news and how-tos come up. (Whangārei warnings and
   outages are pinned separately and never touched.) The data service also flags clearly negative headlines (Workers AI). */
const HEAVY_HARD = /\b(died|dies|dead|death|deaths|deadly|killed|killing|murder\w*|homicide|manslaughter|stabb\w*|shot dead|shooting|gunman|rape\w*|sexual assault|assault\w*|abuse[ds]?|child abuse|war|warfare|airstrikes?|missiles?|invasion|bomb\w*|terror\w*|hostages?|massacre|genocide|tragedy|tragic|fatal\w*|crash victims?|drown\w*|body found|remains found|funeral|mourn\w*|suicide|overdose|earthquake kills|disaster|devastat\w*|catastroph\w*|court|sentenced|jailed|prison|trial|charged|accused|guilty|convicted|police (hunt|appeal)|arrested|ram raid|burglar\w*|robbery|gang\w*|meth)\b/i;
const HEAVY_SOFT = /\b(slams?|blasts?|attacks?|row|feud|clash\w*|backlash|outrage|furious|scandal|crisis|cuts?|job losses|layoffs?|redundanc\w*|strike action|recession|inflation|cancer|tumou?r|outbreak|pandemic|virus|measles|superbug|warning|warns?|fears?|alarm\w*|toxic|dangerous|threat\w*|risk of|shortage|collapse\w*|fire kills|evacuat\w*|flood\w*|storm damage|protest\w*|lawsuit|sued|blame\w*|controvers\w*)\b/i;
const FUN = /\b(fun|funny|hilarious|cute|adorable|wholesome|heart-?warming|delight\w*|quirky|weird|amazing|incredible|best|favourite|tips?|how to|hacks?|easy|diy|recipe|ideas?|guide|free|family day|celebrat\w*|festival|win(s|ner)?|record-breaking|first ever|rescued|reunited|kindness|volunteers?|good news|joy|smile|laugh\w*|beautiful|stunning|discover\w*|secret|surprising|clever)\b/i;
const NEWSY = new Set(['nz', 'election', 'science', 'tech', 'travel', 'social', 'events']);
const FINANCE = /\$\s?\d|\b(made money|making money|make money|earn(s|ed|ing|ings)?|income|salary|wages?|invest(ing|or|ors|ment|ments)?|kiwisaver|mortgages?|lump sum|interest rates?|ocr|stock ?market|share ?market|shares? (price|market)|crypto\w*|bitcoin|loans?|debts?|budget(ing)?|personal finance|money expert|retirement savings|property market|house prices|tax (cuts|rates)|bills?)\b/i; // money stays out
const POLITICS_FIGHT = /\b(trump|congress|democrats?|republicans?|white house|maga|steamroll\w*|impeach\w*|filibuster|culture war)\b/i;
function toneW(i) {
  if (i.pin || i.topic === 'life' || i._share || i.kind === 'tip') return 1;
  const txt = (i.t || '') + ' ' + (i.s || ''); let f = 1;
  if (HEAVY_HARD.test(txt)) f *= NEWSY.has(i.topic) ? 0 : 0.35; else if (HEAVY_SOFT.test(txt)) f *= 0.55;
  if (i.topic !== 'selling' && FINANCE.test(txt)) return 0; if (POLITICS_FIGHT.test(txt)) f *= NEWSY.has(i.topic) ? 0.15 : 0.4;
  if (i.neg) f *= 0.5; // the data service's sentiment pass says it's a downer
  if (FUN.test(txt)) f *= 1.25; if (i.pos) f *= 1.1;
  if (i.topic === 'election' && /\b(slams?|attacks?|row|feud|clash\w*|blasts?|accus\w*)\b/i.test(txt)) f *= 0.4; // politics fights
  return f;
}
window.popW = function (i) {
  let w = basePopW(i) * nzWeatherNudge(i);
  const n = ls.get('nudge', null);
  if (n && n.boost && n.boost[i.topic] && weights().topic(i.topic) >= 1) w *= Math.min(1.15, n.boost[i.topic]);
  w *= sitW(i, (n && n.sit) || {}) * toneW(i);
  if (n && n.ib && !i.pin) { let b = 1; for (const k of itemInts(i)) if (n.ib[k]) b = Math.max(b, Math.min(1.8, n.ib[k])); if (b > 1) { const ageD = (Date.now() - (i.at || Date.now())) / 864e5; if (ageD > 2) b *= Math.min(4, 1 + ageD / 7); } w *= b; } // patterns and tips are evergreen, so an older one still comes up // 1.9.30 interests Shane boosted for them (🧶 crochet, 🐴 horses…)
  if (i.kind === 'event') { const u = (i.url || '') + ' ' + (i.where || '') + ' ' + (i.t || ''); w *= REGION_NL.test(u) ? 1.3 : /auckland|tāmaki|tamaki/i.test(u) ? 1 : 0.55; if (!i.pin && pinUrls().has(urlBase(i.url))) w = 0; }
  return w;
};

/* ---- 🚗 Shane's phone: send the shared cars' dates (read from My App's own storage on this phone) ---- */
function myAppData() { return new Promise(res => { try { const r = indexedDB.open('due-dates', 1); r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { } res(null); }; r.onerror = () => res(null); r.onsuccess = () => { try { const q = r.result.transaction('kv').objectStore('kv').get('data'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }; } catch (e) { res(null); } }); }
const plateOf = p => String(p || '').replace(/\s+/g, '').toUpperCase();
async function carSync() {
  if (!IS_ADMIN || !PRIVATE_OK) return;
  const S = await myAppData(); if (!S || !Array.isArray(S.cars)) return;
  const shared = new Set(X.cars.map(c => c.plate)); if (!shared.size) return;
  const cars = S.cars.filter(c => shared.has(plateOf(c.plate))).map(c => ({ plate: plateOf(c.plate), name: c.name, model: c.model, year: c.year, colour: c.colour, hex: c.hex, wof: c.wof, rego: c.rego, svc: c.svcDate, svcKm: c.svcKm, photo: typeof c.photo === 'string' && c.photo.startsWith('data:image/jpeg') ? c.photo : '', updated: Date.parse(S.updatedAt) || Date.now() }));
  if (!cars.length) return;
  const sig = JSON.stringify(cars).length + ':' + cars.map(c => c.plate + c.wof + c.rego + c.svc + c.svcKm + (c.photo || '').length).join('|');
  if (ls.get('carSig', '') === sig && Date.now() - ls.get('carSyncAt', 0) < 6 * 36e5) return;
  try { await fam('/cars/sync', { method: 'POST', body: JSON.stringify({ cars }) }); ls.set('carSig', sig); ls.set('carSyncAt', Date.now()); } catch (e) { }
}

/* ---- ⚙️ → Family (Shane): each person's age & life stage (private to Shane), family dates, cars ---- */
let STG = null;
async function adminExtras() {
  const el = $('#famx'); if (!el || !IS_ADMIN) return;
  try {
    STG = STG || await fam('/stages');
    const [mem, dates, cars, S, sap, aib, cbk] = await Promise.all([fam('/members'), fam('/dates'), fam('/cars'), myAppData(), fam('/sappts').catch(() => null), fam('/aibot').catch(() => null), fam('/comeback').catch(() => null)]);
    const people = mem.filter(m => m.role !== 'admin'), sugT = ['crochet', 'animals', 'parent', 'rainbow', 'social', 'tarot', 'craft', 'vgames', 'music', 'travel', 'food', 'fitness'], SUGL = { crochet: ['🧶', 'Crochet & amigurumi'], animals: ['🐴', 'Cute horses, cats & dogs'] };
    const myCars = ((S && S.cars) || []).map(c => ({ plate: plateOf(c.plate), name: c.name })).filter(c => c.plate);
    for (const c of cars.cars) if (!myCars.some(x => x.plate === c.plate)) myCars.push({ plate: c.plate, name: '' });
    el.innerHTML = `<h3>👤 Age & life stage <small class="sst">only you see these</small></h3><p class="sst">Used only to suggest interests (they get a ✨ card and choose) and to nudge their feed a little. Never shown to anyone else.</p>
      ${mem.map(m => `<div class="prof" data-mid="${m.id}"><b>${esc(m.name)}</b>${bdRow(m, dates.list)}<select data-pr="${m.id}" aria-label="Pronouns for ${esc(m.name)}">${PRON_OPTS.map(([k, l]) => `<option value="${k}"${(m.pron || '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select><select data-pf="age">${STG.ages.map(a => `<option value="${esc(a)}"${(m.age || '') === a ? ' selected' : ''}>${a || 'Age –'}</option>`).join('')}</select><select data-pf="stage"><option value="">Life stage –</option>${Object.entries(STG.stages).map(([k, l]) => `<option value="${k}"${m.stage === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <div class="sgx sitx"><small class="sst">Situation:</small>${Object.entries(STG.sits || {}).map(([k, l]) => `<button class="chip${(m.sit || '').split(',').includes(k) ? ' on' : ''}" data-psit="${k}">${esc(l)}</button>`).join('')}</div>
        <div class="sgx">${sugT.map(t => `<button class="chip${(m.sugg || '').split(',').includes(t) ? ' on' : ''}" data-pfs="${t}">${(SUGL[t] || TOPIC[t])[SUGL[t] ? 0 : 2]} ${esc((SUGL[t] || TOPIC[t])[1])}</button>`).join('')}</div></div>`).join('')}
      <h3>👋 Come-back reminders</h3><p class="sst">One friendly push (5–7pm) when someone with notifications on hasn’t been in for 2+ days – at most every 2 days, weekly after 3 with no visit. Each person can switch it off.</p>
      ${cbk && cbk.list ? `<ul class="cbl">${cbk.list.filter(r => !/^Test /.test(r.name)).map(r => `<li><b>${esc(r.name)}</b> <small class="sst">${r.lastVisit ? (r.away === 0 ? 'in today' : r.away === 1 ? 'in yesterday' : r.away + ' days away') : 'never joined'} · ${r.push ? (r.on ? '🔔 on' : '🔕 switched off') : 'no notifications'}${r.sent ? ` · ${r.sent} sent, last ${esc(ago(r.lastNudge))} ago${r.inRow >= 3 ? ' (weekly now)' : ''}` : ''}</small>${r.txt ? `<br><small class="sst">“${esc(r.txt)}”</small>` : ''}</li>`).join('')}</ul>` : ''}
      <h3>🎂 Family birthdays & events</h3>${dates.list.map(d => `<div class="row"><span>${d.kind === 'bday' ? '🎂' : '🎉'} ${esc(d.title)}<small class="sst">${d.d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.m - 1]} · ${inDays(d.days)}</small></span><button class="btn" data-datedel="${d.id}">Remove</button></div>`).join('') || '<p class="sst">None yet.</p>'}
      <div class="bdf"><select id="dk"><option value="bday">🎂 Birthday</option><option value="event">🎉 Event</option></select><input id="dt" maxlength="60" placeholder="e.g. Aranea"><input id="dd" type="date" aria-label="Date"><button class="btn pri" id="dadd">Add</button></div>
      <p class="sst">Birthdays repeat every year (the year is optional and only used for the age); events happen once. They show as countdowns two weeks ahead and a card on the day. Your own My App birthdays stay private unless you tap “➕ Add to family” on one.</p>
      <h3>🚗 Share a car’s due dates with…</h3><p class="sst">Only the plate, model, photo and the rego, WOF and service due dates go (never costs or notes). They see a private card nobody else can see or comment on, and a ping 2 weeks and 3 days before.</p>
      ${myCars.map(c => { const sh = cars.cars.find(x => x.plate === c.plate); return `<div class="row"><span>🚗 ${esc(c.plate)}<small class="sst">${esc(c.name || '')}${sh && sh.car ? ' · updated ' + esc(ago(sh.at || sh.car.updated)) + ' ago' + (sh.src === 'relay' ? ' (from My App’s data service)' : '') : ''}</small></span><select data-carp="${esc(c.plate)}"><option value="">Not shared</option>${people.map(p => `<option value="${p.id}"${sh && sh.mid === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>`; }).join('') || '<p class="sst">Open My App on this phone first.</p>'}${saAdmin(sap, S, mem)}${aiAdmin(aib)}`;
  } catch (e) { el.textContent = e.message; }
}
async function saveProf(row) {
  const mid = row.dataset.mid, age = row.querySelector('[data-pf="age"]').value, stage = row.querySelector('[data-pf="stage"]').value, sugg = [...row.querySelectorAll('[data-pfs].on')].map(b => b.dataset.pfs); const sit = [...row.querySelectorAll('[data-psit].on')].map(b => b.dataset.psit);
  try { await fam('/members/' + mid + '/profile', { method: 'PUT', body: JSON.stringify({ age, stage, sugg, sit }) }); toast('Saved (private)'); } catch (e) { toast(e.message); }
}
// ➕ Add to family on Shane's own My App birthday cards (one tap, explicit; nothing is copied otherwise)
async function addBdayToFamily(id) {
  const x = LIFE_BY_ID.get(id); if (!x || !IS_ADMIN) return;
  const name = String(x.t || '').replace(/[’']s birthday.*$/i, '').replace(/^🎂\s*/, '').trim();
  const S = await myAppData(), b = S && (S.birthdays || []).find(b => b && b.name && b.name.trim().toLowerCase() === name.toLowerCase());
  const iso = b && (b.day && b.month ? `${b.year || ''}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}` : (b.date || b.dob || b.birthday)); const mm = /(\d{4})?-?(\d{2})-(\d{2})$/.exec(String(iso || '')); // 1.9.35 My App keeps {day, month, year}
  if (!mm) { toast('Couldn’t find that birthday’s date in My App'); return; }
  if (!confirm(`Add ${name}’s birthday (${+mm[3]}/${+mm[2]}) to the family calendar? Everyone in the family will see a countdown.`)) return;
  try { await fam('/dates', { method: 'POST', body: JSON.stringify({ kind: 'bday', title: name + '’s birthday', m: +mm[2], d: +mm[3], y: null, mid: null }) }); toast('🎂 Added to the family'); xLoad(true); } catch (e) { toast(e.message); }
}
const baseLifeCard = lifeCard;
window.lifeCard = function (x) { const h = baseLifeCard(x); return IS_ADMIN && x.cat === 'bday' && x.mine ? h.replace('<div class="ft">', `<div class="ft"><button class="fb addfam" data-addfam="${esc(x.id)}">➕ Add to family</button>`) : h; };

/* ---- clicks ---- */
document.addEventListener('click', async e => {
  const t = e.target;
  const tp = t.closest('[data-topt]'); if (tp) { triviaAnswer(+tp.dataset.topt); return; }
  const tr = t.closest('[data-trivia]'); if (tr) { tr.dataset.trivia === 'play' ? triviaPlay() : triviaBoard(); return; }
  const dp = t.closest('[data-dqphoto]'); if (dp) { pickPhotos(dp.dataset.dqphoto); return; }
  const sg = t.closest('[data-sg]'); if (sg) { sg.classList.toggle('on'); return; }
  if (t.id === 'sgadd' || t.id === 'sgno') { suggApply(t.id === 'sgadd'); return; }
  if (t.closest('#greet') || t.closest('[data-profile]')) { if (FAM_ON) profileSheet(); return; }
  if (t.id === 'pushon' || t.id === 'pushask-on') { document.querySelector('#pushask')?.remove(); if (await pushOn() && $('#sheet').classList.contains('on')) profileSheet(); return; }
  if (t.id === 'instlater') { ls.set('instLater', Date.now()); $('#instb')?.remove(); return; }
  if (t.id === 'instcopy') { copyLink(); return; }
  if (t.id === 'instgo') { if (BIP) { BIP.prompt(); const r = await BIP.userChoice.catch(() => ({})); BIP = null; if (r.outcome === 'accepted') { ls.set('installed', 1); $('#instb')?.remove(); } } return; }
  if (t.id === 'celebok' || t.id === 'celeb') { $('#celeb')?.remove(); return; }
  if (t.closest('#stchip')) { if (FAM_ON) profileSheet(); return; }
  if (t.id === 'pushask-no') { document.querySelector('#pushask')?.remove(); return; }
  if (t.id === 'pushoff') { await pushOff(); profileSheet(); return; }
  if (t.id === 'pushtest') { try { await swAuth(); await fam('/push/test', { method: 'POST' }); toast('Sent – it should arrive in a few seconds'); } catch (er) { toast(er.message); } return; }
  const np = t.closest('[data-np]'); if (np) { const k = np.dataset.np, P = X.push.prefs; try { X.push = { ...X.push, prefs: (await fam('/push/prefs', { method: 'PUT', body: JSON.stringify({ [k]: !P[k] }) })).prefs }; profileSheet(); } catch (er) { toast(er.message); } return; }
  if (t.id === 'bdsave') { const d = +$('#bdd').value, m = +$('#bdm').value, y = +$('#bdy').value || null; if (!d || !m) { toast('Pick a day and month'); return; } try { await fam('/dates', { method: 'POST', body: JSON.stringify({ kind: 'bday', m, d, y }) }); toast('🎂 Saved'); xLoad(true); profileSheet(); } catch (er) { toast(er.message); } return; }
  const dd = t.closest('[data-datedel]'); if (dd) { if (!confirm('Remove this date?')) return; try { await fam('/dates/' + dd.dataset.datedel, { method: 'DELETE' }); toast('Removed'); xLoad(true); if ($('#famx')) adminExtras(); else profileSheet(); } catch (er) { toast(er.message); } return; }
  if (t.id === 'dadd') { const v = $('#dd').value, title = $('#dt').value.trim(), kind = $('#dk').value; const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v); if (!m || !title) { toast('Add a name and a date'); return; } try { await fam('/dates', { method: 'POST', body: JSON.stringify({ kind, title: kind === 'bday' && !/birthday/i.test(title) ? title + '’s birthday' : title, m: +m[2], d: +m[3], y: kind === 'event' ? +m[1] : null, mid: null }) }); toast('Added'); xLoad(true); adminExtras(); } catch (er) { toast(er.message); } return; }
  const psit = t.closest('[data-psit]'); if (psit) { psit.classList.toggle('on'); saveProf(psit.closest('.prof')); return; }
  const pfs = t.closest('[data-pfs]'); if (pfs) { pfs.classList.toggle('on'); saveProf(pfs.closest('.prof')); return; }
  const af = t.closest('[data-addfam]'); if (af) { addBdayToFamily(af.dataset.addfam); return; }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.matches('[data-pf]')) { saveProf(t.closest('.prof')); return; }
  if (t.matches('[data-bdm],[data-bdd]')) { const r = t.closest('.bdrow'); const d = +r.querySelector('[data-bdd]').value, mo = +r.querySelector('[data-bdm]').value; if (d && mo) { try { await fam('/dates', { method: 'POST', body: JSON.stringify({ kind: 'bday', mid: r.dataset.bdmid, m: mo, d, y: +r.dataset.y || null }) }); toast('🎂 Birthday saved'); xLoad(true); } catch (er) { toast(er.message); } } return; }
  if (t.matches('[data-pr]')) { try { await fam('/members/' + t.dataset.pr + '/pron', { method: 'PUT', body: JSON.stringify({ pron: t.value || null }) }); toast('Saved – only used for wording'); } catch (er) { toast(er.message); } return; }
  if (t.id === 'mypron' || t.id === 'mypshow') { try { await fam('/pron', { method: 'PUT', body: JSON.stringify(t.id === 'mypron' ? { pron: t.value || null } : { show: t.checked }) }); toast('Saved'); } catch (er) { toast(er.message); } return; }
  if (t.id === 'aion' || t.id === 'aifreq') { try { await fam('/aibot/cfg', { method: 'PUT', body: JSON.stringify(t.id === 'aion' ? { on: t.checked } : { freq: t.value }) }); toast(t.id === 'aion' ? (t.checked ? '🤖 Info Bot is on' : 'Info Bot is off') : 'Saved'); adminExtras(); } catch (er) { toast(er.message); } return; }
  if (t.id === 'aimute') { try { const r = await fam('/aibot/mute', { method: 'PUT', body: JSON.stringify({ mute: !t.checked }) }); X.aimute = r.mute; toast(r.mute ? 'Info Bot won’t reply to you (and its replies are hidden for you)' : '🤖 Info Bot can reply to you'); } catch (er) { toast(er.message); } return; }
  if (t.id === 'saon') { try { await fam('/sappts/cfg', { method: 'PUT', body: JSON.stringify({ on: t.checked }) }); ls.set('saSig', ''); if (t.checked) await apptSync(true); toast(t.checked ? '📅 Sarah’s appointments: on' : 'Sarah’s appointments: off (removed from Info Book)'); X.got = 0; xLoad(true); adminExtras(); } catch (er) { toast(er.message); } return; }
  if (t.matches('[data-carp]')) { try { await fam('/cars', { method: 'PUT', body: JSON.stringify({ plate: t.dataset.carp, mid: t.value || null }) }); X.cars = (await fam('/cars')).cars; await carSync(); toast(t.value ? '🚗 Shared' : 'Not shared any more'); adminExtras(); } catch (er) { toast(er.message); } return; }
  if (t.id === 'qf' || t.id === 'qt') { try { X.push = { ...X.push, prefs: (await fam('/push/prefs', { method: 'PUT', body: JSON.stringify({ qFrom: +$('#qf').value, qTo: +$('#qt').value }) })).prefs }; toast('Quiet hours saved'); } catch (er) { toast(er.message); } }
});
function xAfterPost() { setTimeout(() => xLoad(true), 800); }
// hook into the existing refresh points
const baseFamFresh = famFresh;
window.famFresh = async function (force) { await baseFamFresh(force); xLoad(force); };
const baseFamList = famList;
window.famList = async function () { await baseFamList(); const l = $('#famlist'); if (l && IS_ADMIN && !$('#famx')) l.insertAdjacentHTML('afterend', '<div id="famx" class="famx">Loading…</div>'); adminExtras(); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') xVisit(); });
if (FAM_ON) { setTimeout(() => { xVisit(); xLoad(true); if (X.push === null) { } }, 1200); if ('serviceWorker' in navigator && Notification && Notification.permission === 'granted') swAuth(); }
if (FEED && tab === 'all') { try { draw(); } catch (e) { } } // 1.9.30 the first paint from cache can run before this file loads – redraw so the countdowns and extras appear

/* ---- 1.9.30 📍 'Event near you' promos (Whangārei area only), weekly 'This week in Whangārei for you', and ⭐ Interested on every event ---- */
const WGR_AREA = /whang[aā]rei|kamo|onerahi|tikipunga|kensington|maunu|morningside|raumanga|otangarei|regent|parahaki|riverside|town basin|hundertwasser|forum north|tutuk[aā]k[aā]|ngunguru|matapouri|ruak[aā]k[aā]|waip[uū]\b|one tree point|marsden|hikurangi|parua bay|pataua|maungakaramea|maungatapere|portland|glenbervie|whareora|whananaki|oakleigh|tamaterau|mckinnon/i;
const INT = { mine: new Map(), who: {}, got: 0 }, INT_META = {};
async function intLoad(force) {
  if (!FAM_ON || (!force && Date.now() - INT.got < 60e3)) return; INT.got = Date.now();
  try { const r = await fam('/interest'); INT.mine = new Map((r.mine || []).map(x => [x.eid, x])); INT.who = r.who || {}; if ((tab === 'all' && scrollY < 300) || tab === 'family') draw(); } catch (e) { }
}
setTimeout(() => intLoad(true), 1200);
const evVenue = s => String(s || '').split(/,\s*/).filter(x => x && !/\b(mon|tues|wednes|thurs|fri|satur|sun)day\b|\b\d{1,2}(st|nd|rd|th)\b|\d[.:]?\d*\s*[ap]m\b/i.test(x)).join(', ').replace(/\s+/g, ' ').trim();
const evAway = ev => { const d = nzDayNum(ev) - nzDayNum(Date.now()); return d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days away`; };
const evWhen = ev => NZ(ev, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + NZ(ev, { hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(' ', '');
const intNames = id => (INT.who[id] || []);
function intLine(id) {
  const n = intNames(id); if (!n.length) return '';
  const first = n[0] === 'You' ? (n.length === 1 ? 'You’re' : 'You and ' + (n.length - 1 === 1 ? n[1] : (n.length - 1) + ' others') + ' are') : n.length === 1 ? n[0] + ' is' : n[0] + ' and ' + (n.length - 1 === 1 ? n[1] : (n.length - 1) + ' others') + ' are';
  return `<button class="intwho" data-intwho="${esc(id)}">⭐ ${esc(first)} interested</button>`;
}
function intBar(i, ev) { // ⭐ Interested toggle + who's interested (family only)
  const id = String(i.id); INT_META[id] = { id, t: i.t, ev: ev || i.ev || 0, url: i.url || '', img: i.img || '', where: evVenue(i.s) || i.where || '', topic: i.topic || '' };
  if (!FAM_ON) return '';
  const on = INT.mine.has(id);
  return `<div class="intbar"><button class="intb${on ? ' on' : ''}" data-int="${esc(id)}" aria-pressed="${on}">${on ? '⭐ Interested' : '☆ Interested'}</button>${intLine(id)}</div>`;
}
const isEventItem = i => i && (i.kind === 'event' || i.x === 'promo');
const EV_KW = { music: /\b(gig|concert|band|music|jazz|choir|orchestra|dj|live|singer|songwriter|blues|rock|folk)\b/i, garden: /\b(garden\w*|plants?|seeds?|orchard|flower show|botanic)\b/i, craft: /\b(craft\w*|knit\w*|crochet|sew\w*|quilt\w*|weav\w*|pottery|ceramics?|makers?)\b/i,
  creative: /\b(art|arts|artists?|exhibition|gallery|sculpture|painting|photograph\w*|design)\b/i, culture: /\b(theatre|museum|history|heritage|kapa haka|m[aā]ori|film|poetry|book|author|play)\b/i, kids: /\b(kids?|children|family|families|toddlers?|bab(y|ies)|school holidays?|wh[aā]nau|tamariki|junior)\b/i, parent: /\b(parents?|parenting|kids?|children|family|toddlers?|bab(y|ies)|wh[aā]nau)\b/i,
  food: /\b(food|market|cook\w*|wine|tasting|bak\w*|growers|feast|cafe|kai)\b/i, gf: /\b(gluten|food|market|growers)\b/i, dogs: /\b(dogs?|pupp(y|ies)|pets?)\b/i, pets: /\b(pets?|dogs?|cats?|animals?)\b/i, nature: /\b(walk|nature|birds?|planting|clean ?up|wildlife|bush|beach|reserve)\b/i, outdoors: /\b(walk|hike|tramp\w*|beach|kayak\w*|outdoors?|swim|camp\w*)\b/i,
  fitness: /\b(yoga|pilates|fitness|dance class|zumba|tai chi|bootcamp)\b/i, tarot: /\b(tarot|psychic|crystals?|spiritual|wellbeing|meditation)\b/i, games: /\b(games?|quiz|trivia|board ?games?|puzzles?)\b/i, boardg: /\b(board ?games?|tabletop|games? night)\b/i, vgames: /\b(gaming|video games?|esports?|lan)\b/i, fantasy: /\b(cosplay|comics?|fantasy|d&d|dungeons|warhammer)\b/i,
  diy: /\b(diy|repair caf[eé]|workshop|woodwork\w*|build)\b/i, collect: /\b(vintage|antiques?|collect\w*|swap|car boot|records?)\b/i, cars: /\b(car show|classic cars?|motor\w*|hot rods?|cars and coffee)\b/i, tech: /\b(tech|coding|robot\w*|digital)\b/i, science: /\b(science|astronomy|stargaz\w*|planetarium)\b/i, scifi: /\b(sci-?fi|space|astronomy|stargaz\w*)\b/i,
  travel: /\b(tours?|cruise|day trip)\b/i, sitcoms: /\b(comedy|comedian|stand-?up|laughs?)\b/i, rainbow: /\b(pride|rainbow|drag|lgbt\w*|queer)\b/i, social: /\b(community|hui|volunteer\w*|wellbeing|support group)\b/i, nd: /\b(sensory|autism|adhd|neurodiver\w*|quiet)\b/i, hp: /\b(harry potter|hogwarts|wizard\w*|butterbeer|slytherin|potter)\b/i, monarch: /\b(butterfl\w*|monarchs?|swan plants?|pollinators?)\b/i };
function promoScore(e, now = Date.now()) {
  const W = weights(), base = W.topic(e.topic) || (e.topic === 'events' ? 1 : 0); if (!base) return 0;
  const d = (e.ev - now) / 864e5, span = (String(e.s).match(/\b\d{1,2}(st|nd|rd|th)\b/g) || []).length > 1 ? 0.6 : 1; // long-running classes a bit less
  const txt = e.t + ' ' + e.s, picks = (typeof PICK !== 'undefined' && PICK) || Object.keys(EV_KW).filter(k => W.topic(k) >= 1), hit = picks.filter(k => EV_KW[k] && EV_KW[k].test(txt)).length;
  const weekly = /\b(mon|tues|wednes|thurs|fri|satur|sun)day (morning|evening|afternoon|night)?\s*(yoga|class|session|pilates)?\b/i.test(e.t) || /\b(weekly|every week|term \d)\b/i.test(txt);
  const salesy = /open day|lifestyle village|retirement|real estate|show ?home|\bsale\b|clearance|expo|seminar|investment/i.test(txt) ? 0 : 1; // not company sales pitches
  let w = base * (typeof popW === 'function' ? popW(e) : 1) * (d <= 7 ? 2.2 : d <= 14 ? 1.2 : 0.8) * span * (hit ? 1.5 + hit : 0.5) * (weekly ? 0.3 : 1) * salesy;
  const mine = [...INT.mine.values()]; if (mine.some(m => m.topic && m.topic === e.topic)) w *= 1.3;
  const words = new Set(mine.flatMap(m => String(m.t || '').toLowerCase().match(/[a-zā]{5,}/g) || [])); if ((String(e.t).toLowerCase().match(/[a-zā]{5,}/g) || []).some(x => words.has(x))) w *= 1.3;
  return w;
}
function promoPool(now = Date.now()) {
  if (!FEED) return []; const seen = new Set();
  return FEED.items.filter(e => e.kind === 'event' && !e.pin && e.ev > now - 2 * 36e5 && e.ev < now + 30 * 864e5 && e.img && (WGR_AREA.test(e.t + ' ' + e.s + ' ' + e.url) || ((e.topic === 'hp' || e.topic === 'monarch') && /auckland|t[aā]maki/i.test(e.s + ' ' + e.url))) && (!/auckland|t[aā]maki/i.test(e.s + ' ' + e.url) || ((e.topic === 'hp' || e.topic === 'monarch') && optedIn(e.topic))) && !unsafe(e) && !(VOTES[e.id] && VOTES[e.id].v < 0) && !seen.has(e.t) && seen.add(e.t))
    .map(e => ({ e, w: promoScore(e, now) })).filter(x => x.w > 0);
}
let PROMO_FOR = null, PROMO = null;
const evKind = e => ((String(e.t).toLowerCase().match(/\b(yoga|pilates|market|quiz|choir|jazz|exhibition|workshop|class|tai chi|zumba|meditation)\b/) || [])[1]) || e.id;
function pickPromos(nPins, len) {
  const now = Date.now(), recent = ls.get('promoSeen', {}); for (const k in recent) if (now - recent[k] > 3 * 864e5) delete recent[k];
  let pool = promoPool(now); const fresh = pool.filter(x => !recent[x.e.id]); if (fresh.length >= 3) pool = fresh; // never the same promo again within ~3 days, unless there's little else on
  const out = [], slots = []; let pos = Math.max(2, nPins) + 7 + Math.floor(Math.random() * 3);
  while (pos < len + 10 && slots.length < 8) { slots.push(pos); pos += 8 + Math.floor(Math.random() * 3); }
  const kinds = new Set(); for (const _ of slots) { pool = pool.filter(x => !kinds.has(evKind(x.e))); const tot = pool.reduce((a, x) => a + x.w, 0); if (!tot) break; let r = Math.random() * tot, k = 0; while (k < pool.length - 1 && (r -= pool[k].w) > 0) k++; out.push(pool[k].e); kinds.add(evKind(pool[k].e)); pool.splice(k, 1); }
  const wk = (() => { const ks = new Set(); return promoPool(now).filter(x => x.e.ev < now + 7 * 864e5).sort((a, b) => b.w - a.w).filter(x => { const k = evKind(x.e); if (ks.has(k)) return false; ks.add(k); return true; }); })().slice(0, 5).map(x => x.e).sort((a, b) => a.ev - b.ev);
  return { slots, list: out, wk, recent };
}
const baseFestive = window.festive;
window.festive = function (order, nPins) {
  order = baseFestive ? baseFestive(order, nPins) : order;
  if (!FEED || order.length < 6) return order;
  if (!PROMO || PROMO_FOR !== FEED) { PROMO_FOR = FEED; PROMO = pickPromos(nPins, order.length); const now = Date.now(); for (const e of PROMO.list) PROMO.recent[e.id] = now; ls.set('promoSeen', PROMO.recent); }
  const ids = new Set(PROMO.list.map(e => e.id)), out = order.filter(i => !ids.has(i.id)), lo = Math.max(2, nPins);
  if (PROMO.wk.length >= 2) out.splice(Math.min(lo + 3, out.length), 0, { id: 'wk-' + nzKey().slice(0, 6) + Math.floor(nzDayNum(Date.now()) / 7), x: 'wk', list: PROMO.wk, topic: 'events', t: 'This week in Whangārei for you' });
  PROMO.list.forEach((e, k) => { const at = PROMO.slots[k]; if (at <= out.length) out.splice(at, 0, { ...e, id: e.id, x: 'promo', e }); });
  return out;
};
function icsHref(m) {
  const z = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''), x = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, ' ');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Info Book//EN', 'BEGIN:VEVENT', 'UID:' + m.id + '@infobook', 'DTSTAMP:' + z(Date.now()), 'DTSTART:' + z(m.ev), 'DTEND:' + z(m.ev + 2 * 36e5), 'SUMMARY:' + x(m.t), m.where ? 'LOCATION:' + x(m.where) : '', m.url ? 'URL:' + m.url : '', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
}
function promoCard(i) {
  const e = i.e, bar = intBar(e, e.ev), m = INT_META[String(e.id)], away = evAway(e.ev);
  return `<article class="card xc promo" data-id="${esc(e.id)}">${xHead('📍', 'Event near you', (e.sn || 'Eventfinda') + ' · picked for you', TOPIC[e.topic] ? TOPIC[e.topic][1] : 'Events')}
    <a class="pimg" href="${esc(e.url)}" target="_blank" rel="noopener"><img src="${esc(e.img)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="away${/Today|Tomorrow/.test(away) ? ' soon' : ''}">${esc(away)}</span></a>
    <div class="bd"><h3>${esc(e.t)}</h3><p class="pwhen">🗓️ ${esc(evWhen(e.ev))}</p>${m.where ? `<p class="pwhere">📍 ${esc(m.where)}</p>` : ''}
    <div class="xbtns"><a class="btn pri" href="${esc(e.url)}" target="_blank" rel="noopener">Details & tickets ↗</a><a class="btn" href="${icsHref(m)}" download="${esc(String(e.t).replace(/[^\w ]+/g, '').slice(0, 40) || 'event')}.ics">📅 Add to calendar</a></div>${bar}</div></article>`;
}
function wkCard(i) {
  return `<article class="card xc wkr" data-id="${esc(i.id)}">${xHead('🗓️', 'This week in Whangārei for you', 'Events near you, matched to your picks', 'Events')}
    <div class="bd"><ul class="wkl">${i.list.map(e => { const b = intBar(e, e.ev); return `<li><a href="${esc(e.url)}" target="_blank" rel="noopener"><img src="${esc(e.img)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span><b>${esc(e.t)}</b><em>${esc(evWhen(e.ev))} · ${esc(evAway(e.ev))}</em>${evVenue(e.s) ? `<em>📍 ${esc(evVenue(e.s))}</em>` : ''}</span></a>${b}</li>`; }).join('')}</ul></div></article>`;
}
function intListCard() {
  const L = [...INT.mine.values()];
  return `<article class="card xc intl" data-id="intlist">${xHead('⭐', 'Events you’re interested in', 'Only the family can see who’s interested', 'Events')}
    <div class="bd"><ul class="wkl">${L.map(m => `<li><a href="${esc(m.url || '#')}" target="_blank" rel="noopener">${m.img ? `<img src="${esc(m.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span><b>${esc(m.t)}</b>${m.ev ? `<em>${esc(evWhen(m.ev))} · ${esc(evAway(m.ev))}</em>` : ''}${m.where ? `<em>📍 ${esc(m.where)}</em>` : ''}</span></a>${intBar({ id: m.eid, t: m.t, url: m.url, img: m.img, where: m.where, topic: m.topic }, m.ev)}</li>`).join('')}</ul>
    <p class="xwho">You’ll get a reminder the day before and about 2 hours before (if notifications are on).</p></div></article>`;
}
const cardInt = window.card;
window.card = function (i) {
  if (i && i.x === 'promo') return promoCard(i);
  if (i && i.x === 'wk') return wkCard(i);
  if (i && i.x === 'intlist') return intListCard();
  const h = cardInt(i);
  if (i && !i.x && i.kind === 'event' && FAM_ON) { const k = String(h).lastIndexOf('</article>'); if (k > 0) return h.slice(0, k) + `<div class="intpad">${intBar(i, i.ev)}</div>` + h.slice(k); }
  return h;
};
const drawFamilyInt = drawFamily;
drawFamily = function () { drawFamilyInt(); if (INT.mine.size && !$('#feed [data-id="intlist"]')) { const f = $('#feed'), d = document.createElement('div'); d.innerHTML = intListCard(); const at = f.querySelector('article:nth-of-type(2)'); at ? f.insertBefore(d.firstElementChild, at) : f.appendChild(d.firstElementChild); } };
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-int]');
  if (b) { e.preventDefault(); const id = b.dataset.int, m = INT_META[id] || { id }, on = !INT.mine.has(id);
    document.querySelectorAll(`[data-int="${CSS.escape(id)}"]`).forEach(x => { x.classList.toggle('on', on); x.textContent = on ? '⭐ Interested' : '☆ Interested'; });
    try { const r = await fam('/interest', { method: 'POST', body: JSON.stringify({ ...m, on }) }); INT.mine = new Map((r.mine || []).map(x => [x.eid, x])); INT.who = r.who || {}; INT.got = Date.now();
      document.querySelectorAll(`[data-int="${CSS.escape(id)}"]`).forEach(x => { const bar = x.parentElement, w = bar.querySelector('.intwho'), nl = intLine(id); if (w) w.outerHTML = nl || ''; else if (nl) x.insertAdjacentHTML('afterend', nl); });
      toast(on ? '⭐ Saved to your Interested events' + (X.push && X.push.on ? ' – we’ll remind you' : '') : 'Removed from Interested'); if (on && typeof pushAsk === 'function') setTimeout(pushAsk, 1500);
    } catch (err) { toast('Couldn’t save that – try again'); }
    return; }
  const w = e.target.closest('[data-intwho]'); if (w) { e.preventDefault(); const n = intNames(w.dataset.intwho); toast('⭐ Interested: ' + n.join(', ')); }
});
const popWInt = window.popW;
window.popW = function (i) { // ⭐ Interested: similar events (same interest, shared words) rank a little higher
  let w = popWInt(i); if (i && i.kind === 'event' && INT.mine.size) { const mine = [...INT.mine.values()]; if (mine.some(m => m.topic && m.topic === i.topic && m.topic !== 'events')) w *= 1.25; const words = new Set(mine.flatMap(m => String(m.t || '').toLowerCase().match(/[a-zā]{5,}/g) || [])); if ((String(i.t).toLowerCase().match(/[a-zā]{5,}/g) || []).some(x => words.has(x))) w *= 1.25; }
  return w;
};

/* ---- 1.9.30 🪄 Harry Potter with a Slytherin lean: Slytherin items rank higher, show-off posts lower, plus a daily 'Slytherin of the day' fact ---- */
const SLY_RE = /slytherin|snape|draco|malfoy|scorpius|green (and|&) silver|emerald|serpent|salazar|bloody baron|slughorn|regulus/i;
const popWHp = window.popW;
window.popW = function (i) { let w = popWHp(i); if (i && i.topic === 'hp') { const t = (i.t || '') + ' ' + (i.s || ''); if (SLY_RE.test(t)) w *= 1.5; if (SHOW_RE_C.test(i.t || '')) w *= 0.45; if (TIP_RE_C.test(i.t || '')) w *= 1.2; } return w; };
const SLY_FACTS = [
  ['Merlin was a Slytherin', 'According to legend, the green ribbon of the Order of Merlin is green to honour his Hogwarts house.'],
  ['The common room is under the lake', 'Its windows look into the Black Lake – Slytherins sometimes watch the giant squid swim past.'],
  ['Emerald green and silver', 'The house colours – evoking water – with the serpent, “the wisest of creatures”, as the emblem.'],
  ['Severus Snape was Head of House', 'Before Snape it was Horace Slughorn, who later came back to the job.'],
  ['The Bloody Baron', 'Slytherin’s house ghost – the only one Peeves the poltergeist is afraid of.'],
  ['Slytherins can be kind too', 'Scorpius Malfoy (Draco’s son) proved you can be a Slytherin and still be kind and loyal.'],
  ['The Sorting Hat’s promise', '“Or perhaps in Slytherin you’ll make your real friends.”'],
  ['Regulus Black turned on Voldemort', 'Sirius’s Slytherin brother secretly stole Slytherin’s locket Horcrux.'],
  ['Prefect Gemma Farley', 'The Slytherin prefect who welcomes first-years: the entrance to the common room is hidden in a bare stone wall.'],
  ['Parseltongue', 'Salazar Slytherin could talk to snakes – a rare gift shared by Harry himself.'],
  ['Ambition is the core value', 'The hat looks for ambition, cunning, resourcefulness and determination – and a soft side kept well hidden.'],
  ['Andromeda Tonks was a Slytherin', 'Bellatrix’s sister married a Muggle-born, showing Slytherins choose their own path.'],
  ['Draco’s wand', '10 inches, hawthorn with a unicorn hair core – later won by Harry.'],
  ['Slughorn’s Slug Club', 'Professor Slughorn’s dinner parties for students he thought would go far – Harry, Hermione and Ginny included.']
];
function slyCard() {
  const n = nzDayNum(Date.now()), f = SLY_FACTS[n % SLY_FACTS.length];
  return `<article class="card xc sly" data-id="sly-${n}"><a class="pimg" href="https://www.harrypotter.com/house/slytherin" target="_blank" rel="noopener"><img src="https://www.harrypotter.com/images/share/share-slytherin-hbo.jpg" alt="" loading="lazy" referrerpolicy="no-referrer"></a>
    <div class="bd"><div class="slyk">🐍 Slytherin of the day</div><h3>${esc(f[0])}</h3><p>${esc(f[1])}</p><div class="xbtns"><a class="btn pri" href="https://www.harrypotter.com/house/slytherin" target="_blank" rel="noopener">More about Slytherin ↗</a></div></div></article>`;
}
const festHp = window.festive;
window.festive = function (order, nPins) { order = festHp(order, nPins); if (optedIn('hp') && order.length > 6) { const out = order.slice(); out.splice(Math.min(Math.max(2, nPins) + 4, out.length), 0, { id: 'sly-' + nzDayNum(Date.now()), x: 'sly', topic: 'hp', t: 'Slytherin of the day' }); return out; } return order; };
const cardHp = window.card;
window.card = function (i) { if (i && i.x === 'sly') return slyCard(); return cardHp(i); };

/* ---- 1.9.30 📅 Sarah's appointments: read on Shane's phone from My App's own storage (same as the shared cars). Only her own
   appointments (ones she shared from her To-do app, ones Shane marked For: Sarah, and her booked Health check-ups) go –
   title, date, time and place only, never notes, costs or claims. Only Sarah (and Shane) can read them. ---- */
const SA_MONEY = /\$|\b(bills?|pay(ment|ing)?|invoice|loan|bank|rent|mortgage|insurance|ird|tax|debt|budget|direct debit)\b(?!\s+(st|street|rd|road)\b)/i;
const saKind = t => /dent|hygien|orthodont/i.test(t) ? 'dentist' : /\b(doctor|dr|gp)\b|medical|clinic/i.test(t) ? 'doctor' : 'other';
function sarahAppts(S) {
  const out = [], T = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }), add = (id, title, date, time, place, kind) => {
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date < T || SA_MONEY.test(title)) return;
    out.push({ id, title: String(title).slice(0, 80), date, time: /^\d\d:\d\d$/.test(time || '') ? time : '', place: String(place || '').slice(0, 100), kind: kind || saKind(title) });
  };
  for (const a of (S && S.appts) || []) {
    if (!a || a.done || a.evId) continue;
    if (a.from === 'sarah') add('s:' + a.id, a.title, a.date, a.time, a.place, a.kind);
    else if (a.for === 'sarah' && a.shareSarah !== false) add('m:' + a.id, a.title, a.date, a.time, a.place, saKind(a.title + ' ' + (a.notes || '')));
  }
  for (const p of (S && S.health) || []) if (p && /^\s*sarah\b/i.test(String(p.name || ''))) for (const it of p.items || []) if (it && it.apptDate && it.shareSarah !== false) add('h:' + it.id, it.name, it.apptDate, it.apptTime, it.clinic, /dent|hygien/.test(it.kind || '') ? 'dentist' : /doctor|gp/.test(it.kind || '') ? 'doctor' : saKind(it.name));
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
async function apptSync(force) {
  if (!IS_ADMIN || !PRIVATE_OK) return;
  const c = X.saCfg; if (c && (!c.on || !c.mid) && !force) return;
  const S = await myAppData(); if (!S || !Array.isArray(S.appts)) return;
  const list = sarahAppts(S), sig = JSON.stringify(list);
  if (!force && ls.get('saSig', '') === sig && Date.now() - ls.get('saSyncAt', 0) < 6 * 36e5) return;
  try { const r = await fam('/sappts/sync', { method: 'POST', body: JSON.stringify({ list }) }); if (r && r.ok) { ls.set('saSig', sig); ls.set('saSyncAt', Date.now()); } return r; } catch (e) { }
}
function saAdmin(sap, S, mem) {
  const c = sap && sap.cfg; if (!c) return '';
  const sm = (mem || []).find(m => m.id === c.mid), P = pronOf(sm && sm.pron);
  const mine = S ? sarahAppts(S).length : null;
  return `<h3>📅 Sarah’s appointments in ${P.pos} Info Book</h3><p class="sst">${P.Pos} upcoming appointments from My App on this phone (ones ${P.sub} shared from ${P.pos} To-do app, ones marked For: Sarah, and ${P.pos} booked Health check-ups) show as countdown cards only ${P.sub} can see, with a reminder the day before and about 2 hours before. Only the title, date, time and place go – never notes, costs or claims.</p>
    <label class="row"><span>Show Sarah’s appointments${c.name ? '' : ' <small class="sst">(no member called Sarah)</small>'}<small class="sst">${c.on ? (c.last ? (c.n || 0) + ' synced · ' + esc(ago(c.last)) + ' ago' : 'not synced yet') : 'off'}${mine != null ? ' · ' + mine + ' upcoming in My App' : ''}</small></span><input type="checkbox" id="saon"${c.on ? ' checked' : ''}></label>`;
}
const saDays = a => dayN(a.date) - todayN();
const saItem = a => ({ id: 'sa:' + a.id, x: 'sappt', a, n: saDays(a), topic: 'family', t: '📅 ' + a.t });
const basePinsSA = window.pins;
window.pins = function () { const out = basePinsSA(); if (!FAM_ON || IS_ADMIN) return out; const now = (X.sappt || []).filter(a => saDays(a) >= 0 && saDays(a) <= 1).map(saItem); return now.concat(out); };
const baseFestSA = window.festive;
window.festive = function (order, nPins) {
  order = baseFestSA(order, nPins); if (!FAM_ON || IS_ADMIN) return order;
  const later = (X.sappt || []).filter(a => saDays(a) >= 2 && saDays(a) <= 30).slice(0, 5).map(saItem); if (!later.length) return order;
  const out = order.slice(); later.forEach((it, k) => out.splice(Math.min(Math.max(2, nPins) + 1 + k * 4, out.length), 0, it)); return out;
};
const baseCardSA = window.card;
window.card = function (i) { if (i && i.x === 'sappt') return saCard(i); return baseCardSA(i); };
function saCard(i) {
  const a = i.a, n = i.n, em = a.kind === 'dentist' ? '🦷' : a.kind === 'doctor' ? '🩺' : '📅';
  const when = new Date(a.date + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const tm = a.time ? (h => (h % 12 || 12) + (a.time.slice(3) === '00' ? '' : ':' + a.time.slice(3)) + (h < 12 ? 'am' : 'pm'))(+a.time.slice(0, 2)) : '';
  const big = n === 0 ? 'Today' + (tm ? ' at ' + tm : '') : n === 1 ? 'Tomorrow' + (tm ? ' at ' + tm : '') : 'In ' + n + ' days';
  const maps = a.place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.place)}` : '';
  return `<article class="card xc sappt${n <= 1 ? ' soon' : ''}" data-id="${esc(i.id)}">${xHead(em, 'Your appointment', n <= 1 ? 'Coming up ' + (n ? 'tomorrow' : 'today') : 'Countdown', n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'Appointment')}
    <div class="hero sah" style="--c1:${n <= 1 ? '#db2777' : '#7c3aed'};--c2:${n <= 1 ? '#f97316' : '#2563eb'}"><span class="em">${em}</span><div class="sabig">${esc(big)}</div><h3>${esc(a.t)}</h3></div>
    <div class="bd"><div class="crow${n <= 1 ? ' soon' : ''}"><span>When</span><b>${esc(when)}${tm ? ' · ' + tm : ''}</b><em>${inDays(n)}</em></div>${a.place ? `<div class="crow"><span>Where</span><b>${esc(a.place)}</b>${maps ? `<em><a href="${maps}" target="_blank" rel="noopener">Map ↗</a></em>` : ''}</div>` : ''}
    <p class="xwho">🔒 Only you (and Shane) can see this card. From your appointments in My App.</p></div></article>`;
}

/* ---- 1.9.30 🤖 Info Bot settings ---- */
function aiAdmin(a) {
  if (!a || !a.cfg) return '';
  const u = a.usage || {}, neu = Math.round((u.tin || 0) * 26668 / 1e6 + (u.tout || 0) * 204805 / 1e6);
  return `<h3>🤖 Info Bot <small class="sst">AI replies</small></h3><p class="sst">A clearly-labelled AI that sometimes answers comments – always when someone writes @infobot or asks a question, playfully on the daily question, otherwise now and then. At most one reply per thread an hour, 40 a day, 1–5 minutes after the comment. It only sees that post and its comments – never cars, appointments, ages or anyone’s private cards. Free (Cloudflare Workers AI). Anyone can mute it under 👤 You.</p>
    <label class="row"><span>Info Bot replies<small class="sst">Today: ${u.n || 0} replies${u.skip ? ', ' + u.skip + ' held back by the safety check' : ''} · about ${neu} of 10,000 free AI units</small></span><input type="checkbox" id="aion"${a.cfg.on ? ' checked' : ''}></label>
    <div class="row"><span>How often (when not asked)</span><select id="aifreq">${[['rare', 'Now and then (1 in 7)'], ['some', 'Sometimes (1 in 3)'], ['often', 'Often (1 in 2)']].map(([k, l]) => `<option value="${k}"${a.cfg.freq === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`;
}

/* ---- 1.9.30 pronouns: optional, wording only; not set = they/them ---- */
const PRON_OPTS = [['', 'Pronouns – not set (they)'], ['she', 'she/her'], ['he', 'he/him'], ['they', 'they/them']];
const PRON_LABEL = { she: 'she/her', he: 'he/him', they: 'they/them' };
function pronOf(k) { const t = k === 'she' ? { sub: 'she', obj: 'her', pos: 'her' } : k === 'he' ? { sub: 'he', obj: 'him', pos: 'his' } : { sub: 'they', obj: 'them', pos: 'their' }; t.Sub = t.sub[0].toUpperCase() + t.sub.slice(1); t.Pos = t.pos[0].toUpperCase() + t.pos.slice(1); return t; }

/* ---- 1.9.30 🔗 share a link (Android: Info Book in the phone's Share menu; iPhone/desktop: paste a link) ---- */
let LS = null;
const LINK_WHY = { sport: 'Info Book keeps sport out of the feeds, so this one can’t be shared.', money: 'Money and bills stay out of Info Book, so this one can’t be shared.', unsafe: 'That one isn’t family-safe, so it can’t be shared here.' };
function linkSheet(pre) {
  if (!FAM_ON) { toast('Join the family in Info Book first'); return; }
  LS = { pv: null, to: [], text: pre || '' };
  const people = (FAM_PEOPLE || []).filter(p => p.id !== MEMBER.id);
  $('#sheet').classList.add('on');
  $('#sheetin').innerHTML = `<h2>🔗 Share a link</h2><p class="sst">From Facebook, Instagram, TikTok, YouTube or any website: tap <b>Share → Copy link</b> there, then paste it here.${IS_IOS ? '' : ' On Android you can also pick <b>Info Book</b> straight from the Share menu.'}</p>
    <div class="lkin"><textarea id="lkurl" rows="2" placeholder="Paste a link…" aria-label="Link to share">${esc(pre || '')}</textarea>${navigator.clipboard && navigator.clipboard.readText ? '<button class="btn" id="lkpaste">📋 Paste</button>' : ''}</div>
    <div id="lkpv" class="lkpv"></div>
    <textarea id="lkcap" rows="2" maxlength="300" placeholder="Say something about it (optional)" aria-label="Your comment"></textarea>
    <h3>Who sees it?</h3><div class="lkto"><label><input type="radio" name="lkto" value="all" checked> 👨‍👩‍👧 The whole family</label><label><input type="radio" name="lkto" value="some"> 🔒 Just some people</label></div>
    <div id="lkppl" class="sgx" hidden>${people.map(p => `<button class="chip" data-lkp="${esc(p.id)}">${esc(p.name)}</button>`).join('') || '<p class="sst">Nobody else has joined yet.</p>'}</div>
    <div class="xbtns"><button class="btn pri" id="lkpost" disabled>Share</button><button class="btn" data-close>Cancel</button></div>`;
  if (pre) linkPreview();
}
let lkT = 0;
async function linkPreview() {
  const v = ($('#lkurl') || {}).value || '', box = $('#lkpv'); if (!box) return;
  LS.pv = null; LS.img = ''; LS.photo = 0; LS.pk = 0; lkReady();
  if (!/https?:\/\/\S+/i.test(v)) { box.innerHTML = v.trim() ? '<p class="sst">No link found yet – paste the whole link (it starts with https://).</p>' : ''; return; }
  box.innerHTML = '<p class="sst">🤖 Reading the post and finding a picture…</p>';
  try {
    const r = await fam('/preview?text=' + encodeURIComponent(v.slice(0, 2000)));
    if (($('#lkurl') || {}).value !== v) return;
    if (r.blocked) { box.innerHTML = `<p class="lkno">🙅 ${esc(LINK_WHY[r.blocked] || LINK_WHY.unsafe)}</p>`; return; }
    LS.pv = r; LS.img = r.img || ''; LS.pics = (r.pics || []).map(p => p.img); if (LS.img && !LS.pics.includes(LS.img)) LS.pics.unshift(LS.img);
    box.innerHTML = `<div class="lkcard"><div class="lkpic"><img id="lkimg" alt="" referrerpolicy="no-referrer"${LS.img ? ` src="${esc(LS.img)}"` : ''} onerror="if(LS&&LS.pv&&LS.pv.brand&&this.src!==LS.pv.brand){this.src=LS.pv.brand;LS.img=LS.pv.brand}else{this.removeAttribute('src')};lkReady()"><div class="lkpb"><button class="btn" id="lknext">🔄 Another picture</button><button class="btn" id="lkmine">📷 Use my photo</button></div></div>
      <div><small>${esc(r.site)}${r.stock ? ' · picture: free photo (Wikimedia Commons)' : ''}</small><b>${esc(r.t)}</b></div></div>
      <label class="lkdl">${r.needDesc ? '✏️ <b>Add a line about it</b> (optional – we couldn’t read this one)' : '🤖 Description (written by Info Bot – change it if you like)'}</label>
      <textarea id="lkdesc" rows="3" maxlength="300" placeholder="What’s it about? (optional)">${esc(r.desc || '')}</textarea>`;
    lkReady();
  } catch (e) { box.innerHTML = `<p class="lkno">${/public/i.test(e.message) ? '🔒 ' : ''}${esc(e.message)}</p>`; }
}
function lkReady() { // Share needs a real description and a picture
  const b = $('#lkpost'); if (!b) return; const d = (($('#lkdesc') || {}).value || '').replace(/\s/g, ''), im = $('#lkimg');
  b.disabled = !(LS && LS.pv && (LS.photo || (im && im.getAttribute('src')) || LS.pv.brand)); // 1.9.37 a line about it is optional
}
async function lkNextPic() {
  if (!LS || !LS.pv) return;
  if (LS.pics.length < 2 || LS.pk >= LS.pics.length - 1) { // ask for more, from the description's words
    const q = (LS.pv.picq || LS.pv.q || ((($('#lkdesc') || {}).value || '').split(/\s+/).filter(w => w.length > 4).slice(0, 2).join(' ')) || 'New Zealand');
    try { const r = await fam('/preview/pics?q=' + encodeURIComponent(q)); for (const p of r.pics || []) if (!LS.pics.includes(p.img)) LS.pics.push(p.img); } catch (e) { }
  }
  if (!LS.pics.length) { toast('No other pictures found – try “Use my photo”'); return; }
  LS.pk = (LS.pk + 1) % LS.pics.length; LS.img = LS.pics[LS.pk]; LS.photo = 0; const im = $('#lkimg'); if (im) im.src = LS.img; lkReady();
}
function lkMine() {
  const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
  f.onchange = async () => { const file = f.files[0]; if (!file) return; const im = $('#lkimg');
    try { toast('Getting your photo ready…'); const p = await shrink(file);
      const r = await fetch(FAM_API + '/photos?w=' + p.w + '&h=' + p.h, { method: 'POST', headers: { Authorization: 'Bearer ' + MEMBER.tok, 'Content-Type': 'image/jpeg' }, body: p.blob });
      const j = await r.json(); if (!r.ok) throw new Error(j.err || 'Couldn’t add that photo');
      LS.photo = j.id; LS.img = ''; if (im) im.src = p.url; lkReady();
    } catch (e) { toast(e.message); } };
  f.click();
}
async function linkPost() {
  if (!LS || !LS.pv) return;
  const some = (document.querySelector('input[name="lkto"]:checked') || {}).value === 'some', to = some ? [...document.querySelectorAll('[data-lkp].on')].map(b => b.dataset.lkp) : [];
  if (some && !to.length) { toast('Pick who should see it'); return; }
  const d = (($('#lkdesc') || {}).value || '').trim();
  const btn = $('#lkpost'); btn.disabled = true; btn.textContent = 'Sharing…';
  try {
    const r = await fam('/shares/link', { method: 'POST', body: JSON.stringify({ url: LS.pv.url, caption: ($('#lkcap') || {}).value || '', desc: d === (LS.pv.desc || '') ? '' : d, img: LS.photo ? '' : LS.img, photo: LS.photo || 0, to }) });
    $('#sheet').classList.remove('on'); toast(r.dup ? 'You shared that one already' : some ? '🔒 Shared with ' + to.length + (to.length === 1 ? ' person' : ' people') : '🔗 Shared with the family');
    await loadShares(); if (typeof tab !== 'undefined' && tab !== 'family') { const b = document.querySelector('[data-tab="family"]'); if (b) b.click(); }
  } catch (e) { btn.disabled = false; btn.textContent = 'Share'; toast(e.message); lkReady(); }
}
document.addEventListener('input', e => { if (e.target && e.target.id === 'lkurl') { clearTimeout(lkT); lkT = setTimeout(linkPreview, 500); } if (e.target && e.target.id === 'lkdesc') lkReady(); });
document.addEventListener('change', e => { if (e.target && e.target.name === 'lkto') { const p = $('#lkppl'); if (p) p.hidden = e.target.value !== 'some'; } });
document.addEventListener('click', async e => {
  const t = e.target; if (!t || !t.closest) return;
  if (t.closest('[data-sharelink]')) { linkSheet(''); return; }
  if (t.id === 'lkpaste') { try { const v = await navigator.clipboard.readText(); if (v) { $('#lkurl').value = v; linkPreview(); } } catch (er) { toast('Long-press the box and tap Paste'); } return; }
  const lp = t.closest('[data-lkp]'); if (lp) { lp.classList.toggle('on'); return; }
  if (t.id === 'lkpost') { linkPost(); return; }
  if (t.id === 'lknext') { lkNextPic(); return; }
  if (t.id === 'lkmine') { lkMine(); return; }
  if (t.id === 'lktipok') { ls.set('shareTip', 1); document.querySelector('#lktip')?.remove(); return; }
});
// Android Share sheet → Info Book (manifest share_target, GET ./?share=1&title=&text=&url=)
(function shareTarget() {
  const q = new URLSearchParams(location.search); if (!q.has('share') && !q.has('url') && !q.has('text')) return;
  const u = q.get('url') || '', tx = q.get('text') || '', pre = (u && !tx.includes(u) ? u + ' ' : '') + (tx || (u ? '' : q.get('title') || ''));
  history.replaceState(null, '', location.pathname);
  if (!pre) return;
  const go = (n = 0) => { if (typeof FAM_ON !== 'undefined' && FAM_ON && $('#sheetin')) { if ($('#sheet').classList.contains('on') && !$('#lkurl')) $('#sheet').classList.remove('on'); linkSheet(pre); } else if (n < 40) setTimeout(() => go(n + 1), 250); else toast('Open Info Book from your family link first'); };
  setTimeout(go, 600);
})();
// a one-time tip on installed Android phones: Info Book can now be picked in the Share menu
setTimeout(() => {
  if (!FAM_ON || ls.get('shareTip', 0) || !/Android/i.test(navigator.userAgent) || !STANDALONE) return;
  $('#feed').insertAdjacentHTML('beforebegin', `<section id="lktip" class="instb"><div class="tx"><b>🔗 New: share into Info Book</b><p>In Facebook, Instagram, TikTok or Chrome tap <b>Share</b> and pick <b>Info Book</b>. If it isn’t in the list yet, your phone updates Info Book within a day – or remove it from your home screen and add it again.</p><div class="xbtns"><button class="btn pri" id="lktipok">Got it</button></div></div></section>`);
}, 5000);

/* ---- 1.9.30 📺 Coming up to watch: new and upcoming shows and movies on Netflix NZ, TVNZ+ and ThreeNow (from JustWatch's NZ
   catalogue, refreshed by the data service every ~6 hours). One or two a load, matched to this person's interests and
   situation; sitcoms lead for anyone with Sitcoms on. Seen once, gone; dropped a week after release. ⭐ Interested = a
   reminder on the day it comes out. Never sport, R18, money or anything that isn't family-safe. */
const WT_G2T = { cmy: ['sitcoms'], fnt: ['fantasy', 'hp'], ani: ['kids'], fml: ['kids', 'parent'], scf: ['scifi'], doc: ['learn', 'science', 'nature'], msc: ['music'], hst: ['learn', 'culture'], rly: ['food'] };
const WT_KW = { hp: /harry potter|hogwarts|wizard|witch|magic|fantastic beasts|dragon/i, rainbow: /\bdrag\b|ru ?paul|queer|lgbt\w*|\bgay\b|lesbian|trans\b|pride/i, pets: /\b(dogs?|pupp(y|ies)|cats?|kittens?|pets?|animals?|vet)\b/i, dogs: /\b(dogs?|pupp(y|ies))\b/i, tarot: /\b(psychic|tarot|witch\w*|spirit\w*|medium|astrolog\w*|zodiac|haunted|ghosts?|signos)\b/i,
  food: /\b(cook\w*|bak\w*|kitchen|chef|food|recipes?|feast|diners?)\b/i, garden: /\b(garden\w*|farm\w*|grow\w*)\b/i, travel: /\b(travel|adventure|journey|road trip|abroad|paris|istanbul|world)\b/i, music: /\b(music\w*|singer|band|concert|song\w*|pop star)\b/i, cars: /\b(cars?|garage|motor\w*|race car)\b/i,
  diy: /\b(renovat\w*|fixer|house|home makeover|build\w*|diy)\b/i, craft: /\b(craft\w*|knit\w*|sew\w*|quilt\w*|make\w*)\b/i, vgames: /\b(gam(e|er|ing)|anime|video game)\b/i, scifi: /\b(space|star trek|aliens?|sci-?fi|robots?)\b/i, kids: /\b(kids?|children|family|families|cartoon|powerpuff|gabby|bluey|peppa)\b/i, sitcoms: /\b(sitcom|comedy|comedian|stand-?up|funny|laugh\w*)\b/i };
const WT_HEAVY = /\b(murder\w*|killer|kill(ed|ing)?|serial|crime|cartel|mafia|prison|parolees|court|trial|abuse|dark side|deadly|death|dead|war|horror|haunt(ed|ing)|cult|kidnap\w*|missing|snapped|sinister|jane doe)\b/i;
function wtSit() { const n = ls.get('nudge', null) || {}; return n.sit || {}; }
function wtScore(w, now = Date.now()) {
  const W = weights(), sit = wtSit(), txt = w.t + ' ' + (w.label || '') + ' ' + (w.s || ''), G = w.genres || [];
  const kidsy = (G.includes('fml') || G.includes('ani')) && /^(G|PG|)$/.test(w.cert || '') && (G.includes('fml') || WT_KW.kids.test(txt) || /doghouse|dollhouse|powerpuff/i.test(txt));
  // genre → interest: the best match counts (not all of them multiplied), so one kids' cartoon can't win for everyone
  let g = 1, n = 0;
  for (const x of G) for (const t of WT_G2T[x] || []) { if (!topicOn(t) || t === 'kids' || t === 'parent') continue; const v = t === 'sitcoms' ? (!w.movie && !kidsy && !G.some(y => y === 'ani' || y === 'doc' || y === 'rly') ? 3.2 : 1.3) : 1.5; const v2 = 1 + (v - 1) * Math.min(1.6, W.topic(t)); if (v2 > g) g = v2; n++; }
  let s = g * (1 + 0.15 * Math.max(0, n - 1));
  let hits = 0; for (const k in WT_KW) if (k !== 'kids' && k !== 'sitcoms' && topicOn(k) && WT_KW[k].test(txt)) hits++; s *= 1 + 0.8 * Math.min(3, hits); // their own interests (Harry Potter, drag, pets, tarot, food…)
  if (kidsy) s *= sit.kids ? 2 : sit.grand ? 1.3 : 0.35; // family cartoons: for homes with young kids (or the grandkids' visit)
  if (G.some(x => x === 'crm' || x === 'hrr' || x === 'war') || WT_HEAVY.test(txt)) s *= 0.35; // upbeat: true crime, horror and war well down
  if (G.includes('trl')) s *= 0.7;
  if (sit.teens && /\b(teen\w*|high school|school|coming of age|young adult)\b/i.test(txt)) s *= 1.5;
  if (sit.young && (G.includes('rly') || G.includes('ani') || /\b(dating|love|friends|gaming|anime|music|road trip|adventure)\b/i.test(txt))) s *= 1.25;
  if (sit.older && (G.includes('doc') || /\b(farm|garden|cook\w*|travel|british|mystery)\b/i.test(txt))) s *= 1.15;
  if (/^(R16|16|R15|MA 15\+)$/.test(w.cert || '') && (sit.kids || sit.teens)) s *= 0.8;
  const d = (w.ev - now) / 864e5; s *= w.up ? (d <= 3 ? 1.4 : d <= 8 ? 1.2 : 1) : Math.max(0.35, 1 + d / 9); // coming soon > just out > a week old
  if (INT.mine.has(w.id)) s *= 0.2; // already starred: the reminder will do the rest
  if (VOTES[w.id] && VOTES[w.id].v < 0) return 0;
  return s;
}
function wtPool(now = Date.now()) { return ((FEED && FEED.watch) || []).filter(w => w.img && w.ev > now - 7 * 864e5 && !SPORT.test(w.t + ' ' + w.s) && !unsafe(w) && !SEEN_BASE.has(w.id)).map(w => ({ w, sc: wtScore(w, now) })).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc); }
let WT_FOR = null, WT = [];
function wtPick() { // two per load at most: the best match, and a second from the next few (a different platform if possible) for variety
  const P = wtPool(); if (!P.length) return [];
  const top = P.slice(0, 8), wsum = top.slice(0, 5).reduce((x, y) => x + y.sc * y.sc, 0); let r = Math.random() * wsum, ai = 0; while (ai < Math.min(4, top.length - 1) && (r -= top[ai].sc * top[ai].sc) > 0) ai++; // the best matches, weighted (a little variety between loads)
  if (ai) top.unshift(top.splice(ai, 1)[0]);
  const a = top[0].w, rest = top.slice(1).filter(x => x.w.t !== a.t), b = (rest.find(x => x.w.pk !== a.pk && x.sc > top[0].sc * 0.35) || rest[Math.floor(Math.random() * Math.min(3, rest.length))] || {}).w;
  return b ? [a, b] : [a];
}
const wtDay = ev => NZ(ev, { weekday: 'short', day: 'numeric', month: 'short' });
function wtWhen(w, now = Date.now()) { const dd = nzDayNum(w.ev) - nzDayNum(now); return w.up && dd > 0 ? (dd === 1 ? `On ${w.plat} tomorrow, ${wtDay(w.ev)}` : `On ${w.plat} ${wtDay(w.ev)}`) : dd === 0 ? `New on ${w.plat} today` : `New on ${w.plat} · since ${wtDay(w.ev)}`; }
function watchCard(i) {
  const w = i.w, dd = nzDayNum(w.ev) - nzDayNum(Date.now()), bar = intBar({ id: w.id, t: w.t + (w.label && !/^\d{4}$/.test(w.label) ? ' – ' + w.label : ''), ev: w.ev, url: w.url, img: w.poster || w.img, where: w.plat, topic: 'watch' }, w.ev);
  const badge = w.up && dd > 0 ? (dd === 1 ? 'Tomorrow' : `In ${dd} days`) : dd === 0 ? 'Out today' : 'Just added';
  return `<article class="card xc promo watch" data-id="${esc(w.id)}">${xHead('📺', 'Coming up to watch', w.plat + ' · picked for you', w.gl || (w.movie ? 'Movie' : 'Series'))}
    <a class="pimg" href="${esc(w.url)}" target="_blank" rel="noopener"><img src="${esc(w.img)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="plat p-${esc(w.pk)}">${esc(w.plat)}</span><span class="away${dd <= 1 ? ' soon' : ''}">${esc(badge)}</span></a>
    <div class="bd"><h3>${esc(w.t)}${w.label ? ` <small>${esc(w.label)}</small>` : ''}</h3><p class="pwhen">🗓️ ${esc(wtWhen(w))}</p>${w.s ? `<p class="wtb">${esc(w.s)}</p>` : ''}<p class="sst">${esc([w.movie ? 'Movie' : 'Series', w.gl, w.cert].filter(Boolean).join(' · '))}</p>
    <div class="xbtns"><a class="btn pri" href="${esc(w.url)}" target="_blank" rel="noopener">▶️ Watch on ${esc(w.plat)} ↗</a></div>${bar}${FAM_ON ? '' : ''}</div></article>`;
}
const wtFestive = window.festive;
window.festive = function (order, nPins) {
  order = wtFestive ? wtFestive(order, nPins) : order;
  if (!FEED || !FEED.watch || order.length < 4) return order;
  const wk = (FEED.updated || 0) + '|' + JSON.stringify(ls.get('nudge', null)) + '|' + INT.mine.size; if (WT_FOR !== wk) { WT_FOR = wk; WT = wtPick(); }
  const lo = Math.max(2, nPins), slots = [lo + 4 + Math.floor(Math.random() * 2), lo + 13 + Math.floor(Math.random() * 3)], out = order.slice();
  WT.forEach((w, k) => { const at = Math.min(slots[k], out.length); out.splice(at, 0, { id: w.id, x: 'watch', w, topic: 'watch', t: w.t }); });
  return out;
};
const cardWt = window.card;
window.card = function (i) { if (i && i.x === 'watch') return watchCard(i); return cardWt(i); };

/* ---- 1.9.31 🎤 Big Auckland concerts in the next month (everyone's feed). The data service reads Spark Arena, Eden Park and
   Auckland Stadiums every ~6 hours on its own (no Grok Bot usage). One concert a load, soonest and best-matched first; each is
   shown once (👀 rule), and ⭐ Interested sets the usual event reminder. ---- */
function cnScore(c, now = Date.now()) {
  const W = weights(), d = (c.ev - now) / 864e5; if (d < -0.5 || d > 32) return 0;
  if (VOTES[c.id] && VOTES[c.id].v < 0) return 0; if (INT.mine.has(c.id)) return 0;
  let s = 1 + Math.max(0, W.topic('music') || 0) * 0.6 + (W.topic('events') ? 0.3 : 0);
  s *= d <= 7 ? 1.6 : d <= 14 ? 1.3 : 1; if (c.venue === 'Eden Park' || /stadium|springs/i.test(c.venue)) s *= 1.25; // the very big ones
  return s;
}
function cnPick() {
  const P = ((FEED && FEED.concerts) || []).filter(c => c.img && !SPORT.test(c.t) && !unsafe(c) && !SEEN_BASE.has(c.id)).map(c => ({ c, sc: cnScore(c) })).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc);
  if (!P.length) return null; const top = P.slice(0, 4), sum = top.reduce((x, y) => x + y.sc, 0); let r = Math.random() * sum, k = 0; while (k < top.length - 1 && (r -= top[k].sc) > 0) k++;
  return top[k].c;
}
const cnDays = c => { const ds = c.days || [c.day]; const f = d => NZ(Date.parse(d + 'T00:00:00Z'), { weekday: 'short', day: 'numeric', month: 'short' }); return ds.length > 1 ? ds.slice(0, 3).map(f).join(' & ') + (ds.length > 3 ? ' +' + (ds.length - 3) : '') : f(ds[0]); };
function concertCard(i) {
  const c = i.c, dd = nzDayNum(c.ev) - nzDayNum(Date.now()), badge = dd <= 0 ? 'Tonight' : dd === 1 ? 'Tomorrow' : dd < 7 ? `In ${dd} days` : dd < 14 ? 'Next week' : `In ${Math.round(dd / 7)} weeks`;
  const bar = intBar({ id: c.id, t: c.t + ' – ' + c.venue, ev: c.ev, url: c.url, img: c.img, where: c.venue + ', Auckland', topic: 'events' }, c.ev);
  return `<article class="card xc promo concert" data-id="${esc(c.id)}">${xHead('🎤', 'Big concerts in Auckland', 'Coming up in the next month', 'Concert')}
    <a class="pimg" href="${esc(c.url)}" target="_blank" rel="noopener"><img src="${esc(c.img)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="away${dd <= 1 ? ' soon' : ''}">${esc(badge)}</span></a>
    <div class="bd"><h3>${esc(c.t)}</h3><p class="pwhen">🗓️ ${esc(cnDays(c))}</p><p class="sst">📍 ${esc(c.venue)}, Auckland</p>
    <div class="xbtns"><a class="btn pri" href="${esc(c.url)}" target="_blank" rel="noopener">🎟️ Details ↗</a></div>${bar}</div></article>`;
}
let CN_FOR = null, CN = null;
const cnFestive = window.festive;
window.festive = function (order, nPins) {
  order = cnFestive ? cnFestive(order, nPins) : order;
  if (!FEED || !FEED.concerts || order.length < 6) return order;
  const k = (FEED.updated || 0) + '|' + INT.mine.size; if (CN_FOR !== k) { CN_FOR = k; CN = cnPick(); }
  if (!CN) return order;
  const out = order.slice(), at = Math.min(Math.max(2, nPins) + 8 + Math.floor(Math.random() * 3), out.length);
  out.splice(at, 0, { id: CN.id, x: 'concert', c: CN, topic: 'events', t: CN.t }); return out;
};
const cardCn = window.card;
window.card = function (i) { if (i && i.x === 'concert') return concertCard(i); return cardCn(i); };

/* ---- 1.9.34 🏡 Home & time-saving tips (everyone's feed, rarely): organising, decluttering, cleaning shortcuts, laundry,
   meal prep and routines from Kiwi Families (NZ) first, then The Organised Housewife, OrganizedHome, Good Housekeeping,
   House Digest and Apartment Therapy (all free to read; the data service drops paywalls, shopping, money and house tours).
   At most one tip every other day per person, well down the feed, each shown once. Kid-mess / lunchbox / routine tips
   lead for homes with young kids and stay rare for everyone else. ---- */
const HT_KIDS = /\b(kids?|child\w*|toddlers?|school|lunch ?box\w*|chores?|toys?|baby|babies|nursery|playroom)\b/i;
function htLastDay() { let m = -1; for (const k in SEEN1) if (k.startsWith('ht-') && SEEN1[k] > m) m = SEEN1[k]; return m; }
function htScore(t) {
  const sit = wtSit(), kid = HT_KIDS.test(t.t + ' ' + (t.s || ''));
  let s = t.nz ? 1.5 : 1; s *= kid ? (sit.kids ? 2.2 : sit.grand || sit.teens ? 0.8 : 0.3) : 1;
  if (/\b(quick|fast|minutes?|easy|easier|simple|hacks?|tricks?|shortcuts?|time)\b/i.test(t.t)) s *= 1.3; // the time-savers
  return s * (0.7 + Math.random() * 0.6);
}
function htPick() {
  const today = seenDayN(), last = htLastDay(); if (last >= 0 && today - last < 2) return null; // every other day at most
  const P = ((FEED && FEED.hometips) || []).filter(t => t.img && !SEEN_BASE.has(t.id) && !unsafe(t) && !SPORT.test(t.t + ' ' + (t.s || '')) && !LIFE_MONEY.test(t.t + ' ' + (t.s || '')) && !/sponsor\w*|affiliate|nuffnang|giveaway/i.test(t.t + ' ' + (t.s || '')) && !(VOTES[t.id] && VOTES[t.id].v < 0));
  if (!P.length) return null; return P.map(t => ({ t, sc: htScore(t) })).sort((a, b) => b.sc - a.sc)[0].t;
}
function homeTipCard(i) {
  const t = i.h, host = (() => { try { return new URL(t.url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } })();
  return `<article class="card xc promo hometip" data-id="${esc(t.id)}">${xHead('🏡', 'Home & time-saving tip', t.sn || host, t.nz ? 'NZ tip' : 'Tip')}
    <a class="pimg" href="${esc(t.url)}" target="_blank" rel="noopener"><img src="${esc(t.img)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>
    <div class="bd"><h3>${esc(t.t)}</h3>${t.s ? `<p class="wtb">${esc(t.s)}</p>` : ''}
    <div class="xbtns"><a class="btn pri" href="${esc(t.url)}" target="_blank" rel="noopener">✨ Read the tip ↗</a></div></div></article>`;
}
let HT_FOR = null, HT = null;
const htFestive = window.festive;
window.festive = function (order, nPins) {
  order = htFestive ? htFestive(order, nPins) : order;
  if (!FEED || !FEED.hometips || order.length < 14) return order;
  const k = (FEED.updated || 0) + '|' + seenDayN(); if (HT_FOR !== k) { HT_FOR = k; HT = htPick(); }
  if (!HT || order.some(x => x.id === HT.id)) return order;
  const out = order.slice(), at = Math.min(Math.max(2, nPins) + 15 + Math.floor(Math.random() * 5), out.length);
  out.splice(at, 0, { id: HT.id, x: 'hometip', h: HT, topic: 'hometips', t: HT.t }); return out;
};
const cardHt = window.card;
window.card = function (i) { if (i && i.x === 'hometip') return homeTipCard(i); return cardHt(i); };

/* ---- 1.9.35 🎂 birthdays for everyone in Info Book. On Shane's phone, birthdays already in My App (name, day, month) are
   matched to members by name – exact first name, only when exactly one My App birthday and one member fit – and saved to
   the family (once each; nothing is changed for anyone who already has one). Anyone still without a birthday gets one
   friendly "When's your birthday? 🎂" ask (skip = asked again in 4 days, at most 3 times). Others only ever see the day and
   month; the age is just for the person and Shane. Stored in the family Durable Object (no KV). ---- */
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function bdRow(m, list) {
  const b = (list || []).find(d => d.kind === 'bday' && d.mid === m.id);
  return `<div class="bdrow" data-bdmid="${m.id}"><small class="sst">🎂</small><select data-bdd aria-label="Birthday day for ${esc(m.name)}"><option value="">Day</option>${Array.from({ length: 31 }, (_, k) => `<option${b && b.d === k + 1 ? ' selected' : ''}>${k + 1}</option>`).join('')}</select><select data-bdm aria-label="Birthday month for ${esc(m.name)}"><option value="">Month</option>${MON3.map((x, k) => `<option value="${k + 1}"${b && b.m === k + 1 ? ' selected' : ''}>${x}</option>`).join('')}</select>${b ? '' : '<small class="sst">not set – they’ll be asked</small>'}</div>`;
}
const bdFirst = n => String(n || '').trim().toLowerCase().split(/\s+/)[0].replace(/[^a-zāēīōū'-]/g, '');
let BD_IMP_RUN = false;
async function bdImport() {
  if (BD_IMP_RUN || !IS_ADMIN) return; BD_IMP_RUN = true;
  try {
    const S = await myAppData(); if (!S || !Array.isArray(S.birthdays)) return; // My App isn't on this phone
    const mem = await fam('/members'), done = ls.get('bdImported', {}), got = [];
    const have = new Set((X.dates || []).filter(d => d.kind === 'bday' && d.mid).map(d => d.mid));
    for (const m of mem) {
      if (have.has(m.id) || done[m.id]) continue;
      const nm = bdFirst(m.name); if (!nm || mem.filter(x => bdFirst(x.name) === nm).length !== 1) continue; // two members with that name: don't guess
      const hits = S.birthdays.filter(b => b && b.day && b.month && bdFirst(b.name) === nm); if (hits.length !== 1) continue; // none, or ambiguous
      const b = hits[0]; if (!(+b.month >= 1 && +b.month <= 12 && +b.day >= 1 && +b.day <= 31)) continue;
      try { await fam('/dates', { method: 'POST', body: JSON.stringify({ kind: 'bday', mid: m.id, m: +b.month, d: +b.day, y: +b.year || null }) }); done[m.id] = Date.now(); got.push(m.name + ' ' + b.day + ' ' + MON3[b.month - 1]); } catch (e) { }
    }
    ls.set('bdImported', done);
    if (!X.bdImp) { try { await fam('/dates/imported', { method: 'POST', body: '{}' }); } catch (e) { } }
    if (got.length) { toast('🎂 Birthdays from My App: ' + got.slice(0, 3).join(', ') + (got.length > 3 ? ' +' + (got.length - 3) : '')); xLoad(true); }
  } catch (e) { }
}
const BD_ROLL = Date.parse('2026-11-03T15:00:00+13:00'); // members are asked once Shane's phone has matched My App, or 2 days after this anyway
let BD_SHOWN = false, BD_WAIT = 0;
function bdAsk() {
  if (BD_SHOWN) return;
  if (!FAM_ON || !MEMBER || X.myBday !== null) return; // undefined = old server; an object = we have it
  if (!X.bdImp && Date.now() < BD_ROLL + 2 * 864e5 && !IS_ADMIN) return;
  const a = ls.get('bdAsk', { n: 0, at: 0 }); if (a.done || a.n >= 3 || (a.n && Date.now() - a.at < 4 * 864e5)) return;
  if ($('#sheet.on') || $('#celeb') || document.querySelector('.upbox')) { if (++BD_WAIT < 8) setTimeout(bdAsk, 8000); return; } // never on top of another pop-up
  $('#sheetin').innerHTML = `<h2>When’s your birthday? 🎂</h2><p>So the family can wish you a happy birthday! Everyone sees just the day and month – never your age.</p>
    <div class="bdf"><select id="bdd" aria-label="Day"><option value="">Day</option>${Array.from({ length: 31 }, (_, k) => `<option>${k + 1}</option>`).join('')}</select><select id="bdm" aria-label="Month"><option value="">Month</option>${MON3.map((m, k) => `<option value="${k + 1}">${m}</option>`).join('')}</select><input id="bdy" inputmode="numeric" maxlength="4" placeholder="Year (optional)"></div>
    <div class="xbtns"><button class="btn pri" id="bdasksave">🎉 Save</button><button class="btn" id="bdasklater">Not now</button></div><p class="sst">You can change it any time in 👤 My profile.</p>`;
  $('#sheet').classList.add('on'); BD_SHOWN = true;
}
document.addEventListener('click', async e => {
  const t = e.target; if (!t || !t.id) return;
  if (t.id === 'bdasklater') { const a = ls.get('bdAsk', { n: 0, at: 0 }); ls.set('bdAsk', { n: a.n + 1, at: Date.now() }); $('#sheet').classList.remove('on'); toast('No worries – maybe another day 🙂'); }
  if (t.id === 'bdasksave') { const d = +$('#bdd').value, m = +$('#bdm').value, y = +$('#bdy').value || null; if (!d || !m) { toast('Pick a day and month'); return; }
    if (y && (y < 1900 || y > new Date().getFullYear())) { toast('Check the year (or leave it blank)'); return; }
    t.disabled = true; try { await fam('/dates', { method: 'POST', body: JSON.stringify({ kind: 'bday', m, d, y }) }); ls.set('bdAsk', { done: 1 }); $('#sheet').classList.remove('on'); toast('🎂 Thanks! Saved'); xLoad(true); } catch (er) { t.disabled = false; toast(er.message); } }
});

/* ---- 1.9.37 🎂 Info Book → My App: on Shane's phone, family birthdays that aren't in My App's Birthdays yet are added there
   (first-name match = already there, never overwritten or duplicated; the year too if known). My App does the same on its
   own open/resume (2.29.14), so whichever opens first adds them. At most every 10 minutes; reads the family list once. ---- */
async function bdToMyApp() {
  if (!IS_ADMIN) return; const last = +localStorage.getItem('mf.bdToMyAppAt') || 0; if (Date.now() - last < 10 * 60e3) return;
  localStorage.setItem('mf.bdToMyAppAt', String(Date.now()));
  try {
    const j = await fam('/bdays'); const list = (j && j.list) || []; if (!list.length) return;
    const db = await new Promise(res => { try { const r = indexedDB.open('due-dates', 1); r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { } res(null); }; r.onerror = () => res(null); r.onsuccess = () => res(r.result); } catch (e) { res(null); } });
    if (!db) return; // My App isn't on this phone
    const added = await new Promise(res => {
      const tx = db.transaction('kv', 'readwrite'), st = tx.objectStore('kv'), q = st.get('data'); let out = [];
      q.onsuccess = () => { const D = q.result; if (!D || typeof D !== 'object') return;
        if (!Array.isArray(D.birthdays)) D.birthdays = [];
        const have = new Set(D.birthdays.map(b => bdFirst(b && b.name)).filter(Boolean));
        for (const x of list) { const k = bdFirst(x.name), mo = +x.m, d = +x.d, y = +x.y || ''; if (!k || have.has(k) || !(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) continue;
          D.birthdays.push({ id: 'bday-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: String(x.name).trim().slice(0, 60), day: d, month: mo, year: y && y >= 1900 && y <= new Date().getFullYear() ? y : '', notes: 'From Info Book' });
          have.add(k); out.push(String(x.name).trim() + ' ' + d + ' ' + MON3[mo - 1]); }
        if (out.length) { D.updatedAt = new Date().toISOString(); st.put(D, 'data'); } };
      tx.oncomplete = () => res(out); tx.onerror = tx.onabort = () => res([]);
    });
    db.close();
    if (added.length) toast('🎂 Added to My App: ' + added.slice(0, 3).join(', ') + (added.length > 3 ? ' +' + (added.length - 3) : ''));
  } catch (e) { }
}

/* ---- 1.9.39 🎥 Vlogs for everyone (Shane too): upbeat, family-friendly video blogs from YouTube channels' public feeds,
   NZ first (van life, caravan families, motorhome road trips), then dogs & pets, horses, gardening, crochet, DIY, travel,
   light comedy and fun science. Up to 2 a day per person, spaced well apart in the feed, each shown once, matched to the
   topics they follow (and kids / teens at home). They play in the card with the inline player (muted until tapped). ---- */
function vlScore(v) {
  const sit = wtSit(), tags = String(v.vt || '').split(','), mine = ls.get('vlTags', []);
  let s = v.nz ? 1.6 : 1, hit = 0;
  for (const t of tags) { if (mine.includes(t)) { hit += 2.5; continue; } if (t === 'cruise' || t === 'famvlog') continue; // 1.9.40 only for people who like them (Sarah)
 if (t === 'horses') { const ib = (ls.get('nudge', null) || {}).ib || {}; if (topicOn('pets') && !INT_OFF['Horses']) hit += ib['Horses'] > 1 ? 2 : 0.5; continue; }
    if (t === 'teen') { if (sit.teens) hit++; continue; } if (t === 'ya') { if (sit.single || sit.young) hit++; continue; }
    if ((t === 'kids' || t === 'parent') && !(sit.kids || sit.grand)) continue; if (topicOn(t)) hit++; }
  s *= 1 + 0.9 * Math.min(3, hit); if (!hit) s *= 0.35; // still possible for anyone, just much less likely
  return s * (0.6 + Math.random() * 0.8) * (v.at ? Math.max(0.5, 1 - (Date.now() - v.at) / (30 * 864e5)) : 0.8);
}
function vlToday() { const d = seenDayN(); let n = 0; for (const k in SEEN1) if (k.startsWith('vl-') && SEEN1[k] === d) n++; return n; }
function vlPick(n) {
  const P = ((FEED && FEED.vlogs) || []).filter(v => v.img && v.vid && !SEEN_BASE.has(v.id) && !unsafe(v) && !SPORT.test(v.t) && !LIFE_MONEY.test(v.t + ' ' + (v.s || '')) && !(VOTES[v.id] && VOTES[v.id].v < 0));
  const out = [], used = new Set();
  for (const x of P.map(v => ({ v, sc: vlScore(v) })).sort((a, b) => b.sc - a.sc)) { if (out.length >= n) break; if (used.has(x.v.src)) continue; used.add(x.v.src); out.push(x.v); } // two different channels
  return out;
}
function vlogCard(i) {
  const v = i.h, who = String(v.sn || '').replace(/\s*\(.*\)$/, '');
  return `<article class="card xc promo vlog" data-id="${esc(v.id)}">${xHead('🎥', 'Vlog', esc(v.sn || 'YouTube'), v.nz ? 'NZ vlog' : 'Vlog')}
    ${vidMedia(v.vid, v.img, v.t)}
    <div class="bd"><h3>${esc(v.t)}</h3><p class="wtb">${v.nz ? '🇳🇿 ' : ''}A video diary from ${esc(who)} – tap for sound 🔊</p>
    <div class="xbtns"><a class="btn" href="${esc(v.url)}" target="_blank" rel="noopener">▶️ Watch on YouTube ↗</a></div></div></article>`;
}
let VL_FOR = null, VL = [];
const vlFestive = window.festive;
window.festive = function (order, nPins) {
  order = vlFestive ? vlFestive(order, nPins) : order;
  if (!FEED || !FEED.vlogs || order.length < 10) return order;
  const k = (FEED.updated || 0) + '|' + seenDayN(); if (VL_FOR !== k) { VL_FOR = k; VL = vlPick(Math.max(0, 2 - vlToday())); }
  const out = order.slice(), base = Math.max(2, nPins);
  VL.forEach((v, n) => { if (out.some(x => x.id === v.id)) return; const at = Math.min(base + (n ? 22 : 6) + Math.floor(Math.random() * 4), out.length); out.splice(at, 0, { id: v.id, x: 'vlog', h: v, topic: 'vlogs', t: v.t }); });
  return out;
};
const cardVl = window.card;
window.card = function (i) { if (i && i.x === 'vlog') return vlogCard(i); return cardVl(i); };
