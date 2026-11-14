/* 1.9.0 Keep-coming-back features for the family network, all in the Family Durable Object (free plan):
   web push (empty pushes; the phone fetches its own inbox with its token), the daily question / photo challenge,
   daily trivia, On this day, visit streaks & badges, birthdays & family events, and the per-member age / life stage
   Shane sets (admin-only; only used as a gentle nudge for suggested interests and ranking). */
import { dailyPoll } from './polls.js';
import { dailyPrompt, nzDay } from './daily.js';
import { BANK } from './trivia.js';
import { EASY } from './trivia_easy.js';
import { FRIEND_NOTES, shareVisible, sees, gameIds } from './circle.js'; // 1.9.230 friends

export const VAPID_PUBLIC = 'BGFa-WGEmSF-yZ-9PX6RjtuTc2SK7biQ95mUL--DgXy60LAB9cuWvi5D-Yy2kfZrZ-lNya048_1lv_JR9cKTcoU';
export const TAGS = { dq: /^dq\d{8}$/ }; // photo-post tags; a '🔨 Reno' tag later is one more line here: reno: /^reno$/
export const NOTE_TYPES = ['mine', 'reply', 'photo', 'daily', 'dates', 'streak', 'weather', 'event', 'appt', 'alerts', 'comeback', 'scrabble', 'sugar'];
const DEF_NP = { mine: 1, reply: 1, photo: 1, daily: 1, dates: 1, streak: 0, weather: 0, event: 1, appt: 1, alerts: 1, comeback: 1, scrabble: 1, sugar: 1, qFrom: 22, qTo: 7 }; // 1.9.18 alerts = ⚠️ orange/red Whangārei warnings + ⚡ unplanned outages (on by default) // event = reminders for events you tapped ⭐ Interested on // weather = red-warning alerts, opt-in // the streak reminder is opt-in // 1.9.214 scrabble = your turn in a family game, on by default, still waits for quiet hours
const BATCH_MS = 30 * 60e3;

export const STAGES = { // what each life stage suggests (topics to offer + the interests inside them) and the soft ranking nudge
  'young-adult': { label: 'Young adult', topics: ['music', 'vgames', 'travel', 'food'], ints: ['Cooking', 'Baking', 'Concerts', 'Cosy games'], boost: { music: 1.12, vgames: 1.1, travel: 1.1, food: 1.08 } },
  'young-kids': { label: 'Young kids (baby to primary)', topics: ['parent', 'kids'], ints: ['Baby & toddler', 'Primary-age kids', 'Autism & sensory parenting', 'Kids activities', 'Sensory-friendly', 'Family days out'], boost: { parent: 1.15, kids: 1.15 } },
  'teens': { label: 'Teenagers at home', topics: ['parent'], ints: ['Parenting teens'], boost: { parent: 1.1 } },
  'grandparent': { label: 'Adult kids & grandchildren', topics: ['parent', 'kids', 'fitness'], ints: ['Grandparenting', 'Kids activities', 'Family days out', 'Health', 'Exercise', 'Walking'], boost: { parent: 1.08, kids: 1.08, fitness: 1.08 } },
};
export const AWARD_FROM = Date.parse('2026-11-02T00:00:00+13:00');
export const AGES = ['', 'under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
export const EXTRA = ['crochet', 'animals', 'parent', 'rainbow', 'social', 'tarot', 'craft', 'vgames', 'boardg', 'fantasy', 'music', 'travel', 'food', 'kids', 'fitness', 'garden', 'sitcoms', 'scifi', 'crystals']; // topics Shane can suggest for one person
/* 1.9.24 situation (Shane sets it; several can apply; unknown = unset, nothing is guessed). It only changes ranking on that
   person's own phone: the phone gets soft boosts and a few yes/no flags, never the age, stage or situation labels. */
export const SITS = { single: 'Single', couple: 'Partner / couple', 'young-kids': 'Young kids at home', teens: 'Teenagers at home', grandkids: 'Grown-up kids & grandkids' };
const SIT_BOOST = { 'young-kids': { parent: 1.15, kids: 1.15 }, teens: { parent: 1.1 }, grandkids: { parent: 1.06, kids: 1.08, garden: 1.05 }, single: { social: 1.08, travel: 1.08, music: 1.06 }, couple: { travel: 1.06, food: 1.05 } };
export function nudgeFor(stage, sugg, sit, age) { // only suggestions and soft weights go to the phone (never the age, stage or situation itself)
  const s = STAGES[stage], x = (sugg || '').split(',').filter(t => EXTRA.includes(t)), st = String(sit || '').split(',').filter(k => SITS[k]);
  if (!s && !x.length && !st.length && !age) return null;
  const PSEUDO = { crochet: ['craft', { Crochet: 1.7 }], animals: ['pets', { Horses: 1.6, 'Cute & funny pets': 1.4 }], crystals: ['tarot', { 'Crystals & gemstones': 1.8 }] }, ib = {}; // 1.9.27 interest boosts Shane chose (🧶 crochet & amigurumi, 🐴🐱🐶 cute animals)
  for (const k of x) if (PSEUDO[k]) Object.assign(ib, PSEUDO[k][1]);
  const xt = x.map(k => PSEUDO[k] ? PSEUDO[k][0] : k);
  const topics = [...new Set([...(s ? s.topics : []), ...xt])], boost = { ...(s ? s.boost : {}) }; for (const t of xt) boost[t] = Math.max(boost[t] || 1, 1.1);
  for (const k of st) for (const [t, v] of Object.entries(SIT_BOOST[k])) boost[t] = Math.max(boost[t] || 1, v);
  const young = age === '18–24' || age === 'under 18' || stage === 'young-adult', older = ['45–54', '55–64', '65+'].includes(age);
  const kids = st.includes('young-kids') || stage === 'young-kids', teens = st.includes('teens') || stage === 'teens', grand = st.includes('grandkids') || stage === 'grandparent';
  if (young) { boost.vgames = Math.max(boost.vgames || 1, 1.08); boost.music = Math.max(boost.music || 1, 1.08); }
  if (older) { boost.garden = Math.max(boost.garden || 1, 1.06); boost.diy = Math.max(boost.diy || 1, 1.05); }
  return { topics, ints: [...new Set([...(s ? s.ints : []), ...Object.keys(ib)])], boost, ib, sit: { kids: kids ? 1 : 0, teens: teens ? 1 : 0, grand: grand ? 1 : 0, single: st.includes('single') ? 1 : 0, couple: st.includes('couple') ? 1 : 0, young: young ? 1 : 0, older: older ? 1 : 0 } };
}
/* ---- 1.9.0 car due dates Shane chose to share with one person (only plate, model, WOF, rego and service dates, a small photo) ---- */
const ISO = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
const PLATE = v => String(v || '').replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
export function cleanCarShare(c) {
  if (!c || !PLATE(c.plate)) return null;
  const st = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const km = v => { const n = Math.round(Number(String(v == null ? '' : v).replace(/[^\d.]/g, ''))); return n > 0 && n < 2e6 ? n : null; };
  const photo = typeof c.photo === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(c.photo) && c.photo.length < 220000 ? c.photo : '';
  const o = { plate: PLATE(c.plate), name: st(c.name, 40), model: st(c.model, 60), year: st(c.year, 4), colour: st(c.colour, 24), hex: /^#[0-9a-f]{6}$/i.test(c.hex || '') ? c.hex : '', wof: ISO(c.wof), rego: ISO(c.rego), svc: ISO(c.svc), svcKm: km(c.svcKm), photo, updated: Math.min(+c.updated || Date.now(), Date.now() + 3e5) };
  if (c.wofSt && typeof c.wofSt === 'object' && ['due', 'doing', 'done'].includes(c.wofSt.st)) o.wofSt = { st: c.wofSt.st, recheck: ISO(c.wofSt.recheck) };
  return o;
}

const MONEY_RE = /\$|\b(bills?|pay(ment|ing)?|invoice|loan|bank|rent|mortgage|insurance|ird|tax|debt|budget|power bill|direct debit)\b(?!\s+(st|street|rd|road)\b)/i;
export function cleanSAppt(x) {
  if (!x || typeof x !== 'object') return null;
  const st = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const id = st(x.id, 64), t = st(x.title, 80), date = ISO(x.date), time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(x.time || '')) ? x.time : '';
  if (!/^[\w:.-]{3,64}$/.test(id) || !t || !date || MONEY_RE.test(t)) return null;
  return { id, t, date, time, place: /\$\s?\d/.test(x.place || '') ? '' : st(x.place, 100), kind: ['doctor', 'dentist', 'other'].includes(x.kind) ? x.kind : 'other' };
}
const nzMs = (date, hm) => { const g = Date.parse(date + 'T' + hm + ':00Z'); const off = (d => Date.parse(d.toLocaleString('sv-SE', { timeZone: 'Pacific/Auckland' }).replace(' ', 'T') + 'Z') - d.getTime())(new Date(g)); return g - off; };
const nzHour = t => +new Date(t).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hourCycle: 'h23' });
const dayKey = t => nzDay(t).replace(/-/g, '');
const dnum = k => Math.floor(Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8)) / 864e5);
const keyOf = n => { const d = new Date(n * 864e5); return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0'); };

/* ---- trivia: 5 a day, same for everyone, from fixed shuffles of five pools (no repeats for months) ---- */
function seeded(seed) { let x = (seed >>> 0) || 1; return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909), (x ^= x >>> 16) >>> 0) / 4294967296); }
function shuffle(a, seed) { const r = seeded(seed), b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const POOLS_V1 = [['tv', 'film'], ['sci', 'kids'], ['nz', 'geo'], ['music', 'games', 'books'], ['gen', 'hist', 'kids']].map((cats, n) => shuffle(BANK.map((q, i) => [q, i]).filter(([q]) => cats.includes(q[0])), 977 + n * 131));
function triviaV1(key) { // 1.9.0 set: kept only so anyone who already played on 1 Nov 2026 sees the questions they answered
  const n = dnum(key), used = new Set(), out = [];
  POOLS_V1.forEach((pool, s) => { let k = (n * 3 + s * 17) % pool.length; while (used.has(pool[k][1])) k = (k + 1) % pool.length; used.add(pool[k][1]); const q = pool[k][0], opts = shuffle(q.slice(3, 7).map(o => String(o).trim()), n * 31 + s); out.push({ cat: q[0], q: q[2], opts, ans: opts.indexOf(String(q[3]).trim()) }); });
  return out;
}
/* 1.9.1 easier trivia: 4 easy everyday questions a day (NZ, animals/food/home, TV/film/music, science/world) and a 5th that's easy
   on most days and only "medium" one day in three. Hand-written NZ questions + the easiest hand-picked OpenTDB ones; no sport, money or adult themes. */
const PICK_EASY = [43, 140, 145, 152, 166, 170, 181, 238, 250, 266, 427, 430, 435, 442, 450, 458, 459, 462, 465, 467, 474, 475, 481, 556, 558, 561, 573, 579, 590, 597, 598, 606, 609, 612, 613, 620, 789, 793, 795, 805, 808, 821, 830, 836, 841, 843, 847, 849, 855, 1014, 1016, 1018, 1022, 1023, 1025, 1028];
const PICK_MED = [87, 141, 147, 244, 262, 272, 432, 433, 436, 440, 441, 446, 454, 482, 557, 559, 567, 569, 588, 591, 600, 605, 607, 615, 622, 790, 800, 803, 806, 807, 809, 813, 822, 827, 834, 840, 844, 1015, 1020, 1024, 1029, 63, 70, 80, 84, 162, 173];
const EASY_ALL = EASY.map((q, i) => [q, 'e' + i]).concat(PICK_EASY.filter(i => BANK[i]).map(i => [[BANK[i][0], 1, ...BANK[i].slice(2)], 'b' + i]));
const MED_ALL = PICK_MED.filter(i => BANK[i]).map(i => [BANK[i], 'b' + i]);
const byCat = cats => EASY_ALL.filter(([q]) => cats.includes(q[0]));
const POOLS = [byCat(['nz']), byCat(['animals', 'food', 'home', 'kids']), byCat(['tv', 'film', 'music']), byCat(['sci', 'geo', 'gen', 'games'])].map((p, n) => shuffle(p, 1201 + n * 97));
const ANY_EASY = shuffle(EASY_ALL, 4409), MED = shuffle(MED_ALL, 5501);
export const LEGACY_DAY = '20261101', V191_AT = Date.parse('2026-11-01T02:05:27Z'); // plays before 1.9.1 went live keep the old set
export function triviaFor(key, legacy) {
  if (legacy && key <= LEGACY_DAY) return triviaV1(key);
  const n = dnum(key), used = new Set(), out = [];
  const take = (pool, s) => { let k = n % pool.length, g = 0; while (used.has(pool[k][1]) && g++ < pool.length) k = (k + 1) % pool.length; used.add(pool[k][1]); const q = pool[k][0], opts = shuffle(q.slice(3, 7).map(o => String(o).trim()), n * 31 + s); out.push({ cat: q[0], q: q[2], opts, ans: opts.indexOf(String(q[3]).trim()), lvl: q[1] }); };
  POOLS.forEach(take); take(n % 3 === 0 ? MED : ANY_EASY, 4);
  return out;
}
export const TRIVIA_EASY = EASY_ALL.length, TRIVIA_MED = MED_ALL.length;
export const TRIVIA_SIZE = BANK.length;

/* 1.9.1 🏠 Millesha's renovation card: read-only from My App's reno list (the relay's KV, same record millesha.html syncs to).
   Only the jobs list is used – never the phone numbers or anything else stored there. Job names mirror My App's reno.js. */
const RENO_KV = 'reno-v1:90d2e183c7f30bc8fe35f9c1f7f88dc507f6f7e1fe752f828472bbf85d480a31', RENO_DEADLINE = '2026-11-22';
const RENO_ROOMS = [['main', 'Main bedroom', '🛏️'], ['spare', 'Spare bedroom', '🛋️'], ['bath', 'Bathroom', '🛁'], ['hall', 'Hallway', '🚪'], ['lounge', 'Lounge', '📺'], ['dining', 'Dining', '🍽️'], ['kitchen', 'Kitchen', '🍳'], ['pantry', 'Pantry', '🥫'], ['laundry', 'Laundry', '🧺']];
const RENO_JOBS = RENO_ROOMS.flatMap(([k, n, e]) => [['clean', 'Clean'], ['mop', 'Mop ceiling'], ['speckle', 'Apply speckle'], ['sand', 'Sand'], ['ceiling', 'Paint ceiling'], ['walls', 'Paint walls'], ['floor', 'Flooring']].map(([j, jn]) => ({ id: k + '-' + j, area: n, e, job: jn })))
  .concat([['wash', 'House wash'], ['waterblast', 'Waterblasting'], ['decks', 'Clean decks & paths'], ['metal', 'Scrap metal pickup'], ['dump', 'Dump runs']].map(([j, jn]) => ({ id: 'out-' + j, area: 'Outside', e: '🏡', job: jn })));
export function renoSummary(list, now = Date.now()) {
  const by = {}; for (const x of list || []) if (x && x.id) by[x.id] = x;
  const proj = by.project || {}, deadline = /^\d{4}-\d{2}-\d{2}$/.test(proj.deadline || '') ? proj.deadline : RENO_DEADLINE;
  const st = j => (by[j.id] && by[j.id].status) || 'todo', done = RENO_JOBS.filter(j => st(j) === 'done').length, doing = RENO_JOBS.filter(j => st(j) === 'doing').length;
  const pct = Math.min(100, Math.round((done + doing * 0.5) / RENO_JOBS.length * 100)); // the same sum My App's daily reminder uses
  const left = RENO_JOBS.filter(j => st(j) !== 'done').map((j, k) => ({ ...j, st: st(j), who: String((by[j.id] || {}).who || '').slice(0, 30), due: (by[j.id] || {}).due || '', k }));
  left.sort((a, b) => (a.st === 'doing' ? 0 : 1) - (b.st === 'doing' ? 0 : 1) || (a.due || '9') .localeCompare(b.due || '9') || a.k - b.k);
  const upd = Math.max(0, ...Object.values(by).filter(x => x.id !== 'phones').map(x => x.updated || 0));
  return { deadline, done, doing, total: RENO_JOBS.length, left: RENO_JOBS.length - done, pct, finished: done === RENO_JOBS.length, next: left.slice(0, 4).map(({ k, id, ...r }) => r), updated: upd };
}
/* 1.9.2 ⚠️ MetService severe weather (official CAP feed, CC BY 4.0): only alerts whose area covers Whangārei (1.9.3).
   Polled from the 10-minute cron at most every 30 minutes and kept in this Durable Object's own SQLite (no KV writes). */
const CAP_RSS = 'https://alerts.metservice.com/cap/rss';
const tagX = (x, t) => { const m = x.match(new RegExp('<' + t + '>([\\s\\S]*?)</' + t + '>')); return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''; };
const capParam = (x, n) => { const m = x.match(new RegExp('<valueName>' + n + '</valueName>\\s*<value>([^<]*)</value>')); return m ? m[1].trim() : ''; };
/* 1.9.3: only warnings and watches that cover Whangārei. MetService gives each area a polygon, so test real points:
   Whangārei city, plus Kamo/Tikipunga, Onerahi and Hikurangi in the urban area. No polygon: fall back to the area name. */
const WGR_PTS = [[-35.7251, 174.3237], [-35.685, 174.300], [-35.770, 174.365], [-35.597, 174.285]];
function inPoly(lat, lon, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [yi, xi] = pts[i], [yj, xj] = pts[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c; } return c; }
export function coversWhangarei(xml, area) {
  const polys = [...xml.matchAll(/<polygon>([^<]*)<\/polygon>/g)].map(m => m[1].trim().split(/\s+/).map(p => p.split(',').map(Number)).filter(p => p.length === 2 && p.every(isFinite)));
  if (polys.length) return polys.some(pl => pl.length > 2 && WGR_PTS.some(([la, lo]) => inPoly(la, lo, pl)));
  return /whang[aā]rei/i.test(area) || /^\s*northland\s*$/i.test(area);
}
export function capParse(xml, link) {
  const areas = [...xml.matchAll(/<areaDesc>([^<]*)<\/areaDesc>/g)].map(m => m[1].trim()), area = areas.join('; ');
  const region = /northland|whang[aā]rei|kaipara|far north|bay of islands|kaitaia|kaitāia|dargaville/i.test(area) ? 'nl' : /auckland|great barrier/i.test(area) ? 'akl' : 'nz';
  const head = tagX(xml, 'headline'), colour = (capParam(xml, 'ColourCode') || (/red/i.test(head) ? 'Red' : /orange/i.test(head) ? 'Orange' : /watch/i.test(head) ? 'Yellow' : '')).toLowerCase();
  return { id: tagX(xml, 'identifier'), event: tagX(xml, 'event'), head, colour, region, wg: coversWhangarei(xml, area), area: area.slice(0, 300), onset: Date.parse(tagX(xml, 'onset')) || 0, expires: Date.parse(tagX(xml, 'expires')) || 0,
    desc: tagX(xml, 'description').slice(0, 600), act: tagX(xml, 'instruction').slice(0, 300), web: tagX(xml, 'web') || 'https://www.metservice.com/warnings/home', link, status: tagX(xml, 'status'), msgType: tagX(xml, 'msgType') };
}
const NP_URL = 'https://outages.northpower.nz/';
const KAIPARA = /^(dargaville|mangawhai( heads)?|kaiwaka|maungaturoto|ruawai|paparoa|matakohe|te kopuru|baylys beach|kaihu|tinopai|pouto|arapohue|tangowahine|aratapu|mamaranui|hakaru|topuni|oneriri|batley|whakapirau|pahi|kirikopuni|te maire|turiwiri|parore|maropiu|aoroa|kaiiwi lakes|taharoa|omamari|glinks gully|hoanga|kaipara|ararua|tauraroa|waipoua|donnellys crossing|tutamoe|kaihu valley|mititai|tangiteroria|te kopuru)\b/i;
const unwire = x => { // Livewire wraps arrays/collections as [value, {s:'arr'|'clctn'}]
  if (Array.isArray(x)) { if (x.length === 2 && x[1] && typeof x[1] === 'object' && !Array.isArray(x[1]) && 's' in x[1]) return unwire(x[0]); return x.map(unwire); }
  if (x && typeof x === 'object') { const o = {}; for (const k in x) if (k !== 'geometry') o[k] = unwire(x[k]); return o; }
  return x;
};
const unent = t => t.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
export function npParse(html, now = Date.now()) {
  let snap = null;
  for (let i = html.indexOf('wire:snapshot="'); i >= 0; i = html.indexOf('wire:snapshot="', i + 15)) {
    const j = html.indexOf('"', i + 15), raw = html.slice(i + 15, j);
    if (!raw.includes('unplannedElectricityOutages&quot;') || !raw.includes('plannedElectricityOutages&quot;')) continue;
    try { const d = JSON.parse(unent(raw)).data; if (d && 'unplannedElectricityOutages' in d) { snap = d; if (/caseNumber/.test(raw)) break; } } catch (e) { }
  }
  if (!snap) return null;
  const items = [], walk = (x, kind) => { if (Array.isArray(x)) x.forEach(y => walk(y, kind)); else if (x && typeof x === 'object') { if (x.caseNumber || x.outageStartDate) items.push([x, kind]); else for (const k in x) walk(x[k], kind); } };
  walk(unwire(snap.unplannedElectricityOutages), 'unplanned'); walk(unwire(snap.plannedElectricityOutages), 'planned');
  const out = [], seen = new Set();
  for (const [x, kind] of items) {
    const id = kind[0] + ':' + (x.caseNumber || x.title + x.outageStartDate); if (seen.has(id)) continue; seen.add(id);
    const loc = x.location || {}, subs = (Array.isArray(loc.icpsBySuburb) ? loc.icpsBySuburb : []).map(z => String(z.suburb || '').trim()).filter(Boolean);
    const zones = (Array.isArray(loc.icpsByZoneSub) ? loc.icpsByZoneSub : []).map(z => String(z.zoneSub || '').trim()).filter(Boolean);
    const roads = (Array.isArray(loc.icpsByRoad) ? loc.icpsByRoad : []).map(z => String(z.road || '').trim()).filter(Boolean);
    const places = subs.length ? subs : [x.title || ''].filter(Boolean);
    if (places.length && places.every(p => KAIPARA.test(p)) && (!zones.length || zones.every(z => KAIPARA.test(z)))) continue; // Kaipara only – not Whangārei
    const pick = re => { for (const k in x) if (re.test(k) && x[k]) return x[k]; return ''; };
    const etr = Date.parse(pick(/restor|etr|estimated/i)) || 0, cause = String(pick(/cause|shutdownReason|reason/i) || '').slice(0, 120);
    out.push({ id, kind, title: String(x.title || places[0] || 'Outage').slice(0, 80), areas: [...new Set(places)].slice(0, 8), roads: [...new Set(roads)].slice(0, 6), customers: +x.customerCount || subs.reduce((a, _, k) => a + (+loc.icpsBySuburb[k].icpCount || 0), 0) || 0,
      start: Date.parse(x.outageStartDate) || 0, end: Date.parse(x.outageEndDate) || 0, etr, cause, status: String(x.publicStatus || x.status || '').slice(0, 60), msg: String(x.statusMessage || '').slice(0, 200), locality: String(x.localityDescription || '').slice(0, 120), updated: Date.parse(x.updatedDate) || 0 });
  }
  return out;
}
export const MILES = [3, 7, 14, 30, 50, 100];
const MILE_BADGES = [[3, '✨', 'Warming up'], [7, '🔥', 'One week'], [14, '⚡', 'Fortnight'], [30, '🌟', 'One month'], [50, '🏅', 'Fifty days'], [100, '👑', 'Century']];

/* ---- web push: VAPID (ES256) with no payload; the service worker asks /api/push/inbox what to show ---- */
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = s => b64u(new TextEncoder().encode(s));
let KEY = null;
async function vapidKey(env) { if (!KEY) KEY = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']); return KEY; }
export async function sendPush(env, endpoint) {
  const aud = new URL(endpoint).origin, now = Math.floor(Date.now() / 1000);
  const unsigned = b64uStr(JSON.stringify({ typ: 'JWT', alg: 'ES256' })) + '.' + b64uStr(JSON.stringify({ aud, exp: now + 12 * 3600, sub: 'https://shane-my-app.pages.dev/feed/' }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await vapidKey(env), new TextEncoder().encode(unsigned));
  const r = await fetch(endpoint, { method: 'POST', headers: { Authorization: `vapid t=${unsigned}.${b64u(sig)}, k=${VAPID_PUBLIC}`, TTL: '86400', Urgency: 'normal', 'Content-Length': '0' } });
  return r.status;
}

export class Retain {
  constructor(fam) { this.f = fam; const s = fam.sql;
    s.exec(`CREATE TABLE IF NOT EXISTS sappt (id TEXT PRIMARY KEY, mid TEXT NOT NULL, j TEXT NOT NULL, day TEXT, ev INTEGER, at INTEGER, d1 INTEGER DEFAULT 0, h2 INTEGER DEFAULT 0);`);
    s.exec(`CREATE TABLE IF NOT EXISTS intr (mid TEXT NOT NULL, eid TEXT NOT NULL, j TEXT, ev INTEGER, at INTEGER, d1 INTEGER DEFAULT 0, h2 INTEGER DEFAULT 0, PRIMARY KEY (mid, eid));`);
    s.exec(`CREATE TABLE IF NOT EXISTS visits (mid TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (mid, day));
      CREATE TABLE IF NOT EXISTS trivia (mid TEXT NOT NULL, day TEXT NOT NULL, score INTEGER NOT NULL, ans TEXT, at INTEGER, PRIMARY KEY (mid, day));
      CREATE TABLE IF NOT EXISTS pollv (day TEXT NOT NULL, mid TEXT NOT NULL, opt INTEGER NOT NULL, at INTEGER, PRIMARY KEY (day, mid));
      CREATE TABLE IF NOT EXISTS dates (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, title TEXT NOT NULL, mid TEXT, m INTEGER NOT NULL, d INTEGER NOT NULL, y INTEGER, by TEXT, at INTEGER, del INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS subs (endpoint TEXT PRIMARY KEY, mid TEXT NOT NULL, at INTEGER);
      CREATE TABLE IF NOT EXISTS mdev (mid TEXT PRIMARY KEY, mode TEXT, plat TEXT, at INTEGER);
      CREATE TABLE IF NOT EXISTS wx (id TEXT PRIMARY KEY, j TEXT NOT NULL, exp INTEGER, at INTEGER, test INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS pwr (id TEXT PRIMARY KEY, j TEXT NOT NULL, kind TEXT, st INTEGER, en INTEGER, at INTEGER, pushed INTEGER DEFAULT 0, test INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, mid TEXT NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL, card TEXT, at INTEGER NOT NULL, due INTEGER NOT NULL, sent INTEGER DEFAULT 0, seen INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS n_mid ON notes(mid, sent);
      CREATE TABLE IF NOT EXISTS npref (mid TEXT PRIMARY KEY, j TEXT, last INTEGER);
      CREATE TABLE IF NOT EXISTS mprof (mid TEXT PRIMARY KEY, age TEXT, stage TEXT);
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS carshare (plate TEXT PRIMARY KEY, mid TEXT NOT NULL, data TEXT, src TEXT, at INTEGER, by TEXT);`);
    try { s.exec(`ALTER TABLE mprof ADD COLUMN sugg TEXT`); } catch (e) { }
    try { s.exec(`ALTER TABLE mprof ADD COLUMN sit TEXT`); } catch (e) { }
    s.exec(`CREATE TABLE IF NOT EXISTS cbn (mid TEXT PRIMARY KEY, last INTEGER, n INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, txt TEXT)`); // 1.9.24 👋 come-back nudges
    s.exec(`CREATE TABLE IF NOT EXISTS sbonus (mid TEXT PRIMARY KEY, day TEXT, n INTEGER, at INTEGER, shown INTEGER DEFAULT 0)`); // 1.9.24 🎉 one-time +2 day streak award
    try { s.exec(`ALTER TABLE shares ADD COLUMN tag TEXT`); } catch (e) { }
  }
  get sql() { return this.f.sql; }
  one(q, ...a) { return this.f.one(q, ...a); }
  all(q, ...a) { return this.f.all(q, ...a); }
  np(mid) { const r = this.one(`SELECT j,last FROM npref WHERE mid=?`, mid); return { ...DEF_NP, ...(r && r.j ? JSON.parse(r.j) : {}), last: r ? r.last || 0 : 0 }; }
  inQuiet(np, t) { const h = nzHour(t), a = np.qFrom, b = np.qTo; return a === b ? false : a > b ? (h >= a || h < b) : (h >= a && h < b); }
  quietEnd(np, t) { let x = t; for (let i = 0; i < 48 && this.inQuiet(np, x); i++) x += 30 * 60e3; return x; }

  /* queue a notification for someone (only if they've turned push on and that type isn't off). Direct replies go now;
     everything else is batched to at most one push per ~30 minutes; quiet hours wait until they're over. */
  async note(mid, type, text, card = '', urgent = false) {
    if (!this.one(`SELECT endpoint FROM subs WHERE mid=?`, mid)) return;
    if (!FRIEND_NOTES.has(type)) { const r = this.one(`SELECT role FROM members WHERE id=?`, mid); if (!r || r.role === 'friend') return; } // 1.9.230 family notices never go to friends
    const np = this.np(mid); if (!np[type]) return;
    const now = Date.now();
    let due = type === 'reply' ? now : Math.max(now, (np.last || 0) + BATCH_MS);
    if (urgent) due = now; // a red weather warning goes straight away, even in quiet hours
    else if (this.inQuiet(np, due)) { if (type === 'streak') return; due = this.quietEnd(np, due); } // a streak reminder after bedtime is pointless – skip it
    this.sql.exec(`INSERT INTO notes (mid,type,text,card,at,due) VALUES (?,?,?,?,?,?)`, mid, type, String(text).slice(0, 160), card, now, due);
    const cur = await this.f.ctx.storage.getAlarm();
    if (!cur || cur > due) await this.f.ctx.storage.setAlarm(due);
  }
  /* 1.9.6 ⭐ Interested: per person, family-visible names, reminders the day before (9am–9pm) and ~2 hours before (skipped in quiet hours) */
  interestList(meId, now = Date.now()) {
    const rows = this.all(`SELECT i.mid, i.eid, i.j, i.ev, m.name FROM intr i JOIN members m ON m.id=i.mid AND m.removed=0 WHERE i.ev IS NULL OR i.ev > ?`, now - 6 * 36e5), who = {}, mine = [];
    for (const r of rows) { (who[r.eid] ||= []).push(r.mid === meId ? 'You' : r.name); if (r.mid === meId) mine.push({ eid: r.eid, ev: r.ev, ...JSON.parse(r.j || '{}') }); }
    for (const k in who) who[k].sort((a, b) => (b === 'You') - (a === 'You'));
    return { mine: mine.sort((a, b) => (a.ev || 9e15) - (b.ev || 9e15)), who };
  }
  async evNotes(now = Date.now()) {
    this.sql.exec(`DELETE FROM intr WHERE ev IS NOT NULL AND ev < ?`, now - 3 * 864e5);
    const hr = nzHour(now), tmr = dayKey(now + 864e5);
    for (const r of this.all(`SELECT mid, eid, j, ev, d1, h2 FROM intr WHERE ev > ? AND ev < ?`, now - 14 * 36e5, now + 40 * 36e5)) {
      if (r.ev <= now && !/^wt/.test(r.eid)) continue;
      if (/^wt/.test(r.eid)) { // 1.9.24 📺 a show or movie: one reminder on the day it comes out (9am–9pm, quiet hours respected by note())
        if (!r.d1 && dayKey(r.ev) === dayKey(now) && hr >= 9 && hr < 21) { const j = JSON.parse(r.j || '{}'); this.sql.exec(`UPDATE intr SET d1=1 WHERE mid=? AND eid=?`, r.mid, r.eid); await this.note(r.mid, 'event', `📺 Out today${j.where ? ' on ' + String(j.where).slice(0, 20) : ''}: ${String(j.t || 'your show').slice(0, 80)}`, r.eid); }
        continue;
      }
      const j = JSON.parse(r.j || '{}'), t = String(j.t || 'Your event').slice(0, 80), tm = new Date(r.ev).toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' });
      if (!r.d1 && dayKey(r.ev) === tmr && hr >= 9 && hr < 21) { this.sql.exec(`UPDATE intr SET d1=1 WHERE mid=? AND eid=?`, r.mid, r.eid); await this.note(r.mid, 'event', `⭐ Tomorrow: ${t} – ${tm}${j.where ? ', ' + String(j.where).slice(0, 40) : ''}`, 'ev:' + r.eid); }
      if (!r.h2 && r.ev - now <= 2.25 * 36e5 && r.ev - now > 40 * 60e3) { this.sql.exec(`UPDATE intr SET h2=1 WHERE mid=? AND eid=?`, r.mid, r.eid); if (!this.inQuiet(this.np(r.mid), now)) await this.note(r.mid, 'event', `⭐ Starting soon (${tm}): ${t}`, 'ev:' + r.eid); }
    }
  }
  /* 1.9.8 📅 Sarah's appointments: Shane's phone reads them from My App's own storage and sends only title, date, time and
     place (never notes, costs or claims). Only the one person they belong to (and Shane) can read them. Shane can turn it off. */
  saCfg() { const r = this.one(`SELECT v FROM meta WHERE k='sappt'`); let c = {}; try { c = JSON.parse(r ? r.v : '{}') || {}; } catch (e) { }
    const on = c.on !== 0, sar = this.all(`SELECT id FROM members WHERE removed=0 AND role!='admin' AND role!='friend' AND name LIKE 'Sarah%'`).filter(m => m.id);
    const tm = c.test && this.one(`SELECT id FROM members WHERE id=? AND removed=0 AND name LIKE 'Test %'`, c.test); // a temporary test recipient (admin testing only)
    return { on, mid: tm ? tm.id : sar.length === 1 ? sar[0].id : null, test: tm ? tm.id : null, last: c.last || 0, n: c.n || 0 }; }
  saSave(c) { this.sql.exec(`INSERT INTO meta (k,v) VALUES ('sappt',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, JSON.stringify({ on: c.on ? 1 : 0, test: c.test || null, last: c.last || 0, n: c.n || 0 })); }
  saList(mid) { return this.all(`SELECT id, j, day, ev FROM sappt WHERE mid=? AND day >= ? ORDER BY day, ev`, mid, nzDay(Date.now())).map(r => ({ id: r.id, ...JSON.parse(r.j) })); }
  async apNotes(now = Date.now()) {
    const c = this.saCfg(); if (!c.on || !c.mid) return;
    const hr = nzHour(now), tmr = nzDay(now + 864e5);
    for (const r of this.all(`SELECT id, j, day, ev, d1, h2 FROM sappt WHERE mid=? AND day >= ?`, c.mid, nzDay(now))) {
      const a = JSON.parse(r.j), tm = r.ev ? new Date(r.ev).toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' }) : '';
      if (!r.d1 && r.day === tmr && hr >= 9 && hr < 21) { this.sql.exec(`UPDATE sappt SET d1=1 WHERE id=?`, r.id); await this.note(c.mid, 'appt', `📅 Tomorrow: ${a.t}${tm ? ' – ' + tm : ''}${a.place ? ', ' + String(a.place).slice(0, 40) : ''}`, 'sa:' + r.id); }
      if (r.ev && !r.h2 && r.ev - now <= 2.25 * 36e5 && r.ev - now > 40 * 60e3) { this.sql.exec(`UPDATE sappt SET h2=1 WHERE id=?`, r.id); if (!this.inQuiet(this.np(c.mid), now)) await this.note(c.mid, 'appt', `📅 In about 2 hours (${tm}): ${a.t}${a.place ? ', ' + String(a.place).slice(0, 40) : ''}`, 'sa:' + r.id); }
    }
  }
  async flush() { // the alarm: one push per person with something due; the phone then reads everything waiting
    const now = Date.now();
    const due = this.all(`SELECT DISTINCT mid FROM notes WHERE sent=0 AND due<=?`, now + 5e3);
    for (const { mid } of due) {
      const subs = this.all(`SELECT endpoint FROM subs WHERE mid=?`, mid); let ok = false;
      for (const s of subs) { try { const st = await sendPush(this.f.env, s.endpoint); if (st === 404 || st === 410) this.sql.exec(`DELETE FROM subs WHERE endpoint=?`, s.endpoint); else if (st < 300) ok = true; } catch (e) { } }
      this.sql.exec(`UPDATE notes SET sent=? WHERE mid=? AND sent=0 AND due<=?`, ok ? now : -1, mid, now + 5e3);
      if (ok) this.sql.exec(`INSERT INTO npref (mid,j,last) VALUES (?,NULL,?) ON CONFLICT(mid) DO UPDATE SET last=excluded.last`, mid, now);
    }
    this.sql.exec(`DELETE FROM notes WHERE at<?`, now - 14 * 864e5);
    const next = this.one(`SELECT MIN(due) t FROM notes WHERE sent=0`); if (next && next.t) await this.f.ctx.storage.setAlarm(Math.max(next.t, now + 1000));
  }
  // the cron calls this every 10 minutes: after 8am NZ, once a day, the daily drop and birthday/event reminders
  /* 1.9.24 👋 come-back nudges: someone with notifications on who hasn't opened Info Book for 2+ days gets one friendly push
     between 5 and 7pm NZ teasing something real that's waiting (never anything private). At most one every 2 days; after 3 in
     a row with no visit, weekly at most. Opening Info Book resets it. Their own switch (on by default); never for people who
     never joined (no visits) or anyone without notifications. */
  cbLastVisit(mid) { const r = this.one(`SELECT MAX(day) d FROM visits WHERE mid=?`, mid); return r && r.d ? r.d : null; }
  cbTeaser(m, since, now = Date.now()) {
    const mine = this.all(`SELECT id FROM shares WHERE mid=? AND del=0 AND vis IS NULL AND priv!=1`, m.id).map(r => 'sh' + r.id);
    // 1.9.230 family names and family posts only (a friend's comment counts on their own host's post)
    const rep = mine.length ? this.all(`SELECT DISTINCT mm.name FROM comments c JOIN members mm ON mm.id=c.mid AND mm.removed=0 WHERE c.del=0 AND c.at>? AND c.mid!=? AND mm.name NOT LIKE 'Test %' AND (mm.role!='friend' OR mm.host=?) AND c.card IN (${mine.map(() => '?').join(',')}) LIMIT 3`, since, m.id, m.id, ...mine).map(r => r.name) : [];
    const ph = (this.one(`SELECT COUNT(*) n FROM shares s JOIN members mm ON mm.id=s.mid AND mm.removed=0 WHERE s.del=0 AND s.vis IS NULL AND s.priv=2 AND COALESCE(s.aud,'fam')!='fr' AND mm.role!='friend' AND s.at>? AND s.mid!=? AND mm.name NOT LIKE 'Test %'`, since, m.id) || {}).n || 0;
    const posts = (this.one(`SELECT COUNT(*) n FROM shares s JOIN members mm ON mm.id=s.mid AND mm.removed=0 WHERE s.del=0 AND s.vis IS NULL AND s.priv!=1 AND COALESCE(s.aud,'fam')!='fr' AND mm.role!='friend' AND s.at>? AND s.mid!=? AND mm.name NOT LIKE 'Test %'`, since, m.id) || {}).n || 0;
    const dp = dailyPrompt(nzDay(now)), first = String(m.name || '').split(' ')[0], bits = [];
    if (rep.length) bits.push(`${rep.length === 1 ? rep[0] : rep.slice(0, -1).join(', ') + ' and ' + rep[rep.length - 1]} commented on your post`);
    if (ph) bits.push(`${ph} family photo${ph === 1 ? '' : 's'} you haven’t seen yet`); else if (posts) bits.push(`${posts} new family post${posts === 1 ? '' : 's'}`);
    if (bits.length < 2) bits.push(dp.type === 'photo' ? `today’s photo challenge is “${String(dp.text).slice(0, 50)}”` : `today’s question is “${String(dp.text).slice(0, 50)}”`);
    if (bits.length < 2) bits.push('new trivia is up');
    const open = ['👋 Miss you, ' + first + '!', '🌟 Hey ' + first + '!', '😊 Hi ' + first + '!'][Math.floor(now / 864e5) % 3];
    return `${open} ${bits[0].charAt(0).toUpperCase() + bits[0].slice(1)}${bits[1] ? ' and ' + bits[1] : ''} – come and have a look 💛`;
  }
  async comeBack(now = Date.now(), force = null) {
    const hr = nzHour(now); if (!force && (hr < 17 || hr >= 19)) return [];
    const today = dnum(dayKey(now)), out = [];
    const list = force ? this.all(`SELECT id, name FROM members WHERE id=? AND removed=0`, force) : this.all(`SELECT DISTINCT m.id, m.name FROM members m JOIN subs s ON s.mid=m.id WHERE m.removed=0 AND m.role!='friend' AND m.name NOT LIKE 'Test %'`);
    for (const m of list) {
      const lv = this.cbLastVisit(m.id); if (!lv) continue; // never joined
      const np = this.np(m.id); if (!np.comeback) continue;
      const away = today - dnum(lv); let c = this.one(`SELECT last, n, sent FROM cbn WHERE mid=?`, m.id) || { last: 0, n: 0, sent: 0 };
      if (c.last && dnum(lv) >= dnum(dayKey(c.last))) c = { ...c, n: 0 }; // they came back since the last nudge
      if (!force) { if (away < 2) continue; const gap = c.n >= 3 ? 7 : 2; if (c.last && now - c.last < gap * 864e5 - 3 * 36e5) continue; if (this.inQuiet(np, now)) continue; }
      const lvd = String(lv).replace(/^(\d{4})-?(\d{2})-?(\d{2})$/, '$1-$2-$3'), since = Date.parse(lvd + 'T00:00:00+13:00') || (now - 2 * 864e5), txt = this.cbTeaser(m, since, now);
      this.sql.exec(`INSERT INTO cbn (mid,last,n,sent,txt) VALUES (?,?,?,?,?) ON CONFLICT(mid) DO UPDATE SET last=excluded.last, n=excluded.n, sent=excluded.sent, txt=excluded.txt`, m.id, now, (c.n || 0) + 1, (c.sent || 0) + 1, txt);
      await this.note(m.id, 'comeback', txt, 'comeback'); out.push({ mid: m.id, name: m.name, away, txt });
    }
    return out;
  }
  cbAdmin(now = Date.now()) {
    const today = dnum(dayKey(now));
    return this.all(`SELECT id, name FROM members WHERE removed=0 ORDER BY created`).map(m => { const lv = this.cbLastVisit(m.id), c = this.one(`SELECT last, n, sent, txt FROM cbn WHERE mid=?`, m.id) || {}; return { mid: m.id, name: m.name, lastVisit: lv, away: lv ? today - dnum(lv) : null, push: !!this.one(`SELECT 1 x FROM subs WHERE mid=?`, m.id), on: !!this.np(m.id).comeback, lastNudge: c.last || 0, inRow: c.last && lv && dnum(lv) >= dnum(dayKey(c.last)) ? 0 : c.n || 0, sent: c.sent || 0, txt: c.txt || '' }; });
  }
  async tick() {
    const now = Date.now(), day = dayKey(now), hr = nzHour(now); if (hr >= 19 && hr < 22) await this.streakNudge(now); try { await this.comeBack(now); } catch (e) { } try { await this.wxPoll(now); } catch (e) { } try { await this.npPoll(now); } catch (e) { } try { await this.evNotes(now); } catch (e) { } try { await this.apNotes(now); } catch (e) { } if (hr < 8) return { wait: 1 };
    const done = this.one(`SELECT v FROM meta WHERE k='drop'`); if (done && done.v === day) return { done: day };
    this.sql.exec(`INSERT INTO meta (k,v) VALUES ('drop',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, day);
    const members = this.all(`SELECT id,name FROM members WHERE removed=0 AND role!='friend'`), dp = dailyPrompt(nzDay(now)), pl = dailyPoll(nzDay(now));
    for (const m of members) await this.note(m.id, 'daily', '📊 Today’s family poll: ' + pl.q + (dp.type === 'photo' ? ' · 📸 Photo challenge: ' + dp.text : ''), pl.key);
    for (const x of this.upcoming(now)) if (x.days === 0 || x.days === 7) for (const m of members) if (m.id !== x.mid) await this.note(m.id, 'dates', x.days === 0 ? `${x.kind === 'bday' ? '🎂' : '🎉'} Today: ${x.title}!` : `${x.kind === 'bday' ? '🎂' : '📅'} ${x.title} is a week away`, 'date' + x.id);
    await this.carNotes(now);
    return { dropped: day };
  }
  async wxPoll(now = Date.now(), force) { // the official MetService CAP feed; each new alert's details are read once
    const last = this.one(`SELECT v FROM meta WHERE k='wxat'`); if (!force && last && now - +last.v < 30 * 60e3) return;
    this.sql.exec(`INSERT INTO meta (k,v) VALUES ('wxat',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, String(now));
    const r = await fetch(CAP_RSS, { headers: { 'User-Agent': 'InfoBook family app (shane-my-app.pages.dev)' } }); if (!r.ok) return;
    this.sql.exec(`DELETE FROM wx WHERE test=0 AND j NOT LIKE '%"wg":%'`); // 1.9.3: re-read alerts saved before the Whangārei check
    const rss = await r.text(), live = new Set(), fresh = [];
    for (const it of rss.split('<item>').slice(1)) {
      const id = tagX(it, 'guid'), link = tagX(it, 'link'); if (!id || !/^https:\/\/alerts\.metservice\.com\//.test(link)) continue; live.add(id);
      if (this.one(`SELECT id FROM wx WHERE id=?`, id)) continue;
      try { const x = capParse(await (await fetch(link)).text(), link); if (!x.id || x.status !== 'Actual' || x.msgType === 'Cancel') continue; this.sql.exec(`INSERT OR REPLACE INTO wx (id,j,exp,at) VALUES (?,?,?,?)`, id, JSON.stringify(x), x.expires || now + 864e5, now); fresh.push(x); } catch (e) { }
    }
    for (const w of this.all(`SELECT id FROM wx WHERE test=0`)) if (!live.has(w.id)) this.sql.exec(`DELETE FROM wx WHERE id=?`, w.id); // lifted or replaced
    this.sql.exec(`DELETE FROM wx WHERE exp < ?`, now);
    await this.wxPush(now);
  }
  async wxPush(now = Date.now()) { // 1.9.18 ⚠️ one push per orange/red Whangārei warning, once it's active or within 48 hours (quiet hours and the 30-minute limit apply)
    let done = []; try { done = JSON.parse((this.one(`SELECT v FROM meta WHERE k='wxpushed'`) || {}).v || '[]'); } catch (e) { }
    const nw = this.wxList(now).filter(x => !x.test && (x.colour === 'red' || x.colour === 'orange') && !done.includes(x.id));
    for (const x of nw) {
      const f = t => new Date(t).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(':00', '');
      const txt = `${x.colour === 'red' ? '🔴 RED' : '🟠 Orange'} ${x.head.replace(/\s*-\s*(Orange|Red)$/i, '')} for Whangārei – ${x.onset > now ? 'from ' + f(x.onset) : 'now'} until ${f(x.expires)}. Tap for details.`;
      for (const m of this.all(`SELECT id FROM members WHERE removed=0`)) { if (x.colour === 'red' && this.np(m.id).weather) await this.note(m.id, 'weather', txt, 'wx:' + x.id, true); else await this.note(m.id, 'alerts', txt, 'wx:' + x.id); } // anyone who opted in to red-at-any-time keeps that
      done.push(x.id);
    }
    if (nw.length) this.sql.exec(`INSERT INTO meta (k,v) VALUES ('wxpushed',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, JSON.stringify(done.slice(-60)));
  }
  /* 1.9.18 ⚡ Northpower (Whangārei and Kaipara lines company) outages, read from its public Outage Centre page (the page
     carries the same outage list its map uses). Polled every 10 minutes from the cron, kept in this Durable Object's SQLite
     (no KV writes). Only Whangārei District: outages whose areas are all in Kaipara are left out. Unplanned outages show while
     they're on; planned ones only when they start within 48 hours. Restored or finished ones drop off. */
  async npPoll(now = Date.now(), force) {
    const last = this.one(`SELECT v FROM meta WHERE k='npat'`); if (!force && last && now - +last.v < 9 * 60e3) return;
    this.sql.exec(`INSERT INTO meta (k,v) VALUES ('npat',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, String(now));
    const r = await fetch(NP_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InfoBook family app; +https://shane-my-app.pages.dev/feed/)', Accept: 'text/html' } });
    if (!r.ok) { this.sql.exec(`INSERT INTO meta (k,v) VALUES ('nperr',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, now + ' http ' + r.status); return; }
    const list = npParse(await r.text(), now); if (!list) { this.sql.exec(`INSERT INTO meta (k,v) VALUES ('nperr',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, now + ' parse'); return; }
    const live = new Set();
    for (const o of list.filter(o => o.kind === 'unplanned')) { live.add(o.id); const ex = this.one(`SELECT pushed FROM pwr WHERE id=?`, o.id); this.sql.exec(`INSERT INTO pwr (id,j,kind,st,en,at,pushed) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET j=excluded.j, kind=excluded.kind, st=excluded.st, en=excluded.en, at=excluded.at`, o.id, JSON.stringify(o), o.kind, o.start || 0, o.end || 0, now, ex ? ex.pushed : 0); }
    for (const w of this.all(`SELECT id FROM pwr WHERE test=0`)) if (!live.has(w.id)) this.sql.exec(`DELETE FROM pwr WHERE id=?`, w.id); // restored / finished
    this.sql.exec(`INSERT INTO meta (k,v) VALUES ('npok',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, String(now));
    await this.npPush(now);
  }
  pwrList(now = Date.now()) {
    return this.all(`SELECT j, test FROM pwr`).map(r => ({ ...JSON.parse(r.j), test: !!r.test }))
      .filter(o => o.kind === 'unplanned') // 1.9.54 only unplanned power cuts (planned/scheduled ones are never shown or pushed)
      .sort((a, b) => (a.kind === 'unplanned' ? 0 : 1) - (b.kind === 'unplanned' ? 0 : 1) || (b.customers || 0) - (a.customers || 0) || a.start - b.start);
  }
  async npPush(now = Date.now()) { // ⚡ one push per unplanned outage affecting 20+ homes (same rules as other pushes)
    for (const o of this.pwrList(now).filter(o => o.kind === 'unplanned' && (o.customers || 0) >= 20)) {
      if (this.one(`SELECT pushed FROM pwr WHERE id=?`, o.id)?.pushed) continue;
      this.sql.exec(`UPDATE pwr SET pushed=1 WHERE id=?`, o.id);
      const txt = `⚡ Power cut${o.test ? ' (TEST)' : ''}: ${o.areas.slice(0, 3).join(', ') || o.title} – about ${o.customers} homes.${o.etr ? ' Back on by about ' + new Date(o.etr).toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' }) + '.' : ''}`;
      for (const m of this.all(`SELECT id FROM members WHERE removed=0`)) await this.note(m.id, 'alerts', txt, 'pw:' + o.id);
    }
  }
  wxList(now = Date.now()) {
    const col = { red: 0, orange: 1, yellow: 2 };
    return this.all(`SELECT j, test FROM wx WHERE exp > ?`, now).map(r => ({ ...JSON.parse(r.j), test: !!r.test }))
      .filter(x => x.wg && ['red', 'orange', 'yellow'].includes(x.colour) && (x.onset || 0) < now + 48 * 36e5) // 1.9.18 active now or starting within ~48 hours // Whangārei only (1.9.3)
      .sort((a, b) => (col[a.colour] ?? 3) - (col[b.colour] ?? 3) || a.onset - b.onset);
  }
  async carNotes(now = Date.now()) { // ~2 weeks and ~3 days before (and on the day) each shared WOF / rego / service date
    try { await this.carsFromRelay(); } catch (e) { }
    const today = nzDay(now), tn = Math.floor(Date.parse(today + 'T00:00:00Z') / 864e5);
    for (const r of this.all(`SELECT plate, mid, data FROM carshare`)) {
      let c; try { c = JSON.parse(r.data || 'null'); } catch (e) { } if (!c) continue;
      for (const [k, lab] of [['wof', 'WOF'], ['rego', 'Rego'], ['svc', 'Service']]) {
        if (!c[k]) continue; const n = Math.floor(Date.parse(c[k] + 'T00:00:00Z') / 864e5) - tn;
        if (n === 14 || n === 3 || n === 0) await this.note(r.mid, 'dates', `🚗 ${c.plate} ${lab} ${n === 0 ? 'is due today' : n === 3 ? 'is due in 3 days' : 'is due in 2 weeks'} (${new Date(c[k] + 'T00:00:00Z').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })})`, 'car:' + c.plate);
      }
    }
  }
  /* My App already keeps copies of these cars' dates in its own data service (the relay's KV): the To-do copy of Sarah's car
     and the car summary. Read them (read-only) so the cards stay current even if Shane doesn't open Info Book. */
  async carsFromRelay() {
    const kv = this.f.env.RELAY_KV; if (!kv) return 0;
    const rows = this.all(`SELECT plate, data, at FROM carshare`); if (!rows.length) return 0;
    const last = this.one(`SELECT v FROM meta WHERE k='relaycars'`); if (last && Date.now() - +last.v < 50 * 60e3) return 0; // at most hourly
    this.sql.exec(`INSERT INTO meta (k,v) VALUES ('relaycars',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, String(Date.now()));
    const found = {};
    const take = (plate, o, t) => { const p = PLATE(plate); if (!p) return; if (!found[p] || found[p].t < t) found[p] = { t, o }; };
    for (const pre of ['shared-car-v1:', 'cars-alexa-v1:']) {
      const list = await kv.list({ prefix: pre, limit: 50 });
      for (const k of list.keys) {
        const v = await kv.get(k.name, { type: 'json' }).catch(() => null); if (!v) continue;
        if (pre === 'shared-car-v1:') take(v.plate, { wof: v.wof, rego: v.rego, svc: v.svc, svcKm: v.svcKm, model: v.model, year: v.year, name: v.name, wofSt: v.wofSt }, +v.updated || 0);
        else for (const c of v.cars || []) take(c.plate, { wof: c.wofExpiry, rego: c.regoExpiry, svc: c.nextService && c.nextService.date, svcKm: c.nextService && c.nextService.odometerKm, model: c.model, colour: c.colour, name: c.nickname }, Date.parse(v.updatedAt) || 0);
      }
    }
    let n = 0;
    for (const r of rows) {
      const f = found[r.plate]; if (!f) continue;
      let cur = null; try { cur = JSON.parse(r.data || 'null'); } catch (e) { }
      if (cur && (cur.updated || 0) >= f.t) continue; // the phone's copy is newer
      const keep = cur || {}, o = cleanCarShare({ ...keep, ...Object.fromEntries(Object.entries(f.o).filter(([, v]) => v)), plate: r.plate, photo: keep.photo, updated: f.t });
      if (o) { this.sql.exec(`UPDATE carshare SET data=?, src='relay', at=? WHERE plate=?`, JSON.stringify(o), f.t, r.plate); n++; }
    }
    return n;
  }
  upcoming(now = Date.now(), within = 400) { // every date with how many NZ days until its next turn
    const today = nzDay(now), ty = +today.slice(0, 4), tn = Math.floor(Date.UTC(ty, +today.slice(5, 7) - 1, +today.slice(8, 10)) / 864e5), out = [];
    for (const r of this.all(`SELECT d.id,d.kind,d.title,d.mid,d.m,d.d,d.y,d.by,m.name FROM dates d LEFT JOIN members m ON m.id=d.mid WHERE d.del=0`)) {
      let n = null, turns = null;
      if (r.kind === 'event' && r.y) n = Math.floor(Date.UTC(r.y, r.m - 1, r.d) / 864e5) - tn;
      else { for (const y of [ty, ty + 1]) { const k = Math.floor(Date.UTC(y, r.m - 1, r.d) / 864e5) - tn; if (k >= 0) { n = k; if (r.y && r.kind === 'bday') turns = y - r.y; break; } } }
      if (n === null || n < 0 || n > within) continue;
      out.push({ id: r.id, kind: r.kind, title: r.title, mid: r.mid, m: r.m, d: r.d, days: n, turns, by: r.by });
    }
    return out.sort((a, b) => a.days - b.days);
  }
  /* 1.9.1 daily streaks: a day counts when the person opens Info Book (NZ time). Today not opened yet doesn't break it until midnight.
     One free streak freeze a week (Mon–Sun): a single missed day is covered automatically, so the streak carries on. */
  streak(mid) {
    this.backfill();
    const set = new Set(this.all(`SELECT day FROM visits WHERE mid=?`, mid).map(r => dnum(r.day))), today = dnum(dayKey(Date.now())), wk = d => Math.floor((d + 3) / 7);
    let run = 0, best = 0, first = Infinity, start = null; for (const d of set) first = Math.min(first, d);
    const bo = this.one(`SELECT day, n FROM sbonus WHERE mid=?`, mid), bd = bo ? dnum(bo.day) : null;
    const used = new Set(), frozen = [];
    for (let d = first; d <= today && set.size; d++) {
      if (set.has(d)) { if (!run) start = d; run++; if (bd != null && d >= bd && start <= bd) best = Math.max(best, run + bo.n); best = Math.max(best, run); continue; }
      if (d === today) break; // not opened yet today – still alive
      if (run > 0 && !used.has(wk(d)) && (set.has(d + 1) || d + 1 === today)) { used.add(wk(d)); frozen.push(keyOf(d)); continue; }
      run = 0;
    }
    const bonus = bd != null && run > 0 && start != null && start <= bd ? bo.n : 0; run += bonus; // 1.9.24 the award counts while that streak carries on
    const opened = set.has(today), next = MILES.find(m => m > run) || null;
    return { cur: run, best: Math.max(best, run), bonus, total: set.size, today: opened, atRisk: !opened && run > 0, freezeLeft: !used.has(wk(today)), frozen: frozen.slice(-3), next, milestone: opened && MILES.includes(run) ? run : 0 };
  }
  backfill() { // once: earlier opens from what the service already knew (last seen, comments, ❤️, posts, trivia) – the admin "check a link" never counts
    if (this._bf) return; this._bf = 1; if (this.one(`SELECT v FROM meta WHERE k='bf191'`)) return;
    const live = new Set(this.all(`SELECT id FROM members WHERE removed=0`).map(r => r.id)), add = (mid, at) => { if (live.has(mid) && at) this.sql.exec(`INSERT OR IGNORE INTO visits (mid,day) VALUES (?,?)`, mid, dayKey(at)); };
    for (const r of this.all(`SELECT id mid, seen at FROM members WHERE seen IS NOT NULL`)) add(r.mid, r.at);
    for (const t of ['comments', 'reacts', 'shares']) for (const r of this.all(`SELECT mid, at FROM ${t}`)) add(r.mid, r.at);
    for (const r of this.all(`SELECT mid, day FROM trivia`)) if (live.has(r.mid)) this.sql.exec(`INSERT OR IGNORE INTO visits (mid,day) VALUES (?,?)`, r.mid, r.day);
    this.sql.exec(`INSERT INTO meta (k,v) VALUES ('bf191',?) ON CONFLICT(k) DO NOTHING`, String(Date.now()));
  }
  streaks(meId) { // the family streaks card: everyone's current and best streak
    return this.all(`SELECT id, name FROM members WHERE removed=0 AND role!='friend'`).map(m => { const s = this.streak(m.id); return { mid: m.id, name: m.name, cur: s.cur, best: s.best, today: s.today, me: m.id === meId }; }).sort((a, b) => b.cur - a.cur || b.best - a.best || a.name.localeCompare(b.name));
  }
  async streakNudge(now) { // gentle, opt-in: about 7pm NZ, once a day, only if a 2+ day streak would break tonight
    const day = dayKey(now), done = this.one(`SELECT v FROM meta WHERE k='snudge'`); if (done && done.v === day) return;
    this.sql.exec(`INSERT INTO meta (k,v) VALUES ('snudge',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, day);
    for (const m of this.all(`SELECT id FROM members WHERE removed=0`)) {
      const s = this.streak(m.id); if (!s.atRisk || s.cur < 2) continue;
      await this.note(m.id, 'streak', s.freezeLeft ? `🔥 Your ${s.cur}-day streak: pop into Info Book before midnight to keep it going (your weekly freeze can cover one miss).` : `🔥 Your ${s.cur}-day streak ends at midnight – just open Info Book to keep it going.`, 'streak');
    }
  }
  badges(mid) {
    const c = q => (this.one(q, mid) || {}).n || 0;
    const photos = c(`SELECT COUNT(*) n FROM shares WHERE mid=? AND priv=2 AND del=0`), comments = c(`SELECT COUNT(*) n FROM comments WHERE mid=? AND del=0`);
    const reacts = c(`SELECT COUNT(*) n FROM reacts WHERE mid=?`), tdays = c(`SELECT COUNT(*) n FROM trivia WHERE mid=?`), polls = c(`SELECT COUNT(*) n FROM pollv WHERE mid=?`);
    const answers = c(`SELECT COUNT(DISTINCT card) n FROM comments WHERE mid=? AND del=0 AND card LIKE 'dq%'`) + c(`SELECT COUNT(*) n FROM shares WHERE mid=? AND del=0 AND tag LIKE 'dq%'`);
    const bday = c(`SELECT COUNT(*) n FROM dates WHERE mid=? AND kind='bday' AND del=0`), st = this.streak(mid);
    const B = [['📷', 'First photo', 'Shared a first photo post', photos >= 1], ['🖼️', 'Family photographer', '10 photo posts', photos >= 10],
      ['💬', 'Chatterbox', '10 comments', comments >= 10], ['🗣️', 'Storyteller', '50 comments', comments >= 50], ['❤️', 'Cheerleader', 'Gave 25 ❤️/👍', reacts >= 25],
      ['📊', 'Poll pal', 'Voted in 5 family polls', polls >= 5], ['🗳️', 'Poll regular', 'Voted in 20 family polls', polls >= 20], ['🏅', 'Poll legend', 'Voted in 60 family polls', polls >= 60],
      ['🌟', 'Post starter', 'Shared 3 posts or photos', photos >= 3], ['📸', 'Photo pro', '25 photo posts', photos >= 25], ['💞', 'Super fan', 'Gave 100 reactions', reacts >= 100],
      ...MILE_BADGES.map(([n, e, t]) => [e, t, `A ${n}-day streak`, st.best >= n]),
      ['🎉', 'Streak award', '+2 bonus streak days (Nov 2026)', !!this.one(`SELECT 1 x FROM sbonus WHERE mid=?`, mid)],
      ['💭', 'Joiner-inner', 'Answered 5 daily questions or challenges', answers >= 5], ['🎂', 'Birthday on the calendar', 'Added a birthday', bday >= 1]];
    return { streak: st, badges: B.map(([e, n, d, got]) => ({ e, n, d, got: !!got })), counts: { photos, comments, reacts, tdays, answers, polls } };
  }

  async route(p, m, u, req, me, admin, J, body) {
    const now = Date.now(), today = dayKey(now);
    if (p === '/reno' && m === 'GET') { // everyone in the family sees the same card; refreshed from My App's list at most every 30 min
      const c = this.one(`SELECT v FROM meta WHERE k='reno'`); let r = c ? JSON.parse(c.v) : null;
      if ((!r || now - r.got > 30 * 60e3) && this.f.env.RELAY_KV) { try { const list = JSON.parse(await this.f.env.RELAY_KV.get(RENO_KV) || 'null'); if (Array.isArray(list)) { r = { ...renoSummary(list, now), got: now }; this.sql.exec(`INSERT INTO meta (k,v) VALUES ('reno',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, JSON.stringify(r)); } } catch (e) { } }
      return J(r ? { reno: r } : { reno: null });
    }
    if (p === '/power' && m === 'GET') { try { await this.npPoll(now); } catch (e) { } const ok = +((this.one(`SELECT v FROM meta WHERE k='npok'`) || {}).v || 0); return J({ list: this.pwrList(now), checked: ok, src: NP_URL }); }
    if (p === '/power/test' && (m === 'POST' || m === 'DELETE')) { // admin only: a clearly marked TEST outage to check the card, removed afterwards
      if (!admin) return J({ err: 'admin only' }, 403); this.sql.exec(`DELETE FROM pwr WHERE test=1`); if (m === 'DELETE') return J({ ok: 1 });
      const b = await body(), pl = b.kind === 'planned', o = { id: (pl ? 'p' : 'u') + ':TEST-' + now, kind: pl ? 'planned' : 'unplanned', title: 'TEST – Kamo', areas: ['Kamo', 'Tikipunga'], roads: ['Kamo Road'], customers: 140, start: pl ? now + 20 * 36e5 : now - 40 * 60e3, end: pl ? now + 26 * 36e5 : 0, etr: pl ? 0 : now + 2 * 36e5, cause: pl ? 'Maintenance (TEST)' : 'Tree on line (TEST)', status: pl ? 'Scheduled' : 'Crew on the way', msg: 'This is a sample outage to test the Info Book card. It is not real.', locality: '' };
      this.sql.exec(`INSERT INTO pwr (id,j,kind,st,en,at,pushed,test) VALUES (?,?,?,?,?,?,1,1)`, o.id, JSON.stringify(o), o.kind, o.start, o.end, now); return J({ ok: 1, o });
    }
    if (p === '/weather' && m === 'GET') { try { await this.wxPoll(now); } catch (e) { } return J({ list: this.wxList(now) }); }
    if (p === '/weather/test' && (m === 'POST' || m === 'DELETE')) { // admin only: a clearly marked TEST warning to check the card, removed afterwards
      if (!admin) return J({ err: 'admin only' }, 403); this.sql.exec(`DELETE FROM wx WHERE test=1`); if (m === 'DELETE') return J({ ok: 1 });
      const b = await body(), x = { id: 'TEST-' + now, event: 'rain', head: 'TEST ONLY – Heavy Rain Warning - ' + (b.colour === 'red' ? 'Red' : 'Orange'), colour: b.colour === 'red' ? 'red' : 'orange', region: 'nl', wg: true, area: 'Northland, including Whangārei (TEST – not a real warning)', onset: now + 3 * 36e5, expires: now + 30 * 36e5, desc: 'This is a sample warning to test the Info Book card. It is not real.', act: 'No action needed – test only.', web: 'https://www.metservice.com/warnings/home', link: '' };
      this.sql.exec(`INSERT INTO wx (id,j,exp,at,test) VALUES (?,?,?,?,1)`, x.id, JSON.stringify(x), x.expires, now); return J({ ok: 1, x });
    }
    if (p === '/streaks' && m === 'GET') return J({ list: this.streaks(me.id) });
    if (p === '/devices' && m === 'GET') { if (!admin) return J({ err: 'admin only' }, 403); return J({ list: this.all(`SELECT d.mid, m.name, d.mode, d.plat, d.at FROM mdev d JOIN members m ON m.id=d.mid AND m.removed=0`) }); }
    if (p === '/visit' && m === 'POST') { try { const b = await body(); if (b && /^(installed|browser|inapp)$/.test(b.mode || '')) this.sql.exec(`INSERT INTO mdev (mid,mode,plat,at) VALUES (?,?,?,?) ON CONFLICT(mid) DO UPDATE SET mode=excluded.mode, plat=excluded.plat, at=excluded.at`, me.id, b.mode, String(b.plat || '').slice(0, 20), now); } catch (e) { } }
    if (p === '/visit' && m === 'POST') { this.sql.exec(`INSERT OR IGNORE INTO visits (mid,day) VALUES (?,?)`, me.id, today);
      // 1.9.24 🎉 Streak award: everyone who opens Info Book from 2 Nov 2026 gets +2 days once (idempotent: one row per member)
      let award = 0; if (Date.now() >= AWARD_FROM) { const had = this.one(`SELECT shown FROM sbonus WHERE mid=?`, me.id); if (!had) { this.sql.exec(`INSERT OR IGNORE INTO sbonus (mid,day,n,at,shown) VALUES (?,?,2,?,0)`, me.id, today, Date.now()); award = 1; } else if (!had.shown) award = 1; }
      return J({ ...this.streak(me.id), award }); }
    if (p === '/comeback' && m === 'GET') { if (!admin) return J({ err: 'admin only' }, 403); return J({ list: this.cbAdmin(now) }); }
    if (p === '/comeback/test' && m === 'POST') { if (!admin) return J({ err: 'admin only' }, 403); const b = await body(), t = this.one(`SELECT id FROM members WHERE id=? AND removed=0 AND name LIKE 'Test %'`, String(b.mid || '')); if (!t) return J({ err: 'test members only' }, 400); return J({ sent: await this.comeBack(now, t.id), regular: (b.dry ? null : null) }); }
    if (p === '/visit/award' && m === 'POST') { this.sql.exec(`UPDATE sbonus SET shown=1 WHERE mid=?`, me.id); return J({ ok: 1 }); }
    if (p === '/profile') {
      const id = u.searchParams.get('id') || me.id, who = this.one(`SELECT id,name,role,host,pron,pshow FROM members WHERE id=? AND removed=0`, id); if (!who || !sees(me, who) || (me.role === 'friend' && who.id !== me.id)) return J({ err: 'no such member' }, 404); // 1.9.230 friends: their own profile only
      const b = this.badges(id), out = { id: who.id, name: who.name, ...b }; if (id === me.id) { out.pron = who.pron || null; out.pshow = !!who.pshow; } else if (who.pshow && who.pron) out.pron = who.pron; // 1.9.15
      if (id === me.id) out.birthday = this.one(`SELECT id,m,d,y FROM dates WHERE mid=? AND kind='bday' AND del=0`, me.id);
      return J(out);
    }
    if (p === '/poll') { // 1.9.63 one vote per person per day (a new tap changes it); everyone sees the tallies and who picked what
      const pl = dailyPoll(nzDay(now));
      if (m === 'POST') { const b = await body(), o = +b.opt; if (!(o >= 0 && o < pl.opts.length)) return J({ err: 'bad option' }, 400);
        this.sql.exec(`INSERT INTO pollv (day,mid,opt,at) VALUES (?,?,?,?) ON CONFLICT(day,mid) DO UPDATE SET opt=excluded.opt, at=excluded.at`, pl.day, me.id, o, now); }
      const v = this.all(`SELECT v.mid, v.opt, m.name FROM pollv v JOIN members m ON m.id=v.mid AND m.removed=0 WHERE v.day=? ORDER BY v.at`, pl.day);
      const mine = v.find(x => x.mid === me.id);
      return J({ ...pl, total: v.length, mine: mine ? mine.opt : null, counts: pl.opts.map((_, i) => v.filter(x => x.opt === i).length), who: pl.opts.map((_, i) => v.filter(x => x.opt === i).map(x => x.mid === me.id ? 'You' : x.name)) });
    }
    if (p === '/daily') {
      const dp = dailyPrompt(nzDay(now)), cm = this.all(`SELECT DISTINCT c.mid, m.name FROM comments c JOIN members m ON m.id=c.mid AND m.removed=0 WHERE c.card=? AND c.del=0`, dp.key);
      const ph = this.all(`SELECT s.id, s.mid, m.name, s.snap, s.at FROM shares s JOIN members m ON m.id=s.mid AND m.removed=0 WHERE s.tag=? AND s.del=0 AND s.vis IS NULL AND s.aud IS NULL AND m.role!='friend' ORDER BY s.at DESC`, dp.key);
      const who = new Map(); for (const r of [...cm, ...ph]) who.set(r.mid, r.name);
      // 1.9.20 the photo answers themselves (name, caption, photo ids – pictures still need the member's token to load)
      const pics = ph.map(r => { let x = {}; try { x = JSON.parse(r.snap || '{}'); } catch (e) { } return { card: 'sh' + r.id, mid: r.mid, name: r.name, me: r.mid === me.id, t: String(x.t || '').slice(0, 300), photos: (x.photos || []).slice(0, 4), at: r.at, likes: this.f.reactsOf ? this.f.reactsOf('sh' + r.id, 'love', me) : [], nc: (this.one(`SELECT COUNT(*) n FROM comments WHERE card=? AND del=0`, 'sh' + r.id) || {}).n || 0 }; });
      return J({ ...dp, answered: [...who].map(([mid, name]) => ({ mid, name, me: mid === me.id })), posts: ph.map(r => 'sh' + r.id), pics });
    }
    if (p === '/trivia' && m === 'GET') {
      const mine = this.one(`SELECT score, ans, at FROM trivia WHERE mid=? AND day=?`, me.id, today), qs = triviaFor(today, mine && mine.at < V191_AT);
      return J({ day: today, qs: qs.map(q => ({ cat: q.cat, q: q.q, opts: q.opts, ...(mine ? { ans: q.ans } : {}) })), mine: mine ? { score: mine.score, ans: JSON.parse(mine.ans || '[]') } : null, played: (() => { const g = gameIds(this.sql, me); return this.all(`SELECT mid FROM trivia WHERE day=?`, today).filter(r => g.has(r.mid)).length; })() }); // 1.9.231 only people in the same group
    }
    if (p === '/trivia' && m === 'POST') {
      if (this.one(`SELECT score FROM trivia WHERE mid=? AND day=?`, me.id, today)) return J({ err: 'one go a day – come back tomorrow for 5 new questions' }, 409);
      const b = await body(), ans = (Array.isArray(b.ans) ? b.ans : []).slice(0, 5).map(x => Number.isInteger(x) && x >= 0 && x < 4 ? x : -1);
      const qs = triviaFor(today), score = qs.reduce((a, q, i) => a + (ans[i] === q.ans ? 1 : 0), 0);
      this.sql.exec(`INSERT INTO trivia (mid,day,score,ans,at) VALUES (?,?,?,?,?)`, me.id, today, score, JSON.stringify(ans), now);
      return J({ score, right: qs.map(q => q.ans) });
    }
    if (p === '/trivia/board') {
      const g = gameIds(this.sql, me), tn = dnum(today), dow = (new Date(tn * 864e5).getUTCDay() + 6) % 7, wk = keyOf(tn - dow); // weeks start Monday (NZ)
      const q = (where, ...a) => this.all(`SELECT t.mid, m.name, SUM(t.score) pts, COUNT(*) days FROM trivia t JOIN members m ON m.id=t.mid AND m.removed=0 ${where} GROUP BY t.mid ORDER BY pts DESC, days ASC LIMIT 400`, ...a).filter(r => g.has(r.mid)).slice(0, 30).map(r => ({ ...r, me: r.mid === me.id })); // 1.9.231 family board for family, circle board for a friend
      return J({ week: q(`WHERE t.day>=?`, wk), all: q(''), today: q(`WHERE t.day=?`, today), weekFrom: wk });
    }
    if (p === '/memories') { // family posts and photos from a week, a month and a year ago (never Shane's own boards)
      const out = []; const D = (n, lab) => { const k = keyOf(dnum(today) - n); return [k, lab]; };
      const back = [D(7, 'A week ago'), D(dnum(today) - dnum(monthAgo(today)), 'A month ago'), D(dnum(today) - dnum(String(+today.slice(0, 4) - 1) + today.slice(4)), 'A year ago')];
      for (const [k, lab] of back) {
        const t0 = Date.parse(`${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}T00:00:00+13:00`) - 2 * 36e5, t1 = t0 + 864e5 + 4 * 36e5; // that NZ day (± a couple of hours for daylight saving)
        for (const r of this.all(`SELECT s.id, s.mid, m.name, s.orig, s.snap, s.priv, s.at, s.vis, s.aud, s.circ FROM shares s LEFT JOIN members m ON m.id=s.mid WHERE s.del=0 AND s.priv IN (0,2) AND s.at>=? AND s.at<? ORDER BY s.at LIMIT 12`, t0, t1))
          if (dayKey(r.at) === k && shareVisible(me, r)) /* 1.9.230 */ out.push({ when: lab, day: k, id: r.id, card: r.priv ? 'sh' + r.id : r.orig, name: r.name || 'Former member', snap: JSON.parse(r.snap), up: r.priv === 2, at: r.at });
      }
      return J(out);
    }
    if (p === '/sappts' && m === 'GET') { const c = this.saCfg();
      if (admin) { const nm = c.mid ? this.one(`SELECT name FROM members WHERE id=?`, c.mid) : null; return J({ cfg: { on: c.on, mid: c.mid, name: nm && nm.name, last: c.last, n: c.n }, list: c.mid ? this.saList(c.mid) : [] }); }
      return J({ list: c.on && c.mid && me.id === c.mid ? this.saList(c.mid) : [] }); }
    if (p === '/sappts/cfg' && m === 'PUT') { if (!admin) return J({ err: 'admin only' }, 403); const b = await body(), c = this.saCfg(); if ('test' in b) { if (c.test || b.test) this.sql.exec(`DELETE FROM sappt`); c.test = /^m[0-9a-f]{12}$/.test(b.test || '') ? b.test : null; c.last = 0; c.n = 0; this.saSave(c); return J({ ok: 1, test: this.saCfg().test }); } c.on = !!b.on; if (!c.on) { this.sql.exec(`DELETE FROM sappt`); c.n = 0; } this.saSave(c); return J({ ok: 1, on: c.on }); }
    if (p === '/sappts/sync' && m === 'POST') { // Shane's phone only; replaces the whole list
      if (!admin) return J({ err: 'admin only' }, 403); const c = this.saCfg(); if (!c.on) return J({ ok: 1, n: 0, off: 1 }); if (!c.mid) return J({ err: 'no single member called Sarah' }, 409);
      const b = await body(), today = nzDay(now), lim = nzDay(now + 61 * 864e5), keep = new Map(this.all(`SELECT id, ev, day, d1, h2 FROM sappt`).map(r => [r.id, r])), seen = [];
      for (const x of (Array.isArray(b.list) ? b.list : []).slice(0, 60)) {
        const a = cleanSAppt(x); if (!a || a.date < today || a.date > lim || seen.includes(a.id)) continue; seen.push(a.id);
        const ev = a.time ? nzMs(a.date, a.time) : null, o = keep.get(a.id), same = o && o.day === a.date && (o.ev || null) === ev;
        this.sql.exec(`INSERT OR REPLACE INTO sappt (id,mid,j,day,ev,at,d1,h2) VALUES (?,?,?,?,?,?,?,?)`, a.id, c.mid, JSON.stringify({ t: a.t, date: a.date, time: a.time, place: a.place, kind: a.kind }), a.date, ev, now, same ? o.d1 : 0, same ? o.h2 : 0);
      }
      for (const id of keep.keys()) if (!seen.includes(id)) this.sql.exec(`DELETE FROM sappt WHERE id=?`, id);
      c.last = now; c.n = seen.length; this.saSave(c); return J({ ok: 1, n: seen.length });
    }
    if (p === '/interest' && m === 'GET') return J(this.interestList(me.id, now));
    if (p === '/interest' && m === 'POST') {
      const b = await body(), id = String(b.id || '').slice(0, 64); if (!id) return J({ err: 'no id' }, 400);
      if (b.on) { const j = JSON.stringify({ t: String(b.t || '').slice(0, 160), url: /^https:\/\//.test(b.url || '') ? String(b.url).slice(0, 400) : '', img: /^https:\/\//.test(b.img || '') ? String(b.img).slice(0, 400) : '', where: String(b.where || '').slice(0, 120), topic: String(b.topic || '').slice(0, 16) }), ev = Number.isFinite(+b.ev) && +b.ev > 0 ? +b.ev : null;
        this.sql.exec(`INSERT INTO intr (mid,eid,j,ev,at) VALUES (?,?,?,?,?) ON CONFLICT(mid,eid) DO UPDATE SET j=excluded.j, ev=excluded.ev`, me.id, id, j, ev, now); }
      else this.sql.exec(`DELETE FROM intr WHERE mid=? AND eid=?`, me.id, id);
      return J(this.interestList(me.id, now));
    }
    if (p === '/dates' && m === 'GET') { // 1.9.35 others only ever see the day and month: the age is for the person themselves (and Shane)
      const list = this.upcoming(now).map(d => admin || d.mid === me.id ? d : { ...d, turns: null });
      const mine = this.one(`SELECT m,d,y FROM dates WHERE mid=? AND kind='bday' AND del=0 ORDER BY id DESC LIMIT 1`, me.id);
      return J({ list, admin, mine: mine || null, imp: +((this.one(`SELECT v FROM meta WHERE k='bdimp'`) || {}).v || 0) });
    }
    if (p === '/bdays' && m === 'GET') { // 1.9.37 admin only: members' birthdays, so Shane's phone can add missing ones to My App
      if (!admin) return J({ err: 'admin only' }, 403);
      const rows = this.all(`SELECT d.mid, m.name, d.m, d.d, d.y FROM dates d JOIN members m ON m.id=d.mid AND m.removed=0 WHERE d.kind='bday' AND d.del=0 ORDER BY d.id`), by = {};
      for (const r of rows) if (!/^Test /.test(r.name)) by[r.mid] = r; // the latest per member
      return J({ list: Object.values(by) });
    }
    if (p === '/dates/imported' && m === 'POST') { if (!admin) return J({ err: 'admin only' }, 403); this.sql.exec(`INSERT INTO meta (k,v) VALUES ('bdimp',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, String(now)); return J({ ok: 1 }); } // 1.9.35 Shane's phone has matched My App's birthdays
    if (p === '/dates' && m === 'POST') {
      const b = await body(), kind = b.kind === 'event' ? 'event' : 'bday', mo = +b.m, d = +b.d, y = b.y ? +b.y : null;
      if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31) || (y && (y < 1900 || y > 2100))) return J({ err: 'check the date' }, 400);
      const title = String(b.title || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80);
      if (kind === 'event' && !admin) return J({ err: 'only Shane adds family events' }, 403);
      let mid = null;
      if (kind === 'bday') { mid = admin && b.mid !== undefined ? (b.mid || null) : me.id; if (!admin && mid !== me.id) return J({ err: 'you can add your own birthday' }, 403); }
      if (kind === 'bday' && mid) { const nm = this.one(`SELECT name FROM members WHERE id=?`, mid); if (!nm) return J({ err: 'no such member' }, 404); const old = this.one(`SELECT y FROM dates WHERE mid=? AND kind='bday' AND del=0 ORDER BY id DESC LIMIT 1`, mid); if (!b.y && old && old.y && admin && mid !== me.id) b.y = old.y; this.sql.exec(`UPDATE dates SET del=1 WHERE mid=? AND kind='bday'`, mid); if (!title && nm) b.title = nm.name + '’s birthday'; }
      const t = String(b.title || title).trim().slice(0, 80); if (!t) return J({ err: 'needs a name' }, 400);
      this.sql.exec(`INSERT INTO dates (kind,title,mid,m,d,y,by,at) VALUES (?,?,?,?,?,?,?,?)`, kind, t, mid, mo, d, b.y ? +b.y : null, me.id, now);
      return J({ id: this.one(`SELECT last_insert_rowid() id`).id });
    }
    let mm = p.match(/^\/dates\/(\d+)$/);
    if (mm && m === 'DELETE') { const r = this.one(`SELECT id,mid,by FROM dates WHERE id=? AND del=0`, +mm[1]); if (!r) return J({ err: 'gone' }, 404); if (!admin && r.mid !== me.id) return J({ err: 'only your own' }, 403); this.sql.exec(`UPDATE dates SET del=1 WHERE id=?`, r.id); return J({ ok: 1 }); }
    // ---- push
    if (p === '/push/key') return J({ key: VAPID_PUBLIC });
    if (p === '/push/sub' && m === 'POST') { const b = await body(), ep = String(b.endpoint || ''); if (!/^https:\/\/[\w.-]+\//.test(ep) || ep.length > 800) return J({ err: 'bad subscription' }, 400); this.sql.exec(`INSERT INTO subs (endpoint,mid,at) VALUES (?,?,?) ON CONFLICT(endpoint) DO UPDATE SET mid=excluded.mid, at=excluded.at`, ep, me.id, now); return J({ ok: 1, prefs: this.np(me.id) }); }
    if (p === '/push/sub' && m === 'DELETE') { const b = await body(); this.sql.exec(`DELETE FROM subs WHERE mid=? AND (endpoint=? OR ?='')`, me.id, String(b.endpoint || ''), String(b.endpoint || '')); return J({ ok: 1 }); }
    if (p === '/push/prefs' && m === 'GET') return J({ prefs: this.np(me.id), on: !!this.one(`SELECT endpoint FROM subs WHERE mid=?`, me.id) });
    if (p === '/push/prefs' && m === 'PUT') { const b = await body(), o = {}; for (const k of NOTE_TYPES) if (k in b) o[k] = b[k] ? 1 : 0; for (const k of ['qFrom', 'qTo']) if (Number.isInteger(b[k]) && b[k] >= 0 && b[k] < 24) o[k] = b[k]; const cur = this.np(me.id); delete cur.last; this.sql.exec(`INSERT INTO npref (mid,j,last) VALUES (?,?,0) ON CONFLICT(mid) DO UPDATE SET j=excluded.j`, me.id, JSON.stringify({ ...cur, ...o })); return J({ prefs: this.np(me.id) }); }
    if (p === '/push/inbox') { // what the phone shows for a push (and the 🔔 list): newest first, marked seen
      const rows = this.all(`SELECT id,type,text,card,at FROM notes WHERE mid=? AND sent!=0 AND seen=0 ORDER BY at DESC LIMIT 12`, me.id);
      if (u.searchParams.get('peek') === null) this.sql.exec(`UPDATE notes SET seen=1 WHERE mid=? AND sent!=0`, me.id);
      return J({ notes: rows });
    }
    if (p === '/push/test' && m === 'POST') { if (!this.one(`SELECT endpoint FROM subs WHERE mid=?`, me.id)) return J({ err: 'notifications aren’t on for this phone' }, 400); this.sql.exec(`INSERT INTO notes (mid,type,text,card,at,due) VALUES (?,?,?,?,?,?)`, me.id, 'reply', '🔔 Test: notifications are working!', '', now, now); const st = []; for (const s of this.all(`SELECT endpoint FROM subs WHERE mid=?`, me.id)) { try { st.push(await sendPush(this.f.env, s.endpoint)); } catch (e) { st.push(String(e.message || e).slice(0, 80)); } } this.sql.exec(`UPDATE notes SET sent=? WHERE mid=? AND sent=0 AND type='reply' AND text LIKE '🔔 Test%'`, now, me.id); return J({ ok: st.some(x => x < 300) ? 1 : 0, status: st }); }
    // ---- admin: age band & life stage (never shown to other members)
    mm = p.match(/^\/members\/(m[0-9a-f]{12})\/profile$/);
    if (mm && m === 'PUT') { if (!admin) return J({ err: 'admin only' }, 403); const b = await body(); const age = AGES.includes(b.age) ? b.age : '', stage = STAGES[b.stage] ? b.stage : '', sugg = (Array.isArray(b.sugg) ? b.sugg : []).filter(t => EXTRA.includes(t)).join(','), cur = this.one(`SELECT sit FROM mprof WHERE mid=?`, mm[1]) || {}, sit = Array.isArray(b.sit) ? [...new Set(b.sit.filter(k => SITS[k]))].join(',') : (cur.sit || ''); this.sql.exec(`INSERT INTO mprof (mid,age,stage,sugg,sit) VALUES (?,?,?,?,?) ON CONFLICT(mid) DO UPDATE SET age=excluded.age, stage=excluded.stage, sugg=excluded.sugg, sit=excluded.sit`, mm[1], age, stage, sugg, sit); return J({ ok: 1, age, stage, sugg, sit }); }
    if (p === '/cars' && m === 'GET') { // a member sees only the cars shared with them; Shane sees the whole list
      if (!admin) await this.carsFromRelay().catch(() => { });
      const rows = admin ? this.all(`SELECT c.plate, c.mid, m.name, c.data, c.src, c.at FROM carshare c LEFT JOIN members m ON m.id=c.mid`) : this.all(`SELECT plate, mid, data, src, at FROM carshare WHERE mid=?`, me.id);
      return J({ cars: rows.map(r => ({ plate: r.plate, mid: r.mid, name: r.name, src: r.src, at: r.at, car: r.data ? JSON.parse(r.data) : null })) });
    }
    if (p === '/cars' && m === 'PUT') { // Shane: share a car's dates with one person (mid) or stop (mid empty)
      if (!admin) return J({ err: 'admin only' }, 403);
      const b = await body(), plate = PLATE(b.plate); if (!plate) return J({ err: 'plate needed' }, 400);
      if (!b.mid) { this.sql.exec(`DELETE FROM carshare WHERE plate=?`, plate); return J({ ok: 1, plate, mid: null }); }
      const t = this.one(`SELECT id FROM members WHERE id=? AND removed=0 AND role!='admin' AND role!='friend'`, String(b.mid)); if (!t) return J({ err: 'no such member' }, 404);
      this.sql.exec(`INSERT INTO carshare (plate,mid,by,at) VALUES (?,?,?,0) ON CONFLICT(plate) DO UPDATE SET mid=excluded.mid`, plate, t.id, me.id);
      this.sql.exec(`DELETE FROM meta WHERE k='relaycars'`); await this.carsFromRelay().catch(() => { });
      return J({ ok: 1, plate, mid: t.id });
    }
    if (p === '/cars/sync' && m === 'POST') { // Shane's phone: the latest dates for the cars he shares (anything else is ignored)
      if (!admin) return J({ err: 'admin only' }, 403);
      const b = await body(), shared = new Set(this.all(`SELECT plate FROM carshare`).map(r => r.plate)); let n = 0;
      for (const c of (Array.isArray(b.cars) ? b.cars : []).slice(0, 8)) { const o = cleanCarShare(c); if (!o || !shared.has(o.plate)) continue; this.sql.exec(`UPDATE carshare SET data=?, src='phone', at=? WHERE plate=?`, JSON.stringify(o), now, o.plate); n++; }
      return J({ ok: 1, n });
    }
    if (p === '/stages') return J({ stages: Object.fromEntries(Object.entries(STAGES).map(([k, v]) => [k, v.label])), ages: AGES, sits: SITS });
    return null;
  }
}
function monthAgo(k) { let y = +k.slice(0, 4), mo = +k.slice(4, 6) - 1, d = +k.slice(6, 8); if (mo === 0) { mo = 12; y--; } const last = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return y + String(mo).padStart(2, '0') + String(Math.min(d, last)).padStart(2, '0'); }
