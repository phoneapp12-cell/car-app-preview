/* 2.23.15: nightlife and evening shows around Whangārei and Northland, from Eventfinda's public RSS feeds
 * (gigs and concerts, comedy, theatre, plus evening events in the general What's On feed: quiz, DJ, karaoke,
 * open mic, night markets). Eventfinda is NZ's main event listing site; every item links back to its page.
 * Read at most every 6 hours (about 10 small feed pages), kept in KV, merged into GET /events. No AI, nothing made up:
 * only what the feed says (title, start date/time, end time, venue, town, short description). */
import { decode, text, clip, nzToday, addDaysISO } from './events.js';

const EF = 'https://www.eventfinda.co.nz/feed/events/';
export const EF_FEEDS = [
  ['whangarei-district/concerts-gig-guide', 3, 'Live music'],
  ['northland/concerts-gig-guide', 3, 'Live music'],
  ['whangarei-district/comedy', 1, 'Comedy'],
  ['northland/comedy', 1, 'Comedy'],
  ['whangarei-district/theatre', 1, 'Theatre'],
  ['whangarei-district/whatson', 3, '']
];
const KV_KEY = 'ef-night-v1';
const MAX_AGE = 6 * 3600 * 1000;
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; DueDatesRelay/1.0; personal family app)', Accept: 'application/rss+xml, application/xml, text/xml' };
// Towns close enough for a night out from Onerahi / Whangārei (the whole of Whangārei District, plus a little further)
const NEAR = /whang|onerahi|tutukaka|ngunguru|hikurangi|kamo|waipu|ruakaka|bream bay|marsden|parua|maungakaramea|kensington|tikipunga|raumanga|maunu|portland|mangawhai|kaiwaka|dargaville|kerikeri|paihia|russell|kawakawa|bay of islands|matapouri|oakura|marua|glenbervie|whatitiri|titoki|poroti|pataua|whananaki|langs|one tree point/i;
const NIGHT_WORDS = /\b(quiz|trivia|dj|djs|karaoke|open mic|gig|live music|band|comedy|stand[- ]?up|improv|night market|late night|cabaret|drag|burlesque|disco|dance party|club night|jazz|blues|acoustic|concert|theatre|musical|show|tour)\b/i;
const KIDS = /\b(kids?|children|toddler|school holiday|storytime|playgroup)\b/i;

const plain = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function t12(h, m, ap) { let H = (+h) % 12; if (/pm/i.test(ap)) H += 12; return String(H).padStart(2, '0') + ':' + String(m || '00').padStart(2, '0'); }
// One feed page -> items
export function parseEf(xml, cat = '') {
  const out = [];
  for (const it of String(xml || '').split('<item>').slice(1)) {
    const g = re => ((it.match(re) || [])[1] || '');
    const title = text(g(/<title>([\s\S]*?)<\/title>/));
    const link = decode(g(/<link>([\s\S]*?)<\/link>/)).replace(/\?utm_medium=rss$/, '').trim();
    const pub = g(/<pubDate>(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/) ? it.match(/<pubDate>(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/) : null;
    const guid = g(/<guid[^>]*>(\d+)<\/guid>/);
    if (!title || !/^https:\/\/www\.eventfinda\.co\.nz\//.test(link) || !pub || !guid) continue;
    if (/\b(cancell?ed|postponed|sold out)\b/i.test(title)) continue;
    const cdata = g(/CDATA\[([\s\S]*?)\]\]/);
    const [whenVenue, town0] = cdata.split(/<br\s*\/?>/i).map(text);
    const town = (town0 || '').trim();
    const m = (whenVenue || '').match(/^(.*\d[ap]m), (.*)$/i);
    const when = m ? m[1] : '', venue = m ? m[2].trim() : (whenVenue || '').replace(/^[^,]*,\s*/, '').trim();
    const times = [...when.matchAll(/(\d{1,2})(?:\.(\d{2}))?\s*([ap]m)/gi)];
    const multi = /\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b[\s\S]*\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b/.test(when);
    const time = pub[2] + ':' + pub[3];
    const endTime = times.length > 1 && !multi ? t12(times[1][1], times[1][2], times[1][3]) : '';
    const descHtml = decode(g(/<description>([\s\S]*?)<\/description>/));
    const desc = clip(text((descHtml.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || ''), 300);
    out.push({ guid, title: title.slice(0, 160), url: link, date: pub[1], time: time === '00:00' ? '' : time, endTime: endTime && endTime !== time ? endTime : '',
      venue: [venue, town && !plain(venue).includes(plain(town).slice(0, 6)) ? town : ''].filter(Boolean).join(', ').slice(0, 200), town, desc, cat, regular: multi });
  }
  return out;
}
// Keep evening things near home; tag them
export function nightPick(items, today) {
  const until = addDaysISO(today, 60), seen = new Set(), out = [];
  for (const x of items) {
    if (seen.has(x.guid) || x.date < today || x.date > until) continue;
    if (!NEAR.test(x.town + ' ' + x.venue)) continue;
    const hay = x.title + ' ' + x.desc;
    const evening = x.time && x.time >= '17:00';
    if (!x.cat && !(evening && NIGHT_WORDS.test(hay))) continue; // general What's On: evening nightlife-type things only
    if (!evening) continue; // afternoon jazz, matinees etc. aren't nightlife
    if (KIDS.test(hay)) continue;
    seen.add(x.guid);
    const kind = x.cat || (/\bquiz|trivia\b/i.test(hay) ? 'Quiz night' : /\bcomedy|stand[- ]?up|improv\b/i.test(hay) ? 'Comedy' : /\bdj|disco|club night|dance party\b/i.test(hay) ? 'DJ night' : /\bnight market\b/i.test(hay) ? 'Night market' : /\bkaraoke\b/i.test(hay) ? 'Karaoke' : 'Live music');
    out.push({
      id: 'ef-' + x.guid + '-' + x.date, title: x.title, url: x.url, date: x.date, end: '', time: x.time, endTime: x.endTime, timeKnown: !!x.time && !x.regular,
      venue: x.venue, desc: x.regular ? ('Regular event, check the dates on the page. ' + x.desc).slice(0, 320) : x.desc,
      cats: ['Nightlife', kind], cost: '', src: 'Eventfinda'
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'));
}
async function feedPage(fetchImpl, path, page) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetchImpl(EF + path + '/upcoming.rss' + (page > 1 ? '?page=' + page : ''), { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error('ef_' + r.status);
    return await r.text();
  } finally { clearTimeout(to); }
}
export async function fetchNightlife(fetchImpl = fetch, now = Date.now()) {
  const all = []; let ok = 0;
  for (const [path, pages, cat] of EF_FEEDS) {
    for (let p = 1; p <= pages; p++) {
      try { const items = parseEf(await feedPage(fetchImpl, path, p), cat); ok++; all.push(...items); if (items.length < 15) break; } catch (e) { break; }
    }
  }
  if (!ok) throw new Error('nightlife_unavailable');
  // the category feeds come first, so a gig keeps its "Live music" tag when it is also in What's On
  return { at: now, events: nightPick(all, nzToday(now)) };
}
let mem = null, busy = null;
export async function getNightlife(env, fetchImpl = fetch, now = Date.now()) {
  if (mem && now - mem.at < MAX_AGE) return mem.events;
  const kv = env && env.EVENTS_KV;
  let st = null;
  if (kv) { try { st = await kv.get(KV_KEY, { type: 'json' }); } catch (e) { } }
  if (st && Array.isArray(st.events) && now - st.at < MAX_AGE) { mem = st; return st.events; }
  busy = busy || fetchNightlife(fetchImpl, now).then(async s => { mem = s; if (kv) { try { await kv.put(KV_KEY, JSON.stringify(s)); } catch (e) { } } return s; }).finally(() => { busy = null; });
  try { return (await busy).events; }
  catch (e) { if (st && Array.isArray(st.events)) { mem = { at: now - MAX_AGE + 3600e3, events: st.events }; return st.events; } return []; }
}
export function resetNightlife() { mem = null; busy = null; }
