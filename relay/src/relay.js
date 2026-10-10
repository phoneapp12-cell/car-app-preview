import { sharedTodoRoute } from './shared-todo.js';
/* Calendar link relay for the Due Dates app (plus three fixed, read-only extras: /events, /weather and /closures).
 *
 * Why it exists: Outlook.com and Google serve private iCal (.ics) links without CORS headers,
 * so a web app on phoneapp12-cell.github.io can't read them directly. This relay fetches one
 * feed on request and hands it back with a CORS header for the app's origin only.
 *
 * Privacy: the feed link arrives in the POST body (never the query string, so it can't land in
 * access logs). /fetch is not logged, cached or stored. No console.log anywhere in this file.
 * POST /sync stores one encrypted blob per sync code in the existing KV binding (see sync.js).
 *
 * Safety: https only, allowlisted calendar hosts only (checked again on every redirect),
 * GET upstream only, 5 MB cap, 15 s timeout, response must look like an iCalendar file.
 *
 * GET /events: Whangārei District Council "What's On" as JSON (see events.js). Fixed source, no input.
 * GET /weather: Open-Meteo forecast for Whangārei, used only when the app can't reach Open-Meteo
 * itself. Fixed location, no input, kept for 20 minutes.
 * GET /closures: council roadworks/closure notices that mention the lifting bridge on Dave Culham Drive
 * (see closures.js). Fixed source, no input.
 * GET /roadworks: council roading projects whose expected start is within the next 12 months (see roadworks.js). Fixed source, no input.
 * GET /bridge-traffic: NZTA Northland highway events (see bridge-traffic.js). Fixed source, no input. The phone decides if any event is the lifting bridge.
 * GET /news: RNZ Northland headlines about Whangārei and Northland (see news.js). Fixed source, no input. Headlines and links only.
 * GET /blogs: a few public blogs (see blogs.js). Fixed feeds, no input. Title, link, time and a short summary. A failed feed has no posts.
 * GET /podcasts: a few public podcasts (see podcasts.js). Fixed feeds, no input. Title, link, time, a short summary and an https mp3 or m4a when the feed has one. A failed feed has no episodes.
 * POST /videos: search YouTube for one short English topic and return oembed-confirmed videos
 * (see videos.js). The query is the topic only. No arbitrary links. Nothing is stored.
 * GET /sarah: Sarah Jenkins's channel (one fixed RSS address). POST /sarah/seen marks the
 * newest id so it is not pushed again. No other channel can be requested.
 * GET /alerts: MetService severe weather watches and warnings that cover Whangārei (see metservice.js). Fixed source, no input.
 * GET /busy: how busy Noel Leeming Whangarei Supa is, from Google's public place payload. Fixed place, no input. A level word only, never a street. No reading means no level.
 * GET /mail/config: public OAuth client ids for Gmail and Outlook (empty if not set). No secrets.
 * POST /mail/token: exchange an authorization code (PKCE) or refresh token. A client secret is
 * read from the Worker env only and is never returned or logged. Mail subjects are not fetched here.
 */
import { getFeed } from './events.js';
import { getConcerts } from './concerts.js';
import { getClosures } from './closures.js';
import { getCouncilRoadworks } from './roadworks.js';
import { getBridgeTraffic } from './bridge-traffic.js';
import { getDrive } from './drive.js';
import { getStoreBusy } from './busy.js';
import { getLocalNews } from './news.js';
import { getBlogs } from './blogs.js';
import { getPodcasts } from './podcasts.js';
import { pushRoute } from './push.js';
import { sunshineRoute } from './sunshine.js';
import { searchVideos } from './videos.js';
import { syncRoute } from './sync.js';
import { getSarah, markSarahSeen } from './sarah.js';
import { mailConfig, exchangeMail } from './mail.js';
import { getMetAlerts } from './metservice.js';
import { aiSummary } from './ai.js';
import { aiAsk, aiReply } from './ask.js';

export const ALLOWED_HOSTS = ['outlook.live.com', 'outlook.office365.com', 'outlook.office.com', 'calendar.google.com'];
export const ALLOWED_SUFFIXES = ['.icloud.com']; // iCloud public calendars: pNN-caldav.icloud.com / pNN-calendars.icloud.com
export const MAX_BYTES = 5 * 1024 * 1024;
export const TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 3;
const DEFAULT_ORIGIN = 'https://phoneapp12-cell.github.io';

export function hostAllowed(host) {
  host = String(host || '').toLowerCase();
  return ALLOWED_HOSTS.includes(host) || ALLOWED_SUFFIXES.some(s => host.endsWith(s) && host.length > s.length);
}

// Returns a URL object or throws Error('bad_url' | 'host_not_allowed')
export function checkUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) throw new Error('bad_url');
  let s = raw.trim();
  if (/^webcals?:\/\//i.test(s)) s = 'https://' + s.replace(/^webcals?:\/\//i, '');
  let u;
  try { u = new URL(s); } catch (e) { throw new Error('bad_url'); }
  if (u.protocol !== 'https:') throw new Error('bad_url');
  if (u.username || u.password) throw new Error('bad_url');
  if (u.port && u.port !== '443') throw new Error('bad_url');
  if (!hostAllowed(u.hostname)) throw new Error('host_not_allowed');
  return u;
}

const MESSAGES = {
  bad_url: 'That is not a valid https calendar link.',
  host_not_allowed: 'Only Outlook, Google and iCloud calendar links are allowed.',
  method_not_allowed: 'Use POST with {"url": "..."}.',
  get_only: 'Use GET.',
  forbidden_origin: 'This service only works for the Due Dates app.',
  bad_request: 'Send JSON like {"url": "https://..."}.',
  not_found: 'The calendar service says this link does not exist.',
  denied: 'The calendar service refused this link.',
  upstream_error: 'The calendar service had a problem.',
  timeout: 'The calendar service took too long to answer.',
  too_large: 'That calendar is bigger than 5 MB.',
  not_calendar: 'That link did not return a calendar (.ics) file.',
  too_many_redirects: 'The calendar link redirected too many times.',
  not_found_route: 'Not found.',
  events_unavailable: 'Local events could not be loaded right now.',
  weather_unavailable: 'The weather could not be loaded right now.',
  closures_unavailable: 'Planned closures could not be checked right now.',
  roadworks_unavailable: 'Council roadworks could not be loaded right now.',
  bridge_traffic_unavailable: 'Live traffic could not be checked right now.',
  drive_unavailable: 'The drive time could not be checked right now.',
  busy_unavailable: 'Store busyness could not be checked right now.',
  alerts_unavailable: 'Weather warnings could not be checked right now.',
  news_unavailable: 'Local news could not be loaded right now.',
  blogs_unavailable: 'Blogs could not be loaded right now.',
  podcasts_unavailable: 'Podcasts could not be loaded right now.',
  bad_query: 'Use a short English topic name.',
  videos_unavailable: 'Videos could not be looked up just now.',
  sarah_unavailable: 'Sarah Jenkins’s videos could not be checked just now.',
  bad_code: 'That sync code is not valid.',
  sync_unavailable: 'Sync is not available right now.',
  sync_too_large: 'That sync data is too big to store.',
  client_id_missing: 'That mailbox sign-in is not configured yet.',
  client_secret_missing: 'That mailbox sign-in still needs a secret on the service.',
  bad_provider: 'Choose Gmail or Outlook.',
  bad_redirect: 'That sign-in return address is not allowed.',
  mail_unavailable: 'The mailbox sign-in service could not be reached.'
};

function allowedOrigins(env) {
  const extra = String((env && env.EXTRA_ORIGINS) || '').split(',').map(s => s.trim()).filter(Boolean);
  return [String((env && env.ALLOWED_ORIGIN) || DEFAULT_ORIGIN), ...extra];
}

function corsHeaders(origin, env) {
  const h = { 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
  if (origin && allowedOrigins(env).includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
    h['Access-Control-Expose-Headers'] = 'X-Feed-Status, Last-Modified, ETag';
  }
  return h;
}

function json(status, code, origin, env, extra = {}) {
  return new Response(JSON.stringify({ error: code, message: MESSAGES[code] || code, ...extra }), {
    status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function readCapped(res, controller) {
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_BYTES) { controller.abort(); throw new Error('too_large'); }
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks = []; let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) { reader.cancel().catch(() => { }); controller.abort(); throw new Error('too_large'); }
    chunks.push(value);
  }
  const all = new Uint8Array(total); let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.byteLength; }
  return new TextDecoder('utf-8').decode(all);
}

// Fetch the feed, following up to 3 redirects, re-checking the host each time.
export async function fetchFeed(u, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let url = u;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let res;
      try {
        res = await fetchImpl(url.toString(), {
          method: 'GET', redirect: 'manual', signal: controller.signal,
          headers: { 'Accept': 'text/calendar, text/plain;q=0.8, */*;q=0.1', 'User-Agent': 'DueDatesCalendarRelay/1.0' }
        });
      } catch (e) { throw new Error(controller.signal.aborted ? 'timeout' : 'upstream_error'); }
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        const next = new URL(res.headers.get('location'), url);
        if (res.body) res.body.cancel().catch(() => { });
        url = checkUrl(next.toString()); // throws host_not_allowed / bad_url
        continue;
      }
      if (res.status === 404 || res.status === 410) throw new Error('not_found');
      if (res.status === 401 || res.status === 403) throw new Error('denied');
      if (!res.ok) throw new Error('upstream_error');
      let text;
      try { text = await readCapped(res, controller); }
      catch (e) { if (e.message === 'too_large') throw e; throw new Error(controller.signal.aborted ? 'timeout' : 'upstream_error'); }
      if (!/^\uFEFF?\s*BEGIN:VCALENDAR/i.test(text)) throw new Error('not_calendar');
      return { text, lastModified: res.headers.get('last-modified'), etag: res.headers.get('etag') };
    }
    throw new Error('too_many_redirects');
  } finally { clearTimeout(timer); }
}

const STATUS = { bad_url: 400, host_not_allowed: 403, not_found: 404, denied: 403, upstream_error: 502, timeout: 504, too_large: 413, not_calendar: 422, too_many_redirects: 502 };

export async function handle(request, env = {}, fetchImpl = fetch) {
  const origin = request.headers.get('Origin') || '';
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const okOrigin = allowedOrigins(env).includes(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: okOrigin ? 204 : 403, headers: corsHeaders(origin, env) });
  }
  if (path === '/' || path === '/health') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return json(405, 'method_not_allowed', origin, env);
    if (path === '/health' || okOrigin) {
      return new Response(JSON.stringify({ ok: true, service: 'due-dates-calendar-relay' }), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    }
    return new Response('Due Dates calendar link service is running. It only answers requests from the Due Dates app.\n', { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (path === '/events' || path === '/concerts' || path === '/weather' || path === '/closures' || path === '/roadworks' || path === '/bridge-traffic') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = path === '/events' ? await getFeed(env, fetchImpl) : path === '/concerts' ? await getConcerts(env, fetchImpl) : path === '/closures' ? await getClosures(env, fetchImpl) : path === '/roadworks' ? await getCouncilRoadworks(env, fetchImpl) : path === '/bridge-traffic' ? await getBridgeTraffic(fetchImpl) : await getWeather(env, fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      const code = path === '/events' || path === '/concerts' ? 'events_unavailable' : path === '/closures' ? 'closures_unavailable' : path === '/roadworks' ? 'roadworks_unavailable' : path === '/bridge-traffic' ? 'bridge_traffic_unavailable' : 'weather_unavailable';
      return json(502, code, origin, env);
    }
  }
  if (path === '/ai/ask' || path === '/ai/reply') {
    if (request.method !== 'POST') return json(405, 'post_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const len = +(request.headers.get('content-length') || 0);
      if (len > 20000) return json(413, 'too_large', origin, env);
      const body = await request.json();
      const data = path === '/ai/ask' ? await aiAsk(env, body) : await aiReply(env, body);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    } catch (e) { return json(502, 'ai_unavailable', origin, env, { detail: String(e && e.message || e).slice(0, 160) }); }
  }
  if (path === '/ai') {
    if (request.method !== 'POST') return json(405, 'post_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const len = +(request.headers.get('content-length') || 0);
      if (len > 16000) return json(413, 'too_large', origin, env);
      const body = await request.json();
      const data = await aiSummary(env, body);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    } catch (e) { return json(502, 'ai_unavailable', origin, env, { detail: String(e && e.message || e).slice(0, 160) }); }
  }
  if (path === '/alerts') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = await getMetAlerts(env, fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    } catch (e) { return json(502, 'alerts_unavailable', origin, env); }
  }
  if (path === '/drive') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = await getDrive(fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    } catch (e) { return json(502, 'drive_unavailable', origin, env); }
  }
  if (path === '/busy') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = await getStoreBusy(fetchImpl);
      const body = data && data.level ? { basis: data.basis, level: data.level } : {};
      return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    } catch (e) { return json(502, 'busy_unavailable', origin, env); }
  }
  if (path === '/news') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = await getLocalNews(env, fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      return json(502, 'news_unavailable', origin, env);
    }
  }
  if (path === '/blogs') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = await getBlogs(env, fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      return json(502, 'blogs_unavailable', origin, env);
    }
  }
  if (path === '/podcasts') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = await getPodcasts(env, fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      return json(502, 'podcasts_unavailable', origin, env);
    }
  }
  if (path === '/sarah') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = await getSarah(env, fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      return json(502, 'sarah_unavailable', origin, env);
    }
  }
  if (path === '/sarah/seen') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body = {};
    try {
      const raw = await request.text();
      if (raw.length > 80) throw new Error('big');
      body = raw ? JSON.parse(raw) : {};
    } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const data = await markSarahSeen(env, body && body.id);
      return new Response(JSON.stringify({ ok: true, announced: data.announced || '' }), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      return json(400, 'bad_request', origin, env);
    }
  }
  if (path === '/videos') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try {
      const raw = await request.text();
      if (raw.length > 512) throw new Error('big');
      body = raw ? JSON.parse(raw) : {};
    } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const data = await searchVideos(body && body.q, fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      const code = e.message === 'bad_query' ? 'bad_query' : 'videos_unavailable';
      return json(code === 'bad_query' ? 400 : 502, code, origin, env);
    }
  }
  if (path === '/shared-todo') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try { const raw = await request.text(); if (raw.length > 400000) return json(413, 'too_large', origin, env); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const [status, data] = await sharedTodoRoute(body, env);
      if (data && data.error) return json(status, data.error, origin, env);
      return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) { return json(502, 'shared_unavailable', origin, env); }
  }
  if (path === '/sync') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try {
      const len = Number(request.headers.get('content-length') || 0);
      if (len > 2500000) return json(413, 'sync_too_large', origin, env);
      const raw = await request.text();
      if (raw.length > 2500000) return json(413, 'sync_too_large', origin, env);
      body = raw ? JSON.parse(raw) : {};
    } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const [status, data] = await syncRoute(body, env);
      if (data && data.error) return json(status, data.error, origin, env);
      return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      return json(502, 'sync_unavailable', origin, env);
    }
  }
  if (path.startsWith('/sunshine/')) {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body = {};
    try { const raw = await request.text(); if (raw.length > 4096) throw new Error('big'); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    const [status, data] = await sunshineRoute(path, body, env, fetchImpl);
    return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
  }
  if (path.startsWith('/push/')) {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body = {};
    try { const raw = await request.text(); const cap = path === '/push/reminders' ? 32768 : 4096; if (raw.length > cap) throw new Error('big'); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    const [status, data] = await pushRoute(path, body, env, fetchImpl);
    return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
  }
  if (path === '/mail/config') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    return new Response(JSON.stringify(mailConfig(env)), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
  }
  if (path === '/mail/token') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try {
      const raw = await request.text();
      if (raw.length > 12000) throw new Error('big');
      body = raw ? JSON.parse(raw) : {};
    } catch (e) { return json(400, 'bad_request', origin, env); }
    const out = await exchangeMail(env, body, fetchImpl);
    return new Response(JSON.stringify(out.data), { status: out.status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
  }
  if (path !== '/fetch') return json(404, 'not_found_route', origin, env);
  if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
  if (!okOrigin) return json(403, 'forbidden_origin', origin, env);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096) throw new Error('big');
    body = JSON.parse(raw);
  } catch (e) { return json(400, 'bad_request', origin, env); }

  let u;
  try { u = checkUrl(body && body.url); } catch (e) { return json(STATUS[e.message] || 400, e.message, origin, env); }

  try {
    const feed = await fetchFeed(u, fetchImpl);
    const h = { ...corsHeaders(origin, env), 'Content-Type': 'text/calendar; charset=utf-8', 'X-Feed-Status': 'ok' };
    if (feed.lastModified) h['Last-Modified'] = feed.lastModified;
    if (feed.etag) h['ETag'] = feed.etag;
    return new Response(feed.text, { status: 200, headers: h });
  } catch (e) {
    const code = STATUS[e.message] ? e.message : 'upstream_error';
    return json(STATUS[code], code, origin, env);
  }
}

// ---- Weather fallback (Open-Meteo, Whangārei, fixed) ----
export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-35.7251&longitude=174.3237' +
  '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation' +
  '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,is_day' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,precipitation_sum,wind_gusts_10m_max,sunrise,sunset' +
  '&timezone=Pacific%2FAuckland&forecast_days=7&forecast_hours=48&wind_speed_unit=kmh'; // same fields as the app (v1.9.0 adds hourly)
const WEATHER_TTL = 20 * 60 * 1000;
let wxMem = null;
export async function getWeather(env = {}, fetchImpl = fetch, now = Date.now()) {
  if (wxMem && now - wxMem.at < WEATHER_TTL) return wxMem.data;
  if (env.EVENTS_KV) {
    try { const c = await env.EVENTS_KV.get('weather-v3', { type: 'json' }); if (c && now - c.at < WEATHER_TTL) { wxMem = c; return c.data; } } catch (e) { }
  }
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
  let data;
  try {
    const r = await fetchImpl(WEATHER_URL, { headers: { 'Accept': 'application/json', 'User-Agent': 'DueDatesApp/1.0' }, signal: ctl.signal });
    if (!r.ok) throw new Error('upstream');
    data = await r.json();
  } finally { clearTimeout(t); }
  if (!data || !data.current || !data.daily || !Array.isArray(data.daily.time)) throw new Error('bad_weather');
  wxMem = { at: now, data };
  if (env.EVENTS_KV) { try { await env.EVENTS_KV.put('weather-v3', JSON.stringify(wxMem), { expirationTtl: 3600 }); } catch (e) { } }
  return data;
}
export function resetWeather() { wxMem = null; }
