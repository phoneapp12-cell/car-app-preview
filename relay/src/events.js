/* Local events for the Due Dates app: Whangārei District Council "What's On".
 *
 * Source: https://www.wdc.govt.nz/Events/Whats-On (official council listing; robots.txt allows it).
 * Council terms allow reproducing and using the content for personal, informational and
 * non-commercial purposes. We keep only what the app needs (title, dates/times, venue, short
 * description, categories, cost) and always link back to the council's page.
 *
 * How it stays light on the council site:
 *  - A cron trigger (every 10 minutes) either re-reads the list (every 3 hours, about 8 pages) or
 *    reads up to 8 event pages for exact times (each page about once a day). Results are stored in KV and served from there.
 *  - The app's GET /events never causes more than one rebuild at a time, and only when KV is empty.
 * No logging anywhere.
 */

export const WDC_BASE = 'https://www.wdc.govt.nz';
export const WDC_LIST = WDC_BASE + '/Events/Whats-On';
const UA = 'DueDatesApp/1.0 (+https://phoneapp12-cell.github.io/car-app-preview/; personal family app)';
const HEADERS = { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-NZ,en;q=0.9' };
export const WINDOW_DAYS = 60;
const MAX_PAGES = 12;
const LIST_MAX_AGE = 3 * 3600 * 1000;       // re-read the list every 3 hours
const DETAIL_MAX_AGE = 24 * 3600 * 1000;    // re-read an event page once a day
const DETAILS_PER_RUN = 8;
const KV_KEY = 'wdc-events-v1';
const FETCH_TIMEOUT = 15000;
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', reg: '®', copy: '©', trade: '™', eacute: 'é' };
export function decode(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
    return ENT[e.toLowerCase()] != null ? ENT[e.toLowerCase()] : m;
  });
}
const text = s => decode(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const pad = n => String(n).padStart(2, '0');
const clip = (s, n) => s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '…';

export function nzToday(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}
export function addDaysISO(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

// One page of the council's list → [{ url, title, date, desc, cats, venue }]
export function parseList(html) {
  const a = html.indexOf('events-list-container'); if (a < 0) return { items: [], pages: 0 };
  const b = html.indexOf('seamless-pagination-info', a);
  const part = html.slice(a, b > 0 ? b + 200 : a + 60000);
  const items = [];
  for (const blk of part.split('<div class="list-item-container').slice(1)) {
    const href = (blk.match(/<a href="([^"]+)"/) || [])[1];
    const title = text((blk.match(/<h2 class="list-item-title">([\s\S]*?)<\/h2>/) || [])[1]);
    const dm = blk.match(/part-date">(\d{1,2})<\/span>\s*<span class="part-month">(\w{3})<\/span>\s*<span class="part-year">(\d{4})/);
    if (!href || !title || !dm || !MON[dm[2]]) continue;
    let url; try { url = new URL(decode(href), WDC_BASE); } catch (e) { continue; }
    if (url.hostname !== 'www.wdc.govt.nz') continue;
    const cats = ((blk.match(/<p class="tagged-as-list">[\s\S]*?<span class="text">([\s\S]*?)<\/span><\/p>/) || [])[1] || '')
      .split(/<span class="separator">[\s\S]*?<\/span>/).map(text).filter(Boolean);
    items.push({
      url: url.toString(), title: title.slice(0, 160),
      date: `${dm[3]}-${pad(MON[dm[2]])}-${pad(dm[1])}`,
      desc: clip(text((blk.match(/<span class="list-item-block-desc">([\s\S]*?)<\/span>/) || [])[1]), 400),
      cats: [...new Set(cats)].slice(0, 6),
      venue: text((blk.match(/<p class="list-item-address">([\s\S]*?)<\/p>/) || [])[1]).slice(0, 200)
    });
  }
  const pm = part.match(/Page (\d+) of (\d+)/);
  return { items, page: pm ? +pm[1] : 1, pages: pm ? +pm[2] : 1 };
}

// An event page → { dates: [{ start, end, time, endTime }], venue, cost }
export function parseDetail(html) {
  const out = { dates: [], venue: '', cost: '' };
  const a = html.indexOf('multi-date-list');
  if (a >= 0) {
    const e = html.indexOf('</ul>', a);
    const part = html.slice(a, e > 0 ? e + 5 : a + 20000);
    for (const m of part.matchAll(/<li class="multi-date-item"([^>]*)>/g)) {
      const at = k => (m[1].match(new RegExp(`data-${k}='(\\d+)'`)) || [])[1];
      const sy = at('start-year'), sm = at('start-month'), sd = at('start-day');
      if (!sy || !sm || !sd) continue;
      const ey = at('end-year') || sy, em = at('end-month') || sm, ed = at('end-day') || sd;
      const sh = at('start-hour'), smin = at('start-mins'), eh = at('end-hour'), emin = at('end-mins');
      const time = sh != null && smin != null ? `${pad(sh)}:${pad(smin)}` : '';
      const endTime = eh != null && emin != null ? `${pad(eh)}:${pad(emin)}` : '';
      const allDay = !time || (time === '00:00' && (endTime === '00:00' || endTime === '23:59'));
      out.dates.push({ start: `${sy}-${pad(sm)}-${pad(sd)}`, end: `${ey}-${pad(em)}-${pad(ed)}`, time: allDay ? '' : time, endTime: allDay || endTime === time ? '' : endTime });
      if (out.dates.length >= 60) break;
    }
  }
  const l = html.indexOf('<h2 class="sub-title">Location</h2>');
  if (l >= 0) {
    const p = html.slice(l, l + 3000).match(/<p>([\s\S]*?)(?:<a [^>]*>View Map<\/a>|<\/p>)/);
    if (p) out.venue = text(p[1]).replace(/,\s*$/, '').slice(0, 200);
  }
  const c = html.indexOf('<p class="side-box-cost">');
  if (c >= 0) out.cost = clip(text(html.slice(c, html.indexOf('</p>', c))), 120);
  return out;
}

export function hiddenFields(html) {
  const f = new URLSearchParams();
  const form = html.slice(html.indexOf('<form'), html.indexOf('events-list-container') > 0 ? html.indexOf('events-list-container') : undefined);
  for (const m of form.matchAll(/<input type="hidden" name="([^"]+)"[^>]*?value="([^"]*)"/g)) f.set(m[1], decode(m[2]));
  const pager = html.slice(html.indexOf('seamless-pagination-controls'));
  const sel = (pager.match(/Page <select name="([^"]+)"/) || [])[1];
  const go = (pager.match(/<input type="submit" name="([^"]+)" value="Go"/) || [])[1];
  return { form: f, sel, go };
}

async function get(url, fetchImpl, init = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetchImpl(url, { ...init, headers: { ...HEADERS, ...(init.headers || {}) }, redirect: 'follow', signal: ctl.signal });
    if (!r.ok) throw new Error('upstream_' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

// Read every page of the list (page 1 by GET, the rest with the page's own "Go to page" form).
export async function fetchList(fetchImpl = fetch) {
  const first = await get(WDC_LIST, fetchImpl);
  const p1 = parseList(first);
  let items = p1.items.slice();
  const pages = Math.min(p1.pages || 1, MAX_PAGES);
  if (pages > 1) {
    const { form, sel, go } = hiddenFields(first);
    if (!sel || !go) throw new Error('pager_changed');
    for (let p = 2; p <= pages; p++) {
      const body = new URLSearchParams(form); body.set(sel, String(p)); body.set(go, 'Go');
      const html = await get(WDC_LIST, fetchImpl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': WDC_LIST }, body: body.toString() });
      const pr = parseList(html);
      if (pr.page !== p) break; // the council site changed how paging works: keep what we have
      items = items.concat(pr.items);
    }
  }
  if (!items.length) throw new Error('no_events_found');
  return items;
}

// state = { listAt, list: [...], details: { url: { at, dates, venue, cost } } }
export async function refresh(state, fetchImpl = fetch, now = Date.now(), opts = {}) {
  state = state && typeof state === 'object' ? state : {};
  state.details = state.details || {};
  const today = nzToday(now), until = addDaysISO(today, WINDOW_DAYS);
  if (!state.list || !state.listAt || now - state.listAt > LIST_MAX_AGE || opts.forceList) {
    state.list = await fetchList(fetchImpl);
    state.listAt = now;
    state.error = null;
    state.changed = true;
    if (!opts.alsoDetails) return state; // keep each run small: the list, or a few event pages
  }
  // Exact dates/times for events in the window, a few pages per run, oldest first
  const want = [...new Set(state.list.filter(e => e.date <= until).map(e => e.url))]
    .filter(u => !state.details[u] || now - state.details[u].at > DETAIL_MAX_AGE)
    .sort((x, y) => ((state.details[x] || {}).at || 0) - ((state.details[y] || {}).at || 0))
    .slice(0, opts.maxDetails != null ? opts.maxDetails : DETAILS_PER_RUN);
  if (want.length) state.changed = true;
  for (const u of want) {
    try { state.details[u] = { at: now, ...parseDetail(await get(u, fetchImpl)) }; }
    catch (e) { state.details[u] = { at: now - DETAIL_MAX_AGE + 3600 * 1000, dates: [], failed: true }; } // try again in an hour
  }
  const live = new Set(state.list.map(e => e.url));
  for (const u of Object.keys(state.details)) if (!live.has(u)) delete state.details[u];
  return state;
}

// What the app gets: one entry per occurrence in the next WINDOW_DAYS days.
export function toFeed(state, now = Date.now()) {
  const today = nzToday(now), until = addDaysISO(today, WINDOW_DAYS);
  const out = [], seen = new Set();
  for (const e of (state && state.list) || []) {
    if (seen.has(e.url)) continue; seen.add(e.url);
    const d = state.details && state.details[e.url];
    const slug = e.url.replace(/^.*\/Events\//i, '').replace(/[^A-Za-z0-9-]+/g, '-').slice(0, 90);
    const occ = d && d.dates && d.dates.length ? d.dates : [{ start: e.date, end: e.date, time: '', endTime: '', unknownTime: true }];
    for (const o of occ) {
      if (o.end < today || o.start > until) continue;
      out.push({
        id: 'wdc-' + slug + '-' + o.start + (o.time ? '-' + o.time.replace(':', '') : ''),
        title: e.title, url: e.url, date: o.start, end: o.end !== o.start ? o.end : '',
        time: o.time || '', endTime: o.endTime || '', timeKnown: !o.unknownTime,
        venue: (d && d.venue) || e.venue || '', desc: e.desc, cats: e.cats, cost: (d && d.cost) || ''
      });
    }
  }
  // Something that started earlier but is still running shows on today
  out.forEach(x => { if (x.date < today) { x.from = x.date; x.date = today; } });
  out.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99') || a.title.localeCompare(b.title));
  return {
    source: { name: 'Whangārei District Council – What’s On', url: WDC_LIST },
    updated: state && state.listAt ? new Date(state.listAt).toISOString() : null,
    windowDays: WINDOW_DAYS, count: out.length, events: out.slice(0, 400)
  };
}

export async function loadState(env) {
  if (!env || !env.EVENTS_KV) return null;
  try { return await env.EVENTS_KV.get(KV_KEY, { type: 'json', cacheTtl: 300 }); } catch (e) { return null; }
}
export async function saveState(env, state) {
  if (!env || !env.EVENTS_KV) return;
  const { changed, ...keep } = state;
  await env.EVENTS_KV.put(KV_KEY, JSON.stringify(keep));
}

let mem = null, building = null; // per-isolate copy, so busy periods don't even read KV
export async function getFeed(env, fetchImpl = fetch, now = Date.now()) {
  if (mem && now - mem.readAt < 5 * 60 * 1000) return mem.feed;
  let state = await loadState(env);
  if (!state || !state.list) {
    // First run (before the cron has filled KV): read the list now, times follow on the next cron run
    building = building || refresh(state, fetchImpl, now).then(async s => { await saveState(env, s).catch(() => { }); return s; }).finally(() => { building = null; });
    state = await building;
  }
  const feed = toFeed(state, now);
  mem = { readAt: now, feed };
  return feed;
}
export function resetMemory() { mem = null; building = null; }

export async function scheduled(env, fetchImpl = fetch, now = Date.now()) {
  const state = (await loadState(env)) || {};
  state.changed = false;
  try { await refresh(state, fetchImpl, now); }
  catch (e) { state.error = String(e && e.message || e).slice(0, 60); state.errorAt = now; state.changed = true; }
  if (!state.changed) return false;
  delete state.changed;
  await saveState(env, state);
  return true;
}
