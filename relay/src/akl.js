/* 2.27.58: upcoming Auckland concerts for My App's Entertainment › Concerts tab.
 * Source: Eventfinda's public RSS feed /feed/events/auckland/concerts-gig-guide/upcoming.rss (same feed family as nightlife.js),
 * credited in the app. Only major ticketed concerts: a named Auckland concert venue, or a concert word in the title at a non-pub venue.
 * Pub gigs, jams, open mics, DJ, crawls and regular weekly nights are left out. Cached in KV for 12 hours. */
import { nzToday, addDaysISO } from './events.js';
import { parseEf } from './nightlife.js';

const FEED = 'https://www.eventfinda.co.nz/feed/events/auckland/concerts-gig-guide/upcoming.rss';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; DueDatesRelay/1.0; personal family app)', Accept: 'application/rss+xml, application/xml, text/xml' };
const KV_KEY = 'ef-akl-v1', MAX_AGE = 12 * 3600 * 1000, PAGES = 15;
export const AKL_VENUE = /\b(spark arena|civic|town hall|eden park|western springs|aotea|kiri te kanawa|powerstation|power station|bruce mason|holy trinity cathedral|st matthew'?s|logan campbell|go media stadium|mt smart|mount smart|tuning fork|hollywood avondale|q theatre|asb waterfront theatre|auckland theatre|bowl of brooklands|trusts arena|due drop|vector arena|the studio|whammy|tuning fork)\b/i;
const WORD = /\b(concert|orchestra|symphony|philharmonic|choir|chorus|recital|opera|in concert|world tour|nz tour|tour)\b/i;
const NOT = /\b(open mic|jam|dj|karaoke|quiz|trivia|crawl|party|burlesque|disco|club night|happy hour|bingo|workshop|lesson|class|session|sessions|house band|residency|every|podcast|comedy|stand-?up|talk|quiz night)\b/i;
const PUB = /\b(tap ?room|tavern|bar|pub|inn|hotel|brewery|cruising club|yacht club|rsa|cafe|restaurant)\b/i;
export function aklPick(items, today) {
  const until = addDaysISO(today, 365), seen = new Set(), out = [];
  for (const x of items) {
    if (x.regular || x.date < today || x.date > until || NOT.test(x.title)) continue;
    const v = String(x.venue || '').replace(/^.*?\d[ap]m\s*[–-]\s*[^,]*,\s*/i, '').trim();
    if (!(AKL_VENUE.test(v) || (WORD.test(x.title) && !PUB.test(v)))) continue;
    const k = x.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + '|' + x.date;
    if (seen.has(k)) continue; seen.add(k);
    out.push({ id: 'akl-' + x.guid + '-' + x.date, title: x.title, url: x.url, date: x.date, time: x.time, endTime: x.endTime, timeKnown: !!x.time,
      venue: v, desc: x.desc, cats: ['Concert', 'Auckland'], src: 'Eventfinda' });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'));
}
async function page(fetchImpl, p) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 12000);
  try { const r = await fetchImpl(FEED + (p > 1 ? '?page=' + p : ''), { headers: UA, signal: ctl.signal }); if (!r.ok) throw new Error('ef_' + r.status); return await r.text(); }
  finally { clearTimeout(to); }
}
export async function fetchAkl(fetchImpl = fetch, now = Date.now()) {
  const all = []; let ok = 0;
  for (let p = 1; p <= PAGES; p++) { try { const it = parseEf(await page(fetchImpl, p), 'Concert'); ok++; all.push(...it); if (it.length < 15) break; } catch (e) { break; } }
  if (!ok) throw new Error('akl_unavailable');
  return { at: now, events: aklPick(all, nzToday(now)) };
}
let mem = null, busy = null;
export async function getAkl(env, fetchImpl = fetch, now = Date.now()) {
  if (mem && now - mem.at < MAX_AGE) return mem.events;
  const kv = env && env.EVENTS_KV; let st = null;
  if (kv) { try { st = await kv.get(KV_KEY, { type: 'json' }); } catch (e) { } }
  if (st && Array.isArray(st.events) && now - st.at < MAX_AGE) { mem = st; return st.events; }
  busy = busy || fetchAkl(fetchImpl, now).then(async s => { mem = s; if (kv) { try { await kv.put(KV_KEY, JSON.stringify(s)); } catch (e) { } } return s; }).finally(() => { busy = null; });
  try { return (await busy).events; }
  catch (e) { if (st && Array.isArray(st.events)) { mem = { at: now - MAX_AGE + 3600e3, events: st.events }; return st.events; } return []; }
}
