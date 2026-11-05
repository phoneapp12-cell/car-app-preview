/* 1.9.77 📍 Explain labels: at the bottom of news cards, small pills like "Where is Gordonton?" for places,
   people, orgs or terms a family member might question. Tap opens a short plain-English sheet (from the
   worker's Wikipedia-backed `ex` array, or a same-phone Wikipedia lookup as fallback). */
(() => {
const CACHE = ls.get('exCache', {}) || {}; // term → {a,k,q,img,url,at} or 0 (miss)
const saveCache = () => { const cut = Object.entries(CACHE).sort((a, b) => ((b[1] && b[1].at) || 0) - ((a[1] && a[1].at) || 0)).slice(0, 120); ls.set('exCache', Object.fromEntries(cut)); };
const SKIP = new Set(['new zealand','auckland','wellington','christchurch','hamilton','dunedin','tauranga','whangarei','whangārei','rotorua','napier','nelson','northland','waikato','bay of plenty','north island','south island','australia','sydney','melbourne','london','paris','new york','tokyo','china','japan','india','usa','united states','united kingdom','uk','england','canada','mexico','fiji','samoa','tonga','nz herald','stuff','rnz','tvnz','three','the spinoff','1news','bbc','cnn','youtube','facebook','instagram','tiktok','google','christmas','easter','halloween','monday','tuesday','wednesday','thursday','friday','saturday','sunday','january','february','march','april','june','july','august','september','october','november','december','state highway','parliament','government','police','labour','national','covid','covid-19']);
const SKIP_ACRO = new Set(['NZ','UK','US','USA','UN','EU','TV','AI','GPS','USB','PDF','FAQ','CEO','MP','MPs','GDP','DNA','RNA','COVID']);
const STOP = new Set(['The','A','An','In','On','At','To','For','Of','And','Or','But','With','From','By','As','After','Before','Near','Over','Under','Into','State','Highway','Road','Says','Say','Said','Report','Update','Live','Breaking','Watch','Video','Photo','New','North','South','East','West']);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['']/g, "'").trim();
const isSkip = t => { const n = norm(t); return !n || n.length < 3 || SKIP.has(n) || /^state highway\b/.test(n); };
const EMO = { place: '📍', person: '👤', org: '🏛️', term: '❓' };

function cands(title, desc) {
  const text = String(title || ''), blurb = String(desc || '').slice(0, 220), out = [], seen = new Set();
  const add = (t, k) => { t = String(t || '').replace(/\s+/g, ' ').replace(/[.,;:!?]+$/g, '').trim(); if (!t || t.length < 3 || t.length > 48 || isSkip(t) || seen.has(norm(t)) || /^\d/.test(t)) return; seen.add(norm(t)); out.push({ t, k: k || 'term' }); };
  for (const m of text.matchAll(/\b(?:in|at|near|from|outside|towards|toward)\s+([A-Z][A-Za-zà-öø-ÿ'’\-]+(?:\s+[A-Z][A-Za-zà-öø-ÿ'’\-]+){0,3})\b/g)) add(m[1], 'place');
  for (const m of text.matchAll(/\b([A-Z][a-zà-öø-ÿ'’\-]+(?:\s+(?:of|de|van|von|da|di|le|la|el|the)\s+)?(?:\s*[A-Z][a-zà-öø-ÿ'’\-]+)+)\b/g)) if (!STOP.has(m[1].split(/\s+/)[0])) add(m[1], 'term');
  text.split(/\s+/).forEach((w, i) => { const c = w.replace(/^[^A-Za-zà-öø-ÿ]+|[^A-Za-zà-öø-ÿ'’\-]+$/g, ''); if (/^[A-Z][a-zà-öø-ÿ'’\-]{4,}$/.test(c) && !STOP.has(c) && i > 0) add(c, 'term'); });
  for (const m of text.matchAll(/\b([A-Z]{2,5})\b/g)) if (!SKIP_ACRO.has(m[1])) add(m[1], 'org');
  for (const m of blurb.matchAll(/\b(?:in|at|near|from)\s+([A-Z][A-Za-zà-öø-ÿ'’\-]+(?:\s+[A-Z][A-Za-zà-öø-ÿ'’\-]+){0,2})\b/g)) add(m[1], 'place');
  return out.sort((a, b) => (b.k === 'place') - (a.k === 'place')).slice(0, 3);
}

async function wiki(term) {
  const key = norm(term); if (CACHE[key] !== undefined) return CACHE[key] || null;
  try {
    const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term.replace(/ /g, '_')), { signal: AbortSignal.timeout(7000) });
    if (!r.ok) { CACHE[key] = 0; saveCache(); return null; }
    const d = await r.json();
    const extract = String(d.extract || '').replace(/\s+/g, ' ').trim();
    if (!d || d.type === 'disambiguation' || extract.length < 40 || /may refer to|disambiguation/i.test(extract) || isSkip(d.title || term)) { CACHE[key] = 0; saveCache(); return null; }
    const desc = String(d.description || '');
    let k = 'term';
    if (d.coordinates || /\b(town|village|city|suburb|settlement|community|district|region|island|harbour|bay|lake|river|mountain|mount)\b/i.test(desc + ' ' + extract)) k = 'place';
    else if (/\b(politician|minister|mayor|actor|actress|singer|writer|author|journalist|scientist|athlete|player|ceo|founder|artist|comedian)\b/i.test(desc)) k = 'person';
    else if (/\b(party|organisation|organization|company|agency|ministry|authority|association|university|museum)\b/i.test(desc) || /^[A-Z]{2,5}$/.test(term)) k = 'org';
    const parts = extract.split(/(?<=[.!?])\s+/).filter(Boolean);
    let a = parts.slice(0, 2).join(' ');
    if (k === 'place' && desc && /in |of /i.test(desc)) a = desc.replace(/^./, c => c.toUpperCase()) + '. ' + (parts[0] || a);
    if (a.length > 280) a = a.slice(0, 277).replace(/\s+\S*$/, '') + '…';
    const q = (k === 'place' ? 'Where is ' : k === 'person' ? 'Who is ' : 'What is ') + (d.title || term) + '?';
    const img = d.thumbnail && d.thumbnail.source && !/\.svg(\?|$)/i.test(d.thumbnail.source) ? d.thumbnail.source : '';
    const url = (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || '';
    const hit = { t: d.title || term, k, q, a, img, url, at: Date.now() };
    CACHE[key] = hit; saveCache(); return hit;
  } catch (e) { return null; }
}

function pillsHtml(ex) {
  if (!ex || !ex.length) return '';
  return `<div class="exrow" role="list">${ex.slice(0, 2).map((x, n) => `<button type="button" class="expill" data-ex="${n}" role="listitem">${EMO[x.k] || '❓'} ${esc(x.q || ((x.k === 'place' ? 'Where is ' : 'What is ') + x.t + '?'))}</button>`).join('')}</div>`;
}

window.exLine = function (i) {
  if (!i || i.x || i.topic === 'life' || i.pin || i._share) return '';
  if (i.ex && i.ex.length) return pillsHtml(i.ex);
  return `<div class="exrow" data-expend="${esc(i.id)}" hidden></div>`; // filled async if a Wikipedia hit lands
};

function openEx(x) {
  if (!x || !x.a) return;
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
  const ex = (it && it.ex) || (card._exList);
  const x = ex && ex[+b.dataset.ex]; if (x) openEx(x);
});

/* client fallback: for cards the worker hasn't labelled yet, try Wikipedia for 1–2 candidates */
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
      if (!it || (it.ex && it.ex.length) || it.exc) continue;
      if (!/^(nz|election|science|tech|travel|social|events|food|fitness|parent|culture|learn|diy|outdoors|nature)$/.test(it.topic || '')) continue;
      const list = [];
      for (const c of cands(it.t, it.s)) {
        if (list.length >= 2) break;
        const w = await wiki(c.t); if (w) list.push(w);
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
window.ibExplain = { cands, wiki, open: openEx, cache: () => CACHE };
})();
