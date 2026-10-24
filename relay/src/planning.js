/* 2.27.83: Planning & development updates for the bell page (Whangārei, Northland, and the new highways to Auckland).
 *
 * Sources (each checked for terms and robots.txt):
 *   Whangārei District Council "News and notices" (main list + the Projects, Plans/strategies, Consultations,
 *     Improvement works and Business and economy category lists). Council terms allow personal, non-commercial use;
 *     robots.txt is read once a day and the list is skipped if it's ever disallowed. Alcohol licence notices are left out.
 *   Beehive (NZ Government releases, Crown copyright CC BY 4.0) RSS: only Northland or Northland Corridor stories.
 *   RNZ Northland, RNZ New Zealand, NZ Herald and NZ Herald Northern Advocate RSS (headline and link only, as news.js).
 * Not used: NZTA (bot protection blocks automated reads), Northland Regional Council (its firewall blocks the relay),
 *   Scoop (licence needed for reuse).
 * Kept: development / planning / infrastructure stories that name a Northland place, or are about the Northland Corridor
 * (Warkworth–Te Hana, Te Hana–Port Marsden, Brynderwyn Hills, Port Marsden–Whangārei). Sport, court and crime are dropped.
 * Source headline, date, source name and link only. Nothing invented, no AI. Refreshed every 6 hours (cron or a request),
 * items build up in KV and drop off 30 days after they were published.
 */
import { decode, get } from './events.js';
import { isBlocked, SPORT_RE, sameStory, namesNorthland } from './news.js';

const KV_KEY = 'planning-v2';
export const PLN_TTL = 6 * 3600 * 1000;
const KEEP_MS = 30 * 864e5;
const MAX = 40;
const WDC = 'https://www.wdc.govt.nz';
const WDC_NEWS = WDC + '/Whats-new/News-and-notices';
const cat = c => WDC_NEWS + '?dlv_OC+CL+Public+News+Listing=' + encodeURIComponent('(dd_OC News Categories=' + c + ')').replace(/%20/g, '+');
export const WDC_LISTS = [
  { url: WDC_NEWS, all: true },
  { url: cat('Projects') }, { url: cat('Plans, strategies, bylaws and reports') }, { url: cat('Consultations and engagements') },
  { url: cat('Improvement works') }, { url: cat('Business and economy') }
];
const RSS = [
  { id: 'bh', name: 'NZ Government (Beehive)', url: 'https://www.beehive.govt.nz/rss.xml', host: 'www.beehive.govt.nz' },
  { id: 'rnzn', name: 'RNZ', url: 'https://www.rnz.co.nz/rss/regions_northland.xml', host: 'www.rnz.co.nz' },
  { id: 'rnz', name: 'RNZ', url: 'https://www.rnz.co.nz/rss/national.xml', host: 'www.rnz.co.nz' },
  { id: 'nzh', name: 'NZ Herald', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/?outputType=xml', host: 'www.nzherald.co.nz' },
  { id: 'na', name: 'Northern Advocate', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/news/?outputType=xml&_website=northern-advocate', host: 'www.nzherald.co.nz' }
];
// The new highways between Whangārei and Auckland: these count on their own (no Northland place name needed).
export const CORRIDOR = /\b(northland corridor|northland expressway|brynderwyns?|brynderwyn hills|te hana|warkworth to te hana|port marsden|ara t[uū]hono|p[uū]hoi to warkworth|dome valley|roads? of national significance|rons)\b/i;
export const WHG_PLACES = /\b(whang[aā]rei|onerahi|te\s+kamo|kamo|tikipunga|maunu|raumanga|otangarei|port\s+nikau|town\s+basin|okara|semenoff|morningside|woodhill|regent|kensington|mairtown|parahaki|riverside|h[aā]tea|pohe\s+island|te\s+matau|springs\s+flat|ruak[aā]k[aā]|marsden\s+point|one\s+tree\s+point|waip[uū]|bream\s+bay|hikurangi|ngunguru|tutukaka|matapouri|whananaki|pataua|p[aā]rua\s+bay|whang[aā]rei\s+heads|tamaterau|reotahi|[oō]akura|helena\s+bay|whangaruru|maungatapere|maungakaramea|glenbervie|whareora|horahora|kioreroa|northport|port\s+road|porowini|dave\s+culham)\b/i;
export const NON_WHG_PLACES = /\b(kerikeri|kaitaia|kaikohe|dargaville|hokianga|paihia|waitangi|[oō]m[aā]pere|kohukohu|rawene|opononi|kawakawa|moerewa|mangonui|taipa|ahipara|kaeo|bay\s+of\s+islands|far\s+north|kaipara|mangawhai|kaiwaka|maungaturoto|ruawai|te\s+kopuru|houhora|haruru|okaihau|russell)\b/i;
export const OUTAGE_ROAD = /\b(road\s*clos\w*|closed\s+road|bridge\s*clos\w*|detours?|traffic\s+management|power\s+(?:cut|cuts|outage|outages|off)|northpower|(?:internet|broadband|fibre|mobile|network|chorus|spark|one\s*nz|2degrees)\s+(?:outage|outages|down|fault|disrupt\w*))\b/i;
export function isWhangareiStory(title, desc = '') {
  const t = String(title || ''), d = String(desc || '');
  if (NON_WHG_PLACES.test(t) && !/\bwhang[aā]rei\b/i.test(t)) return false;
  if (WHG_PLACES.test(t)) return true;
  if (!NON_WHG_PLACES.test(t + ' ' + d) && WHG_PLACES.test(d)) return true;
  return false;
}
export const DEV = /\b(develop\w*|subdivision\w*|housing|new homes|homes? (built|planned)|apartments?|plan changes?|district plan|spatial plan|long[- ]term plan|annual plan|resource consents?|consents?|consented|fast[- ]track\w*|re-?zon\w*|zoning|designation|notice of requirement|infrastructure|expressway|motorway|highways?|sh1|sh15|state highway|four[- ]lan\w*|roundabout|interchange|bridges?|rail|railway|kiwirail|north auckland line|northport|marsden point|refinery|port|airport|hospital|civic cent(re|er)|te iwitahi|town basin|hihiaua|kea hub|knowledge,? education and arts|hub|construction|constructed|build\w*|upgrades?|upgrading|projects?|redevelop\w*|restoration of|wastewater|water treatment|reservoir|dam|cycleway|shared path|footpath|car ?park|business park|industrial|retail|supermarket|investment|funding|milestone|tender|contract awarded|sod[- ]turning|ground[- ]breaking|opens?|opened|reopen\w*|consultation|have (your|their) say|bylaws?|growth)\b/i;
const PLAN = /\b(plan changes?|district plan|spatial plan|long[- ]term plan|annual plan|resource consents?|consents?|consented|fast[- ]track\w*|re-?zon\w*|zoning|designation|notice of requirement|consultation|have (your|their) say|bylaws?|subdivision\w*)\b/i;
const OFF = /\b(alcohol|on licence|off licence|club licence|dog control|elections?|candidates?|obituar\w*|civic honours|jobs? (fair|vacanc\w*))\b/i;

const clean = s => decode(String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const field = (b, n) => { const m = new RegExp('<' + n + '\\b[^>]*>([\\s\\S]*?)<\\/' + n + '>', 'i').exec(b); return m ? m[1] : ''; };
const MONTHS = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
function nzDate(s) { const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(s || ''); if (!m || !(m[2].toLowerCase() in MONTHS)) return NaN; return Date.UTC(+m[3], MONTHS[m[2].toLowerCase()], +m[1], 0, 0) - 13 * 3600e3 + 12 * 3600e3; } // midday NZ-ish
function okUrl(u, host) { try { const x = new URL(clean(u)); return x.protocol === 'https:' && x.hostname === host ? x.toString() : ''; } catch (e) { return ''; } }
export function kindOf(t) { return CORRIDOR.test(t) ? 'road' : PLAN.test(t) ? 'plan' : 'dev'; }
const bad = t => isBlocked(t, '') || SPORT_RE.test(t) || OFF.test(t);

// One WDC news list page → items
export function parseWdcList(html, all = false) {
  const out = [];
  for (const m of String(html || '').matchAll(/<article>([\s\S]*?)<\/article>/gi)) {
    const b = m[1];
    const url = okUrl((/<a href="([^"]+)"/i.exec(b) || [])[1], 'www.wdc.govt.nz');
    const title = clean((/<h2 class="list-item-title">([\s\S]*?)<\/h2>/i.exec(b) || [])[1]);
    const ms = nzDate((/Published on ([^<]+)</i.exec(b) || [])[1]);
    const paras = [...b.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map(x => clean(x[1])).filter(Boolean);
    const cats = clean((/<span class="text">([\s\S]*?)<\/span><\/p>/i.exec(b) || [])[1]).replace(/^,\s*/, '');
    if (!url || !title || !Number.isFinite(ms) || !url.startsWith(WDC_NEWS + '/')) continue;
    if (/alcohol notice/i.test(cats) || bad(title)) continue;
    const desc = (paras[0] || '').slice(0, 220);
    if (all && !DEV.test(title + ' ' + desc) && !/Projects|Plans, strategies|Consultations|Improvement works/i.test(cats)) continue;
    if (isBlocked(title, desc)) continue;
    out.push({ title, url, published: new Date(ms).toISOString(), src: 'Whangārei District Council', desc, kind: kindOf(title + ' ' + desc + ' ' + cats) });
  }
  return out;
}
export function parsePlanRss(xml, feed) {
  const raw = String(xml || ''); if (!/<rss\b/i.test(raw)) throw new Error('rss_changed');
  const out = [];
  for (const m of raw.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const title = clean(field(m[1], 'title')), desc = clean(field(m[1], 'description')).slice(0, 400);
    const url = okUrl(field(m[1], 'link'), feed.host), ms = Date.parse(clean(field(m[1], 'pubDate')));
    if (!title || !url || !Number.isFinite(ms) || bad(title) || isBlocked(title, desc) || /\/sport\//.test(url) || /\bquiz\b/i.test(title)) continue;
    const corridor = CORRIDOR.test(title + ' ' + desc);
    const whg = isWhangareiStory(title, (feed.id === 'rnzn' || feed.id === 'na' || feed.id === 'bh') ? desc : '');
    if (!corridor && !(whg && (DEV.test(title) || OUTAGE_ROAD.test(title)))) continue;
    out.push({ title, url, published: new Date(ms).toISOString(), src: feed.name, kind: kindOf(title + (corridor ? ' ' + desc : '')) });
  }
  return out;
}
function robotsOk(txt) {
  const P = '/Whats-new/News-and-notices'; let on = false;
  for (const line of String(txt || '').split(/\r?\n/)) {
    const ua = /^\s*User-agent\s*:\s*(.+)/i.exec(line); if (ua) { on = ua[1].trim() === '*' || /duedates/i.test(ua[1]); continue; }
    const d = /^\s*Disallow\s*:\s*(\S+)/i.exec(line); if (!on || !d) continue;
    const lit = d[1].split('*')[0].replace(/\$$/, ''); if (lit && (P.toLowerCase().startsWith(lit.toLowerCase()) || lit === '/')) return false;
  }
  return true;
}
export function mergePlanning(prev, fresh, now = Date.now()) {
  const out = [], seenU = new Set();
  const all = fresh.concat(prev || []).filter(x => x && now - Date.parse(x.published) <= KEEP_MS && Date.parse(x.published) <= now + 864e5 && (x.src === 'Whangārei District Council' || CORRIDOR.test(x.title + ' ' + (x.desc || '')) || isWhangareiStory(x.title, x.desc || '')));
  all.sort((a, b) => (a.src === 'Whangārei District Council' ? 0 : a.src.startsWith('NZ Gov') ? 1 : 2) - (b.src === 'Whangārei District Council' ? 0 : b.src.startsWith('NZ Gov') ? 1 : 2));
  for (const x of all) {
    if (seenU.has(x.url) || out.some(y => sameStory(y.title, x.title))) continue;
    const p = (prev || []).find(y => y.url === x.url);
    seenU.add(x.url); out.push({ ...x, first: (p && p.first) || x.first || new Date(now).toISOString() });
  }
  return out.sort((a, b) => b.published.localeCompare(a.published)).slice(0, MAX);
}
let mem = null;
export async function refreshPlanning(env = {}, fetchImpl = fetch, now = Date.now(), force = false) {
  let st = mem;
  if (st && !force && now - st.at < PLN_TTL) return st; // 2.27.83: no KV read while this copy is fresh
  if (env.EVENTS_KV) { try { const c = await env.EVENTS_KV.get(KV_KEY, { type: 'json' }); if (c && (!st || c.at >= st.at)) st = c; } catch (e) { } }
  if (st && !force && now - st.at < PLN_TTL) { mem = st; return st; }
  st = st || { at: 0, items: [], robots: null };
  const fresh = [], ok = [];
  if (!st.robots || now - st.robots.at > 864e5) { try { st.robots = { at: now, ok: robotsOk(await get(WDC + '/robots.txt', fetchImpl)) }; } catch (e) { st.robots = st.robots || null; } }
  const jobs = [];
  if (st.robots && st.robots.ok) WDC_LISTS.forEach(l => jobs.push(get(l.url, fetchImpl).then(h => { fresh.push(...parseWdcList(h, l.all)); ok.push('wdc'); })));
  RSS.forEach(f => jobs.push(get(f.url, fetchImpl, { headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*;q=0.1' } }).then(x => { fresh.push(...parsePlanRss(x, f)); ok.push(f.id); })));
  await Promise.allSettled(jobs);
  if (!ok.length && st.at) { st.at = now - PLN_TTL + 3600e3; mem = st; return st; } // try again in an hour
  st = { at: now, robots: st.robots, items: mergePlanning(st.items, fresh, now), ok: [...new Set(ok)] };
  mem = st;
  if (env.EVENTS_KV) { try { await env.EVENTS_KV.put(KV_KEY, JSON.stringify(st)); } catch (e) { } }
  return st;
}
export async function getPlanning(env, fetchImpl = fetch, now = Date.now()) {
  const st = await refreshPlanning(env, fetchImpl, now);
  return { updated: new Date(st.at).toISOString(), days: 30, sources: ['Whangārei District Council', 'NZ Government (Beehive)', 'RNZ', 'NZ Herald', 'Northern Advocate'], items: (st.items || []).map(({ title, url, published, src, desc, kind, first }) => ({ title, url, published, src, desc, kind, first })) };
}
export function resetPlanning() { mem = null; }
