/* 2.27.10: Event Cinemas Whangārei line-up from Event Cinemas' own public JSON (the same calls their sessions page makes).
 *   GET https://www.eventcinemas.co.nz/Cinemas/GetSessions?cinemaIds=503&date=YYYY-MM-DD  (one day of sessions)
 *   GET https://www.eventcinemas.co.nz/Movies/GetComingSoon?cinemaIds=503                (national coming soon; kept when 503 is listed)
 * Cinema 503 is Whangarei, 18 James Street. Read at most every 12 hours (7 day calls + 1), kept in KV, added to GET /events
 * as `cinema`. Only what Event Cinemas says: title, rating, poster, runtime, genres, release date, session times and booking links. */
export const EC = 'https://www.eventcinemas.co.nz';
export const EC_CINEMA_ID = 503;
export const EC_CINEMA_URL = EC + '/cinema/whangarei';
export const EC_SESSIONS_URL = EC + '/cinema/whangarei/sessions';
const KV_KEY = 'ec-whangarei-v1';
const MAX_AGE = 12 * 3600 * 1000;
const DAYS = 7;
const HEAD = { 'User-Agent': 'Mozilla/5.0 (compatible; DueDatesRelay/1.0; personal family app)', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };

const nzToday = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date(now));
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const str = (v, n = 160) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '';
const httpsEc = u => { u = str(u, 300); if (u.startsWith('/')) u = EC + u; return /^https:\/\/(www|cdn)\.eventcinemas\.co\.nz\//.test(u) ? u : ''; };
const ytId = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{11}$/.test(v)) ? v : '';

function movieBase(m) {
  return {
    id: Number(m.Id) || 0, title: str(m.Name), rating: str(m.Rating, 8), url: httpsEc(m.MovieUrl) || EC_CINEMA_URL,
    poster: httpsEc(m.PosterUrl || m.LargePosterUrl), mins: Number(m.RunningTime) || 0, genres: str(m.Genres, 60),
    released: str(m.ReleasedAt, 10), trailer: ytId((m.Trailers || [])[0])
  };
}
// One day of GetSessions -> [{movie, sessions}]
export function parseSessions(j) {
  const D = j && j.Data, out = [];
  for (const m of (D && D.Movies) || []) {
    const b = movieBase(m); if (!b.id || !b.title) continue;
    const ses = [];
    for (const cm of m.CinemaModels || []) {
      if (Number(cm.Id) !== EC_CINEMA_ID) continue;
      for (const s of cm.Sessions || []) {
        const t = str(s.StartTime, 16); if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(t)) continue;
        ses.push({ t, url: httpsEc(s.BookingUrl) || EC_SESSIONS_URL, scr: str(s.ScreenTypeName, 20) === 'Original' ? '' : str(s.ScreenTypeName, 20), full: s.SeatsAvailable === 0 });
      }
    }
    if (ses.length) out.push({ m: b, ses });
  }
  return out;
}
export function parseComingSoon(j, today) {
  const out = [];
  for (const m of (j && j.Data && j.Data.Movies) || []) {
    if (!(m.CinemaIds || []).map(Number).includes(EC_CINEMA_ID)) continue;
    const b = movieBase(m); if (!b.id || !b.title) continue;
    if (b.released && b.released < today) continue; // already out: it shows in now showing when it has sessions here
    out.push({ ...b, soon: true });
  }
  return out;
}
export function merge(days, soon) {
  const by = new Map();
  for (const day of days) for (const { m, ses } of day) {
    const x = by.get(m.id) || { ...m, soon: false, sessions: [] };
    x.sessions.push(...ses); by.set(m.id, x);
  }
  for (const x of by.values()) { x.sessions.sort((a, b) => a.t.localeCompare(b.t)); x.sessions = x.sessions.slice(0, 60); }
  for (const s of soon) if (!by.has(s.id)) by.set(s.id, { ...s, sessions: [] });
  const list = [...by.values()];
  // now showing first (soonest session), then coming soon by release date
  list.sort((a, b) => (a.soon - b.soon) || (a.soon ? (a.released || '9').localeCompare(b.released || '9') : (a.sessions[0] ? a.sessions[0].t : '9').localeCompare(b.sessions[0] ? b.sessions[0].t : '9')) || a.title.localeCompare(b.title));
  return list.slice(0, 60);
}
async function getJson(url, fetchImpl) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetchImpl(url, { headers: HEAD, signal: ctl.signal });
    if (!r.ok) throw new Error('ec_' + r.status);
    return await r.json();
  } finally { clearTimeout(to); }
}
export async function fetchCinema(fetchImpl = fetch, now = Date.now()) {
  const today = nzToday(now), days = []; let ok = 0;
  for (let i = 0; i < DAYS; i++) {
    try { days.push(parseSessions(await getJson(`${EC}/Cinemas/GetSessions?cinemaIds=${EC_CINEMA_ID}&date=${addDays(today, i)}`, fetchImpl))); ok++; } catch (e) { }
  }
  let soon = [];
  try { soon = parseComingSoon(await getJson(`${EC}/Movies/GetComingSoon?cinemaIds=${EC_CINEMA_ID}`, fetchImpl), today); ok++; } catch (e) { }
  if (!ok) throw new Error('cinema_unavailable');
  return { at: now, name: 'Event Cinemas Whangārei', address: '18 James Street', url: EC_CINEMA_URL, sessionsUrl: EC_SESSIONS_URL, movies: merge(days, soon) };
}
// Shape used by local.js movieEvents (title, date, times) so the Events list keeps working
export function toScheduleItems(c) {
  const out = [];
  for (const m of (c && c.movies) || []) {
    const byD = {};
    for (const s of m.sessions || []) (byD[s.t.slice(0, 10)] = byD[s.t.slice(0, 10)] || []).push(s.t.slice(11, 16));
    for (const d of Object.keys(byD)) out.push({ title: m.title, date: d, times: byD[d], url: m.url });
  }
  return out;
}
let mem = null, busy = null;
export async function getCinema(env, fetchImpl = fetch, now = Date.now()) {
  if (mem && now - mem.at < MAX_AGE) return mem;
  const kv = env && env.EVENTS_KV;
  let st = null;
  if (kv) { try { st = await kv.get(KV_KEY, { type: 'json' }); } catch (e) { } }
  if (st && Array.isArray(st.movies) && now - st.at < MAX_AGE) { mem = st; return st; }
  busy = busy || fetchCinema(fetchImpl, now).then(async s => { mem = s; if (kv) { try { await kv.put(KV_KEY, JSON.stringify(s)); } catch (e) { } } return s; }).finally(() => { busy = null; });
  try { return await busy; }
  catch (e) { if (st && Array.isArray(st.movies)) { mem = { ...st, at: now - MAX_AGE + 3600e3 }; return st; } return null; }
}
export function resetCinema() { mem = null; busy = null; }
