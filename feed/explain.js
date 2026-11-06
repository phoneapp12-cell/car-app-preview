/* 1.9.79 📍 Explain labels: only genuine proper nouns (places, people, orgs, acronyms). Never everyday
   words like "rubbish" or "looking", even when a headline capitalises them. Wikipedia-backed; client
   fallback only when the worker hasn't labelled the item yet. */
(() => {
const CACHE_VER = 6;
let CACHE = ls.get('exCache', {}) || {};
if (ls.get('exCacheVer', 0) !== CACHE_VER) { CACHE = {}; ls.set('exCache', {}); ls.set('exCacheVer', CACHE_VER); } // wipe older loose labels
const saveCache = () => { const cut = Object.entries(CACHE).sort((a, b) => ((b[1] && b[1].at) || 0) - ((a[1] && a[1].at) || 0)).slice(0, 120); ls.set('exCache', Object.fromEntries(cut)); };
const SKIP = new Set(['new zealand','auckland','wellington','christchurch','hamilton','dunedin','tauranga','whangarei','whangārei','rotorua','napier','nelson','northland','waikato','bay of plenty','north island','south island','zealand','australia','sydney','melbourne','london','paris','new york','tokyo','china','japan','india','usa','united states','united kingdom','uk','england','canada','mexico','fiji','samoa','tonga','italy','spain','france','germany','austria','switzerland','slovenia','brazil','argentina','nigeria','egypt','iran','iraq','russia','ukraine','ireland','scotland','wales','taiwan','europe','asia','africa','alps','amazon','queens','nz herald','stuff','rnz','tvnz','three','the spinoff','1news','bbc','cnn','youtube','facebook','instagram','tiktok','google','christmas','easter','halloween','monday','tuesday','wednesday','thursday','friday','saturday','sunday','january','february','march','april','june','july','august','september','october','november','december','state highway','parliament','government','police','labour','national','covid','covid-19']);
const SKIP_ACRO = new Set(['NZ','UK','US','USA','UN','EU','TV','AI','GPS','USB','PDF','FAQ','CEO','MP','MPs','GDP','DNA','RNA','COVID']);
const STOP = new Set(['The','A','An','In','On','At','To','For','Of','And','Or','But','With','From','By','As','After','Before','Near','Over','Under','Into','State','Highway','Road','Says','Say','Said','Report','Update','Live','Breaking','Watch','Video','Photo','New','North','South','East','West','We','May','Have','Been','Was','Were','Are','Is','Do','Does','Did','Will','Looking','Look','Origin','Consciousness','Wrong','Place','Take','Your','Storm','Rubbish','Closed','Closes','Crash','Cattle','Truck']);
const PLACE_RE = /\b(town|village|suburb|city|settlement|community|district|region|island|harbour|bay|lake|river|mountain|mount|borough|commune|municipality|headland|country|nation)\b/i;
const PERSON_RE = /\b(politician|minister|mayor|actor|actress|singer|musician|songwriter|writer|author|journalist|scientist|athlete|player|ceo|founder|artist|comedian|presenter|born \d{4})\b/i;
const ORG_RE = /\b(party|organisation|organization|company|agency|ministry|authority|association|university|museum|band|foundation|institute|trust|board)\b/i;
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['']/g, "'").trim();
const isSkip = t => { const n = norm(t); return !n || n.length < 3 || SKIP.has(n) || /^state highway\b/.test(n); };
const isAcronym = t => /^[A-Z]{2,5}$/.test(t);
const isMulti = t => /\s/.test(t);
const isEveryday = t => {
  if (isAcronym(t)) return false;
  const n = norm(t);
  const CE = window.COMMON_EN;
  if (CE && CE.has(n)) return true;
  // multi-word of only common English words → not a proper noun (Grand Theft Auto, liquefied natural gas)
  // allow when a place/org signal word is present (Alfriston College, Barryscourt Castle)
  if (isMulti(t) && CE) {
    const parts = n.split(/\s+/);
    const PLACE_WORD = /^(castle|college|university|hospital|museum|bridge|harbour|harbor|bay|beach|island|mountain|river|park|square|cathedral|church|school|theatre|theater|stadium|airport|station|palace|abbey|tower|head|point|cape|mount|lake|valley|forest|desert|strait|channel|gulf|sea|ocean|peninsula|plateau|falls|creek|brook|hill|ridge|peak|pass|avenue|street|road|gardens?|zoo|aquarium|observatory|laboratory|institute|academy)$/;
    if (parts.some(w => PLACE_WORD.test(w))) return false;
    if (parts.every(w => CE.has(w) || w.length <= 2)) return true;
    return false;
  }
  return false;
};
const EMO = { place: '📍', person: '👤', org: '🏛️' };

function cands(title, desc) {
  const text = String(title || ''), blurb = String(desc || '').slice(0, 280), out = [], seen = new Set();
  const add = (t, k) => {
    t = String(t || '').replace(/\s+/g, ' ').replace(/[.,;:!?]+$/g, '').trim();
    if (!t || t.length < 3 || t.length > 48 || isSkip(t) || seen.has(norm(t)) || /^\d/.test(t)) return;
    if (isEveryday(t)) return;
    if (isMulti(t)) {
      const parts = t.split(/\s+/), conn = /^(of|de|van|von|da|di|le|la|el|the)$/i;
      const content = parts.filter(p => !conn.test(p));
      if (content.length < 2 || !content.some(p => !STOP.has(p) && !isEveryday(p))) return;
    } else if (!isAcronym(t) && k !== 'place') return;
    seen.add(norm(t)); out.push({ t, k: k || 'place' });
  };
  for (const src of [text, blurb]) {
    for (const m of src.matchAll(/\b(?:in|at|near|from|outside|towards|toward)\s+([A-Z][A-Za-zà-öø-ÿ'’\-]+(?:\s+[A-Z][A-Za-zà-öø-ÿ'’\-]+){0,3})\b/g)) add(m[1], 'place');
  }
  for (const m of text.matchAll(/\b([A-Z][a-zà-öø-ÿ'’\-]+(?:\s+(?:of|de|van|von|da|di|le|la|el|the)\s+)?(?:\s*[A-Z][a-zà-öø-ÿ'’\-]+)+)\b/g)) {
    if (!STOP.has(m[1].split(/\s+/)[0])) add(m[1], 'place');
  }
  for (const m of text.matchAll(/\b([A-Z]{2,5})\b/g)) if (!SKIP_ACRO.has(m[1])) add(m[1], 'org');
  const multi = new Set(out.filter(x => isMulti(x.t)).map(x => norm(x.t)));
  return out.filter(x => {
    if (isMulti(x.t) || isAcronym(x.t)) return true;
    for (const m of multi) if (m.split(' ').includes(norm(x.t))) return false;
    return true;
  }).sort((a, b) => (b.k === 'place') - (a.k === 'place')).slice(0, 3);
}

function goodEx(x) {
  if (!x || !x.a || !x.t || !['place', 'person', 'org'].includes(x.k)) return false;
  if (isSkip(x.t) || isEveryday(x.t)) return false;
  if (/^(zealand|europe|asia|africa|america|looking|rubbish|stream|hospital|life|tower|sword|congress|alps|queens|consciousness)$/i.test(x.t)) return false;
  if (/\b(video game|video-game|franchise|role-?playing|action-adventure|first-person|computer game|console)\b/i.test(x.a || '')) return false;
  if (/\b(liquefied|fossil fuel|natural gas|chemical compound|hydrocarbon)\b/i.test(x.t + ' ' + (x.a || ''))) return false;
  return true;
}

async function wiki(term) {
  const key = norm(term); if (CACHE[key] !== undefined) return CACHE[key] || null;
  try {
    const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term.replace(/ /g, '_')), { signal: AbortSignal.timeout(7000) });
    if (!r.ok) { CACHE[key] = 0; saveCache(); return null; }
    const d = await r.json();
    const extract = String(d.extract || '').replace(/\s+/g, ' ').trim();
    if (!d || d.type !== 'standard' || extract.length < 40 || /may refer to|disambiguation/i.test(extract) || isSkip(d.title || term) || isEveryday(d.title || term)) { CACHE[key] = 0; saveCache(); return null; }
    const desc = String(d.description || '');
    const blob = desc + ' ' + extract.slice(0, 160);
    let k = null;
    if (d.coordinates || PLACE_RE.test(desc) || PLACE_RE.test(blob)) k = 'place';
    else if (PERSON_RE.test(desc) || PERSON_RE.test(blob)) k = 'person';
    else if (ORG_RE.test(desc) || (/^[A-Z]{2,5}$/.test(term) && ORG_RE.test(blob))) k = 'org';
    if (!k) { CACHE[key] = 0; saveCache(); return null; }
    const parts = extract.split(/(?<=[.!?])\s+/).filter(Boolean);
    let a = parts.slice(0, 2).join(' ');
    if (k === 'place' && desc && /in |of /i.test(desc)) a = desc.replace(/^./, c => c.toUpperCase()) + '. ' + (parts[0] || a);
    if (a.length > 280) a = a.slice(0, 277).replace(/\s+\S*$/, '') + '…';
    const q = (k === 'place' ? 'Where is ' : k === 'person' ? 'Who is ' : 'What is ') + (d.title || term) + '?';
    const img = d.thumbnail && d.thumbnail.source && !/\.svg(\?|$)/i.test(d.thumbnail.source) ? d.thumbnail.source : '';
    const url = (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || '';
    const hit = { t: d.title || term, k, q, a, img, url, at: Date.now() };
    if (!goodEx(hit)) { CACHE[key] = 0; saveCache(); return null; }
    CACHE[key] = hit; saveCache(); return hit;
  } catch (e) { return null; }
}

function pillsHtml(ex) {
  const ok = (ex || []).filter(goodEx).slice(0, 2);
  if (!ok.length) return '';
  return `<div class="exrow" role="list">${ok.map((x, n) => `<button type="button" class="expill" data-ex="${n}" role="listitem">${EMO[x.k] || '❓'} ${esc(x.q)}</button>`).join('')}</div>`;
}

window.exLine = function (i) {
  if (!i || i.x || i.topic === 'life' || i.pin || i._share) return '';
  if (i.kind === 'event' || i.kind === 'tip' || i.kind === 'tv') return '';
  if (i.ex && i.ex.length) { i.ex = i.ex.filter(goodEx); if (!i.ex.length) { delete i.ex; return `<div class="exrow" data-expend="${esc(i.id)}" hidden></div>`; } return pillsHtml(i.ex); }
  return `<div class="exrow" data-expend="${esc(i.id)}" hidden></div>`;
};

function openEx(x) {
  if (!x || !x.a || !goodEx(x)) return;
  const img = x.img ? `<img class="eximg" src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';
  const more = x.url ? `<p class="exmore"><a href="${esc(x.url)}" target="_blank" rel="noopener">Read more on Wikipedia ↗</a></p>` : '';
  $('#sheetin').innerHTML = `<h2>${EMO[x.k] || '❓'} ${esc(x.q || x.t)}</h2>
    <div class="exbody">${img}<div><p class="exa">${esc(x.a)}</p>${more}<p class="sst">From Wikipedia · kept short for the family</p></div></div>
    <button class="btn" data-close>Close</button>`;
  $('#sheet').classList.add('on');
}

document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('.expill[data-ex]');
  if (!b) return;
  const card = b.closest('.card[data-id]'); if (!card) return;
  const id = card.dataset.id;
  const it = (typeof order !== 'undefined' && order.find(x => x.id === id)) || (FEED && FEED.items && FEED.items.find(x => x.id === id)) || (VOTES[id] && VOTES[id].item);
  const ex = ((it && it.ex) || card._exList || []).filter(goodEx);
  const x = ex[+b.dataset.ex]; if (x) openEx(x);
});

let busy = 0;
async function fillPending() {
  if (busy || !FEED) return;
  const nodes = [...document.querySelectorAll('#feed [data-expend]:not([data-exdone])')].slice(0, 4);
  if (!nodes.length) return;
  busy = 1;
  try {
    for (const el of nodes) {
      el.dataset.exdone = 1;
      const id = el.dataset.expend;
      const it = (typeof order !== 'undefined' && order.find(x => x.id === id)) || (FEED.items && FEED.items.find(x => x.id === id));
      if (!it || (it.ex && it.ex.length) || it.exc || it.kind === 'event' || it.kind === 'tip' || it.kind === 'tv') continue;
      if (!/^(nz|election|science|tech|travel|social|events|food|fitness|parent|culture|learn|diy|outdoors|nature)$/.test(it.topic || '')) continue;
      const list = [];
      for (const c of cands(it.t, it.s)) {
        if (list.length >= 2) break;
        const w = await wiki(c.t); if (w && goodEx(w)) list.push(w);
      }
      it.ex = list; it.exc = 1;
      if (list.length) {
        el.hidden = false; el.outerHTML = pillsHtml(list);
        const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
        if (card) card._exList = list;
      }
    }
  } finally { busy = 0; }
}

const mo = new MutationObserver(() => { clearTimeout(fillPending._t); fillPending._t = setTimeout(fillPending, 400); });
const feed = document.getElementById('feed'); if (feed) mo.observe(feed, { childList: true, subtree: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') fillPending(); });
window.ibExplain = { cands, wiki, open: openEx, goodEx, cache: () => CACHE };
})();
