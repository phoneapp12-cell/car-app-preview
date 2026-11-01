/* Info Book 1.9.0 – keep-coming-back features for the family network (members only; nothing here runs without a family link):
   🔔 push notifications, 💭 daily question / 📸 photo challenge, 🧠 daily trivia, 🕰️ On this day, 🔥 streaks & badges,
   🎂 birthdays & family events, 🚗 car due dates Shane shares with one person, and the gentle per-person suggestions Shane
   sets (life stage). Loaded after app.js; it adds cards through pins(), card() and popW(). */
'use strict';
const X = { daily: null, triv: null, mems: [], dates: [], cars: [], prof: null, push: null, streaks: [], st: null, reno: null, got: 0 };
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
  const [daily, triv, mems, dates, cars, prof, push, streaks, reno] = await Promise.all([g('/daily', null), g('/trivia', null), g('/memories', []), g('/dates', { list: [] }), g('/cars', { cars: [] }), g('/profile', null), g('/push/prefs', null), g('/streaks', { list: [] }), g('/reno', { reno: null })]);
  Object.assign(X, { daily, triv, mems: Array.isArray(mems) ? mems : [], dates: (dates && dates.list) || [], cars: (cars && cars.cars) || [], prof, push, streaks: (streaks && streaks.list) || [], reno: (reno && reno.reno) || null });
  if (prof && prof.streak) stChip(prof.streak);
  if (IS_ADMIN) carSync();
  if (tab === 'all' && scrollY < 300) draw(); else if (tab === 'family') draw();
}
async function xVisit() { // 1.9.1 just opening Info Book counts for the day's streak (NZ time)
  if (!FAM_ON) return; const k = nzKey(); if (ls.get('visitDay', '') === k && X.st) return;
  try { const r = await fam('/visit', { method: 'POST' }); ls.set('visitDay', k); X.st = r; stChip(r); celebrate(r); } catch (e) { }
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
  if (FAM_ON) {
    for (const c of X.cars) if (c.car && c.mid === MEMBER.id) out.push({ id: 'car:' + c.plate, x: 'car', c: c.car, at: c.at, topic: 'family' });
    for (const d of X.dates) if (d.days <= 14 && !(VOTES['date' + d.id] && VOTES['date' + d.id].v < 0)) out.push({ id: 'date' + d.id + '-' + new Date().getFullYear(), x: 'date', d, topic: 'family', t: (d.kind === 'bday' ? '🎂 ' : '🎉 ') + d.title, sn: 'Family dates' });
    if (X.daily) out.push({ id: X.daily.key, x: 'daily', q: X.daily, topic: 'family', t: (X.daily.type === 'photo' ? '📸 ' : '💭 ') + X.daily.text, sn: 'Daily question' });
    if (X.triv && X.triv.qs) out.push({ id: 'trivia' + X.triv.day, x: 'trivia', q: X.triv, topic: 'family' });
    const sg = suggestion(); if (sg) out.push(sg);
  }
  const rn = renoItem(); return out.concat(basePins(), rn ? [rn] : []); // 🏠 reno sits just under the fireworks card
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
window.card = function (i) {
  if (i && i.x === 'car') return carCard(i);
  if (i && i.x === 'date') return dateCard(i);
  if (i && i.x === 'daily') return dailyCard(i);
  if (i && i.x === 'streaks') return streakCard();
  if (i && i.x === 'reno') return renoCard(i);
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
  const T = [['reply', '↩️ Replies to me'], ['mine', '💬 Comments & likes on my posts'], ['photo', '📷 New family photos'], ['daily', '💭 Daily question & trivia (after 8am)'], ['dates', '🎂 Birthdays, events & car dates'], ['streak', '🔥 Streak reminder (about 7pm, only if it’s about to break)']];
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
window.popW = function (i) {
  let w = basePopW(i);
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
