/* Info Book 1.7.0 – Family: a private network for Shane and the people he invites (Sarah, Millesha, …).
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
  const r = await fetch(FAM_API + path, { ...opt, headers: { Authorization: 'Bearer ' + MEMBER.tok, 'X-App-Version': APP_VERSION, ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } });
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
    try { const r = await fam('/prefs'); if (r.prefs && Array.isArray(r.prefs.adds)) ls.set('addsPre', r.prefs.adds.filter(t => TOPIC[t])); if (r.nudge && Array.isArray(r.nudge.topics)) { ls.set('nudge', r.nudge); ls.set('addsPre', [...new Set([...ls.get('addsPre', []), ...r.nudge.topics.filter(t => TOPIC[t])])]); } if (r.prefs && Array.isArray(r.prefs.pick)) { applyPrefs(r.prefs); } } catch (e) { } // 1.8.5 addsPre: interests Shane switched on for them, ticked on the welcome screen
    if (!PICK) { onboarding(); }
  }
  if (PICK || MEMBER.role === 'admin') fam('/prefs').then(r => { ls.set('nudge', r.nudge || null); }).catch(() => { }); // 1.9.0 suggestions from Shane (life stage)
  if (MEMBER.role !== 'admin' && PICK) fam('/prefs').then(r => { // 1.8.5 interests Shane switched on for them (e.g. 🔮 Tarot for Monique), once each
    const adds = (r.prefs && r.prefs.adds) || [], got = ls.get('addsGot', []); let ch = false;
    for (const t of adds) if (!got.includes(t)) { got.push(t); if (TOPIC[t] && !PICK.includes(t)) { PICK.push(t); ch = true; } }
    ls.set('addsGot', got); if (ch) { ls.set('pick', PICK); famPrefsChanged(); draw(); }
  }).catch(() => { });
  loadShares(); loadPop();
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
function famPrefsChanged() { if (!FAM_ON) return; clearTimeout(prefsT); prefsT = setTimeout(() => fam('/prefs', { method: 'PUT', body: JSON.stringify({ pick: PICK, given: ls.get('defaultsGiven', []), adds: ls.get('addsGot', []), intOff: INT_OFF, moodOff: MOOD_OFF }) }).catch(() => { }), 1500); }

/* ---- welcome: pick interests ---- */
function onboarding() {
  const list = TOPICS.filter(t => !['all', 'life', 'photos', 'liked', 'family'].includes(t[0]) && (t[0] !== 'election' || Date.now() < ELECTION_END));
  const sel = new Set(PICK || [...DEFAULT_ON, ...ls.get('addsPre', [])]);
  $('#sheetin').innerHTML = `<h2>Kia ora ${esc(MEMBER.name)} 👋</h2>
    <p>This is your own Info Book: photos, videos and stories from public sources, picked for you. Tap what you’re into (you can change it any time in ⚙️). Your 👍 and 👎 only change your own feed.</p>
    <p>💬 You can comment on posts and 🔁 share them with the family. Only people Shane has invited can see those.</p>
    <div class="obg">${list.map(t => `<button class="obt${sel.has(t[0]) ? ' on' : ''}" data-pick="${t[0]}" style="--c1:${t[3]};--c2:${t[4]}"><span>${t[2]}</span>${esc(t[1])}</button>`).join('')}</div>
    <p class="mute" style="font-size:.85rem">No sport, no bills or money stuff. Ever.</p>
    <button class="btn pri" id="obgo">Start my feed</button>${installBox()}`;
  $('#sheet').classList.add('on', 'ob');
}
function obGo() {
  const p = [...document.querySelectorAll('.obt.on')].map(b => b.dataset.pick);
  if (!p.length) { toast('Pick at least one'); return; }
  PICK = p; ls.set('defaultsGiven', DEFAULT_ON.slice()); ls.set('addsGot', [...new Set([...ls.get('addsGot', []), ...ls.get('addsPre', [])])]); ls.set('pick', PICK); famPrefsChanged();
  $('#sheet').classList.remove('on', 'ob'); tab = 'all'; ls.set('tab', tab); draw(); toast('Your feed is ready ✨');
}

/* ---- reposts ---- */
let sharesAt = 0;
async function loadShares() {
  try { SHARES = await fam('/shares'); sharesAt = Date.now(); } catch (e) { return; }
  migrateVotes();
  if (tab === 'family' || (tab === 'all' && scrollY < 200)) draw(); else chips();
  famCounts(SHARES.map(shareItem));
}
function shareItem(s) {
  const x = s.snap || {};
  if (s.up) return { id: s.card, t: x.t || '', s: '', photos: (x.photos || []).slice(0, 4), sn: s.name, topic: 'family', src: 'family', kind: 'upload', at: s.at, _share: s };
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
  setTimeout(() => { if (tab === 'family') { ls.set('likeSeen', Date.now()); document.querySelectorAll('.chip[data-tab="family"] .dot').forEach(d => d.remove()); } }, 2500);
  order = sh; shown = 0;
  m.innerHTML = `<div class="upbs"><button class="btn pri upb" data-upload>📷 Share a photo</button><button class="btn pri upb" data-sharelink>🔗 Share a link</button></div><div class="load" style="padding-top:0">💬 Shared in the family · only people Shane invited can see this</div>` + (sh.length ? '' : '<div class="empty">Nothing shared yet. Share a photo, or tap 🔁 on any post to share it with the family.</div>');
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
async function unshare(sid, up) {
  if (!confirm(up ? 'Delete this photo post for everyone?' : 'Stop sharing this with the family?')) return;
  try { await fam('/shares/' + sid, { method: 'DELETE' }); toast('Not shared any more'); SHARES = SHARES.filter(s => s.id !== +sid); draw(); } catch (e) { toast(e.message); }
}

/* ---- card extras: 💬 comments and 🔁 share ---- */
function famBar(i) {
  if (!FAM_ON || !isPublicCard(i)) return '';
  const r = rxOf(i), lk = r ? likeBtn(r) : '';
  const c = COUNTS[i.id], n = c ? c[0] : 0, fresh = c && c[1] > (CSEEN[i.id] || 0);
  return lk + `<button class="fb" data-cmt="${esc(i.id)}" aria-label="Comments">💬<span class="cc">${n || ''}</span>${fresh ? '<i class="dot"></i>' : ''}</button>${i.kind === 'upload' || (i._share && i._share.link) ? '' : `<button class="fb" data-share="${esc(i.id)}" aria-label="Share with the family">🔁</button>`}`;
}
function famLifeBar(x) { return canShareLife(x) ? `<button class="fb" data-share-life="${esc(x.id)}" aria-label="Share with the family">🔁</button>` : ''; }
function shareHead(i) {
  const s = i._share; if (!s) return '';
  if (s.up) return `<div class="shby">📷 Photo from <b>${esc(s.name)}</b> · ${esc(nzTime(s.at))}${s.mine || IS_ADMIN ? `<button class="mini" data-unshare="${s.id}" data-up="1">Delete</button>` : ''}</div>`;
  const del = s.mine || IS_ADMIN ? `<button class="mini" data-unshare="${s.id}">Un-share</button>` : '';
  if (s.link) return `<div class="shby">🔗 Shared by <b>${esc(s.mine ? 'You' : s.name)}</b> · ${esc(nzTime(s.at))}${del}${Array.isArray(s.to) && s.to.length ? `<small class="shto">🔒 Just for ${esc(s.to.join(', '))}${s.mine ? '' : ' (and ' + esc(s.name) + ')'}</small>` : ''}${s.caption ? `<p>“${esc(s.caption)}”</p>` : ''}</div>`; // 1.9.16
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
function refreshBar(id) { // 1.9.10: null-safe – the daily-question and date buttons had no count span
  document.querySelectorAll(`.card[data-id="${CSS.escape(id)}"] [data-cmt]`).forEach(b => { const c = COUNTS[id]; let cc = b.querySelector('.cc'); if (!cc) { b.insertAdjacentHTML('beforeend', '<span class="cc"></span>'); cc = b.querySelector('.cc'); } if (cc) cc.textContent = c && c[0] ? c[0] : ''; const d = b.querySelector('.dot'); const fresh = c && c[1] > (CSEEN[id] || 0); if (fresh && !d) b.insertAdjacentHTML('beforeend', '<i class="dot"></i>'); if (!fresh && d) d.remove(); });
}
async function openThread(btn) {
  const c = btn.closest('.card'), id = btn.dataset.cmt; let box = c.querySelector('.cmts');
  if (box) { box.remove(); return; }
  c.insertAdjacentHTML('beforeend', `<div class="cmts"><div class="cl">Loading…</div><form class="cf"><textarea rows="1" maxlength="1000" placeholder="Write a comment…" aria-label="Write a comment"></textarea><button class="btn pri">Send</button></form></div>`);
  box = c.querySelector('.cmts'); await loadThread(box, id);
}
/* 1.9.14 ❤️ on comments: tap the heart to like/unlike, tap the names (or hold the heart) to see everyone who liked it */
const CLIKES = {};
function cmLikeBar(x) {
  const L = Array.isArray(x.likes) ? x.likes : []; CLIKES[x.id] = L; const on = L.some(isMe);
  return `<div class="cmlk" data-cmlk="${x.id}"><button class="cml${on ? ' on' : ''}" data-clike="${x.id}" aria-pressed="${on}" aria-label="${on ? 'Unlike this comment' : 'Like this comment'}">${on ? '❤️' : '🤍'}${L.length ? `<span class="cmlc">${L.length}</span>` : ''}</button>${L.length ? `<button class="cmln" data-clikers="${x.id}">${esc(L.map(likeName).slice(0, 3).join(', '))}${L.length > 3 ? ' +' + (L.length - 3) : ''}</button>` : ''}</div>`;
}
async function toggleCLike(cid) {
  const bar = document.querySelector(`[data-cmlk="${cid}"]`), L = CLIKES[cid] || [], on = !L.some(isMe);
  try { const r = await fam('/comments/' + cid + '/like', { method: 'POST', body: JSON.stringify({ on }) }); const nb = document.querySelector(`[data-cmlk="${cid}"]`); if (nb && r && Array.isArray(r.likes)) nb.outerHTML = cmLikeBar({ id: cid, likes: r.likes }); if (on) { try { navigator.vibrate && navigator.vibrate(12); } catch (e) { } } } catch (e) { toast(e.message); }
}
function showCLikers(cid) {
  const L = CLIKES[cid] || []; if (!L.length) return;
  document.querySelector('#upbox')?.remove();
  const box = document.createElement('div'); box.id = 'upbox'; box.className = 'upbox';
  box.innerHTML = `<div class="upin"><h2>Who liked this comment</h2><div class="lkl"><h3>❤️ ${L.length}</h3>${L.map(l => `<div class="row"><span>❤️ ${esc(likeName(l))}</span><small class="sst">${esc(nzTime(l.at))}</small></div>`).join('')}</div><div class="uprow"><button class="btn" id="upx">Close</button></div></div>`;
  document.body.append(box);
}
let CLK_HOLD = null, CLK_HELD = false;
document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('[data-clike]'); if (!b) return; CLK_HELD = false; clearTimeout(CLK_HOLD); CLK_HOLD = setTimeout(() => { CLK_HELD = true; showCLikers(b.dataset.clike); }, 550); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => document.addEventListener(ev, () => clearTimeout(CLK_HOLD), true));
document.addEventListener('click', e => {
  const t = e.target; if (!t || !t.closest) return;
  const b = t.closest('[data-clike]'); if (b) { e.preventDefault(); e.stopPropagation(); if (CLK_HELD) { CLK_HELD = false; return; } toggleCLike(+b.dataset.clike); return; }
  const n = t.closest('[data-clikers]'); if (n) { e.preventDefault(); e.stopPropagation(); showCLikers(+n.dataset.clikers); }
}, true);
async function loadThread(box, id) {
  try {
    const list = await fam('/comments?card=' + encodeURIComponent(id));
    box.querySelector('.cl').innerHTML = list.length ? list.map(x => `<div class="cm${x.bot ? ' bot' : ''}"><b>${esc(x.name)}</b>${x.pron && { she: 1, he: 1, they: 1 }[x.pron] ? ` <small class="prn">(${{ she: 'she/her', he: 'he/him', they: 'they/them' }[x.pron]})</small>` : ''}${x.bot ? '<span class="aib" title="Replies written by AI">AI</span>' : ''} <small>${esc(nzTime(x.at))}</small>${x.mine || IS_ADMIN ? `<button class="cx" data-delc="${x.id}" aria-label="Delete comment">✕</button>` : ''}<p>${esc(x.text)}</p>${cmLikeBar(x)}</div>`).join('') : '<div class="cm0">No comments yet. Say something 👋</div>';
    COUNTS[id] = [list.length, list.length ? list[list.length - 1].at : 0]; CSEEN[id] = Date.now(); ls.set('cseen', CSEEN); refreshBar(id);
  } catch (e) { const cl = box && box.querySelector('.cl'); if (cl) cl.textContent = 'Couldn’t load comments – tap 💬 to try again.'; console.warn('comments', e); }
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
addEventListener('appinstalled', () => { DEFER = null; document.querySelectorAll('.inst').forEach(el => el.remove()); toast('📲 Info Book is on your home screen'); });
function prepIOS() { // carry the family link into the Home Screen app (its storage starts empty)
  if (!IOS || STANDALONE || !MEMBER || !MEMBER.tok || MEMBER.pending) return;
  const q = new URLSearchParams(location.search); q.set('invite', MEMBER.tok); history.replaceState(null, '', location.pathname + '?' + q + location.hash);
  const base = new URL('./', location.href).href, man = { name: 'Info Book', short_name: 'Info Book', id: './', start_url: base + '?invite=' + MEMBER.tok, scope: base, display: 'standalone', background_color: '#0b0d11', theme_color: '#7c3aed', icons: [192, 512].map(n => ({ src: base + 'icons/icon-' + n + '.png', sizes: n + 'x' + n, type: 'image/png' })) };
  const l = document.querySelector('link[rel=manifest]'); if (l) l.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(man));
}
const IOS_PIC = `<svg class="ipic" viewBox="0 0 240 120" aria-hidden="true"><rect x="8" y="8" width="224" height="104" rx="16" fill="#f1f5f9" stroke="#cbd5e1"/><rect x="20" y="78" width="200" height="24" rx="8" fill="#e2e8f0"/><g transform="translate(108 80)" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v12M7 7l5-5 5 5"/><path d="M5 10v9h14v-9"/></g><text x="120" y="40" text-anchor="middle" font-size="13" fill="#334155" font-family="system-ui">1. Tap Share ⬆︎ below</text><text x="120" y="60" text-anchor="middle" font-size="13" fill="#334155" font-family="system-ui">2. Add to Home Screen ＋</text></svg>`;
function installBox() {
  if (STANDALONE) return '';
  if (DEFER) return `<div class="inst"><b>📲 Put Info Book on your home screen</b><p>It opens like an app, full screen.</p><button class="btn pri" data-install>Install Info Book</button></div>`;
  if (IOS) { setTimeout(prepIOS, 0); return `<div class="inst"><b>📲 Put Info Book on your home screen</b><p>In Safari: tap the <b>Share</b> button ⬆︎ at the bottom, then <b>Add to Home Screen</b>, then <b>Add</b>.</p>${IOS_PIC}${MEMBER && MEMBER.tok ? '<p class="mute" style="font-size:.8rem">Your family link goes with it, so the app opens your feed.</p>' : ''}</div>`; }
  return `<div class="inst"><b>📲 Put Info Book on your home screen</b><p>Open your browser’s menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>.</p></div>`;
}
function pasteLink() { // an installed app with no family link yet (an iPhone Home Screen app starts with empty storage)
  $('#sheetin').innerHTML = `<h2>Open your family link</h2><p>If Shane sent you a Info Book link, paste it here once and this app will open your feed.</p>
    <input id="plink" class="plink" placeholder="https://shane-my-app.pages.dev/feed/?invite=…" aria-label="Your link"><button class="btn pri" id="plgo">Open my feed</button>
    <button class="btn" id="plskip">I don’t have a link</button>`;
  $('#sheet').classList.add('on', 'ob');
}

/* ---- ⚙️ Family ---- */
function famSettings() {
  const inst = installBox();
  if (!FAM_ON) return inst;
  if (!IS_ADMIN) return `<h2 style="margin-top:4px">👪 Family</h2><p>You’re in Shane’s private family network as <b>${esc(MEMBER.name)}</b>. Comments and shares are only seen by the family.</p>
    <button class="btn pri" data-upload>📷 Share a photo</button> <button class="btn" id="obre">Change what I’m into</button><button class="btn" id="famleave">Leave on this phone</button>` + inst;
  return `<h2 style="margin-top:4px">👪 Family</h2><p>Invite people to their own Info Book. Each gets a private link: it opens their own feed (their own interests, nothing of yours) and lets them comment and share with the family. Making a new link stops the old one.</p>
    <div id="famlist" class="famlist">Loading…</div>
    <div class="famadd"><input id="famname" maxlength="40" placeholder="Name, e.g. Aranea" aria-label="Name"><button class="btn pri" id="famaddb">Add & make link</button></div>
    <div id="famlink"></div><p><button class="btn pri" data-upload>📷 Share a photo</button></p><p class="sst">Family photos are kept privately in the data service (only people with a link can see them), shrunk on the phone and with location data removed. You and whoever posted a photo can delete it.</p>` + inst;
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
  if (t.closest('[data-upload]')) { pickPhotos(); return; }
  const lkb = t.closest('[data-like]'); if (lkb) { toggleLike(lkb.dataset.like); return; }
  const lkn = t.closest('[data-likers]'); if (lkn) { showLikers(lkn.dataset.likers); return; }
  if (t.id === 'upgo') { postPhotos(); return; }
  if (t.id === 'upx' || t.id === 'upbox') { $('#upbox').remove(); UP = []; return; }
  const fp = t.closest('img[data-fph]'); if (fp && fp.src) { e.preventDefault(); const v = document.createElement('div'); v.className = 'lbx'; v.innerHTML = `<img src="${fp.src}" alt="">`; v.onclick = () => v.remove(); document.body.append(v); return; }
  if (t.closest('[data-install]')) { if (DEFER) { DEFER.prompt(); const r = await DEFER.userChoice.catch(() => ({})); if (r.outcome === 'accepted') { DEFER = null; document.querySelectorAll('.inst').forEach(el => el.remove()); } } return; }
  if (t.id === 'plgo') { const m = ($('#plink').value || '').match(/invite=([\w-]{30,80})/) || ($('#plink').value || '').trim().match(/^([\w-]{30,80})$/); if (!m) { toast('That doesn’t look like a Info Book link'); return; } localStorage.setItem('mf.member', JSON.stringify({ tok: m[1], pending: 1 })); location.reload(); return; }
  if (t.id === 'plskip') { ls.set('noLink', true); $('#sheet').classList.remove('on', 'ob'); return; }
  if (t.id === 'obre') { onboarding(); return; }
  if (t.id === 'famleave') { if (confirm('Take your feed off this phone? Your link will still work to come back.')) { localStorage.removeItem('mf.member'); location.reload(); } return; }
  const cb = t.closest('[data-cmt]'); if (cb) { openThread(cb); return; }
  const sb = t.closest('[data-share]'); if (sb) { shareCard(sb.dataset.share, false); return; }
  const sl = t.closest('[data-share-life]'); if (sl) { shareCard(sl.dataset.shareLife, true); return; }
  const us = t.closest('[data-unshare]'); if (us) { unshare(us.dataset.unshare, us.dataset.up); return; }
  const dc = t.closest('[data-delc]'); if (dc) { delComment(dc); return; }
  if (t.id === 'famaddb') { const n = $('#famname').value.trim(); if (!n) return; try { const r = await fam('/members', { method: 'POST', body: JSON.stringify({ name: n }) }); $('#famname').value = ''; showLink(r.name, r.token); famList(); } catch (er) { toast(er.message); } return; }
  const tk = t.closest('[data-famtok]'); if (tk) { if (!confirm('Make a new link for ' + tk.dataset.n + '? Their old link stops working.')) return; try { const r = await fam('/members/' + tk.dataset.famtok + '/token', { method: 'POST' }); showLink(tk.dataset.n, r.token); } catch (er) { toast(er.message); } return; }
  const fd = t.closest('[data-famdel]'); if (fd) { if (!confirm('Remove ' + fd.dataset.n + ' from the family? Their link stops working.')) return; try { await fam('/members/' + fd.dataset.famdel, { method: 'DELETE' }); famList(); toast('Removed'); } catch (er) { toast(er.message); } return; }
  const cp = t.closest('[data-copy]'); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); toast('Link copied'); } catch (er) { cp.previousElementSibling.select(); } return; }
}, true);
document.addEventListener('submit', e => { if (e.target.matches('.cf')) { e.preventDefault(); sendComment(e.target); } });

/* ---- 1.8.0 📷 Share a photo: from the camera or gallery, up to 4 a post, only for the family ----
   Each photo is shrunk on the phone (longest side 1600px, JPEG ~80%). Re-drawing it through a canvas keeps only the
   pixels, so EXIF and GPS location never leave the phone (the server strips any metadata again). Pictures are fetched
   with the member's token and shown from memory, never from a public link. */
const PH_POST = 4, PH_PX = 1600;
let UP = [];
const PHOTO_URL = new Map();
function famPhotos(i) {
  const ps = i.photos || [];
  return `<div class="fph n${ps.length}">${ps.map(p => `<img data-fph="${+p.id}" alt="${esc(i.t || 'Family photo')}"${p.w && p.h && ps.length === 1 ? ` style="aspect-ratio:${+p.w}/${+p.h}"` : ''}>`).join('')}</div>`;
}
function fillFamPhotos() {
  if (!FAM_ON) return;
  document.querySelectorAll('img[data-fph]:not([data-ld])').forEach(async img => {
    img.dataset.ld = 1; const id = img.dataset.fph;
    try {
      let url = PHOTO_URL.get(id);
      if (!url) { const r = await fetch(FAM_API + '/photos/' + id, { headers: { Authorization: 'Bearer ' + MEMBER.tok } }); if (!r.ok) throw 0; url = URL.createObjectURL(await r.blob()); PHOTO_URL.set(id, url); }
      img.src = url;
    } catch (e) { img.classList.add('gone'); }
  });
}
let UP_TAG = ''; // 1.9.0 a photo post's tag (e.g. today's photo challenge 'dq20261101'; later maybe 'reno')
function pickPhotos(tag) {
  if (!FAM_ON) return; UP_TAG = typeof tag === 'string' ? tag : '';
  const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.multiple = true; // the phone offers Camera or Photo Library
  f.onchange = () => { const files = [...f.files]; if (files.length > PH_POST) toast(`Up to ${PH_POST} photos a post – using the first ${PH_POST}`); prepPhotos(files.slice(0, PH_POST)); };
  f.click();
}
async function shrink(file) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { src = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file); }); }
  const W = src.width || src.naturalWidth, H = src.height || src.naturalHeight;
  for (const [px, q] of [[PH_PX, 0.8], [PH_PX, 0.68], [1280, 0.7], [1024, 0.65]]) {
    const k = Math.min(1, px / Math.max(W, H)), w = Math.round(W * k), h = Math.round(H * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(src, 0, 0, w, h);
    const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', q));
    if (blob && blob.size < 1.4e6) return { blob, w, h, url: URL.createObjectURL(blob) };
  }
  throw new Error('That photo is too big');
}
async function prepPhotos(files) {
  if (!files.length) return;
  document.querySelector('#upbox')?.remove();
  const box = document.createElement('div'); box.id = 'upbox'; box.className = 'upbox';
  box.innerHTML = `<div class="upin"><h2>📷 Share with the family</h2><div class="upth">Getting your photos ready…</div>
    <textarea id="upcap" maxlength="300" rows="2" placeholder="Say something about it (optional)"></textarea>
    <p class="sst">Only your family sees this. Location data is removed.</p>
    <div class="uprow"><button class="btn" id="upx">Cancel</button><button class="btn pri" id="upgo" disabled>Post</button></div></div>`;
  document.body.append(box);
  UP = [];
  for (const f of files) { try { UP.push(await shrink(f)); } catch (e) { toast(e.message || 'Couldn’t read one photo'); } }
  if (!document.body.contains(box)) return;
  box.querySelector('.upth').innerHTML = UP.length ? UP.map(p => `<img src="${p.url}" alt="">`).join('') : 'No photos could be read';
  $('#upgo').disabled = !UP.length;
}
async function postPhotos() {
  const b = $('#upgo'); if (!UP.length || b.disabled) return; b.disabled = true; b.textContent = 'Posting…';
  const caption = ($('#upcap').value || '').trim();
  if (unsafe({ t: caption })) { toast('Please keep it family-friendly'); b.disabled = false; b.textContent = 'Post'; return; }
  try {
    const ids = [];
    for (const p of UP) {
      const r = await fetch(`${FAM_API}/photos?w=${p.w}&h=${p.h}`, { method: 'POST', headers: { Authorization: 'Bearer ' + MEMBER.tok, 'Content-Type': 'image/jpeg' }, body: p.blob });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.err || 'Upload failed');
      PHOTO_URL.set(String(j.id), p.url); ids.push(j.id);
    }
    await fam('/shares?photos', { method: 'POST', body: JSON.stringify({ photos: ids, caption, ...(UP_TAG ? { tag: UP_TAG } : {}) }) }); UP_TAG = ''; if (typeof xAfterPost === 'function') xAfterPost();
    $('#upbox').remove(); UP = []; $('#sheet').classList.remove('on'); toast('📷 Shared with the family');
    tab = 'family'; ls.set('tab', tab); await loadShares(); draw();
  } catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Post'; }
}

/* ---- 1.8.1 ❤️ and 👍 on family posts (member photos and reposts): everyone in the family sees how many and who.
   The same taps also teach this person's own feed: ❤️ counts as a strong 👍 (2), 👍 as usual. 👎 stays private (no count,
   no names) and takes back their ❤️/👍. On ordinary public cards 👍/👎 are private, as before. ---- */
const HEART = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.5 3.4 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z" fill="var(--hf,none)" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>';
const isMe = l => l.mid === MEMBER.id;
const likeName = l => isMe(l) ? 'You' : l.name;
function whoText(list) {
  if (!list.length) return '';
  const n = list.map(likeName);
  return `${list.length} · ${esc(n.length > 3 ? n.slice(0, 2).join(', ') + ' +' + (n.length - 2) : n.join(', '))}`;
}
const freshFor = (s, list) => s.mine && list.some(l => !isMe(l) && l.at > (ls.get('likeSeen') || 0));
// 1.8.6 the pinned specials get the same ❤️/👍-with-names as family posts
let PINRX = {};
const rxOf = i => i._share || (i.pin && FAM_ON ? (PINRX[i.id] = PINRX[i.id] || { card: i.id, likes: [], ups: [], pin: 1 }) : null);
const rxCard = card => SHARES.find(x => x.card === card) || PINRX[card];
const rxItem = s => s.pin ? (FEED && FEED.items.find(i => i.id === s.card)) : shareItem(s);
async function loadPinRx() {
  if (!FAM_ON || typeof pins !== 'function') return;
  const ids = pins().map(i => i.id); if (!ids.length) return;
  try { const r = await fam('/likes?cards=' + encodeURIComponent(ids.join(','))); for (const k in r.rx || {}) { PINRX[k] = { card: k, pin: 1, ...r.rx[k] }; redrawFoot(k); } } catch (e) { }
}
function upNames(i) { const s = rxOf(i); return FAM_ON && s && (s.ups || []).length ? `<span class="rxc">${s.ups.length}</span>` : ''; }
function rxLine(i) { // '❤️ 2 · Sarah, Millesha   👍 1 · Shane' under family posts; tap for the full list
  const s = rxOf(i); if (!FAM_ON || !s) return '';
  const L = s.likes || [], U = s.ups || []; if (!L.length && !U.length) return '';
  return `<button class="rxl" data-likers="${esc(s.card)}">${L.length ? `<span>❤️ ${whoText(L)}${freshFor(s, L) ? '<i class="ndot"></i>' : ''}</span>` : ''}${U.length ? `<span>👍 ${whoText(U)}${freshFor(s, U) ? '<i class="ndot"></i>' : ''}</span>` : ''}</button>`;
}
function likeBtn(s) {
  const likes = s.likes || [], on = likes.some(isMe);
  return `<button class="fb lk${on ? ' on' : ''}" data-like="${esc(s.card)}" aria-pressed="${on}" aria-label="${on ? 'Take back your love' : 'Love it'}">${HEART}${likes.length ? `<span class="rxc">${likes.length}</span>` : ''}${freshFor(s, likes) ? '<i class="dot"></i>' : ''}</button>`;
}
function famNewLikes() { return FAM_ON && SHARES.some(s => freshFor(s, (s.likes || []).concat(s.ups || []))); }
function syncVote(s) { // this person's private ranking follows their family taps
  const it = rxItem(s), id = s.card; if (!it) return; const loved = (s.likes || []).some(isMe), up = (s.ups || []).some(isMe), v = loved ? 2 : up ? 1 : 0;
  if (v) { const { _share, photos, ...snap } = it; VOTES[id] = { v, topic: it.topic, src: it.src, ints: itemInts(it).slice(0, 4), at: Date.now(), item: snap }; }
  else if (VOTES[id] && VOTES[id].v > 0) delete VOTES[id];
  ls.set('votes', VOTES);
}
function redrawFoot(card) {
  const s = rxCard(card); if (!s) return; const it = rxItem(s); if (!it) return;
  const tmp = document.createElement('div'); tmp.innerHTML = window.card(it);
  document.querySelectorAll(`.card[data-id="${CSS.escape(card)}"] .ft`).forEach(ft => { ft.parentNode.querySelector('.rxl')?.remove(); const nr = tmp.querySelector('.rxl'); if (nr) ft.before(nr.cloneNode(true)); ft.replaceWith(tmp.querySelector('.ft').cloneNode(true)); });
  famCounts([it]);
}
async function react(card, kind, on) {
  const r = await fam('/likes', { method: 'POST', body: JSON.stringify({ card, kind, on }) }); setTimeout(() => loadPop(true), 500);
  for (const x of SHARES) if (x.card === card) { x.likes = r.likes; x.ups = r.ups; }
  if (PINRX[card]) { PINRX[card].likes = r.likes; PINRX[card].ups = r.ups; }
  const s = rxCard(card); if (s) syncVote(s);
  return s;
}
async function toggleLike(card) {
  const s = rxCard(card); if (!s) return;
  const on = !(s.likes || []).some(isMe);
  try { await react(card, 'love', on); redrawFoot(card); if (on) { try { navigator.vibrate && navigator.vibrate(12); } catch (e) { } } } catch (e) { toast(e.message); }
}
async function famVote(c, item, v) { // called by vote() for family cards; returns true when it handled the tap
  const s = rxOf(item); if (!FAM_ON || !s) return false;
  if (v > 0) {
    const on = !(s.ups || []).some(isMe);
    try { await react(s.card, 'up', on); redrawFoot(s.card); if (on) toast('👍 More like this'); } catch (e) { toast(e.message); }
    return true;
  }
  if ((s.likes || []).some(isMe) || (s.ups || []).some(isMe)) react(s.card, 'none').catch(() => { }); // a 👎 is private: just take back their ❤️/👍
  return false; // the usual private 👎 (hide + rank down) carries on
}
function showLikers(card) {
  const s = rxCard(card); if (!s) return;
  const row = (l, e) => `<div class="row"><span>${e} ${esc(likeName(l))}</span><small class="sst">${esc(nzTime(l.at))}</small></div>`;
  document.querySelector('#upbox')?.remove();
  const box = document.createElement('div'); box.id = 'upbox'; box.className = 'upbox';
  box.innerHTML = `<div class="upin"><h2>Who liked this</h2><div class="lkl">${(s.likes || []).length ? `<h3>❤️ ${s.likes.length}</h3>${s.likes.map(l => row(l, '❤️')).join('')}` : ''}${(s.ups || []).length ? `<h3>👍 ${s.ups.length}</h3>${s.ups.map(l => row(l, '👍')).join('')}` : ''}</div><div class="uprow"><button class="btn" id="upx">Close</button></div></div>`;
  document.body.append(box);
}

/* ---- 1.8.1 family popularity: what members ❤️/👍 moves up everyone's feed ----
   Points per other person: ❤️ 2, 👍 1, each fading by half every 2.5 days. Boost = 1 + 0.3 × points, capped at ×1.8 –
   enough to lift a post within its topic, never enough to break the topic mix (sitcoms first, your interests). It's
   applied after everyone's own filters, so no sport, the family-safe filter, your 👎 and switched-off interests still win.
   Your own taps aren't counted twice (they're already in your private 👍). 👎 is never sent. */
let POP = {};
async function loadPop(force) {
  if (!FAM_ON) return;
  const c = ls.get('pop', null); if (c && Date.now() - c.got < 30 * 60e3) POP = c.pop; if (!force && c && Date.now() - c.got < 5 * 60e3) return;
  try { const r = await fam('/popular'); POP = r.pop || {}; ls.set('pop', { got: Date.now(), pop: POP }); } catch (e) { }
}
function popW(i) {
  if (!FAM_ON) return 1;
  const l = POP[i.id] || (i._share && POP[i._share.card]); if (!l) return 1;
  const now = Date.now(); let pts = 0;
  for (const [mid, , w, at] of l) if (mid !== MEMBER.id) pts += w * Math.pow(0.5, (now - at) / (2.5 * 864e5));
  return Math.min(1.8, 1 + 0.3 * pts);
}
function popLine(i) { // "Liked by Sarah, Millesha" on ordinary cards the family liked (members only)
  if (!FAM_ON || i._share || i.pin || !isPublicCard(i)) return '';
  const l = (POP[i.id] || []).filter(x => x[0] !== MEMBER.id); if (!l.length) return '';
  const names = [...new Set(l.map(x => x[1]))], loved = l.some(x => x[2] === 2);
  return `<p class="popl">${loved ? '❤️' : '👍'} Liked by ${esc(names.length > 3 ? names.slice(0, 2).join(', ') + ' +' + (names.length - 2) : names.join(', '))}</p>`;
}
function famPublicVote(i, v) { // v: 1 = 👍 on, 0 = taken back, -1 = 👎 (private: only takes back a 👍)
  if (!FAM_ON || i._share || i.pin || !isPublicCard(i)) return;
  fam('/likes', { method: 'POST', body: JSON.stringify({ card: i.id, kind: v > 0 ? 'up' : 'none', on: v > 0 }) }).then(() => loadPop(true)).catch(() => { });
}
setInterval(() => { if (document.visibilityState === 'visible') loadPop(); }, 5 * 60e3 + 7e3);

/* ---- 1.8.2 keeping family likes in step ----
   Before 1.8.1 a 👍 on a family post only stayed on the phone, so nobody else saw it (Millesha's likes on Shane's photos).
   Now, once per post, any 👍/❤️ still saved on this phone for a family post goes up to the family (👍 → 👍, ❤️ → ❤️).
   Public cards: 👍s from the last 4 days go up too, so they count for the family's "liked" boost. 👎 never leaves the phone. */
let migDone = false;
async function migrateVotes() {
  if (!FAM_ON || migDone) return; migDone = true;
  const done = ls.get('votesUp', {}), now = Date.now(); let n = 0, changed = false;
  for (const s of SHARES) {
    const v = VOTES[s.card]; if (!v || v.v <= 0 || done[s.card]) continue;
    const kind = v.v >= 2 ? 'love' : 'up', have = (kind === 'love' ? s.likes : s.ups || []).some(isMe);
    done[s.card] = 1; changed = true; if (have) continue;
    try { const r = await fam('/likes', { method: 'POST', body: JSON.stringify({ card: s.card, kind, on: true }) }); s.likes = r.likes; s.ups = r.ups; n++; } catch (e) { delete done[s.card]; }
  }
  for (const [id, v] of Object.entries(VOTES)) {
    if (n >= 40 || done[id] || !v || v.v <= 0 || now - (v.at || 0) > 4 * 864e5 || !isPublicCard({ id, topic: v.topic, src: v.src })) continue;
    if (/^sh\d+$/.test(id) || SHARES.some(s => s.card === id)) continue;
    done[id] = 1; changed = true;
    try { await fam('/likes', { method: 'POST', body: JSON.stringify({ card: id, kind: 'up', on: true }) }); n++; } catch (e) { delete done[id]; }
  }
  if (changed) ls.set('votesUp', done);
  if (n) { loadPop(true); if (tab === 'family') draw(); }
}
async function famFresh(force) { // Family tab, ↻ and coming back to the app: fresh likes and comments, not up to 5 minutes old
  if (!FAM_ON || (!force && Date.now() - sharesAt < 20e3)) return;
  sharesAt = Date.now(); await Promise.all([loadShares(), loadPop(true), loadPinRx()]);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { famFresh(); checkUpdate(); } });
// A phone that keeps the app open (or an iPhone Home Screen app) can sit on old code: tell them, one tap reloads.
async function checkUpdate() {
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) reg.update().catch(() => { });
    const t = await (await fetch('sw.js?x=' + Date.now(), { cache: 'no-store' })).text(), v = (t.match(/VERSION = '([\d.]+)'/) || [])[1];
    if (v && v !== APP_VERSION && !document.querySelector('#updbar')) {
      const b = document.createElement('button'); b.id = 'updbar'; b.className = 'updbar'; b.textContent = '✨ Update available — tap to refresh';
      b.onclick = async () => { b.textContent = 'Updating…'; try { const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (r) await r.update(); const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith('my-feed-')).map(k => caches.delete(k))); } catch (e) { } location.reload(); };
      document.body.append(b);
    }
  } catch (e) { }
}
setTimeout(checkUpdate, 4000);
