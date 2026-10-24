/* Headlines for the Due Dates app (2.23.5: human interest and politics, no crime).
 *
 * Sources, all RNZ RSS (RNZ sends no CORS header, so the phone can't read them itself):
 *   RNZ Northland  https://www.rnz.co.nz/rss/regions_northland.xml  (only stories about Whangārei / Northland)
 *   RNZ Politics   https://www.rnz.co.nz/rss/political.xml
 *   RNZ In Depth   https://www.rnz.co.nz/rss/in-depth.xml
 *   RNZ Country    https://www.rnz.co.nz/rss/country.xml
 *   RNZ New Zealand https://www.rnz.co.nz/rss/national.xml  (NZ-wide news)
 *   NZ Herald (NZ section) https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/?outputType=xml
 *   NZ Herald Northern Advocate https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/news/?outputType=xml&_website=northern-advocate (2.27.4)
 *   The same story from RNZ and the Herald shows once (RNZ kept: not paywalled). See sameStory().
 * Any story whose headline or summary is about courts, crime, violence, deaths or sexual matters is dropped
 * (BLOCK below). Headline, link, time and source name only. No article body, nothing invented, no AI.
 * Two sections (2.23.6): local (Northland, up to 7 days old) and New Zealand (up to 3 days old).
 * Kept for 10 minutes, so every request is at most 10 minutes behind the feeds. No logging.
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
  { id: 'herald', name: 'NZ Herald', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/?outputType=xml', host: 'www.nzherald.co.nz' },
  // 2.27.4: NZ Herald's Northern Advocate (Whangārei / Northland) news. Only stories that name a Northland place.
  { id: 'heraldnorth', name: 'NZ Herald', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/news/?outputType=xml&_website=northern-advocate', host: 'www.nzherald.co.nz', local: true, sportOut: true }
];
const KV_KEY = 'rnz-news-v8';
const TTL = 10 * 60 * 1000;
const MAX_ITEMS = 12;
const MAX_ALL = 24;
// Courts, crime, violence, deaths, sexual matters. Matched on headline + summary, whole words.
export const BLOCK = new RegExp('\\b(' + [
  'courts?', 'courtroom', 'criminal\\w*', 'trials?', 'retrial', 'jury', 'sentenc\\w*', 'judges?', 'judicial review', 'jail\\w*', 'prisons?', 'prisoners?', 'inmates?',
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

// 2.27.4: the Herald carries a lot of sport (the app drops sport too; this keeps the feed's room for other stories)
export const SPORT_RE = /\b(sport|sports|rugby|npc|super rugby|all blacks|black ferns|league|nrl|warriors|netball|silver ferns|cricket|black caps|white ferns|football|soccer|a-league|phoenix|basketball|breakers|tall blacks|tennis|golf|golfer|motorsport|supercars|speedway|f1|formula one|olympic\w*|commonwealth games|hockey|rowing|cycling|triathlon|marathon|boxing|ufc|mma|surfing champs?|yachting|america'?s cup|sailgp|horse racing|trots|harness|fixture|semi-?finals?|try-scoring|wicket|innings)\b/i;
// 2.27.4: same story from two outlets? Compare headline words (lower case, macrons off, short and common words out,
// plural s off). Same if at least 3 words are shared and they make up 60% or more of the shorter headline.
const STOP = new Set('the a an and or of to in on for at by with from as is are was were be been has have had it its this that new nz zealand says say said after over into up out about more than not but will can could would after amid first how why what who when where'.split(' '));
export function storyWords(t) { return [...new Set(String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.length > 4 ? w.replace(/(ies)$/, 'y').replace(/s$/, '') : w))]; }
export function sameStory(a, b) { const A = storyWords(a), B = new Set(storyWords(b)); if (!A.length || !B.size) return false; const n = A.filter(w => B.has(w)).length; return n >= 3 && n / Math.min(A.length, B.size) >= 0.6; }
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
    if (feed.host === 'www.nzherald.co.nz' && (/\bquiz\b/i.test(title) || SPORT_RE.test(title) || /\/sport\//.test(url))) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    let img = "";
    const mc = block[1].match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]+url=["'](https:\/\/[^"']+)["']/i);
    if (mc) img = unent(mc[1]);
    items.push({ title, url, published: new Date(publishedMs).toISOString(), src: feed.name, local: !!feed.local, summary: description.slice(0, 280), ...(img ? { img } : {}) });
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
// 2.23.6: two sections. Local = RNZ Northland plus any NZ-wide story that names a Northland place (whole word).
// New Zealand = everything else. Newest first in each, same story only once. Old stories don't linger:
// local stories go after 7 days (Northland is a quiet feed), NZ-wide ones after 3 days.
export const LOCAL_DAYS = 7, NZ_DAYS = 3, MAX_LOCAL = 12;
const PLACE_RE = new RegExp('(^|[^a-z\u0101])(' + PLACES.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![a-z\u0101])', 'i');
export function namesNorthland(title) { return PLACE_RE.test(String(title || '').toLowerCase()); }
function mixSources(all) {
  // Newest first, but no more than two in a row from the same feed while others are waiting.
  const mixed = [];
  while (all.length) {
    const last2 = mixed.slice(-2).map(x => x.src);
    let i = last2.length === 2 && last2[0] === last2[1] ? all.findIndex(x => x.src !== last2[0]) : 0;
    if (i < 0) i = 0;
    mixed.push(all.splice(i, 1)[0]);
  }
  return mixed;
}
export function mergeFeeds(parts, now = Date.now(), prev = null) {
  const local = [], nz = [], urls = new Set(), titles = new Set(), kept = [];
  let localOk = false, nzOk = false;
  parts.forEach(p => {
    if (p.local) localOk = true; else nzOk = true;
    (p.items || []).forEach((x, n) => {
      const isLocal = p.local || x.local || namesNorthland(x.title);
      if (!isLocal && n >= 6) return; // at most 6 NZ-wide stories from any one feed
      const age = now - Date.parse(x.published);
      if (!(age <= (isLocal ? LOCAL_DAYS : NZ_DAYS) * 864e5)) return;
      const t = x.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (urls.has(x.url) || titles.has(t)) return;
      if (kept.some(y => sameStory(y, x.title))) return; // RNZ feeds come first, so RNZ's copy is the one kept
      kept.push(x.title);
      urls.add(x.url); titles.add(t);
      (isLocal ? local : nz).push({ ...x, local: isLocal });
    });
  });
  const byDate = (a, b) => b.published.localeCompare(a.published);
  local.sort(byDate); nz.sort(byDate);
  const fresh = (list, days) => list.filter(x => now - Date.parse(x.published) <= days * 864e5);
  // A section whose feeds all failed keeps its last good copy (still trimmed by age), with its old time.
  const L = localOk || !prev || !prev.local ? { checked: new Date(now).toISOString(), items: local.slice(0, MAX_LOCAL) } : { checked: prev.local.checked, items: fresh(prev.local.items || [], LOCAL_DAYS) };
  const N = nzOk || !prev || !prev.nz ? { checked: new Date(now).toISOString(), items: mixSources(nz).slice(0, MAX_ALL) } : { checked: prev.nz.checked, items: fresh(prev.nz.items || [], NZ_DAYS) };
  L.days = LOCAL_DAYS; N.days = NZ_DAYS;
  // items: both together, for older copies of the app.
  return { source: 'RNZ', sourceName: 'RNZ', page: NEWS_PAGE, feed: NEWS_URL, feeds: NEWS_FEEDS.map(f => ({ name: f.name, feed: f.url, local: !!f.local })), local: L, nz: N, items: [...L.items, ...N.items].sort(byDate).slice(0, MAX_ALL) };
}
// 2.27.93: link-preview picture (og:image / twitter:image) for local stories. One fetch per article, cached in KV 7 days (misses too). Robots.txt respected.
const IMG_TTL = 7 * 86400, UA = 'Mozilla/5.0 (compatible; ShaneMyAppRelay/1.0; +https://shane-my-app.pages.dev)';
const robotsMem = {};
async function robotsOk(u, fetchImpl) {
  const h = u.hostname;
  if (!robotsMem[h]) robotsMem[h] = (async () => { try { const r = await fetchImpl('https://' + h + '/robots.txt', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(4000) }); if (!r.ok) return []; const dis = []; let star = false;
    for (const ln of (await r.text()).split(/\r?\n/)) { const m = ln.replace(/#.*/, '').trim().match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue; const k = m[1].toLowerCase(); if (k === 'user-agent') star = m[2].trim() === '*'; else if (k === 'disallow' && star && m[2].trim()) dis.push(m[2].trim()); } return dis; } catch (e) { return []; } })();
  const dis = await robotsMem[h], path = u.pathname + u.search;
  return !dis.some(d => { const re = new RegExp('^' + d.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')); return re.test(path); });
}
const unent = s => decode(String(s || '').replace(/&amp;/g, '&').replace(/&#x2F;/g, '/').replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;|&rsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&nbsp;/g, ' '));
function extractArticleParagraphs(html) {
  const bodyChunk = (() => {
    const rnz = html.match(/<div[^>]+class=["'][^"']*article__body[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|article)>/i);
    if (rnz) return rnz[1];
    const art = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    if (art) return art[1];
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    return main ? main[1] : html;
  })();
  const cleaned = bodyChunk.replace(/<(script|style|nav|footer|aside|figure|figcaption|form|button)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const out = [];
  const seen = new Set();
  for (const m of cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const txt = unent(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (txt.length < 28) continue;
    if (/^(Link:\s*https?:|Audio player for |Visit page to play audio:|Photo:|Sign up for |RNZ is a public|Copyright ©|All rights reserved|The BBC is not responsible|Read more:|Related stories|Share this article)/i.test(txt)) continue;
    const k = txt.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(txt);
    if (out.length >= 28) break;
  }
  return out;
}
export async function articleFromUrl(url, env = {}, fetchImpl = fetch) {
  const key = 'artmeta2:' + url;
  if (env && env.EVENTS_KV) {
    try {
      const c = await env.EVENTS_KV.get(key, { type: 'json' });
      if (c && typeof c === 'object') return c;
    } catch (e) {}
  }
  const res = { url, title: '', img: '', site: '', paragraphs: [] };
  try {
    const u = new URL(url);
    res.site = u.hostname.replace(/^www\./, '');
    if (await robotsOk(u, fetchImpl)) {
      const r = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(5500) });
      if (r.ok) {
        const html = (await r.text()).slice(0, 450000);
        for (const t of ['og:image', 'twitter:image']) {
          const m = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + t + '["\'][^>]*>', 'i'));
          const c = m && m[0].match(/content=["']([^"']+)["']/i);
          if (c) {
            const x = new URL(unent(c[1]), url);
            if (x.protocol === 'https:' && !/rnz-sky-sq|default_share|logo/i.test(x.pathname)) { res.img = x.toString(); break; }
          }
        }
        const tm = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (tm) res.title = unent(tm[1]).replace(/\s*\|\s*(RNZ|NZ Herald).*$/i, '').trim();
        res.paragraphs = extractArticleParagraphs(html);
      }
    }
  } catch (e) {}
  if (env && env.EVENTS_KV && (res.img || res.paragraphs.length)) {
    try { await env.EVENTS_KV.put(key, JSON.stringify(res), { expirationTtl: IMG_TTL }); } catch (e) {}
  }
  return res;
}
export async function ogImage(url, env, fetchImpl) {
  const m = await articleFromUrl(url, env, fetchImpl);
  return m.img || '';
}
async function addImages(data, env, fetchImpl) {
  const locList = (data.local && data.local.items) || [];
  const nzList = (data.nz && data.nz.items) || [];
  const combined = [...locList, ...nzList];
  const todo = combined.filter(x => !x.img || !Array.isArray(x.paragraphs) || !x.paragraphs.length);
  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(todo.slice(i, i + 6).map(async x => {
      const m = await articleFromUrl(x.url, env, fetchImpl);
      if (m.img && !x.img) x.img = m.img;
      if (m.paragraphs && m.paragraphs.length) x.paragraphs = m.paragraphs;
      else if (!x.paragraphs && x.summary) x.paragraphs = [x.summary];
    }));
  }
  const byUrl = new Map(combined.map(x => [x.url, x]));
  (data.items || []).forEach(x => {
    const hit = byUrl.get(x.url);
    if (hit) {
      if (hit.img) x.img = hit.img;
      if (hit.paragraphs) x.paragraphs = hit.paragraphs;
      if (hit.summary && !x.summary) x.summary = hit.summary;
    }
  });
  return data;
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
    const parts = res.map((r, i) => r.status === 'fulfilled' ? { ...r.value, local: !!NEWS_FEEDS[i].local } : null).filter(Boolean);
    if (!parts.length) throw (res[0] && res[0].reason) || new Error('news_unavailable');
    const data = await addImages(mergeFeeds(parts, now, mem && mem.data), env, fetchImpl);
    mem = { at: now, data };
    if (env.EVENTS_KV) { try { await env.EVENTS_KV.put(KV_KEY, JSON.stringify(mem)); } catch (e) { } }
    return data;
  } catch (e) {
    if (mem && mem.data && Array.isArray(mem.data.items)) return mem.data;
    throw e;
  }
}

export function resetNews() { mem = null; }
// 2.28.1: recipe from a link. Reads schema.org Recipe JSON-LD (falls back to og:title / og:image). Robots.txt respected, 6 s, 1.5 MB max. Nothing is made up: missing fields stay empty.
const strip = s => unent(String(s || '').replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')).replace(/\s+/g, ' ').trim();
const isoDur = s => { const m = String(s || '').match(/^P(?:T)?(?:(\d+)H)?(?:(\d+)M)?/i); if (!m || (!m[1] && !m[2])) return ''; const h = +(m[1] || 0), mi = +(m[2] || 0), t = h * 60 + mi; return t >= 60 ? Math.floor(t / 60) + ' h' + (t % 60 ? ' ' + (t % 60) + ' min' : '') : t + ' min'; };
function findRecipe(o, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 6) return null;
  if (Array.isArray(o)) { for (const x of o) { const r = findRecipe(x, depth + 1); if (r) return r; } return null; }
  const t = o['@type']; if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return o;
  return findRecipe(o['@graph'], depth + 1) || findRecipe(o.mainEntity, depth + 1);
}
const pickImg = (im, base) => { if (Array.isArray(im)) im = im[0]; if (im && typeof im === 'object') im = im.url || im.contentUrl; try { const x = new URL(String(im || ''), base); return x.protocol === 'https:' ? x.toString() : ''; } catch (e) { return ''; } };
function steps(ins, out = [], d = 0) {
  if (!ins || d > 4) return out;
  if (typeof ins === 'string') { strip(ins).split(/\s*(?:\n|\r)\s*/).forEach(s => s && out.push(s)); return out; }
  if (Array.isArray(ins)) { ins.forEach(x => steps(x, out, d + 1)); return out; }
  if (ins.itemListElement) return steps(ins.itemListElement, out, d + 1);
  if (ins.text || ins.name) out.push(strip(ins.text || ins.name));
  return out;
}
export async function recipeFromUrl(url, fetchImpl = fetch) {
  const u = new URL(url);
  if (!(await robotsOk(u, fetchImpl))) return { error: 'robots' };
  const r = await fetchImpl(u.toString(), { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(6000) });
  if (!r.ok) return { error: 'http_' + r.status };
  if (+(r.headers.get('content-length') || 0) > 1500000) return { error: 'too_big' };
  const html = (await r.text()).slice(0, 1500000);
  const meta = t => { const m = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + t + '["\'][^>]*>', 'i')); const c = m && m[0].match(/content=["']([^"']*)["']/i); return c ? strip(c[1]) : ''; };
  let rec = null;
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { rec = findRecipe(JSON.parse(m[1].trim())); } catch (e) { } if (rec) break; }
  const site = meta('og:site_name') || u.hostname.replace(/^www\./, '');
  if (!rec) return { found: false, title: meta('og:title') || strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]), image: pickImg(meta('og:image'), u), ingredients: [], steps: [], site, url: u.toString() };
  const y = rec.recipeYield; const serves = strip(Array.isArray(y) ? y[0] : y);
  return { found: true, title: strip(rec.name) || meta('og:title'), image: pickImg(rec.image, u) || pickImg(meta('og:image'), u), ingredients: (Array.isArray(rec.recipeIngredient) ? rec.recipeIngredient : []).map(strip).filter(Boolean).slice(0, 80), steps: steps(rec.recipeInstructions).slice(0, 60), time: isoDur(rec.totalTime) || isoDur(rec.cookTime), serves: serves.slice(0, 40), site, url: u.toString() };
}
