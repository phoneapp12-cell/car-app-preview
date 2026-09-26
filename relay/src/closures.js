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

// A notice page → the parts that concern the bridge: [{ where, desc, dates }]
export function parseClosurePage(html, item = {}) {
  const out = [];
  if (html.includes('<div class="multi-location-item">')) {
    for (let blk of html.split('<div class="multi-location-item">').slice(1)) {
      const end = blk.indexOf('</ul></div></div>');
      blk = end > 0 ? blk.slice(0, end + 17) : blk.slice(0, 4000);
      const where = text((blk.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1]).slice(0, 200);
      const desc = clip(text((blk.match(/<p>([\s\S]*?)<\/p>/) || [])[1]), 400);
      if (MATCH.test(where + ' ' + desc)) out.push({ where, desc, dates: parseDetail(blk).dates });
    }
    return out;
  }
  const a = html.indexOf('oc-page-title'); if (a < 0) return out;
  let end = html.length;
  for (const k of ['<h2 class="sub-title">When', '<h2 class="sub-title">Location', 'class="gmap']) { const i = html.indexOf(k, a); if (i > 0 && i < end) end = i; }
  const content = html.slice(a, Math.min(end, a + 40000));
  const paras = [...content.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map(m => text(m[1])).filter(t => t && !/^(Event date|Next date)\s*:/i.test(t));
  const desc = clip(paras.join(' '), 400);
  const det = parseDetail(html);
  const c = html.match(/"centerPoint"\s*:\s*"(-?[\d.]+),\s*(-?[\d.]+)"/);
  const near = c ? metres(BRIDGE, { lat: +c[1], lon: +c[2] }) < 400 : false;
  if (near || MATCH.test([item.title, item.desc, item.where, desc, det.venue].join(' ')))
    out.push({ where: det.venue || item.where || '', desc, dates: det.dates });
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
    let entries = pg && Array.isArray(pg.entries) ? pg.entries : null;
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

export async function scheduledClosures(env, fetchImpl = fetch, now = Date.now()) {
  const prev = await load(env);
  let r;
  try { r = await step(prev, fetchImpl, now); }
  catch (e) { if (!prev) return false; r = { state: Object.assign(prev, { error: String(e && e.message || e).slice(0, 60), errorAt: now }), changed: true }; }
  if (!r.changed) return false;
  await save(env, r.state);
  return true;
}
