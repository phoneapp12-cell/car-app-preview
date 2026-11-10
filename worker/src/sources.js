import { GEARTH, GSV } from './mapsfun.js';
/* My Feed sources. Free public feeds only, no API keys (NASA's public DEMO_KEY is used for APOD, with a page fallback).
   topic: gf | sitcoms | garden | music | scifi | nz | events | dogs | nature | tech | diy | science | travel | food | fitness | selling | creative | culture | learn | games | collect | outdoors | cars
   kinds: rss (RSS/Atom), reddit, yt (YouTube channel), tvmaze, apod, inat (iNaturalist JSON), page (a listing page + og:image of each article) */
const pg = (id, topic, name, url, link, extra = {}) => ({ id, topic, kind: 'page', name, url, link, ...extra });
const yt = (id, topic, name, ch, extra = {}) => ({ id, topic, kind: 'yt', name, ch, ...extra });
const rd = (id, topic, sub, extra = {}) => ({ id, topic, kind: 'reddit', name: 'r/' + sub, url: `https://www.reddit.com/r/${sub}/top/.rss?t=day`, ...extra });
const rss = (id, topic, name, url, extra = {}) => ({ id, topic, kind: 'rss', name, url, og: true, ...extra }); // og: if a post has no picture, use its page's og:image

// no esports or competitive play, no gore or adults-only games (on the video, board and fantasy games sources)
const GAME_NOT = /\besports?\b|tournament|championship|\bleague\b|ranked|pro player|world finals|\bgore\b|gory|bloody|blood ?bath|dismember|decapitat|mutilat|torture|\bR18\b|\bR16\b|rated m\b|mature 17|adults? only|horror|nsfw|deal\b|deals\b|% off|sale\b|discount|black friday/i;
// 1.9.0 🌈 Drag & LGBTQ+ (off unless picked): strict family-safe filter on top of the usual nudity filter
const HP_NOT = /\b(nsfw|nude|naked|sex\w*|lawsuit|court|transphob\w*|controvers\w*|boycott|died|dies|death of|obituary|price|sale|deal|discount|\$\d)/i;
const MO_NOT = /\b(died|dead|dying|disease|virus|oe\b|parasit(e|ised)\b.*help needed|kill\w*)\b/i;
const ND_NOT = /\b(cures?|cured|curing|miracle|recover(ed|y)? from autism|revers(e|ing) autism|vaccin\w*|anti-?vax\w*|chelation|\bmms\b|bleach|\baba\b|applied behaviou?r analysis|detox\w*|tragic|tragedy|died|dies|death|killed|murder\w*|abuse[ds]?|suicid\w*|neglect\w*|lawsuit|court|menopaus\w*|perimenopaus\w*|sex|sexual|webinar|live event|podcast #|epidemic|crisis|nsfw|nude|naked|heartbreak\w*)\b/i;
const ND_KIDS = /\b(child|children|kids?|parent\w*|teens?|tweens?|school\w*|kindy|preschool|toddlers?|son|daughter|famil(y|ies)|wh[aā]nau|tamariki|rangatahi|sensory|meltdowns?|routines?|homework|sleep|siblings?|holidays?|play\w*|big feelings|calm\w*)\b/i;
const PETS_NOT = /\b(died|dies|dead|death|passed away|passing|rip|rest in peace|rainbow bridge|cancer|tumou?rs?|abuse[ds]?|abusive|neglect\w*|cruel\w*|injur\w*|hurt|wounds?|wounded|bleed\w*|blood|surgery|operation|euthan\w*|put down|starv\w*|abandon\w*|dumped|hit by|attack\w*|mauled|sick|illness|dying|lost (my|our|him|her)|missing|grief|griev\w*|sad|crying|tears|rescued? from|saved from|emaciated|mange|amputat\w*|vet bills?|gofundme|fundrais\w*|donat\w*|appeal|hoard\w*|seized|prosecut\w*|court|fight\w*|snake|spider|nsfw|nude|naked|heartbreak\w*|heart-?wrenching|without (eyes|legs|a leg|paws)|blind|disabled|paraly[sz]\w*|give (him|her|them) up|giving up|surrender\w*|shelter dog|euthanasia|last days?|forever home|adopt\w*)\b/i;
const RAINBOW_NOT = /\b(sex|sexy|sexual|hook ?ups?|grindr|kink\w*|fetish\w*|nude|naked|nudity|porn\w*|onlyfans|bdsm|leather (bar|night)|underwear|jockstrap|thirst\w*|strip(per|tease)?|erotic\w*|nsfw|explicit|uncensored|r18|adults? only|18\+|bathhouse|sauna|chemsex|drugs?|hiv|prep|std|sti)\b/i;
// 1.9.0 🤝 Social work & community (NZ): informative, no money / budget stories
const SOCIAL_NOT = /\$\s?\d|\b(budget|benefit rates?|wages?|salar(y|ies)|pay (rise|equity|claim)|tax|funding cuts?|cost of living|murder|homicide|stabbing|sexual|abuse case|court case|sentenced|jailed|charges?|charged|police|fire|crash|died|death)\b/i;
const FUN_NOT = /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i;
const TAROT_NOT = /\b(the )?(star|lovers|world|sun|judg(e)?ment|devil|temptation)\b|nude|naked|nsfw|erotic|sensual|sexy|sex|lust|boudoir|witch ?craft spell|curse|hex|death spell|horror|demon|satan|occult ritual|blood/i;
const EF_FEEDS = ['https://www.eventfinda.co.nz/feed/events/whangarei/whatson/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/northland/whatson/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/northland/lifestyle/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/auckland/lifestyle/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/auckland/whatson/upcoming.rss']; // Eventfinda RSS (its search pages refuse Cloudflare)
// 1.9.34 🏡 home & time-saving tips: practical how-tos, never shopping/sales/reviews/money, house tours or showcase posts
const HT_WANT = /\b(clean\w*|declutter\w*|clutter|organi[sz]\w*|tid(y|ying|ier)|storage|store|laundry|stains?|wash\w*|pantry|fridge|freezer|chores?|routines?|meal[- ]?prep|meal[- ]plan\w*|lunchbox\w*|time[- ]sav\w*|speed|quick|shortcuts?|hacks?|tricks?|tips?|how to|ways to|toss|ditch|mistakes?|habits?|smell\w*|odou?r\w*|dust\w*|vacuum\w*|mop\w*|dishwasher|oven|microwave|toaster|kettle|shower|toilet|grout|mould|mold|linen|towels?|wardrobe|closet|drawer)\b/i;
/* 1.9.79 food must be buyable in NZ – drop US/UK/overseas chains & products */
export const NON_NZ_FOOD = /\b(walmart|wal-?mart|trader joe'?s|traderjoes|kroger|aldi\b|tesco|asda|sainsbury'?s?|waitrose|lidl|costco\s*(usa?|us|america)|sam'?s club|target(?!\s*(nz|new zealand))|whole foods|heb\b|publix|meijer|wegmans|shoprite|food lion|piggly|dollar general|dollar tree|cvs\b|walgreens|rite aid|best buy(?!\s*nz)|home depot|lowe'?s|ikea(?!\s*(nz|new zealand))|usd\b|\$\d+\.\d{2}\b(?!.*nz)|us department of|usda\b|american grocery|us supermarket)\b/i;
const HT_NOT = /\$|%|\b(sale|sales|deals?|discount\w*|price[sd]?|cheap\w*|bargain|buy\w*|bought|shop\w*|amazon|ikea|target|walmart|costco|home depot|lowe'?s|kmart|bunnings|pottery barn|wayfair|review\w*|tested|we tried|i tried|rated|best .* (to buy|on amazon)|editor[- ]approved|gifts?|giveaway|win\b|competition|sponsored|affiliate|money|budget\w*|saving money|save money|tax|bills?|mortgage|rent|renovat\w*|makeover|house tour|home tour|tour of|before (and|&) after|redo|reveal|look at my|my (new )?(house|home|kitchen|bathroom)|designers? (cringe|hate)|celebrit\w*|printables?|calendars?|subscribe|podcast|weight loss|diet|seal spotlight|hair|dye|beauty|makeup|skin ?care|of the past|history|fashion|outfits?|crafter|items that|created my|i put|transforms?|turns? (an? |old )|makes? a cute|covers a)\b/i;
export const SOURCES_BASE = [
  // Sitcoms first
  { id: 'nz-tvg2', topic: 'sitcoms', kind: 'epg', name: 'On NZ TV tonight (TVNZ & Three)', nz: 1, urls: ['https://raw.githubusercontent.com/matthuisman/i.mjh.nz/master/nz/epg.xml.gz', 'https://cdn.jsdelivr.net/gh/matthuisman/i.mjh.nz@master/nz/epg.xml.gz'], gzBytes: 560000, max: 14 },
  { id: 'tvm-web', topic: 'sitcoms', kind: 'tvmaze', name: 'New on streaming', path: 'schedule/web', days: [-1, 0, 1] },
  { id: 'tvm-prem', topic: 'sitcoms', kind: 'tvmaze', name: 'Coming soon', path: 'schedule/web', days: [2, 3, 4, 5, 6, 7], premieresOnly: true },
  { id: 'tvm-us', topic: 'sitcoms', kind: 'tvmaze', name: 'New episodes (US TV)', path: 'schedule', country: 'US', days: [-1, 0], max: 4 },
  { id: 'tvm-nz', topic: 'sitcoms', kind: 'tvmaze', name: 'On NZ TV', path: 'schedule', country: 'NZ', days: [0, 1], anyGenre: false },
  yt('yt-netflix', 'sitcoms', 'Netflix', 'UCWOA1ZGywLbqmigxE4Qlvuw', { want: /trailer|teaser|season|comedy|official|clip/i }),
  yt('yt-cc', 'sitcoms', 'Comedy Central', 'UCUsN5ZwHx2kILm84-jPDeXw', { want: /clip|best of|funny|moments|cold open|highlights|scene|trailer|teaser|season/i, max: 5 }),
  yt('yt-nbc', 'sitcoms', 'NBC', 'UCccjdJEay2hpb5scz61zY6Q', { want: /clip|best of|funny|moments|cold open|highlights|scene|trailer|teaser|the office|parks|brooklyn|friends|ghosts|snl/i, max: 5 }),
  yt('yt-fox', 'sitcoms', 'FOX', 'UCDiPds0v60wueil5B8w3fPQ', { want: /clip|best of|funny|moments|cold open|highlights|scene|trailer|teaser|simpsons|family guy|bob'?s burgers/i, max: 4 }),
  yt('yt-prime', 'sitcoms', 'Prime Video', 'UCQJWtTnAHhEG5w4uN0udnUQ', { want: /trailer|teaser|season|official|clip/i }),
  yt('yt-neon', 'sitcoms', 'Neon NZ', 'UCLx4I_7Mi5XyQbsovZcsgiQ', { want: /clip|trailer|comedy|funny|series|season|best|teaser/i, max: 4 }),
  rss('stuff-stream', 'sitcoms', 'Stuff Culture', 'https://www.stuff.co.nz/rss', { want: /netflix|neon|tvnz\+?|prime video|disney\+|sitcom|comedy|series|season|streaming|what to watch|trailer/i }),
  rd('rd-sitcoms', 'sitcoms', 'sitcoms', { imagesOnly: true }),
  rd('rd-tv', 'sitcoms', 'television', { imagesOnly: true, want: /trailer|teaser|first look|season|renewed|premiere|comedy|sitcom/i }),
  rd('rd-trailers', 'sitcoms', 'trailers', { imagesOnly: true, want: /comedy|sitcom|season|series|netflix|prime|apple tv|hbo|hulu|peacock|fx/i }),
  rss('decider', 'sitcoms', 'Decider', 'https://decider.com/feed/', { notWant: /election|midterm|debate|politic|trump|vote|how to watch/i, want: /comedy|sitcom|series|season|stream|netflix|hulu|prime|max|peacock|apple tv|watch|premiere|renew|trailer|episode/i }),
  rss('tvline', 'sitcoms', 'TVLine', 'https://tvline.com/feed/', { notWant: /election|midterm|debate|politic|trump|vote|how to watch/i, want: /comedy|sitcom|renew|season|premiere|trailer|first look|series|cast|revival|reboot/i }),
  rss('denofgeek-tv', 'sitcoms', 'Den of Geek', 'https://www.denofgeek.com/feed/', { notWant: /election|midterm|debate|politic|trump|vote|how to watch/i, want: /comedy|sitcom|tv|series|season|episode|streaming/i }),
  // Gardening
  yt('yt-gardenau', 'garden', 'Gardening Australia', 'UCzzsltdnAgTMSlPOvjko_Dw'),
  yt('yt-epic', 'garden', 'Epic Gardening', 'UCSbyncU597LMwb3HhnAI_4w'),
  rd('rd-gardening', 'garden', 'gardening', { imagesOnly: true }),
  rd('rd-veg', 'garden', 'vegetablegardening', { imagesOnly: true }),
  rd('rd-nzgarden', 'garden', 'NZGardening', { imagesOnly: true, url: 'https://www.reddit.com/r/NZGardening/top/.rss?t=week' }),
  rss('kings-sow', 'garden', 'Kings Seeds (NZ)', 'https://www.kingsseeds.co.nz/blogs/sowing-and-growing.atom'),
  rss('kings-veg', 'garden', 'Kings Seeds vegetables', 'https://www.kingsseeds.co.nz/blogs/vegetables.atom'),
  rss('kings-flowers', 'garden', 'Kings Seeds flowers & herbs', 'https://www.kingsseeds.co.nz/blogs/flowers-herbs.atom'),
  pg('yates', 'garden', 'Yates NZ', 'https://www.yates.co.nz/ideas-plans/project-guides-articles/popular/', /\/ideas-plans\/project-guides-articles\/all\/[a-z0-9-]+\//),
  rss('gw', 'garden', 'Gardeners’ World', 'https://www.gardenersworld.com/feed/'),
  // Music
  rss('nme', 'music', 'NME', 'https://www.nme.com/news/music/feed'),
  rss('rs-music', 'music', 'Rolling Stone', 'https://www.rollingstone.com/music/music-news/feed/'),
  rd('rd-suno', 'music', 'SunoAI', { url: 'https://www.reddit.com/r/SunoAI/top/.rss?t=week', tag: 'AI music' }),
  yt('yt-suno', 'music', 'Suno', 'UCRYjCM9IQm5cPCws3fczZzA', { tag: 'AI music' }),
  rss('pitchfork', 'music', 'Pitchfork', 'https://pitchfork.com/feed/feed-news/rss'),
  rss('stereogum', 'music', 'Stereogum', 'https://www.stereogum.com/feed/'),
  rss('consequence', 'music', 'Consequence', 'https://consequence.net/feed/'),
  rss('utr', 'music', 'Undertheradar (NZ music)', 'https://feeds.feedburner.com/UndertheradarconzNews', { og: true }),
  // Sci-fi and space
  { id: 'apod', topic: 'scifi', kind: 'apod', name: 'NASA Astronomy Picture of the Day' },
  rss('nasa-iotd', 'scifi', 'NASA Image of the Day', 'https://www.nasa.gov/feeds/iotd-feed/'),
  rss('space', 'scifi', 'Space.com', 'https://www.space.com/feeds/all'),
  rd('rd-scifi', 'scifi', 'scifi', { imagesOnly: true }),
  rd('rd-scifiart', 'scifi', 'ImaginaryTechnology', { imagesOnly: true, name: 'r/ImaginaryTechnology (sci-fi art)' }),
  rd('rd-spaceporn', 'scifi', 'spaceporn', { imagesOnly: true, name: 'Reddit · space photos' }),
  rd('rd-scifitrailers', 'scifi', 'trailers', { imagesOnly: true, want: /sci-?fi|space|alien|star|galaxy|robot|future|planet|trek|wars|dune|doctor who|apocalypse|cyber|mars|moon|invasion|time travel/i }),
  yt('yt-rt', 'scifi', 'Rotten Tomatoes Trailers', 'UCi8e0iOVk1fEOogdfu4YgfA', { want: /sci-?fi|space|alien|star|galaxy|robot|future|time|planet|trek|wars|dune|marvel|dc|dr\.? who|doctor who|apocalypse|cyber|mars|moon|invasion/i }),
  yt('yt-nasa', 'scifi', 'NASA', 'UCLA_DiR1FfKNvjuUpBHmylQ'),
  rss('universetoday', 'scifi', 'Universe Today', 'https://www.universetoday.com/feed/'),
  rss('earthsky', 'scifi', 'EarthSky (astronomy)', 'https://earthsky.org/feed/'),
  rss('esa', 'scifi', 'ESA Space Science', 'https://www.esa.int/rssfeed/Our_Activities/Space_Science', { og: true }),
  rd('rd-astrophoto', 'scifi', 'astrophotography', { imagesOnly: true }),
  // Around NZ
  rss('rnz', 'nz', 'RNZ', 'https://www.rnz.co.nz/rss/national.xml', { og: true, max: 4, notWant: /crash|fatal|killed|murder|homicide|stabbing|shooting|court|sentenced|jailed|charged|accused|trial|arrested|ram raid|burglar|robbery|assault|election|parliament|politic|labour|national party|minister|campaign|polls?\b/i }),
  rss('rnz-maori', 'nz', 'RNZ Te Manu Korihi', 'https://www.rnz.co.nz/rss/te-manu-korihi.xml', { og: true }),
  rss('stuff', 'nz', 'Stuff', 'https://www.stuff.co.nz/rss', { max: 4, notWant: /netflix|neon|tvnz\+|prime video|disney\+|trailer|crash|fatal|killed|murder|homicide|stabbing|shooting|court|sentenced|jailed|charged|accused|trial|arrested|ram raid|burglar|robbery|assault|election|parliament|politic|labour|national party|minister|campaign|polls?\b/i }),
  rss('events', 'events', 'Eventfinda Whangārei', 'https://www.eventfinda.co.nz/feed/events/whangarei/whatson/upcoming.rss', { event: true }),
  { id: 'events-wgr-more', topic: 'events', kind: 'efrss', name: 'Eventfinda Whangārei (gigs, exhibitions, classes)', event: true, evDays: 30, urls: ['https://www.eventfinda.co.nz/feed/events/whangarei/concerts-gig-guide/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/whangarei/exhibitions/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/whangarei/workshops-conferences-classes/upcoming.rss'], max: 8 }, // 1.9.6 more Whangārei events for the 'Event near you' promos
  rss('events-nl', 'events', 'Eventfinda Northland', 'https://www.eventfinda.co.nz/feed/events/northland/whatson/upcoming.rss', { event: true }),
  rd('rd-nz', 'nz', 'newzealand', { imagesOnly: true }),
  rd('rd-whangarei', 'nz', 'whangarei', { url: 'https://www.reddit.com/r/whangarei/top/.rss?t=month' }),
  rss('advocate', 'nz', 'Northern Advocate', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/news/?outputType=xml&_website=northern-advocate', { max: 6, nz: 1, notWant: /\/sport\/|crash|fatal|killed|murder|homicide|stabbing|shooting|court|sentenced|jailed|charged|accused|trial|arrested|ram raid|burglar|robbery|assault|election|parliament|politic|labour|national party|minister|campaign/i }),
  rss('nzh', 'nz', 'NZ Herald', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/?outputType=xml', { max: 4, notWant: /\/sport\/|crash|fatal|killed|murder|homicide|stabbing|shooting|court|sentenced|jailed|charged|accused|trial|arrested|ram raid|burglar|robbery|assault|election|parliament|politic|labour|national party|minister|campaign|polls?\b/i }),
  rss('1news', 'nz', '1News', 'https://www.1news.co.nz/arc/outboundfeeds/rss/?outputType=xml', { max: 4, notWant: /\/sport\/|crash|fatal|killed|murder|homicide|stabbing|shooting|court|sentenced|jailed|charged|accused|trial|arrested|ram raid|burglar|robbery|assault|election|parliament|politic|labour|national party|minister|campaign|polls?\b/i }),
  rss('newsroom', 'nz', 'Newsroom', 'https://newsroom.co.nz/feed/', { max: 3, notWant: /crash|fatal|killed|murder|homicide|stabbing|shooting|court|sentenced|jailed|charged|accused|trial|arrested|election|parliament|politic|labour|national party|minister|campaign|polls?\b/i }),
  pg('nzgeo', 'nz', 'NZ Geographic', 'https://www.nzgeo.com/stories/', /https:\/\/www\.nzgeo\.com\/stories\/[a-z0-9-]+\//),
  // NZ events and fireworks
  rss('events-nz', 'events', 'Eventfinda NZ', 'https://www.eventfinda.co.nz/feed/events/new-zealand/whatson/upcoming.rss', { event: true }),
  rss('events-akl', 'events', 'Eventfinda Auckland', 'https://www.eventfinda.co.nz/feed/events/auckland/whatson/upcoming.rss', { event: true, want: /fireworks|guy fawkes|concert|festival|comedy|market|show|music|garden/i }),
  // Dogs (for Zeus)
  rd('rd-dogpics', 'dogs', 'dogpictures', { imagesOnly: true }),
  rd('rd-rarepuppers', 'dogs', 'rarepuppers', { imagesOnly: true, mood: 'calm' }),
  yt('yt-zak', 'dogs', 'Zak George', 'UCZzFRKsgVMhGTxffpzgTJlQ'),
  yt('yt-dodo', 'dogs', 'The Dodo', 'UCINb0wqPz-A0dV9nARjJlOQ', { want: /dog|pup|puppy|pit ?bull|husky|retriever|shepherd|labrador/i }),
  rss('akc', 'dogs', 'American Kennel Club', 'https://www.akc.org/expert-advice/feed/'),
  rd('rd-puppies', 'dogs', 'puppies', { imagesOnly: true }),
  // Nature and wildlife
  rd('rd-earth', 'nature', 'EarthPorn', { imagesOnly: true, name: 'Reddit · landscapes' }),
  rd('rd-wildlife', 'nature', 'wildlifephotography', { imagesOnly: true }),
  rd('rd-birds', 'nature', 'birding', { imagesOnly: true }),
  yt('yt-bbcearth', 'nature', 'BBC Earth', 'UCwmZiChSryoWQCZMIQezgTg'),
  yt('yt-natgeo', 'nature', 'National Geographic', 'UCpVm7bg6pXKo1Pr6k5kxG9A'),
  rss('doc', 'nature', 'DOC (Department of Conservation)', 'https://www.doc.govt.nz/news/rss-feed-to-govtnz/', { og: true, max: 5, nz: 1, mood: 'calm' }),
  { id: 'inat-nz', topic: 'nature', kind: 'inat', name: 'iNaturalist NZ', url: 'https://api.inaturalist.org/v1/observations?place_id=6803&photos=true&quality_grade=research&popular=true&order_by=votes&per_page=30' },
  rd('rd-birdphoto', 'nature', 'BirdPhotography', { imagesOnly: true }),
  // AI and tech
  rss('verge', 'tech', 'The Verge', 'https://www.theverge.com/rss/index.xml'),
  rss('ars', 'tech', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index'),
  // DIY
  rss('hackaday', 'diy', 'Hackaday', 'https://hackaday.com/blog/feed/'),
  rd('rd-diy', 'diy', 'DIY', { imagesOnly: true, url: 'https://www.reddit.com/r/DIY/top/.rss?t=week' }),
  rd('rd-woodworking', 'diy', 'woodworking', { imagesOnly: true }),
  // Science
  rss('sciencealert', 'science', 'ScienceAlert', 'https://www.sciencealert.com/feed', { max: 3 }),
  rss('physorg', 'science', 'Phys.org', 'https://phys.org/rss-feed/', { max: 2 }),
  rss('nasa-earth', 'science', 'NASA Earth Observatory', 'https://earthobservatory.nasa.gov/feeds/image-of-the-day.rss'),
  // Travel
  rss('atlas', 'travel', 'Atlas Obscura', 'https://www.atlasobscura.com/feeds/latest'),
  rss('nzh-travel', 'travel', 'NZ Herald Travel', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/travel/?outputType=xml'),
  rd('rd-travel', 'travel', 'travel', { imagesOnly: true }),
  
  // Recipes and food (gluten-free first)
  rss('gfshoestring', 'food', 'Gluten Free on a Shoestring', 'https://glutenfreeonashoestring.com/feed/', { tag: 'Gluten-free', until: 1 }), // 1.9.79 US – off (not local)
  rss('recipetin', 'food', 'RecipeTin Eats', 'https://www.recipetineats.com/feed/', { until: 1 }), // 1.9.79 AU blog often US-shop – off; NZ recipes preferred
  rss('kings-food', 'food', 'Kings Seeds recipes', 'https://www.kingsseeds.co.nz/blogs/recipes-food.atom'),
  rd('rd-glutenfree', 'food', 'glutenfree', { imagesOnly: true, tag: 'Gluten-free' }),
  rd('rd-food', 'food', 'FoodPorn', { imagesOnly: true, name: 'Reddit · food photos', until: 1 }), // 1.9.79 global, not local NZ shopping
  /* 1.5.0: Shane's interests list (simplicable.com/life/interests + cooking, exercise, weights, selling). No sport.
     int: the interests each source serves (My Feed lets him switch interests off in ⚙️). max: fewer posts per source. */
  // Food and cooking (folds into Food)
  yt('yt-weissman', 'food', 'Joshua Weissman', 'UChBEbMKI1eCcejTtmI32UEw', { int: ['Cooking', 'Cuisine'], max: 4, until: 1 }), // 1.9.79 US
  yt('yt-babish', 'food', 'Babish Culinary Universe', 'UCJHA_jMfCvEnv-3kRjTCQXw', { int: ['Cooking', 'Cuisine'], max: 4, until: 1 }), // 1.9.79 US
  rss('minimalistbaker', 'food', 'Minimalist Baker (lots GF)', 'https://minimalistbaker.com/feed/', { int: ['Cooking', 'Baking'], max: 5, until: 1 }), // 1.9.79 US
  rd('rd-castiron', 'food', 'castiron', { imagesOnly: true, int: ['Cooking'], max: 5 }),
  rd('rd-gfbaking', 'food', 'glutenfreebaking', { imagesOnly: true, url: 'https://www.reddit.com/r/glutenfreebaking/top/.rss?t=week', int: ['Baking'], tag: 'Gluten-free', max: 5 }),
  // Fitness and weights
  yt('yt-nippard', 'fitness', 'Jeff Nippard', 'UC68TLK0mAEzUyHx5x5k-S1Q', { int: ['Weights'], max: 4 }),
  yt('yt-ethier', 'fitness', 'Jeremy Ethier', 'UCERm5yFZ1SptUEU4wZ2vJvw', { int: ['Weights', 'Exercise'], max: 4 }),
  yt('yt-madfit', 'fitness', 'MadFit (home workouts)', 'UCpQ34afVgk8cRQBjSJ1xuJQ', { int: ['Exercise', 'Fitness'], max: 4 }),
  yt('yt-fitblender', 'fitness', 'Fitness Blender', 'UCiP6wD_tYlYLYh3agzbByWQ', { int: ['Exercise', 'Fitness'], max: 4 }),
  yt('yt-adriene', 'fitness', 'Yoga With Adriene', 'UCFKE7WVJfvaHW5q283SxchA', { int: ['Yoga', 'Meditation', 'Wellness'], max: 4 }),
  rss('nerdfitness', 'fitness', 'Nerd Fitness', 'https://www.nerdfitness.com/blog/feed/', { int: ['Fitness', 'Weights', 'Exercise', 'Self-Improvement'], max: 5 }),
  rss('mindful', 'fitness', 'Mindful', 'https://www.mindful.org/feed/', { int: ['Meditation', 'Wellness', 'Health'], max: 4 }),
  rd('rd-homegym', 'fitness', 'homegym', { imagesOnly: true, url: 'https://www.reddit.com/r/homegym/top/.rss?t=week', int: ['Weights', 'Exercise'], max: 5 }),
  // Selling and side hustles (reselling, flipping, decluttering)
  rss('fmf', 'selling', 'Flea Market Flipper', 'https://fleamarketflipper.com/feed/', { int: ['Selling', 'Entrepreneurship'], max: 5 }),
  yt('yt-fmf', 'selling', 'Flea Market Flipper', 'UCPuSvQcp6811Ek8UftREZCQ', { int: ['Selling'], max: 4 }),
  yt('yt-ralli', 'selling', 'Ralli Roots (reselling)', 'UCRvyCd-JyXV_W6zwPpMgWTg', { int: ['Selling', 'Shopping'], max: 4 }),
  yt('yt-hairytornado', 'selling', 'Hairy Tornado (flipping)', 'UCMwfatunsnAfRqaQBDD1uUw', { int: ['Selling', 'Collecting'], max: 4 }),
  rd('rd-flipping', 'selling', 'Flipping', { imagesOnly: true, url: 'https://www.reddit.com/r/Flipping/top/.rss?t=week', int: ['Selling'], max: 5 }),
  rd('rd-thrift', 'selling', 'ThriftStoreHauls', { imagesOnly: true, int: ['Selling', 'Shopping', 'Collecting', 'Simple Living'], max: 5 }),
  rss('entrepreneur', 'selling', 'Entrepreneur', 'https://www.entrepreneur.com/latest.rss', { int: ['Entrepreneurship', 'Business'], want: /side hustle|resell|reselling|flip|sell(ing)? (online|on)|small business|e-?commerce|etsy|ebay|marketplace|start(ing)? a business|online store|garage sale|thrift/i, max: 4 }),
  // Creative and crafts
  rss('colossal', 'creative', 'Colossal (art & craft)', 'https://www.thisiscolossal.com/feed/', { int: ['Art', 'Crafts', 'Creative Pursuits'], max: 6, mood: 'calm' }),
  rss('designmilk', 'creative', 'Design Milk', 'https://design-milk.com/feed/', { int: ['Design', 'Interior Design', 'Fashion'], max: 5 }),
  rss('dezeen', 'creative', 'Dezeen', 'https://www.dezeen.com/feed/', { int: ['Architecture', 'Design', 'Interior Design'], max: 5 }),
  rss('creativebloq', 'creative', 'Creative Bloq', 'https://www.creativebloq.com/feeds.xml', { int: ['Drawing', 'Design', 'Media Production'], notWant: /\bdeals?\b|price|sale\b|discount|black friday|prime day|\$|£/i, max: 4 }),
  rss('petapixel', 'creative', 'PetaPixel (photography)', 'https://petapixel.com/feed/', { int: ['Photography', 'Media Production'], max: 4 }),
  rd('rd-knitting', 'creative', 'knitting', { imagesOnly: true, int: ['Knitting', 'Crafts'], max: 4 }),
  rd('rd-sewing', 'creative', 'sewing', { imagesOnly: true, int: ['Sewing', 'Fashion'], max: 4 }),
  rd('rd-crafts', 'creative', 'crafts', { imagesOnly: true, int: ['Crafts', 'Origami', 'Calligraphy'], max: 4 }),
  
  rd('rd-cozy', 'creative', 'CozyPlaces', { imagesOnly: true, int: ['Interior Design'], max: 4 }),
  // Culture and stage
  rss('smithsonian', 'culture', 'Smithsonian Magazine', 'https://www.smithsonianmag.com/rss/latest_articles/', { int: ['History', 'Culture', 'Museums'], max: 5 }),
  yt('yt-oversimplified', 'culture', 'OverSimplified (history)', 'UCNIuvl7V8zACPpTmmNIqP2A', { int: ['History', 'Storytelling'], max: 3 }),
  rd('rd-ballet', 'culture', 'ballet', { imagesOnly: true, url: 'https://www.reddit.com/r/ballet/top/.rss?t=week', int: ['Ballet', 'Dance', 'Theatre', 'Acting'], max: 4 }),
  // Learning and ideas
  rss('aeon', 'learn', 'Aeon (ideas)', 'https://aeon.co/feed.rss', { int: ['Philosophy', 'Psychology', 'Religion & Spirituality', 'Learning'], max: 5 }),
  rss('bigthink', 'learn', 'Big Think', 'https://bigthink.com/feed/', { int: ['Self-Improvement', 'Leadership', 'Learning', 'Philosophy'], max: 4 }),
  rss('psypost', 'learn', 'PsyPost (psychology)', 'https://www.psypost.org/feed/', { int: ['Psychology', 'Sociology'], max: 4 }),
  rss('bookriot', 'learn', 'Book Riot', 'https://bookriot.com/feed/', { int: ['Reading', 'Writing', 'Storytelling'], max: 4 }),
  rss('conversation', 'learn', 'The Conversation NZ', 'https://theconversation.com/nz/articles.atom', { int: ['Education', 'Research', 'Law', 'Sociology'], max: 4 }),
  yt('yt-crashcourse', 'learn', 'Crash Course', 'UCX6b17PVsYBQ0ip5gyeme-Q', { int: ['Education', 'Learning', 'History'], max: 3 }),
  yt('yt-ted', 'learn', 'TED', 'UCAuUUnT6oDeKwE6v1NGQxug', { int: ['Public Speaking', 'Leadership', 'Debate', 'Learning'], max: 3 }),
  yt('yt-minimalists', 'learn', 'The Minimalists', 'UCkbFiBwMYMXAqifXF4xo5Uw', { int: ['Simple Living', 'Self-Improvement'], max: 3 }),
  rd('rd-bookporn', 'learn', 'BookPorn', { imagesOnly: true, url: 'https://www.reddit.com/r/BookPorn/top/.rss?t=week', name: 'Reddit · books & shelves', int: ['Reading'], max: 4 }),
  // Games and puzzles
  rss('polygon', 'games', 'Polygon', 'https://www.polygon.com/feed/', { int: ['Video Games', 'Board Games'], max: 5 }),
  rss('suas', 'games', 'Shut Up & Sit Down', 'https://www.shutupandsitdown.com/feed/', { int: ['Board Games', 'Strategy'], max: 4 }),
  rss('bgquest', 'games', 'Board Game Quest', 'https://www.boardgamequest.com/feed/', { int: ['Board Games', 'Strategy'], max: 4 }),
  rss('mentalfloss', 'learn', 'Mental Floss (amazing facts)', 'https://www.mentalfloss.com/posts.rss', { int: ['Trivia', 'History'], max: 5, notWant: FUN_NOT }),
  yt('yt-noclip', 'games', 'Noclip (game docs)', 'UC0fDG3byEcMtbOqPMymDNbw', { int: ['Video Games'], max: 3 }),
  rd('rd-boardgames', 'games', 'boardgames', { imagesOnly: true, int: ['Board Games'], max: 5 }),
  rd('rd-jigsaw', 'games', 'Jigsawpuzzles', { imagesOnly: true, int: ['Puzzles'], max: 4 }),
  rd('rd-chess', 'games', 'chess', { imagesOnly: true, int: ['Chess', 'Strategy'], max: 3 }),
  // Collecting
  rd('rd-antiques', 'collect', 'Antiques', { imagesOnly: true, int: ['Collecting'], max: 5 }),
  rd('rd-vinyl', 'collect', 'vinyl', { imagesOnly: true, int: ['Collecting', 'Music Appreciation'], max: 5 }),
  rd('rd-lego', 'collect', 'lego', { imagesOnly: true, int: ['Model Building', 'Collecting'], max: 4 }),
  rd('rd-modelmakers', 'collect', 'modelmakers', { imagesOnly: true, int: ['Model Building'], max: 4 }),
  rd('rd-whatisthis', 'collect', 'whatisthisthing', { imagesOnly: true, int: ['Collecting', 'Trivia'], max: 4 }),
  // Outdoors
  rd('rd-campinghiking', 'outdoors', 'CampingandHiking', { imagesOnly: true, url: 'https://www.reddit.com/r/CampingandHiking/top/.rss?t=week', int: ['Camping', 'Hiking'], max: 5 }),
  rd('rd-hiking', 'outdoors', 'hiking', { imagesOnly: true, int: ['Hiking', 'Walking'], max: 5 }),
  rd('rd-camping', 'outdoors', 'camping', { imagesOnly: true, url: 'https://www.reddit.com/r/camping/top/.rss?t=week', int: ['Camping'], max: 4 }),
  rd('rd-tramping', 'outdoors', 'tramping', { imagesOnly: true, url: 'https://www.reddit.com/r/tramping/top/.rss?t=month', int: ['Hiking', 'Camping', 'Walking'], max: 4 }),
  rd('rd-scuba', 'outdoors', 'scuba', { imagesOnly: true, url: 'https://www.reddit.com/r/scuba/top/.rss?t=week', int: ['Diving & Snorkelling'], max: 4 }),
  rss('mongabay', 'outdoors', 'Mongabay (environment)', 'https://news.mongabay.com/feed/', { int: ['Environmental Action', 'Volunteering'], max: 4 }),
  // Cars and machines
  rss('hagerty', 'cars', 'Hagerty (classic cars)', 'https://www.hagerty.com/media/feed/', { int: ['Cars & Driving', 'Collecting'], max: 5 }),
  rss('carscoops', 'cars', 'Carscoops', 'https://www.carscoops.com/feed/', { int: ['Cars & Driving'], max: 4 }),
  rss('oldcars', 'cars', 'Old Cars Weekly', 'https://www.oldcarsweekly.com/feed', { int: ['Cars & Driving', 'Collecting'], max: 4 }),
  
  rd('rd-projectcar', 'cars', 'projectcar', { imagesOnly: true, int: ['Cars & Driving', 'Machines'], max: 4 }),
  
  // Folded into existing tabs
  rss('makezine', 'diy', 'Make: (maker projects)', 'https://makezine.com/feed/', { int: ['Maker Culture', 'Robotics'], max: 4 }),
  rss('lowtech', 'diy', 'Low-tech Magazine', 'https://solar.lowtechmagazine.com/posts/index.xml', { int: ['Low Technology'], max: 3 }),
  rd('rd-upcycling', 'diy', 'upcycling', { imagesOnly: true, url: 'https://www.reddit.com/r/upcycling/top/.rss?t=week', int: ['Creative Reuse'], max: 4 }),
  rd('rd-powerwash', 'diy', 'CleaningTips', { imagesOnly: true, url: 'https://www.reddit.com/r/CleaningTips/top/.rss?t=week', int: ['Cleaning'], max: 4 }),
  yt('yt-cleanthatup', 'diy', 'Clean That Up', 'UC1GLDECMH83KqDn6hypodYw', { int: ['Cleaning'], max: 3 }),
  rss('ieee', 'tech', 'IEEE Spectrum', 'https://spectrum.ieee.org/feeds/feed.rss', { int: ['Engineering', 'Robotics', 'Computers', 'Technology'], max: 5 }),
  rd('rd-robotics', 'tech', 'robotics', { imagesOnly: true, url: 'https://www.reddit.com/r/robotics/top/.rss?t=week', int: ['Robotics'], max: 4 }),
  rss('quanta', 'science', 'Quanta Magazine (maths & science)', 'https://www.quantamagazine.org/feed/', { int: ['Mathematics', 'Science', 'Research'], max: 4 }),
  yt('yt-veritasium', 'science', 'Veritasium', 'UCHnyfMqiRRG1u-2MsSQLbXA', { int: ['Science', 'Engineering'], max: 3 }),
  yt('yt-markrober', 'science', 'Mark Rober', 'UCY1kMZp36IQSyNx_9h4mpCg', { int: ['Engineering', 'Science'], max: 3 }),
  rss('slashfilm', 'sitcoms', '/Film', 'https://www.slashfilm.com/feed/', { notWant: /election|midterm|debate|politic|trump|vote|how to watch/i, int: ['Film', 'Pop Culture', 'Fandom', 'Television'], want: /comedy|sitcom|series|season|episode|tv|stream|trailer|netflix|prime|anime/i, max: 4 }),
  rd('rd-synth', 'music', 'synthesizers', { imagesOnly: true, int: ['Music Production'], max: 4 }),
  rd('rd-concertporn', 'music', 'Concerts', { imagesOnly: true, url: 'https://www.reddit.com/r/Concerts/top/.rss?t=week', int: ['Concerts'], max: 4 }),
  rd('rd-aww', 'nature', 'aww', { imagesOnly: true, int: ['Animals'], max: 4, mood: 'calm' }),
  // 1.6.0 calm and cute for evenings (mood: calm = leans in from 7pm, most 9pm–3am)
  rd('cosy-eyebleach', 'nature', 'Eyebleach', { imagesOnly: true, int: ['Animals'], max: 4, mood: 'calm' }),
  rd('cosy-cozyplaces', 'creative', 'CozyPlaces', { imagesOnly: true, max: 3, mood: 'calm' }),
  rd('cosy-astro', 'scifi', 'astrophotography', { imagesOnly: true, max: 3, mood: 'calm' }),
  yt('cosy-dodo', 'dogs', 'The Dodo', 'UCINb0wqPz-A0dV9nARjJlOQ', { int: ['Animals'], max: 4, mood: 'calm' }),
  yt('cosy-weratedogs', 'dogs', 'WeRateDogs', 'UC5JWr3uyRSVcoUSk41-qkSw', { max: 3, mood: 'calm' }),
  yt('cosy-lofi', 'music', 'Lofi Girl', 'UCSJ4gkVC6NrvII8umztf0Ow', { max: 3, mood: 'calm' }),
  yt('cosy-chillhop', 'music', 'Chillhop Music', 'UCOxqgCwgOqC2lMqC5PYz_Dg', { max: 3, mood: 'calm' }),
  yt('nz-yt-kakapo', 'nature', 'Kākāpō Recovery (DOC)', 'UCBsXS1Sm5prpRnSLl7UYQWQ', { int: ['Birdwatching', 'Animals'], max: 3, mood: 'calm' }),
  rd('rd-beekeeping', 'garden', 'Beekeeping', { imagesOnly: true, url: 'https://www.reddit.com/r/Beekeeping/top/.rss?t=week', int: ['Beekeeping'], max: 4 }),
  /* 1.6.0: more New Zealand sources for each chip (no sport, no money) */
  rss('nz-nzh-ent', 'sitcoms', 'NZ Herald Entertainment', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/entertainment/?outputType=xml', { want: /tv|series|season|episode|comedy|sitcom|netflix|neon|tvnz|threenow|prime video|disney|stream|show/i, int: ['Television', 'Comedy'], max: 5 }),
  pg('nz-flicks', 'sitcoms', 'Flicks NZ (what to watch)', 'https://www.flicks.co.nz/news/', /flicks\.co\.nz\/news\/[a-z0-9-]{8,}\/$/, { int: ['Film', 'Television'], max: 5 }),
  yt('nz-yt-three', 'sitcoms', 'Three (NZ)', 'UCBTMdHIU_I0KLPDmWCqTbYg', { int: ['Television', 'Comedy'], max: 4, want: /clip|comedy|funny|trailer|taskmaster|best of|scene|humour|humor|sitcom|ghosts/i, notWant: /news|sport|rugby|cricket|election|politic/i }),
  rss('nz-sarahgardener', 'garden', 'Sarah the Gardener (NZ)', 'https://www.sarahthegardener.co.nz/feed', { img: 'https://sarahthegardener.co.nz/wp-content/uploads/2026/06/IMG20260523105823-1-915x500.jpg', int: ['Gardening'], max: 4 }),
  rss('nz-coupdemain', 'music', 'Coup De Main (NZ)', 'https://www.coupdemainmagazine.com/rss.xml', { int: ['Music Appreciation', 'Concerts'], max: 4 }),
  pg('nz-audioculture', 'music', 'AudioCulture (NZ music history)', 'https://www.audioculture.co.nz/', /audioculture\.co\.nz\/(profile|articles|scenes)\/[a-z0-9-]+$/, { int: ['Music Appreciation'], max: 4 }),
  yt('nz-yt-rocketlab', 'scifi', 'Rocket Lab (NZ)', 'UCsWq7LZaizhIi-c-Yo_bcpw', { int: ['Space'], max: 3 }),
  rss('nz-tepapa', 'culture', 'Te Papa blog', 'https://blog.tepapa.govt.nz/feed/', { img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Museum_of_New_Zealand_Te_Papa_Tongarewa_unsaturated.jpg/960px-Museum_of_New_Zealand_Te_Papa_Tongarewa_unsaturated.jpg', int: ['Museums', 'History', 'Traditional Culture', 'Nature'], max: 5 }),
  rss('nz-rnz-maori', 'culture', 'RNZ Te Ao Māori', 'https://www.rnz.co.nz/rss/te-manu-korihi.xml', { int: ['Traditional Culture', 'Culture', 'Languages'], max: 4 }),
  yt('nz-yt-aucklandmuseum', 'culture', 'Auckland Museum', 'UCDo4HyAsT28SL9elBxtRyYQ', { int: ['Museums', 'History'], max: 3 }),
  yt('nz-yt-doc', 'nature', 'DOC (YouTube)', 'UCNXXjM3fkppSxEQIwBloIvA', { int: ['Nature', 'Animals', 'Birdwatching'], max: 3 }),
  yt('nz-yt-nzgeo', 'nature', 'NZ Geographic (YouTube)', 'UCaH0pSiMVjZf7L3bxs6orpw', { int: ['Nature'], max: 3 }),
  rd('nz-rd-nzbirds', 'nature', 'NZBirds', { imagesOnly: true, url: 'https://www.reddit.com/r/NZBirds/top/.rss?t=year', int: ['Birdwatching'], max: 4 }),
  rss('nz-itbrief', 'tech', 'IT Brief NZ', 'https://itbrief.co.nz/feed', { int: ['Technology', 'Computers'], max: 4 }),
  rss('nz-nzh-tech', 'tech', 'NZ Herald Technology', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/technology/?outputType=xml', { int: ['Technology'], max: 4 }),
  rss('nz-rnz-tech', 'tech', 'RNZ Media & Technology', 'https://www.rnz.co.nz/rss/media-technology.xml', { int: ['Technology', 'Social Media'], max: 3 }),
  yt('nz-yt-mitre10', 'diy', 'Mitre 10 NZ (DIY how-tos)', 'UC4ilbVhXKIHLhdYyg4v1Yig', { int: ['DIY', 'Carpentry', 'Gardening'], max: 8, prio: 1 }),
  rd('nz-rd-diynz', 'diy', 'DIYNZ', { imagesOnly: true, url: 'https://www.reddit.com/r/DIYNZ/top/.rss?t=month', int: ['DIY'], max: 4 }),
  rss('nz-smc', 'science', 'Science Media Centre NZ', 'https://www.sciencemediacentre.co.nz/feed/', { int: ['Science', 'Research'], max: 4 }),
  yt('nz-yt-purenz', 'travel', '100% Pure New Zealand', 'UCPbE8UztMtGa24hlvzYQpzQ', { int: ['Travel'], max: 3 }),
  rss('nz-nzh-life', 'food', 'NZ Herald Food', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/lifestyle/?outputType=xml', { want: /recipe|food|cook|bake|baking|dinner|lunch|kai|restaurant|eat/i, int: ['Cooking', 'Cuisine'], max: 4 }),
  rss('nz-nadialim', 'food', 'Nadia Lim (NZ recipes)', 'https://nadialim.com/feed/', { int: ['Cooking'], max: 4 }),
  yt('nz-yt-lesmills', 'fitness', 'Les Mills (NZ)', 'UChJHUmT_EREEs4WV6jpmnBw', { int: ['Exercise', 'Fitness'], max: 4 }),
  rss('nz-nzh-fitness', 'fitness', 'NZ Herald Health & Fitness', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/lifestyle/?outputType=xml', { want: /fitness|exercise|workout|gym|strength|weights|yoga|walk(ing)?|wellbeing|sleep|health/i, int: ['Fitness', 'Health'], max: 3 }),
  rss('nz-selling', 'selling', 'NZ Herald (Trade Me, op shops & side hustles)', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/business/?outputType=xml', { want: /trade ?me|op[- ]shop|second-?hand|resell|resale|marketplace|garage sale|side hustle|vintage|thrift|declutter|car boot|flea market/i, int: ['Selling'], max: 4 }),
  rss('nz-designassembly', 'creative', 'Design Assembly (NZ design)', 'https://designassembly.org.nz/feed/', { int: ['Design', 'Art'], max: 4 }),
  rss('nz-nzhistory', 'learn', 'NZHistory (Manatū Taonga)', 'https://nzhistory.govt.nz/rss.xml', { int: ['History', 'Learning'], max: 4 }),
  yt('nz-yt-spinoff', 'sitcoms', 'The Spinoff (YouTube)', 'UCprQWxc91NtC1Jx1iuEbC-Q', { int: ['Television', 'Comedy'], max: 3 }),
  rd('nz-rd-nzgaming', 'games', 'nzgaming', { imagesOnly: true, url: 'https://www.reddit.com/r/nzgaming/top/.rss?t=month', int: ['Video Games'], max: 3 }),
  rd('nz-rd-oldnz', 'collect', 'OldNZ', { imagesOnly: true, url: 'https://www.reddit.com/r/OldNZ/top/.rss?t=year', int: ['Collecting', 'History'], max: 4 }),
  rss('nz-wilderness', 'outdoors', 'Wilderness (NZ outdoors)', 'https://www.wildernessmag.co.nz/feed/', { int: ['Hiking', 'Camping', 'Walking'], max: 5 }),
  // 1.9.6 closer to home + practical: NZ tip and how-to sites (evergreen ones rotate; this month's/season's guides first)
  pg('nz-tui-guides', 'garden', 'Tui Garden guides (NZ)', 'https://www.tuigarden.co.nz/sitemap.xml', /tuigarden\.co\.nz\/inspiration-hub\/ideas-and-inspiration\/[a-z0-9-]+\/$/, { sitemap: true, rotate: true, scan: 2600000, int: ['Gardening'], max: 5, prio: 1, trim: /\s*\|\s*Tui.*$/i }),
  pg('nz-tui-qa', 'garden', 'Tui Garden questions (NZ)', 'https://www.tuigarden.co.nz/sitemap.xml', /tuigarden\.co\.nz\/garden-questions\/[a-z0-9-]+\/?$/, { sitemap: true, rotate: true, scan: 2600000, int: ['Gardening'], max: 3, trim: /\s*\|\s*Tui.*$/i }),
  pg('nz-oderings', 'garden', 'Oderings garden guides (NZ)', 'https://www.oderings.co.nz/sitemap.xml', /oderings\.co\.nz\/learn\/garden-guides\/[a-z0-9-]+-__I\.\d+__N\.\d+$/, { sitemap: true, rotate: true, scan: 2300000, int: ['Gardening'], max: 4, notWant: /potato-salad|recipe/i, trim: /^\s*Oderings[^|]*\|\s*|\s*[|–-]\s*Oderings.*$/gi }),
  pg('nz-edmonds', 'food', 'Edmonds recipes (NZ)', 'https://edmondscooking.co.nz/sitemap.xml/sitemap/SilverStripe-CMS-Model-SiteTree/1', /edmondscooking\.co\.nz\/recipes\/[a-z0-9-]+\/[a-z0-9-]+$/, { sitemap: true, rotate: true, int: ['Cooking', 'Baking'], max: 4, trim: /\s*[|–-]\s*Edmonds.*$/i }),
  pg('nz-northland-blog', 'travel', 'Northland NZ – ideas & day trips', 'https://www.northlandnz.com/sitemap.xml/sitemap/SilverStripe-CMS-Model-SiteTree/1', /northlandnz\.com\/visit\/visit-northland-blog-stories\/[a-z0-9-]+\/$/, { sitemap: true, rotate: true, int: ['Road trips', 'Beaches'], max: 4, trim: /\s*[|–-]\s*Northland.*$/i }),
  pg('nz-msc', 'outdoors', 'NZ Mountain Safety Council (tips)', 'https://www.mountainsafety.org.nz/sitemap.xml/sitemap/SilverStripe-CMS-Model-SiteTree/1', /mountainsafety\.org\.nz\/(learn\/(skills|activities)|discover\/read)\/[a-z0-9-]+$/, { sitemap: true, rotate: true, int: ['Hiking', 'Walking', 'Camping'], max: 3, notWant: /avalanche|killed|died|death|dies|fatal|tragedy|missing|game-bird|hunting|research|insights|app-updates|\b20(1\d|2[0-3])\b/i, trim: /\s*\|\s*(Stories|NZMSC|Mountain Safety).*$/i }),
  pg('nz-aa-tips', 'cars', 'AA NZ driving & car tips', 'https://www.aa.co.nz/.sitemap.xml', /aa\.co\.nz\/(cars\/motoring-blog|membership\/aa-directions\/driver|cars\/maintenance)\/[a-z0-9-]*(tips?|how-to|guide|ways|check|care|safe)[a-z0-9-]*\/$/, { sitemap: true, rotate: true, int: ['Cars & Driving'], max: 3, notWant: /insurance|finance|loan|price|cost|fuel-prices|petrol-price|newsroom/i }),
  rss('nz-kiwifamilies', 'parent', 'Kiwi Families (NZ parenting tips)', 'https://www.kiwifamilies.co.nz/feed/', { int: ['Baby & toddler', 'Primary-age kids', 'Parenting teens'], max: 4 }),
  rss('nz-autocar', 'cars', 'NZ Autocar', 'https://nzautocar.co.nz/feed/', { int: ['Cars & Driving'], max: 4 }),
  // 1.7.1 Removed for nudity risk: r/museum (showed a nude photo), r/HistoryPorn, Hyperallergic, Open Culture, Proko, r/drawing.
  // 1.7.1 🧒 Kids & activities (on for everyone). Family-safe only; the nudity filter and no-sport rule apply as everywhere.
  rss('kids-kkn', 'kids', 'Kiwi Kids News', 'https://www.kiwikidsnews.co.nz/feed/', { int: ['Kids activities'], max: 5 }),
  yt('kids-yt-kkn', 'kids', 'Kiwi Kids News (YouTube)', 'UCzFl3gSkj26RolySnjBzOVg', { int: ['Kids activities'], max: 3 }),
  yt('kids-yt-artforkids', 'kids', 'Art for Kids Hub', 'UC5XMF3Inoi8R9nSI8ChOsdQ', { int: ['Kids crafts'], max: 4, mood: 'calm' }),
  yt('kids-yt-scishowkids', 'kids', 'SciShow Kids', 'UCRFIPG2u1DxKLNuE3y2SjHA', { int: ['Kids science'], max: 3, mood: 'calm' }),
  yt('kids-yt-cckids', 'kids', 'Crash Course Kids', 'UCONtPx56PSebXJOxbFv-2jQ', { int: ['Kids science'], max: 3 }),
  rss('kids-ottoolbox', 'kids', 'The OT Toolbox (sensory-friendly activities)', 'https://www.theottoolbox.com/feed/', { int: ['Sensory-friendly'], max: 4, mood: 'calm' }),
  rss('kids-autismnz', 'kids', 'Autism New Zealand', 'https://autismnz.org.nz/feed/', { int: ['Sensory-friendly'], max: 3 }),
  { id: 'kids-ev', topic: 'kids', kind: 'efrss', event: true, evDays: 60, urls: ['https://www.eventfinda.co.nz/feed/events/whangarei/whatson/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/whangarei/lifestyle/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/northland/whatson/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/northland/lifestyle/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/northland/workshops-conferences-classes/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/northland/arts/upcoming.rss'], name: 'Kids & family events · Whangārei & Northland', notWant: /\b(tavern|bars?|pubs?|wine|beer|brewery|cocktails?|nightclub|r ?18|18\+|adults only|over 18s?)\b/i, want: /\b(kids?|children|child|family|families|whānau|whanau|school holidays?|toddlers?|junior|storytime|story time|sensory|autism|playgroup|pre-?school|tamariki|craft|lego|science|baking|puppet|magic show|teddy|fairy|dinosaur)\b/i, int: ['Kids activities', 'Family days out'], max: 8 },
  // 1.9.0 👪 Parenting & family (offered to members by life stage; off unless picked). NZ first: Plunket, Parenting Place, Autism NZ.
  pg('par-plunket', 'parent', 'Whānau Āwhina Plunket', 'https://www.plunket.org.nz/sitemap.xml/sitemap/SilverStripe-CMS-Model-SiteTree/1', /plunket\.org\.nz\/(child-development|caring-for-your-child|being-a-parent)\/[a-z0-9-]+\/?$/, { sitemap: true, scan: 600000, trim: /\s*[|–-]\s*Plunket.*$/i, int: ['Baby & toddler'], max: 6, mood: 'calm' }),
  pg('par-pp-baby', 'parent', 'Parenting Place · babies & toddlers', 'https://parentingplace.nz/sitemaps-1-section-resources-1-sitemap.xml', /parentingplace\.nz\/resources\/[a-z0-9-]*(baby|babies|toddler|newborn|sleep|bedtime|preschool|tantrum|little-one)[a-z0-9-]*$/, { sitemap: true, scan: 600000, trim: /\s*[|–-]\s*Parenting Place.*$/i, int: ['Baby & toddler'], max: 5, mood: 'calm' }),
  pg('par-pp-kids', 'parent', 'Parenting Place · primary-age kids', 'https://parentingplace.nz/sitemaps-1-section-resources-1-sitemap.xml', /parentingplace\.nz\/resources\/[a-z0-9-]*(child|kids|sibling|school|sleepover|play|bedtime|big-feelings|meltdown)[a-z0-9-]*$/, { sitemap: true, scan: 600000, trim: /\s*[|–-]\s*Parenting Place.*$/i, int: ['Primary-age kids'], max: 5 }),
  pg('par-pp-teens', 'parent', 'Parenting Place · teens', 'https://parentingplace.nz/sitemaps-1-section-resources-1-sitemap.xml', /parentingplace\.nz\/resources\/[a-z0-9-]*(teen|tween|adolesc|rangatahi)[a-z0-9-]*$/, { sitemap: true, scan: 600000, trim: /\s*[|–-]\s*Parenting Place.*$/i, int: ['Parenting teens'], max: 5 }),
  pg('par-pp-grand', 'parent', 'Parenting Place · grandparents', 'https://parentingplace.nz/sitemaps-1-section-resources-1-sitemap.xml', /parentingplace\.nz\/resources\/[a-z0-9-]*(grand|nana|koro|kuia|extended-family)[a-z0-9-]*$/, { sitemap: true, scan: 600000, trim: /\s*[|–-]\s*Parenting Place.*$/i, int: ['Grandparenting'], max: 4, mood: 'calm' }),
  yt('par-yt-goodinside', 'parent', 'Dr Becky · Good Inside', 'UCVNt__BNWlFNJQjRMLbBFNg', { int: ['Baby & toddler', 'Primary-age kids'], max: 3, mood: 'calm' }),
  rss('par-autismnz', 'parent', 'Autism New Zealand (for parents)', 'https://autismnz.org.nz/feed/', { int: ['Autism & sensory parenting'], max: 3 }),
  rss('par-ottoolbox', 'parent', 'The OT Toolbox (sensory parenting)', 'https://www.theottoolbox.com/feed/', { int: ['Autism & sensory parenting'], max: 3, mood: 'calm' }),
  { id: 'par-ev', topic: 'parent', kind: 'efrss', name: 'Baby, toddler, teen & whānau events (Eventfinda)', event: true, evDays: 60, int: ['Baby & toddler', 'Parenting teens', 'Grandparenting'], urls: EF_FEEDS, want: /\b(bab(y|ies)|toddlers?|preschool\w*|playgroups?|under[ -]?5s?|tamariki|teens?|teenagers?|youth|rangatahi|grandparents?|grandkids|seniors?|whānau day|whanau day|family fun|sensory[- ]friendly|autism|quiet hour)\b/i, max: 6 },
  // 1.9.0 🌈 Drag & LGBTQ+ (Express, InsideOUT, Drag Race clips, NZ Pride and drag events). Off unless picked.
  rss('rb-express', 'rainbow', 'Express (NZ rainbow news)', 'https://gayexpress.co.nz/feed/', { int: ['NZ rainbow community'], max: 4, notWant: RAINBOW_NOT }),
  rss('rb-insideout', 'rainbow', 'InsideOUT Kōaro', 'https://insideout.org.nz/feed/', { int: ['NZ rainbow community'], max: 3, notWant: RAINBOW_NOT }),
  yt('rb-yt-dragrace', 'rainbow', "RuPaul's Drag Race", 'UC0sEIyXXalzD1lbwm3D2xpA', { int: ['Drag'], max: 3, notWant: RAINBOW_NOT }),
  yt('rb-yt-wow', 'rainbow', 'WOW Presents (drag artists)', 'UCUUUpaMp8DV6KUOfQwoIiLg', { int: ['Drag'], max: 3, notWant: RAINBOW_NOT }),
  yt('rb-yt-nikkie', 'rainbow', 'NikkieTutorials (makeup)', 'UCzTKskwIc_-a0cGvCXA848Q', { int: ['Makeup & style'], max: 2, notWant: RAINBOW_NOT }),
  { id: 'rb-ev', topic: 'rainbow', kind: 'efrss', name: 'Pride & drag events (Eventfinda)', event: true, evDays: 90, int: ['NZ rainbow community', 'Drag'], urls: EF_FEEDS.concat(['https://www.eventfinda.co.nz/feed/events/auckland/arts/upcoming.rss', 'https://www.eventfinda.co.nz/feed/events/auckland/performing-arts/upcoming.rss']), want: /\b(pride|rainbow|drag|lgbt\w*|queer|takatāpui|takatapui|trans\b|bingo)\b/i, notWant: RAINBOW_NOT, max: 6 },
  // 1.9.0 🤝 Social work & community (NZ). Off unless picked.
  rss('sw-swrb', 'social', 'Social Workers Registration Board', 'https://swrb.govt.nz/feed/', { int: ['Social work practice'], max: 4, notWant: SOCIAL_NOT }),
  rss('sw-rnz', 'social', 'RNZ · community & wellbeing', 'https://www.rnz.co.nz/rss/national.xml', { int: ['Community & wellbeing'], max: 4, want: /\b(social work(ers?)?|oranga tamariki|whānau ora|whanau ora|community (group|centre|support|workers?)|mental health|wellbeing|well-being|youth workers?|foster|kaupapa māori|marae|volunteers?|food bank|disabilit(y|ies)|carers?)\b/i, notWant: SOCIAL_NOT }),
  rss('sw-autismnz', 'social', 'Autism New Zealand', 'https://autismnz.org.nz/feed/', { int: ['Community & wellbeing'], max: 2 }),
  { id: 'sw-ev', topic: 'social', kind: 'efrss', name: 'Social work & community events (Eventfinda)', event: true, evDays: 90, int: ['Social work practice'], urls: EF_FEEDS, want: /\b(social work\w*|community (hui|workers?|wellbeing|support|development|services)|wellbeing|well-being|mental health|trauma[- ]informed|supervision|practitioners?)\b/i, notWant: SOCIAL_NOT, max: 5 },
  // 1.6.1 🌾 Gluten free & food brands (NZ meal kits, GF bread and brands, vegan and GF events in Northland/Auckland). mood calm: cooking suits evenings
  rss('gf-mfb', 'gf', 'My Food Bag · Bargain Box · Fresh Start', 'https://www.myfoodbag.co.nz/explore/feed/', { int: ['Gluten free', 'Cooking'], max: 5, mood: 'calm' }),
  rss('gf-freshstart', 'gf', 'Fresh Start recipes', 'https://www.myfoodbag.co.nz/explore/recipes/freshstart/feed/', { int: ['Gluten free', 'Cooking'], max: 4, mood: 'calm' }),
  rss('gf-bargainbox', 'gf', 'Bargain Box recipes', 'https://www.myfoodbag.co.nz/explore/recipes/bargainbox/feed/', { int: ['Cooking'], max: 3, mood: 'calm' }),
  yt('gf-yt-mfb', 'gf', 'My Food Bag (YouTube)', 'UCs-XSsfHqu6HG0yIZ6Zd3cg', { int: ['Cooking'], max: 3, mood: 'calm' }),
  yt('gf-yt-woop', 'gf', 'WOOP (YouTube)', 'UCGWtYWEzzruXAVgEvhJOOQQ', { int: ['Cooking'], max: 3, mood: 'calm' }),
  yt('gf-yt-bargainbox', 'gf', 'Bargain Box (YouTube)', 'UClBm_bukPf-PUJJabcU8u8w', { int: ['Cooking'], max: 2, mood: 'calm' }),
  pg('gf-woop', 'gf', 'WOOP blog', 'https://www.woop.co.nz/blog', /woop\.co\.nz\/blog\/[a-z0-9-]{6,}$/, { trim: /^Woop\s*\|\s*/i, int: ['Cooking'], max: 4, mood: 'calm' }),
  pg('gf-hellofresh', 'gf', 'HelloFresh NZ · gluten-free recipes', 'https://www.hellofresh.co.nz/recipes/gluten-free-recipes', /hellofresh\.co\.nz\/recipes\/[a-z0-9-]+-[0-9a-f]{24}$/, { scan: 400000, trim: /\s*(Recipe)?\s*\|\s*HelloFresh.*$/i, int: ['Gluten free', 'Cooking'], max: 5, mood: 'calm' }),
  pg('gf-venerdi', 'gf', 'Venerdi (NZ gluten-free bread)', 'https://venerdi.co.nz/recipes/', /venerdi\.co\.nz\/recipe\/[a-z0-9-]+\/?$/, { trim: /\s*-\s*Venerdi NZ$/i, int: ['Gluten free', 'Baking'], max: 5, mood: 'calm' }),
  rss('gf-ceres', 'gf', 'Ceres Organics recipes', 'https://ceres.co.nz/blogs/recipes.atom', { int: ['Gluten free', 'Cooking'], max: 4, mood: 'calm' }),
  rss('gf-puredelish', 'gf', 'Pure Delish (NZ gluten-free)', 'https://www.puredelish.co.nz/blogs/recipes.atom', { int: ['Gluten free', 'Baking'], max: 4, mood: 'calm' }),
  { id: 'gf-ev-gf', topic: 'gf', kind: 'efrss', event: true, evDays: 90, urls: EF_FEEDS, name: 'Gluten-free events · Northland & Auckland', want: /gluten|coeliac|celiac|allerg|free[ -]from/i, img: 'https://www.theglutenfreefoodfestival.co.nz/images/2026AprilKathrynTaylorPhotographyGlutenFreeFestival26-0026.jpg', int: ['Gluten free'], max: 6 },
  { id: 'gf-ev-vegan', topic: 'gf', kind: 'efrss', event: true, evDays: 90, urls: EF_FEEDS, name: 'Vegan events · Whangārei, Northland & Auckland', want: /vegan|plant[ -]?based/i, img: 'https://www.theglutenfreefoodfestival.co.nz/images/2026AprilKathrynTaylorPhotographyGlutenFreeFestival26-0026.jpg', int: ['Vegan'], max: 6 },
  // 1.9.1 🍬 Candy Crush tips (opt-in; Sarah). Curated tip cards link to the guide pages; fresh tips from a guide site and two walkthrough channels.
  // 1.9.2 ADHD & autism parenting (opt-in; on for Millesha): practical, positive, evidence-based. NZ first, then reputable international and autistic/ADHD-led creators. ND_NOT drops cure/miracle claims, vaccines, ABA, fear and sad stories.
  { id: 'nd-tips', topic: 'nd', kind: 'static', name: 'ADHD & autism parenting tips', int: ['ADHD & autism parenting'], max: 5, at: Date.parse('2026-11-01T15:45:00+13:00'), items: [
    { t: '🌊 Riding out a meltdown – calm first, talk later', s: 'A meltdown is a nervous system that’s overloaded, not naughtiness. Stay close and calm, lower the noise and words, keep everyone safe, and save the chat for once they’ve settled. Parenting Place (NZ) explains what helps.', url: 'https://parentingplace.nz/resources/epic-meltdowns-part-2-calming-the-storm', img: 'https://parentingplace.nz/images/Resources/_1200x630_crop_center-center_82_none/Epic-Meltdowns-Recovery.jpg?mtime=1615335789' },
    { t: '🧩 Autism (takiwātanga) support in Aotearoa', s: 'KidsHealth NZ’s round-up of who can help: Autism NZ, Altogether Autism, Explore, Needs Assessment (NASC), Whaikaha and local parent groups – plus what happens after a diagnosis.', url: 'https://www.kidshealth.org.nz/autism-takiwatanga-support-resources-in-aotearoa-nz', img: 'https://www.altogetherautism.org.nz/wp-content/uploads/2018/09/facebook-link-image.jpg' },
    { t: '⚡ ADHD (aroreretini): what helps at home', s: 'Short, clear instructions one at a time, visual checklists for mornings and bedtime, lots of specific praise and movement breaks. KidsHealth NZ’s ADHD guide covers the basics and where to get support.', url: 'https://www.kidshealth.org.nz/adhd-aroreretini', img: 'https://childmind.org/wp-content/uploads/2021/08/Topics-ADHD-2.jpg' },
    { t: '🧘 Mindfulness that ADHD kids actually enjoy', s: 'Skip the long sit-still sessions: try moving, playful, 1–2 minute calm-downs (balloon breaths, “notice 5 things”, a slow walk). ADDitude’s practical guide.', url: 'https://www.additudemag.com/mindfulness-for-kids-adhd/', img: 'https://i0.wp.com/www.additudemag.com/wp-content/uploads/2026/08/A-Mindfulness-Model-for-Kids-scaled.jpg?resize=480%2C270px&ssl=1' },
    { t: '🎯 “Lazy” is usually a skill gap, not a choice', s: 'When a child won’t start, it’s often executive function – getting going, planning, far-off rewards. Break tasks into tiny steps, add a quick win and make rewards close and concrete.', url: 'https://www.additudemag.com/my-child-puts-no-effort-into-anything-adhd/', img: 'https://i0.wp.com/www.additudemag.com/wp-content/uploads/2026/10/Peering-Toward-a-Distant-Reward.png?resize=480%2C270px&ssl=1' },
  ] },
  rss('nd-autismnz', 'nd', 'Autism New Zealand', 'https://autismnz.org.nz/feed/', { int: ['ADHD & autism parenting'], max: 2, notWant: ND_NOT }),
  rss('nd-altogether', 'nd', 'Altogether Autism (NZ)', 'https://altogetherautism.org.nz/feed/', { int: ['ADHD & autism parenting'], max: 2, want: ND_KIDS, notWant: ND_NOT }),
  pg('nd-kidshealth', 'nd', 'KidsHealth NZ · ADHD & autism', 'https://www.kidshealth.org.nz/sitemap.xml', /kidshealth\.org\.nz\/(adhd|autism)[a-z0-9-\/]*$/, { sitemap: true, int: ['ADHD & autism parenting'], max: 2, notWant: ND_NOT, trim: /\s*\|\s*KidsHealth.*$/i }),
  pg('nd-pp', 'nd', 'Parenting Place · big feelings & meltdowns', 'https://parentingplace.nz/sitemaps-1-section-resources-1-sitemap.xml', /parentingplace\.nz\/resources\/[a-z0-9-]*(meltdown|big-feeling|sensory|adhd|autis|neuro|calm|anxi|emotion)[a-z0-9-]*$/, { sitemap: true, int: ['ADHD & autism parenting'], max: 2, notWant: ND_NOT }),
  rss('nd-additude', 'nd', 'ADDitude · parenting kids with ADHD', 'https://www.additudemag.com/category/parenting-adhd-kids/feed/', { int: ['ADHD & autism parenting'], max: 3, notWant: ND_NOT }),
  rss('nd-childmind', 'nd', 'Child Mind Institute', 'https://childmind.org/feed/', { int: ['ADHD & autism parenting'], max: 2, want: /\b(adhd|autis\w*|sensory|neurodiver\w*|meltdowns?|executive function)\b/i, notWant: /\b(study|research|subtypes?|neuroscience|biolog\w*|program|guanfacine|methylphenidate|ritalin|concerta|medication|medicines?|drugs?|sxsw|donat\w*|help us|night terrors?|yahoo|entertainment|villain|in the news|press)\b/i }),
  yt('nd-yt-howtoadhd', 'nd', 'How to ADHD (ADHD-led)', 'UC-nPM1_kSZf91ZGkcgy_95Q', { int: ['ADHD & autism parenting'], max: 2, want: ND_KIDS, notWant: ND_NOT, mood: 'calm' }),
  yt('nd-yt-samdy', 'nd', 'Yo Samdy Sam (autistic-led)', 'UCk5aCrQAppGZ8atiOpgYZ1A', { int: ['ADHD & autism parenting'], max: 2, want: ND_KIDS, notWant: ND_NOT }),
  yt('nd-yt-orion', 'nd', 'Orion Kelly – That Autistic Guy (autistic-led)', 'UCerYpTmasyCOuy9WH2qEeCg', { int: ['ADHD & autism parenting'], max: 2, want: ND_KIDS, notWant: ND_NOT }),
  { id: 'nd-ev', topic: 'nd', kind: 'efrss', name: 'Sensory-friendly & neurodiverse events (Eventfinda)', event: true, evDays: 60, int: ['ADHD & autism parenting'], urls: EF_FEEDS, want: /\b(sensory[- ]friendly|autis\w*|adhd|neurodiver\w*|quiet (hour|session|time)|relaxed (performance|screening|session))\b/i, max: 4 },
  // 1.9.7 🪄 Harry Potter (Slytherin lean) and 🦋 Monarch butterflies – opt-in; on for Sinead. Practical/fun first, NZ first for monarchs.
  { id: 'hp-tips', topic: 'hp', kind: 'static', name: 'Harry Potter – fun & how-to', int: ['Harry Potter'], max: 5, at: Date.parse('2026-11-01T16:50:00+13:00'), items: [
    { t: '🐍 Welcome to Slytherin – emerald green & silver', s: 'The official Slytherin house page: the serpent crest, the common room under the Black Lake, and why Merlin himself was a Slytherin. Good inspo for green-and-silver decor.', url: 'https://www.harrypotter.com/house/slytherin', img: 'https://www.harrypotter.com/images/share/share-slytherin-hbo.jpg' },
    { t: '💚 The symbolism of Slytherin – crest, ring, scarf & serpent', s: 'What each Slytherin symbol means (and the Bloody Baron, the house ghost) – handy ideas for a Slytherin craft, cake or party theme.', url: 'https://www.harrypotter.com/features/the-symbolism-of-slytherin-house', img: 'https://contentful.harrypotter.com/usf1vwtuqyxm/2vT64H5Tr2VfTtXzSkDgN1/3ea8c5a3a362f058e3ad59a681fd7f7f/slytherin-lifestyle-pins.jpg?w=1200&fit=fill&f=top' },
    { t: '🍺 Homemade butterbeer (no alcohol) – 3 ingredients', s: 'Kiwi version: 1 tbsp butterscotch sauce stirred into 200 ml ginger beer, topped with whipped cream and a caramel drizzle. Make it just before serving. Recipe from NZ blog My Kids Lick The Bowl.', url: 'https://mykidslickthebowl.com/harry-potter-butterbeer/', img: 'https://contentful.harrypotter.com/usf1vwtuqyxm/5Ow0nHNGycHy3gWMeY7LD8/07fb55e94f874c2e1066adadda68a6e6/HP-F6-half-blood-prince-horace-slughorn-three-broomsticks-web-landscape?w=1200&fit=fill&f=top' },
    { t: '🎩 What does your Hogwarts house say about you?', s: 'Slytherins: ambitious, shrewd, a dark sense of humour and a soft side they don’t show. The official guide to all four houses – fun for a family quiz night.', url: 'https://www.harrypotter.com/features/hogwarts-house-meanings', img: 'https://contentful.harrypotter.com/usf1vwtuqyxm/11MDi6siGpKu1ODhQxlATA/fb585f61a27fdafdd8b0c847d290c582/Great_Hall_Celebration_3.jpg?w=1200&fit=fill&f=top' },
  ] },
  pg('hp-news', 'hp', 'Wizarding World news', 'https://www.harrypotter.com/news', /harrypotter\.com\/news\/[a-z0-9-]+$/, { int: ['Harry Potter'], max: 4, trim: /^\s*Harry Potter\s*\|\s*|\s*\|\s*Wizarding World.*$/gi, notWant: /tickets on sale|price/i }),
  rss('hp-mugglenet', 'hp', 'MuggleNet (HP news & HBO series)', 'https://www.mugglenet.com/feed/', { int: ['Harry Potter'], max: 4, notWant: HP_NOT }),
  rss('hp-leaky', 'hp', 'The Leaky Cauldron (merch, crafts, news)', 'https://www.the-leaky-cauldron.org/feed/', { int: ['Harry Potter'], max: 4, notWant: HP_NOT }),
  yt('hp-yt', 'hp', 'Harry Potter (official YouTube)', 'UChPRO1CB_Hvd0TvKRU62iSQ', { int: ['Harry Potter'], max: 3, notWant: HP_NOT }),
  { id: 'hp-ev', topic: 'hp', kind: 'efrss', name: 'Harry Potter events (Eventfinda)', event: true, evDays: 60, int: ['Harry Potter'], urls: EF_FEEDS, want: /\b(harry potter|hogwarts|wizard(ing|s)?|butterbeer|slytherin|gryffindor|hufflepuff|ravenclaw|quidditch|potter (quiz|trivia))\b/i, max: 4 },
  { id: 'mo-tips', topic: 'monarch', kind: 'static', name: 'Monarch butterfly tips (NZ)', int: ['Monarch butterflies'], max: 5, at: Date.parse('2026-11-01T16:50:00+13:00'), items: [
    { t: '🌱 Swan plant season: how to grow healthier swan plants', s: 'Late spring is the time to get swan plants going: sunny sheltered spot, free-draining soil, regular water and feeding, and plant several so caterpillars don’t strip one bare. Moths & Butterflies of NZ Trust.', url: 'https://www.nzbutterflies.org.nz/swan-plant-tips/', img: 'https://www.nzbutterflies.org.nz/wp-content/uploads/IMG_8863-for-jacqui-Sally-Phillips-scaled-low.jpg' },
    { t: '🐛 Protecting caterpillars from wasps', s: 'Paper wasps and parasitic wasps are the big threat. Cover plants with fine netting or a mesh tent, check leaves daily, and move fat caterpillars somewhere safe to pupate.', url: 'https://www.nzbutterflies.org.nz/parasitic-wasps/', img: 'https://www.nzbutterflies.org.nz/wp-content/uploads/Pteromalus-puparum-Kathy-Reid-e1667289464323.jpg' },
    { t: '🦋 How to tag a monarch – and record your releases', s: 'Join the NZ tagging project: how to attach a tag gently, when to release, and how to log it so the Trust can track where NZ monarchs go.', url: 'https://www.nzbutterflies.org.nz/how-to-tag-a-butterfly/', img: 'https://www.nzbutterflies.org.nz/wp-content/uploads/Achillea-Red-Baron-and-tagged-monarch-Jane-Carver.jpg' },
    { t: '🌼 Helping monarchs the right way', s: 'Monarchs are wildlife: plant nectar flowers as well as swan plants, avoid sprays, and don’t over-crowd caterpillars indoors. The Trust’s guide to doing it well.', url: 'https://www.nzbutterflies.org.nz/helping-monarchs/', img: 'https://www.nzbutterflies.org.nz/wp-content/uploads/Danaus-plexippus-Monarch-on-yellow-sunflower-Sally-Phillips-IMG_0029-AW-secondary-square.jpg' },
    { t: '🌸 Tui butterfly guide – plants butterflies love', s: 'Which nectar plants and host plants to grow in a Kiwi garden to bring monarchs, admirals and coppers in, plus a bee & butterfly friendly planting plan.', url: 'https://tuigarden.co.nz/inspiration-hub/ideas-and-inspiration/butterfly-guide/', img: 'https://tuigarden.co.nz/media/1917/monarch_butterfly_websitejpg.jpg' },
  ] },
  rss('mo-trust', 'monarch', 'Moths & Butterflies of NZ Trust (Monarch Trust)', 'https://www.nzbutterflies.org.nz/feed/', { int: ['Monarch butterflies'], max: 3, notWant: MO_NOT }),
  pg('mo-trust-guides', 'monarch', 'NZ Butterfly Trust – how-to guides', 'https://www.nzbutterflies.org.nz/sitemap-post-type-post.xml', /nzbutterflies\.org\.nz\/[a-z0-9-]*(monarch|swan|caterpillar|chrysalis|tag|wasp|milkweed|habitat|garden|helping|plant)[a-z0-9-]*\/$/, { sitemap: true, rotate: true, int: ['Monarch butterflies'], max: 4, notWant: MO_NOT, trim: /\s*[-–|]\s*Moths and Butterflies of New Zealand.*$/i }),
  { id: 'mo-ev', topic: 'monarch', kind: 'efrss', name: 'Butterfly & pollinator events (Eventfinda)', event: true, evDays: 60, int: ['Monarch butterflies'], urls: EF_FEEDS, want: /\b(butterfl\w*|monarchs?|swan plants?|pollinators?|bee & butterfly|insect)\b/i, max: 4 },
  { id: 'candy-tips', topic: 'candy', kind: 'static', name: 'Candy Crush tips', int: ['Candy Crush tips'], max: 5, at: Date.parse('2026-11-01T15:30:00+13:00'), items: [
    { t: '🍬 The special candies – and how to make them', s: 'Match 4 in a line for a Striped candy, 5 in an L or T for a Wrapped candy, 5 in a straight line for a Colour Bomb, and a 2×2 square for a Fish. King’s own help page explains each one.', url: 'https://candycrush.zendesk.com/hc/en-us/articles/211939685-How-can-I-create-Special-Candies', img: 'https://i.ytimg.com/vi/NJ6Ag7maDkM/hqdefault.jpg' },
    { t: '💥 Swap two specials together for the big combos', s: 'Striped + Wrapped clears 3 rows and 3 columns; Colour Bomb + Striped turns a whole colour into striped candies; Colour Bomb + Colour Bomb clears the board. This video shows every combination.', url: 'https://www.youtube.com/watch?v=HPzLSpPpQcU', img: 'https://i.ytimg.com/vi/HPzLSpPpQcU/hqdefault.jpg' },
    { t: '⬇️ Play from the bottom and look 2–3 moves ahead', s: 'Matches low on the board make everything above fall, which sets off free cascades. Before each move, check what the board will look like after it lands.', url: 'https://candycrushsaga.wiki/guide/candy-crush-saga-tips-and-tricks', img: 'https://candycrushsaga.wiki/images/hero.webp' },
    { t: '🧰 Save your boosters for the levels that need them', s: 'Don’t spend Lollipop Hammers and Colour Bombs on easy levels – keep them for the hard and super-hard ones, and use them where a blocker is holding you up.', url: 'https://www.youtube.com/watch?v=YXOYf6yZ5kQ', img: 'https://i.ytimg.com/vi/YXOYf6yZ5kQ/hqdefault.jpg' },
    { t: '🎯 Hard level? Play to the level type', s: 'Jelly levels: aim for the jelly in corners and edges first. Ingredient levels: clear the columns under the cherries and nuts. Orders: make the specials the order asks for. Guide to the notorious levels.', url: 'https://candycrushsaga.wiki/guide/candy-crush-saga-hard-level', img: 'https://i.ytimg.com/vi/6QzQep5RF6c/hqdefault.jpg' },
  ] },
  pg('candy-wiki', 'candy', 'Candy Crush Saga Wiki (guides)', 'https://candycrushsaga.wiki/sitemap.xml', /candycrushsaga\.wiki\/(guide|boosters|levels|events)\/[a-z0-9-]+$/, { sitemap: true, int: ['Candy Crush tips'], max: 4, trim: /\s*[—|–-]\s*Candy Crush Saga Wiki.*$/i }),
  yt('candy-yt-lover', 'candy', 'Candy Crush Lover (walkthroughs)', 'UCJ6otktvaauM3_I41ciDgxw', { int: ['Candy Crush tips'], max: 3, want: /candy crush/i }),
  yt('candy-yt-levels', 'candy', 'Candy Crush Levels (walkthroughs)', 'UCFUAgiyZd_ElymT3AZ72OBg', { int: ['Candy Crush tips'], max: 3, want: /candy crush/i }),
  // 1.9.1 🐾 Cute & funny pets (opt-in; Monique). Happy content only: anything sad, hurt, sick or an appeal is left out.
  rd('pets-aww', 'pets', 'aww', { imagesOnly: true, int: ['Cute & funny pets'], max: 4, notWant: PETS_NOT, mood: 'calm' }),
  rd('pets-eyebleach', 'pets', 'Eyebleach', { imagesOnly: true, int: ['Cute & funny pets'], max: 3, notWant: PETS_NOT, mood: 'calm' }),
  rd('pets-derps', 'pets', 'AnimalsBeingDerps', { imagesOnly: true, int: ['Cute & funny pets'], max: 3, notWant: PETS_NOT }),
  rd('pets-cats', 'pets', 'catpictures', { imagesOnly: true, int: ['Cute & funny pets'], max: 3, notWant: PETS_NOT, mood: 'calm' }),
  // 1.9.27 🐴 cute horses (and foals) for Miracle: wholesome photos only – never racing or competitions, never anything sad
  rd('pets-horses', 'pets', 'Horses', { imagesOnly: true, int: ['Horses'], max: 4, mood: 'calm', showOk: true, notWant: new RegExp(PETS_NOT.source + '|\\b(rac(e|es|ing)|racehorse|derby|cup|show ?jump\\w*|dressage|eventing|competition|compete\\w*|rodeo|polo|ribbon|placed|vet|colic|lame|abscess|laminitis|x-?ray|sweat\\w*|help|advice|question|rant|vent)\\b', 'i') }),
  rd('pets-horsepics', 'pets', 'horsepics', { imagesOnly: true, int: ['Horses'], max: 3, mood: 'calm', showOk: true, notWant: PETS_NOT }),
  yt('pets-yt-spca', 'pets', 'SPCA New Zealand', 'UCnupXHAuE82cCmmDBJMYaRQ', { int: ['Cute & funny pets'], max: 2, notWant: PETS_NOT }),
  yt('pets-yt-dodo', 'pets', 'The Dodo', 'UCINb0wqPz-A0dV9nARjJlOQ', { int: ['Cute & funny pets'], max: 3, notWant: PETS_NOT, want: /funny|cute|silly|best friends?|play\w*|zoomies|goofy|derp|happy|adorable|loves?|puppy|kitten/i }),
  yt('pets-yt-weratedogs', 'pets', 'WeRateDogs', 'UC5JWr3uyRSVcoUSk41-qkSw', { int: ['Cute & funny pets'], max: 2, notWant: PETS_NOT }),
  // 1.8.6 special pinned card for everyone (whatever their interests): checks the listing for postponed/cancelled each run
  { id: 'special-fw-wgr', topic: 'events', kind: 'special', name: 'Whangārei Fireworks Spectacular', until: Date.parse('2026-11-14T23:59:00+13:00'),
    page: 'https://www.eventfinda.co.nz/2026/whangarei-fireworks-spectacular/whangarei',
    item: { id: 'fw2026wgr', t: 'Whangārei Fireworks Spectacular 🎆', s: 'Family night with live music, local performers, activities for all ages and food stalls – bring a picnic blanket. Fireworks at about 8:45pm. Tickets on the listing (under-5s free). Organised by Whangārei Lions & Northland Events Centre for local charities.', where: 'Semenoff Stadium, 51 Okara Drive, Whangārei', url: 'https://www.eventfinda.co.nz/2026/whangarei-fireworks-spectacular/whangarei', url2: 'https://www.northlandeventscentre.co.nz/', img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Colourful_Fireworks_Expanding_Across_the_Night_Sky.jpg?width=1200', ev: Date.parse('2026-11-07T18:00:00+13:00'), end: Date.parse('2026-11-07T21:00:00+13:00'), show: Date.parse('2026-11-07T20:45:00+13:00'), credit: 'Photo: Jalfyn Benging, CC BY 4.0' } },
  // ---- 1.8.5 🔮 Tarot (calm; deck art is filtered strictly: cards usually drawn nude are left out, as are nude/erotic words) ----
  rss('tarot-biddy', 'tarot', 'Biddy Tarot', 'https://www.biddytarot.com/feed/', { int: ['Tarot meanings'], max: 3, mood: 'calm', notWant: TAROT_NOT }),
  rss('tarot-labyrinthos', 'tarot', 'Labyrinthos (card meanings)', 'https://labyrinthos.co/blogs/tarot-card-meanings-list.atom', { int: ['Tarot meanings'], max: 3, mood: 'calm', notWant: TAROT_NOT }),
  rss('tarot-tarotlady', 'tarot', 'The Tarot Lady', 'https://www.thetarotlady.com/feed/', { int: ['Tarot meanings'], max: 3, mood: 'calm', notWant: TAROT_NOT }),
  yt('tarot-yt-biddy', 'tarot', 'Biddy Tarot (videos)', 'UCTJvFR_RtuvgQQ2_1ubSbUw', { int: ['Tarot meanings'], max: 2, mood: 'calm', notWant: TAROT_NOT }),
  yt('tarot-yt-tarotlady', 'tarot', 'The Tarot Lady (videos)', 'UCmVjlt75V7xlI064Fw9KK0A', { int: ['Tarot meanings'], max: 2, mood: 'calm', notWant: TAROT_NOT }),
  rd('tarot-rd', 'tarot', 'tarot', { imagesOnly: true, int: ['Tarot decks & art'], max: 4, mood: 'calm', notWant: TAROT_NOT }),
  // 1.9.67 💎 crystals & gemstones for Monique (under her 🔮 topic): crystal meanings, pretty specimens and collections
  rss('crys-vaults', 'tarot', 'Crystal Vaults (crystal meanings)', 'https://www.crystalvaults.com/feed/', { int: ['Crystals & gemstones'], max: 3, mood: 'calm', notWant: /\$|sale|deal|price|coupon|discount|shop now|giveaway/i }),
  rd('crys-rd', 'tarot', 'Crystals', { imagesOnly: true, int: ['Crystals & gemstones'], max: 4, mood: 'calm', notWant: TAROT_NOT }),
  rd('crys-rd-gem', 'tarot', 'Gemstones', { imagesOnly: true, int: ['Crystals & gemstones'], max: 3, mood: 'calm', notWant: TAROT_NOT }),
  rd('tarot-rd-decks', 'tarot', 'TarotDecks', { imagesOnly: true, url: 'https://www.reddit.com/r/TarotDecks/top/.rss?t=week', int: ['Tarot decks & art'], max: 3, mood: 'calm', notWant: TAROT_NOT }),
  // ---- 1.8.3 🧶 Knitting & crafts (calm, for cosy evenings) ----
  yt('cr-yt-verypink', 'craft', 'VeryPink Knits', 'UCrRT4LwemxYrZxj-HeCkK9Q', { int: ['Knitting'], max: 3, mood: 'calm' }),
  yt('cr-yt-bellacoco', 'craft', 'Bella Coco Crochet', 'UCQEzmjboJ_6-uG8-1j4coNw', { int: ['Crochet'], max: 3, mood: 'calm' }),
  yt('cr-yt-sheepstitch', 'craft', 'Sheep & Stitch', 'UCXK_Yw8hCF-9oeccQP9Gs2g', { int: ['Knitting'], max: 3, mood: 'calm' }),
  yt('cr-yt-studioknit', 'craft', 'Studio Knit', 'UCt4Ji-LhlVdyrAXn3z2UTpQ', { int: ['Knitting'], max: 3, mood: 'calm' }),
  yt('cr-yt-jennifermaker', 'craft', 'Jennifer Maker (card making & paper crafts)', 'UCAaLvz5xOyGDQ5Kun16D7zw', { int: ['Paper crafts'], max: 3, mood: 'calm' }),
  rss('cr-ohhappyday', 'craft', 'Oh Happy Day (craft ideas)', 'https://www.ohhappyday.com/feed/', { int: ['Paper crafts'], max: 3, mood: 'calm' }),
  rd('cr-rd-knitting', 'craft', 'knitting', { imagesOnly: true, int: ['Knitting'], max: 5, mood: 'calm' }),
  rd('cr-rd-crochet', 'craft', 'crochet', { imagesOnly: true, int: ['Crochet'], max: 5, mood: 'calm', want: /pattern|free|tip|how|tutorial|guide|chart|technique|beginner|stitch|magic ring|decrease|safety eyes|colou?r change|granny|amigurumi|cardigan|top|bralette|bag|ornament|christmas/i }),
  // 1.9.27 🧶 crochet & amigurumi for Monique and Cass: free patterns, how-tos and techniques (pattern photos), not showcase posts
  rss('cr-sarahmaker', 'craft', 'Sarah Maker (free crochet patterns)', 'https://sarahmaker.com/feed/', { int: ['Crochet'], max: 4, mood: 'calm', notWant: /\$|sale|deal|price|earn|money/i }),
  rss('cr-moogly', 'craft', 'Moogly (free crochet patterns & tutorials)', 'https://www.mooglyblog.com/feed/', { int: ['Crochet'], max: 3, mood: 'calm', notWant: /\$|sale|deal|price|earn|money|giveaway/i }),
  rss('cr-crochetkingdom', 'craft', 'Crochet Kingdom (free patterns)', 'https://www.crochetkingdom.com/feed/', { int: ['Crochet'], max: 3, mood: 'calm', notWant: /\$|sale|deal|price|earn|money/i }),
  rd('cr-rd-amigurumi', 'craft', 'Amigurumi', { imagesOnly: true, int: ['Crochet'], max: 4, mood: 'calm', want: /pattern|free|tip|how|tutorial|guide|chart|technique|beginner|magic ring|decrease|safety eyes|colou?r change|tester|release/i }),
  rd('cr-rd-crafts', 'craft', 'crafts', { imagesOnly: true, int: ['Crafts'], max: 4, mood: 'calm' }),
  rd('cr-rd-quilting', 'craft', 'quilting', { imagesOnly: true, int: ['Sewing & quilting'], max: 3, mood: 'calm' }),
  rd('cr-rd-embroidery', 'craft', 'Embroidery', { imagesOnly: true, int: ['Embroidery'], max: 3, mood: 'calm' }),
  rd('cr-rd-sewing', 'craft', 'sewing', { imagesOnly: true, int: ['Sewing & quilting'], max: 3, mood: 'calm' }),
  rd('cr-rd-papercraft', 'craft', 'papercraft', { imagesOnly: true, int: ['Paper crafts'], max: 3, mood: 'calm' }),
  rd('cr-rd-cardmaking', 'craft', 'cardmaking', { imagesOnly: true, int: ['Paper crafts'], max: 3, mood: 'calm' }),
  { id: 'cr-ev', topic: 'craft', kind: 'efrss', event: true, evDays: 60, urls: EF_FEEDS, name: 'Craft & knitting events · Northland & Auckland', want: /knit|crochet|yarn|wool|craft|sewing|quilt|embroider|card making|scrapbook|stitch|weav(e|ing)|felting|macram/i, notWant: /tavern|bar\b|pub\b|wine|beer|R18|sport/i, int: ['Crafts'], max: 5, mood: 'calm' },
  // ---- 1.9.37 🎬 videos beyond YouTube: Reddit's own clips from wholesome subs, and short Vimeo Staff Picks (they play in the card)
  rd('vid-mademesmile', 'kids', 'MadeMeSmile', { imagesOnly: true, videosOnly: true, int: ['Feel-good videos'], max: 3, mood: 'calm', notWant: new RegExp(PETS_NOT.source + '|\\b(trump|biden|election|politic\\w*|war|police|cop|arrest\\w*|hospital|funeral|donat\\w*|gofundme|\\$)', 'i') }),
  rd('vid-animalsbros', 'pets', 'AnimalsBeingBros', { imagesOnly: true, videosOnly: true, int: ['Cute & funny pets'], max: 3, mood: 'calm', notWant: PETS_NOT }),
  rd('vid-rarepuppers', 'pets', 'rarepuppers', { imagesOnly: true, int: ['Dogs'], max: 3, mood: 'calm', notWant: PETS_NOT }),
  rd('vid-startledcats', 'pets', 'StartledCats', { imagesOnly: true, videosOnly: true, int: ['Cats'], max: 2, notWant: PETS_NOT }),
  rss('vid-vimeo-staff', 'creative', 'Vimeo Staff Picks (short films)', 'https://vimeo.com/channels/staffpicks/videos/rss', { max: 3, maxSec: 420, mood: 'calm', notWant: /\b(war|death|dead|dying|kill\w*|murder|grief|funeral|abuse|violence|blood|horror|nude|naked|sex\w*|drugs?|addict\w*|suicide|cancer|refugee|prison)\b/i }),
  // ---- 1.9.37 🐘 public social posts via official public feeds only (Mastodon hashtag RSS): pictures stay on the poster's server,
  // each card credits and links back to the original post. (TikTok, Facebook, Instagram and Pinterest have no free public discovery feed.)
  rss('soc-mast-crochet', 'craft', 'Mastodon #crochet', 'https://mastodon.social/tags/crochet.rss', { int: ['Crochet'], max: 3, mood: 'calm', social: 1, notWant: /\b(nsfw|nude|naked|lewd|porn\w*|sex\w*|onlyfans|boost|commission|for sale|shop|etsy|\$|price|sale|politic\w*|trump|elect\w*|war|died|death|rip|vet bills?|gofundme|donat\w*)\b|#(nsfw|lewd)/i }),
  rss('soc-mast-caturday', 'pets', 'Mastodon #caturday', 'https://mastodon.social/tags/caturday.rss', { int: ['Cats'], max: 3, mood: 'calm', social: 1, notWant: /\b(nsfw|nude|naked|lewd|porn\w*|sex\w*|onlyfans|boost|commission|for sale|shop|etsy|\$|price|sale|politic\w*|trump|elect\w*|war|died|death|rip|vet bills?|gofundme|donat\w*)\b|#(nsfw|lewd)/i }),
  rss('soc-mast-dogs', 'pets', 'Mastodon #dogsofmastodon', 'https://mastodon.social/tags/dogsofmastodon.rss', { int: ['Dogs'], max: 3, mood: 'calm', social: 1, notWant: /\b(nsfw|nude|naked|lewd|porn\w*|sex\w*|onlyfans|boost|commission|for sale|shop|etsy|\$|price|sale|politic\w*|trump|elect\w*|war|died|death|rip|vet bills?|gofundme|donat\w*)\b|#(nsfw|lewd)/i }),
  rss('soc-mast-horses', 'pets', 'Mastodon #horses', 'https://mastodon.social/tags/horses.rss', { int: ['Horses'], max: 3, mood: 'calm', social: 1, notWant: new RegExp(/\b(nsfw|nude|naked|lewd|porn\w*|sex\w*|onlyfans|boost|commission|for sale|shop|etsy|\$|price|sale|politic\w*|trump|elect\w*|war|died|death|rip|vet bills?|gofundme|donat\w*)\b|#(nsfw|lewd)/i.source + '|\\b(rac(e|es|ing)|racehorse|derby|cup)\\b', 'i') }),
  // ---- 1.9.39 🎥 Vlogs: upbeat, family-friendly video blogs (NZ first), shown to everyone 1–2 a day, matched to each person
  yt('vlog-nz-horton', 'vlogs', 'Horton Adventures (NZ van life)', 'UCzIMi0ttew2y6GUyZ9X-V8A', { vt: 'travel,nz,outdoors,dogs', nz: 1, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-nz-camandre', 'vlogs', 'Cam & Andre (NZ motorhome + 2 cats)', 'UCAacs9RMHZhH3do9l1_JlAw', { vt: 'travel,nz,pets', nz: 1, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-nz-leopards', 'vlogs', 'Leopards Go Wild (NZ family caravan)', 'UCOwkQctUEEnGuqM8AsIQYZg', { vt: 'travel,nz,kids,parent', nz: 1, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-nz-rosy', 'vlogs', 'Adventures with Rosy (Taupō family)', 'UCcx5kaJlEB6QNsBuVfOwOOw', { vt: 'travel,nz,kids,parent,diy', nz: 1, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-nz-caravan', 'vlogs', 'Caravan Life NZ', 'UCzIrVyDrFFn8wtsEVvIP-eg', { vt: 'travel,nz,outdoors', nz: 1, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-tucker', 'vlogs', 'Tucker Budzyn (golden retriever)', 'UCNSzfesc7IgWZwg4n6uXr1A', { vt: 'dogs,pets,kids', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-dodo', 'vlogs', 'The Dodo', 'UCINb0wqPz-A0dV9nARjJlOQ', { vt: 'pets,dogs,kids', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-esme', 'vlogs', 'This Esme (horses)', 'UCyvB6v89RVGuU1-9fvB73zQ', { vt: 'pets,horses,ya', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-epicgarden', 'vlogs', 'Epic Gardening', 'UCSbyncU597LMwb3HhnAI_4w', { vt: 'garden', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-huw', 'vlogs', 'Huw Richards (garden)', 'UCeaKRrrpWiQFJJmiuon2WoQ', { vt: 'garden,parent', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-bellacoco', 'vlogs', 'Bella Coco Crochet', 'UCQEzmjboJ_6-uG8-1j4coNw', { vt: 'craft,creative', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-tlyarn', 'vlogs', 'TL Yarn Crafts', 'UCkO8yHEMmbvuw9Dgmuvwhsw', { vt: 'craft,creative', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-renovision', 'vlogs', 'Home RenoVision DIY', 'UCnorhjQR4zJkT7AVNhu395Q', { vt: 'diy', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-fixthis', 'vlogs', 'Fix This Build That', 'UCHYSw4XKO_q1GaChw5pxa-w', { vt: 'diy', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-karanate', 'vlogs', 'Kara and Nate (travel)', 'UC4ijq8Cg-8zQKx8OH12dUSw', { vt: 'travel,ya,food', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-holderness', 'vlogs', 'The Holderness Family (comedy)', 'UCl2axinLKd00nMBW6RTASag', { vt: 'sitcoms,parent,kids', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-gmm', 'vlogs', 'Good Mythical Morning', 'UC4PooiX37Pld1T8J5SYT-SQ', { vt: 'sitcoms,food,teen,ya', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-rober', 'vlogs', 'Mark Rober (fun science)', 'UCY1kMZp36IQSyNx_9h4mpCg', { vt: 'science,kids,teen', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  // ---- 1.9.40 🚢 cruise vlogs (AU first – they sail from Sydney/Brisbane to NZ) and 👨‍👩‍👧‍👦 big-family vlogs: for whoever likes them (Sarah)
  yt('vlog-cruise-latesail', 'vlogs', 'Late to the Sail Away (AU cruises, Paul & Lee)', 'UC6dyZhFeR6oLOPuPGxGnB-Q', { vt: 'cruise,travel', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-cruise-debmatt', 'vlogs', 'Deb & Matt Chat (AU cruises)', 'UCkkooiiWwxMsEKnjG6xi_2Q', { vt: 'cruise,travel', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-cruise-emma', 'vlogs', 'Emma Cruises', 'UCu4C8c3h9SKdkxnOwIAiHeA', { vt: 'cruise,travel', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-cruise-tips', 'vlogs', 'Tips For Travellers (cruise)', 'UC_qE-Obs2ocdmPXY0TIU-cw', { vt: 'cruise,travel', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-cruise-kids', 'vlogs', 'Cruising with Kids', 'UCW-hrrgJOcSBRRFkE7LIUuA', { vt: 'cruise,famvlog,travel,kids', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-fam-ace', 'vlogs', 'The ACE Family', 'UCWwWOFsW68TqXE-HZLC3WIA', { vt: 'famvlog,parent', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  yt('vlog-fam-fizz', 'vlogs', 'Family Fizz', 'UCeJICuSKNGMVQbAAzH6DcAw', { vt: 'famvlog,kids,parent', nz: 0, notWant: /\b(sponsor\w*|giveaway|money|invest\w*|crypto|stock market|income|salary|\$\d|bikini|nude|naked|sexy|prank\w*|scar(y|iest)|horror|died|death|funeral|cancer|hospital|surgery|divorce|breakup|politic\w*|trump|rugby|football|soccer|nba|nfl|cricket|race day|racing|sale|haul|unboxing|review)\b/i }),
  // ---- 1.9.69 🌍📸 weird & funny map sights: one picture per card, a few each day, credited to the article; plus the ongoing Reddit finds
  { id: 'map-gsv', topic: 'games', kind: 'drip', drip: 3, name: 'JournoHQ · funny Google Street View', url: 'https://www.journohq.com/blog/48-weird-and-funny-images-caught-on-google-maps-street-view/', items: GSV, max: 3 },
  { id: 'map-gearth', topic: 'learn', kind: 'drip', drip: 2, name: 'Live Science · strange sights on Google Earth', url: 'https://www.livescience.com/28828-10-strangest-sights-google-earth.html', items: GEARTH, max: 2 },
  rd('map-rd-shen', 'games', 'googlemapsshenanigans', { imagesOnly: true, max: 2, notWant: FUN_NOT }),
  rd('map-rd-earth', 'learn', 'GoogleEarthFinds', { imagesOnly: true, max: 2, notWant: FUN_NOT }),
  // ---- 1.9.55 😄 more funny & interesting things to choose from (each capped so they mix in rather than flood)
  rss('fun-goodnews', 'learn', 'Good News Network', 'https://www.goodnewsnetwork.org/feed/', { max: 3, mood: 'calm', notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  rss('fun-positive', 'learn', 'Positive News', 'https://www.positive.news/feed/', { max: 2, mood: 'calm', notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  rss('fun-futility', 'learn', 'Futility Closet (curiosities)', 'https://www.futilitycloset.com/feed/', { max: 2, notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  // ---- 1.9.104 🍝 easy weeknight meals (Nicolle): dinners only, no baking or drinks
  rss('ml-chelsea', 'meals', 'Chelsea Winter (NZ)', 'https://www.chelseawinter.co.nz/feed/', { max: 3, notWant: new RegExp(/\b(cake|cookies?|brownies?|muffins?|slice|dessert|pudding|pie crust|cocktail|margarita|drinks?|smoothie|bagels?|seasoning|sauce recipe|jam|icing|frosting|fudge|truffles?|candy|wine|beer|vodka|thanksgiving|turkey)\b/i.source + '|' + FUN_NOT.source, 'i') }),
  rss('ml-tin', 'meals', 'RecipeTin Eats', 'https://www.recipetineats.com/feed/', { max: 3, notWant: new RegExp(/\b(cake|cookies?|brownies?|muffins?|slice|dessert|pudding|pie crust|cocktail|margarita|drinks?|smoothie|bagels?|seasoning|sauce recipe|jam|icing|frosting|fudge|truffles?|candy|wine|beer|vodka|thanksgiving|turkey)\b/i.source + '|' + FUN_NOT.source, 'i') }),
  rss('ml-sanct', 'meals', "Nicky's Kitchen Sanctuary", 'https://www.kitchensanctuary.com/feed/', { max: 3, notWant: new RegExp(/\b(cake|cookies?|brownies?|muffins?|slice|dessert|pudding|pie crust|cocktail|margarita|drinks?|smoothie|bagels?|seasoning|sauce recipe|jam|icing|frosting|fudge|truffles?|candy|wine|beer|vodka|thanksgiving|turkey)\b/i.source + '|' + FUN_NOT.source, 'i') }),
  rss('ml-wellplated', 'meals', 'Well Plated', 'https://www.wellplated.com/feed/', { max: 3, notWant: new RegExp(/\b(cake|cookies?|brownies?|muffins?|slice|dessert|pudding|pie crust|cocktail|margarita|drinks?|smoothie|bagels?|seasoning|sauce recipe|jam|icing|frosting|fudge|truffles?|candy|wine|beer|vodka|thanksgiving|turkey)\b/i.source + '|' + FUN_NOT.source, 'i') }),
  rss('ml-budget', 'meals', 'Budget Bytes', 'https://www.budgetbytes.com/feed/', { max: 3, notWant: new RegExp(/\b(cake|cookies?|brownies?|muffins?|slice|dessert|pudding|pie crust|cocktail|margarita|drinks?|smoothie|bagels?|seasoning|sauce recipe|jam|icing|frosting|fudge|truffles?|candy|wine|beer|vodka|thanksgiving|turkey)\b/i.source + '|' + FUN_NOT.source, 'i') }),
  // ---- 1.9.103 🗣️ Google & Alexa AI, 🏠 smart home, 💡 new innovations (mostly for Shane)
  rss('ai-google', 'aiassist', 'Google AI blog', 'https://blog.google/technology/ai/rss/', { max: 3, notWant: FUN_NOT }),
  rss('ai-gemini', 'aiassist', 'Google Gemini news', 'https://blog.google/products/gemini/rss/', { max: 2, notWant: FUN_NOT }),
  rss('ai-alexa', 'aiassist', 'Amazon devices & Alexa news', 'https://www.aboutamazon.com/news/devices/feed', { max: 3, notWant: FUN_NOT }),
  rss('ai-verge-alexa', 'aiassist', 'The Verge · Alexa', 'https://www.theverge.com/rss/amazon-alexa/index.xml', { max: 3, notWant: FUN_NOT }),
  rss('ai-9to5g', 'aiassist', '9to5Google', 'https://9to5google.com/feed/', { max: 3, want: /\b(gemini|google assistant|ai|nest|pixel|home)\b/i, notWant: FUN_NOT }),
  rss('sh-verge', 'smart', 'The Verge · Smart home', 'https://www.theverge.com/rss/smart-home/index.xml', { max: 4, notWant: FUN_NOT }),
  rss('sh-techradar', 'smart', 'TechRadar · Smart home', 'https://www.techradar.com/rss/news/smart-home', { max: 4, notWant: FUN_NOT }),
  rss('in-ie', 'innov', 'Interesting Engineering', 'https://interestingengineering.com/feed', { max: 4, notWant: FUN_NOT }),
  rss('in-yanko', 'innov', 'Yanko Design', 'https://www.yankodesign.com/feed/', { max: 3, notWant: FUN_NOT }),
  rss('in-designboom', 'innov', 'designboom · technology', 'https://www.designboom.com/technology/feed/', { max: 3, notWant: FUN_NOT }),
  rss('fun-newatlas', 'tech', 'New Atlas (cool inventions)', 'https://newatlas.com/index.rss', { max: 3, notWant: new RegExp(/\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i.source + '|\\b(military|missile|weapon\\w*|drone strike|tank)\\b', 'i') }),
  rss('fun-boredpanda', 'games', 'Bored Panda (funny & interesting)', 'https://www.boredpanda.com/feed/', { max: 3, notWant: new RegExp(/\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i.source + '|\\b(tattoo\\w*|body|weight|fat|ugly|cringe|rude|creepy|scary|horror|karen|entitled|reddit users|people (share|reveal)|celebrit\\w*|exes?|husband|wife|boyfriend|girlfriend|wedding)\\b', 'i') }),
  rss('fun-laughingsquid', 'games', 'Laughing Squid (fun finds)', 'https://laughingsquid.com/feed/', { max: 2, notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  rd('fun-mildlyinteresting', 'games', 'mildlyinteresting', { imagesOnly: true, max: 3, notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  rd('fun-oddlysatisfying', 'creative', 'oddlysatisfying', { imagesOnly: true, max: 3, mood: 'calm', notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  rd('fun-illusions', 'games', 'opticalillusions', { imagesOnly: true, max: 2, notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  rd('fun-animalderps', 'nature', 'AnimalsBeingDerps', { imagesOnly: true, max: 3, int: ['Cute & funny pets'], notWant: new RegExp(/\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i.source + '|\\b(horse rac\\w*|racehorse|jockey)\\b', 'i') }),
  rd('fun-uplifting', 'learn', 'UpliftingNews', { imagesOnly: true, max: 2, mood: 'calm', notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  yt('fun-kurzgesagt', 'science', 'Kurzgesagt – In a Nutshell', 'UCsXVk37bltHxD1rDPwtNM8Q', { notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  yt('fun-stevemould', 'science', 'Steve Mould (clever science)', 'UCEIwxahdLz7bap-VDs9h35A', { notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  yt('fun-smarter', 'science', 'SmarterEveryDay', 'UC6107grRI4m0o2-emgoDnAA', { notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  yt('fun-simonscat', 'sitcoms', "Simon's Cat (cartoon comedy)", 'UCH6vXjt-BA7QHl0KnfL-7RQ', { notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),
  yt('fun-primitive', 'diy', 'Primitive Technology', 'UCAL3JXZSzSm8AlZyD3nQdBA', { notWant: /\b(nsfw|nude|naked|sex\w*|lingerie|bikini|onlyfans|porn|boob\w*|butt|drunk|beer|wine|vodka|drugs?|weed|cannabis|died|death|dead|kill\w*|murder|shoot\w*|gun|war|crash|injur\w*|hospital|cancer|funeral|abuse|police|arrest\w*|prison|trump|biden|elect\w*|politic\w*|rugby|football|soccer|cricket|nba|nfl|golf|tennis|olympic\w*|racing|race|bet\w*|casino|lottery|crypto|bitcoin|stocks?|invest\w*|money|\$\d|price|sale|deal|discount|buy|shop\w*|sponsor\w*|giveaway|tinder|dating|divorce|cheat\w*|wtf|f\*+|sh\*t)\b/i }),

  // ---- 1.9.84 🎉 more fun for everyone: funny animals, sitcom clips, wow pictures, amazing facts, Northland good news ----
  yt('fun-petcoll', 'dogs', 'The Pet Collective', 'UCPIvT-zcQl2H0vabdXJGcpg', { max: 5, mood: 'calm', want: /funny|cute|adorable|hilarious|best|compilation|fails?|pets?|dog|cat|puppy|kitten|happy/i, notWant: PETS_NOT }),
  yt('fun-dodo-all', 'nature', 'The Dodo (animals)', 'UCINb0wqPz-A0dV9nARjJlOQ', { max: 5, mood: 'calm', want: /funny|cute|adorable|best friends?|play|happy|rescued?|reunion|kitten|puppy|bird|wildlife/i, notWant: PETS_NOT }),
  rd('fun-aww', 'dogs', 'aww', { imagesOnly: true, max: 4, mood: 'calm', notWant: PETS_NOT }),
  rd('fun-eyebleach', 'nature', 'Eyebleach', { imagesOnly: true, max: 3, mood: 'calm', notWant: PETS_NOT }),
  rd('fun-likeus', 'nature', 'LikeUs', { imagesOnly: true, max: 3, mood: 'calm', notWant: PETS_NOT }),
  rd('fun-funnyanimals', 'pets', 'FunnyAnimals', { imagesOnly: true, videosOnly: true, max: 4, int: ['Cute & funny pets'], mood: 'calm', notWant: PETS_NOT }),
  yt('fun-threenow', 'sitcoms', 'Three / ThreeNow', 'UCFeSHqNM3900oYKo9BZMUVw', { max: 3, want: /clip|comedy|funny|trailer|best|scene|taskmaster/i, notWant: /news|sport|rugby|cricket|election|politic/i }),
  rss('fun-mymodernmet', 'creative', 'My Modern Met (wow art & design)', 'https://mymodernmet.com/feed/', { max: 4, mood: 'calm', int: ['Art', 'Design'], notWant: FUN_NOT }),
  rss('fun-wikipotd', 'nature', 'Wikimedia Picture of the Day', 'https://commons.wikimedia.org/w/api.php?action=featuredfeed&feed=potd&feedformat=atom', { max: 2, mood: 'calm' }),
  rss('fun-wikiotd', 'learn', 'Wikipedia On this day', 'https://en.wikipedia.org/w/api.php?action=featuredfeed&feed=onthisday&feedformat=atom', { max: 2, notWant: FUN_NOT }),
  rss('fun-mentalfloss2', 'learn', 'Mental Floss (amazing facts)', 'https://www.mentalfloss.com/posts.rss', { max: 4, int: ['Trivia', 'History'], notWant: FUN_NOT }),
  rd('fun-interestingasfuck', 'learn', 'interestingasfuck', { imagesOnly: true, max: 4, notWant: FUN_NOT }),
  rd('fun-beamazed', 'learn', 'BeAmazed', { imagesOnly: true, max: 3, notWant: FUN_NOT }),
  // 1.9.93 ⏱ short ad-free clips for the stories row (Reddit's own videos, under 30s picked in the app)
  rd('sv-derps', 'pets', 'AnimalsBeingDerps', { videosOnly: true, max: 6, mood: 'calm', notWant: PETS_NOT }),
  rd('sv-bros', 'pets', 'AnimalsBeingBros', { videosOnly: true, max: 5, mood: 'calm', notWant: PETS_NOT }),
  rd('sv-funnyanimals', 'pets', 'AnimalsBeingFunny', { videosOnly: true, max: 5, mood: 'calm', notWant: PETS_NOT }),
  rd('sv-unexpected', 'learn', 'Unexpected', { videosOnly: true, max: 5, notWant: FUN_NOT }),
  rd('sv-maybe', 'learn', 'maybemaybemaybe', { videosOnly: true, max: 4, notWant: FUN_NOT }),
  rd('sv-laugh', 'learn', 'ContagiousLaughter', { videosOnly: true, max: 4, notWant: FUN_NOT }),
  rd('sv-smile', 'learn', 'MadeMeSmile', { videosOnly: true, max: 4, notWant: FUN_NOT }),
  rd('sv-oddly', 'learn', 'oddlysatisfying', { videosOnly: true, max: 4, notWant: FUN_NOT }),
  rd('sv-dogs', 'dogs', 'WhatsWrongWithYourDog', { videosOnly: true, max: 4, mood: 'calm', notWant: PETS_NOT }),
  rd('sv-cats', 'pets', 'catsareliquid', { videosOnly: true, max: 3, mood: 'calm', notWant: PETS_NOT }),
  // Northland / Whangārei good news & outdoors (crime filtered)
  rss('nl-advocate-life', 'nz', 'Northern Advocate · lifestyle', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/lifestyle/?outputType=xml&_website=northern-advocate', { max: 4, nz: 1, notWant: /\/sport\/|crash|fatal|killed|murder|court|sentenced|jailed|charged|election|parliament|politic/i }),
  rss('nl-nzh-northland', 'nz', 'NZ Herald · Northland', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/northland/?outputType=xml', { max: 5, nz: 1, notWant: /\/sport\/|crash|fatal|killed|murder|homicide|stabbing|shooting|court|sentenced|jailed|charged|accused|trial|arrested|ram raid|election|parliament|politic/i }),
  rss('nl-doc-more', 'nature', 'DOC Northland & NZ', 'https://www.doc.govt.nz/news/rss-feed-to-govtnz/', { max: 4, nz: 1, mood: 'calm', want: /northland|whang[aā]rei|bay of islands|kauri|kiwi|track|trail|park|reopen|walk|bird|wildlife|conservation|beach|forest/i }),

  // ---- 1.9.34 🏡 Home & time-saving tips (everyone, rarely: the app shows one every other day at most). Practical how-tos only:
  // organising, decluttering, cleaning shortcuts, laundry, meal prep / lunchboxes and routines. No shopping, sales, product
  // reviews, money/budgets, house tours or 'look at my house' posts. NZ first (Kiwi Families), then AU/US free sites.
  pg('ht-kiwifamilies', 'hometips', 'Kiwi Families (NZ) – home & routines', 'https://www.kiwifamilies.co.nz/post-sitemap2.xml', /kiwifamilies\.co\.nz\/[a-z0-9-]*(chore|routine|lunchbox|tidy|declutter|organi[sz]|clean|laundry|meal-plan|time-sav|morning)[a-z0-9-]*\/$/, { sitemap: true, rotate: true, max: 4, nz: 1, notWant: HT_NOT, trim: /\s*[|–-]\s*Kiwi Families.*$/i }),
  pg('ht-orghw-a', 'hometips', 'The Organised Housewife – cleaning & organising', 'https://theorganisedhousewife.com.au/post-sitemap3.xml', /theorganisedhousewife\.com\.au\/(cleaning|organising)\/[a-z0-9\/-]+\/$/, { sitemap: true, rotate: true, scan: 1700000, max: 5, notWant: HT_NOT, trim: /\s*[|–-]\s*The Organised Housewife.*$/i }),
  pg('ht-orghw-b', 'hometips', 'The Organised Housewife – meal prep & routines', 'https://theorganisedhousewife.com.au/post-sitemap2.xml', /theorganisedhousewife\.com\.au\/(cleaning|organising|meal-planning)\/[a-z0-9\/-]*(clean|declutter|organi[sz]|tidy|storage|laundry|stain|pantry|fridge|freezer|routine|chore|meal-prep|meal-plan|lunchbox|time|quick|tips?|hacks?|ways)[a-z0-9\/-]*\/$/, { sitemap: true, rotate: true, scan: 1700000, max: 5, notWant: HT_NOT, trim: /\s*[|–-]\s*The Organised Housewife.*$/i }),
  rss('ht-organizedhome', 'hometips', 'OrganizedHome (declutter & routines)', 'https://www.organizedhome.com/feed', { max: 4, want: HT_WANT, notWant: HT_NOT }),
  rss('ht-goodhousekeeping', 'hometips', 'Good Housekeeping (cleaning & organising)', 'https://www.goodhousekeeping.com/rss/all.xml/', { max: 3, want: HT_WANT, notWant: HT_NOT }),
  rss('ht-housedigest', 'hometips', 'House Digest (cleaning & storage tips)', 'https://www.housedigest.com/feed/', { max: 3, want: HT_WANT, notWant: HT_NOT }),
  rss('ht-apartmenttherapy', 'hometips', 'Apartment Therapy (organising)', 'https://www.apartmenttherapy.com/main.rss', { max: 3, want: HT_WANT, notWant: HT_NOT }),
  // ---- 1.8.3 🎮 Video gaming, 🎲 Board games, 🐉 Fantasy games (no esports, no gore) ----
  rss('vg-rps', 'vgames', 'Rock Paper Shotgun (PC)', 'https://www.rockpapershotgun.com/feed', { int: ['PC games'], max: 3, notWant: GAME_NOT }),
  rss('vg-siliconera', 'vgames', 'Siliconera', 'https://www.siliconera.com/feed/', { int: ['Nintendo', 'Cosy games'], max: 3, notWant: GAME_NOT }),
  yt('vg-yt-nintendo', 'vgames', 'Nintendo of America', 'UCGIY_O-8vW4rfX98KlMkvRg', { int: ['Nintendo'], max: 3, notWant: GAME_NOT }),
  yt('vg-yt-wholesome', 'vgames', 'Wholesome Games', 'UCKMkV9T20tUOBqwsi5xh7HA', { int: ['Cosy games'], max: 3, mood: 'calm', notWant: GAME_NOT }),
  yt('vg-yt-ninjakiwi', 'vgames', 'Ninja Kiwi (NZ game studio)', 'UC41ZwGKy2KewJvud4p-IXUw', { int: ['Video gaming'], max: 2, notWant: GAME_NOT }),
  rd('vg-rd-switch', 'vgames', 'NintendoSwitch', { imagesOnly: true, int: ['Nintendo'], max: 3, notWant: GAME_NOT }),
  rd('vg-rd-ps5', 'vgames', 'PS5', { imagesOnly: true, int: ['PlayStation & Xbox'], max: 2, notWant: GAME_NOT }),
  rd('vg-rd-xbox', 'vgames', 'xbox', { imagesOnly: true, int: ['PlayStation & Xbox'], max: 2, notWant: GAME_NOT }),
  rd('vg-rd-cozygamers', 'vgames', 'CozyGamers', { imagesOnly: true, int: ['Cosy games'], max: 4, mood: 'calm', notWant: GAME_NOT }),
  rss('bg-dicebreaker', 'boardg', 'Dicebreaker', 'https://www.dicebreaker.com/feed', { int: ['Board game news & nights'], max: 3, notWant: GAME_NOT }),
  rss('bg-bgg', 'boardg', 'BoardGameGeek News', 'https://boardgamegeek.com/rss/blog/1', { int: ['Board game news & nights'], max: 4, notWant: GAME_NOT }),
  yt('bg-yt-suas', 'boardg', 'Shut Up & Sit Down (videos)', 'UCyRhIGDUKdIOw07Pd8pHxCw', { int: ['Board game news & nights'], max: 2, notWant: GAME_NOT }),
  yt('bg-yt-dicebreaker', 'boardg', 'Dicebreaker (videos)', 'UC0jMXccxfvnwXvTpngFwbNA', { int: ['Board game news & nights'], max: 2, notWant: GAME_NOT }),
  yt('bg-yt-watchitplayed', 'boardg', 'Watch It Played (how to play)', 'UCGK9n7svoIjuaQfRIBJXkqQ', { int: ['Board game news & nights'], max: 2, mood: 'calm', notWant: GAME_NOT }),
  { id: 'bg-ev', topic: 'boardg', kind: 'efrss', event: true, evDays: 60, urls: EF_FEEDS, name: 'Board game & tabletop events · Northland & Auckland', want: /board ?games?|tabletop|games? night|game day|dungeons|d&d|role[ -]?play|warhammer|card games?|magic: the gathering|pok[eé]mon tcg|chess club|puzzle/i, notWant: /tavern|R18|esports?|tournament|casino|poker|bingo|quiz night at the/i, int: ['Board game news & nights'], max: 5 },
  rss('fg-gamesradar-tt', 'fantasy', 'GamesRadar+ Tabletop (D&D & RPGs)', 'https://www.gamesradar.com/feeds/tag/tabletop-gaming/', { int: ['D&D & tabletop RPGs'], max: 3, notWant: GAME_NOT }),
  rss('fg-wargamer', 'fantasy', 'Wargamer (Warhammer & D&D)', 'https://www.wargamer.com/feed', { int: ['Warhammer & miniatures', 'D&D & tabletop RPGs'], max: 3, notWant: GAME_NOT }),
  rss('fg-bols', 'fantasy', 'Bell of Lost Souls', 'https://www.belloflostsouls.net/feed', { int: ['Warhammer & miniatures'], max: 3, notWant: GAME_NOT }),
  yt('fg-yt-miniac', 'fantasy', 'Miniac (miniature painting)', 'UCrTkWZb_-iNPzknoQeVkH1g', { int: ['Warhammer & miniatures'], max: 2, mood: 'calm', notWant: GAME_NOT }),
  rd('fg-rd-minipainting', 'fantasy', 'minipainting', { imagesOnly: true, int: ['Warhammer & miniatures'], max: 4, mood: 'calm', notWant: GAME_NOT }),
  rd('fg-rd-battlemaps', 'fantasy', 'battlemaps', { imagesOnly: true, int: ['D&D & tabletop RPGs'], max: 3, notWant: GAME_NOT }),
  rd('fg-rd-zelda', 'fantasy', 'zelda', { imagesOnly: true, int: ['Fantasy video games'], max: 3, notWant: GAME_NOT }),
  rd('fg-rd-bg3', 'fantasy', 'BaldursGate3', { imagesOnly: true, int: ['Fantasy video games'], max: 2, notWant: GAME_NOT }),
  rd('fg-rd-skyrim', 'fantasy', 'skyrim', { imagesOnly: true, int: ['Fantasy video games'], max: 2, notWant: GAME_NOT }),
  rd('rd-coasters', 'travel', 'rollercoasters', { imagesOnly: true, int: ['Theme Parks'], max: 4 })
];

/* 1.6.0: NZ election 2026 (Saturday 7 November). Whangārei candidates (alphabetical, as the Electoral Commission lists them)
   and the six parties Shane named, each given the same kinds of source. All of it stops at 6am NZDT on Sunday 8 November
   (after election-night results) without anyone touching it: the worker skips and drops these, and My Feed hides them. */
export const ELECTION_END = Date.UTC(2026, 10, 7, 17, 0, 0); // 2026-11-08 06:00 NZDT
const el = (o) => ({ topic: 'election', until: ELECTION_END, prio: true, int: ['Election 2026'], ...o });
const LOGO = {
  Labour: 'https://www.labour.org.nz/media/u2blonkk/nz-labour-og.png',
  National: 'https://assets.national.org.nz/web/prod/Gradient_Hero_Logo_Auth_V3.jpg',
  Opportunity: 'https://cdn.opportunity.org.nz/images/homepage/metaimage.webp',
  'NZ First': 'https://assets.nationbuilder.com/nzfirst/pages/5138/meta_images/original/latest-news-nz-first.jpg?1732746469',
  Green: 'https://assets.nationbuilder.com/beachheroes/pages/70208/meta_images/original/coleaders_new.jpg?1791254928',
  ACT: 'https://framerusercontent.com/images/WiUfeXvLaYKyPDOWzkFn5Wm6B8.png'
};
const POLICY = 'https://cdn.sanity.io/images/ubdwo62y/production/516b309cb6647b5ae99278c56d52893da27dc397-1024x1024.jpg?w=1024';
const cand = (name, party, url, img, s) => ({ party, t: name + ' · ' + party, s: 'Whangārei candidate. ' + s, url, img: img || POLICY });
export const ELECTION_SOURCES = [
  el({ id: 'el-cands', kind: 'static', name: 'Whangārei candidates 2026', party: 'All candidates', at: Date.UTC(2026, 9, 31, 20), items: [
    cand('Luke Beharrell', 'Money Free Party NZ', 'https://policy.nz/2026/whangarei-electorate/candidates/luke-beharrell', '', 'Profile on Policy.nz.'),
    cand('Collin Blackman', 'NZ Loyal', 'https://policy.nz/2026/whangarei-electorate/candidates/collin-blackman', '', 'Profile on Policy.nz.'),
    cand('Lloyd Budd', 'National', 'https://www.national.org.nz/team/lloydbudd', 'https://assets.national.org.nz/web/prod/Lloyd-Budd-news.jpg?v=1788381970', 'Profile on the National Party site.'),
    cand('Daryl Warren Clotworthy', 'Independent', 'https://policy.nz/2026/whangarei-electorate/candidates/daryl-warren-clotworthy', '', 'Profile on Policy.nz.'),
    cand('Vince Cocurullo', 'NZ First', 'https://www.nzfirst.nz/vince_cocurullo', 'https://assets.nationbuilder.com/nzfirst/pages/10692/meta_images/original/Candidate_Headline_Images_%283%29.png?1782865573', 'Profile on the NZ First site.'),
    cand('Simon DellaBarca', 'Opportunity', 'https://www.opportunity.org.nz/candidate-simon-dellabarca', 'https://assets.nationbuilder.com/garethmorgan/pages/12668/meta_images/original/candidate-simon-dellabarca.jpg?1779966140', 'Profile on the Opportunity Party site.'),
    cand('Doug Graham', 'ACT', 'https://www.act.org.nz/people/doug-graham', 'https://framerusercontent.com/images/nlYsB9twCQ1805IMnGTJOymgDVA.jpg', 'Profile on the ACT site.'),
    cand('Gary Payinda', 'Labour', 'https://www.labour.org.nz/2026-campaign/our-candidates/dr-gary-payinda/', 'https://www.labour.org.nz/media/z2dhv5a5/dr-gary-payinda.jpg?width=640', 'Profile on the Labour Party site.'),
    cand('Jon Twyman', 'Independent', 'https://policy.nz/2026/whangarei-electorate/candidates/jon-twyman', '', 'Profile on Policy.nz.'),
    cand('Noah Wakelam', 'NZ Outdoors & Freedom', 'https://policy.nz/2026/whangarei-electorate/candidates/noah-wakelam', '', 'Profile on Policy.nz.')
  ] }),
  // Local coverage of the Whangārei race (Northern Advocate), all candidates
  el({ id: 'el-advocate', kind: 'rss', og: true, name: 'Northern Advocate · Election', party: 'All candidates', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/news/?outputType=xml&_website=northern-advocate', want: /election|candidate|vote|voting|polling|ballot|Budd|Payinda|Cocurullo|DellaBarca|Doug Graham|Blackman|Wakelam|Beharrell|Twyman|Clotworthy/i, img: 'https://www.nzherald.co.nz/pf/resources/images/fallback-promo-image.png?d=1' }),
  el({ id: 'el-rnz', kind: 'rss', og: true, name: 'RNZ Politics', party: 'All parties', url: 'https://www.rnz.co.nz/rss/political.xml' }),
  el({ id: 'el-commission', kind: 'yt', name: 'Electoral Commission', party: 'All parties', ch: 'UC9LSgI1BNCdN5Ddls6heyPQ', max: 3 }),
  // Party news / press releases (same three kinds for each where they exist: news, YouTube)
  el({ id: 'el-labour', kind: 'page', name: 'Labour Party news', party: 'Labour', url: 'https://www.labour.org.nz/news', link: /labour\.org\.nz\/news\/[a-z0-9-]{8,}/, scan: 600000, jsonUrl: true, img: LOGO.Labour, max: 6 }),
  el({ id: 'el-national', kind: 'page', name: 'National Party news', party: 'National', url: 'https://www.national.org.nz/news', link: /national\.org\.nz\/news\/[0-9]{6,8}-[a-z0-9-]+/, img: LOGO.National, max: 6 }),
  el({ id: 'el-top', kind: 'rss', og: true, name: 'Opportunity Party news', party: 'Opportunity', url: 'https://www.opportunity.org.nz/news.rss', img: LOGO.Opportunity, max: 6 }),
  el({ id: 'el-nzfirst', kind: 'rss', og: true, name: 'NZ First news', party: 'NZ First', url: 'https://www.nzfirst.nz/news.rss', img: LOGO['NZ First'], max: 6 }),
  el({ id: 'el-greens', kind: 'page', name: 'Green Party news', party: 'Green', url: 'https://www.greens.org.nz/news', link: /greens\.org\.nz\/[a-z0-9]+(_[a-z0-9]+){4,}$/, img: LOGO.Green, max: 6 }),
  el({ id: 'el-act', kind: 'page', name: 'ACT news', party: 'ACT', url: 'https://www.act.org.nz/news', link: /act\.org\.nz\/news\/[a-z0-9()'-]{8,}$/, slugTitle: /^ACT New Zealand$/i, img: LOGO.ACT, max: 6 }),
  el({ id: 'el-yt-labour', kind: 'yt', name: 'Labour Party (YouTube)', party: 'Labour', ch: 'UCiz_HNe4CVNzP-yeYoFydQw', max: 3 }),
  el({ id: 'el-yt-national', kind: 'yt', name: 'National Party (YouTube)', party: 'National', ch: 'UCWdJ3BxqWopIdJ7J_BNu1zQ', max: 3 }),
  el({ id: 'el-yt-top', kind: 'yt', name: 'Opportunity Party (YouTube)', party: 'Opportunity', ch: 'UCkV9-rENFpIihiBnePk5imA', max: 3 }),
  el({ id: 'el-yt-nzfirst', kind: 'yt', name: 'NZ First (YouTube)', party: 'NZ First', ch: 'UC8PPX2ej6D_77czqEJp46dA', max: 3 }),
  el({ id: 'el-yt-greens', kind: 'yt', name: 'Green Party (YouTube)', party: 'Green', ch: 'UCHMJ7z-9wxGvWVljzfntFVQ', max: 3 }),
  el({ id: 'el-yt-act', kind: 'yt', name: 'ACT (YouTube)', party: 'ACT', ch: 'UCckaX40msHD_vg6iDupfIHA', max: 3 })
];

export const SOURCES = SOURCES_BASE.concat(ELECTION_SOURCES);

/* No sport, ever. Same list as My App's tools/sport-re.txt, plus a few more. */
export const SPORT_RE = /\b(sports?|super nationals|nationals|championships?|cheerleading|cheer comp\w*|sporting|rugby|all blacks|black ferns|super rugby|rugby league|nrl|nz warriors|cricket|black ?caps|white ferns|netball|silver ferns|football|soccer|a-league|fifa|premier league|afl|basketball|nbl|tall blacks|golf|tennis|motorsport|motor racing|formula ?1|formula one|f1|grand prix|supercars|speedway|boxing|ufc|mma|wrestling|wwe|athletics|olympics?|olympic games|paralympics?|commonwealth games|hockey|black sticks|rowing|america'?s cup|sailgp|triathlon|ironman|surf lifesaving|horse racing|harness racing|trots|melbourne cup|darts|snooker|lawn bowls|squash|volleyball|baseball|softball|nfl|nba|mlb|nhl|motocross|crusaders|tyson fury|boxer|heavyweight|fight night|knockout|title fight|jockey|marathon|cyclist|tour de france|sprinter|northland taniwha|bunnings npc|npc|ranfurly shield|sky sport|espn|kick-?off|grand final|test match|world cup|six nations|bledisloe|haka challenge|match highlights|live match|tournament|semi-?final|quarter-?final|wicket|try-?scorer|halfback|first five|all whites|football ferns|v\.? (france|england|australia|ireland|wales|scotland|south africa|argentina|fiji|samoa|tonga|india|pakistan|sri lanka))\b/i;

/* Northland (subtropical, frost-light) garden tips by month. Index 0 = January. */
export const GARDEN_TIPS = [
  ['Water deeply in the cool of the morning; mulch everything 5–7 cm deep to hold moisture.', 'Pick beans, courgettes and cucumbers every couple of days so they keep cropping.', 'Sow carrots, beetroot and lettuce in part shade for autumn salads.', 'Watch for passionvine hopper and whitefly on citrus and tomatoes.'],
  ['Sow brassicas (broccoli, cabbage, cauliflower) in trays for autumn planting.', 'Summer-prune stone fruit after harvest to control size.', 'Keep tomatoes evenly watered to stop blossom end rot.', 'Save seed from your best beans and pumpkins.'],
  ['Plant out brassica seedlings, plus spinach, silverbeet and kale.', 'Sow broad beans and sweet peas from late March in Northland.', 'Feed citrus with a citrus fertiliser before the autumn rains.', 'Divide clumping perennials and replant.'],
  ['Prime time to plant garlic in Northland soils (and shallots).', 'Sow green crops like lupin or mustard on empty beds.', 'Plant spring bulbs: freesias, ranunculus, anemones.', 'Collect fallen leaves for leaf mould and compost.'],
  ['Plant fruit trees and roses as bare-root stock arrives in garden centres.', 'Sow peas, broad beans and onions.', 'Spray copper on stone fruit at leaf fall.', 'Protect young citrus from cold southerlies.'],
  ['Matariki planting: plant natives like kōwhai, harakeke and mānuka.', 'Prune grapes, kiwifruit and pip fruit while dormant.', 'Lift and divide rhubarb.', 'Sow early tomatoes and capsicums indoors on a warm windowsill.'],
  ['Plant potatoes (early varieties) in frost-free Northland spots.', 'Feed lawns and gardens with sheep pellets or compost.', 'Sow lettuce, spinach and radish undercover.', 'Last chance for winter pruning of roses and fruit trees.'],
  ['Northland spring starts early: sow beans, corn and pumpkin late in the month.', 'Plant strawberries and asparagus crowns.', 'Fertilise citrus and avocados as growth starts.', 'Start a worm farm or new compost bin.'],
  ['Plant tomatoes, capsicums and eggplant out once soil is warm.', 'Sow sunflowers, zinnias and cosmos for summer colour.', 'Put up stakes and frames before plants need them.', 'Watch for slugs and snails after rain.'],
  ['Plant kūmara slips in warm Northland soil (Labour Weekend tradition).', 'Sow basil, cucumbers, courgettes and melons.', 'Mulch around new plantings before it dries out.', 'Pinch out tomato laterals and tie in stems.'],
  ['Keep sowing beans, corn and salad greens every 3 weeks for steady picking.', 'Thin fruit on apples and stone fruit for bigger fruit.', 'Feed tomatoes with a high-potash food as they flower.', 'Check irrigation before the summer dry.'],
  ['Harvest early potatoes, garlic and onions as tops yellow.', 'Water in the morning and mulch heavily during the Northland summer.', 'Sow carrots and beetroot for autumn.', 'Net berries and stone fruit from birds.']

];
