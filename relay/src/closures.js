/* Planned closures near the lifting bridge (Te Matau ā Pohe, Dave Culham Drive) for the Due Dates app.
 *
 * Source: Whangārei District Council "Roadworks and closures"
 * https://www.wdc.govt.nz/Services/Roads-and-Transportation/Roads/Roadworks-and-closures
 * Council terms allow reproducing the content for personal, informational and non-commercial use.
 * robots.txt is read (about once a day) and any page it disallows is skipped.
 *
 * Only notices that mention Te Matau ā Pohe or Dave Culham Drive (or are mapped within 400 m of the
 * bridge) are kept, with their dates/times, and each links back to the council's notice.
 * A cron trigger does a small step at a time (the list every 3 hours, then a few notice pages per run).
 * Stored in KV; no logging.
 */
import { WDC_BASE, decode, text, clip, get, hiddenFields, parseDetail, nzToday } from './events.js';

export const CLOSURES_PATH = '/Services/Roads-and-Transportation/Roads/Roadworks-and-closures';
export const CLOSURES_URL = WDC_BASE + CLOSURES_PATH;
const KV_KEY = 'wdc-closures-v1';
const LIST_MAX_AGE = 3 * 3600 * 1000;
const PAGE_MAX_AGE = 3 * 3600 * 1000;
const ROBOTS_MAX_AGE = 24 * 3600 * 1000;
const STALE_REBUILD = 12 * 3600 * 1000;    // if the cron hasn't run for this long, a request rebuilds
const PAGES_PER_RUN = 4;
const MAX_LIST_PAGES = 4;
const MAX_ITEMS = 30;
export const MATCH = /te\s+matau(?:\s+[aā])?\s+pohe|dave\s+culham/i;
export const ROUTE_MATCH = /onerahi|riverside|te\s+matau|dave\s+culham|port\s+r(?:oa)?d|okara|semenoff|porowini|reyburn|h[aā]tea|kioreroa|tarewa|maunu|bank\s+st|kamo\s+r(?:oa)?d|whang[aā]rei\s+heads/i;
export const STADIUM_MATCH = /\b(semenoff\s+stadium|51\s+okara\s+dr(?:ive)?|okara\s+park)\b/i;
const BRIDGE = { lat: -35.73498, lon: 174.33534 };

export function nzStamp(now = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(now)).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function metres(a, b) {
  const R = 6371000, r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// robots.txt → the Disallow rules that could apply to the closures pages
export function robotsRules(txt) {
  const rules = [];
  for (const line of String(txt || '').split(/\r?\n/)) {
    const m = line.match(/^\s*Disallow\s*:\s*(\S+)/i); if (!m) continue;
    const p = m[1], lit = p.split('*')[0].replace(/\$$/, '');
    if (CLOSURES_PATH.startsWith(lit) || lit.startsWith(CLOSURES_PATH)) rules.push(p);
  }
  return rules;
}
export function allowed(url, rules) {
  let path; try { path = new URL(url).pathname; } catch (e) { return false; }
  return !(rules || []).some(p => {
    const endAnchor = p.endsWith('$'), body = endAnchor ? p.slice(0, -1) : p;
    const re = new RegExp('^' + body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + (endAnchor ? '$' : ''), 'i');
    return re.test(path);
  });
}

// One page of the list → { items: [{ url, title, desc, where }], page, pages }
export function parseClosureList(html) {
  const a = html.indexOf('events-list-container'); if (a < 0) return { items: [], page: 1, pages: 0 };
  const b = html.indexOf('seamless-pagination-info', a);
  const part = html.slice(a, b > 0 ? b + 200 : a + 60000);
  const items = [];
  for (const blk of part.split('<div class="list-item-container').slice(1)) {
    const href = (blk.match(/<a href="([^"]+)"/) || [])[1];
    const title = text((blk.match(/<h2 class="list-item-title">([\s\S]*?)<\/h2>/) || [])[1]);
    if (!href || !title) continue;
    let url; try { url = new URL(decode(href), WDC_BASE); } catch (e) { continue; }
    if (url.hostname !== 'www.wdc.govt.nz' || !url.pathname.startsWith(CLOSURES_PATH + '/')) continue;
    items.push({
      url: url.toString(), title: title.slice(0, 160),
      desc: clip(text((blk.match(/<span class="list-item-block-desc">([\s\S]*?)<\/span>/) || [])[1]), 400),
      where: text((blk.match(/<p class="list-item-address">([\s\S]*?)<\/p>/) || [])[1]).slice(0, 200)
    });
  }
  const pm = part.match(/Page (\d+) of (\d+)/);
  return { items, page: pm ? +pm[1] : 1, pages: pm ? +pm[2] : 1 };
}

// 2.27.82: the detour line, only when the council wrote one
const detourOf = t => { const m = String(t || '').match(/[^.]*\b(detours?|diversions?|alternative route)\b[^.]*\.?/i); return m ? clip(m[0].trim(), 200) : ''; };
export function cleanClosureDesc(raw) {
  let s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = s.replace(/^Pursuant to Schedule[^:]+:\s*/i, '');
  s = s.replace(/^Whang[aā]rei District Council(?: and [A-Za-z0-9 &]+)? will be carrying out\s+/i, 'Carrying out ');
  s = s.replace(/\bPeriod of closure(?:\s*\([^)]*\))?\s*:\s*[^.]*\.\s*/gi, '');
  s = s.replace(/\bAll works are weather dependent[^.]*\.\s*/gi, '');
  s = s.replace(/\bDuring the (?:proposed )?period of closure[^.]*\.\s*/gi, '');
  s = s.replace(/\bAny enquiries should be addressed[^.]*\.\s*/gi, '');
  return clip(s.trim(), 240);
}
// A notice page → every part, each marked bridge or not: [{ where, desc, dates, detour, bridge }]
// (2.27.82: all parts are kept for the district-wide /road-closures; /closures and the bridge alerts use the bridge ones)
export function parseClosurePage(html, item = {}) {
  const out = [];
  if (html.includes('<div class="multi-location-item">')) {
    for (let blk of html.split('<div class="multi-location-item">').slice(1)) {
      const end = blk.indexOf('</ul></div></div>');
      blk = end > 0 ? blk.slice(0, end + 17) : blk.slice(0, 4000);
      const where = text((blk.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1]).slice(0, 200);
      const paras = [...blk.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => text(m[1])).filter(Boolean);
      const desc = cleanClosureDesc(paras[0] || '');
      out.push({ where, desc, dates: parseDetail(blk).dates, detour: detourOf(paras.join(' ')), bridge: MATCH.test(where + ' ' + desc) });
    }
    return out;
  }
  const a = html.indexOf('oc-page-title'); if (a < 0) return out;
  let end = html.length;
  for (const k of ['<h2 class="sub-title">When', '<h2 class="sub-title">Location', 'class="gmap']) { const i = html.indexOf(k, a); if (i > 0 && i < end) end = i; }
  const content = html.slice(a, Math.min(end, a + 40000));
  const paras = [...content.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map(m => text(m[1])).filter(t => t && !/^(Event date|Next date)\s*:/i.test(t));
  const desc = cleanClosureDesc(paras.join(' '));
  const det = parseDetail(html);
  const c = html.match(/"centerPoint"\s*:\s*"(-?[\d.]+),\s*(-?[\d.]+)"/);
  const near = c ? metres(BRIDGE, { lat: +c[1], lon: +c[2] }) < 400 : false;
  out.push({ where: det.venue || item.where || '', desc, dates: det.dates, detour: detourOf(paras.join(' ')), bridge: !!(near || MATCH.test([item.title, item.desc, item.where, desc, det.venue].join(' '))) });
  return out;
}

async function fetchClosureList(fetchImpl) {
  const first = await get(CLOSURES_URL, fetchImpl);
  const p1 = parseClosureList(first);
  if (!p1.pages && !first.includes('events-list-container')) throw new Error('list_changed');
  let items = p1.items.slice();
  const pages = Math.min(p1.pages || 1, MAX_LIST_PAGES);
  if (pages > 1) {
    const { form, sel, go } = hiddenFields(first);
    if (sel && go) for (let p = 2; p <= pages; p++) {
      const body = new URLSearchParams(form); body.set(sel, String(p)); body.set(go, 'Go');
      const html = await get(CLOSURES_URL, fetchImpl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': CLOSURES_URL }, body: body.toString() });
      const pr = parseClosureList(html);
      if (pr.page !== p) break;
      items = items.concat(pr.items);
    }
  }
  const seen = new Set();
  return items.filter(i => !seen.has(i.url) && seen.add(i.url)).slice(0, MAX_ITEMS);
}

// state = { listAt, list, pages: { url: { at, entries } }, robots: { at, rules } }
// One small step (cron), or everything at once (opts.all, used when nothing is saved yet).
export async function step(state, fetchImpl = fetch, now = Date.now(), opts = {}) {
  state = state && typeof state === 'object' ? state : {};
  state.pages = state.pages || {};
  let changed = false;
  // 2.27.82: notice pages saved before v2 only kept the bridge parts; read them again (a few per run)
  if (state.v !== 2) { for (const u of Object.keys(state.pages)) if (state.pages[u]) state.pages[u].at = 0; state.v = 2; changed = true; }
  if (!state.robots || now - state.robots.at > ROBOTS_MAX_AGE) {
    try { state.robots = { at: now, rules: robotsRules(await get(WDC_BASE + '/robots.txt', fetchImpl)) }; }
    catch (e) { if (!state.robots) state.robots = { at: now - ROBOTS_MAX_AGE + 3600 * 1000, rules: null }; } // unknown: skip notice pages for now
    changed = true;
  }
  if (!state.list || !state.listAt || now - state.listAt > LIST_MAX_AGE) {
    state.list = await fetchClosureList(fetchImpl);
    state.listAt = now; state.error = null; changed = true;
    if (!opts.all) return { state, changed };
  }
  const want = state.list.map(i => i.url).filter(u => !state.pages[u] || now - state.pages[u].at > PAGE_MAX_AGE)
    .slice(0, opts.all ? MAX_ITEMS : PAGES_PER_RUN);
  for (const u of want) {
    const item = state.list.find(i => i.url === u) || {};
    if (!state.robots.rules || !allowed(u, state.robots.rules)) { state.pages[u] = { at: now, entries: null, skipped: true }; changed = true; continue; }
    try { state.pages[u] = { at: now, entries: parseClosurePage(await get(u, fetchImpl), item) }; }
    catch (e) { state.pages[u] = { at: now - PAGE_MAX_AGE + 3600 * 1000, entries: null, failed: true }; }
    changed = true;
  }
  const live = new Set(state.list.map(i => i.url));
  for (const u of Object.keys(state.pages)) if (!live.has(u)) { delete state.pages[u]; changed = true; }
  return { state, changed };
}

const stamp = (d, t, fallback) => d + 'T' + (t || fallback);
// What the app gets: notices about the bridge that haven't finished yet
export function toClosures(state, now = Date.now()) {
  const nowS = nzStamp(now), out = [];
  for (const item of (state && state.list) || []) {
    const pg = state.pages && state.pages[item.url];
    let entries = pg && Array.isArray(pg.entries) ? pg.entries.filter(e => e.bridge !== false) : null; // old entries (no flag) were bridge-only
    if (!entries) entries = MATCH.test([item.title, item.desc, item.where].join(' ')) ? [{ where: item.where, desc: item.desc, dates: [] }] : [];
    entries.forEach((e, i) => {
      const dates = (e.dates || []).filter(d => stamp(d.end || d.start, d.endTime, '23:59') > nowS);
      if ((e.dates || []).length && !dates.length) return; // all finished
      const slug = item.url.split('/').pop().replace(/[^A-Za-z0-9-]+/g, '-').slice(0, 80);
      out.push({ id: 'wdc-closure-' + slug + '-' + i, title: item.title, where: e.where || item.where || '', desc: e.desc || item.desc || '', url: item.url, dates: dates.slice(0, 20) });
    });
  }
  const first = c => c.dates.length ? stamp(c.dates[0].start, c.dates[0].time, '00:00') : '9999';
  out.sort((a, b) => first(a).localeCompare(first(b)));
  return {
    source: { name: 'Whangārei District Council – Roadworks and closures', url: CLOSURES_URL },
    updated: state && state.listAt ? new Date(state.listAt).toISOString() : null,
    count: out.length, closures: out.slice(0, 20)
  };
}

/* 2.27.82: every current or upcoming notice in the district (next 7 days), for the bell page. Council wording only,
   each links to its notice. Finished dates drop off; a notice with every date finished is left out. A notice whose page
   hasn't been read yet shows the list's own summary (no dates). */
// 2.28.15: 14-day (2 weeks) lookahead for /road-closures
function slugDate(url, desc) {
  const m = String(url || '').match(/-(20\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:$|[^\d])/);
  if (!m) return [];
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const tm = String(desc || '').match(/(\d{1,2}):(\d{2})\s*(am|pm)\s+to\s+(\d{1,2}):(\d{2})\s*(am|pm)/i);
  const to24 = (h, mn, ap) => String((+h % 12) + (/pm/i.test(ap) ? 12 : 0)).padStart(2, '0') + ':' + mn;
  return [{ start: iso, end: iso, time: tm ? to24(tm[1], tm[2], tm[3]) : '', endTime: tm ? to24(tm[4], tm[5], tm[6]) : '' }];
}
export function stadiumEventClosures(eventsState, existing = [], now = Date.now(), days = 14) {
  const nowS = nzStamp(now), today = nowS.slice(0, 10), lim = new Date(Date.parse(today + 'T12:00:00Z') + days * 864e5).toISOString().slice(0, 10);
  const out = [], list = (eventsState && eventsState.list) || [], details = (eventsState && eventsState.details) || {};
  for (const ev of list) {
    if (!ev || !ev.title || !ev.url) continue;
    const det = details[ev.url] || {};
    const venue = det.venue || ev.venue || '';
    const blob = [ev.title, venue, ev.desc].join(' ');
    if (!STADIUM_MATCH.test(blob)) continue;
    const occ = (det.dates && det.dates.length) ? det.dates : (ev.date ? [{ start: ev.date, end: ev.date, time: '', endTime: '' }] : []);
    const dates = occ.filter(d => d && d.start && (d.end || d.start) >= today && d.start <= lim).map(d => {
      let sh = d.time || '13:00', eh = d.endTime || '18:30';
      if (d.time) {
        const m = +d.time.slice(0, 2) * 60 + +d.time.slice(3, 5);
        const sMin = Math.max(0, m - 120), eMin = d.endTime ? Math.min(23 * 60 + 59, +d.endTime.slice(0, 2) * 60 + +d.endTime.slice(3, 5) + 90) : Math.min(23 * 60 + 59, m + 210);
        sh = String(Math.floor(sMin / 60)).padStart(2, '0') + ':' + String(sMin % 60).padStart(2, '0');
        eh = String(Math.floor(eMin / 60)).padStart(2, '0') + ':' + String(eMin % 60).padStart(2, '0');
      }
      return { start: d.start, end: d.end || d.start, time: sh, endTime: eh };
    });
    if (!dates.length) continue;
    const already = existing.some(c => /okara|semenoff/i.test([c.title, c.where, c.desc].join(' ')) && (c.dates || []).some(cd => dates.some(dd => cd.start === dd.start)));
    if (already) continue;
    const slug = ev.url.split('/').pop().replace(/[^A-Za-z0-9-]+/g, '-').slice(0, 70);
    const tLabel = dates[0].time ? ` (${dates[0].time}–${dates[0].endTime})` : '';
    out.push({
      id: 'wdc-stadium-' + slug,
      title: `Okara Drive / Semenoff Stadium road closure (${ev.title})`,
      where: 'Okara Drive (Porowini Ave to Port Rd), Semenoff Stadium, Whangārei',
      desc: `Event road closure and traffic management on Okara Drive outside Semenoff Stadium (51 Okara Drive) for ${ev.title}${tLabel}. Expect road closures, resident/pass-only access and delays around Okara Drive, Port Road and Porowini Avenue.`,
      detour: 'Use Port Road, Reyburn Street or Porowini Avenue to avoid Okara Drive around Semenoff Stadium.',
      url: ev.url,
      bridge: false,
      commute: true,
      stadium: true,
      unread: false,
      dates: dates.slice(0, 6)
    });
  }
  return out;
}
export function toRoadClosures(state, now = Date.now(), days = 14, eventsState = null) {
  const nowS = nzStamp(now), today = nowS.slice(0, 10), lim = new Date(Date.parse(today + 'T12:00:00Z') + days * 864e5).toISOString().slice(0, 10), out = [];
  for (const item of (state && state.list) || []) {
    const pg = state.pages && state.pages[item.url];
    const read = pg && Array.isArray(pg.entries) && state.v === 2 && !(pg.at === 0);
    const fallbackDates = !read ? slugDate(item.url, item.desc) : [];
    const entries = read ? pg.entries : [{ where: item.where, desc: item.desc, dates: fallbackDates, detour: '', bridge: MATCH.test([item.title, item.desc, item.where].join(' ')), unread: !fallbackDates.length }];
    const slug = item.url.split('/').pop().replace(/[^A-Za-z0-9-]+/g, '-').slice(0, 80);
    entries.forEach((e, i) => {
      const all = (e.dates && e.dates.length) ? e.dates : slugDate(item.url, e.desc || item.desc);
      const dates = all.filter(d => (d.end || d.start) >= today && (d.start === today || stamp(d.end || d.start, d.endTime, '23:59') > nowS) && d.start <= lim);
      if (all.length && !dates.length) return;
      if (e.unread && !dates.length) return;
      const blob = [item.title, e.where || item.where, e.desc || item.desc].join(' ');
      out.push({ id: 'wdc-road-' + slug + '-' + i, title: item.title, where: e.where || item.where || '', desc: e.desc || item.desc || '', detour: e.detour || '', url: item.url, bridge: !!e.bridge, commute: !!(e.bridge || ROUTE_MATCH.test(blob)), unread: false, dates: dates.slice(0, 10) });
    });
  }
  if (eventsState) {
    for (const sc of stadiumEventClosures(eventsState, out, now, days)) out.push(sc);
  }
  const first = c => c.dates.length ? stamp(c.dates[0].start, c.dates[0].time, '00:00') : '9999';
  out.sort((a, b) => first(a).localeCompare(first(b)));
  return { source: { name: 'Whangārei District Council – Roadworks and closures', url: CLOSURES_URL }, updated: state && state.listAt ? new Date(state.listAt).toISOString() : null, count: out.length, closures: out.slice(0, 30) };
}
const RAMM_URL = 'https://services1.arcgis.com/RfTgcgHraFPg7Fq4/arcgis/rest/services/RAMM_Road_Closures_and_Restrictions_-_All/FeatureServer/0/query?where=1%3D1&outFields=OBJECTID,road_id,c_description,cause,road_status,planned_action,detour_details,estimated_outage,info_updated&returnGeometry=false&f=json';
let rammMem = null;
async function fetchRammClosures(fetchImpl = fetch, now = Date.now()) {
  if (rammMem && now - rammMem.at < 15 * 60 * 1000) return rammMem.items;
  try {
    const r = await fetchImpl(RAMM_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return (rammMem && rammMem.items) || [];
    const j = await r.json();
    const today = nzStamp(now).slice(0, 10), items = [];
    for (const f of (j && j.features) || []) {
      const a = (f && f.attributes) || {};
      const road = String(a.road_id || '').replace(/\s+CTRL$/i, '').trim();
      const status = String(a.road_status || '').trim();
      if (!road || !/closed/i.test(status + ' ' + (a.c_description || ''))) continue;
      const endIso = String(a.estimated_outage || '').slice(0, 10);
      if (endIso && endIso < today) continue;
      const startIso = String(a.info_updated || '').slice(0, 10) || today;
      const slug = road.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      const blob = [road, a.c_description, a.cause, a.detour_details].join(' ');
      items.push({
        id: 'wdc-ramm-' + slug + '-' + (a.OBJECTID || 0),
        title: `${road} – ${status || 'Road Closed'}`,
        where: road + ', Whangārei District',
        desc: [a.c_description, a.cause, a.planned_action].filter(Boolean).join(' · ').slice(0, 320),
        detour: String(a.detour_details || '').slice(0, 200),
        url: CLOSURES_URL,
        bridge: MATCH.test(blob),
        commute: ROUTE_MATCH.test(blob),
        unread: false,
        dates: [{ start: startIso > today ? startIso : today, end: endIso || today, time: '', endTime: '' }]
      });
    }
    rammMem = { at: now, items };
    return items;
  } catch (e) { return (rammMem && rammMem.items) || []; }
}
export async function getRoadClosures(env, fetchImpl = fetch, now = Date.now()) {
  let state = await load(env);
  if (!state || !state.listAt || now - state.listAt > STALE_REBUILD || (state.list && state.list.length <= 5 && state.list.some(i => !state.pages || !state.pages[i.url]))) {
    const s = (await step(state, fetchImpl, now, { all: true })).state;
    await save(env, s).catch(() => { });
    state = s;
  }
  let eventsState = null;
  if (env && env.EVENTS_KV) { try { eventsState = await env.EVENTS_KV.get('wdc-events-v1', { type: 'json', cacheTtl: 300 }); } catch (e) { eventsState = null; } }
  const res = toRoadClosures(state, now, 35, eventsState);
  if (fetchImpl === fetch) {
    const ramm = await fetchRammClosures(fetchImpl, now);
    for (const rc of ramm) {
      if (!res.closures.some(c => c.where && c.where.toLowerCase().includes(rc.where.split(',')[0].toLowerCase()))) res.closures.push(rc);
    }
    res.count = res.closures.length;
  }
  return res;
}

async function load(env) { if (!env || !env.EVENTS_KV) return null; try { return await env.EVENTS_KV.get(KV_KEY, { type: 'json', cacheTtl: 300 }); } catch (e) { return null; } }
async function save(env, state) { if (env && env.EVENTS_KV) await env.EVENTS_KV.put(KV_KEY, JSON.stringify(state)); }

let mem = null, building = null;
export async function getClosures(env, fetchImpl = fetch, now = Date.now()) {
  if (mem && now - mem.readAt < 5 * 60 * 1000) return mem.feed;
  let state = await load(env);
  if (!state || !state.listAt || now - state.listAt > STALE_REBUILD) {
    building = building || (async () => {
      const s = (await step(state, fetchImpl, now, { all: true })).state;
      await save(env, s).catch(() => { }); return s;
    })().finally(() => { building = null; });
    state = await building;
  }
  const feed = toClosures(state, now);
  mem = { readAt: now, feed };
  return feed;
}
export function resetClosures() { mem = null; building = null; }

// after(state) runs with the latest state on every run (used for push alerts)
export async function scheduledClosures(env, fetchImpl = fetch, now = Date.now(), after = null) {
  const prev = await load(env);
  let r;
  try { r = await step(prev, fetchImpl, now); }
  catch (e) { if (!prev) return false; r = { state: Object.assign(prev, { error: String(e && e.message || e).slice(0, 60), errorAt: now }), changed: true }; }
  if (r.changed) await save(env, r.state);
  if (after) { try { await after(r.state); } catch (e) { /* alerts must never break the closures check */ } }
  return r.changed;
}
