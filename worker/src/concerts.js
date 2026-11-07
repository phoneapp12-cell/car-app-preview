/* 1.9.31 🎤 Big Auckland concerts in the next month: read on the Cloudflare cron (every 6 hours, no Grok Bot usage) from the
   big venues' own public pages: Spark Arena (Live Nation's list, dates from each event page when the list leaves them out),
   Eden Park (its "Concerts" category) and Auckland Stadiums (Go Media Mt Smart, North Harbour, Western Springs; sport dropped by name).
   Same approach as My App's /concerts. Every concert gets a picture (the venue's own tile or the event page's og:image). */
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'Accept-Language': 'en-NZ,en;q=0.9' };
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const SPORT = /\b(vs?\.?|fc|npc|a-league|season|supercross|speedway|night market|kiwipong|lions|all whites|black ferns|blues|warriors|breakers|silver ferns|constellation cup|origin|blackcaps|all blacks|car boot|wwe|ufc|boxing|wrestling|rugby|league|cricket|football|netball|basketball|marathon|tennis|nrl|super rugby|grand prix|darts|fight night)\b/i;
const NOT_CONCERT = /\b(wiggles|bluey|graduation|expo|conference|market|car show|monster trucks|disney on ice|circus|podcast|trade show|careers?)\b/i;
const unesc = s => String(s || '').replace(/&#8217;|&rsquo;|&#x27;|&#039;|&#39;/g, '\u2019').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#8211;|&ndash;/g, '–').replace(/&#x2F;/g, '/').replace(/\s+/g, ' ').trim();
const pad = n => String(n).padStart(2, '0');
const isoD = (d, m, y) => { const mm = MON[String(m).slice(0, 3).toLowerCase()]; return mm ? `${y}-${pad(mm)}-${pad(d)}` : ''; };
async function page(url, ms = 12000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { headers: UA, signal: c.signal, cf: { cacheTtl: 3 * 3600, cacheEverything: true } }); if (!r.ok) throw new Error('http ' + r.status); return await r.text(); } finally { clearTimeout(t); }
}
export function parseSpark(html) {
  const out = [], seen = new Set(), re = /href="(?:https:\/\/www\.sparkarena\.co\.nz)?(\/all-events\/[a-z0-9-]+-tickets-ae\d+)"[^>]*>([\s\S]*?)<\/a>/gi; let m;
  while ((m = re.exec(html))) {
    const b = m[2], url = 'https://www.sparkarena.co.nz' + m[1];
    const texts = [...b.matchAll(/<p[^>]*>([^<]{2,120})<\/p>/g)].map(x => unesc(x[1])).filter(t => !/^(new|presale|on sale( now)?|sold out|just announced|more info|find out more|(get|buy) tickets|selling fast|final tickets|limited tickets|added show|new show)$/i.test(t));
    const title = texts[0]; if (!title) continue;
    const dm = (b.match(/<small[^>]*>([^<]+)<\/small>/) || [])[1] || '';
    const d = unesc(dm).match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(20\d\d)/);
    const img = ((b.match(/src="(https:\/\/dynamicmedia\.livenationinternational\.com\/[^"?]+)/) || [])[1] || '');
    const key = url + (d ? d[0] : '');
    if (seen.has(key)) continue; seen.add(key);
    out.push({ title, date: d ? isoD(d[1], d[2], d[3]) : '', venue: 'Spark Arena', url, img: img ? img + '?format=jpg&width=1080&quality=75' : '' });
  }
  return out;
}
export function sparkDates(html) { // the event page carries each show's local date as eventDate
  return [...new Set([...html.matchAll(/\\?"eventDate\\?"\s*:\s*\\?"(20\d\d-\d\d-\d\d)T/g)].map(x => x[1]))].sort();
}
export function parseEden(html) {
  const links = {}; for (const m of html.matchAll(/href="(https:\/\/(?:www\.)?edenpark\.co\.nz\/events\/([a-z0-9-]+)\/)"/g)) links[m[2]] = m[1];
  const txt = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n');
  const L = txt.split('\n').map(x => x.trim()).filter(Boolean), out = [];
  L.forEach((l, k) => {
    const m = l.match(/^(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day (\d{1,2}) (\w+) (20\d\d)$/);
    if (!m || !/^concerts?$/i.test(L[k + 1] || '')) return;
    const title = unesc(L[k - 1]), date = isoD(m[1], m[2], m[3]); if (!title || !date) return;
    const slug = title.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const hit = Object.keys(links).find(s => s.startsWith(slug) && s.includes(m[1] + '-' + m[2].toLowerCase())) || Object.keys(links).find(s => s.startsWith(slug));
    out.push({ title, date, venue: 'Eden Park', url: hit ? links[hit] : 'https://www.edenpark.co.nz/events/' });
  });
  return out;
}
export function parseStadiums(html) {
  const out = [], re = /<a class="new-tile-inner" href="(\/event\/[^"]+)">([\s\S]*?)<\/a>/g; let m;
  while ((m = re.exec(html))) {
    const b = m[2], title = unesc((b.match(/<h5>([^<]+)<\/h5>/) || [])[1]), when = unesc((b.match(/class="event-date">([^<]+)</) || [])[1]);
    const venue = unesc((b.match(/<\/svg>([^<]+)<\/p>/) || [])[1]) || 'Auckland Stadiums', img = (b.match(/background-image:url\(([^)]+)\)/) || [])[1] || '';
    if (!title || SPORT.test(title) || / - \d/.test(when)) continue;
    const d = when.match(/^(\d{1,2}) (\w+) (20\d\d)$/); if (!d) continue;
    out.push({ title, date: isoD(d[1], d[2], d[3]), venue, url: 'https://www.aucklandstadiums.co.nz' + m[1], img: img.replace(/['"]/g, '') });
  }
  return out;
}
async function ogImg(url) { try { const h = (await page(url, 8000)).slice(0, 250000); return unesc((h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || h.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) || [])[1] || ''); } catch (e) { return ''; } }
const h32 = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const nzEvening = day => { // 7:30 pm New Zealand time that day, as epoch ms (NZDT/NZST worked out by Intl)
  const guess = Date.parse(day + 'T07:30:00Z'), f = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hourCycle: 'h23' });
  const off = (Number(f.format(new Date(guess))) - 7 + 24) % 24; return Date.parse(day + 'T19:30:00Z') - off * 36e5;
};
/* prev: the last result ({ dates: {url: [days]}, imgs: {key: url} }) so later runs only read new event pages */
export async function fetchConcerts(now, prev = {}, isUnsafe = () => false) {
  const [sp, ed, au] = await Promise.allSettled([page('https://www.sparkarena.co.nz/').then(parseSpark), page('https://www.edenpark.co.nz/events/').then(parseEden), page('https://www.aucklandstadiums.co.nz/whats-on').then(parseStadiums)]);
  const ok = { spark: sp.status === 'fulfilled', eden: ed.status === 'fulfilled', stadiums: au.status === 'fulfilled' };
  if (!ok.spark && !ok.eden && !ok.stadiums) throw new Error('no concert pages: ' + [sp, ed, au].map(x => x.reason && x.reason.message).join('; '));
  const dates = { ...(prev.dates || {}) }, imgs = { ...(prev.imgs || {}) };
  let budget = 14, ib = 8; // event pages read per run for dates / pictures (Workers free plan: 50 fetches per run)
  const spark = sp.value || [], undated = [...new Set(spark.filter(x => !x.date && !SPORT.test(x.title) && !NOT_CONCERT.test(x.title)).map(x => x.url))];
  for (const u of undated) { if (dates[u] && now - (dates[u].at || 0) < 3 * 864e5) continue; if (budget-- <= 0) break; try { dates[u] = { d: sparkDates(await page(u, 8000)), at: now }; } catch (e) { } }
  const rows = [];
  for (const x of spark) { if (x.date) rows.push(x); else for (const d of ((dates[x.url] || {}).d || [])) rows.push({ ...x, date: d }); }
  rows.push(...(ed.value || []), ...(au.value || []));
  const lo = new Date(now + 13 * 36e5 - 864e5).toISOString().slice(0, 10), hi = new Date(now + 13 * 36e5 + 31 * 864e5).toISOString().slice(0, 10); // NZ today-1 .. +31 days
  const pick = rows.filter(x => x.date && x.date >= lo && x.date <= hi && !SPORT.test(x.title) && !NOT_CONCERT.test(x.title));
  for (const x of pick) { const k = x.title + '|' + x.venue; if (!x.img && imgs[k]) x.img = imgs[k]; if (!x.img && x.url && !/\/events\/$/.test(x.url) && ib-- > 0) { x.img = await ogImg(x.url); } if (x.img) imgs[k] = x.img; }
  const byShow = new Map(); // one card a show: several nights at the same venue are listed together
  for (const x of pick.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) { const k = x.title.toLowerCase() + '|' + x.venue; const o = byShow.get(k); if (o) { if (!o.days.includes(x.date)) o.days.push(x.date); } else byShow.set(k, { ...x, days: [x.date] }); }
  const items = [...byShow.values()].filter(x => x.img).map(x => ({ id: 'cn' + h32(x.title.toLowerCase() + '|' + x.venue + '|' + x.days[0]), t: x.title, venue: x.venue, days: x.days, day: x.days[0], ev: nzEvening(x.days[0]), url: x.url, img: x.img, kind: 'concert', topic: 'events', s: '' }))
    .filter(i => !isUnsafe(i));
  const keepImgs = {}; for (const x of pick) { const k = x.title + '|' + x.venue; if (imgs[k]) keepImgs[k] = imgs[k]; }
  for (const u of Object.keys(dates)) if (!undated.includes(u)) delete dates[u];
  return { items, ok, dates, imgs: keepImgs, found: rows.length };
}
