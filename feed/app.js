/* Info Book – Shane's private photo and video feed. No likes counts, comments, followers or sharing.
   Thumbs up / down are saved on this phone only (localStorage) and only change the order of this feed. */
'use strict';
const APP_VERSION = '1.9.79';
const FEED_URL = 'https://shane-my-feed-data.phoneapp12.workers.dev/feed.json';
const MY_APP = '../'; // Info Book lives at My App's address + feed/, so My App is one level up
const TOPICS = [
  ['all', 'All', '✨', '#7c3aed', '#ec4899'],
  ['life', 'For You', '📌', '#0f766e', '#2563eb'],
  ['family', 'Family', '💬', '#be185d', '#7c3aed'], // 1.7.0: shared by the family, and what they're talking about (members only)
  ['election', 'Election 2026', '🗳️', '#1d4ed8', '#b91c1c'], // 1.6.0: until election night (7 Nov 2026), then it goes by itself
  ['sitcoms', 'Sitcoms', '😂', '#f59e0b', '#ef4444'],
  ['garden', 'Gardening', '🌱', '#16a34a', '#65a30d'],
  ['music', 'Music', '🎵', '#db2777', '#9333ea'],
  ['scifi', 'Sci-fi & Space', '🚀', '#2563eb', '#7c3aed'],
  ['nz', 'Around NZ', '🇳🇿', '#0891b2', '#1d4ed8'],
  ['dogs', 'Dogs', '🐶', '#ea580c', '#a16207'],
  ['nature', 'Nature', '🌿', '#059669', '#0e7490'],
  ['events', 'NZ events', '🎆', '#be123c', '#7c3aed'],
  ['food', 'Food (GF)', '🍲', '#c2410c', '#eab308'],
  ['gf', 'Gluten free & food brands', '🌾', '#a16207', '#16a34a'],
  ['kids', 'Kids & activities', '🧒', '#0284c7', '#f59e0b'], // 1.7.1: on for everyone (crafts, science, school holidays, family days out, sensory-friendly ideas) // 1.6.1: NZ meal kits, GF bread and brands, vegan and GF events (also shown in Food and For You)
  ['tech', 'AI & tech', '🤖', '#4f46e5', '#06b6d4'],
  ['diy', 'DIY', '🛠️', '#9a3412', '#f59e0b'],
  ['science', 'Science', '🔬', '#0e7490', '#2563eb'],
  ['travel', 'Travel', '✈️', '#0369a1', '#14b8a6'],
  ['fitness', 'Fitness & weights', '💪', '#0f766e', '#14b8a6'],
  ['selling', 'Selling & side hustles', '💰', '#15803d', '#ca8a04'],
  ['creative', 'Creative & crafts', '🎨', '#c026d3', '#f97316'],
  ['craft', 'Knitting & crafts', '🧶', '#db2777', '#a855f7'], // 1.8.3: calm, for cosy evenings
  ['tarot', 'Tarot', '🔮', '#6d28d9', '#db2777'], // 1.8.5 (off unless picked)
  ['parent', 'Parenting & family', '👪', '#0e7490', '#db2777'], // 1.9.0 off unless picked (suggested by life stage)
  ['rainbow', 'Drag & LGBTQ+', '🌈', '#e11d48', '#7c3aed'], // 1.9.0 off unless picked
  ['candy', 'Candy Crush tips', '🍬', '#ec4899', '#f97316'], ['pets', 'Cute & funny pets', '🐾', '#f59e0b', '#ec4899'], ['hp', 'Harry Potter', '🪄', '#166534', '#94a3b8'], ['monarch', 'Monarch butterflies', '🦋', '#ea580c', '#facc15'], ['nd', 'ADHD & autism', '🧩', '#0ea5e9', '#8b5cf6'], // 1.9.1 off unless picked
  ['social', 'Social work & community (NZ)', '🤝', '#0f766e', '#2563eb'], // 1.9.0 off unless picked
  ['culture', 'Culture & stage', '🎭', '#7c2d12', '#be123c'],
  ['learn', 'Learning & ideas', '📖', '#1e40af', '#0891b2'],
  ['games', 'Games & puzzles', '🎲', '#6d28d9', '#2563eb'],
  ['vgames', 'Video gaming', '🎮', '#7c3aed', '#22c55e'], // 1.8.3: also shown in the Games & puzzles chip
  ['boardg', 'Board games', '🎲', '#b45309', '#7c3aed'],
  ['fantasy', 'Fantasy games', '🐉', '#065f46', '#7c3aed'],
  ['collect', 'Collecting', '🏺', '#92400e', '#a16207'],
  ['outdoors', 'Outdoors', '🏕️', '#166534', '#0d9488'],
  ['cars', 'Cars & machines', '🚗', '#1e3a8a', '#475569'],
  ['photos', 'My Photos', '🖼️', '#be185d', '#f59e0b'],
  ['liked', 'Liked', '👍', '#16a34a', '#0d9488']
];
const TOPIC = Object.fromEntries(TOPICS.map(t => [t[0], t]));
Object.defineProperty(TOPIC.life, 1, { get: () => forMe(1), enumerable: true }); // 1.9.74 📌 For Shane / For Sarah … // 1.4.0: About-you chips are added to this as they're found
const BASE = { hp: 0.95, monarch: 0.95, nd: 0.9, candy: 0.9, pets: 1, parent: 0.85, rainbow: 0.85, social: 0.85, tarot: 0.8, craft: 0.85, vgames: 0.8, boardg: 0.8, fantasy: 0.8, election: 1.2, gf: 1.0, kids: 0.9, sitcoms: 1.35, garden: 1.1, music: 1, scifi: 1.05, nz: 1, dogs: 1, nature: 0.95, events: 0.9, food: 0.95, tech: 0.85, diy: 0.85, science: 0.85, travel: 0.85, fitness: 0.85, selling: 0.85, creative: 0.8, culture: 0.75, learn: 0.75, games: 0.75, collect: 0.75, outdoors: 0.8, cars: 0.75 }; // sitcoms lead
const baseOf = t => BASE[t] || (String(t).startsWith('you:') ? 0.8 : 1);
const SPORT1 = /\b(sports?|rugby|all blacks|black ferns|super rugby|league|nrl|warriors|cricket|black ?caps|netball|silver ferns|football|soccer|fifa|premier league|afl|basketball|nba|nfl|golf|tennis|motorsport|formula ?1|f1|grand prix|supercars|boxing|ufc|mma|wrestling|athletics|olympics?|commonwealth games|hockey|rowing|america'?s cup|sailgp|triathlon|horse racing|darts|snooker|volleyball|baseball|world cup|bledisloe|test match|tyson fury|heavyweight)\b/i;
const SPORT2 = /\b(\d+ tries|four tries|three tries|two tries|scored (a |\w+ )?tr(y|ies)|conversions?|penalty (goal|kick)|kicked (all|a|the) |scores? (the )?winner|match-?winning|test match|semi-?finals?|quarter-?finals?|grand final|premiership|half-?time|full-?time|pacific championships?|world cup|olympi\w+|commonwealth games|tournament|playoffs?|championship|wicket|innings|goalkeeper|striker|touchdown|darts|snooker|golf(er)?|marathon|triathlon|wrestl\w+|boxing|ufc|grand prix|f1|motorsport|speedway|velodrome)\b/i; // 1.9.24 match reports that never say 'sport'
const SPORT = { test: t => SPORT1.test(t) || SPORT2.test(t) };
// 1.7.1 family-safe: no nudity or adult content, anywhere (same rules as the data service's safe.js)
const NUDE = /\b(nud(e|es|ity|ist|ists|ism)|semi-?nude|naked|nsfw|nsfl|topless|bottomless|erotic(a|ism|ally)?|lingerie|boudoir|sensual(ity)?|figure (study|studies|drawing|model)|life drawing|live model|nude model|odalisques?|breasts?|nipples?|genital(s|ia)?|penis|vagina|porn(o|ography|ographic)?|pin-?ups?|burlesque|undress(ed|ing)?|strip(per|pers|tease|club)|playboy|onlyfans|bikinis?|thongs?|skinny[- ]?dip\w*|sexy|sexual(ly|ity)?|sex (worker|work|toy|toys|scene|scenes)|fetish\w*|kinky|xxx|adult (content|film|films|only))\b/i;
const ART_NUDE = /\b(venus|birth of venus|nymphs?|bathers|bathing|the bath|shower|reclining|olympia|adam and eve|the three graces|danaë|danae|leda|susanna|bathsheba|schiele|modigliani|bouguereau|klimt|courbet|rubens|titian|ingres|egon|figurative|the body|bodies|torso|male gaze)\b/i;
const ART_TOPICS = new Set(['rainbow', 'parent', 'social', 'creative', 'culture', 'learn', 'collect', 'travel', 'kids', 'craft', 'vgames', 'boardg', 'fantasy', 'tarot']);
const GAME_TOPICS = new Set(['vgames', 'boardg', 'fantasy']), GAME_BAD = /\besports?\b|tournament|\bgore\b|gory|bloody|dismember|decapitat|mutilat|torture|\bR18\b|adults? only|seductive|succubus|bikini armou?r/i; // 1.8.3
const BLOCKED = new Set(['4qrdzz', '4ek9op']); // the r/museum nude photos Shane reported (1 Nov 2026)
const BLOCKED_SRC = new Set(['rd-museum', 'rd-historyporn', 'hyperallergic', 'openculture', 'yt-proko', 'rd-drawing']);
function unsafe(i) { if (!i) return false; if (BLOCKED.has(i.id) || BLOCKED_SRC.has(i.src)) return true; const t = [i.t, i.s, i.url, i.tag, i.sub].join(' '); if (GAME_TOPICS.has(i.topic) && GAME_BAD.test(t)) return true; return NUDE.test(t) || /\bnsfw\b|over_?18/i.test(t) || (ART_TOPICS.has(i.topic) && ART_NUDE.test(t)); }
const PAGE = 12;
const THUMB = {
  up: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path class="sh" d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path class="ln" d="M7 10v12"/></svg>',
  dn: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path class="sh" d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/><path class="ln" d="M17 14V2"/></svg>'
};

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k, d) { try { const v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); } catch (e) { } if (k === 'intOff' || k === 'moodOff' || k === 'pick') famPrefsChanged(); } }; // 1.7.0: each family member has their own settings

/* ---- 1.5.0: Interests. Shane's list (simplicable.com/life/interests) plus cooking, exercise, weights and selling.
   Sport is left out entirely. Each interest belongs to a topic chip (new groups, or an existing tab it fits). Switch
   any of them off in ⚙️ → Manage interests: their sources and matching posts disappear from the feed. ---- */
const INTERESTS = [ // name, topic, words that mark a post as being about it
  ['Tarot meanings', 'tarot', 'tarot|cards? of the day|spreads?|readings?|major arcana|minor arcana|wands|cups|swords|pentacles'], ['Tarot decks & art', 'tarot', 'decks?|tarot art|oracle cards?'], ['Crystals & gemstones', 'tarot', 'crystals?|gem ?stones?|quartz|amethyst|citrine|obsidian|agate|geodes?|minerals?|selenite|labradorite|moonstone|tourmaline|rose quartz'],
  ['Knitting', 'craft', 'knit(s|ting|ted)?|yarn|wool|sweater|jumper|beanie|cable'], ['Crochet', 'craft', 'crochet(ed|ing)?|amigurumi|granny squares?|plushies?|magic ring|safety eyes|yarn'], ['Sewing & quilting', 'craft', 'sew(ing|n)?|quilt(s|ed|ing)?|fabric|dressmaking'], ['Embroidery', 'craft', 'embroider(y|ed)?|cross[ -]?stitch|stitch(es|ing)?'], ['Paper crafts', 'craft', 'card ?making|cards?|scrapbook(ing)?|paper|cricut|pop[ -]?up'], ['Crafts', 'craft', 'crafts?|handmade|felting|macram[eé]|weav(e|ing)'],
  ['Video gaming', 'vgames', 'video ?games?|gaming|gamers?|trailer|consoles?'], ['Nintendo', 'vgames', 'nintendo|switch|mario|pok[eé]mon|kirby|pikmin|animal crossing'], ['PlayStation & Xbox', 'vgames', 'playstation|ps5|xbox'], ['PC games', 'vgames', '\\bpc\\b|steam'], ['Cosy games', 'vgames', 'cosy|cozy|wholesome|farming|stardew|island'],
  ['Board game news & nights', 'boardg', 'board ?games?|tabletop|card games?|dice|meeples?|lorcana|how to play|games? night'],
  ['D&D & tabletop RPGs', 'fantasy', 'd&d|dungeons|dragons|rpgs?|role[ -]?play|campaign|dungeon master|battle ?maps?'], ['Warhammer & miniatures', 'fantasy', 'warhammer|miniatures?|minis|painting|games workshop|40k|sigmar|necromunda|ogors?'], ['Fantasy video games', 'fantasy', 'zelda|elder scrolls|skyrim|baldur|final fantasy|witcher|fantasy'],
  ['Baby & toddler', 'parent', 'bab(y|ies)|toddlers?|newborns?|infants?|sleep|feeding|breastfeed\\w*|bottle|wean(ing)?|milestones?|plunket|teething|nappy|nappies|preschool'], ['Primary-age kids', 'parent', 'child(ren)?|kids|siblings?|school|homework|big feelings|meltdowns?|tantrums?|sleepovers?'],
  ['Autism & sensory parenting', 'parent', 'autism|autistic|sensory|neurodivergen\\w*|adhd|ot\\b|occupational therap\\w*|stim(ming)?|regulation'], ['Parenting teens', 'parent', 'teens?|teenagers?|tweens?|adolescen\\w*|rangatahi|secondary school|study'], ['Grandparenting', 'parent', 'grand(parents?|kids|children|ma|pa|mother|father)|nana|koro|kuia|mokopuna'],
  ['Candy Crush tips', 'candy', 'candy crush|candies|booster|level|combo|colou?r bomb|striped|wrapped'], ['Horses', 'pets', 'horses?|foals?|pon(y|ies)|equine|mares?|stallions?|horsepics'], ['Cute & funny pets', 'pets', 'pets?|dogs?|pupp(y|ies)|cats?|kittens?|bunn(y|ies)|animals?|aww|derp'], ['Harry Potter', 'hp', 'harry potter|hogwarts|wizarding|slytherin|gryffindor|hufflepuff|ravenclaw|butterbeer|snape|draco|malfoy|dumbledore|hermione|quidditch'], ['Monarch butterflies', 'monarch', 'monarchs?|butterfl\\w*|swan plants?|caterpillars?|chrysalis|milkweed'], ['ADHD & autism parenting', 'nd', 'adhd|autis\\w*|takiw[aā]tanga|aroreretini|neurodiver\\w*|sensory|meltdowns?|executive function'],
  ['Drag', 'rainbow', 'drag|drag race|rupaul|queens?|lip ?sync|pit stop'], ['NZ rainbow community', 'rainbow', 'rainbow|pride|lgbt\\w*|queer|takatāpui|takatapui|trans|gay|lesbian|bi(sexual)?|insideout|express'], ['Makeup & style', 'rainbow', 'makeup|make-up|beauty|lipstick|eyeshadow|fashion|style|looks?'],
  ['Social work practice', 'social', 'social work(ers?)?|swrb|registration|practice|supervision|anzasw|oranga tamariki|tauwhiro|cpd'], ['Community & wellbeing', 'social', 'community|wellbeing|well-being|mental health|whānau ora|whanau ora|youth work|volunteer\\w*|self-care|disabilit(y|ies)|carers?'],
  ['Kids activities', 'kids', 'kids?|children|tamariki|school holidays?|family day|whānau day|play(ground|group)?'], ['Kids crafts', 'kids', 'how to draw|craft|colou?ring|paper|folding'], ['Kids science', 'kids', 'science|experiment|volcano|dinosaur|space|animals'], ['Sensory-friendly', 'kids', 'sensory|autism|autistic|quiet|calm|fine motor|ot\\b'], ['Family days out', 'kids', 'family|days? out|outing|market|museum|park'],
  ['Gluten free', 'gf', 'gluten[ -]?free|coeliac|celiac|gf'], ['Vegan', 'gf', 'vegan|plant[ -]?based|dairy[ -]?free'], ['Meal kits', 'gf', 'meal kits?|my food bag|bargain box|fresh start|woop|hellofresh|recipe box'],
  ['Election 2026', 'election', 'election|vote|voting|candidates?|polls?|policy|policies|manifesto'],
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
if (PRIVATE_OK && !ls.get('tarotDefault', 0)) { INT_OFF['Tarot meanings'] = 1; INT_OFF['Tarot decks & art'] = 1; ls.set('intOff', INT_OFF); ls.set('tarotDefault', 1); } if (PRIVATE_OK && !ls.get('crysDefault', 0)) { INT_OFF['Crystals & gemstones'] = 1; ls.set('intOff', INT_OFF); ls.set('crysDefault', 1); } // 1.9.67 💎 crystals are Monique's: off on Shane's phone // 1.8.5 Tarot is off on Shane's phone until he turns it on
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
const GROUP_TOPICS = ['hp', 'monarch', 'nd', 'parent', 'rainbow', 'social', 'candy', 'pets', 'election', 'gf', 'kids', 'tarot', 'craft', 'vgames', 'boardg', 'fantasy', 'fitness', 'selling', 'creative', 'culture', 'learn', 'games', 'collect', 'outdoors', 'cars'];
// 1.9.0 topics nobody gets unless they pick them (members: in their interests; Shane: switched on in a suggestion or ⚙️)
const OPTIN = new Set(['parent', 'rainbow', 'social', 'candy', 'pets', 'nd', 'hp', 'monarch']);
function optedIn(t) { return PICK ? PICK.includes(t) : ls.get('optIn', []).includes(t); }
const topicOn = t => pickOk(t) && (!OPTIN.has(t) || optedIn(t)) && (!GROUP_TOPICS.includes(t) || INTERESTS.some(x => x.topic === t && !INT_OFF[x.name]));

let FEED = ls.get('feed', null);
let VOTES = ls.get('votes', {});        // id -> { v: 1 | -1, topic, src, at, item }
let SEEN = ls.get('seen', {});          // id -> times shown (keeps the feed fresh)
/* 1.9.30 👀 show each thing once: a card that's been on screen for a second isn't shown again on later loads (per member,
   on this phone; the last 5,000, for 60 days). Warnings, outages, pinned/private cards, countdowns, the daily cards and
   family posts stay (family posts come back only when there's a new comment or like). The same story from two sources
   shows once. SEEN_BASE is what was seen before this load, so nothing vanishes while you're looking at it. */
const SEEN_MAX = 5000, SEEN_DAYS = 60, seenDayN = () => Math.floor(Date.now() / 864e5);
let SEEN1 = ls.get('seen1', {}), SHSEEN = ls.get('shseen', {}), SEEN_BASE = new Set(Object.keys(SEEN1)), SH_BASE = { ...SHSEEN };
let hidAt = 0; document.addEventListener('visibilitychange', () => { if (document.hidden) hidAt = Date.now(); else if (hidAt && Date.now() - hidAt > 10 * 60e3) seenRebase(); });
function seenRebase() { SEEN_BASE = new Set(Object.keys(SEEN1)); SH_BASE = { ...SHSEEN }; }
let s1T = 0;
function seenSave() { clearTimeout(s1T); s1T = setTimeout(() => { const d = seenDayN(); let e = Object.entries(SEEN1).filter(([, v]) => d - v <= SEEN_DAYS); if (e.length > SEEN_MAX) { e.sort((a, b) => b[1] - a[1]); e.length = SEEN_MAX; } SEEN1 = Object.fromEntries(e); const sh = Object.entries(SHSEEN); if (sh.length > 400) SHSEEN = Object.fromEntries(sh.slice(-400)); ls.set('seen1', SEEN1); ls.set('shseen', SHSEEN); }, 1500); }
const seenOk = i => !!i && (!i.x || i.x === 'watch' || i.x === 'concert' || i.x === 'hometip' || i.x === 'vlog') && !i.pin && i.topic !== 'life' && !i._share && !/^(tarotday|sly-|fest)/.test(i.id || '');
const shSig = i => { const s = i._share || {}; return (s.nc || 0) + '/' + ((s.likes || []).length + (s.ups || []).length); };
function wasSeen(i) { return seenOk(i) && (SEEN_BASE.has(i.id) || (i._dups || []).some(d => SEEN_BASE.has(d))); }
function shareSeen(i) { const k = i._share && i._share.card || i.id; return k in SH_BASE && SH_BASE[k] === shSig(i); }
function markSeen(id) {
  const i = (typeof order !== 'undefined' && order.find(x => x.id === id)) || null; if (!i) return;
  if (i._share) { SHSEEN[i._share.card || i.id] = shSig(i); seenSave(); return; }
  if (!seenOk(i)) return; const d = seenDayN(); SEEN1[i.id] = d; for (const x of i._dups || []) SEEN1[x] = d; seenSave();
}
let seenIO = null; const seenTm = new Map();
function watchSeen(root) {
  if (!('IntersectionObserver' in window)) return;
  if (!seenIO) seenIO = new IntersectionObserver(es => { for (const e of es) { const id = e.target.dataset.id; if (!id) continue;
    if (e.isIntersecting && e.intersectionRatio >= 0.5) { if (!seenTm.has(id)) seenTm.set(id, setTimeout(() => { seenTm.delete(id); markSeen(id); seenIO.unobserve(e.target); }, 1000)); }
    else { clearTimeout(seenTm.get(id)); seenTm.delete(id); } } }, { threshold: [0, 0.5] });
  (root || document).querySelectorAll('#feed article.card[data-id]:not([data-sw])').forEach(el => { el.dataset.sw = 1; seenIO.observe(el); });
}
/* the same story from different sources: one card (the one with a picture), and seeing either counts for both */
const STOP = new Set('the and for with that this from have will your about after over into what when where which their there been were they them than then more most just says said year years new zealand nz kiwi kiwis'.split(' '));
const storyWords = t => [...new Set(String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(w => w.length > 3 && !STOP.has(w)))];
function collapseStories(list) {
  const kept = [], sets = [];
  for (const i of list) {
    if (!seenOk(i) || i.kind === 'event' || i.kind === 'tv') { kept.push(i); sets.push(null); continue; }
    const w = storyWords(i.t); let hit = -1;
    if (w.length >= 4) for (let k = 0; k < kept.length; k++) { const o = sets[k]; if (!o) continue; let n = 0; for (const x of w) if (o.has(x)) n++; if (n >= 4 && n / Math.min(w.length, o.size) >= 0.7) { hit = k; break; } }
    if (hit < 0) { kept.push(i); sets.push(w.length >= 4 ? new Set(w) : null); continue; }
    const a = kept[hit], best = (!a.img && !a.vid && (i.img || i.vid)) ? i : a, other = best === a ? i : a;
    kept[hit] = { ...best, _dups: [...new Set([...(best._dups || []), other.id, ...(other._dups || [])])] };
  }
  return kept;
}
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
  const drop = k => !isElSrc(k) && (s[k] || 0) <= -3.5 && !((lastUp[k] || 0) > now - 30 * 864e5);
  const trial = k => !isElSrc(k) && isNewSrc(k) && !up[k] && !dn[k] && (IMP[k] || 0) < 30;
  return { int: k => clamp(1 + 0.15 * (ints[k] || 0), 0.4, 2.5), topic: k => clamp(1 + 0.12 * (t[k] || 0), 0.3, 2.5), src: k => isElSrc(k) ? 1 : drop(k) ? 0 : clamp(1 + 0.2 * (s[k] || 0), 0.15, 3) * (trial(k) ? 1.35 : 1), drop, trial, up: k => up[k] || 0, dn: k => dn[k] || 0, net: k => s[k] || 0 };
}
function intW(W, i) { const n = itemInts(i).slice(0, 3); return n.length ? n.reduce((a, k) => a * W.int(k), 1) ** (1 / n.length) : 1; } // 👍/👎 also teach it which interests you like
function rand(seed) { let x = seed % 2147483647; if (x <= 0) x += 2147483646; return () => (x = x * 16807 % 2147483647) / 2147483647; }
/* ---- 1.6.0 Election 2026: Whangārei candidates, the six parties' news and videos, Electoral Commission, RNZ politics.
   Gone after election night (8 Nov 2026 06:00 NZDT) here and in the data service. Kept neutral: every party gets the same kinds
   of source, the queue takes the parties in turn, and 👍/👎 never favour or drop one party's sources (only the topic as a whole). ---- */
const ELECTION_END = Date.UTC(2026, 10, 7, 17, 0, 0);
const isElSrc = k => /^el-/.test(k || '');
function elLive(i) {
  if (Date.now() >= ELECTION_END) return false;
  const s = ((FEED && FEED.sources) || []).find(x => x.id === i.src);
  return !(s && s.until && Date.now() >= s.until);
}
function partyTurns(q, seed) { // round robin by party, best post of each first; the starting party changes every hour
  const by = {}; for (const p of q) (by[p.i.party || '~'] = by[p.i.party || '~'] || []).push(p);
  const ks = Object.keys(by).sort(), out = [], st = seed % (ks.length || 1);
  const order = ks.slice(st).concat(ks.slice(0, st));
  for (let n = 0; out.length < q.length; n++) for (const k of order) if (by[k][n]) out.push(by[k][n]);
  return out;
}

/* ---- 1.6.0 time of day (phone's own clock, NZ): mornings lean to news, evenings and late night to calm and cute.
   Weighting only: nothing is hidden, votes still count and sitcoms still lead. Off in ⚙️. ---- */
let MOOD_OFF = !!ls.get('moodOff', false);
const MOODS = { // band: [label, news, calm, loud]
  morning: ['☀️ Morning news', 1.7, 0.9, 1],
  day: ['', 1, 1, 1],
  evening: ['🌆 Winding down', 0.75, 1.4, 0.8],
  night: ['🌙 Cosy evening', 0.5, 1.8, 0.6],
  small: ['🌙 Cosy late night', 0.7, 1.4, 0.7]
};
function moodBand(d = new Date()) { const h = d.getHours(); return h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 19 ? 'day' : h >= 19 && h < 21 ? 'evening' : h >= 21 || h < 3 ? 'night' : 'small'; }
const NEWS_SRC = /^(rnz|stuff|nzh|1news|newsroom|advocate|nz-nzh|nz-rnz|nz-itbrief|el-|events)/;
const LOUD_SRC = /trailers|^yt-rt$|^yt-ign/;
const CALM_SRC = /apod|nasa|astro|lofi|chillhop|aww|eyebleach|puppers|dodo|werate|cozy|kakapo|birds|doc$/;
function moodOf(i) {
  const s = ((FEED && FEED.sources) || []).find(x => x.id === i.src);
  if (s && s.mood) return s.mood;
  const k = i.src || '';
  if (i.topic === 'election' || i.topic === 'events' || NEWS_SRC.test(k)) return 'news';
  if (LOUD_SRC.test(k) || i.topic === 'games' || i.topic === 'cars') return 'loud';
  if (CALM_SRC.test(k) || ['dogs', 'nature', 'garden', 'food', 'outdoors', 'craft', 'tarot'].includes(i.topic) || i.mood === 'calm') return 'calm';
  return 'neutral';
}
function moodW(i) { if (MOOD_OFF) return 1; const m = MOODS[moodBand()], k = moodOf(i); return k === 'news' ? m[1] : k === 'calm' ? m[2] : k === 'loud' ? m[3] : 1; }
// 1.8.4 greeting under the title, from the phone's own clock: morning 5am–12pm, afternoon 12–5pm, evening 5pm–5am
function greetText(d = new Date()) {
  const h = d.getHours(), part = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : 'evening';
  const name = MEMBER && MEMBER.name && !MEMBER.pending ? MEMBER.name : '';
  return 'Good ' + part + (name ? ', ' + name : '');
}
function greet() { const el = $('#greet'); if (el) { const t = greetText(); if (el.textContent !== t) el.textContent = t; } }
setInterval(greet, 60e3); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') greet(); });
function moodLabel() { greet(); const el = $('#mood'); if (el) el.textContent = MOOD_OFF ? '' : MOODS[moodBand()][0]; }

/* 1.9.60 keep it local: NZ & Northland posts (and TVNZ / Three programmes) weigh more, overseas less */
function isNZc(i) { return !!i && !!(i.nz || /^(nz|ef|epg|tvm-nz|rnz|stuff|1news|nzgeo|doc|nzh|na-|wdc)/i.test(i.src || '') || /\.nz(\/|$|:)/i.test(((i.url || '').match(/^https?:\/\/[^/]+/) || [''])[0]) || /new zealand|aotearoa|kiwi|whang[aā]rei|northland|auckland|wellington|christchurch|tvnz|threenow|\bnz\b/i.test((i.t || '') + ' ' + (i.s || ''))); }
function nzW(i) { return isNZc(i) ? (i.src === 'nz-tvg2' ? 2.2 : 1.6) : (i.topic === 'sitcoms' ? 0.55 : 0.8); }
function rank(items) {
  const W = weights(), now = Date.now();
  const scored = items.map(i => {
    const ref = i.kind === 'tv' && i.ev ? Math.min(i.ev, now) : (i.first && i.at < i.first - 3 * 864e5 ? (i.at + i.first) / 2 : i.at);
    const ageH = Math.max(0, (now - ref) / 36e5);
    const fresh = Math.pow(0.5, ageH / 30);                        // half as strong every 30 hours
    const media = i.vid ? 1.15 : i.img ? 1.1 : i.kind === 'tip' ? 0.8 : 0.6; // pictures and videos first
    const seen = Math.pow(0.8, SEEN[i.id] || 0);                   // seen a few times: let new things through
    const hot = i.hot ? 1.5 : 1;                                   // e.g. fireworks this week
    return { i, sc: (0.15 + fresh) * media * seen * hot * baseOf(i.topic) * W.topic(i.topic) * W.src(i.src) * intW(W, i) * moodW(i) * popW(i) * nzW(i) }; // 1.8.1 popW: family likes
  }).sort((a, b) => b.sc - a.sc);
  // Mix: each step takes the best next post from the topic that's due, so every interest gets a turn
  // (higher-voted topics, and sitcoms, come round more often). About 1 in 7 slots explores further down a list.
  const r = rand(Math.floor(now / 36e5) + Object.keys(VOTES).length * 7), out = [], Q = {};
  for (const p of scored) (Q[p.i.topic] = Q[p.i.topic] || []).push(p);
  if (Q.election) Q.election = partyTurns(Q.election, Math.floor(now / 36e5));
  const TM = {}; for (const t in Q) TM[t] = Math.sqrt(Q[t].reduce((a, p) => a + moodW(p.i), 0) / Q[t].length); // a topic that's mostly calm comes round more at night
  const total = scored.length;
  const lastAt = {}; // step when each topic was last shown: the longer since, the more it's due
  while (out.length < total) {
    const n = out.length, prevSrc = (out[n - 1] || {}).src;
    let bestT = null, best = -1;
    for (const t in Q) {
      if (!Q[t].length) continue;
      const gap = n - (t in lastAt ? lastAt[t] : -8); // 1.5.0: topics not shown yet keep getting more due too
      const v = Math.sqrt(Q[t][0].sc) * gap * Math.pow(baseOf(t), 3) * W.topic(t) * TM[t] * (0.8 + 0.4 * r()); // sitcoms and liked topics come round more often
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
/* 1.8.5 🔮 Card of the day for anyone with Tarot on: the same card for everyone each day (NZ date), from the public-domain
   1909 Rider–Waite–Smith deck on Wikimedia Commons. Cards that are drawn with nudity (Lovers, Devil, Star, Sun, Judgement,
   World) are left out. */
const TAROT_MAJ = [['00_Fool', 'The Fool', 'New beginnings, a leap of faith, curiosity'], ['01_Magician', 'The Magician', 'You have what you need – make it happen'], ['02_High_Priestess', 'The High Priestess', 'Trust your intuition; quiet knowing'], ['03_Empress', 'The Empress', 'Nurturing, abundance, creativity'], ['04_Emperor', 'The Emperor', 'Structure, steadiness, leadership'], ['05_Hierophant', 'The Hierophant', 'Tradition, learning, guidance'], ['07_Chariot', 'The Chariot', 'Determination and moving forward'], ['08_Strength', 'Strength', 'Gentle courage and patience'], ['09_Hermit', 'The Hermit', 'Time to reflect and recharge'], ['10_Wheel_of_Fortune', 'Wheel of Fortune', 'Change is turning in your favour'], ['11_Justice', 'Justice', 'Fairness, honesty, clear choices'], ['12_Hanged_Man', 'The Hanged Man', 'Pause and see things differently'], ['13_Death', 'Death', 'An ending that makes room for something new'], ['14_Temperance', 'Temperance', 'Balance, moderation, calm'], ['16_Tower', 'The Tower', 'A shake-up that clears the way'], ['18_Moon', 'The Moon', 'Dreams, imagination, trust your gut']];
const TAROT_SUIT = [['Wands', 'Wands', 'energy, ideas and passion'], ['Cups', 'Cups', 'feelings, love and friendship'], ['Swords', 'Swords', 'thoughts, words and decisions'], ['Pents', 'Pentacles', 'home, work and the practical']];
const TAROT_RANK = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const TAROT_RANK_MEAN = ['a fresh start in', 'choices and balance in', 'growth and teamwork in', 'rest and stability in', 'a small challenge in', 'kindness and harmony in', 'patience with', 'steady progress in', 'nearly there with', 'a full circle in', 'curiosity and news about', 'action and adventure in', 'warm, wise care for', 'calm mastery of'];
function tarotOfDay() {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }), n = hash('tarot' + day) % (TAROT_MAJ.length + 56);
  let file, name, mean;
  if (n < TAROT_MAJ.length) { const c = TAROT_MAJ[n]; file = 'RWS_Tarot_' + c[0] + '.jpg'; name = c[1]; mean = c[2]; }
  else { const k = n - TAROT_MAJ.length, s = TAROT_SUIT[Math.floor(k / 14)], r = k % 14; file = s[0] + String(r + 1).padStart(2, '0') + '.jpg'; name = TAROT_RANK[r] + ' of ' + s[1]; mean = 'Today’s theme: ' + TAROT_RANK_MEAN[r] + ' ' + s[2]; }
  return { id: 'tarotday' + day.replace(/-/g, ''), t: '🔮 Card of the day: ' + name, s: mean + '. (Rider–Waite–Smith deck, 1909)', img: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + file + '?width=800', url: 'https://commons.wikimedia.org/wiki/File:' + file, topic: 'tarot', src: 'tarot-day', sn: 'Card of the day', kind: 'photo', at: Date.now() - 60e3, hot: 1 };
}

function visible() {
  if (!FEED) return [];
  if (tab === 'liked') return Object.values(VOTES).filter(v => v.v > 0 && v.item).sort((a, b) => b.at - a.at).map(v => v.item);
  const seenIds = new Set(), W = weights();
  const list = FEED.items.concat(youItems(), topicOn("tarot") && pickOk("tarot") ? [tarotOfDay()] : []).filter(i => {
    if (seenIds.has(i.id)) return false; seenIds.add(i.id);
    if (/^crys-/.test(i.src || '') && !(((ls.get('nudge', null) || {}).ib || {})['Crystals & gemstones'])) return false; // 1.9.67 💎 only for people Shane switched crystals on for (Monique)
    if (VOTES[i.id] && VOTES[i.id].v < 0) return false;          // thumbs-down: gone
    if (SPORT.test((i.t || '') + ' ' + (i.s || ''))) return false; // never any sport
    if (unsafe(i)) return false;                                   // 1.7.1: never any nudity
    if (typeof toneW === 'function' && !toneW(i)) return false;   // 1.9.30 upbeat: no heavy news (deaths, crime, war, court…)
    if (W.drop(i.src)) return false;                               // a source you've voted out
    if (!topicOn(i.topic) || intHidden(i)) return false;
    if (OPTIN.has(i.topic) && !optedIn(i.topic)) return false; // 1.9.0 parenting / drag & LGBTQ+ / social work: only when picked           // interests you've switched off
    if ((i.topic === 'election' || isElSrc(i.src)) && !elLive(i)) return false; // after election night
    if (i.kind === 'event' && i.ev && i.ev < Date.now() - 6 * 36e5) return false; // 1.6.1: past events go
    return tab === 'all' || i.topic === tab || (tab === 'food' && i.topic === 'gf') || (tab === 'games' && GAME_TOPICS.has(i.topic) && topicOn(i.topic));
  });
  return collapseStories(list).filter(i => !wasSeen(i)); // 1.9.30 once seen, gone (and one card per story)
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
function lifeSnap() { if (!PRIVATE_OK) return null; try { // 1.7.0: only on Shane's own phone
   return JSON.parse(localStorage.getItem('myFeedLife') || 'null'); } catch (e) { return null; } }
function lifeItems(withPool) {
  const snap = lifeSnap();
  if (!snap || !Array.isArray(snap.items)) return PHOTOS.length && withPool ? PHOTOS.filter(x => !DISMISS[x.id] && !(VOTES[x.id] && VOTES[x.id].v < 0)) : null;
  const stale = snap.today !== nzToday();
  const mine = snap.items.map((x, n) => ({ ...x, id: 'life:' + (x.cat + '|' + x.t + '|' + (x.iso || '')).toLowerCase(), days: daysTo(x.iso), n, mine: 1 }));
  const pool = withPool && Array.isArray(snap.pool) ? snap.pool.map((x, n) => ({ ...x, img: /^data:image\//.test(x.photo || '') ? x.photo : x.img, id: 'app:' + x.id, days: x.iso ? daysTo(x.iso) : null, n: 1000 + n })) : []; // x.photo: his own recipe photo
  return mine.concat(pool).filter(x => {
    if (DISMISS[x.id] || (VOTES[x.id] && VOTES[x.id].v < 0)) return false;
    if (LIFE_MONEY.test([x.t, x.s, x.tag].join(' ')) || SPORT.test([x.t, x.s, x.tag].join(' ')) || NUDE.test([x.t, x.s, x.tag].join(' '))) return false;
    if (stale && (x.cat === 'weather' || x.cat === 'solar' || x.kind === 'warn' || x.now)) return false; // yesterday's weather, power and warnings
    if (x.days != null && x.days < 0 && !['car', 'todo', 'pet', 'health'].includes(x.cat)) return false; // past events (overdue jobs stay)
    if (x.days != null && x.days > 2 && ['event', 'hol', 'gym', 'meal', 'health'].includes(x.cat)) return false; // 1.5.1: Shane only wants his own events once they're a couple of days away
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
  fillFamPhotos();
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
    <div class="hd"><div class="av">${em}</div><div class="who"><b>${esc(x.sn)}</b><small>${esc(x.sn === C[1] ? (x.tag || (x.mine ? '' : 'From My App')) : x.tag && x.tag !== C[1] ? C[1] + ' · ' + x.tag : C[1])}</small></div><span class="tp">${esc(forMe(1))}</span></div>
    ${media}
    <div class="bd"><h3>${esc(x.t)}</h3>${x.sub ? `<p class="lsub">${esc(x.sub)}</p>` : ''}${x.s ? `<p data-more>${esc(x.s)}</p>` : ''}${x.credit ? `<small class="cred">📷 ${esc(x.credit)}</small>` : ''}</div>
    <div class="ft">
      <button class="vote up${v > 0 ? ' on' : ''}" data-vote="1" aria-pressed="${v > 0}" aria-label="Thumbs up">${THUMB.up}</button>
      <button class="vote dn${v < 0 ? ' on' : ''}" data-vote="-1" aria-pressed="${v < 0}" aria-label="Thumbs down">${THUMB.dn}</button>
      ${famLifeBar(x)}<a class="open-l" href="${esc(go)}">Open in My App</a>${x.url ? `<a class="open-l" href="${esc(x.url)}" target="_blank" rel="noopener">Source ↗</a>` : ''}
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
  if (!window.indexedDB || !PRIVATE_OK) return; // 1.7.0: only on Shane's own phone
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
  for (const d of ls.get('discAdd', [])) { const key = String(d.term || '').toLowerCase(); if (key && !seen.has(key)) { seen.add(key); out.unshift({ term: d.term, k: 'misc', topic: 'you:' + SLUG(d.term), disc: 1 }); } } // 1.9.75 🧭 subjects added from New ideas (every member)
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
  for (const x of YOU) { const c = YOU_CACHE[x.k + '|' + x.term.toLowerCase()]; if (c && c.items) c.items.forEach(i => out.push({ ...i, topic: x.topic, tag: x.disc ? '🧭 New idea: ' + x.term : 'You said “' + x.term + '”' })); }
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
// 1.8.5 sharp video pictures: YouTube's 1280px picture when the video has one (small grey stand-in → fall back to 480px)
function ytThumb(id, img) { return !img || /i\.ytimg\.com\/vi\/[^/]+\/(hq|mq|sd)?default\.jpg/.test(img) ? 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg' : img; }
function vidMedia(id, img, title, extra = '', tall = false) {
  return `<div class="media vid${tall ? ' tall' : ''}" data-vid="${esc(id)}" role="button" tabindex="0" aria-label="Video: ${esc(title)}"><div class="vslot"></div><img class="vthumb" loading="lazy" referrerpolicy="no-referrer" src="${esc(ytThumb(id, img))}" alt="" data-yt="${esc(id)}" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg'"><span class="play"><span></span></span><button class="snd" data-snd aria-label="${SOUND ? 'Mute' : 'Turn sound on'}">${SOUND ? SPK.on : SPK.off}</button><button class="fsb" data-fs aria-label="Full screen">⛶</button>${extra}</div>`;
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
  if (el.dataset.vk) { rec.p = otherPlayer(el, rec); rec.ready = true; if (rec.want) playVid(el); return; } // 1.9.37 Reddit, Vimeo, TikTok, Facebook, Instagram, MP4
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
  const loud = withSound || (SOUND && (!navigator.userActivation || navigator.userActivation.hasBeenActive)); // 1.9.47 autoplay always starts muted until they've touched the page (browsers block sound before that)
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
  const thr = typeof MF !== 'undefined' && MF === 'vid' ? 0.45 : 0.6; // 1.9.47 Videos only: big/tall players start a bit sooner
  if (curVid && !curVid.isConnected) curVid = null; // the list was redrawn (filter changed)
  if (best && br >= thr) { if (best !== curVid && !VID_SAVE) playVid(best); else if (best === curVid && !VID_SAVE) { const r0 = PLAYERS.get(best); if (r0 && !r0.want) playVid(best); } }
  else if (curVid && (RATIO.get(curVid) || 0) < thr) pauseVid(curVid);
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
// 1.8.6 pinned specials (e.g. the Whangārei fireworks): everyone sees them at the top of All, whatever their interests, until the event ends
const PIN_GRACE = 30 * 60e3;
function pins() {
  if (!FEED) return [];
  const now = Date.now();
  return FEED.items.filter(i => i.pin && i.status !== 'cancelled' && now < (i.end || i.ev || 0) + (i.status === 'postponed' ? 7 * 864e5 : PIN_GRACE) && !unsafe(i) && !(VOTES[i.id] < 0));
}
function nzDayNum(t) { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t); return Math.round(Date.parse(p + 'T00:00:00Z') / 864e5); }
function countdown(i, now = Date.now()) {
  if (i.status === 'postponed') return '⚠️ Postponed';
  if (now >= i.ev && now < (i.end || i.ev)) return now >= (i.show || i.end) - 15 * 60e3 && i.show ? '🎆 Fireworks any minute!' : '🎉 On now!';
  if (now >= (i.end || i.ev)) return 'Finished – hope you had fun!';
  const d = nzDayNum(i.ev) - nzDayNum(now);
  return d <= 0 ? 'Tonight!' : d === 1 ? 'Tomorrow!' : `In ${d} days`;
}
function pinBox(i) {
  const tm = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  const t = x => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' }).format(x).replace(/\s/g, '');
  return `<div class="pinbox"><div class="cd${i.status ? ' warn' : ''}">${esc(countdown(i))}</div>
    ${i.status === 'postponed' ? `<p class="pnote">The organisers have postponed it${i.note ? ' – ' + esc(i.note) : ''}. Check the event page for the new date.</p>` : ''}
    <div class="prow">📅 ${esc(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short' }).format(i.ev))} · ${esc(t(i.ev).replace(/:00/, ''))}${i.end ? '–' + esc(t(i.end).replace(/:00/, '')) : ''}</div>
    ${i.show ? `<div class="prow">🎆 Fireworks about ${esc(t(i.show))}</div>` : ''}
    ${i.where ? `<div class="prow">📍 ${esc(i.where)}</div>` : ''}
    <a class="pbtn" href="${esc(i.url)}" target="_blank" rel="noopener">See event &amp; tickets ↗</a>
    ${i.credit ? `<small class="pcred">${esc(i.credit)}</small>` : ''}</div>`;
}
function card(i) {
  const T = TOPIC[i.topic] || TOPIC.all, v = VOTES[i.id] ? VOTES[i.id].v : 0;
  const style = `--c1:${T[3]};--c2:${T[4]}`;
  let media = '';
  if (i.photos) media = famPhotos(i);
  else if (i.vid) media = vidMedia(i.vid, i.img, i.t, '', /\/shorts\//.test(i.url || ''));
  else if (i.img && vidOf(i)) media = anyVidMedia(vidOf(i), i.img, i.t);
  else if (i.img) media = `<a class="media${i.kind === 'tv' ? ' tall' : ''}" href="${esc(i.url)}" target="_blank" rel="noopener"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(i.img)}" alt="${esc(i.t)}" onerror="if(!this.dataset.r){this.dataset.r=1;var s=this.src;setTimeout(()=>{this.src=s},1500)}else this.closest('.media').remove()"></a>`;
  else media = `<div class="hero"><span class="em">${T[2]}</span><h3>${esc(i.t)}</h3></div>`;
  const when = i.kind === 'event' && i.ev ? `<span class="when">📅 ${esc(evDate(i.ev))}</span>` : i.kind === 'tv' && i.where ? `<span class="when">📺 ${esc(i.where)}</span>` : '';
  const showTitle = (i.img || i.vid || i.photos) && i.t;
  return `<article class="card${i._share ? ' shared' : ''}${i.pin ? ' pinned' : ''}" data-id="${esc(i.id)}" style="${style}">${shareHead(i)}
    <div class="hd"><div class="av">${i.pin ? '📌' : T[2]}</div><div class="who"><b>${esc(i.pin ? 'Pinned for everyone' : i.sn || '')}</b>${i.pin ? '<small>Whangārei · this week</small>' : `<small>${esc(ago(i.at))}${i.party ? ' · ' + esc(i.party) : i.tag ? ' · ' + esc(i.tag) : itemInts(i)[0] ? ' · ' + esc(itemInts(i)[0]) : ''}${i._x ? '<span class="mx">new for you</span>' : weights().trial(i.src) ? '<span class="mx">new source</span>' : ''}</small>`}</div><span class="tp">${i.pin ? '🎆 Special' : esc(T[1])}</span></div>
    ${media}
    <div class="bd">${showTitle ? `<h3>${esc(i.t)}</h3>` : ''}${i.s ? `<p data-more>${esc(i.s)}</p>` : ''}${i.pin ? pinBox(i) : when}${popLine(i)}</div>
    ${typeof exLine === 'function' ? exLine(i) : ''}${rxLine(i)}<div class="ft">
      <button class="vote up${(FAM_ON && rxOf(i) ? (rxOf(i).ups || []).some(isMe) : v > 0) ? ' on' : ''}" data-vote="1" aria-pressed="${v > 0}" aria-label="Thumbs up">${THUMB.up}</button>${upNames(i)}
      <button class="vote dn${v < 0 ? ' on' : ''}" data-vote="-1" aria-pressed="${v < 0}" aria-label="Thumbs down">${THUMB.dn}</button>
      ${famBar(i)}${i.url && !i.pin ? `<a class="open-l" href="${esc(i.url)}" target="_blank" rel="noopener">${i._share && i.kind === 'link' ? 'Open on ' + esc(i.sn || 'the site') + ' ↗' : 'Open ↗'}</a>` : ''}
    </div></article>`;
}
function chips() {
  const list = TOPICS.filter(t => (t[0] !== 'photos' || PHOTOS.length) && (t[0] !== 'life' || PRIVATE_OK) && (t[0] !== 'family' || FAM_ON) && topicOn(t[0]) && (t[0] !== 'election' || (Date.now() < ELECTION_END && FEED && FEED.items.some(i => i.topic === 'election')))), at = list.findIndex(t => t[0] === 'photos' || t[0] === 'liked');
  list.splice(at, 0, ...YOU_CHIPS.map(id => TOPIC[id]));
  $('#chips').innerHTML = list.map(t => `<button class="chip${t[0] === tab ? ' on' : ''}" data-tab="${t[0]}">${t[2]} ${t[1]}${t[0] === 'family' && famNewLikes() ? '<i class="dot"></i>' : ''}</button>`).join('');
  const on = $('#chips .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function draw() {
  chips();
  const m = $('#feed');
  if (!FEED) { m.innerHTML = '<div class="sk"></div><div class="sk"></div>'; return; }
  if (tab === 'life' && !PRIVATE_OK) tab = 'all';
  if (tab === 'family') { if (FAM_ON) { drawFamily(); $('#upd').innerHTML = ''; moodLabel(); return; } tab = 'all'; }
  if (tab === 'life') { drawLife(); return; }
  if (tab === 'photos') { drawPhotos(); return; }
  if (!TOPIC[tab] || !topicOn(tab) || (tab === 'election' && Date.now() >= ELECTION_END)) tab = 'all';
  order = tab === 'liked' ? visible() : rank(visible()); shown = 0;
  if (tab === 'all') order = weave(order.filter(i => !i.pin), lifeMix()); // My App cards mixed in at random, different every refresh
  if (tab === 'all' && FAM_ON) order = weaveShares(order); // 1.7.0: family reposts for everyone
  if (tab === 'all') { const P = pins(); order = P.concat(order); if (typeof window.festive === 'function') order = window.festive(order, P.length); } // 1.8.6 pinned specials first; 1.9.1 festive countdowns dropped in at random
  if (typeof mediaFilter === 'function') order = mediaFilter(order); // 1.9.42 ☰ Videos & pictures / Videos only / Pictures only
  if (typeof carouselize === 'function') { try { order = carouselize(order); } catch (e) { } } // 1.9.56 ↔ swipe rows
  m.innerHTML = (order.length ? '' : `<div class="empty">${tab === 'liked' ? 'Nothing here yet. Tap 👍 on posts you like and they’ll be kept here.' : 'You’re all caught up ✨ New posts arrive through the day – check back soon.'}</div>`);
  more();
  moodLabel();
  $('#upd').innerHTML = FEED.updated ? `Updated<br>${esc(ago(FEED.updated))} ago` : '';
}
function drawLife() { // For You: only My App cards. Yours first (soonest first), then the boards and hubs at random.
  const L = lifeItems(true), m = $('#feed');
  if (!L) { m.innerHTML = `<div class="empty">📌 Your own things show here: cars, birthdays, calendar, to-dos, garden, pets, meals, weather, power, and every board and hub in My App.<br><br>Open <a href="${MY_APP}">My App</a> once on this phone and they’ll appear. They stay on this phone.</div>`; return; }
  const mine = L.filter(x => x.mine).sort((a, b) => (a.days == null ? 999 : a.days) - (b.days == null ? 999 : b.days) || a.n - b.n);
  order = mine.concat(wshuffle(L.filter(x => !x.mine), lifeWeight)); shown = 0;
  if (Date.now() < ELECTION_END && topicOn('election')) { // until election night: a Election 2026 card every few For You cards, parties in turn
    const W = weights(), el = rank(FEED.items.filter(i => i.topic === 'election' && elLive(i) && !(VOTES[i.id] && VOTES[i.id].v < 0) && !intHidden(i) && !SPORT.test((i.t || '') + ' ' + (i.s || '')))).slice(0, 12);
    if (el.length) { const out = []; let k = 0; order.forEach((x, n) => { out.push(x); if (n >= mine.length && (n - mine.length) % 4 === 3 && k < el.length) out.push(el[k++]); }); while (k < Math.min(el.length, 3)) out.push(el[k++]); order = out; }
  }
  if (topicOn('gf')) { // 1.6.1: a gluten-free / meal-kit / vegan-event card every few For You cards
    const gf = rank(FEED.items.filter(i => i.topic === 'gf' && !(VOTES[i.id] && VOTES[i.id].v < 0) && !intHidden(i) && !(i.kind === 'event' && i.ev && i.ev < Date.now() - 6 * 36e5) && !weights().drop(i.src))).slice(0, 10);
    if (gf.length) { const out = []; let k = 0; order.forEach((x, n) => { out.push(x); if (n >= mine.length && (n - mine.length) % 5 === 2 && k < gf.length) out.push(gf[k++]); }); while (k < Math.min(gf.length, 3)) out.push(gf[k++]); order = out; }
  }
  const snap = lifeSnap() || {};
  m.innerHTML = `<div class="load" style="padding-top:0">From My App on this phone${snap.at ? ' · updated ' + esc(ago(snap.at)) + ' ago' : ''} · bills and money are never shown</div>`;
  more();
}
function more() {
  const m = $('#feed'), next = order.slice(shown, shown + PAGE);
  if (!next.length) return;
  shown += next.length;
  m.insertAdjacentHTML('beforeend', next.map(i => i.topic === 'life' ? lifeCard(i) : card(i)).join('') + (shown < order.length ? '<div class="load" id="sentinel">Loading more…</div>' : `<div class="load">${typeof MF !== 'undefined' && MF === 'vid' ? 'You’re all caught up on videos 🎬' : typeof MF !== 'undefined' && MF === 'pic' ? 'You’re all caught up on pictures 🖼️' : 'You’re all caught up ✨'}</div>`));
  const old = m.querySelectorAll('#sentinel'); old.forEach((s, n) => { if (n < old.length - 1) s.remove(); });
  const flat = next.flatMap(i => i.x === 'row' ? i.items : [i]); // 1.9.56 swipe rows: their cards count like any other
  for (const i of flat) { SEEN[i.id] = (SEEN[i.id] || 0) + 1; if (i.src) IMP[i.src] = (IMP[i.src] || 0) + 1; }
  saveSeen(); fillPics(); watchVids(); famCounts(flat); watchSeen(m);
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
  if ((item._share || item.pin) && FAM_ON) { if (v > 0) { famVote(c, item, v); return; } if (!(VOTES[id] && VOTES[id].v < 0)) famVote(c, item, v); } // 1.8.1 family cards: 👍 is shown to the family
  const prev = VOTES[id];
  if (prev && prev.v === v && v > 0) { // 1.9.33 one like per person: a repeat 👍 doesn't toggle; Undo is in the toast
    toastUndo('You already liked this 👍', () => { famPublicVote(item, 0); delete VOTES[id]; ls.set('votes', VOTES); c.querySelectorAll('.vote').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); toast('Like removed'); });
    return;
  }
  famPublicVote(item, prev && prev.v === v ? 0 : v); // 1.8.1 the family sees 👍 counts (👎 stays private)
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
  $('#rf').classList.add('spin'); if (force) { famFresh(true); seenRebase(); }
  try {
    const r = await fetch(FEED_URL + (force ? '?t=' + Date.now() : ''), { cache: force ? 'no-store' : 'default' });
    if (!r.ok) throw new Error(r.status);
    const f = await r.json();
    if (f && Array.isArray(f.items) && f.items.length) {
      const first = !FEED || FEED.updated !== f.updated;
      FEED = f; ls.set('feed', f); noteSources(); noteSrcInts(); if (typeof loadPinRx === 'function') loadPinRx();
      if (first || force) draw();
      if (force) toast('Feed is up to date');
    }
  } catch (e) { if (!FEED) $('#feed').innerHTML = '<div class="empty">Can’t reach the feed right now. Check your connection and tap ↻.</div>'; else if (force) toast('Offline – showing the last feed'); }
  $('#rf').classList.remove('spin');
}

/* ---- settings ---- */
// 1.8.7 text size: Normal / Large (default) / Extra large, per person on this phone (the class is also set early in index.html)
function setTextSize(k) { ls.set('textSize', k); const c = document.documentElement.classList; c.remove('ts-l', 'ts-xl'); if (k === 'l') c.add('ts-l'); if (k === 'xl') c.add('ts-xl'); }
function settings() {
  const W = weights(), ups = Object.values(VOTES).filter(v => v.v > 0).length, downs = Object.values(VOTES).filter(v => v.v < 0).length;
  const srcs = (FEED && FEED.sources || []).concat([['you-itunes', 'Apple Music'], ['you-tvmaze', 'TVmaze'], ['you-mealdb', 'TheMealDB'], ['you-openlib', 'Open Library'], ['you-wiki', 'Wikipedia']].map(([id, name]) => ({ id, name, topic: 'you', you: 1 })));
  const tIdx = t => { const n = TOPICS.findIndex(x => x[0] === t); return n < 0 ? 99 : n; };
  const status = id => W.drop(id) ? ['Dropped', 'drop'] : W.trial(id) ? ['Trying', 'try'] : W.src(id) > 1.05 ? ['More', 'more'] : W.src(id) < 0.95 ? ['Less', 'less'] : ['Kept', ''];
  const row = x => { const [st, c] = status(x.id); const T = x.you ? ['', '', '💭'] : (TOPIC[x.topic] || TOPIC.all); return `<div class="row"><span>${T[2]} ${esc(x.name)}<small class="sst ${c}">${st}${W.up(x.id) || W.dn(x.id) ? ' · ' + W.up(x.id) + '👍 ' + W.dn(x.id) + '👎' : ''}</small></span><span>${c === 'drop' ? `<button class="mini" data-revive="${esc(x.id)}">Bring back</button>` : x.you ? 'on this phone' : x.ok ? esc(ago(x.ok)) + ' ago' : 'waiting'}</span></div>`; };
  const groups = []; srcs.slice().sort((a, b) => tIdx(a.topic) - tIdx(b.topic)).forEach(x => { const g = groups[groups.length - 1]; if (!g || g.t !== x.topic) groups.push({ t: x.topic, l: [x] }); else g.l.push(x); });
  const you = YOU.map(x => `<div class="row"><span>${(TOPIC[x.topic] || TOPIC.all)[2]} ${esc(x.term)}<small class="sst">${esc(x.q || '')}</small></span><span>${esc((TOPIC[x.topic] || TOPIC.all)[1])}</span></div>`).join('');
  const ts = ls.get('textSize', 'l');
  $('#sheetin').innerHTML = `<h2>Text size</h2><div class="tsz">${[['n', 'Normal'], ['l', 'Large'], ['xl', 'Extra large']].map(([k, l]) => `<button class="ich${ts === k ? ' on' : ''}" data-ts="${k}" aria-pressed="${ts === k}">${ts === k ? '✓ ' : ''}${l}</button>`).join('')}</div><p class="tsp">Saved on this phone for you. Your phone’s own text size setting still applies on top.</p>` + famSettings() + `<h2>Info Book</h2>
    <p>Your own feed of photos and videos. No comments, followers or sharing. Your 👍 and 👎 stay on this phone and only change what this feed shows you. It refreshes itself through the day from ${(FEED && FEED.sources || []).length || 'about 180'} public sources. Sport is always left out.</p>
    <p>👍 / 👎 teach it which <b>sources</b> and <b>topics</b> you like. New sources get a short trial (“Trying”) so you can judge them; a source you give about four more 👎 than 👍 is dropped (you can bring it back below).</p>
    <p>▶️ Videos play by themselves (muted) when they’re on screen and pause when you scroll past. Tap the speaker on a video for sound; it stays on until you close Info Book.</p>
    ${PRIVATE_OK ? `<a class="btn pri" href="${MY_APP}">← Back to My App</a>
    <p>📌 <b>For You</b> cards come from My App on this phone and are mixed through All at random: cars, birthdays, calendar, to-dos, garden, pets, meals and recipes (your own recipe photos too), weather, UV and power (kWh), roads, deliveries, plus every board and hub. Your own things never leave this phone, and bills and money are always left out.</p>
    <p>🖼️ <b>My Photos</b>: ${PHOTO_INFO.all ? `${PHOTO_INFO.used} of the ${PHOTO_INFO.all} photos on My App’s Photos page${PHOTO_INFO.approved ? ' (the ones you tagged approved, feed, keep or favourite)' : ''}` : 'photos from My App’s Photos page'}. Receipts, warranties, documents, screenshots and anything tagged <b>nofeed</b> or <b>private</b> are left out. Tag photos <b>approved</b> or <b>feed</b> in My App to show only those. Read on this phone only.</p>
    ` : ''}
    <h2 style="margin-top:18px">Time of day</h2>
    <p>Mornings (5–11am) lean to news, what’s on and the election; 11am–7pm is the normal mix; from 7pm it winds down, and 9pm–3am leans hardest to cute animals, calm nature, lofi, cosy cooking, gardening and space, with less hard news and fewer loud trailers. Nothing is hidden, and your votes still count. Uses this phone’s clock.</p>
    <button class="ich${MOOD_OFF ? '' : ' on'}" id="moodt" aria-pressed="${!MOOD_OFF}">${MOOD_OFF ? 'Off: same mix all day' : '✓ On' + (MOODS[moodBand()][0] ? ' · now ' + MOODS[moodBand()][0] : ' · now the normal mix')}</button>
    ${PRIVATE_OK ? `<h2 style="margin-top:18px">From About you</h2>
    ${you || `<p>Answer questions in My App’s About you and your interests (music, shows, food, garden, dog, outdoors, books…) turn into cards here. Money, family and routine answers are never used.</p>`}
    ` : ''}
    <h2 style="margin-top:18px">Manage interests</h2>
    <p>Tap to switch an interest off or back on. Off means its sources and posts about it are hidden, and a chip goes when all its interests are off. No sport is ever included.</p>
    ${TOPICS.filter(t => INTERESTS.some(x => x.topic === t[0])).map(t => `<h4 class="sgh">${t[2]} ${esc(t[1])}</h4><div class="ichs">${INTERESTS.filter(x => x.topic === t[0]).map(x => `<button class="ich${INT_OFF[x.name] ? '' : ' on'}" data-int="${esc(x.name)}" aria-pressed="${!INT_OFF[x.name]}">${INT_OFF[x.name] ? '' : '✓ '}${esc(x.name)}${W.int(x.name) > 1.05 ? ' 👍' : W.int(x.name) < 0.95 ? ' 👎' : ''}</button>`).join('')}</div>`).join('')}
    <div class="row"><span>Your votes</span><span>${ups} 👍 · ${downs} 👎</span></div>
    ${TOPICS.filter(t => !['all', 'life', 'liked', 'photos', 'family'].includes(t[0]) && topicOn(t[0])).concat(YOU_CHIPS.map(id => TOPIC[id])).map(t => `<div class="row"><span>${t[2]} ${esc(t[1])}</span><span>${W.topic(t[0]) > 1.05 ? 'More' : W.topic(t[0]) < 0.95 ? 'Less' : 'Normal'}</span></div>`).join('')}
    <button class="btn" id="resetv">Clear my votes</button>
    <h2 style="margin-top:18px">Sources</h2>
    ${groups.map(g => `<h4 class="sgh">${g.t === 'you' ? '💭 About-you searches' : esc((TOPIC[g.t] || TOPIC.all)[2] + ' ' + (TOPIC[g.t] || TOPIC.all)[1])}</h4>` + g.l.map(row).join('')).join('')}
    <div class="row"><span>🌱 Northland garden calendar</span><span>monthly</span></div>
    <p>Every post shows its source at the top and links back to where it came from. Version ${APP_VERSION}.</p>
    <button class="btn" data-close>Close</button>`;
  $('#sheet').classList.add('on');
  famList();
}
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.remove('act'); el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }

/* ---- events ---- */
document.addEventListener('click', e => {
  const t = e.target;
  const c = t.closest('[data-tab]'); if (c) { tab = c.dataset.tab; ls.set('tab', tab); draw(); window.scrollTo({ top: 0 }); if (tab === 'family') famFresh(); return; }
  const v = t.closest('[data-vote]'); if (v) { vote(v, +v.dataset.vote); return; }
  const u = t.closest('[data-undo]'); if (u) { const id = u.dataset.undo; delete VOTES[id]; ls.set('votes', VOTES); const it = order.find(x => x.id === id); const card0 = u.closest('.card'); if (it && card0) { card0.outerHTML = it.topic === 'life' ? lifeCard(it) : card(it); fillPics(); watchVids(); } return; }
  const fb = t.closest('[data-fs]'); if (fb) { e.preventDefault(); vidFull(fb.closest('.media.vid')); return; }
  const sb = t.closest('[data-snd]'); if (sb) { e.preventDefault(); toggleSound(sb.closest('.media.vid')); return; }
  const p = t.closest('.media.vid'); if (p) { if (!p.classList.contains('playing') || curVid !== p) playVid(p, true); return; } // tap: play this one with sound
  const dm = t.closest('[data-dismiss]'); if (dm) { DISMISS[dm.dataset.dismiss] = Date.now(); ls.set('dismiss', DISMISS); const c0 = dm.closest('.card'); if (c0) { c0.style.transition = 'opacity .25s, transform .25s'; c0.style.opacity = 0; c0.style.transform = 'scale(.97)'; setTimeout(() => c0.remove(), 260); } toast('Hidden from Info Book'); return; }
  const mo = t.closest('[data-more]'); if (mo) { mo.classList.toggle('open'); return; }
  if (t.id === 'rf') { load(true); return; }
  if (t.id === 'st') { settings(); return; }
  if (t.dataset && t.dataset.ts) { setTextSize(t.dataset.ts); const y = $('#sheet').scrollTop; settings(); $('#sheet').scrollTop = y; toast('Text size: ' + t.textContent.replace('✓ ', '')); return; } // 1.8.7
  if (t.id === 'moodt') { MOOD_OFF = !MOOD_OFF; ls.set('moodOff', MOOD_OFF); const y = $('#sheet').scrollTop; settings(); $('#sheet').scrollTop = y; draw(); toast(MOOD_OFF ? 'Time of day: off' : 'Time of day: on'); return; }
  const ib = t.closest('[data-int]'); if (ib) { const n = ib.dataset.int; if (INT_OFF[n]) delete INT_OFF[n]; else INT_OFF[n] = 1; ls.set('intOff', INT_OFF); const y = $('#sheet').scrollTop; for (const i of (FEED && FEED.items) || []) delete i._ints; settings(); $('#sheet').scrollTop = y; draw(); toast((INT_OFF[n] ? 'Off: ' : 'On: ') + n); return; }
  const rv = t.closest('[data-revive]'); if (rv) { REVIVE[rv.dataset.revive] = Date.now(); ls.set('revive', REVIVE); settings(); draw(); toast('Brought back'); return; }
  if (t.id === 'resetv') { if (confirm('Clear all your 👍 and 👎?')) { VOTES = {}; ls.set('votes', VOTES); $('#sheet').classList.remove('on'); draw(); toast('Votes cleared'); } return; }
  if (t.id === 'sheet' || t.closest('[data-close]')) $('#sheet').classList.remove('on');
});
let lastBand = moodBand();
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; if (moodBand() !== lastBand) { lastBand = moodBand(); if (scrollY < 200) draw(); else moodLabel(); } /* e.g. opened again in the evening */ setupYou(); refreshYou(); loadPhotos(); if (FEED && Date.now() - (FEED._got || 0) > 20 * 60e3) { FEED._got = Date.now(); load(false); } });

window.addEventListener('storage', e => { if (e.key !== 'myFeedLife') return; const before = YOU.map(x => x.term).join('|'); setupYou(); if (YOU.map(x => x.term).join('|') !== before) refreshYou(); if ((tab === 'life' || !TOPIC[tab]) && scrollY < 200) draw(); }); // My App updated your items or About you
{ const cut = Date.now() - 30 * 864e5; for (const k in DISMISS) if (DISMISS[k] < cut) delete DISMISS[k]; ls.set('dismiss', DISMISS); }
noteSources();
noteSrcInts();
setupYou();
draw();
load(false);
famInit(); greet(); setTimeout(greet, 3000);
loadPhotos().then(() => { if (PHOTOS.length && scrollY < 200 && (tab === 'all' || tab === 'life' || tab === 'photos')) draw(); else chips(); });
setTimeout(refreshYou, 1200);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });

/* 1.8.5 no fuzzy pictures: when a picture is much smaller than the space it's shown in, show it at its own size, sharp,
   on a soft blurred copy of itself, instead of stretching it. */
document.addEventListener('load', e => {
  const im = e.target; if (!(im instanceof HTMLImageElement)) return;
  if (im.dataset.yt && im.naturalWidth > 0 && im.naturalWidth <= 120 && !im.dataset.f) { im.dataset.f = 1; im.src = 'https://i.ytimg.com/vi/' + im.dataset.yt + '/hqdefault.jpg'; return; }
  const box = im.closest('.media, .fph'); if (!box || box.classList.contains('vid') || !im.naturalWidth) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3), boxW = box.clientWidth || 400;
  if (im.naturalWidth * 1.6 < boxW * dpr) {
    box.classList.add('lowres'); box.style.setProperty('--lr', `url("${im.currentSrc || im.src}")`);
    im.style.width = Math.max(160, Math.min(boxW, Math.round(im.naturalWidth * 1.6 / dpr))) + 'px';
  }
}, true);

/* ---- 1.9.37 🎬 videos from more places, all playing in the card like YouTube does (muted until you tap the speaker, one at a
   time, paused when scrolled away, not started by themselves on Data Saver or a low battery): Reddit's own clips (v.redd.it,
   picture + sound tracks), Vimeo, TikTok, Facebook and Instagram videos (their official embed players), and plain MP4 links.
   Bigger: edge to edge on phones and wider on big screens; 9:16 for Shorts, TikTok and Reels; ⛶ goes full screen. ---- */
var VID_SAVE = !!(navigator.connection && navigator.connection.saveData);
try { navigator.getBattery && navigator.getBattery().then(b => { const f = () => { VID_SAVE = !!(navigator.connection && navigator.connection.saveData) || (!b.charging && b.level < 0.15); }; f(); b.addEventListener('levelchange', f); b.addEventListener('chargingchange', f); }); } catch (e) { }
function vidOf(i) {
  if (!i) return null; if (i.vk && i.vu) return { k: i.vk, u: i.vu, tall: !!i.vtall };
  const u = String(i.url || i.ext || ''); let m;
  if ((m = u.match(/vimeo\.com\/(?:channels\/[\w-]+\/|video\/)?(\d{6,12})(?:$|[/?#])/))) return { k: 'vimeo', u: m[1] };
  if ((m = u.match(/tiktok\.com\/@[\w.-]+\/video\/(\d{8,25})/))) return { k: 'tiktok', u: m[1], tall: true };
  if ((m = u.match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|tv)\/([\w-]{5,})/))) return { k: 'ig', u: m[2], tall: true };
  if (/facebook\.com\/(.+\/videos\/|watch\/?\?v=|reel\/|share\/v\/|share\/r\/)|fb\.watch\//.test(u)) return { k: 'fb', u, tall: /\/(reel|share\/r)\//.test(u) };
  if ((m = u.match(/^https:\/\/v\.redd\.it\/([a-z0-9]{8,20})\/?$/i))) return { k: 'reddit', u: m[1] };
  if (/^https:\/\/[^?#\s]+\.mp4(\?|$)/i.test(u)) return { k: 'mp4', u };
  return null;
}
function anyVidMedia(v, img, title) {
  return `<div class="media vid${v.tall ? ' tall' : ''}" data-vk="${esc(v.k)}" data-vu="${esc(v.u)}" role="button" tabindex="0" aria-label="Video: ${esc(title)}"><div class="vslot"></div><img class="vthumb" loading="lazy" referrerpolicy="no-referrer" src="${esc(img)}" alt=""><span class="play"><span></span></span>${v.k === 'ig' ? '' : `<button class="snd" data-snd aria-label="${SOUND ? 'Mute' : 'Turn sound on'}">${SOUND ? SPK.on : SPK.off}</button>`}<button class="fsb" data-fs aria-label="Full screen">⛶</button></div>`;
}
function vidFull(el) {
  if (!el) return; if (!PLAYERS.has(el) || curVid !== el) playVid(el, true);
  const v = el.querySelector('video'), go = () => { try { (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (e) { try { v && v.webkitEnterFullscreen && v.webkitEnterFullscreen(); } catch (x) { } } };
  if (document.fullscreenElement) document.exitFullscreen(); else go();
}
function otherPlayer(el, rec) {
  const k = el.dataset.vk, u = el.dataset.vu, slot = el.querySelector('.vslot'); let muted = true, state = -1;
  const mark = on => { state = on ? 1 : 2; el.classList.toggle('playing', !!on); };
  if (k === 'reddit' || k === 'mp4') {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.loop = true; v.preload = 'metadata'; v.poster = (el.querySelector('.vthumb') || {}).src || '';
    const RES = ['480', '360', '720', '270', '220']; let ri = 0, au = null;
    const vsrc = () => k === 'mp4' ? u : `https://v.redd.it/${u}/CMAF_${RES[ri]}.mp4`;
    v.src = vsrc(); v.onerror = () => { if (k === 'reddit' && ++ri < RES.length) { v.src = vsrc(); if (rec.want) v.play().catch(() => { }); } else { el.classList.add('verr'); mark(false); } };
    v.onloadedmetadata = () => { if (v.videoHeight > v.videoWidth * 1.15) el.classList.add('tall'); };
    v.onplaying = () => { mark(true); if (au && !muted) { au.currentTime = v.currentTime; au.play().catch(() => { }); } }; v.onpause = () => { mark(false); au && au.pause(); };
    v.onseeked = () => { if (au) au.currentTime = v.currentTime; };
    slot.appendChild(v);
    const audio = () => { if (k !== 'reddit' || au) return; au = new Audio(); au.preload = 'auto'; const A = ['CMAF_AUDIO_128', 'CMAF_AUDIO_64', 'DASH_AUDIO_128', 'DASH_audio']; let ai = 0; au.src = `https://v.redd.it/${u}/${A[0]}.mp4`; au.onerror = () => { if (++ai < A.length) au.src = `https://v.redd.it/${u}/${A[ai]}.mp4`; else { au = null; toast('This clip has no sound'); } }; };
    return { mute() { muted = true; v.muted = true; au && au.pause(); }, unMute() { muted = false; if (k === 'reddit') { audio(); if (au && !v.paused) { au.currentTime = v.currentTime; au.play().catch(() => { }); } } else v.muted = false; }, setVolume() { }, isMuted: () => muted,
      playVideo() { v.play().catch(() => { }); }, pauseVideo() { v.pause(); }, getPlayerState: () => v.paused ? (state === -1 ? 3 : 2) : 1, getDuration: () => v.duration || 0, seekTo(t) { v.currentTime = t; }, destroy() { v.pause(); v.removeAttribute('src'); v.load(); au && au.pause(); } };
  }
  // the platforms' own embed players (an iframe); Vimeo and TikTok can be told to play/pause/mute, Facebook is (re)loaded on play
  let f = null; const ifr = src => { f = document.createElement('iframe'); f.src = src; f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.allowFullscreen = true; f.onload = () => setTimeout(() => { if (rec.want && curVid === el && k !== 'fb') playVid(el); }, 400); f.referrerPolicy = 'strict-origin-when-cross-origin'; slot.innerHTML = ''; slot.appendChild(f); };
  const post = (msg, origin) => { try { f && f.contentWindow.postMessage(typeof msg === 'string' ? msg : JSON.stringify(msg), origin); } catch (e) { } };
  if (k === 'vimeo') { ifr(`https://player.vimeo.com/video/${u}?muted=1&playsinline=1&loop=1&dnt=1&title=0&byline=0&portrait=0`);
    const vm = (method, value) => post(value === undefined ? { method } : { method, value }, 'https://player.vimeo.com');
    return { mute() { muted = true; vm('setMuted', true); vm('setVolume', 0); }, unMute() { muted = false; vm('setMuted', false); vm('setVolume', 1); }, setVolume() { }, isMuted: () => muted, playVideo() { vm('play'); setTimeout(() => mark(true), 700); }, pauseVideo() { vm('pause'); mark(false); }, getPlayerState: () => state, getDuration: () => 0, seekTo() { }, destroy() { slot.innerHTML = ''; } }; }
  if (k === 'tiktok') { ifr(`https://www.tiktok.com/player/v1/${u}?autoplay=0&muted=1&loop=1&rel=0&description=0&music_info=0&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1`);
    const tt = type => { try { f && f.contentWindow.postMessage({ type, value: null, 'x-tiktok-player': true }, '*'); } catch (e) { } };
    return { mute() { muted = true; tt('mute'); }, unMute() { muted = false; tt('unMute'); }, setVolume() { }, isMuted: () => muted, playVideo() { tt('play'); setTimeout(() => mark(true), 700); }, pauseVideo() { tt('pause'); mark(false); }, getPlayerState: () => state, getDuration: () => 0, seekTo() { }, destroy() { slot.innerHTML = ''; } }; }
  if (k === 'ig') { ifr(`https://www.instagram.com/reel/${u}/embed/`); mark(true); // Instagram's embed has its own play button (no autoplay control)
    return { mute() { }, unMute() { }, setVolume() { }, isMuted: () => true, playVideo() { }, pauseVideo() { }, getPlayerState: () => 1, getDuration: () => 0, seekTo() { }, destroy() { slot.innerHTML = ''; } }; }
  // facebook
  const fbSrc = m => `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false&autoplay=true&mute=${m ? 'true' : 'false'}`;
  return { mute() { if (!muted) { muted = true; if (state === 1) ifr(fbSrc(true)); } }, unMute() { if (muted) { muted = false; ifr(fbSrc(false)); mark(true); } }, setVolume() { }, isMuted: () => muted,
    playVideo() { if (state !== 1) { ifr(fbSrc(muted)); setTimeout(() => mark(true), 900); } }, pauseVideo() { slot.innerHTML = ''; f = null; mark(false); }, getPlayerState: () => state, getDuration: () => 0, seekTo() { }, destroy() { slot.innerHTML = ''; } };
}

/* ---- 1.9.42 ☰ side menu: swipe in from the left edge (or tap ☰) – Videos & pictures (all), Videos only, Pictures only.
   Remembered on this phone; a chip under the topics shows it's on, with ✕ to go back to everything. Alerts, pinned
   specials (weather, power, birthdays, countdowns) and your own My App cards always show. ---- */
var MF_OPTS = [['all', '🎬🖼️', 'Videos & pictures'], ['vid', '🎬', 'Videos only'], ['pic', '🖼️', 'Pictures only']]; // 1.9.51 var, not const: draw() can run before this line (cached feed) – a const here crashed it
var MF = ls.get('mediaFilter', 'all'); if (!MF_OPTS.some(o => o[0] === MF)) MF = 'all';
const mfAlways = i => !!(i.pin || (i.x && !['hometip', 'vlog', 'watch', 'concert'].includes(i.x)) || /^(life|app|ph|you|date|cd|alert)[:-]/.test(String(i.id || '')) || i.topic === 'alerts');
function mfIsVid(i) { try { return !!(i.vid || (i.x === 'vlog' && i.h && i.h.vid) || (i.h && i.h.vid) || (i.img && vidOf(i)) || (i._share && (i._share.snap || {}).vid)); } catch (e) { return false; } }
/* 1.9.43 strict: Videos only = only video cards (from every video source: the feed's clips and trailers, vlogs, Reddit/Vimeo,
   family shares – unseen first, then ones you've already seen so it's never empty); Pictures only = only picture cards
   (no videos, no alerts, My App, birthdays, countdowns or text-only cards). Videos & pictures = the normal feed. */
const mfContent = i => !!i && !i.pin && i.topic !== 'life' && !/^(life|app|ph|you|date|cd|alert|bd)[:-]/.test(String(i.id || '')) && (!i.x || ['hometip', 'vlog', 'watch', 'concert'].includes(i.x)) && i.kind !== 'alert' && i.topic !== 'alerts';
const mfPic = i => !!(i.img || (i.photos && i.photos.length) || (i.h && i.h.img) || (i._share && ((i._share.snap || {}).img || (i._share.photos || []).length)));
function mfOk(i) { if (!i) return false; if (VOTES[i.id] && VOTES[i.id].v < 0) return false; const t = (i.t || '') + ' ' + (i.s || ''); if (SPORT.test(t) || unsafe(i)) return false; if (typeof toneW === 'function' && !toneW(i)) return false; if (i.src && weights().drop(i.src)) return false; if (OPTIN.has(i.topic) && !optedIn(i.topic)) return false; return true; }
function mfVideos(order) {
  const out = [], ids = new Set(), add = i => { if (!i || ids.has(i.id) || !mfContent(i) || !mfIsVid(i)) return; ids.add(i.id); out.push(i); };
  order.forEach(add); // what the feed already picked for them, in its order
  const seen = i => SEEN_BASE.has(i.id) || (SEEN[i.id] || 0) > 0;
  const vl = ((FEED && FEED.vlogs) || []).filter(v => v.vid && v.img && mfOk(v)).map(v => ({ id: v.id, x: 'vlog', h: v, topic: 'vlogs', t: v.t, at: v.at }));
  const fv = ((FEED && FEED.items) || []).filter(i => mfIsVid(i) && mfOk(i));
  const mine = fv.filter(i => topicOn(i.topic) && !intHidden(i)), other = fv.filter(i => !(topicOn(i.topic) && !intHidden(i)));
  const rest = (typeof rank === 'function' ? rank(mine) : mine).concat(typeof vlScore === 'function' ? vl.sort((a, b) => vlScore(b.h) - vlScore(a.h)) : vl, other.sort((a, b) => (b.at || 0) - (a.at || 0)));
  rest.filter(i => !seen(i)).forEach(add); rest.filter(seen).forEach(add); // unseen first, then already-seen ones
  return out;
}
function mediaFilter(order) {
  if (!MF_OPTS || !MF) return order; // 1.9.51 still starting up
  mfChip(); if (MF === 'all') return order;
  if (MF === 'vid') { try { ytApi(); } catch (e) { } setTimeout(() => { try { pickVid(); } catch (e) { } }, 900); setTimeout(() => { try { pickVid(); } catch (e) { } }, 2500); return mfVideos(order); }
  return order.filter(i => mfContent(i) && !mfIsVid(i) && mfPic(i));
}
function mfChip() {
  let c = document.getElementById('mfchip');
  if (!c) { c = document.createElement('div'); c.id = 'mfchip'; c.className = 'mfchip'; const n = document.getElementById('chips'); n && n.after(c); }
  const o = MF_OPTS.find(x => x[0] === MF); c.hidden = MF === 'all'; document.documentElement.classList.toggle('mf-only', MF !== 'all'); // 1.9.43 strict: no install/extra banners either
  c.innerHTML = MF === 'all' ? '' : `<button type="button" data-mfset="all" aria-label="Show videos and pictures">${o[1]} ${o[2]} <b>✕</b></button>`;
}
function mfSet(v) { MF = v; ls.set('mediaFilter', v); mfDrawer(false); try { draw(); scrollTo(0, 0); } catch (e) { } toast(MF_OPTS.find(x => x[0] === v)[2]); }
function mfDrawer(open) {
  let d = document.getElementById('mfdrawer');
  if (!d) {
    d = document.createElement('div'); d.id = 'mfdrawer'; d.className = 'mfdrawer';
    d.innerHTML = `<div class="mfscrim" data-mfclose></div><nav class="mfpanel" aria-label="Menu"><div class="mfhd"><b>Show me</b><button type="button" class="ib" data-mfclose aria-label="Close menu">✕</button></div><div class="mfopts"></div><p class="mfnote">Videos only and Pictures only show just those cards. Alerts still come as notifications.</p></nav>`;
    document.body.append(d);
  }
  d.querySelector('.mfopts').innerHTML = MF_OPTS.map(o => `<button type="button" class="mfopt${o[0] === MF ? ' on' : ''}" data-mfset="${o[0]}" role="menuitemradio" aria-checked="${o[0] === MF}"><span class="mfe">${o[1]}</span><span>${o[2]}</span>${o[0] === MF ? '<i>✓</i>' : ''}</button>`).join('');
  requestAnimationFrame(() => d.classList.toggle('on', !!open));
}
(function () {
  const bar = document.querySelector('header.top .bar'); if (bar && !document.getElementById('mfbtn')) { const b = document.createElement('button'); b.id = 'mfbtn'; b.className = 'ib mfbtn'; b.setAttribute('aria-label', 'Menu'); b.textContent = '☰'; bar.prepend(b); }
  document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    if (t.closest('#mfbtn')) { mfDrawer(true); return; }
    const sb = t.closest('[data-mfset]'); if (sb) { e.preventDefault(); mfSet(sb.dataset.mfset); return; }
    if (t.closest('[data-mfclose]')) mfDrawer(false);
  });
  let sx = null, sy = 0, mode = '';
  addEventListener('touchstart', e => { const p = e.touches[0], open = document.querySelector('#mfdrawer.on'); if (open) { sx = p.clientX; sy = p.clientY; mode = 'close'; } else if (p.clientX < 24 && !(e.target.closest && e.target.closest('.hscroll'))) { sx = p.clientX; sy = p.clientY; mode = 'open'; } else sx = null; }, { passive: true });
  addEventListener('touchmove', e => { if (sx == null) return; const p = e.touches[0], dx = p.clientX - sx, dy = Math.abs(p.clientY - sy);
    if (mode === 'open' && dx > 50 && dx > dy * 1.5) { sx = null; mfDrawer(true); } else if (mode === 'close' && dx < -50 && -dx > dy * 1.5) { sx = null; mfDrawer(false); } }, { passive: true });
  addEventListener('keydown', e => { if (e.key === 'Escape') mfDrawer(false); });
})();

/* 1.9.52 a picture on every card: if a card picture still hasn't loaded 3s after failing (the card's own retry/fill had its go), show the soft candy fallback instead of a gap or broken icon */
document.addEventListener('error', e => { const im = e.target; if (!(im instanceof HTMLImageElement) || !im.closest('#feed .card') || im.dataset.fb) return;
  setTimeout(() => { if (im.isConnected && !(im.complete && im.naturalWidth) && !im.dataset.fb) { im.dataset.fb = 1; im.dataset.broken = 1; im.src = 'img/card-fallback.svg'; } }, 3000); }, true);

/* ---- 1.9.56 ↔ swipe rows: every 6 cards or so the feed has a sideways row of cards on one theme (funny animals, videos,
   amazing facts, life hacks, coming up on TV, vlogs for you…). Their order follows what each person likes most (the rows
   whose cards rank highest in their own feed come first – sitcoms for Shane, cruises & vlogs for Sarah…). Cards are taken
   out of the main list so nothing shows twice; the ☰ filters apply; show-once, reactions and comments work as usual. ---- */
const ROWS = [
  ['tv', '📺 Coming up on TV', i => (i.topic === 'sitcoms' || i.x === 'watch') && !/election|midterm|politic|how to watch/i.test(i.t || '')],
  ['ani', '😂 Funny & cute animals', i => /aww|derp|eyebleach|dog|cat|pupp|animal|pets?-|bros|rarepup|startled|caturday|simonscat/i.test(i.src || '') || ['dogs', 'pets'].includes(i.topic)],
  ['vid', '🎬 Videos to watch', i => typeof mfIsVid === 'function' && mfIsVid(i)],
  ['facts', '🤯 Amazing & interesting', i => ['games', 'learn', 'science', 'scifi'].includes(i.topic) || /^fun-/.test(i.src || '')],
  ['hacks', '💡 Life hacks & making', i => ['diy', 'creative', 'craft'].includes(i.topic) || i.x === 'hometip'],
  ['food', '🍰 Food & treats', i => i.topic === 'food' || i.topic === 'gf'],
  ['out', '🌏 Travel & nature', i => ['travel', 'nature', 'outdoors', 'garden'].includes(i.topic)],
];
function carouselize(order) {
  if (order.length < 14) return order;
  const keep = i => i && !i.pin && i.topic !== 'life' && !i._share && (!i.x || ['vlog', 'watch', 'hometip'].includes(i.x)) && (i.img || (i.h && i.h.img) || i.vid);
  const used = new Set(), rows = [];
  const start = Math.min(6, order.length); // never take the first few cards
  for (const [k, title, test] of ROWS) {
    const its = []; let pos = 0;
    order.forEach((i, n) => { if (n < start || used.has(i.id) || its.length >= (k === 'tv' ? 30 : 8) || !keep(i) || !test(i)) return; its.push(i); pos += n; });
    if (k === 'tv') { const tvS = i => (i.src === 'nz-tvg2' ? 4 : 0) + (isNZc(i) ? 2 : 0) + (i.com || i.nzm ? 1 : 0); its.sort((a, b) => tvS(b) - tvS(a)); its.length = Math.min(its.length, 8); pos = its.length * 3; } // 1.9.60 TVNZ & Three first
    if (its.length >= 3) { its.forEach(i => used.add(i.id)); rows.push({ id: 'row-' + k, x: 'row', k, title, items: its, rank: (pos / its.length) * (k === 'tv' && topicOn('sitcoms') ? 0.25 : 1) }); } // sitcom fans: 📺 first
  }
  // vlogs picked for them (Sarah: cruises & family vlogs) that aren't already in the feed
  if (typeof MF === 'undefined' || MF !== 'pic') {
    const inFeed = new Set(order.map(i => i.id));
    const vl = ((FEED && FEED.vlogs) || []).filter(v => v.vid && v.img && !inFeed.has(v.id) && !SEEN_BASE.has(v.id) && !(VOTES[v.id] && VOTES[v.id].v < 0) && !unsafe(v) && !SPORT.test(v.t))
      .map(v => ({ v, sc: typeof vlScore === 'function' ? vlScore(v) : 1 })).sort((a, b) => b.sc - a.sc).slice(0, 6).map(x => ({ id: x.v.id, x: 'vlog', h: x.v, topic: 'vlogs', t: x.v.t }));
    if (vl.length >= 3) rows.push({ id: 'row-vlog', x: 'row', k: 'vlog', title: '🎥 Vlogs ' + forMe(), items: vl, rank: (ls.get('vlTags', []).length ? 8 : 60) });
  }
  if (!rows.length) return order;
  rows.sort((a, b) => a.rank - b.rank);
  const main = order.filter(i => !used.has(i.id)), out = []; let r = 0, since = 0;
  main.forEach((i, n) => { out.push(i); if (!i.pin) since++; if (since >= 6 + (r % 3) && r < rows.length && n >= 4) { out.push(rows[r++]); since = 0; } });
  while (r < rows.length && r < 2) out.push(rows[r++]);
  return out;
}
function rowCard(row) {
  return `<section class="hrow" data-row="${esc(row.k)}" aria-label="${esc(row.title)}"><div class="hrhd"><h2>${esc(row.title)}</h2><span class="hrhint" aria-hidden="true">Swipe ›</span></div>
  <div class="hscroll">${row.items.map(i => card(i)).join('')}</div>
  <div class="hdots" aria-hidden="true">${row.items.map((_, n) => `<i${n ? '' : ' class="on"'}></i>`).join('')}</div></section>`;
}
const cardRow = window.card;
window.card = function (i) { if (i && i.x === 'row') return rowCard(i); return cardRow(i); };
document.addEventListener('scroll', e => { const h = e.target; if (!h || !h.classList || !h.classList.contains('hscroll')) return;
  const cs = [...h.children], mid = h.scrollLeft + h.clientWidth / 2; let best = 0, bd = 1e9; cs.forEach((c, n) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = n; } });
  const dots = h.parentNode.querySelectorAll('.hdots i'); dots.forEach((d, n) => d.classList.toggle('on', n === best)); h.parentNode.classList.add('swiped');
  if (typeof pickVid === 'function') { clearTimeout(h.__pv); h.__pv = setTimeout(pickVid, 150); } }, true);
