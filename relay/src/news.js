/* Headlines for the Due Dates app (2.23.5: human interest and politics, no crime).
 *
 * Sources, all RNZ RSS (RNZ sends no CORS header, so the phone can't read them itself):
 *   RNZ Northland  https://www.rnz.co.nz/rss/regions_northland.xml  (only stories about Whangārei / Northland)
 *   RNZ Politics   https://www.rnz.co.nz/rss/political.xml
 *   RNZ In Depth   https://www.rnz.co.nz/rss/in-depth.xml
 *   RNZ Country    https://www.rnz.co.nz/rss/country.xml
 *   RNZ New Zealand https://www.rnz.co.nz/rss/national.xml  (NZ-wide news)
 *   NZ Herald (NZ section) https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/?outputType=xml
 * Any story whose headline or summary is about courts, crime, violence, deaths or sexual matters is dropped
 * (BLOCK below). Headline, link, time and source name only. No article body, nothing invented, no AI.
 * Kept for 10 minutes. No logging.
 */
import { decode, get } from './events.js';

export const NEWS_URL = 'https://www.rnz.co.nz/rss/regions_northland.xml';
export const NEWS_PAGE = 'https://www.rnz.co.nz/news/regions_northland';
export const NEWS_FEEDS = [
  { id: 'northland', name: 'RNZ Northland', url: NEWS_URL, local: true },
  { id: 'politics', name: 'RNZ Politics', url: 'https://www.rnz.co.nz/rss/political.xml' },
  { id: 'indepth', name: 'RNZ In Depth', url: 'https://www.rnz.co.nz/rss/in-depth.xml' },
  { id: 'country', name: 'RNZ Country', url: 'https://www.rnz.co.nz/rss/country.xml' },
  { id: 'national', name: 'RNZ New Zealand', url: 'https://www.rnz.co.nz/rss/national.xml' },
  { id: 'herald', name: 'NZ Herald', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/?outputType=xml', host: 'www.nzherald.co.nz' }
];
const KV_KEY = 'rnz-news-v3';
const TTL = 10 * 60 * 1000;
const MAX_ITEMS = 12;
const MAX_ALL = 24;
// Courts, crime, violence, deaths, sexual matters. Matched on headline + summary, whole words.
export const BLOCK = new RegExp('\\b(' + [
  'courts?', 'courtroom', 'trials?', 'retrial', 'jury', 'sentenc\\w*', 'judges?', 'judicial review', 'jail\\w*', 'prisons?', 'prisoners?', 'inmates?',
  'charged', 'charges? laid', 'facing charges', 'accused', 'guilty', 'convict\\w*', 'acquit\\w*', 'plead\\w*', 'pleaded', 'bail', 'parole',
  'murder\\w*', 'homicides?', 'manslaughter', 'kill\\w*', 'death of', 'deaths?', 'died', 'dies', 'dead', 'bod(y|ies) found', 'remains found', 'coroner\\w*', 'inquest',
  'stab\\w*', 'shooting', 'shootings', 'shooters?', 'shot dead', 'shot', 'gunm[ae]n', 'guns?', 'firearms?', 'armed', 'weapons?', 'assault\\w*', 'attack\\w*', 'violen\\w*', 'brawl\\w*', 'fight(s|ing)? (broke|outside)',
  'abus\\w*', 'rap(e|ed|es|ist|ists)', 'sexual\\w*', 'sex', 'sexually', 'indecen\\w*', 'porn\\w*', 'exploit\\w*', 'grooming', 'molest\\w*', 'paedophil\\w*', 'pedophil\\w*', 'harass\\w*', 'stalk(ing|er|ed)',
  'gangs?', 'gang\\w+', 'police hunt', 'manhunt', 'arrest\\w*', 'offend\\w*', 'offender\\w*', 'kidnap\\w*', 'abduct\\w*', 'hostage\\w*', 'terror\\w*', 'bomb(s|ed|er|ers|ing|ings)?', 'explosi\\w*',
  'fatal\\w*', 'fatal crash', 'crash victims?', 'drown\\w*', 'suicid\\w*', 'execut(e|ed|es|ion|ions)', 'war', 'wars', 'warfare', 'massacre\\w*', 'genocide', 'riot\\w*', 'robber\\w*', 'burglar\\w*', 'ram raid\\w*', 'stolen', 'injur(ed|ies|y)', 'hit[ -]and[ -]run', 'crash(es|ed)?', 'collisions?', 'police (are )?(appeal\\w*|investigat\\w*|seek\\w*)', 'sought', 'missing (man|woman|person|teen|boy|girl|child)'
].join('|') + ')\\b', 'i');
// Figures of speech that aren't about violence are taken out first.
const SAFE_PHRASES = /\b(ticking time bomb|time bomb|bombshell|green shoots|price wars?|war of words|heart attacks?|panic attacks?|shot in the arm|long shot|big shots?|death of the high street)\b/gi;
export function isBlocked(title, description) { return BLOCK.test((String(title || '') + ' ' + String(description || '')).replace(SAFE_PHRASES, ' ')); }
let mem = null;

const PLACES = [
  'whangarei', 'whangārei', 'northland', 'far north', 'dargaville', 'kerikeri', 'kaitaia',
  'russell', 'kaipara', 'paihia', 'bay of islands', 'hokianga', 'kaikohe', 'kawakawa',
  'waipu', 'waipū', 'ruakaka', 'hikurangi', 'tutukaka', 'ngunguru', 'ninety mile',
  'cape reinga', 'moerewa', 'mangonui', 'taipa', 'marsden point', 'one tree point',
  'peria', 'whangaroa', 'rawene', 'opononi', 'ahipara', 'kaiwaka', 'maungaturoto',
  'ruawai', 'kamo', 'onerahi', 'tikipunga', 'parua bay', 'helena bay', 'whananaki',
  'matapouri', 'mangawhai', 'bream bay', 'doubtless bay', 'kohukohu', 'omapere',
  'waipoua', 'opua', 'kamo', 'waitangi', 'haruru', 'okaihau', 'whangaruru',
  'matauri bay', 'taupo bay', 'hihi', 'puketi', 'cable bay', 'coopers beach',
  "cooper's beach", 'karikari', 'whatuwhiwhi', 'te kao', 'awanui', 'maungatapere',
  'maungakaramea', 'glenbervie', 'otangarei', 'raumanga', 'port nikau', 'town basin',
  'oakura', 'langs beach', "lang's beach", 'springs flat', 'pipiwai', 'titoki',
  'pakotai', 'waimamaku', 'rawene', 'kaeo', 'mangonui', 'taipa', 'ahipara'
];

function field(block, name) {
  const m = new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i').exec(block);
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function clean(s) {
  return decode(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function isLocalStory(title, description, url) {
  const blob = (title + ' ' + description + ' ' + url).toLowerCase();
  if (PLACES.some(p => blob.includes(p))) return true;
  return /\/regions_northland\//i.test(url);
}

function rnzUrl(link, host = 'www.rnz.co.nz') {
  try {
    const u = new URL(clean(link));
    if (u.protocol === 'https:' && u.hostname === host && u.pathname.startsWith('/')) return u.toString();
  } catch (e) { /* drop it */ }
  return '';
}

export function parseNorthlandRss(xml) { return parseRss(xml, NEWS_FEEDS[0]); }
export function parseRss(xml, feed) {
  const raw = String(xml || '');
  const channelTitle = clean((raw.match(/<channel\b[^>]*>[\s\S]*?<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
  if (!/<rss\b/i.test(raw) || !/<channel\b/i.test(raw)) throw new Error('news_changed');
  if (/not found|no longer available|404/i.test(channelTitle)) throw new Error('news_gone');
  const blocks = [...raw.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  if (!blocks.length) throw new Error('news_changed');
  const items = [];
  const seen = new Set();
  for (const block of blocks) {
    const title = clean(field(block[1], 'title'));
    const description = clean(field(block[1], 'description'));
    const url = rnzUrl(field(block[1], 'link'), feed.host);
    const publishedMs = Date.parse(clean(field(block[1], 'pubDate')));
    if (!title || !url || !Number.isFinite(publishedMs)) continue;
    if (/no longer available|feed not found/i.test(title)) continue;
    if (feed.local && !isLocalStory(title, description, url)) continue;
    if (isBlocked(title, description)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({ title, url, published: new Date(publishedMs).toISOString(), src: feed.name, local: !!feed.local });
  }
  items.sort((a, b) => b.published.localeCompare(a.published));
  return {
    source: 'RNZ',
    sourceName: feed.name,
    page: NEWS_PAGE,
    feed: feed.url,
    items: items.slice(0, MAX_ITEMS)
  };
}
// All feeds together: newest first, same story only once, at most 6 from any one feed.
export function mergeFeeds(parts, now = Date.now()) {
  const all = [], urls = new Set(), titles = new Set();
  parts.forEach(p => (p.items || []).slice(0, 6).forEach(x => {
    if (now - Date.parse(x.published) > 21 * 864e5) return; // three weeks old at most
    const t = x.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (urls.has(x.url) || titles.has(t)) return;
    urls.add(x.url); titles.add(t); all.push(x);
  }));
  all.sort((a, b) => b.published.localeCompare(a.published));
  // Mix the sources: newest first, but no more than two in a row from the same feed while others are waiting.
  const mixed = [];
  while (all.length) {
    const last2 = mixed.slice(-2).map(x => x.src);
    let i = last2.length === 2 && last2[0] === last2[1] ? all.findIndex(x => x.src !== last2[0]) : 0;
    if (i < 0) i = 0;
    mixed.push(all.splice(i, 1)[0]);
  }
  all.push(...mixed);
  return { source: 'RNZ', sourceName: 'RNZ', page: NEWS_PAGE, feed: NEWS_URL, feeds: NEWS_FEEDS.map(f => ({ name: f.name, feed: f.url })), items: all.slice(0, MAX_ALL) };
}

export async function getLocalNews(env = {}, fetchImpl = fetch, now = Date.now()) {
  if (mem && mem.data && Array.isArray(mem.data.items) && now - mem.at < TTL) return mem.data;
  if (env.EVENTS_KV) {
    try {
      const c = await env.EVENTS_KV.get(KV_KEY, { type: 'json' });
      if (c && c.data && Array.isArray(c.data.items) && now - c.at < TTL) { mem = c; return c.data; }
      if (c && c.data && Array.isArray(c.data.items)) mem = c;
    } catch (e) { /* a bad cache must not hide a fresh read */ }
  }
  try {
    const res = await Promise.allSettled(NEWS_FEEDS.map(async f => parseRss(await get(f.url, fetchImpl, { headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*;q=0.1' } }), f)));
    const parts = res.filter(r => r.status === 'fulfilled').map(r => r.value);
    if (!parts.length) throw (res[0] && res[0].reason) || new Error('news_unavailable');
    const data = mergeFeeds(parts, now);
    mem = { at: now, data };
    if (env.EVENTS_KV) { try { await env.EVENTS_KV.put(KV_KEY, JSON.stringify(mem)); } catch (e) { } }
    return data;
  } catch (e) {
    if (mem && mem.data && Array.isArray(mem.data.items)) return mem.data;
    throw e;
  }
}

export function resetNews() { mem = null; }
