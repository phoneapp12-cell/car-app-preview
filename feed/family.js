/* My Feed 1.7.0 – Family: a private network for Shane and the people he invites (Sarah, Millesha, …).
   - Invite link: …/feed/?invite=<long random token>. The phone keeps the token; the same link works again on a new phone.
     Shane (admin) adds people, makes new links (the old one stops working) and removes people in ⚙️ → Family.
   - Everyone gets their own feed from the shared public sources, with the interests they pick. On anyone else's phone
     (or when this phone is someone else's), Shane's own My App data – For You, photos, About you – is never read.
   - Comments and reposts are only for members (the server checks the token) and live in the data service's private
     database, never in the public feed.json. Shane's own cards can only be shared by him tapping 🔁 on a board card
     (recipes, gardening, TV guide, space …) and confirming; personal reminders, money and photos can't be shared.
   Loaded before app.js; the functions here are used once app.js has set up. */
const FAM_API = 'https://shane-my-feed-data.phoneapp12.workers.dev/api';
let MEMBER = (() => { try { return JSON.parse(localStorage.getItem('mf.member') || 'null'); } catch (e) { return null; } })();
(() => { // ?invite=… : keep the token, take it out of the address bar, check it below (famInit)
  const q = new URLSearchParams(location.search), inv = q.get('invite');
  if (inv && /^[\w-]{30,80}$/.test(inv)) {
    if (!MEMBER || MEMBER.tok !== inv) { MEMBER = { tok: inv, pending: 1 }; localStorage.setItem('mf.member', JSON.stringify(MEMBER)); }
  }
  if (inv) { q.delete('invite'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }
})();
const FAM_ON = !!(MEMBER && MEMBER.id && !MEMBER.pending);
const IS_ADMIN = FAM_ON && MEMBER.role === 'admin';
// Shane's own My App things are only read when this phone is his: no family member set up (as before 1.7.0) or his admin link.
const PRIVATE_OK = !MEMBER || IS_ADMIN;
const LS_PREFIX = MEMBER && MEMBER.id && MEMBER.role !== 'admin' ? 'mf.m.' + MEMBER.id + '.' : 'mf.';
// Board cards from My App that Shane may share on purpose. Personal reminders (cars, birthdays, health, to-dos, holidays,
// deliveries, his garden, weather/power at home, photos, shopping, Kindle) are never shareable.
const SHARE_BOARDS = new Set(['gardening', 'space', 'astro', 'travel', 'science', 'aitech', 'diy', 'coding', 'walk', 'video', 'top40', 'recipe', 'quote', 'fact', 'joke', 'webcam', 'cinema', 'prime', 'tv', 'concert', 'news', 'radio', 'lang', 'blog', 'podcast']);
const DEFAULT_ON = ['kids']; // 1.7.1: on for everyone, and added once to anyone who picked before it existed
let PICK = null;          // topics this person picked at the start (members); null = everything (Shane)
let SHARES = [], COUNTS = {}, CSEEN = {}, FAM_PEOPLE = [];

async function fam(path, opt = {}) {
  const r = await fetch(FAM_API + path, { ...opt, headers: { Authorization: 'Bearer ' + MEMBER.tok, ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.err || 'HTTP ' + r.status); e.status = r.status; throw e; }
  return j;
}
const nzTime = ms => new Date(ms).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const pickOk = t => !PICK || ['all', 'liked', 'family'].includes(t) || PICK.includes(t);
const isPublicCard = i => i && i.id && !/:/.test(i.id) && !/^tip\d/.test(i.id) && i.topic !== 'life' && i.topic !== 'photos' && !String(i.topic).startsWith('you:') && !String(i.src || '').startsWith('you-');
const canShareLife = x => IS_ADMIN && x && SHARE_BOARDS.has(x.cat) && !LIFE_MONEY.test((x.t || '') + ' ' + (x.s || '') + ' ' + (x.sub || ''));

/* ---- start-up ---- */
async function famInit() {
  if (!MEMBER) { if (STANDALONE && !ls.get('noLink', false)) pasteLink(); return; }
  if (MEMBER.pending) {
    try { const me = await fam('/me'); localStorage.setItem('mf.member', JSON.stringify({ tok: MEMBER.tok, id: me.id, name: me.name, role: me.role })); location.reload(); }
    catch (e) { if (e.status === 401) { localStorage.removeItem('mf.member'); $('#feed').insertAdjacentHTML('afterbegin', '<div class="empty">This invite link doesn’t work any more. Ask Shane for a new one.</div>'); } }
    return;
  }
  PICK = MEMBER.role === 'admin' ? null : ls.get('pick', null); giveDefaults();
  CSEEN = ls.get('cseen', {});
  if (MEMBER.role !== 'admin' && !PICK) { // a new phone: their settings from the server, or the welcome screen
    try { const r = await fam('/prefs'); if (r.prefs && Array.isArray(r.prefs.pick)) { applyPrefs(r.prefs); } } catch (e) { }
    if (!PICK) { onboarding(); }
  }
  loadShares();
  fam('/people').then(p => { FAM_PEOPLE = p; }).catch(() => { });
}
function giveDefaults() { // a new default chip is switched on once for people who already chose their interests
  if (!PICK) return; const got = ls.get('defaultsGiven', []); let ch = false;
  for (const d of DEFAULT_ON) if (!got.includes(d)) { if (!PICK.includes(d)) PICK.push(d); got.push(d); ch = true; }
  if (ch) { ls.set('defaultsGiven', got); ls.set('pick', PICK); }
}
function applyPrefs(p) {
  PICK = p.pick; if (Array.isArray(p.given)) ls.set('defaultsGiven', p.given); giveDefaults(); ls.set('pick', PICK);
  if (p.intOff) { INT_OFF = p.intOff; ls.set('intOff', INT_OFF); }
  if (typeof p.moodOff === 'boolean') { MOOD_OFF = p.moodOff; ls.set('moodOff', MOOD_OFF); }
  draw();
}
let prefsT = 0;
function famPrefsChanged() { if (!FAM_ON) return; clearTimeout(prefsT); prefsT = setTimeout(() => fam('/prefs', { method: 'PUT', body: JSON.stringify({ pick: PICK, given: ls.get('defaultsGiven', []), intOff: INT_OFF, moodOff: MOOD_OFF }) }).catch(() => { }), 1500); }

/* ---- welcome: pick interests ---- */
function onboarding() {
  const list = TOPICS.filter(t => !['all', 'life', 'photos', 'liked', 'family'].includes(t[0]) && (t[0] !== 'election' || Date.now() < ELECTION_END));
  const sel = new Set(PICK || DEFAULT_ON);
  $('#sheetin').innerHTML = `<h2>Kia ora ${esc(MEMBER.name)} 👋</h2>
    <p>This is your own My Feed: photos, videos and stories from public sources, picked for you. Tap what you’re into (you can change it any time in ⚙️). Your 👍 and 👎 only change your own feed.</p>
    <p>💬 You can comment on posts and 🔁 share them with the family. Only people Shane has invited can see those.</p>
    <div class="obg">${list.map(t => `<button class="obt${sel.has(t[0]) ? ' on' : ''}" data-pick="${t[0]}" style="--c1:${t[3]};--c2:${t[4]}"><span>${t[2]}</span>${esc(t[1])}</button>`).join('')}</div>
    <p class="mute" style="font-size:.85rem">No sport, no bills or money stuff. Ever.</p>
    <button class="btn pri" id="obgo">Start my feed</button>${installBox()}`;
  $('#sheet').classList.add('on', 'ob');
}
function obGo() {
  const p = [...document.querySelectorAll('.obt.on')].map(b => b.dataset.pick);
  if (!p.length) { toast('Pick at least one'); return; }
  PICK = p; ls.set('defaultsGiven', DEFAULT_ON.slice()); ls.set('pick', PICK); famPrefsChanged();
  $('#sheet').classList.remove('on', 'ob'); tab = 'all'; ls.set('tab', tab); draw(); toast('Your feed is ready ✨');
}

/* ---- reposts ---- */
async function loadShares() {
  try { SHARES = await fam('/shares'); } catch (e) { return; }
  if (tab === 'family' || (tab === 'all' && scrollY < 200)) draw(); else chips();
  famCounts(SHARES.map(shareItem));
}
function shareItem(s) {
  const x = s.snap || {};
  return { id: s.card, t: x.t, s: x.s, url: x.url, img: x.img, vid: x.vid, sn: x.sn || 'Shared', topic: s.priv ? 'family' : (TOPIC[x.topic] ? x.topic : 'family'), src: x.src || 'family', kind: x.kind || (x.img ? 'photo' : 'news'), ev: x.ev || 0, at: s.at, _share: s };
}
function sharesFor(t) { // reposts shown to everyone, whatever they picked (newest first)
  const now = Date.now();
  return SHARES.filter(s => t === 'family' || now - s.at < 21 * 864e5).map(shareItem).filter(i => !(VOTES[i.id] && VOTES[i.id].v < 0) && !unsafe(i) && !unsafe({ t: i._share.caption }));
}
function weaveShares(order) { // one shared card near the top, then every 6–8 posts
  const sh = sharesFor('all'); if (!sh.length) return order;
  const ids = new Set(sh.map(i => i.id)), rest = order.filter(i => !ids.has(i.id)), out = [];
  let k = 0, gap = 1;
  for (const i of rest) { if (--gap <= 0 && k < sh.length) { out.push(sh[k++]); gap = 6 + Math.floor(Math.random() * 3); } out.push(i); }
  while (k < sh.length) out.push(sh[k++]);
  return out;
}
function drawFamily() {
  const m = $('#feed'), sh = sharesFor('family');
  order = sh; shown = 0;
  m.innerHTML = `<div class="load" style="padding-top:0">💬 Shared in the family · only people Shane invited can see this</div>` + (sh.length ? '' : '<div class="empty">Nothing shared yet. Tap 🔁 on any post to share it with the family.</div>');
  more();
  fam('/recent').then(r => { // cards people have talked about, that aren't reposts
    const have = new Set(sh.map(i => i.id)), talk = r.filter(x => !have.has(x.card) && x.snap && x.snap.t).slice(0, 20).map(x => ({ id: x.card, ...x.snap, kind: x.snap.img ? 'photo' : 'news', at: x.last, topic: TOPIC[x.snap.topic] ? x.snap.topic : 'family' }));
    if (!talk.length || tab !== 'family') return;
    m.insertAdjacentHTML('beforeend', `<h3 class="famh">Talked about lately</h3>` + talk.map(card).join(''));
    famCounts(talk); fillPics(); watchVids();
  }).catch(() => { });
}
async function shareCard(id, isLife) {
  if (!FAM_ON) return;
  let snap, priv = false;
  if (isLife) {
    const x = LIFE_BY_ID.get(id); if (!canShareLife(x)) { toast('That one stays private'); return; }
    if (!confirm('This will share it with your family. Share “' + x.t + '”?')) return;
    const img = x.img && /^https:/.test(x.img) && !x.live ? x.img : (PICS[x.id] && /^https:/.test(PICS[x.id]) ? PICS[x.id] : '');
    snap = { t: x.t, s: [x.sub, x.s].filter(Boolean).join(' · '), url: /^https:/.test(x.url || '') ? x.url : '', img, vid: x.vid || '', sn: (LIFE_CAT[x.cat] || [])[1] || 'My App', topic: 'family', kind: 'photo', cat: x.cat };
    priv = true;
  } else {
    const i = order.find(x => x.id === id) || (FEED.items || []).find(x => x.id === id); if (!isPublicCard(i)) { toast('That one stays private'); return; }
    snap = { t: i.t, s: i.s, url: i.url, img: i.img, vid: i.vid, sn: i.sn, topic: i.topic, src: i.src, kind: i.kind, ev: i.ev };
  }
  const caption = prompt('Add a short note for the family? (optional)', '');
  if (caption === null) return;
  try { const r = await fam('/shares', { method: 'POST', body: JSON.stringify({ orig: id, priv, snap, caption }) }); toast(r.dup ? 'Already shared' : '🔁 Shared with the family'); await loadShares(); }
  catch (e) { toast(e.message); }
}
async function unshare(sid) {
  if (!confirm('Stop sharing this with the family?')) return;
  try { await fam('/shares/' + sid, { method: 'DELETE' }); toast('Not shared any more'); SHARES = SHARES.filter(s => s.id !== +sid); draw(); } catch (e) { toast(e.message); }
}

/* ---- card extras: 💬 comments and 🔁 share ---- */
function famBar(i) {
  if (!FAM_ON || !isPublicCard(i)) return '';
  const c = COUNTS[i.id], n = c ? c[0] : 0, fresh = c && c[1] > (CSEEN[i.id] || 0);
  return `<button class="fb" data-cmt="${esc(i.id)}" aria-label="Comments">💬<span class="cc">${n || ''}</span>${fresh ? '<i class="dot"></i>' : ''}</button><button class="fb" data-share="${esc(i.id)}" aria-label="Share with the family">🔁</button>`;
}
function famLifeBar(x) { return canShareLife(x) ? `<button class="fb" data-share-life="${esc(x.id)}" aria-label="Share with the family">🔁</button>` : ''; }
function shareHead(i) {
  const s = i._share; if (!s) return '';
  const del = s.mine || IS_ADMIN ? `<button class="mini" data-unshare="${s.id}">Un-share</button>` : '';
  return `<div class="shby">🔁 Shared by <b>${esc(s.name)}</b> · ${esc(nzTime(s.at))}${del}${s.caption ? `<p>“${esc(s.caption)}”</p>` : ''}</div>`;
}
let cntT = 0, cntQ = new Set();
function famCounts(items) {
  if (!FAM_ON) return;
  for (const i of items) if (isPublicCard(i)) cntQ.add(i.id);
  clearTimeout(cntT); cntT = setTimeout(async () => {
    const ids = [...cntQ].slice(0, 80); cntQ = new Set([...cntQ].slice(80)); if (!ids.length) return;
    try { const r = await fam('/counts?ids=' + ids.map(encodeURIComponent).join(',')); Object.assign(COUNTS, r); for (const id of ids) refreshBar(id); } catch (e) { }
    if (cntQ.size) famCounts([]);
  }, 300);
}
function refreshBar(id) {
  document.querySelectorAll(`.card[data-id="${CSS.escape(id)}"] [data-cmt]`).forEach(b => { const c = COUNTS[id]; b.querySelector('.cc').textContent = c && c[0] ? c[0] : ''; const d = b.querySelector('.dot'); const fresh = c && c[1] > (CSEEN[id] || 0); if (fresh && !d) b.insertAdjacentHTML('beforeend', '<i class="dot"></i>'); if (!fresh && d) d.remove(); });
}
async function openThread(btn) {
  const c = btn.closest('.card'), id = btn.dataset.cmt; let box = c.querySelector('.cmts');
  if (box) { box.remove(); return; }
  c.insertAdjacentHTML('beforeend', `<div class="cmts"><div class="cl">Loading…</div><form class="cf"><textarea rows="1" maxlength="1000" placeholder="Write a comment…" aria-label="Write a comment"></textarea><button class="btn pri">Send</button></form></div>`);
  box = c.querySelector('.cmts'); await loadThread(box, id);
}
async function loadThread(box, id) {
  try {
    const list = await fam('/comments?card=' + encodeURIComponent(id));
    box.querySelector('.cl').innerHTML = list.length ? list.map(x => `<div class="cm"><b>${esc(x.name)}</b> <small>${esc(nzTime(x.at))}</small>${x.mine || IS_ADMIN ? `<button class="cx" data-delc="${x.id}" aria-label="Delete comment">✕</button>` : ''}<p>${esc(x.text)}</p></div>`).join('') : '<div class="cm0">No comments yet. Say something 👋</div>';
    COUNTS[id] = [list.length, list.length ? list[list.length - 1].at : 0]; CSEEN[id] = Date.now(); ls.set('cseen', CSEEN); refreshBar(id);
  } catch (e) { box.querySelector('.cl').textContent = e.message; }
}
async function sendComment(form) {
  const c = form.closest('.card'), id = c.dataset.id, ta = form.querySelector('textarea'), text = ta.value.trim(); if (!text) return;
  const i = order.find(x => x.id === id) || ((FEED && FEED.items) || []).find(x => x.id === id) || {};
  if (!isPublicCard({ ...i, id })) { toast('That one stays private'); return; }
  const sh = i._share ? i._share.snap : null, base = sh || i;
  const snap = { t: base.t, url: base.url, img: base.img, vid: base.vid, sn: base.sn || i.sn, topic: i.topic, src: i.src };
  form.querySelector('button').disabled = true;
  try { await fam('/comments', { method: 'POST', body: JSON.stringify({ card: id, text, snap }) }); ta.value = ''; await loadThread(form.closest('.cmts'), id); }
  catch (e) { toast(e.message); }
  form.querySelector('button').disabled = false;
}
async function delComment(b) { if (!confirm('Delete this comment?')) return; const box = b.closest('.cmts'), id = b.closest('.card').dataset.id; try { await fam('/comments/' + b.dataset.delc, { method: 'DELETE' }); await loadThread(box, id); } catch (e) { toast(e.message); } }

/* ---- 1.7.1 Install to the home screen ----
   Android / Chrome: the browser's own install prompt (beforeinstallprompt); the installed app shares this browser's
   storage, so the family link stays signed in. iPhone / iPad: Safari has no prompt, so we show "Share → Add to Home
   Screen". A Home Screen app on iPhone keeps its own storage, so for family members the page address and the app's
   start address carry their link while the steps are showing, and the installed app signs itself in on first open.
   If that ever fails, the installed app asks them to paste their link once. Hidden once installed. */
const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
let DEFER = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); DEFER = e; document.querySelectorAll('.inst').forEach(el => { el.outerHTML = installBox(); }); });
addEventListener('appinstalled', () => { DEFER = null; document.querySelectorAll('.inst').forEach(el => el.remove()); toast('📲 My Feed is on your home screen'); });
function prepIOS() { // carry the family link into the Home Screen app (its storage starts empty)
  if (!IOS || STANDALONE || !MEMBER || !MEMBER.tok || MEMBER.pending) return;
  const q = new URLSearchParams(location.search); q.set('invite', MEMBER.tok); history.replaceState(null, '', location.pathname + '?' + q + location.hash);
  const base = new URL('./', location.href).href, man = { name: 'My Feed', short_name: 'My Feed', id: './', start_url: base + '?invite=' + MEMBER.tok, scope: base, display: 'standalone', background_color: '#0b0d11', theme_color: '#7c3aed', icons: [192, 512].map(n => ({ src: base + 'icons/icon-' + n + '.png', sizes: n + 'x' + n, type: 'image/png' })) };
  const l = document.querySelector('link[rel=manifest]'); if (l) l.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(man));
}
const IOS_PIC = `<svg class="ipic" viewBox="0 0 240 120" aria-hidden="true"><rect x="8" y="8" width="224" height="104" rx="16" fill="#f1f5f9" stroke="#cbd5e1"/><rect x="20" y="78" width="200" height="24" rx="8" fill="#e2e8f0"/><g transform="translate(108 80)" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v12M7 7l5-5 5 5"/><path d="M5 10v9h14v-9"/></g><text x="120" y="40" text-anchor="middle" font-size="13" fill="#334155" font-family="system-ui">1. Tap Share ⬆︎ below</text><text x="120" y="60" text-anchor="middle" font-size="13" fill="#334155" font-family="system-ui">2. Add to Home Screen ＋</text></svg>`;
function installBox() {
  if (STANDALONE) return '';
  if (DEFER) return `<div class="inst"><b>📲 Put My Feed on your home screen</b><p>It opens like an app, full screen.</p><button class="btn pri" data-install>Install My Feed</button></div>`;
  if (IOS) { setTimeout(prepIOS, 0); return `<div class="inst"><b>📲 Put My Feed on your home screen</b><p>In Safari: tap the <b>Share</b> button ⬆︎ at the bottom, then <b>Add to Home Screen</b>, then <b>Add</b>.</p>${IOS_PIC}${MEMBER && MEMBER.tok ? '<p class="mute" style="font-size:.8rem">Your family link goes with it, so the app opens your feed.</p>' : ''}</div>`; }
  return `<div class="inst"><b>📲 Put My Feed on your home screen</b><p>Open your browser’s menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>.</p></div>`;
}
function pasteLink() { // an installed app with no family link yet (an iPhone Home Screen app starts with empty storage)
  $('#sheetin').innerHTML = `<h2>Open your family link</h2><p>If Shane sent you a My Feed link, paste it here once and this app will open your feed.</p>
    <input id="plink" class="plink" placeholder="https://shane-my-app.pages.dev/feed/?invite=…" aria-label="Your link"><button class="btn pri" id="plgo">Open my feed</button>
    <button class="btn" id="plskip">I don’t have a link</button>`;
  $('#sheet').classList.add('on', 'ob');
}

/* ---- ⚙️ Family ---- */
function famSettings() {
  const inst = installBox();
  if (!FAM_ON) return inst;
  if (!IS_ADMIN) return `<h2 style="margin-top:4px">👪 Family</h2><p>You’re in Shane’s private family network as <b>${esc(MEMBER.name)}</b>. Comments and shares are only seen by the family.</p>
    <button class="btn" id="obre">Change what I’m into</button><button class="btn" id="famleave">Leave on this phone</button>` + inst;
  return `<h2 style="margin-top:4px">👪 Family</h2><p>Invite people to their own My Feed. Each gets a private link: it opens their own feed (their own interests, nothing of yours) and lets them comment and share with the family. Making a new link stops the old one.</p>
    <div id="famlist" class="famlist">Loading…</div>
    <div class="famadd"><input id="famname" maxlength="40" placeholder="Name, e.g. Aranea" aria-label="Name"><button class="btn pri" id="famaddb">Add & make link</button></div>
    <div id="famlink"></div>` + inst;
}
async function famList() {
  const el = $('#famlist'); if (!el) return;
  try {
    const list = await fam('/members');
    el.innerHTML = list.map(x => `<div class="row"><span>${x.role === 'admin' ? '⭐' : '👤'} ${esc(x.name)}<small class="sst">${x.role === 'admin' ? 'you · admin' : x.seen ? 'last here ' + esc(ago(x.seen)) + ' ago' : 'hasn’t opened it yet'}</small></span><span>${x.role === 'admin' ? '' : `<button class="mini" data-famtok="${x.id}" data-n="${esc(x.name)}">New link</button> <button class="mini" data-famdel="${x.id}" data-n="${esc(x.name)}">Remove</button>`}</span></div>`).join('');
  } catch (e) { el.textContent = e.message; }
}
function showLink(name, token) {
  const link = location.origin + location.pathname.replace(/[^/]*$/, '') + '?invite=' + token;
  $('#famlink').innerHTML = `<div class="famlnk"><b>${esc(name)}’s private link</b><p>Send it to ${esc(name)} yourself. Anyone with it can open ${esc(name)}’s feed, so keep it private.</p><input readonly value="${esc(link)}" aria-label="Invite link"><button class="btn pri" data-copy="${esc(link)}">Copy link</button></div>`;
}
document.addEventListener('click', async e => {
  const t = e.target;
  if (t.id === 'sheet' && t.classList.contains('ob')) { e.stopPropagation(); return; } // the welcome screen stays until they pick
  const pk = t.closest('[data-pick]'); if (pk) { pk.classList.toggle('on'); return; }
  if (t.id === 'obgo') { obGo(); return; }
  if (t.closest('[data-install]')) { if (DEFER) { DEFER.prompt(); const r = await DEFER.userChoice.catch(() => ({})); if (r.outcome === 'accepted') { DEFER = null; document.querySelectorAll('.inst').forEach(el => el.remove()); } } return; }
  if (t.id === 'plgo') { const m = ($('#plink').value || '').match(/invite=([\w-]{30,80})/) || ($('#plink').value || '').trim().match(/^([\w-]{30,80})$/); if (!m) { toast('That doesn’t look like a My Feed link'); return; } localStorage.setItem('mf.member', JSON.stringify({ tok: m[1], pending: 1 })); location.reload(); return; }
  if (t.id === 'plskip') { ls.set('noLink', true); $('#sheet').classList.remove('on', 'ob'); return; }
  if (t.id === 'obre') { onboarding(); return; }
  if (t.id === 'famleave') { if (confirm('Take your feed off this phone? Your link will still work to come back.')) { localStorage.removeItem('mf.member'); location.reload(); } return; }
  const cb = t.closest('[data-cmt]'); if (cb) { openThread(cb); return; }
  const sb = t.closest('[data-share]'); if (sb) { shareCard(sb.dataset.share, false); return; }
  const sl = t.closest('[data-share-life]'); if (sl) { shareCard(sl.dataset.shareLife, true); return; }
  const us = t.closest('[data-unshare]'); if (us) { unshare(us.dataset.unshare); return; }
  const dc = t.closest('[data-delc]'); if (dc) { delComment(dc); return; }
  if (t.id === 'famaddb') { const n = $('#famname').value.trim(); if (!n) return; try { const r = await fam('/members', { method: 'POST', body: JSON.stringify({ name: n }) }); $('#famname').value = ''; showLink(r.name, r.token); famList(); } catch (er) { toast(er.message); } return; }
  const tk = t.closest('[data-famtok]'); if (tk) { if (!confirm('Make a new link for ' + tk.dataset.n + '? Their old link stops working.')) return; try { const r = await fam('/members/' + tk.dataset.famtok + '/token', { method: 'POST' }); showLink(tk.dataset.n, r.token); } catch (er) { toast(er.message); } return; }
  const fd = t.closest('[data-famdel]'); if (fd) { if (!confirm('Remove ' + fd.dataset.n + ' from the family? Their link stops working.')) return; try { await fam('/members/' + fd.dataset.famdel, { method: 'DELETE' }); famList(); toast('Removed'); } catch (er) { toast(er.message); } return; }
  const cp = t.closest('[data-copy]'); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); toast('Link copied'); } catch (er) { cp.previousElementSibling.select(); } return; }
}, true);
document.addEventListener('submit', e => { if (e.target.matches('.cf')) { e.preventDefault(); sendComment(e.target); } });
