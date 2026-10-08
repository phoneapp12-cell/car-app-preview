/* GET /concerts: big Auckland shows, read from the venues' own public pages (fixed sources, no input).
   Eden Park lists a category, so only "Concerts" are kept. Auckland Stadiums (Go Media, North Harbour,
   Western Springs) has no category, so sport and markets are dropped by name. Spark Arena loads its dates
   in the browser, so only the act names and links are returned for it. Cached for 6 hours at the edge. */
const UA = { 'User-Agent': 'Mozilla/5.0 (DueDatesRelay)' };
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const SPORT = /\b(vs?\.?|fc|npc|a-league|season|supercross|night market|kiwipong|lions|all whites|black ferns|blues|warriors|breakers|silver ferns|constellation cup|origin|blackcaps|all blacks|car boot)\b/i;
const unesc = s => String(s || '').replace(/&#8217;|&rsquo;/g, '\u2019').replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
function iso(d, m, y) { const mm = MONTHS[String(m).toLowerCase()]; return mm ? `${y}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}` : ''; }
async function page(fetchImpl, url) {
  const r = await fetchImpl(url, { headers: UA, cf: { cacheTtl: 21600, cacheEverything: true } });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.text();
}
export function parseEden(html) {
  const txt = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n');
  const L = txt.split('\n').map(x => x.trim()).filter(Boolean), out = [];
  L.forEach((l, k) => {
    const m = l.match(/^(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day (\d{1,2}) (\w+) (20\d\d)$/);
    if (m && /^concerts?$/i.test(L[k + 1] || '')) out.push({ title: unesc(L[k - 1]), date: iso(m[1], m[2], m[3]), venue: 'Eden Park', url: 'https://www.edenpark.co.nz/events/' });
  });
  return out.filter(x => x.date && x.title);
}
export function parseStadiums(html) {
  const out = [], re = /<a class="new-tile-inner" href="(\/event\/[^"]+)">[\s\S]*?<p class="event-date">([^<]+)<\/p><h5>([^<]+)<\/h5>[\s\S]*?<\/svg>([^<]+)<\/p>/g;
  let m;
  while ((m = re.exec(html))) {
    const title = unesc(m[3]), when = unesc(m[2]);
    if (SPORT.test(title) || / - \d/.test(when)) continue;
    const d = when.match(/^(\d{1,2}) (\w+) (20\d\d)$/);
    if (!d) continue;
    out.push({ title, date: iso(d[1], d[2], d[3]), venue: unesc(m[4]), url: 'https://www.aucklandstadiums.co.nz' + m[1] });
  }
  return out.filter(x => x.date);
}
export function parseSpark(html) {
  const seen = new Set(), out = [], re = /href="(?:https:\/\/www\.sparkarena\.co\.nz)?(\/all-events\/[a-z0-9-]+-tickets-ae\d+)">(?:<[^>]*>)*\s*([^<]{2,80})</g;
  let m;
  while ((m = re.exec(html))) {
    const title = unesc(m[2]);
    if (!title || /^(get|buy) tickets|more info/i.test(title) || seen.has(m[1]) || SPORT.test(title) || /wiggles/i.test(title)) continue;
    seen.add(m[1]); out.push({ title, venue: 'Spark Arena', url: 'https://www.sparkarena.co.nz' + m[1] });
  }
  return out.slice(0, 30);
}
export async function getConcerts(env, fetchImpl = fetch) {
  const [e, a, s] = await Promise.allSettled([
    page(fetchImpl, 'https://www.edenpark.co.nz/events/').then(parseEden),
    page(fetchImpl, 'https://www.aucklandstadiums.co.nz/whats-on').then(parseStadiums),
    page(fetchImpl, 'https://www.sparkarena.co.nz/').then(parseSpark)
  ]);
  const dated = [...(e.value || []), ...(a.value || [])].sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
  const spark = s.value || [];
  if (!dated.length && !spark.length) throw new Error('no_concerts');
  return { updated: new Date().toISOString(), dated, spark };
}
