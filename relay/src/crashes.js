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
const POL_DENY = /\b(court|arrest\w*|charg\w*|sentenc\w*|homicide|murder\w*|manslaughter|death|deaths|died|dies|dead|fatal\w*|assault\w*|violen\w*|stab\w*|shoot\w*|shot|firearm\w*|gun\w*|weapon\w*|sexual|rape|indecent|drug\w*|meth\w*|cannabis|burglar\w*|robber\w*|theft|thief|stolen|steal\w*|aggravated|name release|body|bodies|unexplained|injur\w*|serious\w*|critical\w*|victim\w*|offend\w*|warrant|prison|bail|kidnap\w*|abduct\w*|ram[- ]raid\w*|fled|fleeing|pursuit|disorder|gang\w*|search warrant|investigation|appeal for information|sudden)\b/i;
const POL_CRASH = /\b(crash\w*|collision|road (?:is )?closed|road closure|closes? (?:the )?(?:road|state highway|sh ?\d+)|diversion\w*|detour\w*|traffic (?:delays?|management)|state highway|sh ?\d+ (?:closed|blocked))\b/i;
const POL_KEEP = /\b(scam\w*|fraud\w*|missing|safety|warning|weather|flood\w*|storm|emergency|evacuat\w*|cyclone|tsunami|road closed|road closure|diversion|holiday|drive safely|water safety)\b/i;
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
    if (!crash && !POL_KEEP.test(title + ' ' + body.slice(0, 300))) continue;
    out.push({ id: 'pol-' + gid, title: title.slice(0, 140), url, at: new Date(at).toISOString(), kind: crash ? 'crash' : 'update', near: POL_NEAR.test(title + ' ' + body.slice(0, 600)) });
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
  const gone = ((prev && prev.active) || []).filter(o => !act.some(a => a.id === o.id)).map(o => ({ ...o, clearedAt: new Date(now).toISOString() }));
  const cleared = ((prev && prev.cleared) || []).concat(gone).filter(o => !act.some(a => a.id === o.id) && now - Date.parse(o.clearedAt || 0) < KEEP).slice(-20);
  const rec = { at: new Date(now).toISOString(), active: act, cleared, police, policeSource: 'NZ Police (Northland district news)', source: 'NZ Transport Agency Waka Kotahi (TREIS highway information)' };
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
  const pol = !polOn ? [] : (rec.police || []).filter(x => (x.kind === 'crash' || (x.kind === 'road' && !x.cleared)) && x.near && now - Date.parse(x.at) < 6 * 3600e3 && (pref === 'all' || /onerahi/i.test(x.title)))
    .filter(x => { const m = String(x.sh || x.title).toLowerCase().match(/(?:sh|state highway) ?(\d+)/); return !(m && roads.includes('sh' + m[1])); })
    .map(x => { const q = nzParts(Date.parse(x.at) > now - 600e3 ? Date.parse(x.at) : now); return { id: x.id, title: ('🚓 ' + x.title).slice(0, 80), date: `${q.year}-${q.month}-${q.day}`, time: `${q.hour}:${q.minute}`, repeat: 'none' }; });
  const p = nzParts(now), cid = s => String(s).replace(/[^a-z0-9]/gi, '').slice(0, 30);
  return (rec.active || []).filter(x => pref === 'all' || x.commute || /onerahi/i.test(x.where + ' ' + x.desc)).slice(0, 6).map(x => {
    const road = String(x.where || '').split(/[,;]/)[0].trim() || 'a highway near Whangārei', aff = x.closed ? 'road closed' : /delay|lane|detour|single|stop\/go/i.test(x.desc + ' ' + x.impact + ' ' + x.comments) ? 'delays' : '';
    return { id: 'acc-' + cid(x.id), title: ('🚗 Crash: ' + road + (aff ? ' – ' + aff : '')).slice(0, 80), date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, repeat: 'none' };
  }).concat(pol.slice(0, 3));
}
