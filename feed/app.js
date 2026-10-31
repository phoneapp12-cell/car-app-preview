/* My Feed – Shane's private photo and video feed. No likes counts, comments, followers or sharing.
   Thumbs up / down are saved on this phone only (localStorage) and only change the order of this feed. */
'use strict';
const APP_VERSION = '1.5.0';
const FEED_URL = 'https://shane-my-feed-data.phoneapp12.workers.dev/feed.json';
const MY_APP = '../'; // My Feed lives at My App's address + feed/, so My App is one level up
const TOPICS = [
  ['all', 'All', '✨', '#7c3aed', '#ec4899'],
  ['life', 'For You', '📌', '#0f766e', '#2563eb'],
  ['sitcoms', 'Sitcoms', '😂', '#f59e0b', '#ef4444'],
  ['garden', 'Gardening', '🌱', '#16a34a', '#65a30d'],
  ['music', 'Music', '🎵', '#db2777', '#9333ea'],
  ['scifi', 'Sci-fi & Space', '🚀', '#2563eb', '#7c3aed'],
  ['nz', 'Around NZ', '🇳🇿', '#0891b2', '#1d4ed8'],
  ['dogs', 'Dogs', '🐶', '#ea580c', '#a16207'],
  ['nature', 'Nature', '🌿', '#059669', '#0e7490'],
  ['events', 'NZ events', '🎆', '#be123c', '#7c3aed'],
  ['food', 'Food (GF)', '🍲', '#c2410c', '#eab308'],
  ['tech', 'AI & tech', '🤖', '#4f46e5', '#06b6d4'],
  ['diy', 'DIY', '🛠️', '#9a3412', '#f59e0b'],
  ['science', 'Science', '🔬', '#0e7490', '#2563eb'],
  ['travel', 'Travel', '✈️', '#0369a1', '#14b8a6'],
  ['fitness', 'Fitness & weights', '💪', '#0f766e', '#14b8a6'],
  ['selling', 'Selling & side hustles', '💰', '#15803d', '#ca8a04'],
  ['creative', 'Creative & crafts', '🎨', '#c026d3', '#f97316'],
  ['culture', 'Culture & stage', '🎭', '#7c2d12', '#be123c'],
  ['learn', 'Learning & ideas', '📖', '#1e40af', '#0891b2'],
  ['games', 'Games & puzzles', '🎲', '#6d28d9', '#2563eb'],
  ['collect', 'Collecting', '🏺', '#92400e', '#a16207'],
  ['outdoors', 'Outdoors', '🏕️', '#166534', '#0d9488'],
  ['cars', 'Cars & machines', '🚗', '#1e3a8a', '#475569'],
  ['photos', 'My Photos', '🖼️', '#be185d', '#f59e0b'],
  ['liked', 'Liked', '👍', '#16a34a', '#0d9488']
];
const TOPIC = Object.fromEntries(TOPICS.map(t => [t[0], t])); // 1.4.0: About-you chips are added to this as they're found
const BASE = { sitcoms: 1.35, garden: 1.1, music: 1, scifi: 1.05, nz: 1, dogs: 1, nature: 0.95, events: 0.9, food: 0.95, tech: 0.85, diy: 0.85, science: 0.85, travel: 0.85, fitness: 0.85, selling: 0.85, creative: 0.8, culture: 0.75, learn: 0.75, games: 0.75, collect: 0.75, outdoors: 0.8, cars: 0.75 }; // sitcoms lead
const baseOf = t => BASE[t] || (String(t).startsWith('you:') ? 0.8 : 1);
const SPORT = /\b(sports?|rugby|all blacks|black ferns|super rugby|league|nrl|warriors|cricket|black ?caps|netball|silver ferns|football|soccer|fifa|premier league|afl|basketball|nba|nfl|golf|tennis|motorsport|formula ?1|f1|grand prix|supercars|boxing|ufc|mma|wrestling|athletics|olympics?|commonwealth games|hockey|rowing|america'?s cup|sailgp|triathlon|horse racing|darts|snooker|volleyball|baseball|world cup|bledisloe|test match|tyson fury|heavyweight)\b/i;
const PAGE = 12;
const THUMB = {
  up: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path class="sh" d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path class="ln" d="M7 10v12"/></svg>',
  dn: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path class="sh" d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/><path class="ln" d="M17 14V2"/></svg>'
};

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k, d) { try { const v = localStorage.getItem('mf.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('mf.' + k, JSON.stringify(v)); } catch (e) { } } };

/* ---- 1.5.0: Interests. Shane's list (simplicable.com/life/interests) plus cooking, exercise, weights and selling.
   Sport is left out entirely. Each interest belongs to a topic chip (new groups, or an existing tab it fits). Switch
   any of them off in ⚙️ → Manage interests: their sources and matching posts disappear from the feed. ---- */
const INTERESTS = [ // name, topic, words that mark a post as being about it
  ['Cooking', 'food', 'cook(ing)?|recipes?|dinner|kitchen'], ['Baking', 'food', 'bak(e|ing|ed)|bread|cake|muffins?|pastry|tart'], ['Cuisine', 'food', 'cuisine|dish(es)?|flavou?rs?|street food'],
  ['Exercise', 'fitness', 'exercises?|workouts?|home workout|hiit|cardio|stretch(ing)?'], ['Weights', 'fitness', 'weights?|weight training|strength|lifting|dumbbells?|barbells?|kettlebells?|squats?|deadlifts?|bench press|muscle|hypertrophy|home gym'],
  ['Fitness', 'fitness', 'fitness|fit\\b|get fit|training plan'], ['Yoga', 'fitness', 'yoga'], ['Meditation', 'fitness', 'meditat(e|ion|ing)|mindful(ness)?'], ['Health', 'fitness', 'health(y)?|sleep|nutrition'], ['Wellness', 'fitness', 'wellness|wellbeing|well-being|self-care'],
  ['Selling', 'selling', 'sell(ing)?|resell(ing)?|resale|flip(ping|ped)?|trade me|marketplace|thrift(ing)?|garage sale|op shop|car boot|declutter(ing)?|ebay|etsy'], ['Shopping', 'selling', 'shopping|haul|thrift store'],
  ['Entrepreneurship', 'selling', 'entrepreneurs?|side hustles?|start-?ups?|small business'], ['Business', 'selling', 'business(es)?'],
  ['Art', 'creative', 'art(ist|work)?s?|painting|paintings|sculpture|gallery|mural'], ['Drawing', 'creative', 'drawing|sketch(es|ing)?|illustrat(ion|or)'], ['Calligraphy', 'creative', 'calligraphy|lettering'], ['Crafts', 'creative', 'crafts?|handmade|crochet|embroider(y|ed)|quilt(ing)?'],
  ['Creative Pursuits', 'creative', 'creativ(e|ity)'], ['Knitting', 'creative', 'knit(ting|ted)?|yarn|wool'], ['Sewing', 'creative', 'sew(ing|n)?|sewing machine|quilt'], ['Origami', 'creative', 'origami|paper ?craft'],
  ['Photography', 'creative', 'photograph(y|er|s)?|camera|lens|itap'], ['Design', 'creative', 'design(er|ed)?'], ['Interior Design', 'creative', 'interior|living room|bedroom|home decor|cozy|cosy'], ['Architecture', 'creative', 'architect(ure|s)?|building|house design'],
  ['Fashion', 'creative', 'fashion|outfit|clothing|style'], ['Writing', 'learn', 'writ(ing|er|ers)|novel(ist)?|author'], ['Storytelling', 'learn', 'stor(y|ies|ytelling)'], ['Media Production', 'creative', 'video editing|film-?making|podcast(ing)?|youtube(r)?'], ['Cosplay', 'culture', 'cosplay|costumes?'],
  ['Acting', 'culture', 'act(ing|or|ors|ress)'], ['Ballet', 'culture', 'ballet|ballerina'], ['Dance', 'culture', 'danc(e|ing|er)'], ['Theatre', 'culture', 'theat(re|er)|musical|broadway|west end|stage'],
  ['Culture', 'culture', 'cultur(e|al)'], ['Traditional Culture', 'culture', 'tradition(al)?|māori|maori|te reo|heritage|folk'], ['Languages', 'learn', 'languages?|te reo|french|spanish|japanese|learn(ing)? to speak'],
  ['History', 'culture', 'histor(y|ic|ical)|ancient|century|war|medieval|archaeolog(y|ists?)'], ['Museums', 'culture', 'museums?|exhibit(ion)?s?|artefacts?|artifacts?'], ['Anime & Manga', 'sitcoms', 'anime|manga|studio ghibli'],
  ['Learning', 'learn', 'learn(ing)?|lessons?'], ['Education', 'learn', 'educat(ion|ional)|school|universit(y|ies)|students?'], ['Reading', 'learn', 'books?|reading|read|novel|library'],
  ['Philosophy', 'learn', 'philosoph(y|er|ers|ical)|stoic(ism)?|ethics'], ['Psychology', 'learn', 'psycholog(y|ists?|ical)|brain|personality|anxiety'], ['Sociology', 'learn', 'sociolog(y|ists?)|societ(y|ies)|social'],
  ['Self-Improvement', 'learn', 'self-?improvement|habits?|productiv(e|ity)|motivation'], ['Debate', 'learn', 'debat(e|es|ing)|argument'], ['Public Speaking', 'learn', 'public speaking|speech|talks?|ted'], ['Leadership', 'learn', 'leader(s|ship)?|manag(er|ing|ement)'],
  ['Law', 'learn', 'law|legal|court|lawyer'], ['Medicine', 'science', 'medic(ine|al)|doctors?|disease|vaccines?|hospital'], ['Politics', 'nz', 'politic(s|al|ians?)|election|parliament|government|minister'], ['Religion & Spirituality', 'learn', 'relig(ion|ious)|spiritual(ity)?|faith|church|buddhis(m|t)'],
  ['Family', 'learn', 'famil(y|ies)|parent(s|ing)?|kids|grandparents?'], ['Simple Living', 'learn', 'simple living|minimalis(m|t)|declutter(ing)?|frugal|slow living'], ['Volunteering', 'outdoors', 'volunteer(s|ing)?|charity|community'],
  ['Research', 'science', 'research(ers)?|study|studies|scientists?'], ['Game Theory', 'games', 'game theory'], ['Strategy', 'games', 'strateg(y|ic)|tactics'],
  ['Board Games', 'games', 'board ?games?|tabletop|card games?|dice|catan'], ['Chess', 'games', 'chess|checkmate'], ['Puzzles', 'games', 'puzzles?|jigsaw|crossword|sudoku|wordle'], ['Trivia', 'games', 'trivia|quiz|fun facts?|did you know'], ['Video Games', 'games', 'video ?games?|gaming|nintendo|playstation|xbox|steam|switch 2'],
  ['Collecting', 'collect', 'collect(ing|ion|or|ors|ible|ibles)|antiques?|vintage|vinyl|records?|coins?|stamps?|figures?'], ['Model Building', 'collect', 'model (kit|building|car|ship|train)|scale model|lego|miniatures?|diorama'],
  ['Camping', 'outdoors', 'camp(ing|site|er|ground)?|tent'], ['Hiking', 'outdoors', 'hik(e|ing|er)|tramp(ing)?|trail|walkway|track'], ['Walking', 'outdoors', 'walk(s|ing)?|stroll'], ['Diving & Snorkelling', 'outdoors', 'div(e|ing)|scuba|snorkel(ling|ing)?|reef'],
  ['Environmental Action', 'outdoors', 'environment(al)?|climate|conservation|pollution|plastic|recycl(e|ing)|sustainab(le|ility)'],
  ['Cars & Driving', 'cars', 'cars?|driv(e|ing|er)|road trip|ute|sedan|ev\\b|electric vehicle|engine'], ['Machines', 'cars', 'machines?|machinery|engines?|tractors?|excavators?|cranes?|locomotives?|mechanic(al)?'],
  ['Engineering', 'science', 'engineer(s|ing)?|bridge|construction'], ['Mathematics', 'science', 'math(s|ematics|ematicians?)?|equations?|numbers?|geometry'], ['Science', 'science', 'scien(ce|tific|tists?)|physics|chemistry|biology'],
  ['Astronomy', 'scifi', 'astronom(y|ers?)|telescope|stargaz(e|ing)|planets?|stars?|galax(y|ies)|nebula|comet|eclipse'], ['Space', 'scifi', 'space|nasa|rockets?|astronauts?|moon|mars|spacex'],
  ['Gardening', 'garden', 'garden(s|ing|er)?|plants?|seeds?|grow(ing)?|soil|compost'], ['Beekeeping', 'garden', 'bees?|beekeep(ing|er)|hives?|honey'],
  ['Nature', 'nature', 'nature|wildlife|forest|ocean|landscape'], ['Animals', 'nature', 'animals?|cats?|kittens?|birds?|wildlife|zoo'], ['Birdwatching', 'nature', 'birds?|birding|birdwatch(ing)?|tūī|tui|kererū|kiwi bird'],
  ['Travel', 'travel', 'travel|trip|holiday|destination|tourism'], ['Theme Parks', 'travel', 'theme parks?|roller ?coasters?|rides?|disneyland|rainbow’s end|rainbows end'],
  ['Technology', 'tech', 'tech(nology)?|gadgets?|smartphones?|iphone|android'], ['Computers', 'tech', 'computers?|pcs?|laptops?|windows|mac(book)?|linux'], ['Coding', 'tech', 'cod(e|ing)|programming|developers?|software|python|javascript'],
  ['Robotics', 'tech', 'robot(s|ics)?|automation|drones?'], ['Low Technology', 'diy', 'low-?tech|off-?grid|hand tools?|solar oven|repair'], ['Social Media', 'tech', 'social media|instagram|facebook|tiktok|youtube|reddit'],
  ['DIY', 'diy', 'diy|how to|build|built|made|fix(ed|ing)?'], ['Carpentry', 'diy', 'carpentry|carpenter|joinery|framing'], ['Woodworking', 'diy', 'wood(working|work|en)?|lathe|chisel'], ['Maker Culture', 'diy', 'maker|3d print(ed|ing|er)?|arduino|raspberry pi|electronics'],
  ['Creative Reuse', 'diy', 'upcycl(e|ed|ing)|repurpos(e|ed|ing)|reus(e|ed|ing)|second life|salvag(e|ed)'], ['Cleaning', 'diy', 'clean(ing|ed|er)?|tidy|stain|mould|mold|pressure wash'],
  ['Television', 'sitcoms', 'tv|television|series|season|episode|show'], ['Comedy', 'sitcoms', 'comed(y|ian|ians)|funny|sitcom|stand-?up|sketch'], ['Film', 'sitcoms', 'films?|movies?|cinema|trailer|director'], ['Pop Culture', 'sitcoms', 'pop culture|celebrit(y|ies)|viral'], ['Fandom', 'sitcoms', 'fans?|fandom|marvel|star wars|star trek|doctor who|lord of the rings'],
  ['Music Appreciation', 'music', 'music|albums?|songs?|bands?|singers?|records?'], ['Music Production', 'music', 'synth(s|esizers?)?|producer|studio|mixing|daw|beats?'], ['Singing', 'music', 'sing(ing|er|ers)?|vocal(s|ist)?|choir'], ['Concerts', 'music', 'concerts?|gigs?|tours?|live music'],
  ['Festivals', 'events', 'festivals?|fair|carnival|parade|fireworks'], ['Nightlife', 'events', 'nightlife|bars?|pub|club|comedy night|quiz night'], ['Socializing', 'events', 'meet-?ups?|social(ising|izing)|friends|community event']
].map(([name, topic, words]) => ({ name, topic, re: new RegExp('\\b(' + words + ')\\b', 'i') }));
// From Shane's list, left out as sport: Sports, Golf, Martial Arts, Darts, Pool, Frisbee, Cycling, Running, Swimming, Sailing,
// Canoeing, Climbing, Horseback Riding, Skateboarding, Skating, Inline Skating, Skiing & Snowboarding, Surfing & Bodyboarding.
// Left out as money: Investing.
const INT_BY_NAME = new Map(INTERESTS.map(x => [x.name, x]));
let INT_OFF = ls.get('intOff', {});     // interest name -> 1 when he's switched it off
let SRC_INT = {};                        // source id -> its interests (from the feed's source list)
function noteSrcInts() { SRC_INT = {}; for (const s of (FEED && FEED.sources) || []) if (Array.isArray(s.int)) SRC_INT[s.id] = s.int; }
function itemInts(i) { // the interests a post belongs to: its source's, then any it clearly mentions in its title
  if (i._ints) return i._ints;
  const out = (SRC_INT[i.src] || []).slice(), title = (i.t || '') + ' ' + (i.tag || '');
  for (const x of INTERESTS) if (!out.includes(x.name) && x.topic === i.topic && x.re.test(title)) out.push(x.name);
  return (i._ints = out);
}
function intHidden(i) {
  const s = SRC_INT[i.src];
  if (s && s.length && s.every(n => INT_OFF[n])) return true;                 // every interest this source serves is off
  if (Object.keys(INT_OFF).length) { const t = (i.t || '') + ' ' + (i.s || ''); for (const n in INT_OFF) { const x = INT_BY_NAME.get(n); if (x && x.re.test(t) && !(s && s.some(m => !INT_OFF[m]))) return true; } }
  return false;
}
const GROUP_TOPICS = ['fitness', 'selling', 'creative', 'culture', 'learn', 'games', 'collect', 'outdoors', 'cars'];
const topicOn = t => !GROUP_TOPICS.includes(t) || INTERESTS.some(x => x.topic === t && !INT_OFF[x.name]);

let FEED = ls.get('feed', null);
let VOTES = ls.get('votes', {});        // id -> { v: 1 | -1, topic, src, at, item }
let SEEN = ls.get('seen', {});          // id -> times shown (keeps the feed fresh)
let IMP = ls.get('imp', {});            // 1.4.0: source -> cards shown (new sources get a trial, then your votes decide)
let REVIVE = ls.get('revive', {});
let KNOWN = ls.get('known', null);      // source -> when it first turned up here (0 = it was already here before 1.4.0)
const NEW14 = /^(decider|tvline|denofgeek-tv|kings-|yates|gw|pitchfork|stereogum|consequence|utr|universetoday|earthsky|esa|rd-astrophoto|advocate|nzh|1news|newsroom|nzgeo|events-|akc|rd-puppies|doc|inat-nz|rd-birdphoto|verge|ars|hackaday|rd-diy|rd-woodworking|sciencealert|physorg|nasa-earth|atlas|nzh-travel|rd-travel|rd-cityporn|gfshoestring|recipetin|rd-glutenfree|rd-food|you-)/;
function noteSources() {
  const first = !KNOWN; KNOWN = KNOWN || {};
  const ids = (FEED && FEED.sources || []).map(x => x.id).concat(['you-itunes', 'you-tvmaze', 'you-mealdb', 'you-openlib', 'you-wiki']);
  let ch = false; for (const id of ids) if (!(id in KNOWN)) { KNOWN[id] = first && !NEW14.test(id) ? 0 : Date.now(); ch = true; }
  if (ch) ls.set('known', KNOWN);
}
const isNewSrc = k => !!(KNOWN && KNOWN[k] && Date.now() - KNOWN[k] < 28 * 864e5);      // source -> when you brought it back (older 👎 for it no longer count)
let tab = ls.get('tab', 'all');
let order = [], shown = 0, io = null;

/* ---- ranking (all on this phone) ---- */
function weights() {
  const t = {}, s = {}, up = {}, dn = {}, lastUp = {}, ints = {}, now = Date.now();
  for (const v of Object.values(VOTES)) {
    const age = Math.max(0, (now - (v.at || 0)) / 864e5), fade = Math.pow(0.5, age / 45); // votes fade over ~6 weeks
    t[v.topic] = (t[v.topic] || 0) + v.v * fade;
    for (const n of v.ints || []) ints[n] = (ints[n] || 0) + v.v * fade;
    if (REVIVE[v.src] && (v.at || 0) < REVIVE[v.src]) continue;
    s[v.src] = (s[v.src] || 0) + v.v * fade;
    if (v.v > 0) { up[v.src] = (up[v.src] || 0) + 1; lastUp[v.src] = Math.max(lastUp[v.src] || 0, v.at || 0); } else dn[v.src] = (dn[v.src] || 0) + 1;
  }
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  // A source is dropped after about four more 👎 than 👍 (and no 👍 for a month). A new source with no votes yet
  // gets a trial boost for its first ~30 cards so you get to judge it.
  const drop = k => (s[k] || 0) <= -3.5 && !((lastUp[k] || 0) > now - 30 * 864e5);
  const trial = k => isNewSrc(k) && !up[k] && !dn[k] && (IMP[k] || 0) < 30;
  return { int: k => clamp(1 + 0.15 * (ints[k] || 0), 0.4, 2.5), topic: k => clamp(1 + 0.12 * (t[k] || 0), 0.3, 2.5), src: k => drop(k) ? 0 : clamp(1 + 0.2 * (s[k] || 0), 0.15, 3) * (trial(k) ? 1.35 : 1), drop, trial, up: k => up[k] || 0, dn: k => dn[k] || 0, net: k => s[k] || 0 };
}
function intW(W, i) { const n = itemInts(i).slice(0, 3); return n.length ? n.reduce((a, k) => a * W.int(k), 1) ** (1 / n.length) : 1; } // 👍/👎 also teach it which interests you like
function rand(seed) { let x = seed % 2147483647; if (x <= 0) x += 2147483646; return () => (x = x * 16807 % 2147483647) / 2147483647; }
function rank(items) {
  const W = weights(), now = Date.now();
  const scored = items.map(i => {
    const ref = i.kind === 'tv' && i.ev ? Math.min(i.ev, now) : (i.first && i.at < i.first - 3 * 864e5 ? (i.at + i.first) / 2 : i.at);
    const ageH = Math.max(0, (now - ref) / 36e5);
    const fresh = Math.pow(0.5, ageH / 30);                        // half as strong every 30 hours
    const media = i.vid ? 1.15 : i.img ? 1.1 : i.kind === 'tip' ? 0.8 : 0.6; // pictures and videos first
    const seen = Math.pow(0.8, SEEN[i.id] || 0);                   // seen a few times: let new things through
    const hot = i.hot ? 1.5 : 1;                                   // e.g. fireworks this week
    return { i, sc: (0.15 + fresh) * media * seen * hot * baseOf(i.topic) * W.topic(i.topic) * W.src(i.src) * intW(W, i) };
  }).sort((a, b) => b.sc - a.sc);
  // Mix: each step takes the best next post from the topic that's due, so every interest gets a turn
  // (higher-voted topics, and sitcoms, come round more often). About 1 in 7 slots explores further down a list.
  const r = rand(Math.floor(now / 36e5) + Object.keys(VOTES).length * 7), out = [], Q = {};
  for (const p of scored) (Q[p.i.topic] = Q[p.i.topic] || []).push(p);
  const total = scored.length;
  const lastAt = {}; // step when each topic was last shown: the longer since, the more it's due
  while (out.length < total) {
    const n = out.length, prevSrc = (out[n - 1] || {}).src;
    let bestT = null, best = -1;
    for (const t in Q) {
      if (!Q[t].length) continue;
      const gap = n - (t in lastAt ? lastAt[t] : -8); // 1.5.0: topics not shown yet keep getting more due too
      const v = Math.sqrt(Q[t][0].sc) * gap * Math.pow(baseOf(t), 3) * W.topic(t) * (0.8 + 0.4 * r()); // sitcoms and liked topics come round more often
      if (v > best) { best = v; bestT = t; }
    }
    lastAt[bestT] = n;
    const q = Q[bestT]; let k = 0, explore = false;
    if (q.length > 6 && r() < 0.14) { k = 2 + Math.floor(r() * Math.min(q.length - 2, 30)); explore = true; }
    else if (q[0].i.src === prevSrc) { const j = q.findIndex(p => p.i.src !== prevSrc); if (j > 0 && j < 6) k = j; }
    const [p] = q.splice(k, 1); p.i._x = explore; out.push(p.i);
  }
  return out;
}
function visible() {
  if (!FEED) return [];
  if (tab === 'liked') return Object.values(VOTES).filter(v => v.v > 0 && v.item).sort((a, b) => b.at - a.at).map(v => v.item);
  const seenIds = new Set(), W = weights();
  return FEED.items.concat(youItems()).filter(i => {
    if (seenIds.has(i.id)) return false; seenIds.add(i.id);
    if (VOTES[i.id] && VOTES[i.id].v < 0) return false;          // thumbs-down: gone
    if (SPORT.test((i.t || '') + ' ' + (i.s || ''))) return false; // never any sport
    if (W.drop(i.src)) return false;                               // a source you've voted out
    if (!topicOn(i.topic) || intHidden(i)) return false;           // interests you've switched off
    return tab === 'all' || i.topic === tab;
  });
}

/* ---- For You: Shane's own things plus every board and hub in My App, read on this phone from what My App left in
   localStorage (key myFeedLife). Nothing personal is fetched from or sent to any server. Bills and money are left
   out by My App and again here. 1.2.0: every card has a big picture, and they are mixed at random through All. ---- */
const LIFE_CAT = { // emoji, label, colour 1, colour 2, My App page
  car: ['🚗', 'Cars', '#2563eb', '#0ea5e9', '#cars'], pet: ['🐾', 'Zeus & pets', '#ea580c', '#f59e0b', '#pets'], bday: ['🎂', 'Birthday', '#db2777', '#f97316', '#birthdays'],
  health: ['🩺', 'Health', '#0d9488', '#22c55e', '#health'], todo: ['✅', 'To-do', '#7c3aed', '#6366f1', '#todo'], gym: ['🏋️', 'Gym', '#0f766e', '#14b8a6', '#gym'],
  meal: ['🍽️', 'Dinner', '#c2410c', '#eab308', '#meals'], hol: ['🎉', 'Holidays', '#9333ea', '#ec4899', '#calendar'], event: ['📅', 'What’s on', '#1d4ed8', '#7c3aed', '#events'],
  reno: ['🔨', 'Reno', '#92400e', '#d97706', '#projects'], delivery: ['📦', 'Delivery', '#a16207', '#ca8a04', '#alerts'], flag: ['🎟️', 'Flagged event', '#be123c', '#f43f5e', '#events'],
  road: ['🚧', 'Roads', '#b45309', '#f59e0b', '#roadworks'], alert: ['⚠️', 'Heads up', '#b91c1c', '#f97316', '#weather'], weather: ['⛅', 'Weather', '#0284c7', '#38bdf8', '#weather'],
  solar: ['☀️', 'Solar', '#ca8a04', '#f59e0b', '#power'], power: ['⚡', 'Power (kWh)', '#ca8a04', '#16a34a', '#power'], uv: ['🕶️', 'UV', '#ea580c', '#facc15', '#weather'],
  garden: ['🌱', 'My garden', '#15803d', '#84cc16', '#garden'], gardening: ['🌿', 'Gardening board', '#15803d', '#65a30d', '#gardening'],
  space: ['🪐', 'Space board', '#312e81', '#7c3aed', '#space'], astro: ['🔭', 'Astronomy board', '#1e1b4b', '#4338ca', '#astronomy'], travel: ['✈️', 'Travel board', '#0369a1', '#14b8a6', '#travel'],
  science: ['🔬', 'Science board', '#0e7490', '#2563eb', '#science'], aitech: ['🤖', 'AI & tech', '#4f46e5', '#06b6d4', '#aitech'], diy: ['🛠️', 'DIY board', '#9a3412', '#f59e0b', '#diy'],
  coding: ['💻', 'Coding board', '#0f172a', '#2563eb', '#coding'], walk: ['🥾', 'Walks', '#166534', '#0d9488', '#walks'], video: ['▶️', 'Videos', '#dc2626', '#f97316', '#videos'],
  top40: ['🎵', 'NZ Top 40', '#be185d', '#7c3aed', '#top40'], recipe: ['🥘', 'Recipes', '#c2410c', '#eab308', '#recipes'], quote: ['💬', 'Daily quote', '#6d28d9', '#db2777', '#home'],
  fact: ['🥝', 'NZ fact', '#15803d', '#0ea5e9', '#home'], joke: ['😂', 'Joke of the day', '#f59e0b', '#ef4444', '#home'], webcam: ['📷', 'Live webcam', '#0f172a', '#0ea5e9', '#webcams'],
  cinema: ['🎬', 'Cinema', '#7f1d1d', '#dc2626', '#movies'], prime: ['🍿', 'Prime Video', '#0c4a6e', '#0ea5e9', '#prime'], tv: ['📺', 'TV guide', '#1e3a8a', '#6366f1', '#tv'],
  concert: ['🎤', 'Concerts', '#86198f', '#e11d48', '#concerts'], news: ['📰', 'News', '#334155', '#0ea5e9', '#news'], radio: ['📻', 'Radio', '#7c2d12', '#ea580c', '#radio'],
  book: ['📚', 'Kindle', '#78350f', '#a16207', '#home'], lang: ['🗣️', 'Word of the day', '#0f766e', '#7c3aed', '#lang'], blog: ['✍️', 'Blogs', '#475569', '#64748b', '#blogging'],
  photo: ['🖼️', 'My Photos', '#be185d', '#f59e0b', '#photos'],
  podcast: ['🎧', 'Podcasts', '#6b21a8', '#4c1d95', '#podcasts'], shop: ['🛒', 'Shopping list', '#15803d', '#0d9488', '#shopping'], idea: ['💡', 'Ideas', '#a16207', '#eab308', '#ideas']
};
const PERSONAL = new Set(['car', 'pet', 'bday', 'health', 'todo', 'gym', 'meal', 'hol', 'event', 'reno', 'delivery', 'flag', 'road', 'alert', 'weather', 'solar', 'garden']);
const WX_EMOJI = { clear: '☀️', pc: '⛅', cloud: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', showers: '🌦️', storm: '⛈️', snow: '❄️', wind: '💨' };
const LIFE_MONEY = /\$\s?\d|\b(bills?|pay|payday|payments?|paid|budget|mortgages?|bank|banking|loans?|debts?|wages?|salary|commission|invoices?|refunds?|direct debit|credit card|tolls?|claims?|kiwisaver|shares?|cash ?flow|prices?)\b/i;
const nzToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const daysTo = iso => iso ? Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(nzToday() + 'T00:00:00Z')) / 864e5) : null;
let DISMISS = ls.get('dismiss', {});
function lifeSnap() { try { return JSON.parse(localStorage.getItem('myFeedLife') || 'null'); } catch (e) { return null; } }
function lifeItems(withPool) {
  const snap = lifeSnap();
  if (!snap || !Array.isArray(snap.items)) return PHOTOS.length && withPool ? PHOTOS.filter(x => !DISMISS[x.id] && !(VOTES[x.id] && VOTES[x.id].v < 0)) : null;
  const stale = snap.today !== nzToday();
  const mine = snap.items.map((x, n) => ({ ...x, id: 'life:' + (x.cat + '|' + x.t + '|' + (x.iso || '')).toLowerCase(), days: daysTo(x.iso), n, mine: 1 }));
  const pool = withPool && Array.isArray(snap.pool) ? snap.pool.map((x, n) => ({ ...x, img: /^data:image\//.test(x.photo || '') ? x.photo : x.img, id: 'app:' + x.id, days: x.iso ? daysTo(x.iso) : null, n: 1000 + n })) : []; // x.photo: his own recipe photo
  return mine.concat(pool).filter(x => {
    if (DISMISS[x.id] || (VOTES[x.id] && VOTES[x.id].v < 0)) return false;
    if (LIFE_MONEY.test([x.t, x.s, x.tag].join(' ')) || SPORT.test([x.t, x.s, x.tag].join(' '))) return false;
    if (stale && (x.cat === 'weather' || x.cat === 'solar' || x.kind === 'warn' || x.now)) return false; // yesterday's weather, power and warnings
    if (x.days != null && x.days < 0 && !['car', 'todo', 'pet', 'health'].includes(x.cat)) return false; // past events (overdue jobs stay)
    return true;
  }).map(x => ({ ...x, topic: 'life', src: 'myapp-' + x.cat, sn: x.mine ? 'My App' : (x.src || (LIFE_CAT[x.cat] || LIFE_CAT.event)[1]) })).concat(withPool ? PHOTOS.filter(x => !DISMISS[x.id] && !(VOTES[x.id] && VOTES[x.id].v < 0)) : []);
}
const isSoon = x => x.mine && (x.cat === 'weather' || x.red || (x.days != null && x.days <= 1));
function whenChip(x) {
  if (x.days == null) return x.kind === 'warn' && x.red ? 'Now' : x.cat === 'webcam' ? 'Live' : '';
  if (x.days < 0) return `${-x.days} day${x.days === -1 ? '' : 's'} overdue`;
  if (x.days === 0) return 'Today'; if (x.days === 1) return 'Tomorrow';
  if (x.days < 7) return new Date(x.iso + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'long', timeZone: 'UTC' });
  return 'In ' + x.days + ' days · ' + new Date(x.iso + 'T12:00:00Z').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
// How much of each kind of My App card to show: 👍 and 👎 on a card nudge its kind, and cards seen a lot fade a little.
function lifeWeight(x) {
  let up = 0, dn = 0; for (const v of Object.values(VOTES)) if (v.src === x.src) { if (v.v > 0) up++; else dn++; }
  const kind = Math.max(0.25, Math.min(2.5, Math.pow(1.35, up - dn)));
  const near = x.mine ? (x.days == null ? 2.2 : x.days <= 3 ? 3.5 : x.days <= 14 ? 2.6 : 1.6) : 1;
  return kind * near * Math.pow(0.7, SEEN[x.id] || 0);
}
function wshuffle(arr, wf) { return arr.map(x => ({ x, k: Math.pow(Math.random(), 1 / Math.max(0.01, wf(x))) })).sort((a, b) => b.k - a.k).map(o => o.x); } // weighted random order, new every refresh
function lifeMix() { // the My App cards for All, in a fresh random order (today and overdue things lean early)
  const L = lifeItems(true); if (!L) return [];
  const mine = wshuffle(L.filter(x => x.mine), x => lifeWeight(x) * (isSoon(x) ? 6 : 1)), pool = wshuffle(L.filter(x => !x.mine), x => lifeWeight(x) * (x.cat === 'photo' ? 2.5 : 1)), out = []; // your photos come round often
  while (mine.length || pool.length) out.push((mine.length && (Math.random() < 0.4 || !pool.length) ? mine : pool).shift()); // about 2 in 5 are your own things
  return out;
}
function weave(feed, life) { // one My App card every 3–5 posts, a different pattern each time
  if (!life.length) return feed;
  const out = []; let gap = 1 + Math.floor(Math.random() * 3), li = 0;
  for (let i = 0; i < feed.length; i++) {
    out.push(feed[i]);
    if (--gap <= 0 && li < life.length) { out.push(life[li++]); gap = 3 + Math.floor(Math.random() * 3); }
  }
  return out;
}

/* ---- pictures for My App cards: My App's own photo when there is one, otherwise a real photo of the subject from
   Wikipedia / Wikimedia Commons, TVmaze (TV shows) or book covers. The first picture found for a card is kept, so it
   stays the same each time. ---- */
let PICS = ls.get('pics', {}), WIKI = ls.get('wiki', {});
const KW = (s, list, d) => { for (const [re, q] of list) if (re.test(s)) return [].concat(q); return [].concat(d); };
function picQ(x) {
  const s = (x.t || '') + ' ' + (x.s || '') + ' ' + (x.tag || '');
  if (Array.isArray(x.q) && x.q.length) return x.q;
  switch (x.cat) {
    case 'car': return ['Car'];
    case 'bday': return ['Birthday_cake', 'Cake', 'Balloon'];
    case 'pet': return KW(s, [[/flea/i, 'Flea'], [/worm/i, 'Deworming'], [/vacc|vet/i, 'Veterinarian']], 'Dog');
    case 'todo': return KW(s, [[/mow|lawn/i, 'Lawn_mower'], [/dish/i, 'Dishwasher'], [/washing|laundry|clothes/i, 'Laundry'], [/vacuum|hoover/i, 'Vacuum_cleaner'], [/bin|rubbish|recycl/i, 'Waste_container'], [/shop|grocer/i, 'Supermarket'], [/garden|weed|prune|plant|hedge/i, 'Gardening'], [/clean|tidy/i, 'Housekeeping'], [/car|tyre|oil|wof/i, 'Car_wash'], [/paint/i, 'Paint'], [/hair/i, 'Hairdresser'], [/dentist/i, 'Dentistry'], [/doctor|\bgp\b/i, 'Physician'], [/pool|spa/i, 'Swimming_pool'], [/light|bulb/i, 'Light_bulb'], [/book|read/i, 'Book']], ['Checklist']);
    case 'health': return KW(s, [[/dentist|teeth/i, 'Dentistry'], [/med|pill|script|tablet/i, 'Tablet_(pharmacy)'], [/vaccin|flu jab|shot/i, 'Vaccine'], [/hospital/i, 'Hospital'], [/doctor|\bgp\b/i, 'Physician']], ['Stethoscope']);
    case 'gym': return ['Gym'];
    case 'meal': return ['Roast dinner', 'Home cooking'];
    case 'hol': return KW(s, [[/christmas|boxing/i, 'Christmas'], [/new year/i, 'Fireworks'], [/easter/i, 'Easter_egg'], [/labour/i, 'Labour_Day'], [/waitangi/i, 'Waitangi_Treaty_Grounds'], [/anzac/i, 'Anzac_Day'], [/matariki/i, 'Matariki'], [/guy fawkes|fireworks/i, 'Fireworks'], [/halloween/i, "Jack-o'-lantern"]], ['Fireworks', 'Beach']);
    case 'event': case 'flag': return KW(s, [[/market/i, "Farmers'_market"], [/movie|film|cinema/i, 'Movie_theater'], [/concert|music|band|gig|choir|jazz/i, 'Concert'], [/firework/i, 'Fireworks'], [/garden|plant/i, 'Garden'], [/art|exhibit|gallery/i, 'Art_exhibition'], [/comedy/i, 'Stand-up_comedy'], [/theatre|musical/i, 'Theatre'], [/kids|family/i, 'Playground'], [/food|wine|beer/i, 'Food_festival'], [/christmas|carol/i, 'Christmas_lights'], [/halloween/i, "Jack-o'-lantern"], [/quiz/i, 'Pub_quiz'], [/dance/i, 'Dance'], [/meeting|appointment/i, 'Calendar']], ['Whangārei', 'Calendar']);
    case 'reno': return ['Renovation', 'Carpentry'];
    case 'delivery': return ['Package_delivery', 'Courier'];
    case 'road': return ['Traffic_cone', 'Roadworks'];
    case 'alert': return KW(s, [[/earthquake|quake/i, 'Seismometer'], [/thunder|lightning/i, 'Thunderstorm'], [/rain|flood/i, 'Rain'], [/wind|gale/i, 'Wind'], [/heat|hot/i, 'Sun'], [/fog/i, 'Fog'], [/snow/i, 'Snow']], ['Storm']);
    case 'weather': return ({ clear: ['Sunset', 'Sun'], pc: ['Cumulus_cloud'], cloud: ['Stratus_cloud'], fog: ['Fog'], drizzle: ['Rain'], rain: ['Rain'], showers: ['Rain'], storm: ['Thunderstorm', 'Lightning'], snow: ['Snow'], wind: ['Wind'] })[x.wx] || ['Cumulus_cloud'];
    case 'solar': case 'power': return ['Solar_panel'];
    case 'uv': return ['Sunscreen', 'Sun'];
    case 'joke': return ['Laughter'];
    case 'fact': return ['Whangārei_Falls'];
    case 'radio': return ['Radio_broadcasting', 'Microphone'];
    case 'concert': return ['Concert'];
    case 'news': return ['Whangārei'];
    case 'blog': return ['Blog'];
    case 'podcast': return ['Podcast', 'Microphone'];
    case 'shop': return ['Supermarket'];
    case 'idea': return ['Light_bulb'];
    case 'book': return ['Book', 'Bookshelf'];
    case 'tv': case 'prime': return ['Television'];
    default: return ['Whangārei'];
  }
}
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
async function getJSON(u) { const r = await fetch(u, { headers: { accept: 'application/json' } }); if (!r.ok) throw new Error(r.status); return r.json(); }
async function wikiPic(title) {
  if (title in WIKI) return WIKI[title];
  let u = '';
  try {
    const d = await getJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title));
    const th = d.thumbnail && d.thumbnail.source, og = d.originalimage && d.originalimage.source;
    if (th && /\/thumb\//.test(th) && !/\.svg/i.test(og || th)) u = th.replace(/\/\d+px-/, '/960px-');
    else if (og && !/\.svg/i.test(og)) u = og;
  } catch (e) { return ''; } // offline: try again another time
  WIKI[title] = u; ls.set('wiki', WIKI); return u;
}
async function commonsPic(q, id) { // a different real photo per card from Wikimedia Commons, the same one every time for that card
  const k = 'c:' + q; let list = WIKI[k];
  if (!Array.isArray(list)) {
    try {
      const d = await getJSON('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=24&prop=imageinfo&iiprop=url|size&iiurlwidth=960&format=json&origin=*&gsrsearch=' + encodeURIComponent('filemime:image/jpeg ' + q.replace(/_/g, ' ')));
      list = Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index).map(p => p.imageinfo && p.imageinfo[0]).filter(i => i && i.thumburl && i.width >= 600 && i.width >= i.height * 0.6).map(i => i.thumburl).filter(u => !/\.(tiff?|pdf|djvu|xcf)(\?|$)/i.test(u)).slice(0, 8);
    } catch (e) { return ''; }
    WIKI[k] = list; ls.set('wiki', WIKI);
  }
  return list.length ? list[hash(id) % list.length] : '';
}
const SPECIFIC = new Set(['car', 'garden', 'tv', 'prime', 'fact', 'recipe', 'lang', 'news']);
async function tvPic(name) {
  const k = 'tv:' + name; if (k in WIKI) return WIKI[k];
  let u = ''; try { const d = await getJSON('https://api.tvmaze.com/singlesearch/shows?q=' + encodeURIComponent(name)); u = (d.image && (d.image.original || d.image.medium)) || ''; } catch (e) { if (!/404/.test(e.message)) return ''; }
  WIKI[k] = u; ls.set('wiki', WIKI); return u;
}
async function bookPic(b) {
  const k = 'book:' + b.join('|'); if (k in WIKI) return WIKI[k];
  let u = '';
  try { const d = await getJSON('https://openlibrary.org/search.json?limit=1&fields=cover_i&title=' + encodeURIComponent(b[0]) + '&author=' + encodeURIComponent(b[1] || '')); const c = d.docs && d.docs[0] && d.docs[0].cover_i; if (c) u = 'https://covers.openlibrary.org/b/id/' + c + '-L.jpg'; } catch (e) { }
  if (!u) try { const d = await getJSON('https://www.googleapis.com/books/v1/volumes?maxResults=1&q=intitle:' + encodeURIComponent(b[0]) + '+inauthor:' + encodeURIComponent(b[1] || '')); const l = d.items && d.items[0] && d.items[0].volumeInfo.imageLinks; if (l) u = String(l.thumbnail || l.smallThumbnail || '').replace('http:', 'https:').replace('&edge=curl', '').replace(/zoom=\d/, 'zoom=1'); } catch (e) { }
  WIKI[k] = u; ls.set('wiki', WIKI); return u;
}
async function findPic(x) {
  const bad = x._bad || (x._bad = new Set()), ok = u => u && !bad.has(u);
  if (ok(PICS[x.id])) return PICS[x.id];
  let u = '';
  if (x.book && !x._noBook) u = await bookPic(x.book);
  if (!ok(u) && (x.cat === 'tv' || x.cat === 'prime')) u = await tvPic(x.t.replace(/^#\d+\s*/, ''));
  const wt = (String(x.url || '').match(/wikipedia\.org\/wiki\/([^?#]+)/) || [])[1];
  const qs = (wt ? [decodeURIComponent(wt)] : []).concat(picQ(x));
  const spec = !!wt || SPECIFIC.has(x.cat) || (x.cat === 'pet' && Array.isArray(x.q) && x.q.length > 1);
  for (let n = 0; !ok(u) && n < qs.length; n++) { u = spec ? await wikiPic(qs[n]) : ''; if (!ok(u)) u = await commonsPic(qs[n], x.id + (bad.size ? '#' + bad.size : '')); }
  if (!ok(u) && x.img2) u = x.img2;
  if (!ok(u)) return '';
  PICS[x.id] = u; const keys = Object.keys(PICS); if (keys.length > 1500) keys.slice(0, 300).forEach(k => delete PICS[k]); ls.set('pics', PICS);
  return u;
}
let picBusy = 0; const picQueue = [];
function fillPics() {
  document.querySelectorAll('.media.need:not(.asked)').forEach(el => { el.classList.add('asked'); picQueue.push(el); });
  while (picBusy < 4 && picQueue.length) {
    const el = picQueue.shift(), x = LIFE_BY_ID.get(el.dataset.pic); if (!x) continue;
    picBusy++;
    findPic(x).then(u => { if (u) setPic(el, u, x); else el.classList.add('nopic'); }).finally(() => { picBusy--; fillPics(); });
  }
}
function setPic(el, u, x) {
  const im = new Image(); im.referrerPolicy = 'no-referrer'; im.alt = x.t; im.decoding = 'async';
  im.onload = () => { el.querySelector('.lph') && el.querySelector('.lph').remove(); el.prepend(im); el.classList.remove('need'); };
  im.onerror = () => { delete PICS[x.id]; (x._bad || (x._bad = new Set())).add(u); if (x._bad.size < 4) { x._noBook = 1; el.classList.remove('asked'); fillPics(); } else el.classList.add('nopic'); }; // try another picture
  im.src = u;
}
const LIFE_BY_ID = new Map();
function lifeCard(x) {
  LIFE_BY_ID.set(x.id, x);
  const C = LIFE_CAT[x.cat] || LIFE_CAT.event, em = x.cat === 'weather' && WX_EMOJI[x.wx] ? WX_EMOJI[x.wx] : C[0], v = VOTES[x.id] ? VOTES[x.id].v : 0;
  const w = whenChip(x), hot = x.mine && ((x.days != null && x.days <= 0) || x.red);
  const go = MY_APP + (x.go || C[4]);
  const img = x.img ? (x.live ? x.img + (x.img.includes('?') ? '&' : '?') + 'h=' + Math.floor(Date.now() / 36e5) : x.img) : (PICS[x.id] || '');
  const badge = `${w ? `<span class="lwhen${hot ? ' now' : ''}">${esc(w)}</span>` : ''}`;
  const ph = `<div class="lph"><span>${em}</span></div>`;
  const media = x.vid
    ? vidMedia(x.vid, img, x.t, badge)
    : img ? `<a class="media lm" href="${esc(go)}"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(img)}" alt="${esc(x.t)}" onerror="var m=this.closest('.media');m.classList.add('need');m.dataset.pic=this.dataset.id;this.remove();fillPics()" data-id="${esc(x.id)}">${badge}</a>`
      : `<a class="media lm need" data-pic="${esc(x.id)}" href="${esc(go)}">${ph}${badge}</a>`;
  return `<article class="card life${hot ? ' hot' : ''}${['cinema', 'prime', 'book', 'tv'].includes(x.cat) ? ' tallpic' : ''}" data-id="${esc(x.id)}" style="--c1:${C[2]};--c2:${C[3]}">
    <div class="hd"><div class="av">${em}</div><div class="who"><b>${esc(x.sn)}</b><small>${esc(x.sn === C[1] ? (x.tag || (x.mine ? '' : 'From My App')) : x.tag && x.tag !== C[1] ? C[1] + ' · ' + x.tag : C[1])}</small></div><span class="tp">For You</span></div>
    ${media}
    <div class="bd"><h3>${esc(x.t)}</h3>${x.sub ? `<p class="lsub">${esc(x.sub)}</p>` : ''}${x.s ? `<p data-more>${esc(x.s)}</p>` : ''}${x.credit ? `<small class="cred">📷 ${esc(x.credit)}</small>` : ''}</div>
    <div class="ft">
      <button class="vote up${v > 0 ? ' on' : ''}" data-vote="1" aria-pressed="${v > 0}" aria-label="Thumbs up">${THUMB.up}</button>
      <button class="vote dn${v < 0 ? ' on' : ''}" data-vote="-1" aria-pressed="${v < 0}" aria-label="Thumbs down">${THUMB.dn}</button>
      <a class="open-l" href="${esc(go)}">Open in My App</a>${x.url ? `<a class="open-l" href="${esc(x.url)}" target="_blank" rel="noopener">Source ↗</a>` : ''}
    </div></article>`;
}

/* ---- 1.4.0: My Photos. Read on this phone straight from My App's Photos page (IndexedDB "myPhotos", same address),
   never uploaded anywhere. My App has no "approved" switch, so: photos tagged approved / feed / keep / favourite are
   used if there are any; otherwise every photo you kept, except receipts, warranties, documents, screenshots and
   anything tagged private or nofeed. Money is always left out. ---- */
const PHOTO_SKIP = /\b(receipts?|warrant(y|ies)|guarantee|invoices?|bills?|statements?|screen ?shots?|screenshot|licen[cs]es?|passports?|id cards?|documents?|docs?|private|no ?feed|passwords?|tax|insurance|polic(y|ies)|payslips?|contracts?|medical|prescriptions?|scripts?|forms?|tickets?|boarding pass|qr)\b/i;
const PHOTO_OK = /\b(approved?|feed|my ?feed|keep|keepers?|fav(ou?rites?)?|best|share)\b/i;
let PHOTOS = [], PHOTO_INFO = { all: 0, used: 0, approved: 0 };
function phOpen() {
  return new Promise((ok, no) => {
    let r; try { r = indexedDB.open('myPhotos'); } catch (e) { return no(e); }
    r.onupgradeneeded = e => { if (!e.oldVersion && !r.result.objectStoreNames.contains('p')) r.result.createObjectStore('p', { keyPath: 'id' }); }; // same as My App makes it
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); r.onblocked = () => no(new Error('blocked'));
  });
}
async function loadPhotos() {
  if (!window.indexedDB) return;
  let db; try { db = await phOpen(); } catch (e) { return; }
  try {
    if (!db.objectStoreNames.contains('p')) return;
    const L = await new Promise((ok, no) => { const q = db.transaction('p', 'readonly').objectStore('p').getAll(); q.onsuccess = () => ok(q.result || []); q.onerror = () => no(q.error); });
    const txt = x => [x.title, x.note, x.name, ...(x.tags || [])].join(' ');
    const okPh = L.filter(x => x && (x.blob || x.thumb) && !PHOTO_SKIP.test(txt(x)) && !/screen.?shot|receipt|invoice/i.test(x.name || '') && !LIFE_MONEY.test(txt(x)));
    const appr = okPh.filter(x => (x.tags || []).some(t => PHOTO_OK.test(t)));
    const use = appr.length ? appr : okPh;
    const had = new Map(PHOTOS.map(x => [x.id, x.img])), want = new Set(use.map(x => 'ph:' + x.id));
    had.forEach((u, id) => { if (!want.has(id)) try { URL.revokeObjectURL(u); } catch (e) { } });
    PHOTOS = use.map(x => {
      const d = x.added ? new Date(x.added).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' }) : '';
      return { cat: 'photo', id: 'ph:' + x.id, t: x.title || 'From your Photos', s: x.note || '', tag: (x.tags || []).filter(t => !PHOTO_OK.test(t)).join(' · ') || (d ? 'Saved ' + d : ''), img: had.get('ph:' + x.id) || URL.createObjectURL(x.blob || x.thumb), topic: 'life', src: 'myapp-photo', sn: 'My Photos', go: '#photos', added: x.added || 0 };
    });
    PHOTO_INFO = { all: L.length, used: PHOTOS.length, approved: appr.length };
  } catch (e) { } finally { try { db.close(); } catch (e) { } }
}
function drawPhotos() {
  const m = $('#feed');
  order = PHOTOS.filter(x => !DISMISS[x.id] && !(VOTES[x.id] && VOTES[x.id].v < 0)).sort(() => Math.random() - 0.5); shown = 0;
  m.innerHTML = `<div class="load" style="padding-top:0">${PHOTO_INFO.approved ? 'Your approved photos' : 'Your photos'} from My App, on this phone only</div>` + (order.length ? '' : `<div class="empty">🖼️ Add photos on My App’s Photos page and they’ll show here. Tag one <b>nofeed</b> to keep it out.</div>`);
  more();
}

/* ---- 1.4.0: About you. My App shares your About-you answers on this phone (myFeedLife.about: music, screen, food,
   gluten-free, garden, dog, outdoors, tech, weekend…; never money, family or routine). Each interest gets cards from a
   free public source that fits it, searched from this phone: Apple Music (music), TVmaze (shows and films),
   TheMealDB (meals, gluten-free only), Open Library (books) and Wikipedia (everything else). Interests that fit a
   topic go into that topic; the rest get their own chip. Change an answer in My App and the feed follows. ---- */
const YOU_TOPIC = { food: 'food', music: 'music', sitcoms: 'sitcoms', garden: 'garden', dogs: 'dogs', nature: 'nature', tech: 'tech', nz: 'nz' };
const YOU_EM = { book: ['📚', '#78350f', '#a16207'], weekend: ['🏖️', '#0369a1', '#f59e0b'], fit: ['💪', '#0f766e', '#14b8a6'], misc: ['💭', '#6d28d9', '#db2777'] };
const YOU_HINT = { food: ' food', garden: ' plant', dogs: ' dog', nz: ' New Zealand', music: ' music' };
const GENERIC = /^(something|depends|it depends|mostly|now and then|not\b|a bit|either|any|whatever|i\b|i’|i'|mix|a mix|just\b|both|neither|none|nothing|no\b|yes\b|sometimes|often|rarely|never|always|other|someone else|all of them|n\/a|skip|very|fairly|careful|strict|from a recipe|by feel|under|about|up to|happy to|shop-bought|homemade mix|keep them|share with|post them|use them|for me|leftovers|depends on)/i;
const SLUG = s => String(s).toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
let YOU = [], YOU_CHIPS = [], YOU_CACHE = ls.get('you', {});
function interests() {
  const snap = lifeSnap(), A = snap && Array.isArray(snap.about) ? snap.about : [], out = [], seen = new Set();
  for (const n of A) {
    if (!n || !n.a || !n.k) continue;
    const parts = /^k/.test(n.id || '') ? [n.a] : String(n.a).split(/,|;|\/|&|\band\b|\bor\b|\bplus\b/i);
    for (let p of parts) {
      p = p.trim().replace(/^\s*(i (like|love|enjoy|grow|play|watch|read)|we|probably|maybe|usually|definitely|lots of|some|my|our)\s+/i, '').replace(['book', 'sitcoms', 'music'].includes(n.k) ? /^$/ : /^(a|an|the)\s+/i, '').replace(/[.!?"“”]+/g, '').trim();
      const w = p.split(/\s+/).length;
      if (p.length < 3 || w > 4 || GENERIC.test(p) || /\d{3,}|@|https?:/.test(p) || LIFE_MONEY.test(p) || SPORT.test(p)) continue;
      const key = p.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
      out.push({ term: p, k: n.k, q: n.q, topic: YOU_TOPIC[n.k] || 'you:' + SLUG(p) });
    }
    if (out.length >= 16) break;
  }
  return out;
}
function setupYou() {
  YOU = interests();
  const own = YOU.filter(x => x.topic.startsWith('you:')).slice(0, 8);
  YOU = YOU.filter(x => !x.topic.startsWith('you:') || own.includes(x));
  YOU_CHIPS = own.map(x => x.topic);
  own.forEach(x => { const E = YOU_EM[x.k] || YOU_EM.misc; TOPIC[x.topic] = [x.topic, x.term.length > 18 ? x.term.slice(0, 17) + '…' : x.term, E[0], E[1], E[2]]; });
}
function youItems() {
  const out = [];
  for (const x of YOU) { const c = YOU_CACHE[x.k + '|' + x.term.toLowerCase()]; if (c && c.items) c.items.forEach(i => out.push({ ...i, topic: x.topic, tag: 'You said “' + x.term + '”' })); }
  return out;
}
const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const GLUTEN = /flour|bread|pasta|spaghetti|penne|macaroni|lasagne|noodle|soy sauce|breadcrumb|pastry|tortilla|couscous|barley|beer|biscuit|cracker|wheat|bulgur|semolina|filo|puff|naan|pitta|pita|bun|bagel|dumpling|brioche|cake|digestive/i;
const YOU_FETCH = {
  async itunes(x) { const d = await getJSON('https://itunes.apple.com/search?country=nz&entity=album&limit=10&term=' + encodeURIComponent(x.term)); return (d.results || []).filter(r => r.artworkUrl100 && r.collectionExplicitness !== 'explicit').slice(0, 8).map(r => ({ t: r.collectionName, s: [r.artistName, r.primaryGenreName, (r.releaseDate || '').slice(0, 4)].filter(Boolean).join(' · '), img: r.artworkUrl100.replace(/100x100bb/, '600x600bb'), url: r.collectionViewUrl, sn: 'Apple Music', src: 'you-itunes' })); },
  async tvmaze(x) { const d = await getJSON('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(x.term)); return (d || []).map(r => r.show).filter(r => r && r.image && !/sports?/i.test(r.type + ' ' + (r.genres || []).join(' '))).slice(0, 6).map(r => ({ t: r.name, s: [(r.genres || []).join(', '), r.premiered && r.premiered.slice(0, 4), strip(r.summary).slice(0, 180)].filter(Boolean).join(' · '), img: r.image.original || r.image.medium, url: r.url, sn: 'TVmaze', src: 'you-tvmaze', kind: 'tv' })); },
  async mealdb(x) { const d = await getJSON('https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(x.term)); return (d.meals || []).filter(m => { const ing = Object.keys(m).filter(k => /^strIngredient\d+$/.test(k)).map(k => m[k] || '').join(' '); return !GLUTEN.test(ing) || /gluten.?free/i.test(m.strTags || ''); }).slice(0, 6).map(m => ({ t: m.strMeal, s: 'No gluten ingredients listed · ' + [m.strArea, m.strCategory].filter(Boolean).join(' · ') + ' · check labels on stock and sauces', img: m.strMealThumb, url: m.strSource || 'https://www.themealdb.com/meal/' + m.idMeal, sn: 'TheMealDB', src: 'you-mealdb' })); },
  async openlib(x) { const d = await getJSON('https://openlibrary.org/search.json?limit=10&fields=title,author_name,cover_i,key,first_publish_year&q=' + encodeURIComponent(x.term)); return (d.docs || []).filter(b => b.cover_i).slice(0, 6).map(b => ({ t: b.title, s: [b.author_name && 'by ' + b.author_name.slice(0, 2).join(', '), b.first_publish_year].filter(Boolean).join(' · '), img: 'https://covers.openlibrary.org/b/id/' + b.cover_i + '-L.jpg', url: 'https://openlibrary.org' + b.key, sn: 'Open Library', src: 'you-openlib', kind: 'tv' })); },
  async wiki(x) { const d = await getJSON('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=12&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=960&exintro=1&explaintext=1&exsentences=2&exlimit=max&gsrsearch=' + encodeURIComponent(x.term + (YOU_HINT[x.k] || ''))); return Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index).filter(p => p.thumbnail && p.thumbnail.width >= 400 && !/\.svg/i.test(p.thumbnail.source) && !/disambiguation|^list of/i.test(p.title + ' ' + (p.extract || ''))).slice(0, 6).map(p => ({ t: p.title, s: String(p.extract || '').slice(0, 220), img: p.thumbnail.source, url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_')), sn: 'Wikipedia', src: 'you-wiki' })); }
};
const YOU_SRC = { music: ['itunes', 'wiki'], sitcoms: ['tvmaze', 'wiki'], food: ['mealdb', 'wiki'], book: ['openlib', 'wiki'] };
let youBusy = false;
async function refreshYou() {
  if (youBusy || !YOU.length || !navigator.onLine) return;
  youBusy = true; let changed = false;
  try {
    for (const x of YOU) {
      const key = x.k + '|' + x.term.toLowerCase(), c = YOU_CACHE[key];
      if (c && Date.now() - c.at < 12 * 36e5) continue;
      const old = new Map(((c && c.items) || []).map(i => [i.id, i])), items = [];
      for (const pv of YOU_SRC[x.k] || ['wiki']) { try { (await YOU_FETCH[pv](x)).forEach(i => { if (!i.img || SPORT.test(i.t + ' ' + i.s)) return; const id = 'you:' + hash(i.url || i.img).toString(36); items.push({ ...i, id, at: (old.get(id) || {}).at || Date.now() - 8 * 36e5 }); }); } catch (e) { } }
      if (items.length || !c) { YOU_CACHE[key] = { at: Date.now(), items: items.slice(0, 12) }; changed = true; }
    }
    const keep = new Set(YOU.map(x => x.k + '|' + x.term.toLowerCase())); for (const k in YOU_CACHE) if (!keep.has(k)) delete YOU_CACHE[k];
    ls.set('you', YOU_CACHE);
  } finally { youBusy = false; }
  if (changed && scrollY < 200 && tab !== 'life' && tab !== 'photos' && tab !== 'liked') draw();
}

/* ---- 1.3.0: videos play by themselves, Instagram-style. A video starts (muted, as browsers require) when about 60% of
   it is on screen and pauses when it scrolls away. Only one plays at a time. Tap the speaker to hear it; after that,
   later videos start with sound too for this visit if the browser allows it. Short clips loop. The YouTube player is
   only loaded when a card is close to the screen, and the thumbnail shows until the video is actually playing. ---- */
const SPK = {
  off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  on: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};
let SOUND = sessionStorage.getItem('mf.sound') === '1';
function vidMedia(id, img, title, extra = '') {
  return `<div class="media vid" data-vid="${esc(id)}" role="button" tabindex="0" aria-label="Video: ${esc(title)}"><div class="vslot"></div><img class="vthumb" loading="lazy" referrerpolicy="no-referrer" src="${esc(img || 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg')}" alt="" onerror="this.src='https://i.ytimg.com/vi/${esc(id)}/mqdefault.jpg'"><span class="play"><span></span></span><button class="snd" data-snd aria-label="${SOUND ? 'Mute' : 'Turn sound on'}">${SOUND ? SPK.on : SPK.off}</button>${extra}</div>`;
}
const PLAYERS = new Map(), RATIO = new Map(); let curVid = null, ytP = null;
function ytApi() {
  if (ytP) return ytP;
  ytP = new Promise(res => {
    if (window.YT && YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; s.onerror = () => { ytP = null; }; document.head.appendChild(s);
  });
  return ytP;
}
function sndBtn(el, on) { const b = el.querySelector('.snd'); if (b) { b.innerHTML = on ? SPK.on : SPK.off; b.setAttribute('aria-label', on ? 'Mute' : 'Turn sound on'); b.classList.toggle('on', on); } }
function mountVid(el) {
  if (PLAYERS.has(el)) return;
  const rec = { ready: false, want: false, p: null }; PLAYERS.set(el, rec);
  ytApi().then(() => {
    if (PLAYERS.get(el) !== rec) return;
    const div = document.createElement('div'); el.querySelector('.vslot').appendChild(div);
    rec.p = new YT.Player(div, {
      videoId: el.dataset.vid, host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%',
      playerVars: { autoplay: 0, mute: 1, playsinline: 1, rel: 0, modestbranding: 1, controls: 1, iv_load_policy: 3, fs: 1 },
      events: {
        onReady: () => { rec.ready = true; try { rec.p.mute(); } catch (e) { } if (rec.want) playVid(el); },
        onStateChange: e => {
          if (e.data === 1) { el.classList.add('playing'); if (curVid && curVid !== el) pauseVid(el); }
          else if (e.data === 0) { let d = 0; try { d = rec.p.getDuration(); } catch (x) { } if (d && d <= 90 && curVid === el) { rec.p.seekTo(0, true); rec.p.playVideo(); } else el.classList.remove('playing'); } // loop short clips
        },
        onError: () => { el.classList.add('verr'); el.classList.remove('playing'); }
      }
    });
  });
}
function unmountVid(el) {
  const rec = PLAYERS.get(el); if (!rec || curVid === el) return;
  try { rec.p && rec.p.destroy(); } catch (e) { }
  const s = el.querySelector('.vslot'); if (s) s.innerHTML = '';
  el.classList.remove('playing'); PLAYERS.delete(el);
}
function playVid(el, withSound) {
  if (curVid && curVid !== el) pauseVid(curVid);
  curVid = el; mountVid(el);
  const rec = PLAYERS.get(el); rec.want = true;
  if (!rec.ready) return;
  const loud = withSound || SOUND;
  try { if (loud) { rec.p.unMute(); rec.p.setVolume(100); } else rec.p.mute(); rec.p.playVideo(); } catch (e) { }
  sndBtn(el, loud);
  if (loud) { let n = 0; const chk = () => { // if the browser won't start it with sound, play it muted instead
    try { if (curVid !== el) return; const st = rec.p.getPlayerState(); if (st === 1 && !rec.p.isMuted()) return; if (st === 3 && n < 12) { n++; return setTimeout(chk, 500); } if (n++ < 4 && st !== 2) return setTimeout(chk, 500); rec.p.mute(); rec.p.playVideo(); sndBtn(el, false); } catch (e) { } }; setTimeout(chk, 700); }
}
function pauseVid(el) {
  const rec = PLAYERS.get(el); if (rec) { rec.want = false; try { rec.ready && rec.p.pauseVideo(); } catch (e) { } }
  if (curVid === el) curVid = null;
}
function pickVid() {
  let best = null, br = 0;
  for (const [el, r] of RATIO) { if (!el.isConnected) { RATIO.delete(el); continue; } if (r > br && !el.classList.contains('verr')) { best = el; br = r; } }
  if (best && br >= 0.6) { if (best !== curVid) playVid(best); }
  else if (curVid && (RATIO.get(curVid) || 0) < 0.6) pauseVid(curVid);
}
const nearIO = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? mountVid(e.target) : unmountVid(e.target)), { rootMargin: '350px 0px' });
const visIO = new IntersectionObserver(es => { es.forEach(e => RATIO.set(e.target, e.isIntersecting ? e.intersectionRatio : 0)); pickVid(); }, { threshold: [0, 0.3, 0.6, 0.8, 1] });
function watchVids() {
  for (const el of [...PLAYERS.keys()]) if (!el.isConnected) { if (curVid === el) curVid = null; unmountVid(el); }
  document.querySelectorAll('.media.vid:not(.watched)').forEach(el => { el.classList.add('watched'); nearIO.observe(el); visIO.observe(el); });
}
function toggleSound(el) {
  const rec = PLAYERS.get(el); let muted = true;
  try { muted = rec && rec.ready ? rec.p.isMuted() : !SOUND; } catch (e) { }
  SOUND = muted; sessionStorage.setItem('mf.sound', SOUND ? '1' : '0');
  document.querySelectorAll('.media.vid').forEach(v => sndBtn(v, SOUND));
  if (SOUND) { if (curVid !== el || !rec || !rec.ready || rec.p.getPlayerState() !== 1) playVid(el, true); else { rec.p.unMute(); rec.p.setVolume(100); } toast('🔊 Sound on'); }
  else { try { rec && rec.ready && rec.p.mute(); } catch (e) { } toast('🔇 Sound off'); }
}
let vScrollT = 0; // belt and braces: when scrolling stops, measure what's on screen directly
addEventListener('scroll', () => { clearTimeout(vScrollT); vScrollT = setTimeout(() => { const H = innerHeight; document.querySelectorAll('.media.vid.watched').forEach(el => { const r = el.getBoundingClientRect(), vis = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0)); RATIO.set(el, r.height ? vis / r.height : 0); if (r.bottom > -350 && r.top < H + 350) mountVid(el); }); pickVid(); }, 250); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && curVid) { const el = curVid; pauseVid(el); } else if (document.visibilityState === 'visible') pickVid(); });

/* ---- rendering ---- */
function ago(ms) {
  const d = (Date.now() - ms) / 1000;
  if (d < 0) { const f = -d / 3600; return f < 24 ? 'today' : f < 48 ? 'tomorrow' : 'in ' + Math.round(f / 24) + ' days'; }
  if (d < 3600) return Math.max(1, Math.round(d / 60)) + 'm';
  if (d < 86400) return Math.round(d / 3600) + 'h';
  if (d < 7 * 86400) return Math.round(d / 86400) + 'd';
  return new Date(ms).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}
const evDate = ms => new Date(ms).toLocaleString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' });
function card(i) {
  const T = TOPIC[i.topic] || TOPIC.all, v = VOTES[i.id] ? VOTES[i.id].v : 0;
  const style = `--c1:${T[3]};--c2:${T[4]}`;
  let media = '';
  if (i.vid) media = vidMedia(i.vid, i.img, i.t);
  else if (i.img) media = `<a class="media${i.kind === 'tv' ? ' tall' : ''}" href="${esc(i.url)}" target="_blank" rel="noopener"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(i.img)}" alt="${esc(i.t)}" onerror="if(!this.dataset.r){this.dataset.r=1;var s=this.src;setTimeout(()=>{this.src=s},1500)}else this.closest('.media').remove()"></a>`;
  else media = `<div class="hero"><span class="em">${T[2]}</span><h3>${esc(i.t)}</h3></div>`;
  const when = i.kind === 'event' && i.ev ? `<span class="when">📅 ${esc(evDate(i.ev))}</span>` : i.kind === 'tv' && i.where ? `<span class="when">📺 ${esc(i.where)}</span>` : '';
  const showTitle = i.img || i.vid;
  return `<article class="card" data-id="${esc(i.id)}" style="${style}">
    <div class="hd"><div class="av">${T[2]}</div><div class="who"><b>${esc(i.sn || '')}</b><small>${esc(ago(i.at))}${i.tag ? ' · ' + esc(i.tag) : itemInts(i)[0] ? ' · ' + esc(itemInts(i)[0]) : ''}${i._x ? '<span class="mx">new for you</span>' : weights().trial(i.src) ? '<span class="mx">new source</span>' : ''}</small></div><span class="tp">${esc(T[1])}</span></div>
    ${media}
    <div class="bd">${showTitle ? `<h3>${esc(i.t)}</h3>` : ''}${i.s ? `<p data-more>${esc(i.s)}</p>` : ''}${when}</div>
    <div class="ft">
      <button class="vote up${v > 0 ? ' on' : ''}" data-vote="1" aria-pressed="${v > 0}" aria-label="Thumbs up">${THUMB.up}</button>
      <button class="vote dn${v < 0 ? ' on' : ''}" data-vote="-1" aria-pressed="${v < 0}" aria-label="Thumbs down">${THUMB.dn}</button>
      ${i.url ? `<a class="open-l" href="${esc(i.url)}" target="_blank" rel="noopener">Open ↗</a>` : ''}
    </div></article>`;
}
function chips() {
  const list = TOPICS.filter(t => (t[0] !== 'photos' || PHOTOS.length) && topicOn(t[0])), at = list.findIndex(t => t[0] === 'photos' || t[0] === 'liked');
  list.splice(at, 0, ...YOU_CHIPS.map(id => TOPIC[id]));
  $('#chips').innerHTML = list.map(t => `<button class="chip${t[0] === tab ? ' on' : ''}" data-tab="${t[0]}">${t[2]} ${t[1]}</button>`).join('');
  const on = $('#chips .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function draw() {
  chips();
  const m = $('#feed');
  if (!FEED) { m.innerHTML = '<div class="sk"></div><div class="sk"></div>'; return; }
  if (tab === 'life') { drawLife(); return; }
  if (tab === 'photos') { drawPhotos(); return; }
  if (!TOPIC[tab] || !topicOn(tab)) tab = 'all';
  order = tab === 'liked' ? visible() : rank(visible()); shown = 0;
  if (tab === 'all') order = weave(order, lifeMix()); // My App cards mixed in at random, different every refresh
  m.innerHTML = (order.length ? '' : `<div class="empty">${tab === 'liked' ? 'Nothing here yet. Tap 👍 on posts you like and they’ll be kept here.' : 'Nothing new here right now. Check back soon.'}</div>`);
  more();
  $('#upd').innerHTML = FEED.updated ? `Updated<br>${esc(ago(FEED.updated))} ago` : '';
}
function drawLife() { // For You: only My App cards. Yours first (soonest first), then the boards and hubs at random.
  const L = lifeItems(true), m = $('#feed');
  if (!L) { m.innerHTML = `<div class="empty">📌 Your own things show here: cars, birthdays, calendar, to-dos, garden, pets, meals, weather, power, and every board and hub in My App.<br><br>Open <a href="${MY_APP}">My App</a> once on this phone and they’ll appear. They stay on this phone.</div>`; return; }
  const mine = L.filter(x => x.mine).sort((a, b) => (a.days == null ? 999 : a.days) - (b.days == null ? 999 : b.days) || a.n - b.n);
  order = mine.concat(wshuffle(L.filter(x => !x.mine), lifeWeight)); shown = 0;
  const snap = lifeSnap() || {};
  m.innerHTML = `<div class="load" style="padding-top:0">From My App on this phone${snap.at ? ' · updated ' + esc(ago(snap.at)) + ' ago' : ''} · bills and money are never shown</div>`;
  more();
}
function more() {
  const m = $('#feed'), next = order.slice(shown, shown + PAGE);
  if (!next.length) return;
  shown += next.length;
  m.insertAdjacentHTML('beforeend', next.map(i => i.topic === 'life' ? lifeCard(i) : card(i)).join('') + (shown < order.length ? '<div class="load" id="sentinel">Loading more…</div>' : '<div class="load">You’re all caught up ✨</div>'));
  const old = m.querySelectorAll('#sentinel'); old.forEach((s, n) => { if (n < old.length - 1) s.remove(); });
  for (const i of next) { SEEN[i.id] = (SEEN[i.id] || 0) + 1; if (i.src) IMP[i.src] = (IMP[i.src] || 0) + 1; }
  saveSeen(); fillPics(); watchVids();
  const s = $('#sentinel');
  if (s) { if (io) io.disconnect(); io = new IntersectionObserver(e => { if (e[0].isIntersecting) { io.disconnect(); s.remove(); more(); } }, { rootMargin: '900px' }); io.observe(s); }
}
let seenT = 0;
function saveSeen() { clearTimeout(seenT); seenT = setTimeout(() => { const keep = new Set((FEED ? FEED.items : []).map(i => i.id)); for (const k of Object.keys(SEEN)) if (!keep.has(k) && !/^(life|app|ph|you):/.test(k)) delete SEEN[k]; ls.set('seen', SEEN); ls.set('imp', IMP); }, 800); }

/* ---- votes ---- */
function vote(el, v) {
  const c = el.closest('.card'), id = c.dataset.id;
  const item = order.find(x => x.id === id) || (FEED.items || []).find(x => x.id === id) || LIFE_BY_ID.get(id) || (VOTES[id] && VOTES[id].item);
  if (!item) return;
  const prev = VOTES[id];
  if (prev && prev.v === v) { delete VOTES[id]; ls.set('votes', VOTES); c.querySelectorAll('.vote').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); toast('Vote removed'); return; }
  const { _x, _ints, ...snap } = item; if (snap.img && /^(data|blob):/.test(snap.img)) delete snap.img; delete snap.photo; // a car, pet or own photo stays in My App
  VOTES[id] = { v, topic: item.topic, src: item.src, ints: item.topic === 'life' ? undefined : itemInts(item).slice(0, 4), at: Date.now(), item: v > 0 ? snap : undefined };
  ls.set('votes', VOTES);
  c.querySelectorAll('.vote').forEach(b => { const on = +b.dataset.vote === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  try { navigator.vibrate && navigator.vibrate(12); } catch (e) { }
  if (v > 0) toast('👍 More like this from ' + (item.sn || 'here'));
  else {
    c.innerHTML = `<div class="gone">👎 Hidden. You’ll see less from ${esc(item.sn || 'here')}.<button data-undo="${esc(id)}">Undo</button></div>`;
  }
}

/* ---- data ---- */
async function load(force) {
  $('#rf').classList.add('spin');
  try {
    const r = await fetch(FEED_URL + (force ? '?t=' + Date.now() : ''), { cache: force ? 'no-store' : 'default' });
    if (!r.ok) throw new Error(r.status);
    const f = await r.json();
    if (f && Array.isArray(f.items) && f.items.length) {
      const first = !FEED || FEED.updated !== f.updated;
      FEED = f; ls.set('feed', f); noteSources(); noteSrcInts();
      if (first || force) draw();
      if (force) toast('Feed is up to date');
    }
  } catch (e) { if (!FEED) $('#feed').innerHTML = '<div class="empty">Can’t reach the feed right now. Check your connection and tap ↻.</div>'; else if (force) toast('Offline – showing the last feed'); }
  $('#rf').classList.remove('spin');
}

/* ---- settings ---- */
function settings() {
  const W = weights(), ups = Object.values(VOTES).filter(v => v.v > 0).length, downs = Object.values(VOTES).filter(v => v.v < 0).length;
  const srcs = (FEED && FEED.sources || []).concat([['you-itunes', 'Apple Music'], ['you-tvmaze', 'TVmaze'], ['you-mealdb', 'TheMealDB'], ['you-openlib', 'Open Library'], ['you-wiki', 'Wikipedia']].map(([id, name]) => ({ id, name, topic: 'you', you: 1 })));
  const tIdx = t => { const n = TOPICS.findIndex(x => x[0] === t); return n < 0 ? 99 : n; };
  const status = id => W.drop(id) ? ['Dropped', 'drop'] : W.trial(id) ? ['Trying', 'try'] : W.src(id) > 1.05 ? ['More', 'more'] : W.src(id) < 0.95 ? ['Less', 'less'] : ['Kept', ''];
  const row = x => { const [st, c] = status(x.id); const T = x.you ? ['', '', '💭'] : (TOPIC[x.topic] || TOPIC.all); return `<div class="row"><span>${T[2]} ${esc(x.name)}<small class="sst ${c}">${st}${W.up(x.id) || W.dn(x.id) ? ' · ' + W.up(x.id) + '👍 ' + W.dn(x.id) + '👎' : ''}</small></span><span>${c === 'drop' ? `<button class="mini" data-revive="${esc(x.id)}">Bring back</button>` : x.you ? 'on this phone' : x.ok ? esc(ago(x.ok)) + ' ago' : 'waiting'}</span></div>`; };
  const groups = []; srcs.slice().sort((a, b) => tIdx(a.topic) - tIdx(b.topic)).forEach(x => { const g = groups[groups.length - 1]; if (!g || g.t !== x.topic) groups.push({ t: x.topic, l: [x] }); else g.l.push(x); });
  const you = YOU.map(x => `<div class="row"><span>${(TOPIC[x.topic] || TOPIC.all)[2]} ${esc(x.term)}<small class="sst">${esc(x.q || '')}</small></span><span>${esc((TOPIC[x.topic] || TOPIC.all)[1])}</span></div>`).join('');
  $('#sheetin').innerHTML = `<h2>My Feed</h2>
    <p>Your own feed of photos and videos. No comments, followers or sharing. Your 👍 and 👎 stay on this phone and only change what this feed shows you. It refreshes itself through the day from ${(FEED && FEED.sources || []).length || 'about 180'} public sources. Sport is always left out.</p>
    <p>👍 / 👎 teach it which <b>sources</b> and <b>topics</b> you like. New sources get a short trial (“Trying”) so you can judge them; a source you give about four more 👎 than 👍 is dropped (you can bring it back below).</p>
    <p>▶️ Videos play by themselves (muted) when they’re on screen and pause when you scroll past. Tap the speaker on a video for sound; it stays on until you close My Feed.</p>
    <a class="btn pri" href="${MY_APP}">← Back to My App</a>
    <p>📌 <b>For You</b> cards come from My App on this phone and are mixed through All at random: cars, birthdays, calendar, to-dos, garden, pets, meals and recipes (your own recipe photos too), weather, UV and power (kWh), roads, deliveries, plus every board and hub. Your own things never leave this phone, and bills and money are always left out.</p>
    <p>🖼️ <b>My Photos</b>: ${PHOTO_INFO.all ? `${PHOTO_INFO.used} of the ${PHOTO_INFO.all} photos on My App’s Photos page${PHOTO_INFO.approved ? ' (the ones you tagged approved, feed, keep or favourite)' : ''}` : 'photos from My App’s Photos page'}. Receipts, warranties, documents, screenshots and anything tagged <b>nofeed</b> or <b>private</b> are left out. Tag photos <b>approved</b> or <b>feed</b> in My App to show only those. Read on this phone only.</p>
    <h2 style="margin-top:18px">From About you</h2>
    ${you || `<p>Answer questions in My App’s About you and your interests (music, shows, food, garden, dog, outdoors, books…) turn into cards here. Money, family and routine answers are never used.</p>`}
    <h2 style="margin-top:18px">Manage interests</h2>
    <p>Tap to switch an interest off or back on. Off means its sources and posts about it are hidden, and a chip goes when all its interests are off. No sport is ever included.</p>
    ${TOPICS.filter(t => INTERESTS.some(x => x.topic === t[0])).map(t => `<h4 class="sgh">${t[2]} ${esc(t[1])}</h4><div class="ichs">${INTERESTS.filter(x => x.topic === t[0]).map(x => `<button class="ich${INT_OFF[x.name] ? '' : ' on'}" data-int="${esc(x.name)}" aria-pressed="${!INT_OFF[x.name]}">${INT_OFF[x.name] ? '' : '✓ '}${esc(x.name)}${W.int(x.name) > 1.05 ? ' 👍' : W.int(x.name) < 0.95 ? ' 👎' : ''}</button>`).join('')}</div>`).join('')}
    <div class="row"><span>Your votes</span><span>${ups} 👍 · ${downs} 👎</span></div>
    ${TOPICS.filter(t => !['all', 'life', 'liked', 'photos'].includes(t[0])).concat(YOU_CHIPS.map(id => TOPIC[id])).map(t => `<div class="row"><span>${t[2]} ${esc(t[1])}</span><span>${W.topic(t[0]) > 1.05 ? 'More' : W.topic(t[0]) < 0.95 ? 'Less' : 'Normal'}</span></div>`).join('')}
    <button class="btn" id="resetv">Clear my votes</button>
    <h2 style="margin-top:18px">Sources</h2>
    ${groups.map(g => `<h4 class="sgh">${g.t === 'you' ? '💭 About-you searches' : esc((TOPIC[g.t] || TOPIC.all)[2] + ' ' + (TOPIC[g.t] || TOPIC.all)[1])}</h4>` + g.l.map(row).join('')).join('')}
    <div class="row"><span>🌱 Northland garden calendar</span><span>monthly</span></div>
    <p>Every post shows its source at the top and links back to where it came from. Version ${APP_VERSION}.</p>
    <button class="btn" data-close>Close</button>`;
  $('#sheet').classList.add('on');
}
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }

/* ---- events ---- */
document.addEventListener('click', e => {
  const t = e.target;
  const c = t.closest('[data-tab]'); if (c) { tab = c.dataset.tab; ls.set('tab', tab); draw(); window.scrollTo({ top: 0 }); return; }
  const v = t.closest('[data-vote]'); if (v) { vote(v, +v.dataset.vote); return; }
  const u = t.closest('[data-undo]'); if (u) { const id = u.dataset.undo; delete VOTES[id]; ls.set('votes', VOTES); const it = order.find(x => x.id === id); const card0 = u.closest('.card'); if (it && card0) { card0.outerHTML = it.topic === 'life' ? lifeCard(it) : card(it); fillPics(); watchVids(); } return; }
  const sb = t.closest('[data-snd]'); if (sb) { e.preventDefault(); toggleSound(sb.closest('.media.vid')); return; }
  const p = t.closest('.media.vid'); if (p) { if (!p.classList.contains('playing') || curVid !== p) playVid(p, true); return; } // tap: play this one with sound
  const dm = t.closest('[data-dismiss]'); if (dm) { DISMISS[dm.dataset.dismiss] = Date.now(); ls.set('dismiss', DISMISS); const c0 = dm.closest('.card'); if (c0) { c0.style.transition = 'opacity .25s, transform .25s'; c0.style.opacity = 0; c0.style.transform = 'scale(.97)'; setTimeout(() => c0.remove(), 260); } toast('Hidden from My Feed'); return; }
  const mo = t.closest('[data-more]'); if (mo) { mo.classList.toggle('open'); return; }
  if (t.id === 'rf') { load(true); return; }
  if (t.id === 'st') { settings(); return; }
  const ib = t.closest('[data-int]'); if (ib) { const n = ib.dataset.int; if (INT_OFF[n]) delete INT_OFF[n]; else INT_OFF[n] = 1; ls.set('intOff', INT_OFF); const y = $('#sheet').scrollTop; for (const i of (FEED && FEED.items) || []) delete i._ints; settings(); $('#sheet').scrollTop = y; draw(); toast((INT_OFF[n] ? 'Off: ' : 'On: ') + n); return; }
  const rv = t.closest('[data-revive]'); if (rv) { REVIVE[rv.dataset.revive] = Date.now(); ls.set('revive', REVIVE); settings(); draw(); toast('Brought back'); return; }
  if (t.id === 'resetv') { if (confirm('Clear all your 👍 and 👎?')) { VOTES = {}; ls.set('votes', VOTES); $('#sheet').classList.remove('on'); draw(); toast('Votes cleared'); } return; }
  if (t.id === 'sheet' || t.closest('[data-close]')) $('#sheet').classList.remove('on');
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; setupYou(); refreshYou(); loadPhotos(); if (FEED && Date.now() - (FEED._got || 0) > 20 * 60e3) { FEED._got = Date.now(); load(false); } });

window.addEventListener('storage', e => { if (e.key !== 'myFeedLife') return; const before = YOU.map(x => x.term).join('|'); setupYou(); if (YOU.map(x => x.term).join('|') !== before) refreshYou(); if ((tab === 'life' || !TOPIC[tab]) && scrollY < 200) draw(); }); // My App updated your items or About you
{ const cut = Date.now() - 30 * 864e5; for (const k in DISMISS) if (DISMISS[k] < cut) delete DISMISS[k]; ls.set('dismiss', DISMISS); }
noteSources();
noteSrcInts();
setupYou();
draw();
load(false);
loadPhotos().then(() => { if (PHOTOS.length && scrollY < 200 && (tab === 'all' || tab === 'life' || tab === 'photos')) draw(); else chips(); });
setTimeout(refreshYou, 1200);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
