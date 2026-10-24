/* 2.27.67: crashes and road incidents in and around Whangārei, from NZTA Waka Kotahi's public TREIS highway information
 * (the same feed as /traffic; state highways only). Read about every 20 minutes on the minute cron, kept in KV with ones
 * NZTA has since removed shown as cleared for 3 hours. Only what NZTA publishes: road, place, what's affected, times.
 * No injury details (NZTA doesn't publish them). Pushes: one per new incident (id 'acc-...'), never for updates or clearing. */
import { getTraffic } from './traffic.js';
import { cacheGet, cachePut } from './kvguard.js';
export const ACC_KEY = 'crashes-v1';
/* NZ Police Northland district news (RSS /rss/district-news/northland). Police terms allow saving and reprinting for
 * non-commercial private purposes, unaltered, so only the release's own title and link are shown, credited to NZ Police.
 * Strict filter: only crashes and road closures, scam/fraud, missing people, public safety, weather and emergency advice.
 * Anything about courts, arrests, charges, violence, homicide, deaths, injuries, sexual offending, drugs or crime is skipped,
 * and so is any title that names a death or injury, so card text never carries those details. */
const POL_RSS = 'https://www.police.govt.nz/rss/district-news/northland';
const POL_DENY = /\b(court|sentenc\w*|homicide|murder\w*|manslaughter|sexual|rape|indecent|name release|unexplained death|sudden death)\b/i;
const POL_CRASH = /\b(crash\w*|collision|road (?:is )?closed|road closure|closes? (?:the )?(?:road|state highway|sh ?\d+)|diversion\w*|detour\w*|traffic (?:delays?|management)|state highway|sh ?\d+ (?:closed|blocked))\b/i;
const POL_EMG = /\b(police|ambulance|st\s+john|hato\s+hone|paramedic\w*|fire\s+and\s+emergency|fenz|firefighters?|fire\s+crews?|house\s+fire|scrub\s+fire|vegetation\s+fire|building\s+fire|industrial\s+fire|blaze|rescue\s+helicopter|air\s+ambulance|coastguard|search\s+and\s+rescue|landsar|civil\s+defence|cordon\w*|evacuat\w*|emergency\s+services?|incident|operation)\b/i;
const POL_KEEP = /\b(scam\w*|fraud\w*|missing|safety|warning|weather|flood\w*|storm|emergency|evacuat\w*|cyclone|tsunami|earthquake|road closed|road closure|diversion|holiday|drive safely|water safety|cordon\w*|police|ambulance|st\s+john|fire|fenz|rescue|coastguard|incident|operation)\b/i;
const POL_NEAR = /\b(whang[aā]rei|onerahi|kamo|tikipunga|maunu|kensington|raumanga|morningside|otangarei|maungatapere|maungakaramea|hikurangi|ruakaka|waipu|one tree point|marsden|parua bay|tamaterau|ngunguru|tutukaka|matapouri|portland|titoki|poroti|kaiwaka|mangawhai|whakapara|kauri|springs flat|glenbervie|sh ?1\b|state highway 1\b|sh ?14|state highway 14|sh ?15|state highway 15)/i;
const ent = s => String(s || '').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&#8217;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
export function parsePolice(xml, now = Date.now()) {
  const out = [];
  for (const it of String(xml || '').split('<item>').slice(1)) {
    const g = re => ((it.match(re) || [])[1] || '').trim();
    const title = ent(g(/<title>([\s\S]*?)<\/title>/)).replace(/\s+/g, ' ').trim(), url = g(/<link>([\s\S]*?)<\/link>/), gid = g(/<guid[^>]*>(\d+)/), at = Date.parse(g(/<pubDate>([\s\S]*?)<\/pubDate>/)) || 0;
    if (!title || !/^https:\/\/www\.police\.govt\.nz\/news\/release\//.test(url) || !gid || !at || now - at > 7 * 864e5) continue;
    const body = ent(ent(g(/<description>([\s\S]*?)<\/description>/))).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const rd = polRoad(title, body); if (rd) { out.push({ id: 'pol-' + gid, url, at: new Date(at).toISOString(), ...rd }); continue; }
    if (POL_DENY.test(title) || POL_DENY.test(body.slice(0, 400))) continue;
    const crash = POL_CRASH.test(title + ' ' + body.slice(0, 400));
    const emg = POL_EMG.test(title + ' ' + body.slice(0, 400));
    const near = POL_NEAR.test(title + ' ' + body.slice(0, 600));
    if (!crash && !emg && !POL_KEEP.test(title + ' ' + body.slice(0, 300))) continue;
    out.push({ id: 'pol-' + gid, title: title.slice(0, 140), url, at: new Date(at).toISOString(), kind: crash ? 'crash' : emg ? 'emergency' : 'update', near });
  }
  // A later "reopened" release clears the earlier closure card for the same road/place
  out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const res = [];
  for (const x of out) {
    if (x.kind === 'road' && x.reopen) { const m = res.filter(y => y.kind === 'road' && !y.cleared && Date.parse(y.at) <= Date.parse(x.at) && (x.sh ? y.sh === x.sh : y.where === x.where));
      if (m.length) { m.forEach(y => { y.cleared = true; y.clearedAt = x.at; y.clearUrl = x.url; }); continue; }
      res.push({ ...x, cleared: true, clearedAt: x.at }); continue; }
    res.push(x);
  }
  return res.reverse();
}
// 2.27.68: crash releases that close, block, divert or delay a road near Whangārei. Never their title: our own neutral label,
// road/place pulled only from the release text, no death/injury/condition wording or names.
const POL_CRIME = /\b(court|arrest\w*|charg\w*|sentenc\w*|homicide|murder\w*|manslaughter|assault\w*|violen\w*|stab\w*|shoot\w*|firearm\w*|gun\w*|weapon\w*|sexual|rape|indecent|drug\w*|meth\w*|cannabis|burglar\w*|robber\w*|theft|stolen|ram[- ]raid\w*|fled|fleeing|pursuit|gang\w*|kidnap\w*|abduct\w*|warrant|name release|named)\b/i;
const POL_RCRASH = /\b(crash\w*|collision|vehicle (?:incident|accident)|rolled|rollover|crash scene)\b/i;
const POL_SHUT = /\b(road (?:is |has been |remains )?(?:closed|blocked)|roads? closures?|closed (?:the|a|both)|(?:is|are|remains?|been) closed|closes?|blocked|blocking|cordon\w*)\b/i;
const POL_DIV = /\b(diversions?|detours?|diverted)\b/i, POL_DLY = /\b(delays?|delayed|traffic management|single lane|stop\/go|lane closures?)\b/i;
const POL_OPEN = /\b(re-?opened|now (?:re)?open|has (?:now )?reopened|open again|cleared|lanes? (?:are |have )?(?:open|reopened))\b/i;
const PLACES = ['Whangārei', 'Onerahi', 'Kamo', 'Tikipunga', 'Maunu', 'Kensington', 'Raumanga', 'Morningside', 'Otangarei', 'Maungatapere', 'Maungakaramea', 'Hikurangi', 'Ruakaka', 'Waipu', 'One Tree Point', 'Marsden Point', 'Parua Bay', 'Tamaterau', 'Ngunguru', 'Tutukaka', 'Matapouri', 'Portland', 'Titoki', 'Poroti', 'Kaiwaka', 'Mangawhai', 'Whakapara', 'Kauri', 'Springs Flat', 'Glenbervie', 'Brynderwyn', 'Oakleigh', 'Otaika', 'Kioreroa', 'Port Whangārei', 'Pataua', 'Whareora', 'Kara', 'Ōakura', 'Helena Bay', 'Ruatangata', 'Kokopu', 'Purua', 'Towai', 'Langs Beach', 'Uretiti'];
const plRe = n => new RegExp('\\b' + n.replace(/ā/g, '[aā]').replace(/Ō/g, '[OŌ]') + '\\b', 'i');
function polRoad(title, body) {
  const t = title + ' . ' + body.slice(0, 1500);
  if (!POL_RCRASH.test(t) || POL_CRIME.test(title) || POL_CRIME.test(body.slice(0, 400))) return null;
  const reopen = POL_OPEN.test(t), shut = POL_SHUT.test(t), div = POL_DIV.test(t), dly = POL_DLY.test(t);
  if (!shut && !div && !dly && !reopen) return null;
  const sm = t.match(/\b(?:State Highway|SH) ?(\d{1,2})\b/i), sh = sm ? 'SH' + sm[1] : '';
  const rm = t.match(/\b((?:[A-Z][a-zāēīōū]+ ){1,2}(?:Road|Rd|Street|St|Drive|Avenue|Ave|Highway|Hill|Bay Road))\b/);
  const road = sh || (rm && !/State Highway/.test(rm[1]) ? rm[1].replace(/\bRd$/, 'Road') : '');
  const place = (PLACES.find(n => n !== 'Whangārei' && plRe(n).test(t)) || (plRe('Whangārei').test(t) ? 'Whangārei' : ''));
  if (!place && !POL_NEAR.test(t)) return null; // only near Whangārei
  const where = [road, place].filter(Boolean).join(', ') || 'near Whangārei';
  const aff = shut ? 'road closed' : div ? 'diversion in place' : dly ? 'delays' : 'road reopened';
  return { kind: 'road', sh, where, reopen: reopen && !/\b(remains? closed|still closed|expected to (?:remain|be) closed)\b/i.test(t), near: true,
    label: 'Crash – ' + aff + ': ' + where, title: 'Crash – ' + aff + ': ' + where };
}
async function getPolice(fetchImpl) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 15000);
  try { const r = await fetchImpl(POL_RSS, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DueDatesRelay/1.0; personal family app)', Accept: 'application/rss+xml, application/xml' }, signal: c.signal }); if (!r.ok) throw new Error('http ' + r.status); return parsePolice(await r.text()); } finally { clearTimeout(t); }
}
const GAP = 19 * 60, KEEP = 3 * 3600e3;
export const isCrash = x => !!x && /\b(crash|accident|collision|incident|vehicle|truck|rollover|crash scene)\b/i.test([x.type, x.desc].join(' ')) && !/\broad ?works?\b/i.test(x.type || '');
const slim = x => ({ id: x.id, type: x.type, desc: x.desc, where: x.where, comments: x.comments, impact: x.impact, start: x.start, until: x.until, closed: !!x.closed, commute: !!x.commute, km: x.km, lat: x.lat, lon: x.lon });
export async function runCrashes(env, fetchImpl = fetch, now = Date.now(), force = false) {
  const kv = env && env.EVENTS_KV; if (!kv) return null;
  if (!force && await cacheGet('crashes-at')) return null; await cachePut('crashes-at', { at: now }, GAP);
  let prev = null; try { prev = JSON.parse(await kv.get(ACC_KEY) || 'null'); } catch (e) { }
  let t = null; try { t = await getTraffic(fetchImpl); } catch (e) { t = null; }
  const act = t ? (t.items || []).filter(isCrash).map(slim) : ((prev && prev.active) || []);
  let police = (prev && prev.police) || []; try { police = await getPolice(fetchImpl); } catch (e) { }
  let quakes = (prev && prev.quakes) || []; try { quakes = await getQuakes(fetchImpl, now); } catch (e) { }
  const gone = ((prev && prev.active) || []).filter(o => !act.some(a => a.id === o.id)).map(o => ({ ...o, clearedAt: new Date(now).toISOString() }));
  const cleared = ((prev && prev.cleared) || []).concat(gone).filter(o => !act.some(a => a.id === o.id) && now - Date.parse(o.clearedAt || 0) < KEEP).slice(-20);
  const rec = { at: new Date(now).toISOString(), active: act, cleared, police, quakes, policeSource: 'NZ Police (Northland district news)', quakeSource: 'GeoNet & USGS', source: 'NZ Transport Agency Waka Kotahi (TREIS highway information)' };
  await kv.put(ACC_KEY, JSON.stringify(rec));
  return rec;
}
export async function getCrashes(env) { try { return JSON.parse(await env.EVENTS_KV.get(ACC_KEY) || 'null'); } catch (e) { return null; } }
const nzParts = ms => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
// Pure: crash record + phone's choice ('all' | 'route' | 'off') in, one push per active incident out.
export function crashReminders(rec, pref, now, polOn = true) {
  if (!rec || !pref || pref === 'off') return [];
  // Police crash / road closure releases near Whangārei, last 6 hours, unless NZTA already has that road
  const roads = (rec.active || []).map(x => String(x.where || '').toLowerCase().replace(/state highway /g, 'sh ').replace(/\s+/g, '')).join('|');
  const pol = !polOn ? [] : (rec.police || []).filter(x => (x.kind === 'crash' || x.kind === 'emergency' || (x.kind === 'road' && !x.cleared)) && x.near && now - Date.parse(x.at) < 6 * 3600e3 && (pref === 'all' || /onerahi/i.test(x.title)))
    .filter(x => { const m = String(x.sh || x.title).toLowerCase().match(/(?:sh|state highway) ?(\d+)/); return !(m && roads.includes('sh' + m[1])); })
    .map(x => { const q = nzParts(Date.parse(x.at) > now - 600e3 ? Date.parse(x.at) : now); return { id: x.id, title: ('🚓 ' + x.title).slice(0, 80), date: `${q.year}-${q.month}-${q.day}`, time: `${q.hour}:${q.minute}`, repeat: 'none' }; });
  const p = nzParts(now), cid = s => String(s).replace(/[^a-z0-9]/gi, '').slice(0, 30);
  const qk = (rec.quakes || []).filter(q => (q.mag >= 4.8 || q.major) && now - Date.parse(q.at) < 6 * 3600e3).slice(0, 2).map(q => ({
    id: 'acc-' + cid(q.id),
    title: (`🌍 M${q.mag.toFixed(1)} earthquake: ${q.where}`).slice(0, 80),
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    repeat: 'none'
  }));
  return (rec.active || []).filter(x => pref === 'all' || x.commute || /onerahi/i.test(x.where + ' ' + x.desc)).slice(0, 6).map(x => {
    const road = String(x.where || '').split(/[,;]/)[0].trim() || 'a highway near Whangārei', aff = x.closed ? 'road closed' : /delay|lane|detour|single|stop\/go/i.test(x.desc + ' ' + x.impact + ' ' + x.comments) ? 'delays' : '';
    return { id: 'acc-' + cid(x.id), title: ('🚗 Crash: ' + road + (aff ? ' – ' + aff : '')).slice(0, 80), date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, repeat: 'none' };
  }).concat(pol.slice(0, 3), qk);
}


// ---- 2.28.18: Large earthquakes in New Zealand (GeoNet) and near New Zealand / Kermadecs / SW Pacific (USGS) ----
const GEONET_URL = 'https://api.geonet.org.nz/quake?MMI=3';
const WHG_LAT = -35.7251, WHG_LON = 174.3237;
const kmDist = (la1, lo1, la2, lo2) => {
  const R = 6371, r = Math.PI / 180, dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};
const mmiWord = m => m >= 7 ? 'Severe' : m >= 6 ? 'Strong' : m >= 5 ? 'Moderate' : m >= 4 ? 'Light' : 'Weak';
export async function getQuakes(fetchImpl = fetch, now = Date.now()) {
  const sinceMs = now - 72 * 3600e3, sinceUsgsMs = now - 5 * 86400e3, sinceIso = new Date(sinceUsgsMs).toISOString();
  const u1 = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${sinceIso}&minmagnitude=4.8&minlatitude=-52&maxlatitude=-22&minlongitude=160&maxlongitude=180`;
  const u2 = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${sinceIso}&minmagnitude=5.0&minlatitude=-38&maxlatitude=-22&minlongitude=-180&maxlongitude=-172`;
  const [gnRes, us1Res, us2Res] = await Promise.allSettled([
    fetchImpl(GEONET_URL, { headers: { Accept: 'application/vnd.geo+json;version=2', 'User-Agent': 'Mozilla/5.0 (compatible; DueDatesRelay/1.0)' }, signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() : null),
    fetchImpl(u1, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; DueDatesRelay/1.0)' }, signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() : null),
    fetchImpl(u2, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; DueDatesRelay/1.0)' }, signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() : null)
  ]);
  const out = [];
  const gnFeatures = (gnRes.status === 'fulfilled' && gnRes.value && Array.isArray(gnRes.value.features)) ? gnRes.value.features : [];
  for (const f of gnFeatures) {
    const p = (f && f.properties) || {}, g = (f && f.geometry && Array.isArray(f.geometry.coordinates)) ? f.geometry.coordinates : [];
    const atMs = Date.parse(p.time || '') || 0;
    if (!p.publicID || !atMs || atMs < sinceMs) continue;
    const mag = Math.round((+p.magnitude || 0) * 10) / 10, mmi = +p.mmi || 0, depth = Math.round(+p.depth || 0);
    const lon = +g[0], lat = +g[1];
    const distWhg = (Number.isFinite(lat) && Number.isFinite(lon)) ? Math.round(kmDist(WHG_LAT, WHG_LON, lat, lon)) : 9999;
    const nearNorth = distWhg <= 260 || /whang[aā]rei|northland|kaipara|bay of islands|auckland|hauraki/i.test(p.locality || '');
    // Keep: M4.2+ anywhere in NZ, or MMI >= 5, or M3.5+ / MMI >= 4 near Whangārei/Northland/Auckland
    if (!(mag >= 4.2 || mmi >= 5 || (nearNorth && (mag >= 3.5 || mmi >= 4)))) continue;
    out.push({
      id: 'gn-' + p.publicID,
      src: 'GeoNet',
      mag,
      mmi,
      shaking: mmiWord(mmi),
      depth,
      where: String(p.locality || 'New Zealand').slice(0, 120),
      at: new Date(atMs).toISOString(),
      lat: Number.isFinite(lat) ? Math.round(lat * 1000) / 1000 : null,
      lon: Number.isFinite(lon) ? Math.round(lon * 1000) / 1000 : null,
      distWhg,
      nearNorth,
      major: mag >= 5.0 || mmi >= 6 || (nearNorth && mag >= 4.0),
      url: 'https://www.geonet.org.nz/earthquake/' + encodeURIComponent(p.publicID)
    });
  }
  const usFeatures = [
    ...((us1Res.status === 'fulfilled' && us1Res.value && Array.isArray(us1Res.value.features)) ? us1Res.value.features : []),
    ...((us2Res.status === 'fulfilled' && us2Res.value && Array.isArray(us2Res.value.features)) ? us2Res.value.features : [])
  ];
  for (const f of usFeatures) {
    const p = (f && f.properties) || {}, g = (f && f.geometry && Array.isArray(f.geometry.coordinates)) ? f.geometry.coordinates : [];
    const atMs = +p.time || 0;
    if (!f.id || !atMs || atMs < sinceUsgsMs) continue;
    const mag = Math.round((+p.mag || 0) * 10) / 10, depth = Math.round(+g[2] || 0);
    const lon = +g[0], lat = +g[1];
    if (mag < 4.8) continue;
    // Deduplicate if GeoNet already reported an earthquake within 120s and ~180km
    const dup = out.some(q => Math.abs(Date.parse(q.at) - atMs) < 120e3 && (q.lat == null || !Number.isFinite(lat) || kmDist(q.lat, q.lon, lat, lon) < 180));
    if (dup) continue;
    const distWhg = (Number.isFinite(lat) && Number.isFinite(lon)) ? Math.round(kmDist(WHG_LAT, WHG_LON, lat, lon)) : 9999;
    out.push({
      id: 'us-' + f.id,
      src: 'USGS',
      mag,
      mmi: 0,
      shaking: mag >= 6.0 ? 'Strong offshore' : 'Offshore / Near NZ',
      depth,
      where: String(p.place || 'Near New Zealand').slice(0, 120),
      at: new Date(atMs).toISOString(),
      lat: Number.isFinite(lat) ? Math.round(lat * 1000) / 1000 : null,
      lon: Number.isFinite(lon) ? Math.round(lon * 1000) / 1000 : null,
      distWhg,
      nearNorth: distWhg <= 350,
      major: mag >= 5.5 || distWhg <= 350,
      url: /^https:\/\/earthquake\.usgs\.gov\//.test(p.url || '') ? p.url : 'https://earthquake.usgs.gov/earthquakes/map/'
    });
  }
  out.sort((a, b) => (b.major - a.major) || b.mag - a.mag || Date.parse(b.at) - Date.parse(a.at));
  return out.slice(0, 15);
}
