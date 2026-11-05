/* 1.9.75 🧭 Info Book learns what each person enjoys (👍, reactions, comments, opening links, revealing jokes, and lingering
   on a card), all on their own phone, and every so often suggests more subjects: related topics they haven't switched on
   yet, plus brand-new subjects that aren't on any list (from a starter list of ideas and from words that keep coming up
   in what they like). New subjects get their own chip with pictures from public sources. Nothing changes until they tap Add. */
(() => {
const LK = 'learn', day = () => Math.floor(Date.now() / 864e5);
let L = ls.get(LK, null) || { t: {}, w: {}, n: 0, d: day() };
if (L.d !== day()) { const k = Math.pow(.97, day() - L.d); for (const m of [L.t, L.w]) for (const x in m) { m[x] *= k; if (Math.abs(m[x]) < .2) delete m[x]; } L.d = day(); }
const save = () => ls.set(LK, L);
const BAD = /\b(sex\w*|porn\w*|drugs?|weed|cannabis|vap(e|ing)|alcohol|beer|wine|vodka|guns?|shooting|murder\w*|kill\w*|dead|death|died|crash\w*|war|police|court|politic\w*|election|labour|national|trump|biden|religio\w*|church)\b/i;
function itemOf(id) { try { return (typeof order !== 'undefined' && order.find(x => x.id === id)) || (VOTES[id] && VOTES[id].item) || null; } catch (e) { return null; } }
function learn(id, w) {
  const it = itemOf(id); if (!it) return; const t = String(it.topic || ''); if (!t || t === 'all' || t === 'life' || t === 'family') { if (!t.startsWith('you:')) return; }
  L.t[t] = (L.t[t] || 0) + w; L.n++;
  if (w > 0) for (const x of storyWords(it.t || '')) if (!/^\d+$/.test(x) && !BAD.test(x)) L.w[x] = (L.w[x] || 0) + w * .5;
  save();
}
const cardId = el => { const c = el && el.closest && el.closest('.card[data-id]'); return c ? c.dataset.id : ''; };
document.addEventListener('click', e => { const t = e.target; if (!t || !t.closest) return; const id = cardId(t); if (!id) return;
  if (t.closest('[data-vote="1"]')) learn(id, 3); else if (t.closest('[data-vote="-1"]')) learn(id, -4);
  else if (t.closest('[data-like]')) learn(id, 3); else if (t.closest('[data-cmt]')) learn(id, 2);
  else if (t.closest('a[href^="http"]')) learn(id, 2); else if (t.closest('[data-joke]')) learn(id, 1); }, true);
const dwell = new Map();
const dio = new IntersectionObserver(es => es.forEach(e => { const id = e.target.dataset.id; if (!id) return;
  if (e.isIntersecting) dwell.set(id, Date.now()); else if (dwell.has(id)) { const s = (Date.now() - dwell.get(id)) / 1000; dwell.delete(id); if (s >= 5 && s < 300) learn(id, Math.min(1.5, s / 10)); } }), { threshold: .6 });
const fd = document.getElementById('feed'); if (fd) new MutationObserver(() => fd.querySelectorAll('.card[data-id]:not([data-lw])').forEach(c => { c.dataset.lw = 1; dio.observe(c); })).observe(fd, { childList: true, subtree: true });

/* related topics: liking one makes the others worth offering */
const REL = { sitcoms: ['culture', 'music', 'scifi', 'games'], scifi: ['science', 'tech', 'learn', 'vgames'], music: ['culture', 'events', 'sitcoms'], garden: ['nature', 'outdoors', 'diy', 'food'],
  dogs: ['nature', 'outdoors', 'kids'], nature: ['outdoors', 'travel', 'science', 'garden'], food: ['gf', 'garden', 'travel'], kids: ['parent', 'creative', 'games'], tech: ['science', 'scifi', 'vgames', 'learn'],
  diy: ['creative', 'cars', 'garden', 'collect'], science: ['learn', 'scifi', 'nature', 'tech'], travel: ['outdoors', 'nz', 'culture', 'food'], fitness: ['outdoors', 'food'], creative: ['craft', 'diy', 'culture'],
  craft: ['creative', 'collect'], tarot: ['creative', 'culture'], parent: ['kids', 'learn'], culture: ['music', 'sitcoms', 'events'], learn: ['science', 'games', 'travel'], games: ['boardg', 'vgames', 'learn'],
  vgames: ['games', 'tech', 'fantasy'], boardg: ['games', 'fantasy'], fantasy: ['boardg', 'vgames', 'scifi'], collect: ['cars', 'diy', 'culture'], outdoors: ['nature', 'travel', 'fitness'], cars: ['diy', 'collect', 'tech'], nz: ['travel', 'events', 'nature'], events: ['music', 'culture', 'nz'] };
/* brand-new subjects (not on any list), each tied to the topics that make it a likely fit */
const NEW = [['Tiny houses', ['diy', 'travel', 'garden']], ['Lighthouses', ['travel', 'nature', 'nz']], ['Volcanoes', ['science', 'nature', 'nz']], ['Shipwrecks', ['learn', 'science', 'travel']],
  ['Abandoned places', ['travel', 'learn', 'culture']], ['Optical illusions', ['games', 'science', 'learn']], ['Magic tricks', ['sitcoms', 'games', 'culture']], ['Origami', ['creative', 'craft', 'kids']],
  ['Bonsai', ['garden', 'creative', 'nature']], ['Terrariums', ['garden', 'diy', 'creative']], ['Pottery', ['creative', 'craft', 'culture']], ['Candle making', ['craft', 'creative', 'diy']],
  ['Birdwatching', ['nature', 'outdoors', 'garden']], ['Whales and dolphins', ['nature', 'travel', 'science']], ['Penguins', ['nature', 'kids', 'dogs']], ['Cruise ships', ['travel', 'culture']],
  ['Ancient Egypt', ['learn', 'culture', 'science']], ['Dinosaurs', ['science', 'kids', 'learn']], ['Northern lights', ['nature', 'scifi', 'travel']], ['Retro 80s', ['music', 'sitcoms', 'collect']],
  ['Classic cartoons', ['sitcoms', 'kids', 'culture']], ['Escape rooms', ['games', 'boardg', 'events']], ['Miniatures', ['collect', 'craft', 'fantasy']], ['Lego builds', ['kids', 'collect', 'creative']],
  ['Street art', ['creative', 'culture', 'travel']], ['Weird food', ['food', 'travel', 'sitcoms']], ['Food art', ['food', 'creative', 'kids']], ['Hot air balloons', ['travel', 'outdoors', 'events']],
  ['Castles', ['travel', 'learn', 'fantasy']], ['Robots', ['tech', 'scifi', 'science']], ['Deep sea creatures', ['science', 'nature', 'scifi']], ['Cats', ['dogs', 'nature', 'kids']],
  ['Horses', ['nature', 'outdoors', 'kids']], ['Book nooks', ['creative', 'learn', 'diy']], ['Cake decorating', ['food', 'creative', 'craft']], ['Vintage fashion', ['collect', 'culture', 'creative']],
  ['Treehouses', ['diy', 'kids', 'outdoors']], ['Glamping', ['outdoors', 'travel']], ['Fairy gardens', ['garden', 'kids', 'fantasy']], ['Model trains', ['collect', 'cars', 'diy']],
  ['Board game cafés', ['boardg', 'games', 'events']], ['Stargazing', ['scifi', 'science', 'outdoors']], ['Movie trivia', ['sitcoms', 'culture', 'games']], ['Theme parks', ['travel', 'kids', 'events']]];
const isOn = t => TOPIC[t] && (PICK ? PICK.includes(t) : (!OPTIN.has(t) || optedIn(t)));
const known = s => INTERESTS.some(x => x.re.test(s)) || Object.values(TOPIC).some(T => String(T[1]).toLowerCase() === s.toLowerCase());
const added = () => ls.get('discAdd', []);
function picks() {
  if (L.n < 8) return [];
  const no = new Set(ls.get('discNo', [])), have = new Set(added().map(a => a.term.toLowerCase())), out = [];
  const liked = Object.entries(L.t).filter(([, v]) => v > 0);
  const ts = {}; for (const [t, v] of liked) for (const r of REL[t] || []) if (!isOn(r) && !no.has('t:' + r) && r !== 'candy') ts[r] = (ts[r] || 0) + v;
  Object.entries(ts).sort((a, b) => b[1] - a[1]).slice(0, 2).filter(([, v]) => v >= 4).forEach(([t]) => out.push({ k: 't:' + t, kind: 'topic', t, label: TOPIC[t][1], em: TOPIC[t][2] }));
  const ns = NEW.map(([s, rel]) => [s, rel.reduce((a, r) => a + Math.max(0, (L.t[r] || 0)), 0)]).filter(([s, v]) => v >= 4 && !no.has('n:' + s) && !have.has(s.toLowerCase()));
  ns.sort((a, b) => b[1] - a[1] + (Math.random() - .5) * 2).slice(0, 2).forEach(([s]) => out.push({ k: 'n:' + s, kind: 'new', label: s, em: '🆕' }));
  const ws = Object.entries(L.w).filter(([w, v]) => v >= 6 && w.length > 4 && !no.has('n:' + w) && !have.has(w) && !known(w) && !BAD.test(w) && !SPORT.test(w) && !LIFE_MONEY.test(w)).sort((a, b) => b[1] - a[1]);
  if (ws[0] && out.length < 5) { const s = ws[0][0][0].toUpperCase() + ws[0][0].slice(1); out.push({ k: 'n:' + ws[0][0], kind: 'new', label: s, em: '💡', why: 'keeps coming up in what you like' }); }
  return out.slice(0, 5);
}
function discCard(i) {
  return `<article class="card xc disc" data-id="${esc(i.id)}">${xHead('🧭', 'New ideas ' + forMe(), (myName() ? myName() + ', based on' : 'Based on') + ' what you’ve been enjoying – tap to untick any', 'Discover')}
    <div class="bd"><div class="obg">${i.p.map(s => `<button class="obt on" data-dsc="${esc(s.k)}" style="--c1:${s.kind === 'topic' ? TOPIC[s.t][3] : '#7c3aed'};--c2:${s.kind === 'topic' ? TOPIC[s.t][4] : '#ec4899'}"><span>${s.em}</span>${esc(s.label)}${s.kind === 'new' ? ' <small>new</small>' : ''}</button>`).join('')}</div>
    <div class="xbtns"><button class="btn pri" id="dscadd">Add these</button><button class="btn" id="dscno">Not for me</button></div></div></article>`;
}
document.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('[data-dsc],#dscadd,#dscno'); if (!t) return;
  if (t.dataset.dsc) { t.classList.toggle('on'); return; }
  const all = [...document.querySelectorAll('[data-dsc]')], on = t.id === 'dscadd' ? all.filter(b => b.classList.contains('on')).map(b => b.dataset.dsc) : [];
  ls.set('discNo', [...new Set([...ls.get('discNo', []), ...all.map(b => b.dataset.dsc).filter(k => !on.includes(k))])]);
  const A = added();
  for (const k of on) { const [kind, v] = [k.slice(0, 1), k.slice(2)];
    if (kind === 't') { if (PICK) { if (!PICK.includes(v)) PICK.push(v); ls.set('pick', PICK); } else ls.set('optIn', [...new Set([...ls.get('optIn', []), v])]); }
    else if (!A.some(a => a.term.toLowerCase() === v.toLowerCase())) A.push({ term: v[0].toUpperCase() + v.slice(1), k: 'misc', at: Date.now() }); }
  ls.set('discAdd', A); ls.set('discDay', day());
  if (typeof famPrefsChanged === 'function') famPrefsChanged();
  toast(on.length ? '🧭 Added – new cards will start showing soon' : 'OK – I’ll find other ideas');
  try { setupYou(); refreshYou(); } catch (err) { } draw(); });
/* show the card at most every 3 days, a few cards down All */
const lnCard = window.card; window.card = function (i) { return i && i.x === 'disc' ? discCard(i) : lnCard(i); };
const lnFest = window.festive;
window.festive = function (order, nPins) {
  order = lnFest ? lnFest(order, nPins) : order; if (order.length < 12 || day() - ls.get('discDay', 0) < 3) return order;
  const p = picks(); if (p.length < 2) return order;
  const out = order.slice(); out.splice(Math.min(Math.max(2, nPins) + 8, out.length), 0, { id: 'disc-' + day(), x: 'disc', p, topic: 'family' }); return out;
};
window.ibLearn = { get: () => L, picks };
})();
