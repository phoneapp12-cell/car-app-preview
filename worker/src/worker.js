import { upsize, widestMedia } from './img.js';
import { isUnsafe } from './safe.js';
import { isPaywalled, paywallHtml } from './paywall.js';
import { MONEY_RE } from './preview.js';
import { fetchWatch } from './watch.js';
import { fetchConcerts } from './concerts.js';
import { Family, cors } from './family.js';
export { Family };
/* My Feed refresher (Cloudflare Worker, free plan). Shane's private photo and video feed.
   Every 15 minutes the cron refreshes the next few sources (each source about every 2 to 3 hours),
   merges them into one stored feed (KV key "feed", one write per run) and serves it at /feed.json.
   Nothing about Shane is stored or sent: votes stay on his phone. */
import { SOURCES, SPORT_RE, GARDEN_TIPS, NON_NZ_FOOD } from './sources.js';
import { runSubjects, autoSourceRows, isAutoItem } from './subjects.js';
const NON_NZ_FOOD_SRC = new Set(['gfshoestring','recipetin','yt-weissman','yt-babish','minimalistbaker','rd-food']); // 1.9.81 belt-and-braces
import { enrichExplain, goodEx } from './explain.js';

const PER_RUN = 7;              // sources per cron run (keeps CPU and subrequests small); the cron runs every 10 minutes
const MAX_PER_SOURCE = 8;
const MAX_AGE = 21 * 864e5;     // drop items older than 3 weeks
const ELECTION_STALE = 120 * 60e3; // election sources (src.prio) refresh about hourly until they expire (src.until)
const live = (s, now = Date.now()) => !s.until || now < s.until;
const STALE = 150 * 60e3;       // a source is due after 2.5 hours (98 sources, 6 per run, every 10 min: about 2.7 h a lap)
const UA = 'Mozilla/5.0 (compatible; MyFeed/1.0; personal feed reader)';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const ent = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&hellip;/g, '…').replace(/&amp;/g, '&');
const strip = s => ent(ent(s)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, 'i')); return m ? m[1] : ''; };
const attr = (x, t, a) => { const m = x.match(new RegExp(`<${t}\\s[^>]*?${a}=["']([^"']+)["']`, 'i')); return m ? ent(m[1]) : ''; };
const SPORT2 = /\b(\d+ tries|four tries|three tries|two tries|scored (a |\w+ )?tr(y|ies)|conversions?|penalty (goal|kick)|kicked (all|a|the) |scores? (the )?winner|match-?winning|test match|semi-?finals?|quarter-?finals?|grand final|premiership|half-?time|full-?time|pacific championships?|world cup|olympi\w+|commonwealth games|tournament|playoffs?|championship|wicket|innings|goalkeeper|striker|touchdown|darts|snooker|golf(er)?|marathon|triathlon|wrestl\w+|boxing|ufc|grand prix|f1|motorsport|speedway|velodrome)\b/i; // 1.9.24 match reports that never say 'sport'
const isSport = (...s) => SPORT_RE.test(s.join(' ')) || SPORT2.test(s.slice(0, 2).join(' '));

/* 1.9.84 drop crash/court/crime/politics from news in the main store (Whangārei alerts/wx/power stay; election chip still gets its items) */
const CRIME_POL_RE = /\b(crash|crashes|crashed|fatal|killed|murder|homicide|stabbing|shooting|court|sentenced|jailed|charged|accused|trial|arrested|ram raid|burglar|robbery|assault|victim of|crime|gang\b|election|labour|national party|act party|greens?\b|parliament|\bmp\b|politic|minister|coalition|campaign|polls?\b)\b/i;
const DRY_NEWS_SRC = /^(rnz|rnz-maori|stuff|nzh|1news|newsroom|advocate|nl-|nz-nzh|nz-rnz|sw-rnz)/;
const isAlertSrc = s => /^(wx|pwr|northpower|metservice|special-)/.test(s || '') || (s || '').includes('wx') || (s || '').startsWith('pwr');
const isDryDull = i => {
  if (!i || i.pin || i.kind === 'tip' || i.topic === 'election' || isAlertSrc(i.src)) return false;
  const blob = (i.t || '') + ' ' + (i.s || '');
  if ((i.topic === 'nz' || DRY_NEWS_SRC.test(i.src || '')) && CRIME_POL_RE.test(blob)) return true;
  if ((i.topic === 'nz' || DRY_NEWS_SRC.test(i.src || '')) && i.neg && !i.pos) return true;
  if (i.topic === 'science' && i.neg && !i.pos) return true;
  return false;
};

const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const nzDate = (plusDays = 0) => new Date(Date.now() + plusDays * 864e5).toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const absImg = (u, base) => { try { return u ? new URL(u, base).href : ''; } catch (e) { return ''; } };

async function get(url, { tries = 1, browser = false, ms = 12000 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': browser ? BROWSER_UA : UA, 'Accept-Language': 'en-NZ,en;q=0.9', Accept: '*/*' }, signal: AbortSignal.timeout(ms), cf: { cacheTtl: 600 } });
      if (r.ok) return r;
      last = new Error('HTTP ' + r.status);
    } catch (e) { last = e; }
  }
  throw last;
}

/* ---- parsers ---- */
// 1.9.0 a date with no time zone (Eventfinda: 2026-11-02T18:30:00) is NZ time, not UTC (it showed 13 hours late)
function nzOffsetMs(t) { const d = new Date(t), p = Object.fromEntries(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(d).map(x => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(t / 1000) * 1000; }
function parseWhen(s) {
  if (!s) return 0;
  if (/^\d{4}-\d\d-\d\d([T ]\d\d:\d\d(:\d\d(\.\d+)?)?)?$/.test(s.trim())) { const u = Date.parse(s.trim().replace(' ', 'T') + (s.length > 10 ? 'Z' : 'T00:00:00Z')); if (!u) return 0; return u - nzOffsetMs(u - nzOffsetMs(u)); }
  return Date.parse(s) || 0;
}
function parseRss(xml, src) {
  const out = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks.slice(0, 40)) {
    let title = strip(tag(b, 'title'));
    let link = strip(tag(b, 'link')) || attr(b, 'link', 'href');
    if (src.social) { // 1.9.37 a public Mastodon post: credited to its author, linked back, picture stays on their server; never sensitive ones
      if (/<media:rating[^>]*>\s*(adult|nonadult)?\s*adult/i.test(b) || /sensitive/i.test(attr(b, 'media:content', 'medium') || '')) continue;
      const who = (link.match(/^https:\/\/([^/]+)\/@([\w.]+)/) || []); const txt = strip(ent(tag(b, 'description'))).replace(/#\S+/g, '').replace(/@\S+/g, '').replace(/\s+/g, ' ').trim();
      if (!who[2] || txt.length < 8) continue; title = clip('@' + who[2] + ': ' + txt, 140);
    }
    const desc = tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'content');
    const when = parseWhen(strip(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'))) || Date.now();
    let img = widestMedia(b) || attr(b, 'media:content', 'url') || attr(b, 'media:thumbnail', 'url') || attr(b, 'enclosure', 'url'); // 1.8.5 the widest picture
    if (!img) { const m = ent(desc).match(/<img[^>]+src=["']([^"']+)["']/i) || ent(b).match(/<img[^>]+src=["']([^"']+)["']/i); if (m) img = ent(m[1]); } // also pictures inside content:encoded / Atom content
    if (img && /\.(mp3|m4a|pdf)(\?|$)/i.test(img)) img = '';
    const text = clip(strip(desc), 200);
    if (!title || !link) continue;
    if (src.want && !src.want.test(title + ' ' + text)) continue;
    if (src.notWant && src.notWant.test(title + ' ' + text)) continue;
    const it = { id: hash(link), t: clip(title, 160), s: text, url: link, img: absImg(img, link), at: when, kind: src.event ? 'event' : (img ? 'photo' : 'news') };
    { const vm = link.match(/vimeo\.com\/(?:channels\/[\w-]+\/|video\/)?(\d{6,12})(?:$|[/?#])/); if (vm && img) { const dur = +((b.match(/<media:content[^>]*duration="(\d+)"/) || [])[1] || 0); if (src.maxSec && dur > src.maxSec) continue; it.vk = 'vimeo'; it.vu = vm[1]; it.kind = 'video'; } } // 1.9.37 Vimeo plays in the card
    if (src.event) { // Eventfinda: pubDate is the next session; keep events in the next 3 weeks
      const where = strip(tag(b, 'content:encoded'));
      it.s = clip(where || text, 160); it.ev = when;
      if (when < Date.now() - 864e5 || when > Date.now() + (src.evDays || 21) * 864e5) continue;
      it.at = Date.now() - Math.min(5, Math.max(0, (when - Date.now()) / 864e5)) * 864e5; // sooner events rank as fresher
      if (/fireworks|guy fawkes/i.test(title + text)) it.hot = 1;
    }
    out.push(it);
  }
  return out;
}

function parseReddit(xml, src) {
  const out = [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  for (const e of entries) {
    const title = strip(tag(e, 'title'));
    const link = attr(e, 'link', 'href');
    const html = ent(tag(e, 'content'));
    const linkOut = (html.match(/<a href="([^"]+)">\[link\]<\/a>/) || [])[1] || '';
    let thumb = attr(e, 'media:thumbnail', 'url');
    let img = '';
    if (/^https:\/\/i\.redd\.it\/[\w-]+\.(jpe?g|png|webp|gif)$/i.test(linkOut)) img = linkOut;
    // 1.9.88 Imgur links dropped: deleted ones show Imgur's 'image was probably deleted' picture
    else if (thumb) { const m = thumb.match(/^https:\/\/preview\.redd\.it\/([\w-]+\.(?:jpe?g|png|webp))/i); if (m && m[1].length <= 24) img = 'https://i.redd.it/' + m[1]; else img = thumb.replace(/&amp;/g, '&'); } // 1.9.106 video stills (long ids) only exist on preview.redd.it
    if (/\.gif$/i.test(img)) img = '';
    const yv = (linkOut.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/) || [])[1];
    const rv = (linkOut.match(/^https:\/\/v\.redd\.it\/([a-z0-9]{8,20})\/?$/i) || [])[1]; // 1.9.37 Reddit's own videos (plays in the card)
    if (rv && thumb && /^https:\/\/(external-)?preview\.redd\.it\//.test(ent(thumb))) img = ent(thumb); // 1.9.95 a video's own preview picture (the i.redd.it copy doesn't exist for videos)
    if (src.videosOnly && !yv && !rv) continue;
    if (yv) img = `https://i.ytimg.com/vi/${yv}/hqdefault.jpg`;
    if (src.want && !src.want.test(title)) continue;
    if (isPaywalled({ url: linkOut })) continue; // 1.9.24 a Reddit post linking to a paywalled paper
    const body = clip(strip(html.replace(/submitted by[\s\S]*$/i, '')), 200);
    if (src.imagesOnly && !img) continue;
    if (/\b(nsfw|nsfl|gore|rip|passed away|euthan|cancer)\b/i.test(title)) continue; // keep it a happy feed
    out.push({ id: hash(link), t: clip(title, 160), s: body === title ? '' : body, url: link, ext: linkOut || undefined, img, at: Date.parse(strip(tag(e, 'updated') || tag(e, 'published'))) || Date.now(), kind: yv || rv ? 'video' : img ? 'photo' : 'news', vid: yv || undefined, vk: rv ? 'reddit' : undefined, vu: rv || undefined });
  }
  return out;
}

function parseYtRss(xml) {
  return (xml.match(/<entry>[\s\S]*?<\/entry>/gi) || []).map(e => ({ vid: strip(tag(e, 'yt:videoId')), t: strip(tag(e, 'title')), at: Date.parse(strip(tag(e, 'published'))) || Date.now(), s: clip(strip(tag(e, 'media:description')), 200) }));
}
function parseYtPage(html) { // fallback when YouTube's RSS is down: the channel's Videos tab
  const out = [], seen = new Set(), now = Date.now();
  const unit = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 };
  const K = '"lockupViewModel":';
  for (let at = html.indexOf(K), n = 0; at >= 0 && n < 24; at = html.indexOf(K, at + K.length), n++) {
    const c = html.slice(at + K.length, at + K.length + 15000);
    const vid = (c.match(/"contentId":"([\w-]{11})"/) || [])[1];
    const t = (c.match(/"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"/) || [])[1];
    if (!vid || !t || seen.has(vid)) continue; seen.add(vid);
    const ago = c.match(/"content":"(\d+)\s*(second|minute|hour|day|week|month|year)s? ago"/) || c.match(/"content":"(\d+)(h|d|w|mo|y) ago"/);
    let when = now - 3 * 864e5;
    if (ago) { const u = { h: 'hour', d: 'day', w: 'week', mo: 'month', y: 'year' }[ago[2]] || ago[2]; when = now - (+ago[1]) * (unit[u] || 864e5); }
    let title = t; try { title = JSON.parse('"' + t + '"'); } catch (e) { }
    out.push({ vid, t: title, at: when, s: '' });
  }
  return out;
}
async function fetchYt(src) {
  let list = [], why = [];
  try { list = parseYtRss(await (await get('https://www.youtube.com/feeds/videos.xml?channel_id=' + src.ch, { tries: 1 })).text()); } catch (e) { why.push('rss ' + (e && e.message)); }
  if (!list.length) { try { const t = await (await get(`https://www.youtube.com/channel/${src.ch}/videos`, { browser: true, ms: 15000 })).text(); list = parseYtPage(t); src._via = 'page'; if (!list.length) why.push('page ' + t.length + ' ' + t.slice(0, 80).replace(/\s+/g, ' ')); } catch (e) { why.push('page ' + (e && e.message)); } }
  if (!list.length) throw new Error('YouTube unavailable: ' + why.join('; '));
  return list.filter(v => v.vid && v.t && !/#shorts?\b/i.test(v.t) && (!src.want || src.want.test(v.t)) && !(src.notWant && src.notWant.test(v.t)))
    .map(v => ({ id: 'yt' + v.vid, t: clip(v.t, 160), s: v.s, vid: v.vid, img: `https://i.ytimg.com/vi/${v.vid}/hqdefault.jpg`, url: 'https://www.youtube.com/watch?v=' + v.vid, at: v.at, kind: 'video' }));
}

async function fetchTvmaze(src) {
  const out = [], seen = new Set();
  for (const d of src.days) {
    const date = nzDate(d);
    const q = src.country ? `?country=${src.country}&date=${date}` : `?date=${date}`;
    let list = [];
    try { list = await (await get(`https://api.tvmaze.com/${src.path}${q}`)).json(); } catch (e) { continue; }
    for (const ep of list) {
      const show = ep.show || (ep._embedded && ep._embedded.show); if (!show) continue;
      const g = show.genres || [];
      if (!g.includes('Comedy') || g.includes('Sports') || show.type === 'Sports' || show.type === 'Talk Show' || show.type === 'News' || show.type === 'Variety' || show.type === 'Game Show') continue;
      if (show.language && show.language !== 'English') continue;
      if (src.premieresOnly && ep.number !== 1) continue;
      if (seen.has(show.id)) continue; seen.add(show.id);
      const img = (ep.image && ep.image.original) || (show.image && (show.image.original || show.image.medium)) || '';
      if (!img) continue;
      const where = (show.webChannel && show.webChannel.name) || (show.network && show.network.name) || '';
      const se = ep.season && ep.number ? `S${ep.season} E${ep.number}` : '';
      const lead = src.premieresOnly ? (ep.season === 1 ? 'New series' : `Season ${ep.season} premiere`) : d < 0 ? 'New episode' : d === 0 ? 'New episode today' : 'New episode tomorrow';
      const sum = strip(ep.summary || show.summary || '');
      if (isSport(show.name, sum)) continue;
      out.push({ id: 'tvm' + ep.id, t: show.name, s: clip(`${lead}${se ? ' · ' + se : ''}${ep.name && !/^episode \d+$/i.test(ep.name) ? ' “' + ep.name + '”' : ''}${where ? ' · ' + where : ''}. ${sum}`, 230), img, url: show.officialSite || show.url, at: Date.parse(ep.airstamp || date) || Date.now(), kind: 'tv', where, ev: Date.parse(ep.airstamp || date) || 0 });
      if (out.length >= MAX_PER_SOURCE) return out;
    }
  }
  return out;
}

// 1.9.60 NZ free-to-air guide (TVNZ 1/2, DUKE, Three, Bravo, Eden) from the free Freeview XMLTV guide (matthuisman.nz / nzxmltv).
// The full file is 12 MB, so only fetch the byte ranges that hold these channels (they're stored one channel after another).
const EPG_CH = { 'tvnz-1': 'TVNZ 1', 'tvnz-2': 'TVNZ 2', 'tvnz-duke': 'DUKE', 'three': 'Three', 'bravo': 'Bravo', 'eden': 'Eden' };
async function fetchEpg(src) {
  const out = [], seen = new Set(), now = Date.now(), why = [];
  const nzh = t => +new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hourCycle: 'h23' }).format(t);
  const when = t => { const f = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(t).replace(/\s?([ap])\.?m\.?/i, '$1m');
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(t); return d === nzDate(0) ? 'Tonight ' + f.replace(/^\w+,?\s*/, '') : d === nzDate(1) ? 'Tomorrow ' + f.replace(/^\w+,?\s*/, '') : f; };
  for (const u of src.urls) { if (out.length) break; {
    // the .gz file isn't re-compressed in transit, so a byte range from its start can be unzipped (up to where it's cut off)
    let x = ''; try { const r = await fetch(u, { headers: { Range: `bytes=0-${src.gzBytes}`, 'User-Agent': UA }, signal: AbortSignal.timeout(20000) }); why.push(r.status); if (!r.ok) continue;
      const rd = r.body.pipeThrough(new DecompressionStream('gzip')).pipeThrough(new TextDecoderStream()).getReader();
      try { for (;;) { const { done, value } = await rd.read(); if (done) break; x += value; } } catch (e) { why.push('z:' + String(e && e.message).slice(0, 60)); } why.push(x.length); } catch (e) { why.push(String(e && e.message).slice(0, 40)); continue; }
    for (const m of x.matchAll(/<programme start="(\d{14}) ([+-]\d{4})"[^>]*channel="mjh-([a-z0-9-]+)">([\s\S]*?)<\/programme>/g)) {
      const ch = EPG_CH[m[3]]; if (!ch) continue;
      const p = m[1], t = Date.parse(`${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}T${p.slice(8, 10)}:${p.slice(10, 12)}:00${m[2].slice(0, 3)}:${m[2].slice(3)}`);
      if (!(t > now - 30 * 6e4 && t < now + 4 * 864e5)) continue;
      const h = nzh(t); if (h < 17 || h > 22) continue; // evening viewing only
      const g = m[4], tag = n => ent(((g.match(new RegExp(`<${n}[^>]*>([^<]*)</${n}>`)) || [])[1]) || '');
      const title = tag('title'), cats = [...g.matchAll(/<category[^>]*>([^<]*)</g)].map(c => c[1]).join(' '), desc = tag('desc');
      const img = ent((g.match(/<icon src="([^"]+)"/) || [])[1] || '');
      if (!title || !img || /nzxmltv\.com\/posters/.test(img) && /infomercial|quiz/i.test(img)) continue;
      if (/news|sport|advert|shopping|religio|current affairs|weather|horse|racing/i.test(cats) || /news|infomercial|sport|rugby|cricket|netball|league|racing|trackside|paid programming|church|hour of power/i.test(title) || isSport(title, desc)) continue;
      const key = title.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
      const sub = tag('sub-title'), url = tag('url') || (/^(three|bravo|eden)$/.test(m[3]) ? 'https://www.threenow.co.nz/' : 'https://www.tvnz.co.nz/');
      const comedy = /comedy|sitcom/i.test(cats + ' ' + desc.slice(0, 40)) || /simpsons|big bang|young sheldon|friends|seinfeld|modern family|brooklyn nine|ghosts|abbott|the office|parks and rec|bob's burgers|family guy|futurama|king of the hill|frasier|how i met|two and a half|mom\b|the goldbergs|superstore|schitt|kath|taskmaster|seven days|7 days|paying attention|would i lie|qi\b|spicks|after life|ted lasso|only murders/i.test(title);
      const nzm = /shortland street|seven days|7 days|taskmaster nz|paying attention nz|country calendar|fair go|celebrity treasure island|the traitors nz|married at first sight nz|the block nz|motorway patrol|border patrol|dog squad|kiwi|aotearoa|new zealand|nz\b/i.test(title + ' ' + desc.slice(0, 120));
      out.push({ id: 'epg' + hash(m[3] + p + title), t: title, s: clip(`${nzm ? '🇳🇿 NZ made · ' : ''}${when(t)} · ${ch}${sub ? ' · “' + sub + '”' : ''}. ${desc}`, 230), img, url, at: now, ev: t, kind: 'tv', where: ch, nz: 1, nzm: nzm ? 1 : 0, com: comedy ? 1 : 0 });
    }
  } }
  if (!out.length) throw new Error('guide: ' + why.join(','));
  out.sort((a, b) => (b.com + b.nzm) - (a.com + a.nzm) || (a.ev - b.ev));
  return out.slice(0, 16);
}

async function fetchApod() {
  let j = null;
  try { j = await (await get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&thumbs=true')).json(); } catch (e) { }
  if (j && j.url) {
    const vid = j.media_type === 'video' ? ((j.url.match(/youtube\.com\/embed\/([\w-]{11})/) || [])[1] || '') : '';
    return [{ id: 'apod' + j.date, t: j.title, s: clip(j.explanation || '', 230), img: j.media_type === 'image' ? (j.url || j.hdurl) : (j.thumbnail_url || (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : '')), vid: vid || undefined, url: 'https://apod.nasa.gov/apod/ap' + j.date.slice(2).replace(/-/g, '') + '.html', at: Date.parse(j.date + 'T05:00:00Z'), kind: vid ? 'video' : 'photo' }].filter(x => x.img);
  }
  const h = (await (await get('https://science.nasa.gov/apod/', { browser: true })).text()).slice(0, 80000); // fallback: NASA's APOD page
  const img = ent((h.match(/<meta property="og:image" content="([^"]+)"/i) || [])[1] || '');
  const cap = strip(JSON.parse('"' + ((h.match(/"@type":"ImageObject","@id":"https:\/\/assets\.science[^}]*?"caption":"((?:[^"\\]|\\.)*)"/) || [])[1] || '') + '"'));
  const day = (h.match(/"dateModified":"(\d{4}-\d\d-\d\d)/) || [])[1] || nzDate(0);
  if (!img) return [];
  return [{ id: 'apod' + day + hash(img), t: 'Astronomy Picture of the Day', s: clip(cap, 230), img, url: 'https://science.nasa.gov/apod/', at: Date.parse(day + 'T14:00:00Z') || Date.now(), kind: 'photo' }];
}

async function fetchInat(src) { // iNaturalist: popular research-grade wildlife photos from NZ this week
  const d1 = nzDate(-7), j = await (await get(src.url + '&d1=' + d1)).json();
  return (j.results || []).filter(o => o.photos && o.photos[0] && o.taxon).map(o => {
    const name = o.taxon.preferred_common_name || o.taxon.name, sci = o.taxon.name;
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    return { id: 'inat' + o.id, t: cap + (cap !== sci ? ` (${sci})` : ''), s: clip(`Seen ${o.place_guess ? 'at ' + o.place_guess : 'in New Zealand'}${o.user && o.user.login ? ' · photo by ' + o.user.login : ''} · ${o.taxon.iconic_taxon_name || 'Wildlife'}`, 200),
      img: o.photos[0].url.replace('/square.', '/large.'), url: o.uri, at: Date.parse(o.created_at) || Date.now(), kind: 'photo' };
  }).slice(0, MAX_PER_SOURCE);
}
/* 1.9.6 practical, closer-to-home interests: in these topics Reddit "look what I did" posts are dropped, a couple of plain pictures stay for
   variety, and how-to / tips / guides are kept first. Evergreen NZ tip sites (src.rotate) show this month's/season's guides first, then rotate daily. */
export const PRACTICAL_TOPICS = new Set(['garden', 'diy', 'food', 'gf', 'craft', 'creative', 'fitness', 'outdoors', 'travel', 'cars', 'collect', 'selling', 'dogs', 'kids', 'parent', 'nature']);
export const TIP_RE = /\b(how to|how i|how we|tips?|guides?|step[- ]by[- ]step|checklist|ways to|\d+ (ways|things|ideas|tips|steps)|what to (plant|do|grow|sow|pack|bring|cook|make)|when to|beginners?'?|tutorial|diy|advice|recipes?|easy|quick|hacks?|ideas?|planner|care|growing|grow|prun\w*|fix(ing)?|repair\w*|clean(ing)?|make|making|build(ing)?|patterns?|free pattern|lesson|explained|tricks?|basics|essentials|for kids|activities|routine|plan)\b/i;
export const SHOW_RE = /(look at (this|my|these|him|her)|\bi (did|made|finished|built|painted|knitted|crocheted|grew|caught|found|got|bought)\b|\bmy (first|latest|new|finished|little|current|husband'?s|wife'?s)\b|rate my|finished (my|this|it)|show(ing)? off|\[oc\]|\(oc\)|\boc\b|proud of|just (finished|completed|made|got)|after \d+ (years|months|weeks|hours)|before (and|&) after|\bmy (garden|haul|collection|setup|build|car|ride|dog|cat|boy|girl|baby)\b|what do you think|thoughts\?|first attempt|finally (finished|done|got)|\bi (decided|planted|harvested|picked|tried|caught|restored|refinished)\b|\b(this year|today)'?s? (harvest|haul|bloom)|\bhaul\b|appreciation post|happy (cake|birth)day)/i;
const SEASON_BAD = { summer: /\b(winter|autumn)\b/i, spring: /\b(winter|autumn)\b/i, autumn: /\b(spring|summer)\b/i, winter: /\b(spring|summer)\b/i };
const NZ_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function seasonWords(now = Date.now()) { const m = +new Date(now).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland', month: 'numeric' }) - 1, se = [11, 0, 1].includes(m) ? 'summer' : [2, 3, 4].includes(m) ? 'autumn' : [5, 6, 7].includes(m) ? 'winter' : 'spring'; return [NZ_MONTHS[m], se]; }
async function fetchPage(src, old) { // a site with no feed: its listing page, then each new article's og:image and title
  const h = (await (await get(src.url, { browser: true })).text()).slice(0, src.scan || 250000);
  const links = [], seen = new Set(), re = new RegExp(src.link.source, 'g');
  let found = src.sitemap ? [...h.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)].sort((a, b) => (Date.parse(b[2]) || 0) - (Date.parse(a[2]) || 0)) : null; // 1.9.0 sitemaps: most recently updated first
  if (found && src.rotate) { // evergreen tip sites: this month / season first, then a daily rotation through the rest
    const re2 = new RegExp(src.link.source), mine = found.filter(m => re2.test(absImg(ent(m[1]), src.url)) && !(src.notWant && src.notWant.test(m[1]))), [mon, se] = seasonWords(), off = SEASON_BAD[se];
    const hot = mine.filter(m => new RegExp('\\b' + mon + '\\b|\\b' + se + '\\b', 'i').test(m[1].replace(/[-_/]/g, ' '))), cold = mine.filter(m => !hot.includes(m) && !off.test(m[1].replace(/[-_/]/g, ' ')));
    const day = Math.floor(Date.now() / 864e5), k = cold.length ? (day * 3) % cold.length : 0; found = hot.slice(0, 3).concat(cold.slice(k), cold.slice(0, k));
  }
  for (const m of found || h.matchAll(src.jsonUrl ? /"url":"([^"#]+)"/g : /href=["']([^"'#]+)["']/g)) { const u = absImg(ent(m[1]), src.url); if (!seen.has(u) && re.test(u) && u !== src.url) links.push(u); seen.add(u); re.lastIndex = 0; if (links.length >= MAX_PER_SOURCE) break; }
  const out = []; let fetched = 0;
  for (const u of links) {
    const o = old.get(hash(u)); if (o) { out.push(o); continue; }
    if (fetched >= (src.prio ? 5 : 3)) continue; fetched++; // at most 3 new articles a run
    try {
      let a = (await (await get(u, { browser: true, ms: 8000 })).text()).slice(0, 400000); if (paywallHtml(a)) continue; { const e = a.indexOf('</head>'); a = e > 0 ? a.slice(0, e) : a.slice(0, 60000); } // 1.9.7 big WordPress heads
      const meta = p => ent((a.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)["']`, 'i')) || a.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`, 'i')) || [])[1] || '');
      let t = meta('og:title') || strip(tag(a, 'title'));
      if (src.slugTitle && (!t || src.slugTitle.test(t))) { const sl = decodeURIComponent(u.replace(/\/$/, '').split('/').pop()).replace(/[-_]+/g, ' ').replace(/[()]/g, '').trim(); t = sl.charAt(0).toUpperCase() + sl.slice(1); } // site gives no article title (ACT)
      if (src.trim) t = t.replace(src.trim, '').trim(); // e.g. ' Recipe | HelloFresh'
      const img = absImg(meta('og:image').replace(/^https?:\/\/\//, new URL(u).origin + '/').replace(/^file:\/\/\/?/, '/').replace(/%3F.*$/i, ''), u); // (Yates writes file:/// in og:image)
      if (src.notWant && src.notWant.test(t)) continue; if (src.want && !src.want.test(t + ' ' + u)) continue;
      if (t && (img || src.img)) out.push({ id: hash(u), t: clip(strip(t), 160), s: clip(strip(meta('og:description')), 200), url: u, img: img || src.img, at: Date.parse(meta('article:published_time')) || Date.now(), kind: 'photo' });
    } catch (e) { }
  }
  return out;
}

async function runSource(src, old = new Map()) {
  let items;
  if (src.kind === 'yt') items = await fetchYt(src);
  else if (src.kind === 'inat') items = await fetchInat(src);
  else if (src.kind === 'page') items = await fetchPage(src, old);
  else if (src.kind === 'tvmaze') items = await fetchTvmaze(src);
  else if (src.kind === 'epg') items = await fetchEpg(src);
  else if (src.kind === 'apod') items = await fetchApod();
  else if (src.kind === 'efrss') { // 1.6.1: several Eventfinda RSS feeds, kept to matching events (src.want), soonest first
    items = []; for (const u of src.urls) { try { for (const i of parseRss(await (await get(u, { tries: 2 })).text(), src)) if (!items.some(x => x.id === i.id)) items.push(i); } catch (e) { } }
    items.sort((x, y) => (x.ev || 0) - (y.ev || 0));
  }
  else if (src.kind === 'special') { // 1.8.6 pinned card; the listing says if it's postponed or cancelled
    let status = '', note = '';
    try { const h = await (await get(src.page, { tries: 2 })).text(); const m = h.match(/class="event-status (postponed|cancelled)"[^>]*>([^<]{0,200})/i); if (m) { status = m[1].toLowerCase(); note = strip(m[2]); } } catch (e) { }
    items = [{ ...src.item, status, note, pin: 1, kind: 'event', at: (old.get(src.item.id) || {}).at || Date.now() }];
  }
  else if (src.kind === 'static') items = src.items.map((x, n) => ({ id: hash(x.url), t: x.t, s: x.s, url: x.url, img: x.img, party: x.party, at: (src.at || Date.now()) - n * 60e3, kind: 'photo' })); // fixed cards (e.g. candidate profiles)
  else if (src.kind === 'drip') { // 1.9.69 a few cards a day from a fixed list, in a shuffled order, each with its own id (spread through the day)
    const day = Math.floor((Date.now() + 13 * 36e5) / 864e5), L = src.items, n = src.drip || 3, start = Date.parse(new Date(day * 864e5).toISOString().slice(0, 10) + 'T07:00:00+13:00');
    items = []; for (let k = 0; k < n; k++) { const x = L[(day * n + k) % L.length]; items.push({ id: src.id + ':' + x.id, t: x.t, s: x.s, url: src.url, img: x.img, at: Math.min(Date.now(), start + k * 4 * 36e5), kind: 'photo' }); }
  }
  else {
    const xml = await (await get(src.url, { tries: 2 })).text();
    items = src.kind === 'reddit' ? parseReddit(xml, src) : parseRss(xml, src);
    if (src.kind === 'reddit') { // 1.9.93 how long each Reddit clip is (short ones fill the stories row: no ads, under 30s)
      for (const i of items) { const o = old.get(i.id); if (o && o.vdur) i.vdur = o.vdur; }
      await Promise.all(items.filter(i => i.vk === 'reddit' && i.vu && !i.vdur).slice(0, 6).map(async i => { try { const t = await (await get(`https://v.redd.it/${i.vu}/DASHPlaylist.mpd`, { tries: 1, ms: 5000 })).text();
        const m = t.match(/mediaPresentationDuration="PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?"/); if (m) i.vdur = Math.round((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)); } catch (e) { } }));
    }
    if (src.og) { // 1.6.0: fetch a picture straight away for a couple of new posts (the rest are filled over later runs)
      let n = 0; const lim = src.prio ? 4 : 2;
      for (const i of items) { if (i.img) continue; const o = old.get(i.id); if (o && o.img) { i.img = o.img; continue; } }
      await Promise.all(items.filter(i => !i.img).slice(0, lim).map(async i => { try { const u = await ogImage(i.url); if (u === 'PAYWALL') i.pay = 1; else if (u) { i.img = absImg(u, i.url); i.kind = 'photo'; } else if (src.img) i.img = src.img; } catch (e) { if (src.img) i.img = src.img; } n++; }));
    }
  }
  if (src.kind === 'reddit' && PRACTICAL_TOPICS.has(src.topic) && !src.showOk) { // 1.9.6: no show-off posts; tips first, a couple of plain pictures for variety, all with a picture
    let pics = 0; const lim = src.picMax ?? 2;
    items = items.filter(i => i.img && !SHOW_RE.test(i.t)).map(i => ({ i, tip: TIP_RE.test(i.t) })).sort((a, b) => b.tip - a.tip).filter(x => x.tip || pics++ < lim).map(x => x.i);
  }
  return items.filter(i => !isSport(i.t, i.s, i.url) && !isUnsafe(i, src.topic) && !isPaywalled(i)).slice(0, MAX_PER_SOURCE)
    .map(i => ({ ...i, src: src.id, sn: src.name, topic: src.topic, tag: i.tag || src.tag || undefined, party: i.party || src.party || undefined }));
}

async function ogImage(url) { // RNZ items have no picture in the feed: read the article's og:image
  const r = await get(url, { browser: true, ms: 8000 });
  let h = (await r.text()).slice(0, 200000); if (paywallHtml(h)) return 'PAYWALL'; const e = h.indexOf('</head>'); if (e > 0) h = h.slice(0, e); // only the <head> (some WordPress heads are big)
  return ent((h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || h.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) || [])[1] || '');
}

/* 1.9.31 the stored feed lives in the family Durable Object's SQLite (no KV daily write limit). KV keeps a once-a-day backup only. */
const famDO = env => env.FAMILY.get(env.FAMILY.idFromName('family'));
async function loadSt(env, strict) {
  try { const r = await famDO(env).fetch('https://do/feedstore', { headers: { 'X-Seed-Key': env.SEED_KEY || '' } }); if (!r.ok) throw new Error('feedstore ' + r.status); const t = await r.text(); if (t && t !== 'null') return JSON.parse(t); }
  catch (e) { if (strict) throw e; } // the cron never falls back to the older KV copy on a hiccup (it would overwrite newer data)
  return (await env.FEED_KV.get('feed', 'json')) || { items: [], src: {} }; // first run after the move (or a read hiccup on /feed.json)
}
async function saveSt(env, st) {
  const day = nzDate(0), backup = st.kvDay !== day; if (backup) st.kvDay = day; // stamped before saving, so the next run knows today's backup is done
  const body = JSON.stringify(st), r = await famDO(env).fetch('https://do/feedstore', { method: 'PUT', headers: { 'X-Seed-Key': env.SEED_KEY || '' }, body });
  if (!r.ok) throw new Error('feedstore save ' + r.status);
  if (backup) { try { await env.FEED_KV.put('feed', body); } catch (e) { } } // one KV write a day (a spare copy)
}

async function refresh(env, only) {
  const st = await loadSt(env, true);
  const now = Date.now();
  let subjects = { skipped: 'manual' };
  if (!only) { try { subjects = await runSubjects(env, st); } catch (e) { subjects = { err: String(e && e.message || e).slice(0, 160) }; } }
  let due;
  if (only) { const ids = only.split(','); due = SOURCES.filter(s => ids.includes(s.id)); } // several at once = one KV write
  else {
    const lastTry = s => (st.src[s.id] || {}).tried || 0;
    const prio = SOURCES.filter(s => s.prio && live(s, now) && now - lastTry(s) > ELECTION_STALE).sort((a, b) => lastTry(a) - lastTry(b)).slice(0, 2); // up to 2 election sources first
    due = prio.concat(SOURCES.filter(s => !s.prio && live(s, now)).sort((a, b) => lastTry(a) - lastTry(b))
      .filter(s => now - lastTry(s) > STALE - 25 * 60e3));
    let yts = 0, pgs = 0; due = due.filter(s => (s.kind !== 'yt' || ++yts <= (lastTry(s) ? 2 : 3)) && (s.kind !== 'page' || ++pgs <= 1)).slice(0, PER_RUN); // at most 2 YouTube pages and 1 scraped site per run (CPU)
  }
  let wtNew = false; // 1.9.24 📺 Coming up to watch: every ~6 hours
  if (!only && now - (st.watchAt || 0) > 6 * 36e5) { st.watchAt = now; try { const w = await fetchWatch(now); st.watch = w.items; st.watchOk = now; delete st.watchErr; } catch (e) { st.watchErr = String(e && e.message || e).slice(0, 200); } wtNew = true; }
  else if (!only && now - (st.cnAt || 0) > 6 * 36e5) { // 1.9.31 🎤 big Auckland concerts, every ~6 hours (its own run: up to ~25 page reads)
    st.cnAt = now; try { const c = await fetchConcerts(now, st.cnMeta || {}, isUnsafe); st.concerts = c.items; st.cnMeta = { dates: c.dates, imgs: c.imgs }; st.cnOk = now; st.cnSrc = c.ok; delete st.cnErr; } catch (e) { st.cnErr = String(e && e.message || e).slice(0, 200); }
    wtNew = true; due = [];
  }
  if (st.watch) st.watch = st.watch.filter(i => i.ev > now - 7 * 864e5);
  if (st.concerts) st.concerts = st.concerts.filter(i => i.days[i.days.length - 1] >= nzDate(0));
  if (!due.length && !wtNew) {
    if (st.subjectsChanged) { delete st.subjectsChanged; st.updated = now; try { await saveSt(env, st); } catch (e) { return { ran: [], subjects, err: String(e.message || e) }; } return { ran: [], subjects }; }
    const exN = await enrichExplain(st, env, get);
    if (exN) { st.updated = now; try { await saveSt(env, st); } catch (e) { return { ran: [], ex: exN, err: String(e.message || e) }; } return { ran: [], ex: exN }; }
    return { ran: [] };
  }
  const res = await Promise.all(due.map(async s => { try { return [s, (await runSource(s, new Map(st.items.filter(i => i.src === s.id).map(i => [i.id, i])))).slice(0, s.max || MAX_PER_SOURCE)]; } catch (e) { return [s, null, String(e && e.message || e)]; } }));
  const ran = [];
  for (const [s, items, err] of res) {
    const info = st.src[s.id] || {}; info.tried = now;
    if (items && (items.length || s.kind === 'tvmaze')) {
      const old = new Map(st.items.filter(i => i.src === s.id).map(i => [i.id, i]));
      for (const i of items) { const o = old.get(i.id); if (o && o.img && !i.img) i.img = o.img; if (o && o.first) i.first = o.first; else i.first = now; if (o && o.exc && i.exc == null) { i.ex = o.ex || []; i.exc = 1; } if (o && o.snt != null && i.snt == null) { i.snt = o.snt; if (o.neg) i.neg = 1; if (o.pos) i.pos = 1; } }
      st.items = st.items.filter(i => i.src !== s.id).concat(items);
      info.ok = now; info.n = items.length; delete info.err;
    } else info.err = err || 'no items';
    if (s._via) info.via = s._via;
    st.src[s.id] = info; ran.push(s.id + ':' + (items ? items.length : 'ERR ' + err));
  }
  // pictures for a few news items that don't have one yet
  const srcOf = id => SOURCES.find(s => s.id === id) || {};
  st.items = st.items.filter(i => !i.src || srcOf(i.src).id || isAutoItem(i)); // 1.9.6 removed sources drop out; daily Commons subjects stay
  const needImg = st.items.filter(i => !i.img && !i.noimg && srcOf(i.src).og).sort((a, b) => (srcOf(b.src).prio ? 1 : 0) - (srcOf(a.src).prio ? 1 : 0)).slice(0, 5);
  await Promise.all(needImg.map(async i => { const fb = srcOf(i.src).img; try { const u = await ogImage(i.url); if (u === 'PAYWALL') i.pay = 1; else if (u) { i.img = u; i.kind = 'photo'; } else if (fb) i.img = fb; else i.noimg = 1; } catch (e) { if (fb) i.img = fb; else i.noimg = 1; } })); // fb: the party logo when an article has no picture
  // 1.9.24 paywall probe: a few not-yet-checked news articles a run (RSS and Reddit link-outs); a locked page drops out
  const FREE = /(?:^|\.)(?:rnz\.co\.nz|stuff\.co\.nz|1news\.co\.nz|thespinoff\.co\.nz|youtube\.com|reddit\.com|redd\.it|eventfinda\.co\.nz|inaturalist\.org|nasa\.gov|doc\.govt\.nz)$/i;
  const probe = st.items.filter(i => !i.pwc && !i.pay && i.kind !== 'video' && /^https?:/.test(i.ext || i.url || '') && !FREE.test(new URL(i.ext || i.url).hostname) && !['page', 'static', 'special', 'yt', 'tvmaze', 'apod', 'inat', 'efrss'].includes(srcOf(i.src).kind)).sort((a, b) => (b.first || 0) - (a.first || 0)).slice(0, 4);
  await Promise.all(probe.map(async i => { i.pwc = 1; try { const r = await get(i.ext || i.url, { browser: true, ms: 6000 }); if (paywallHtml((await r.text()).slice(0, 300000))) i.pay = 1; } catch (e) { } }));
  // 1.9.24 upbeat: a tiny Workers AI sentiment pass on a few new headlines a run (distilbert, a fraction of a neuron each; free budget)
  if (env.AI) { const NEWS_T = new Set(['nz', 'election', 'science', 'tech', 'travel', 'social', 'events', 'food', 'fitness', 'parent']);
    const todo = st.items.filter(i => i.snt == null && NEWS_T.has(srcOf(i.src).topic || i.topic)).sort((a, b) => (b.first || 0) - (a.first || 0)).slice(0, 10);
    await Promise.all(todo.map(async i => { try { const r = await env.AI.run('@cf/huggingface/distilbert-sst-2-int8', { text: String(i.t + '. ' + (i.s || '')).slice(0, 400) }); const neg = ((r || []).find(x => x.label === 'NEGATIVE') || {}).score || 0; i.snt = Math.round((1 - neg) * 100) / 100; if (neg > 0.93) i.neg = 1; else if (neg < 0.07) i.pos = 1; } catch (e) { i.snt = -1; } }));
  }
  // 1.9.78 📍 explain labels
  const exN = await enrichExplain(st, env, get);
  const keep = new Set(SOURCES.filter(s => live(s, now)).map(s => s.id)); // election sources drop out by themselves after election night
  st.items = st.items.filter(i => (keep.has(i.src) || isAutoItem(i)) && now - (i.first || i.at) < MAX_AGE && !isSport(i.t, i.s) && !isUnsafe(i) && !isPaywalled(i)
    && !NON_NZ_FOOD_SRC.has(i.src) && !((i.topic === 'food' || i.topic === 'gf') && NON_NZ_FOOD.test(i.t + ' ' + (i.s || '') + ' ' + (i.url || '') + ' ' + (i.sn || '')))
    && !isDryDull(i)); // 1.9.84 fun mix: no crime/politics/dull news in main store
  st.updated = now;
  try { await saveSt(env, st); } catch (e) { return { ran, err: String(e.message || e) }; } // 1.9.31 Durable Object SQLite, not KV
  return { ran, ex: exN };
}

const SRC_NAME = new Map(SOURCES.map(x => [x.id, x.name]));
const BLOCK_IDS = new Set(['4qrdzz', '4ek9op']); // 1.7.1: the two r/museum nude photos (André de Dienes 'Nude', van Moerkerken 'Shower')
const SRC_NZ = new Set(SOURCES.filter(s => s.nz).map(s => s.id));
export function publicFeed(st) {
  const month = Number(nzDate(0).slice(5, 7)) - 1, mName = new Date(Date.UTC(2026, month, 15)).toLocaleString('en-NZ', { month: 'long' });
  const tips = GARDEN_TIPS[month].map((t, n) => ({ id: `tip${month}-${n}`, t: `Northland garden, ${mName}`, s: t, kind: 'tip', topic: 'garden', src: 'tips', sn: 'Northland garden calendar', at: Date.now() - (n + 1) * 5 * 36e5 }));
  const now = Date.now(), sources = SOURCES.filter(s => live(s, now)).map(s => ({ id: s.id, name: s.name, topic: s.topic, int: s.int, party: s.party, until: s.until, mood: s.mood, ok: (st.src[s.id] || {}).ok || 0, n: (st.src[s.id] || {}).n || 0, ...(s.kind === 'epg' && (st.src[s.id] || {}).err ? { err: String(st.src[s.id].err).slice(0, 120) } : {}) }));
  const autoRows = autoSourceRows(st);
  const keepSrc = new Set(sources.map(s => s.id).concat(autoRows.map(s => s.id))), items = st.items.map(i => i.img ? { ...i, img: upsize(i.img) } : i).filter(i => (i.img || i.vid) && keepSrc.has(i.src) && !isPaywalled(i) && !(i.kind === 'event' && i.ev && i.ev < now - 6 * 36e5) && !isUnsafe(i) && !BLOCK_IDS.has(i.id) && !NON_NZ_FOOD_SRC.has(i.src) && !((i.topic === 'food' || i.topic === 'gf') && NON_NZ_FOOD.test(i.t + ' ' + (i.s || '') + ' ' + (i.url || '') + ' ' + (i.sn || ''))) && !isDryDull(i)).map(({ first, noimg, exc, ...i }) => { const o = { ...i, sn: (SRC_NAME.get(i.src) || i.sn), first }; if (o.ex && o.ex.length) { o.ex = o.ex.filter(goodEx); if (!o.ex.length) delete o.ex; } else delete o.ex; return o; }); // 1.8.5 upsize: no thumbnails // 1.4: every card has a picture
  const watch = (st.watch || []).filter(i => i.ev > now - 7 * 864e5 && i.ev < now + 15 * 864e5 && !isUnsafe(i));
  const concerts = (st.concerts || []).filter(i => i.img && i.ev > now - 864e5 && !isSport(i.t, '') && !isUnsafe(i)); // 1.9.31 🎤
  // 1.9.34 🏡 home & time-saving tips go in their own list (the app shows one every other day at most, to everyone); NZ first
  const hometips = items.filter(i => i.topic === 'hometips' && i.img && !MONEY_RE.test(i.t + ' ' + (i.s || '')) && !/sponsor\w*|affiliate|nuffnang|giveaway|\$\s?\d/i.test(i.t + ' ' + (i.s || ''))).map(i => ({ ...i, id: 'ht-' + i.id, nz: SRC_NZ.has(i.src) ? 1 : 0 })).slice(0, 80);
  // 1.9.39 🎥 vlogs: their own list (the app shows 1–2 a day to each person, matched to what they like); newest first, NZ flagged
  const VT = Object.fromEntries(SOURCES.filter(s => s.topic === 'vlogs').map(s => [s.id, s])), SPORTV = /\b(rugby|football|soccer|cricket|netball|nba|nfl|golf|tennis|boxing|ufc|f1|race)\b/i;
  const vlogs = items.filter(i => i.topic === 'vlogs' && i.vid && i.img && VT[i.src] && !MONEY_RE.test(i.t + ' ' + (i.s || '')) && !SPORTV.test(i.t)).map(i => ({ ...i, id: 'vl-' + i.id, vt: VT[i.src].vt, nz: VT[i.src].nz ? 1 : 0 })).filter((i, n, a) => a.slice(0, n).filter(x => x.src === i.src).length < 5).slice(0, 160); // 1.9.42 up to 5 per channel so every channel gets a turn
  return { updated: st.updated || 0, refreshEveryMin: 160, sources: sources.filter(s => s.topic !== 'hometips' && s.topic !== 'vlogs').concat(autoRows), items: items.filter(i => i.topic !== 'hometips' && i.topic !== 'vlogs').concat(tips), hometips, vlogs, watch, watchOk: st.watchOk || 0, concerts, concertsOk: st.cnOk || 0 };
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname.startsWith('/api/')) { // 1.7.0 private family network (members, comments, settings)
      const h = cors(req);
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
      if (!h['Access-Control-Allow-Origin'] && u.pathname !== '/api/bootstrap' && !req.headers.get('Authorization')) return new Response('forbidden', { status: 403, headers: h });
      const r = await env.FAMILY.get(env.FAMILY.idFromName('family')).fetch(req);
      const out = new Response(r.body, r); for (const [k, v] of Object.entries(h)) out.headers.set(k, v); out.headers.set('Cache-Control', /^\/api\/photos\/\d+$/.test(u.pathname) && r.ok ? 'private, max-age=604800' : 'no-store'); return out;
    }
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (u.pathname === '/feed.json') {
      const ck = new Request('https://cache.local/feed.json?v=ex6'), hit = await caches.default.match(ck);
      if (hit) return hit;
      const body = JSON.stringify(publicFeed(await loadSt(env)));
      const res = new Response(body, { headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
      ctx.waitUntil(caches.default.put(ck, res.clone()));
      return res;
    }
    if (u.pathname === '/status') {
      const st = await loadSt(env);
      let rx = null; try { rx = await (await famDO(env).fetch('https://do/rxcheck', { headers: { 'X-Seed-Key': env.SEED_KEY || '' } })).json(); } catch (e) { }
      return new Response(JSON.stringify({ rx, updated: st.updated, total: st.items.length, src: st.src, concerts: (st.concerts || []).length, cnOk: st.cnOk, cnErr: st.cnErr, cnSrc: st.cnSrc, watchOk: st.watchOk }, null, 1), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    if (u.pathname === '/seed' && env.SEED_KEY && u.searchParams.get('key') === env.SEED_KEY) return Response.json(await refresh(env, u.searchParams.get('src'))); // manual refresh of one source (key is a Worker secret)
    if (u.pathname === '/peek' && env.SEED_KEY && u.searchParams.get('key') === env.SEED_KEY) { const r = await get(u.searchParams.get('u'), { browser: true }); const h = await r.text(); return Response.json({ status: r.status, len: h.length, og: await ogImage(u.searchParams.get('u')).catch(e => 'ERR ' + e.message), links: (h.match(/href=["'][^"'#]+["']/g) || []).slice(0, 40), head: h.slice(0, 300), find: u.searchParams.get('find') ? h.slice(Math.max(0, h.indexOf(u.searchParams.get('find')) - 200), h.indexOf(u.searchParams.get('find')) + 2500) : '' }); } // debugging only (needs the seed key)
    if (u.pathname === '/test') { // dry run of one source (nothing is saved)
      const s = SOURCES.find(x => x.id === u.searchParams.get('src'));
      if (!s) return new Response('unknown source', { status: 404 });
      try { const items = await runSource(s); return Response.json({ n: items.length, via: s._via || 'feed', items: items.slice(0, 4) }, { headers: CORS }); } catch (e) { return Response.json({ err: String(e.message || e) }, { headers: CORS }); }
    }
    return new Response('My Feed data service. The app is at https://shane-my-feed.pages.dev', { headers: CORS });
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(refresh(env)); ctx.waitUntil(env.FAMILY.get(env.FAMILY.idFromName('family')).fetch('https://do/api/tick', { headers: { 'X-Seed-Key': env.SEED_KEY || '' } }).catch(() => { })); }, // 1.9.0 daily drop + reminders
  refresh
};
