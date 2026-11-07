/* 1.9.79 📍 Explain labels: only genuine proper nouns an NZ family might question – specific places,
   named people, named organisations, acronyms. Never everyday words ("rubbish", "looking"), even when a
   headline capitalises them. Wikipedia-backed (factual); Workers AI optional for picking candidates. */
import { AI_MODEL } from './ai.js';
import { COMMON_EN, isCommonWord } from './common-en.js';

export const EX_TOPICS = new Set(['nz', 'election', 'science', 'tech', 'travel', 'social', 'events', 'food', 'fitness', 'parent', 'culture', 'learn', 'diy', 'outdoors', 'nature']);
export const EX_PER_RUN = 10;
export const EX_AI_DAY = 24;

const SKIP = new Set([
  'new zealand', 'aotearoa', 'auckland', 'wellington', 'christchurch', 'hamilton', 'dunedin', 'tauranga',
  'whangarei', 'whangārei', 'rotorua', 'napier', 'nelson', 'invercargill', 'palmerston north', 'new plymouth',
  'northland', 'waikato', 'bay of plenty', "hawke's bay", 'hawkes bay', 'taranaki', 'manawatu', 'manawatū',
  'wairarapa', 'marlborough', 'west coast', 'canterbury', 'otago', 'southland', 'north island', 'south island',
  'stewart island', 'zealand', 'australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'canberra', 'london', 'paris',
  'new york', 'tokyo', 'beijing', 'shanghai', 'china', 'japan', 'india', 'usa', 'united states', 'america',
  'united kingdom', 'uk', 'england', 'scotland', 'wales', 'ireland', 'canada', 'mexico', 'fiji', 'samoa',
  'tonga', 'papua new guinea', 'indonesia', 'singapore', 'thailand', 'vietnam', 'philippines', 'korea',
  'italy', 'spain', 'france', 'germany', 'austria', 'switzerland', 'slovenia', 'croatia', 'greece', 'turkey',
  'brazil', 'argentina', 'chile', 'peru', 'colombia', 'nigeria', 'kenya', 'egypt', 'south africa', 'iran',
  'iraq', 'israel', 'palestine', 'saudi arabia', 'russia', 'ukraine', 'poland', 'sweden', 'norway', 'denmark',
  'finland', 'portugal', 'belgium', 'netherlands', 'taiwan', 'hong kong', 'malaysia', 'pakistan', 'bangladesh',
  'europe', 'asia', 'africa', 'alps', 'amazon', 'antarctica', 'arctic', 'pacific', 'atlantic', 'mediterranean',
  'nz herald', 'the new zealand herald', 'stuff', 'rnz', 'radio new zealand', 'tvnz', 'three', 'threenow',
  'the spinoff', '1news', 'newshub', 'bbc', 'cnn', 'reuters', 'associated press', 'wikipedia', 'youtube',
  'facebook', 'instagram', 'tiktok', 'google', 'microsoft', 'apple', 'amazon', 'netflix', 'spotify',
  'christmas', 'easter', 'halloween', 'new year', "new year's", 'anzac day', 'waitangi day',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'state highway', 'highway', 'motorway', 'parliament', 'government', 'council', 'police', 'labour', 'national',
  'the greens', 'greens', 'maori party', 'māori party', 'prime minister', 'minister', 'mayor',
  'earth', 'moon', 'sun', 'mars', 'jupiter', 'saturn', 'covid', 'covid-19', 'coronavirus', 'queens'
]);
const SKIP_ACRO = new Set(['NZ', 'UK', 'US', 'USA', 'UN', 'EU', 'TV', 'AI', 'GPS', 'USB', 'PDF', 'FAQ', 'CEO', 'MP', 'MPs', 'GDP', 'RNA', 'DNA', 'COVID', 'HIV', 'WHO']);
const STOP_CAP = new Set(['The', 'A', 'An', 'In', 'On', 'At', 'To', 'For', 'Of', 'And', 'Or', 'But', 'With', 'From', 'By', 'As', 'After', 'Before', 'Near', 'Over', 'Under', 'Into', 'Across', 'During', 'While', 'When', 'Where', 'Who', 'What', 'Why', 'How', 'This', 'That', 'These', 'Those', 'Its', 'His', 'Her', 'Their', 'Our', 'Your', 'New', 'Old', 'North', 'South', 'East', 'West', 'Great', 'Big', 'Little', 'State', 'Highway', 'Road', 'Street', 'Avenue', 'Drive', 'Lane', 'Court', 'Says', 'Say', 'Said', 'Report', 'Reports', 'Update', 'Live', 'Breaking', 'Watch', 'Video', 'Photo', 'Photos', 'Picture', 'We', 'May', 'Have', 'Been', 'Was', 'Were', 'Are', 'Is', 'Be', 'Being', 'Do', 'Does', 'Did', 'Will', 'Would', 'Could', 'Should', 'Can', 'Looking', 'Look', 'Origin', 'Consciousness', 'Wrong', 'Place', 'Take', 'Your', 'Storm', 'Rubbish', 'Closed', 'Closes', 'Crash', 'Cattle', 'Truck', 'Delays', 'Expected']);

const PLACE_RE = /\b(town|village|suburb|city|settlement|localit|community|district|region|island|harbour|harbor|bay|lake|river|mountain|mount|hill|valley|peninsula|cape|beach|park|forest|reserve|province|county|borough|commune|municipality|headland|country|nation|state of|in .+ new zealand)\b/i;
const PERSON_RE = /\b(politician|minister|mayor|actor|actress|singer|musician|songwriter|writer|author|journalist|activist|athlete|player|coach|scientist|doctor|professor|ceo|founder|director|artist|comedian|presenter|footballer|cricketer|born \d{4})\b/i;
const ORG_RE = /\b(party|organisation|organization|company|agency|ministry|department|council|authority|association|foundation|institute|university|college|school|museum|charity|ngo|corporation|group|band|orchestra|committee|board|trust|club)\b/i;

function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['']/g, "'").trim(); }
function isSkip(t) { const n = norm(t); return !n || n.length < 3 || SKIP.has(n) || /^state highway\b/.test(n); }
function isAcronym(t) { return /^[A-Z]{2,5}$/.test(t); }
function isMulti(t) { return /\s/.test(t); }
/** Everyday English word (single token) – never label these. */
function isEveryday(t) {
  if (isAcronym(t)) return false;
  const n = norm(t);
  if (isCommonWord(n) || COMMON_EN.has(n)) return true;
  // multi-word of only common English words (e.g. "Grand Theft Auto", "liquefied natural gas") → not a proper noun
  // allow when a place/org signal word is present (Alfriston College, Barryscourt Castle, Nelson Hospital)
  if (isMulti(t)) {
    const parts = n.split(/\s+/);
    const PLACE_WORD = /^(castle|college|university|hospital|museum|bridge|harbour|harbor|bay|beach|island|mountain|river|park|square|cathedral|church|school|theatre|theater|stadium|airport|station|palace|abbey|tower|head|point|cape|mount|lake|valley|forest|desert|strait|channel|gulf|sea|ocean|peninsula|plateau|falls|creek|brook|hill|ridge|peak|pass|avenue|street|road|gardens?|zoo|aquarium|observatory|laboratory|institute|academy)$/;
    if (parts.some(w => PLACE_WORD.test(w))) return false;
    if (parts.every(w => COMMON_EN.has(w) || isCommonWord(w) || w.length <= 2)) return true;
    return false;
  }
  return false;
}

/** Does this word appear capitalised mid-sentence in the blurb (not just title-case headline)? */
function midSentenceCap(term, desc) {
  const d = String(desc || '');
  if (!d) return false;
  const re = new RegExp('(?:[.!?]["\']?\\s+|[,:;]\\s+|\\s)(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b');
  // capitalised after punctuation or mid-clause comma, or after lowercase word
  const re2 = new RegExp('(?:[a-zà-öø-ÿ]["\']?\\s+|[,:;]\\s+)(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b');
  return re2.test(d) || (/\bin\s+/.test(d) && new RegExp('\\bin\\s+' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(d));
}

export function heuristicCands(title, desc) {
  const text = String(title || ''), blurb = String(desc || '').slice(0, 320);
  const out = [], seen = new Set();
  const add = (t, k) => {
    t = String(t || '').replace(/\s+/g, ' ').replace(/[.,;:!?]+$/g, '').trim();
    if (!t || t.length < 3 || t.length > 48 || isSkip(t) || seen.has(norm(t))) return;
    if (/^\d/.test(t) || /https?:/i.test(t)) return;
    if (isEveryday(t)) return; // never "Looking", "Rubbish", "Stream"…
    if (isMulti(t)) {
      const parts = t.split(/\s+/), conn = /^(of|de|van|von|da|di|le|la|el|the)$/i;
      const content = parts.filter(p => !conn.test(p));
      // need ≥2 content tokens and at least one that is not an everyday/STOP word (a real proper noun)
      if (content.length < 2 || !content.some(p => !STOP_CAP.has(p) && !isEveryday(p))) return;
      if (content.every(p => STOP_CAP.has(p) || isEveryday(p))) return;
    } else if (!isAcronym(t) && k !== 'place' && !midSentenceCap(t, blurb)) {
      return; // bare title-case headline word is not enough
    }
    seen.add(norm(t)); out.push({ t, k: k || 'place' });
  };
  // "in/at/near/from Gordonton" – strong place signal (title or blurb)
  for (const src of [text, blurb]) {
    for (const m of src.matchAll(/\b(?:in|at|near|from|outside|towards|toward|of)\s+([A-Z][A-Za-zà-öø-ÿ'’\-]+(?:\s+[A-Z][A-Za-zà-öø-ÿ'’\-]+){0,3})\b/g)) add(m[1], 'place');
  }
  // multi-word proper nouns in the title
  for (const m of text.matchAll(/\b([A-Z][a-zà-öø-ÿ'’\-]+(?:\s+(?:of|de|van|von|da|di|le|la|el|the)\s+)?(?:\s*[A-Z][a-zà-öø-ÿ'’\-]+)+)\b/g)) {
    if (!STOP_CAP.has(m[1].split(/\s+/)[0])) add(m[1], 'place');
  }
  // ALL-CAPS acronyms (ACT, NZTA…)
  for (const m of text.matchAll(/\b([A-Z]{2,5})\b/g)) if (!SKIP_ACRO.has(m[1])) add(m[1], 'org');
  // single Cap mid-blurb only (never bare title-case headline words)
  for (const m of blurb.matchAll(/\b([A-Z][a-zà-öø-ÿ'’\-]{3,})\b/g)) {
    if (!STOP_CAP.has(m[1]) && midSentenceCap(m[1], blurb)) add(m[1], 'place');
  }
  const multi = new Set(out.filter(x => isMulti(x.t)).map(x => norm(x.t)));
  return out.filter(x => {
    if (isMulti(x.t) || isAcronym(x.t)) return true;
    for (const m of multi) if (m.split(' ').includes(norm(x.t))) return false;
    return true;
  }).slice(0, 5);
}

async function wikiSummary(term, get) {
  const slug = encodeURIComponent(String(term).replace(/ /g, '_'));
  try {
    const r = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, { ms: 7000 });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || d.type !== 'standard') return null;
    const extract = String(d.extract || '').replace(/\s+/g, ' ').trim();
    if (extract.length < 40 || /may refer to|can refer to|disambiguation/i.test(extract)) return null;
    const desc = String(d.description || '');
    const thumb = d.thumbnail && d.thumbnail.source && !/\.svg(\?|$)/i.test(d.thumbnail.source) ? d.thumbnail.source : '';
    const url = (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || ('https://en.wikipedia.org/wiki/' + slug);
    return { title: d.title || term, extract, desc, thumb, url, coords: d.coordinates || null, type: d.type };
  } catch (e) { return null; }
}

function kindOf(cand, wiki) {
  const blob = (wiki.desc || '') + ' ' + (wiki.extract || '').slice(0, 160);
  // Wikipedia evidence wins – never trust the candidate kind alone (headlines capitalise ordinary words)
  if (wiki.coords || PLACE_RE.test(wiki.desc || '') || PLACE_RE.test(blob)) return 'place';
  if (PERSON_RE.test(wiki.desc || '') || PERSON_RE.test(blob)) return 'person';
  if (ORG_RE.test(wiki.desc || '') || (isAcronym(cand.t) && ORG_RE.test(blob))) return 'org';
  return null;
}

function question(t, k) {
  if (k === 'place') return 'Where is ' + t + '?';
  if (k === 'person') return 'Who is ' + t + '?';
  return 'What is ' + t + '?';
}

function answerFrom(wiki, k) {
  let a = wiki.extract;
  const parts = a.split(/(?<=[.!?])\s+/).filter(Boolean);
  a = parts.slice(0, 2).join(' ');
  if (k === 'place' && wiki.desc && /in |of /i.test(wiki.desc) && !new RegExp(wiki.desc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(a.slice(0, 80))) {
    a = wiki.desc.replace(/^./, c => c.toUpperCase()) + '. ' + (parts[0] || a);
  }
  if (a.length > 280) a = a.slice(0, 277).replace(/\s+\S*$/, '') + '…';
  return a.trim();
}

/** Strict gate: proper noun + Wikipedia says place/person/org. Exported for publicFeed purge. */
export function accept(c, w, k) {
  if (!c || !w || !k) return false;
  if (!['place', 'person', 'org'].includes(k)) return false;
  if (isSkip(w.title) || isSkip(c.t)) return false;
  if (isEveryday(c.t) || isEveryday(w.title)) return false;
  if (w.type && w.type !== 'standard') return false;
  const blob = (w.desc || '') + ' ' + (w.extract || '').slice(0, 160);
  if (k === 'place') return !!(w.coords || PLACE_RE.test(w.desc || '') || PLACE_RE.test(blob));
  if (k === 'person') return PERSON_RE.test(w.desc || '') || PERSON_RE.test(blob);
  if (k === 'org') return ORG_RE.test(w.desc || '') || isAcronym(c.t);
  return false;
}

/** Re-filter a stored ex entry (purge rubbish/looking etc. at serve time). */
export function goodEx(x) {
  if (!x || !x.a || !x.t || !x.k) return false;
  if (!['place', 'person', 'org'].includes(x.k)) return false;
  if (isSkip(x.t) || isEveryday(x.t)) return false;
  if (/^(zealand|europe|asia|africa|america|antarctica|looking|rubbish|stream|hospital|life|tower|sword|congress|alps|queens)$/i.test(x.t)) return false;
  // answer must look like a real explanation, not a dictionary definition of a common noun
  if (/^(a|an|the)\s+\w+\s+is\s+(a|an)\s+(act|process|capacity|continuous|healthcare|formal meeting)\b/i.test(x.a || '')) return false;
  // never label video games / media franchises / chemical products as places or people
  if (/\b(video game|video-game|franchise|role-?playing|action-adventure|first-person|computer game|console)\b/i.test(x.a || '')) return false;
  if (/\b(liquefied|fossil fuel|natural gas|chemical compound|hydrocarbon)\b/i.test(x.t + ' ' + (x.a || ''))) return false;
  return true;
}

async function aiPick(env, title, desc, dayState) {
  if (!env.AI || (dayState.n || 0) >= EX_AI_DAY) return null;
  const sys = `You help a New Zealand family app decide which names in a news headline need a short "what's that?" label.
Pick at most 2 PROPER NOUNS a typical NZ family member might not know: obscure towns/villages/suburbs, lesser-known people, named organisations, or uncommon acronyms (e.g. Gordonton, ACT, NZTA, Oscar Kightley).
NEVER pick everyday English words (rubbish, looking, stream, hospital, life, crash, truck, road, police, warning…), even if capitalised in a headline.
Skip well-known places (Auckland, Wellington, Christchurch, Hamilton, Dunedin, Whangārei, New Zealand, North Island, South Island, Australia, Sydney, London, Europe) and well-known media (NZ Herald, Stuff, RNZ, TVNZ).
k must be one of: place, person, org.
Reply with JSON only: [{"t":"Gordonton","k":"place"}] or []. No Māori words. No commentary.`;
  const user = `Headline: ${String(title || '').slice(0, 180)}\nBlurb: ${String(desc || '').slice(0, 220)}`;
  try {
    const r = await env.AI.run(AI_MODEL, { messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: 80, temperature: 0.1 });
    dayState.n = (dayState.n || 0) + 1;
    let txt = String((r && (r.response || (r.result && r.result.response))) || '');
    if (txt && typeof r.response === 'object') return Array.isArray(r.response) ? r.response : (r.response.terms || null);
    const m = txt.match(/\[[\s\S]*\]/); if (!m) return null;
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return null;
    return arr.map(x => ({ t: String(x.t || '').trim(), k: ['place', 'person', 'org'].includes(x.k) ? x.k : 'place' }))
      .filter(x => x.t && !isSkip(x.t) && !isEveryday(x.t)).slice(0, 2);
  } catch (e) { return null; }
}

export async function enrichExplain(st, env, get) {
  const nzDay = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
  if (st.exAiDay !== nzDay) { st.exAiDay = nzDay; st.exAiN = 0; }
  // 1.9.79: wipe loose labels (rubbish/looking) once, then re-enrich
  if (st.exVer !== 6) {
    for (const i of st.items) { delete i.ex; delete i.exc; }
    st.exWiki = {}; st.exVer = 6;
  }
  const dayState = { n: st.exAiN || 0 };
  const cache = st.exWiki || (st.exWiki = {});
  const placey = i => /\b(?:in|at|near|from)\s+[A-Z]/.test(i.t || '') ? 1 : 0;
  const todo = st.items.filter(i => !i.exc && i.t && EX_TOPICS.has(i.topic) && i.kind !== 'video' && i.kind !== 'tip' && i.kind !== 'event' && i.kind !== 'tv')
    .sort((a, b) => placey(b) - placey(a) || (b.first || b.at || 0) - (a.first || a.at || 0))
    .slice(0, EX_PER_RUN);
  let n = 0;
  for (const i of todo) {
    n++;
    let cands = await aiPick(env, i.t, i.s, dayState);
    const heur = heuristicCands(i.t, i.s);
    const seenC = new Set(); const merged = [];
    for (const c of [...(cands || []), ...heur]) {
      const k = norm(c.t); if (!k || seenC.has(k) || isEveryday(c.t)) continue; seenC.add(k); merged.push(c);
    }
    cands = merged.sort((a, b) => (b.k === 'place') - (a.k === 'place')).slice(0, 4);
    const ex = [];
    for (const c of cands) {
      if (ex.length >= 2) break;
      const key = norm(c.t);
      let w = cache[key];
      if (w === undefined) {
        w = await wikiSummary(c.t, get);
        cache[key] = w || null;
      }
      if (!w) continue;
      if (isSkip(w.title) || isEveryday(w.title)) continue;
      const k = kindOf(c, w);
      if (!accept(c, w, k)) continue;
      const a = answerFrom(w, k);
      if (!a || a.length < 40) continue;
      const label = w.title.length < 40 ? w.title : c.t;
      if (isEveryday(label) || isSkip(label)) continue;
      ex.push({ t: label, k, q: question(label, k), a, img: w.thumb || '', url: w.url || '' });
    }
    i.ex = ex.filter(goodEx);
    i.exc = 1;
  }
  // purge any already-stored ex that fails the new rules (items not in this run)
  for (const i of st.items) {
    if (i.ex && i.ex.length) {
      i.ex = i.ex.filter(goodEx);
      if (!i.ex.length) delete i.ex;
    }
  }
  st.exAiN = dayState.n;
  const keys = Object.keys(cache);
  if (keys.length > 400) for (const k of keys.slice(0, keys.length - 300)) delete cache[k];
  return n;
}
