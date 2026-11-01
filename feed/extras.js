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
  const [daily, triv, mems, dates, cars, prof, push, streaks, reno, wx] = await Promise.all([g('/daily', null), g('/trivia', null), g('/memories', []), g('/dates', { list: [] }), g('/cars', { cars: [] }), g('/profile', null), g('/push/prefs', null), g('/streaks', { list: [] }), g('/reno', { reno: null }), g('/weather', { list: [] })]);
  Object.assign(X, { daily, triv, mems: Array.isArray(mems) ? mems : [], dates: (dates && dates.list) || [], cars: (cars && cars.cars) || [], prof, push, streaks: (streaks && streaks.list) || [], reno: (reno && reno.reno) || null, wx: (wx && wx.list) || [] });
  if (prof && prof.streak) stChip(prof.streak);
  if (IS_ADMIN) carSync();
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
  return `<article class="card xc wx ${esc(w.colour)}" data-id="${esc(i.id)}">${xHead(WXE[w.event] || '⚠️', (w.test ? 'TEST – ' : '') + w.head.replace(/\s*-\s*(Orange|Red)$/i, ''), 'MetService · ' + reg, lvl)}
    <div class="bd"><div class="wxlv">${w.colour === 'red' ? '🔴' : w.colour === 'orange' ? '🟠' : '🟡'} ${esc(lvl)}${w.test ? ' · <b>TEST ONLY – not a real warning</b>' : ''}</div><p class="wxa"><b>${esc(w.area)}</b></p><p class="wxt">🕑 ${esc(wxWhen(w))}</p>
    <p class="xwho">${esc(w.desc)}</p>${w.act ? `<p class="xwho">👉 ${esc(w.act)}</p>` : ''}<div class="xbtns"><a class="btn pri" href="${esc(w.web)}" target="_blank" rel="noopener">MetService warnings ↗</a>${w.link ? `<a class="btn" href="${esc(w.link)}" target="_blank" rel="noopener">Official alert</a>` : ''}</div></div></article>`;
}
function wxNzCard(i) {
  return `<article class="card xc wx nzsum" data-id="wx-nz">${xHead('⚠️', 'Severe weather elsewhere in NZ', 'MetService warnings now and coming up', 'Weather')}
    <div class="bd"><ul class="rnl">${i.list.slice(0, 6).map(w => `<li><span>${w.colour === 'red' ? '🔴' : '🟠'} ${WXE[w.event] || '⚠️'} <b>${esc(w.head.replace(/\s*-\s*(Orange|Red)$/i, ''))}</b> · ${esc(w.area.split(';')[0].slice(0, 70))}</span><em>${esc(wxWhen(w))}</em></li>`).join('')}</ul>
    <div class="xbtns"><a class="btn" href="https://www.metservice.com/warnings/home" target="_blank" rel="noopener">All MetService warnings ↗</a></div></div></article>`;
}
/* ---- 1.9.7 📲 install prompt for anyone using Info Book in a browser tab: one-tap install (Chrome/Android), Share → Add to Home Screen
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
  const W = (X.wx || []).filter(w => w.expires > Date.now()), wl = W.filter(w => w.wg), wn = []; // 1.9.7: only warnings and watches that cover Whangārei
  for (const w of wl) out.push({ id: 'wx:' + w.id, x: 'wx', w, topic: 'family', t: w.head }); // ⚠️ Whangārei warnings go right to the top
  if (FAM_ON) {
    for (const c of X.cars) if (c.car && c.mid === MEMBER.id) out.push({ id: 'car:' + c.plate, x: 'car', c: c.car, at: c.at, topic: 'family' });
    for (const d of X.dates) if (d.days <= 14 && !(VOTES['date' + d.id] && VOTES['date' + d.id].v < 0)) out.push({ id: 'date' + d.id + '-' + new Date().getFullYear(), x: 'date', d, topic: 'family', t: (d.kind === 'bday' ? '🎂 ' : '🎉 ') + d.title, sn: 'Family dates' });
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
  if (i && i.x === 'trivia') return triviaCard(i);
  if (i && i.x === 'sugg') return suggCard(i);
  const h = baseCard(i);
  return i && i._mem ? h.replace('<div class="hd">', `<div class="memb">🕰️ On this day · ${esc(i._mem)}</div><div class="hd">`) : h;
};
const xHead = (em, who, sub, tag) => `<div class="hd"><div class="av">${em}</div><div class="who"><b>${esc(who)}</b><small>${esc(sub)}</small></div><span class="tp">${esc(tag)}</span></div>`;

function dailyCard(i) {
  const q = i.q, photo = q.type === 'photo', ans = q.answered || [], me = ans.some(a => a.me);
  return `<article class="card xc daily" data-id="${esc(q.key)}">${xHead(photo ? '📸' : '💭', photo ? 'Today’s photo challenge' : 'Today’s family question', NZ(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' }), 'Daily')}
    <div class="bd"><h3 class="xq">${esc(q.text)}</h3>
    <p class="xwho">${ans.length ? '✅ ' + esc(ans.map(a => a.me ? 'You' : a.name).join(', ')) + (ans.length === 1 ? ' answered' : ' have answered') : 'Nobody’s answered yet – be the first!'}</p>
    <div class="xbtns">${photo ? `<button class="btn pri" data-dqphoto="${esc(q.key)}">📷 ${me ? 'Post another' : 'Post your photo'}</button>` : ''}<button class="btn${photo ? '' : ' pri'}" data-cmt="${esc(q.key)}">💬 ${photo ? 'Or say something' : me ? 'See answers' : 'Answer'}</button></div></div></article>`;
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
    <div class="bd"><h3 class="xq">${today ? (bd ? '🎉 ' : '🎊 ') : ''}${esc(d.title)}${d.turns ? ` <small>(${d.turns})</small>` : ''}</h3>
    <div class="pinbox"><div class="cd">${today ? (bd ? '🎂 Today!' : '🎊 Today!') : d.days === 1 ? 'Tomorrow!' : 'In ' + d.days + ' days'}</div></div>
    <div class="xbtns"><button class="btn${today ? ' pri' : ''}" data-cmt="${esc(i.id)}">💬 ${today ? (who ? 'See messages' : 'Send a message') : 'Say something'}</button></div></div></article>`;
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
  const bd = p.birthday;
  $('#sheetin').innerHTML = `<h2>${mine ? 'You' : esc(p.name)}</h2>
    <div class="streak"><span class="fl">🔥</span><div><b>${s.cur}-day streak</b><small>Best: ${s.best} · ${s.total} days opened${s.cur ? '' : ' · open Info Book tomorrow to start a new streak'}<br>${s.freezeLeft ? '🧊 Streak freeze ready this week (covers one missed day)' : '🧊 This week’s streak freeze is used'}${s.next ? ` · next milestone ${s.next} days` : ''}</small></div></div>
    <h3>Badges · ${got.length} of ${p.badges.length}</h3><div class="badges">${p.badges.map(b => `<div class="badge${b.got ? ' got' : ''}" title="${esc(b.d)}"><span>${b.e}</span><b>${esc(b.n)}</b><small>${esc(b.d)}</small></div>`).join('')}</div>
    ${mine ? `<h3>🎂 My birthday (optional)</h3><p class="sst">Shown to the family as a countdown card two weeks before, and a celebration card on the day. The year is optional (it shows the age they turn).</p>
    <div class="bdf"><select id="bdd" aria-label="Day">${['<option value="">Day</option>', ...Array.from({ length: 31 }, (_, k) => `<option${bd && bd.d === k + 1 ? ' selected' : ''}>${k + 1}</option>`)].join('')}</select><select id="bdm" aria-label="Month">${['<option value="">Month</option>', ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, k) => `<option value="${k + 1}"${bd && bd.m === k + 1 ? ' selected' : ''}>${m}</option>`)].join('')}</select><input id="bdy" inputmode="numeric" maxlength="4" placeholder="Year" value="${bd && bd.y ? bd.y : ''}" aria-label="Year (optional)"><button class="btn pri" id="bdsave">Save</button>${bd ? `<button class="btn" data-datedel="${bd.id}">Remove</button>` : ''}</div>
    ${pushBox()}` : ''}<button class="btn" data-close>Close</button>`;
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
  const T = [['reply', '↩️ Replies to me'], ['mine', '💬 Comments & likes on my posts'], ['photo', '📷 New family photos'], ['daily', '💭 Daily question & trivia (after 8am)'], ['event', '⭐ Reminders for events I’m interested in'], ['dates', '🎂 Birthdays, events & car dates'], ['streak', '🔥 Streak reminder (about 7pm, only if it’s about to break)'], ['weather', '🔴 Red weather warnings (any time, even at night)']];
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
/* ---- 1.9.7 🇳🇿 NZ-first and weather/season-aware ranking (a gentle nudge on top of interests, 👍/👎 and the time-of-day mood) ----
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
    if (PRAC_TOPICS.has(i.topic)) { // 1.9.7 interests: closer to home and practical. Stronger inside an interest chip than in All (sitcoms stay first)
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
window.popW = function (i) {
  let w = basePopW(i) * nzWeatherNudge(i);
  const n = ls.get('nudge', null);
  if (n && n.boost && n.boost[i.topic] && weights().topic(i.topic) >= 1) w *= Math.min(1.15, n.boost[i.topic]);
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
    const [mem, dates, cars, S] = await Promise.all([fam('/members'), fam('/dates'), fam('/cars'), myAppData()]);
    const people = mem.filter(m => m.role !== 'admin'), sugT = ['parent', 'rainbow', 'social', 'tarot', 'craft', 'vgames', 'music', 'travel', 'food', 'fitness'];
    const myCars = ((S && S.cars) || []).map(c => ({ plate: plateOf(c.plate), name: c.name })).filter(c => c.plate);
    for (const c of cars.cars) if (!myCars.some(x => x.plate === c.plate)) myCars.push({ plate: c.plate, name: '' });
    el.innerHTML = `<h3>👤 Age & life stage <small class="sst">only you see these</small></h3><p class="sst">Used only to suggest interests (they get a ✨ card and choose) and to nudge their feed a little. Never shown to anyone else.</p>
      ${mem.map(m => `<div class="prof" data-mid="${m.id}"><b>${esc(m.name)}</b><select data-pf="age">${STG.ages.map(a => `<option value="${esc(a)}"${(m.age || '') === a ? ' selected' : ''}>${a || 'Age –'}</option>`).join('')}</select><select data-pf="stage"><option value="">Life stage –</option>${Object.entries(STG.stages).map(([k, l]) => `<option value="${k}"${m.stage === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <div class="sgx">${sugT.map(t => `<button class="chip${(m.sugg || '').split(',').includes(t) ? ' on' : ''}" data-pfs="${t}">${TOPIC[t][2]} ${esc(TOPIC[t][1])}</button>`).join('')}</div></div>`).join('')}
      <h3>🎂 Family birthdays & events</h3>${dates.list.map(d => `<div class="row"><span>${d.kind === 'bday' ? '🎂' : '🎉'} ${esc(d.title)}<small class="sst">${d.d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.m - 1]} · ${inDays(d.days)}</small></span><button class="btn" data-datedel="${d.id}">Remove</button></div>`).join('') || '<p class="sst">None yet.</p>'}
      <div class="bdf"><select id="dk"><option value="bday">🎂 Birthday</option><option value="event">🎉 Event</option></select><input id="dt" maxlength="60" placeholder="e.g. Aranea"><input id="dd" type="date" aria-label="Date"><button class="btn pri" id="dadd">Add</button></div>
      <p class="sst">Birthdays repeat every year (the year is optional and only used for the age); events happen once. They show as countdowns two weeks ahead and a card on the day. Your own My App birthdays stay private unless you tap “➕ Add to family” on one.</p>
      <h3>🚗 Share a car’s due dates with…</h3><p class="sst">Only the plate, model, photo and the rego, WOF and service due dates go (never costs or notes). They see a private card nobody else can see or comment on, and a ping 2 weeks and 3 days before.</p>
      ${myCars.map(c => { const sh = cars.cars.find(x => x.plate === c.plate); return `<div class="row"><span>🚗 ${esc(c.plate)}<small class="sst">${esc(c.name || '')}${sh && sh.car ? ' · updated ' + esc(ago(sh.at || sh.car.updated)) + ' ago' + (sh.src === 'relay' ? ' (from My App’s data service)' : '') : ''}</small></span><select data-carp="${esc(c.plate)}"><option value="">Not shared</option>${people.map(p => `<option value="${p.id}"${sh && sh.mid === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>`; }).join('') || '<p class="sst">Open My App on this phone first.</p>'}`;
  } catch (e) { el.textContent = e.message; }
}
async function saveProf(row) {
  const mid = row.dataset.mid, age = row.querySelector('[data-pf="age"]').value, stage = row.querySelector('[data-pf="stage"]').value, sugg = [...row.querySelectorAll('[data-pfs].on')].map(b => b.dataset.pfs);
  try { await fam('/members/' + mid + '/profile', { method: 'PUT', body: JSON.stringify({ age, stage, sugg }) }); toast('Saved (private)'); } catch (e) { toast(e.message); }
}
// ➕ Add to family on Shane's own My App birthday cards (one tap, explicit; nothing is copied otherwise)
async function addBdayToFamily(id) {
  const x = LIFE_BY_ID.get(id); if (!x || !IS_ADMIN) return;
  const name = String(x.t || '').replace(/[’']s birthday.*$/i, '').replace(/^🎂\s*/, '').trim();
  const S = await myAppData(), b = S && (S.birthdays || []).find(b => b && b.name && b.name.trim().toLowerCase() === name.toLowerCase());
  const iso = b && (b.date || b.dob || b.birthday); const mm = /(\d{4})?-?(\d{2})-(\d{2})$/.exec(String(iso || ''));
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
  const pfs = t.closest('[data-pfs]'); if (pfs) { pfs.classList.toggle('on'); saveProf(pfs.closest('.prof')); return; }
  const af = t.closest('[data-addfam]'); if (af) { addBdayToFamily(af.dataset.addfam); return; }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.matches('[data-pf]')) { saveProf(t.closest('.prof')); return; }
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
if (FEED && tab === 'all') { try { draw(); } catch (e) { } } // 1.9.7 the first paint from cache can run before this file loads – redraw so the countdowns and extras appear

/* ---- 1.9.7 📍 'Event near you' promos (Whangārei area only), weekly 'This week in Whangārei for you', and ⭐ Interested on every event ---- */
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

/* ---- 1.9.7 🪄 Harry Potter with a Slytherin lean: Slytherin items rank higher, show-off posts lower, plus a daily 'Slytherin of the day' fact ---- */
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
