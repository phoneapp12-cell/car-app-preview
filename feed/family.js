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
/* 1.9.74 personal words: "For Shane" instead of "For You" (first name; falls back to you/your) */
function myName() { const n = MEMBER && !MEMBER.pending && MEMBER.name ? String(MEMBER.name).trim().split(/\s+/)[0] : ''; return n; }
function forMe(cap) { const n = myName(); return (cap ? 'For ' : 'for ') + (n || 'you'); }
function mine(cap) { const n = myName(); return n ? n + '’s' : (cap ? 'Your' : 'your'); }
(() => { // ?invite=… : keep the token, take it out of the address bar, check it below (famInit)
  const q = new URLSearchParams(location.search), inv = q.get('invite');
  if (inv && /^[\w-]{30,80}$/.test(inv)) {
    if (!MEMBER || MEMBER.tok !== inv) { MEMBER = { tok: inv, pending: 1 }; localStorage.setItem('mf.member', JSON.stringify(MEMBER)); }
  }
  if (inv) { try { sessionStorage.setItem('ibFromInvite', '1'); } catch (e) { } } // 1.9.104 opened from an invite link: install pop-up straight away
  if (inv) { q.delete('invite'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }
  // 1.9.230 ?friend=… : a one-time friend invite (kept for this visit only, then the join screen asks for their name)
  const fr = q.get('friend');
  if (fr && /^[\w-]{30,80}$/.test(fr)) { try { sessionStorage.setItem('ibFriendCode', fr); } catch (e) { } }
  if (fr) { q.delete('friend'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }
})();
const FAM_ON = !!(MEMBER && MEMBER.id && !MEMBER.pending);
const IS_ADMIN = FAM_ON && MEMBER.role === 'admin';
const IS_FRIEND = FAM_ON && MEMBER.role === 'friend'; // 1.9.230 a friend: sees their friends circle, never the family's things
const famWord = () => IS_FRIEND ? 'your friends' : 'the family';
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
  let fcode = ''; try { fcode = sessionStorage.getItem('ibFriendCode') || ''; } catch (e) { }
  if (fcode && !MEMBER) { joinSheet(fcode); return; } // 1.9.230 a friend invite
  if (fcode && MEMBER) { try { sessionStorage.removeItem('ibFriendCode'); } catch (e) { } setTimeout(() => toast('Info Book is already set up on this phone'), 1500); }
  if (!MEMBER) { if (STANDALONE && !ls.get('noLink', false)) pasteLink(); return; }
  if (MEMBER.pending) {
    try {
      const me = await fam('/me');
      const next = { tok: MEMBER.tok, id: me.id, name: me.name, role: me.role, ...(me.friend ? { host: me.host || '' } : {}) };
      localStorage.setItem('mf.member', JSON.stringify(next));
      // 1.9.82: only one pending→ready reload per token (avoids open-time restart loops)
      const key = 'ibPendRel:' + MEMBER.tok.slice(0, 12);
      if (localStorage.getItem(key) !== me.id) { localStorage.setItem(key, me.id); location.reload(); }
      else { MEMBER = next; /* already reloaded once; continue without another restart */ }
    }
    catch (e) { if (e.status === 401) { localStorage.removeItem('mf.member'); $('#feed').insertAdjacentHTML('afterbegin', '<div class="empty">This invite link doesn’t work any more. Ask Shane for a new one.</div>'); } }
    return;
  }
  PICK = MEMBER.role === 'admin' ? null : ls.get('pick', null); giveDefaults();
  if (PICK && !ls.get('seed104', 0)) { if (!PICK.includes('meals')) PICK.push('meals'); ls.set('pick', PICK); ls.set('seed104', 1); } // 1.9.104 easy weeknight meals on for everyone
  if (MEMBER.role === 'admin' && !ls.get('seed103', 0)) { ls.set('optIn', [...new Set([...ls.get('optIn', []), 'aiassist', 'smart', 'innov'])]); ls.set('seed103', 1); } // 1.9.103 Shane's new tech topics on
  CSEEN = ls.get('cseen', {});
  if (MEMBER.role !== 'admin' && !PICK) { // a new phone: their settings from the server, or the welcome screen
    try { const r = await fam('/prefs'); if (r.prefs && Array.isArray(r.prefs.adds)) ls.set('addsPre', r.prefs.adds.filter(t => TOPIC[t])); if (r.nudge && Array.isArray(r.nudge.topics)) { ls.set('nudge', r.nudge); ls.set('addsPre', [...new Set([...ls.get('addsPre', []), ...r.nudge.topics.filter(t => TOPIC[t])])]); } if (r.prefs && Array.isArray(r.prefs.pick)) { applyPrefs(r.prefs); } } catch (e) { } // 1.8.5 addsPre: interests Shane switched on for them, ticked on the welcome screen
    if (!PICK) { onboarding(); }
  }
  if (PICK || MEMBER.role === 'admin') fam('/prefs').then(r => { ls.set('nudge', r.nudge || null); if (r.prefs && Array.isArray(r.prefs.vlTags)) ls.set('vlTags', r.prefs.vlTags); }).catch(() => { }); // 1.9.0 suggestions from Shane (life stage)
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
  if (Array.isArray(p.vlTags)) ls.set('vlTags', p.vlTags); // 1.9.40 vlog likes Shane set for them
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
    <p>${IS_FRIEND ? `💬 You can comment on posts and share with your friends circle: ${esc(MEMBER.host || 'the person who invited you')} and their friends. Only they can see those.` : '💬 You can comment on posts and 🔁 share them with the family. Only people Shane has invited can see those.'}</p>
    <div class="obg">${list.map(t => `<button class="obt${sel.has(t[0]) ? ' on' : ''}" data-pick="${t[0]}" style="--c1:${t[3]};--c2:${t[4]}"><span>${t[2]}</span>${esc(t[1])}</button>`).join('')}</div>
    <p class="mute" style="font-size:.85rem">No sport, no bills or money stuff. Ever.</p>
    <button class="btn pri" id="obgo">Start my feed</button>${installBox()}`;
  $('#sheet').classList.add('on', 'ob');
}
function obGo() {
  const p = [...document.querySelectorAll('.obt.on')].map(b => b.dataset.pick);
  if (!p.length) { toast('Pick at least one'); return; }
  PICK = p; ls.set('defaultsGiven', DEFAULT_ON.slice()); ls.set('addsGot', [...new Set([...ls.get('addsGot', []), ...ls.get('addsPre', [])])]); ls.set('pick', PICK); famPrefsChanged();
  $('#sheet').classList.remove('on', 'ob'); tab = 'all'; ls.set('tab', tab); draw(); toast((myName() ? myName() + ', your' : 'Your') + ' feed is ready ✨');
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
  if (s.text || x.kind === 'text') return { id: s.card, t: x.t || s.caption || '', s: '', sn: s.name, topic: 'family', src: 'family', kind: 'text', at: s.at, _share: s };
  return { id: s.card, t: x.t, s: x.s, url: x.url, img: x.img, vid: x.vid, photos: x.kind === 'link' && Array.isArray(x.photos) ? x.photos.slice(0, 1) : undefined, sn: x.sn || 'Shared', topic: s.priv ? 'family' : (TOPIC[x.topic] ? x.topic : 'family'), src: x.src || 'family', kind: x.kind || (x.img ? 'photo' : 'news'), ev: x.ev || 0, at: s.at, _share: s };
}
function sharesFor(t) { // reposts shown to everyone, whatever they picked (newest first)
  const now = Date.now();
  return SHARES.filter(s => t === 'family' || now - s.at < 21 * 864e5).map(shareItem).filter(i => !(VOTES[i.id] && VOTES[i.id].v < 0) && !unsafe(i) && !unsafe({ t: i._share.caption }));
}
function weaveShares(order) { // one shared card near the top, then every 6–8 posts
  const sh = sharesFor('all').filter(i => !(typeof shareSeen === 'function' && shareSeen(i))); if (!sh.length) return order; // 1.9.18 back only with a new comment or like
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
  m.innerHTML = `<div class="upbs"><button class="btn pri upb" data-upload>📷 Share a photo</button><button class="btn pri upb" data-sharelink>🔗 Share a link</button><button class="btn pri upb" data-sharetext>✏️ Write a post</button></div><div class="load" style="padding-top:0">${IS_FRIEND ? `🤝 Shared in your friends circle · only ${esc(MEMBER.host || 'your host')} and their friends can see this` : '💬 Shared in the family · only people Shane invited can see this'}</div>` + (sh.length ? '' : `<div class="empty">Nothing shared yet. Write a post, share a photo, or tap 🔁 on any post to share it with ${famWord()}.</div>`);
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
  if (!priv && !IS_FRIEND) { repostSheet(id, snap); return; } // 1.9.231 reposting a news card: Family / Friends / Both
  const caption = prompt('Add a short note for ' + famWord() + '? (optional)', '');
  if (caption === null) return;
  try { const r = await fam('/shares', { method: 'POST', body: JSON.stringify({ orig: id, priv, snap, caption }) }); toast(r.dup ? 'Already shared' : '🔁 Shared with ' + famWord()); await loadShares(); }
  catch (e) { toast(e.message); }
}
let RP = null;
function repostSheet(id, snap) {
  RP = { id, snap }; $('#sheet').classList.add('on');
  $('#sheetin').innerHTML = `<h2>🔁 Share this</h2><p class="sst">${esc(snap.t || '')}</p>
    <textarea id="rpcap" rows="2" maxlength="200" placeholder="Add a short note (optional)" aria-label="Your note"></textarea>
    ${audPicker('rpaud', false)}
    <div class="xbtns"><button class="btn pri" id="rpgo">Share</button><button class="btn" data-close>Cancel</button></div>`;
}
async function repostGo(b) {
  if (!RP) return; const A = audRead('rpaud'), caption = (($('#rpcap') || {}).value || '').trim();
  b.disabled = true;
  try { const r = await fam('/shares', { method: 'POST', body: JSON.stringify({ orig: RP.id, priv: false, snap: RP.snap, caption, ...(A.aud ? { aud: A.aud } : {}) }) }); $('#sheet').classList.remove('on'); RP = null; toast(r.dup ? 'Already shared' : '🔁 Shared with ' + A.who); await loadShares(); }
  catch (e) { b.disabled = false; toast(e.message); }
}
document.addEventListener('click', e => { const t = e.target; if (t && t.id === 'rpgo') repostGo(t); });
async function unshare(sid, up, text) {
  if (!confirm(up ? 'Delete this photo post for everyone?' : text ? 'Delete this post for everyone?' : 'Stop sharing this with the family?')) return;
  try { await fam('/shares/' + sid, { method: 'DELETE' }); toast('Not shared any more'); SHARES = SHARES.filter(s => s.id !== +sid); draw(); } catch (e) { toast(e.message); }
}

/* ---- card extras: 💬 comments and 🔁 share ---- */
function famBar(i) {
  if (!FAM_ON || !isPublicCard(i)) return '';
  const r = rxOf(i), lk = r ? likeBtn(r) : '';
  const c = COUNTS[i.id], n = c ? c[0] : 0, fresh = c && c[1] > (CSEEN[i.id] || 0);
  return lk + `<button class="fb" data-cmt="${esc(i.id)}" aria-label="Comments">💬<span class="cc">${n || ''}</span>${fresh ? '<i class="dot"></i>' : ''}</button>${i.kind === 'upload' || i.kind === 'text' || (i._share && (i._share.link || i._share.text)) ? '' : `<button class="fb" data-share="${esc(i.id)}" aria-label="Share with the family">🔁</button>`}`;
}
function famLifeBar(x) { return canShareLife(x) ? `<button class="fb" data-share-life="${esc(x.id)}" aria-label="Share with the family">🔁</button>` : ''; }
function audBadge(s) { // 1.9.230 who a post is for, and a friend's posts marked as such
  const a = s.aud === 'fr' ? '🤝 Friends' : s.aud === 'both' ? '👨‍👩‍👧 + 🤝 Family & friends' : '';
  return (s.friend && !IS_FRIEND && !s.mine ? '<small class="shaud fr">🤝 Friend</small>' : '') + (a && !IS_FRIEND ? `<small class="shaud">${a}</small>` : '');
}
function shareHead(i) {
  const s = i._share; if (!s) return '';
  const h = shareHead0(i, s); return h.replace('</div>', audBadge(s) + '</div>'); }
function shareHead0(i, s) {
  if (s.up) return `<div class="shby">📷 Photo from <b>${esc(s.name)}</b> · ${esc(nzTime(s.at))}${s.mine || IS_ADMIN ? `<button class="mini" data-unshare="${s.id}" data-up="1">Delete</button>` : ''}</div>`;
  if (s.text || i.kind === 'text') {
    const del = s.mine || IS_ADMIN ? `<button class="mini" data-unshare="${s.id}" data-text="1">Delete</button>` : '';
    return `<div class="shby">✏️ Written by <b>${esc(s.mine ? 'You' : s.name)}</b> · ${esc(nzTime(s.at))}${del}${Array.isArray(s.to) && s.to.length ? `<small class="shto">🔒 Just for ${esc(s.to.join(', '))}${s.mine ? '' : ' (and ' + esc(s.name) + ')'}</small>` : ''}</div>`;
  }
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
    try { const r = await fam('/counts?last=3&ids=' + ids.map(encodeURIComponent).join(',')); Object.assign(COUNTS, r); for (const id of ids) { refreshBar(id); try { autoThread(id); } catch (er) { } } } catch (e) { }
    if (cntQ.size) famCounts([]);
  }, 300);
}
function refreshBar(id) { // 1.9.10: null-safe – the daily-question and date buttons had no count span
  document.querySelectorAll(`.card[data-id="${CSS.escape(id)}"] [data-cmt]`).forEach(b => { const c = COUNTS[id]; let cc = b.querySelector('.cc'); if (!cc) { b.insertAdjacentHTML('beforeend', '<span class="cc"></span>'); cc = b.querySelector('.cc'); } if (cc) cc.textContent = c && c[0] ? c[0] : ''; const d = b.querySelector('.dot'); const fresh = c && c[1] > (CSEEN[id] || 0); if (fresh && !d) b.insertAdjacentHTML('beforeend', '<i class="dot"></i>'); if (!fresh && d) d.remove(); });
}
async function openThread(btn) {
  const c = btn.closest('.card'), id = btn.dataset.cmt; let box = c.querySelector('.cmts:not(.dqt)');
  if (box) { box.remove(); c.dataset.cmshut = 1; return; }
  c.insertAdjacentHTML('beforeend', `<div class="cmts"><div class="cl">Loading…</div><form class="cf"><textarea rows="1" maxlength="1000" placeholder="Write a comment…" aria-label="Write a comment"></textarea><button class="btn pri">Send</button></form></div>`);
  box = c.querySelector('.cmts:not(.dqt)'); await loadThread(box, id);
}
/* 1.9.14 ❤️ on comments: tap the heart to like/unlike, tap the names (or hold the heart) to see everyone who liked it */
const CLIKES = {};
function cmLikeBar(x) { // 1.9.61 ❤️ (hold for more) + its own 👍; still one reaction per person per comment
  const L = Array.isArray(x.likes) ? x.likes : []; CLIKES[x.id] = L;
  const mine = L.find(isMe), mineUp = !!mine && mine.emo === 'up', H = L.filter(l => l.emo !== 'up'), U = L.length - H.length, mh = mine && !mineUp ? mine : null;
  return `<div class="cmlk" data-cmlk="${x.id}"><button class="cml${mh ? ' on' : ''}" data-clike="${x.id}" aria-pressed="${!!mh}" aria-label="${mh ? 'You reacted – hold to change' : 'Like this comment (hold for more)'}">${mh ? emoOf(mh) : '🤍'}${H.length ? `<span class="cmlc">${topEmo(H, mh ? emoOf(mh) : '')}${H.length}</span>` : ''}</button><button class="cml cmup${mineUp ? ' on' : ''}" data-cthumb="${x.id}" aria-pressed="${mineUp}" aria-label="${mineUp ? 'You gave this a thumbs up' : 'Thumbs up this comment'}">👍${U ? `<span class="cmlc">${U}</span>` : ''}</button>${L.length ? `<button class="cmln" data-clikers="${x.id}">${esc(L.map(likeName).slice(0, 3).join(', '))}${L.length > 3 ? ' +' + (L.length - 3) : ''}</button>` : ''}</div>`;
}
let CL_EMO = 'love';
async function toggleCLike(cid, emo) {
  if (RX_BUSY.has('cl:' + cid)) return;
  const L = CLIKES[cid] || [];
  const send = on => rxOnce('cl:' + cid, async () => {
    if (on) document.querySelectorAll(`[data-clike="${cid}"]`).forEach(b => b.classList.add('on', 'pend'));
    try { const r = await fam('/comments/' + cid + '/like', { method: 'POST', body: JSON.stringify({ on, emo: CL_EMO }) }); if (r && Array.isArray(r.likes)) document.querySelectorAll(`[data-cmlk="${cid}"]`).forEach(nb => nb.outerHTML = cmLikeBar({ id: cid, likes: r.likes })); if (on) buzz(); else toast('Like removed'); }
    catch (e) { document.querySelectorAll(`[data-cmlk="${cid}"]`).forEach(nb => nb.outerHTML = cmLikeBar({ id: cid, likes: CLIKES[cid] || [] })); toast(e.message); }
  });
  const mine = L.find(isMe); CL_EMO = emo || 'love';
  if (mine && emoKey(mine) === CL_EMO) { toastUndo(`You already reacted ${emoOf(mine)}`, () => send(false)); return; } // 1.9.33 one per person (1.9.42 another emoji switches it)
  await send(true);
}
function showCLikers(cid) {
  const L = CLIKES[cid] || []; if (!L.length) return;
  document.querySelector('#upbox')?.remove();
  const box = document.createElement('div'); box.id = 'upbox'; box.className = 'upbox';
  box.innerHTML = `<div class="upin"><h2>Who liked this comment</h2><div class="lkl"><h3>${topEmo(L)} ${L.length}</h3>${L.map(l => `<div class="row"><span>${emoOf(l)} ${esc(likeName(l))}</span><small class="sst">${esc(nzTime(l.at))}</small></div>`).join('')}</div><div class="uprow"><button class="btn" id="upx">Close</button></div></div>`;
  document.body.append(box);
}
let CLK_HOLD = null, CLK_HELD = false;
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => document.addEventListener(ev, () => clearTimeout(CLK_HOLD), true));
document.addEventListener('click', e => {
  const t = e.target; if (!t || !t.closest) return;
  const b = t.closest('[data-clike]'); if (b) { e.preventDefault(); e.stopPropagation(); if (CLK_HELD) { CLK_HELD = false; return; } toggleCLike(+b.dataset.clike); return; }
  const th = t.closest('[data-cthumb]'); if (th) { e.preventDefault(); e.stopPropagation(); toggleCLike(+th.dataset.cthumb, 'up'); return; }
  const n = t.closest('[data-clikers]'); if (n) { e.preventDefault(); e.stopPropagation(); showCLikers(+n.dataset.clikers); }
}, true);
const cmRow = x => `<div class="cm${x.bot ? ' bot' : ''}"><b>${esc(x.name)}</b>${x.pron && { she: 1, he: 1, they: 1 }[x.pron] ? ` <small class="prn">(${{ she: 'she/her', he: 'he/him', they: 'they/them' }[x.pron]})</small>` : ''}${x.bot ? '<span class="aib" title="Replies written by AI">AI</span>' : ''} <small>${esc(nzTime(x.at))}</small>${x.mine || IS_ADMIN ? `<button class="cx" data-delc="${x.id}" aria-label="Delete comment">✕</button>` : ''}<p>${esc(x.text)}</p>${cmLikeBar(x)}</div>`;
/* 1.9.19 💬 threads open by themselves: any card with comments shows the latest 2–3 (with ❤️ and a reply box) and
   "View all N comments" when there are more. They arrive in the same one batch request as the counts. */
function autoThread(id) {
  const c = COUNTS[id]; if (!c || !c[0] || !Array.isArray(c[2]) || !c[2].length) return;
  document.querySelectorAll(`.card[data-id="${CSS.escape(id)}"]`).forEach(card => {
    if (!card || card.querySelector('.cmts:not(.dqt)') || card.dataset.cmshut) return;
    const more = c[0] > c[2].length ? `<button class="cmall" data-cmall="${esc(id)}">View all ${c[0]} comments</button>` : '';
    card.insertAdjacentHTML('beforeend', `<div class="cmts auto">${more}<div class="cl">${c[2].map(cmRow).join('')}</div><form class="cf"><textarea rows="1" maxlength="1000" placeholder="Write a reply…" aria-label="Write a comment"></textarea><button class="btn pri">Send</button></form></div>`);
  });
}
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-cmall]'); if (!b) return; const box = b.closest('.cmts'); b.remove(); if (box) loadThread(box, b.dataset.cmall); });
async function loadThread(box, id) {
  try {
    const list = await fam('/comments?card=' + encodeURIComponent(id));
    box.querySelector('.cl').innerHTML = list.length ? list.map(cmRow).join('') : '<div class="cm0">No comments yet. Say something 👋</div>';
    COUNTS[id] = [list.length, list.length ? list[list.length - 1].at : 0]; CSEEN[id] = Date.now(); ls.set('cseen', CSEEN); refreshBar(id);
  } catch (e) { const cl = box && box.querySelector('.cl'); if (cl) cl.textContent = 'Couldn’t load comments – tap 💬 to try again.'; console.warn('comments', e); }
}
async function sendComment(form) {
  const c = form.closest('.card'), id = (form.closest('.cmts') || {dataset:{}}).dataset.cid || c.dataset.id, ta = form.querySelector('textarea'), text = ta.value.trim(); if (!text) return;
  const i = order.find(x => x.id === id) || ((FEED && FEED.items) || []).find(x => x.id === id) || {};
  if (!isPublicCard({ ...i, id })) { toast('That one stays private'); return; }
  const sh = i._share ? i._share.snap : null, base = sh || i;
  const snap = { t: base.t, url: base.url, img: base.img, vid: base.vid, sn: base.sn || i.sn, topic: i.topic, src: i.src };
  form.querySelector('button').disabled = true;
  try { await fam('/comments', { method: 'POST', body: JSON.stringify({ card: id, text, snap }) }); ta.value = ''; await loadThread(form.closest('.cmts'), id); }
  catch (e) { toast(e.message); }
  form.querySelector('button').disabled = false;
}
async function delComment(b) { if (!confirm('Delete this comment?')) return; const box = b.closest('.cmts'), id = (box && box.dataset.cid) || b.closest('.card').dataset.id; try { await fam('/comments/' + b.dataset.delc, { method: 'DELETE' }); await loadThread(box, id); } catch (e) { toast(e.message); } }

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
  if (IS_FRIEND) return `<h2 style="margin-top:4px">🤝 Friends</h2><p>You’re in Info Book as <b>${esc(MEMBER.name)}</b>, a friend of ${esc(MEMBER.host || 'the person who invited you')}. Your posts, comments and games are shared with your friends circle: ${esc(MEMBER.host || 'them')} and their other friends. Family posts stay private to the family.</p>
    <div id="frlist" class="famlist">Loading…</div>
    <button class="btn pri" data-upload>📷 Share a photo</button> <button class="btn" id="obre">Change what I’m into</button><button class="btn" id="famleave">Leave on this phone</button>` + inst;
  if (!IS_ADMIN) return `<h2 style="margin-top:4px">👪 Family</h2><p>You’re in Shane’s private family network as <b>${esc(MEMBER.name)}</b>. Comments and shares are only seen by the family.</p>
    <button class="btn pri" data-upload>📷 Share a photo</button> <button class="btn" id="obre">Change what I’m into</button><button class="btn" id="famleave">Leave on this phone</button>` + friendsBox() + inst;
  return `<h2 style="margin-top:4px">👪 Family</h2><p>Invite people to their own Info Book. Each gets a private link: it opens their own feed (their own interests, nothing of yours) and lets them comment and share with the family. Making a new link stops the old one.</p>
    <div id="famlist" class="famlist">Loading…</div>
    <div class="famadd"><input id="famname" maxlength="40" placeholder="Name, e.g. Aranea" aria-label="Name"><button class="btn pri" id="famaddb">Add & make link</button></div>
    <div id="famlink"></div><p><button class="btn pri" data-upload>📷 Share a photo</button></p><p class="sst">Family photos are kept privately in the data service (only people with a link can see them), shrunk on the phone and with location data removed. You and whoever posted a photo can delete it.</p>` + friendsBox() + inst;
}
/* ---- 1.9.230 🤝 Friends: any family member invites friends (one-time link, 7 days). Friends see their own circle (the
   person who invited them and that person's other friends), never family posts, names or family cards. The server
   enforces all of it. Shane has 👥 People: everyone, their group, joined and last seen, and Remove. ---- */
function friendsBox() {
  return `<h2 style="margin-top:18px">🤝 Friends</h2><p>Invite a friend to their own Info Book. They see posts you send to <b>Friends</b> or <b>Both</b>, and can play games with you and your other friends. They never see family posts, family members or family cards.</p>
    <div class="famadd"><input id="frname" maxlength="40" placeholder="Their name (just for you), e.g. Jo" aria-label="Friend’s name"><button class="btn pri" id="frinv">Make invite link</button></div>
    <div id="frlink"></div><h3>My friends</h3><div id="frlist" class="famlist">Loading…</div>${typeof IS_SHANE !== 'undefined' && IS_SHANE() ? '<p><button class="btn pri" id="ppl">👥 People: everyone in Info Book</button></p>' : ''}`;
}
const IS_SHANE = () => IS_ADMIN && (/\bShane\b/i.test(MEMBER.name || '') || !!MEMBER.shane);
const shortDay = ms => ms ? new Date(ms).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' }) : '';
async function frList() {
  const el = $('#frlist'); if (!el) return;
  try {
    const r = await fam('/friends');
    if (r.friend) { el.innerHTML = `<div class="row"><span>🏠 ${esc((r.host || {}).name || 'Your host')}<small class="sst">invited you</small></span><span></span></div>` + (r.circle || []).map(x => `<div class="row"><span>🤝 ${esc(x.name)}<small class="sst">friend since ${esc(shortDay(x.created))}</small></span><span></span></div>`).join('') || ''; return; }
    el.innerHTML = (r.friends || []).map(x => `<div class="row"><span>🤝 ${esc(x.name)}<small class="sst">joined ${esc(shortDay(x.created))} · ${x.seen ? 'last here ' + esc(ago(x.seen)) + ' ago' : 'not back yet'}</small></span><span><button class="mini warn" data-frrm="${esc(x.id)}" data-n="${esc(x.name)}">Remove</button></span></div>`).join('')
      + (r.invites || []).map(x => `<div class="row"><span>✉️ ${esc(x.label || 'Invite')}<small class="sst">waiting · link works until ${esc(shortDay(x.exp))}</small></span><span><button class="mini" data-frrev="${esc(x.id)}">Cancel</button></span></div>`).join('')
      || '<p class="sst">No friends yet.</p>';
  } catch (e) { el.textContent = e.message; }
}
function inviteLink(code) { return location.origin + location.pathname.replace(/[^/]*$/, '') + '?friend=' + code; }
function showInvite(r) {
  const link = inviteLink(r.code), who = r.label || 'your friend';
  $('#frlink').innerHTML = `<div class="famlnk"><b>Invite link${r.label ? ' for ' + esc(r.label) : ''}</b><p>Send it to ${esc(who)} yourself. It works once and stops working on ${esc(shortDay(r.exp))}.</p><input readonly value="${esc(link)}" aria-label="Invite link"><button class="btn pri" data-copy="${esc(link)}">Copy link</button>${navigator.share ? ` <button class="btn" data-frshare="${esc(link)}">Share…</button>` : ''}</div>`;
}
function audPicker(name = 'lkto', some = true) { // who sees a post: Family (default), Friends, Both, or chosen people
  const mine = (FAM_PEOPLE || []).filter(p => p.mine).length;
  if (IS_FRIEND) return `<h3>Who sees it?</h3><div class="lkto"><label><input type="radio" name="${name}" value="fr" checked> 🤝 My friends circle</label>${some ? `<label><input type="radio" name="${name}" value="some"> 🔒 Just some people</label>` : ''}</div>`;
  return `<h3>Who sees it?</h3><div class="lkto aud3"><label><input type="radio" name="${name}" value="all" checked> 👨‍👩‍👧 Family</label><label><input type="radio" name="${name}" value="fr"> 🤝 My friends</label><label><input type="radio" name="${name}" value="both"> 🌏 Both</label>${some ? `<label><input type="radio" name="${name}" value="some"> 🔒 Just some people</label>` : ''}</div>`
    + `<p class="sst audh">${mine ? `Friends means your ${mine} friend${mine === 1 ? '' : 's'}. Family never see posts sent only to friends.` : 'You haven’t invited any friends yet (⚙️ → Friends), so Friends and Both reach just the family for now.'}</p>`;
}
function audRead(name = 'lkto') {
  const v = (document.querySelector(`input[name="${name}"]:checked`) || {}).value || (IS_FRIEND ? 'fr' : 'all');
  if (IS_FRIEND) return { some: v === 'some', aud: null, who: v === 'some' ? 'the people you picked' : 'your friends' };
  return { some: v === 'some', aud: v === 'fr' ? 'fr' : v === 'both' ? 'both' : null, who: v === 'fr' ? 'your friends' : v === 'both' ? 'family and friends' : v === 'some' ? 'the people you picked' : 'the family' };
}
async function joinSheet(code) {
  $('#sheet').classList.add('on', 'ob'); $('#sheetin').innerHTML = '<h2>Kia ora 👋</h2><p>Checking your invite…</p>';
  let info = null; try { const r = await fetch(FAM_API + '/join?code=' + encodeURIComponent(code)); info = await r.json(); } catch (e) { info = { err: 'Couldn’t reach Info Book. Check your connection and open the link again.' }; }
  if (!info || !info.ok) { try { sessionStorage.removeItem('ibFriendCode'); } catch (e) { } $('#sheetin').innerHTML = `<h2>Kia ora 👋</h2><p>${esc((info && info.err) || 'This invite link has expired or been used. Ask for a new one.')}</p><button class="btn" id="jclose">OK</button>`; return; }
  $('#sheetin').innerHTML = `<h2>Kia ora 👋</h2><p><b>${esc(info.host)}</b> has invited you to Info Book as a friend.</p>
    <p>You get your own feed of photos, videos and stories from public sources, plus posts and games (Tetris, Scrabble and Sugar Rush) with ${esc(info.host)} and their other friends. No sport, no bills or money stuff.</p>
    <label class="sst" for="jname">Your name (shown to ${esc(info.host)} and their friends)</label><input id="jname" class="plink" maxlength="40" autocomplete="name" placeholder="Your name">
    <button class="btn pri" id="jgo" data-code="${esc(code)}">Join Info Book</button><p class="sst">This link works once.</p>`;
  setTimeout(() => { const i = $('#jname'); if (i) i.focus(); }, 60);
}
async function joinGo(b) {
  const name = (($('#jname') || {}).value || '').trim(); if (!name) { toast('Type your name first'); return; }
  b.disabled = true; b.textContent = 'Joining…';
  try {
    const r = await fetch(FAM_API + '/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: b.dataset.code, name }) });
    const j = await r.json().catch(() => ({})); if (!r.ok || !j.token) throw new Error(j.err || 'That didn’t work – try again');
    try { sessionStorage.removeItem('ibFriendCode'); sessionStorage.setItem('ibFromInvite', '1'); } catch (e) { }
    localStorage.setItem('mf.member', JSON.stringify({ tok: j.token, pending: 1 })); location.reload();
  } catch (e) { b.disabled = false; b.textContent = 'Join Info Book'; toast(e.message); }
}
async function peopleSheet() { // Shane only (the server checks too)
  $('#sheet').classList.add('on'); $('#sheetin').innerHTML = '<h2>👥 People</h2><p>Loading…</p>';
  let r; try { r = await fam('/admin/people'); } catch (e) { $('#sheetin').innerHTML = `<h2>👥 People</h2><p>${esc(e.message)}</p><button class="btn" data-close>Close</button>`; return; }
  const P = r.people || [], fam0 = P.filter(p => p.group === 'family'), fr = P.filter(p => p.group === 'friend');
  const row = p => `<div class="row pplr"><span>${p.group === 'family' ? (p.admin ? '⭐' : '👤') : '🤝'} <b>${esc(p.name)}</b><small class="sst">${p.group === 'family' ? 'Family' : 'Friend of ' + esc(p.host ? p.host.name : '?') + (p.host && p.host.removed ? ' (removed)' : '')} · joined ${esc(shortDay(p.joined))} · ${p.me ? 'you' : p.seen ? 'last seen ' + esc(ago(p.seen)) + ' ago' : 'not seen yet'}</small></span><span>${p.me ? '' : `<button class="mini warn" data-pplrm="${esc(p.id)}" data-n="${esc(p.name)}" data-g="${p.group}" data-nf="${P.filter(q => q.host && q.host.id === p.id).length}">Remove</button>`}</span></div>`;
  $('#sheetin').innerHTML = `<h2>👥 People</h2><p class="sst">Everyone in Info Book and which group they’re in. Only you can see this page. Remove takes someone out straight away: their link stops working, a friend’s posts and comments are hidden, and removing a family member removes their friends too.</p>
    <h3>👨‍👩‍👧 Family · ${fam0.length}</h3><div class="famlist">${fam0.map(row).join('')}</div>
    <h3>🤝 Friends · ${fr.length}</h3><div class="famlist">${fr.map(row).join('') || '<p class="sst">No friends yet.</p>'}</div>
    <h3>✉️ Invites waiting · ${(r.invites || []).length}</h3><div class="famlist">${(r.invites || []).map(x => `<div class="row"><span>✉️ ${esc(x.label || 'Invite')}<small class="sst">from ${esc(x.host)} · works until ${esc(shortDay(x.exp))}</small></span><span><button class="mini" data-frrev="${esc(x.id)}" data-ppl="1">Revoke</button></span></div>`).join('') || '<p class="sst">None.</p>'}</div>
    <button class="btn" data-close>Close</button>`;
}
document.addEventListener('click', async e => {
  const t = e.target; if (!t || !t.closest) return;
  if (t.id === 'jgo') { e.stopPropagation(); joinGo(t); return; }
  if (t.id === 'jclose') { $('#sheet').classList.remove('on', 'ob'); return; }
  if (t.id === 'frinv') { const n = ($('#frname') || {}).value || ''; t.disabled = true; try { const r = await fam('/friends/invite', { method: 'POST', body: JSON.stringify({ name: n.trim() }) }); $('#frname').value = ''; showInvite(r); frList(); } catch (er) { toast(er.message); } t.disabled = false; return; }
  const fs = t.closest('[data-frshare]'); if (fs) { try { await navigator.share({ title: 'Info Book', text: 'Join me on Info Book', url: fs.dataset.frshare }); } catch (er) { } return; }
  const rv = t.closest('[data-frrev]'); if (rv) { if (!confirm('Cancel this invite? The link stops working.')) return; try { await fam('/friends/invite/' + rv.dataset.frrev, { method: 'DELETE' }); toast('Invite cancelled'); if (rv.dataset.ppl) peopleSheet(); else frList(); } catch (er) { toast(er.message); } return; }
  if (t.id === 'ppl') { peopleSheet(); return; }
  const fr = t.closest('[data-frrm]'); if (fr) { if (!confirm(`Remove ${fr.dataset.n} from Info Book? Their link stops working straight away and their posts and comments are hidden. This can’t be undone.`)) return; try { await fam('/friends/' + fr.dataset.frrm, { method: 'DELETE' }); toast(fr.dataset.n + ' removed'); frList(); } catch (er) { toast(er.message); } return; } // 1.9.231 a host removes their own friend
  const rm = t.closest('[data-pplrm]'); if (rm) { const nf = rm.dataset.g === 'family' ? +(rm.dataset.nf || 0) : 0;
    if (!confirm(`Remove ${rm.dataset.n} from Info Book? Their link stops working straight away${rm.dataset.g === 'friend' ? ' and their posts and comments are hidden' : nf ? `, and their ${nf} friend${nf === 1 ? '' : 's'} are removed too` : ''}. This can’t be undone.`)) return; try { await fam('/admin/people/' + rm.dataset.pplrm, { method: 'DELETE' }); toast(rm.dataset.n + ' removed'); peopleSheet(); } catch (er) { toast(er.message); } return; }
});
async function famList() {
  frList(); // 1.9.230
  const el = $('#famlist'); if (!el) return;
  try {
    const list = await fam('/members');
    el.innerHTML = list.filter(x => x.role !== 'friend').map(x => `<div class="row"><span>${x.role === 'admin' ? '⭐' : '👤'} ${esc(x.name)}<small class="sst">${x.role === 'admin' ? 'you · admin' : x.seen ? 'last here ' + esc(ago(x.seen)) + ' ago' : 'hasn’t opened it yet'}</small></span><span>${x.role === 'admin' ? '' : `<button class="mini" data-famtok="${x.id}" data-n="${esc(x.name)}">New link</button> <button class="mini" data-famdel="${x.id}" data-n="${esc(x.name)}">Remove</button>`}</span></div>`).join('');
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
  const us = t.closest('[data-unshare]'); if (us) { unshare(us.dataset.unshare, us.dataset.up, us.dataset.text); return; }
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
  box.innerHTML = `<div class="upin"><h2>📷 Share ${IS_FRIEND ? 'with your friends' : 'a photo'}</h2><div class="upth">Getting your photos ready…</div>
    <textarea id="upcap" maxlength="300" rows="2" placeholder="Say something about it (optional)"></textarea>
    ${UP_TAG ? '' : audPicker('upaud', false)}
    <p class="sst">Only the people you pick see this. Location data is removed.</p>
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
    const A = UP_TAG ? { aud: null } : audRead('upaud');
    await fam('/shares?photos', { method: 'POST', body: JSON.stringify({ photos: ids, caption, ...(A.aud ? { aud: A.aud } : {}), ...(UP_TAG ? { tag: UP_TAG } : {}) }) }); UP_TAG = ''; if (typeof xAfterPost === 'function') xAfterPost();
    $('#upbox').remove(); UP = []; $('#sheet').classList.remove('on'); toast('📷 Shared with ' + A.who);
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
/* ---- 1.9.42 ❤️😂😠😮😐😎 reactions: hold the heart (on posts and comments) for the picker; a quick tap is still ❤️.
   One reaction each – picking another emoji switches it. 😠 and 😐 don't boost a post in anyone's feed. ---- */
const EMOS = [['love', '❤️', 'Heart'], ['laugh', '😂', 'Laugh'], ['angry', '😠', 'Angry'], ['wow', '😮', 'Surprised'], ['meh', '😐', 'Meh'], ['cool', '😎', 'Cool']];
const EMO_CH = Object.fromEntries([...EMOS.map(e => [e[0], e[1]]), ['up', '👍']]); // 1.9.61 👍 on comments (own button, not in the hold picker)
const emoKey = l => (l && EMO_CH[l.emo]) ? l.emo : 'love', emoOf = l => EMO_CH[emoKey(l)];
function topEmo(L, skip = '') { const n = {}; for (const l of L) n[emoOf(l)] = (n[emoOf(l)] || 0) + 1; return Object.keys(n).sort((a, b) => n[b] - n[a]).filter(e => e !== skip).slice(0, 3).join(''); }
function rxLine(i) { // '❤️ 2 · Sarah, Millesha   👍 1 · Shane' under family posts; tap for the full list
  const s = rxOf(i); if (!FAM_ON || !s) return '';
  const L = s.likes || [], U = s.ups || []; if (!L.length && !U.length) return '';
  return `<button class="rxl" data-likers="${esc(s.card)}">${L.length ? `<span>${topEmo(L)} ${whoText(L)}${freshFor(s, L) ? '<i class="ndot"></i>' : ''}</span>` : ''}${U.length ? `<span>👍 ${whoText(U)}${freshFor(s, U) ? '<i class="ndot"></i>' : ''}</span>` : ''}</button>`;
}
function likeBtn(s) {
  const likes = s.likes || [], mine = likes.find(isMe), on = !!mine, me = mine && emoKey(mine) !== 'love' ? `<span class="rxe">${emoOf(mine)}</span>` : HEART;
  return `<button class="fb lk${on ? ' on' : ''}" data-like="${esc(s.card)}" aria-pressed="${on}" aria-label="${on ? 'You reacted – hold to change' : 'Love it (hold for more)'}">${me}${likes.length ? `<span class="rxc">${likes.length}</span>` : ''}${freshFor(s, likes) ? '<i class="dot"></i>' : ''}</button>`;
}
function famNewLikes() { return FAM_ON && SHARES.some(s => freshFor(s, (s.likes || []).concat(s.ups || []))); }
function syncVote(s) { // this person's private ranking follows their family taps
  const it = rxItem(s), id = s.card; if (!it) return; const loved = (s.likes || []).some(l => isMe(l) && !['angry', 'meh'].includes(l.emo)), up = (s.ups || []).some(isMe), v = loved ? 2 : up ? 1 : 0;
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
async function react(card, kind, on, emo) {
  const r = await fam('/likes', { method: 'POST', body: JSON.stringify({ card, kind, on, emo }) }); setTimeout(() => loadPop(true), 500);
  for (const x of SHARES) if (x.card === card) { x.likes = r.likes; x.ups = r.ups; }
  if (PINRX[card]) { PINRX[card].likes = r.likes; PINRX[card].ups = r.ups; }
  const s = rxCard(card); if (s) syncVote(s);
  return s;
}
/* 1.9.33 one like per person: taps are ignored while a request is in flight, and tapping something you already liked
   doesn't like it again – it shows "You already liked this" with an Undo (the server also never toggles on a repeat). */
const RX_BUSY = new Set();
async function rxOnce(key, fn) {
  if (RX_BUSY.has(key)) return; RX_BUSY.add(key); document.documentElement.classList.add('rxbusy');
  try { return await fn(); } finally { setTimeout(() => { RX_BUSY.delete(key); if (!RX_BUSY.size) document.documentElement.classList.remove('rxbusy'); }, 300); }
}
function toastUndo(text, undo) {
  const el = document.getElementById('toast'); el.innerHTML = `<span>${esc(text)}</span><button type="button" class="tundo">Undo</button>`; el.classList.add('on', 'act');
  el.querySelector('.tundo').onclick = async ev => { ev.preventDefault(); ev.stopPropagation(); el.classList.remove('on'); try { await undo(); } catch (e) { toast(e.message || 'Couldn’t undo – try again'); } };
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on', 'act'), 4500);
}
const buzz = () => { try { navigator.vibrate && navigator.vibrate(12); } catch (e) { } };
async function toggleLike(card, emo = 'love') {
  if (RX_BUSY.has('love:' + card)) return;
  const s = rxCard(card); if (!s) return; const mine = (s.likes || []).find(isMe);
  if (mine && emoKey(mine) === emo) { toastUndo(`You already reacted ${emoOf(mine)}`, () => rxOnce('love:' + card, async () => { await react(card, 'love', false); redrawFoot(card); toast('Like removed'); })); return; }
  await rxOnce('love:' + card, async () => {
    document.querySelectorAll(`.card[data-id="${CSS.escape(card)}"] [data-like]`).forEach(b => b.classList.add('on', 'pend'));
    try { await react(card, 'love', true, emo); redrawFoot(card); buzz(); if (mine) toast('Changed to ' + EMO_CH[emo]); } catch (e) { redrawFoot(card); toast(e.message); }
  });
}
async function famVote(c, item, v) { // called by vote() for family cards; returns true when it handled the tap
  const s = rxOf(item); if (!FAM_ON || !s) return false;
  if (v > 0) {
    if (RX_BUSY.has('up:' + s.card)) return true;
    if ((s.ups || []).some(isMe)) { toastUndo('You already liked this 👍', () => rxOnce('up:' + s.card, async () => { await react(s.card, 'up', false); redrawFoot(s.card); toast('Like removed'); })); return true; }
    await rxOnce('up:' + s.card, async () => {
      c.querySelectorAll('.vote.up').forEach(b => b.classList.add('on', 'pend'));
      try { await react(s.card, 'up', true); redrawFoot(s.card); toast('👍 More like this'); } catch (e) { redrawFoot(s.card); toast(e.message); }
    });
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
  box.innerHTML = `<div class="upin"><h2>Who reacted</h2><div class="lkl">${(s.likes || []).length ? `<h3>${topEmo(s.likes)} ${s.likes.length}</h3>${s.likes.map(l => row(l, emoOf(l))).join('')}` : ''}${(s.ups || []).length ? `<h3>👍 ${s.ups.length}</h3>${s.ups.map(l => row(l, '👍')).join('')}` : ''}</div><div class="uprow"><button class="btn" id="upx">Close</button></div></div>`;
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
function ibTetrisInPlay() {
  try {
    if (typeof ibArt !== 'undefined' && ibArt.isTetris && ibArt.isTetris()) return true;
    if (document.documentElement && document.documentElement.dataset.ibArt === 'tetris') return true;
    const raw = (sessionStorage.getItem('ib-art-open') || localStorage.getItem('ib-art-open') || '');
    const o = raw ? JSON.parse(raw) : null;
    return !!(o && o.kind === 'tetris');
  } catch (e) { return false; }
}
async function checkUpdate() {
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) reg.update().catch(() => { });
    if (ibTetrisInPlay()) return; // never reload or offer a refresh mid-Tetris; the new SW waits until the next open
    const t = await (await fetch('sw.js?x=' + Date.now(), { cache: 'no-store' })).text(), v = (t.match(/VERSION = '([\d.]+)'/) || [])[1];
    if (v && v !== APP_VERSION && !document.querySelector('#updbar')) {
      const b = document.createElement('button'); b.id = 'updbar'; b.className = 'updbar'; b.textContent = '✨ Update available — tap to refresh';
      b.onclick = async () => { b.textContent = 'Updating…'; try { const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (r) await r.update(); const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith('my-feed-')).map(k => caches.delete(k))); } catch (e) { } location.reload(); };
      document.body.append(b);
    }
  } catch (e) { }
}
setTimeout(checkUpdate, 4000);

/* 1.9.42 the reaction picker: hold ❤️ ~0.4s (finger or mouse) → a bar of six; slide to one and let go, or tap one */
let RXP = null, RXP_T = null, RXP_HELD = false;
function rxPickClose() { if (RXP) { RXP.el.remove(); RXP = null; } }
function rxPickOpen(btn) {
  rxPickClose(); const r = btn.getBoundingClientRect(), el = document.createElement('div'); el.className = 'rxpick'; el.setAttribute('role', 'menu');
  el.innerHTML = EMOS.map(e => `<button type="button" role="menuitem" data-emo="${e[0]}" aria-label="${e[2]}"><span>${e[1]}</span><small>${e[2]}</small></button>`).join('');
  document.body.append(el); const w = el.offsetWidth, x = Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2)), y = r.top - el.offsetHeight - 10;
  el.style.left = x + 'px'; el.style.top = (y < 6 ? r.bottom + 10 : y) + 'px';
  RXP = { el, btn, hot: null }; buzz();
}
function rxPickHot(x, y) { if (!RXP) return; const t = document.elementFromPoint(x, y), b = t && t.closest && t.closest('.rxpick [data-emo]'); RXP.el.querySelectorAll('[data-emo]').forEach(z => z.classList.toggle('hot', z === b)); RXP.hot = b; }
function rxPickDo(emo) { if (!RXP) return; const b = RXP.btn; rxPickClose(); if (b.dataset.like) toggleLike(b.dataset.like, emo); else if (b.dataset.clike) toggleCLike(+b.dataset.clike, emo); }
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('[data-like],[data-clike]');
  if (!b) { if (RXP && !e.target.closest('.rxpick')) rxPickClose(); return; }
  RXP_HELD = false; clearTimeout(RXP_T); const x0 = e.clientX, y0 = e.clientY;
  RXP_T = setTimeout(() => { RXP_HELD = true; rxPickOpen(b); rxPickHot(x0, y0); }, 400);
  b.__rxMove = ev => { if (!RXP && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 12) clearTimeout(RXP_T); };
}, true);
document.addEventListener('pointermove', e => { const b = e.target.closest && e.target.closest('[data-like],[data-clike]'); if (b && b.__rxMove) b.__rxMove(e); if (RXP && RXP_HELD) rxPickHot(e.clientX, e.clientY); }, true);
document.addEventListener('pointerup', e => { clearTimeout(RXP_T); if (RXP && RXP_HELD) { rxPickHot(e.clientX, e.clientY); if (RXP.hot) rxPickDo(RXP.hot.dataset.emo); } }, true);
document.addEventListener('pointercancel', () => clearTimeout(RXP_T), true);
document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('[data-like],[data-clike],.rxpick')) e.preventDefault(); }, true);
document.addEventListener('click', e => {
  const t = e.target; if (!t || !t.closest) return;
  const p = t.closest('.rxpick [data-emo]'); if (p) { e.preventDefault(); e.stopPropagation(); rxPickDo(p.dataset.emo); return; }
  if (RXP_HELD && t.closest('[data-like],[data-clike]')) { e.preventDefault(); e.stopPropagation(); RXP_HELD = false; return; } // the hold opened the picker: not a tap
}, true);
addEventListener('scroll', () => { if (RXP && !RXP_HELD) rxPickClose(); }, { passive: true });
