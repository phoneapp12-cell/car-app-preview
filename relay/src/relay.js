
const RADIO_STREAMS = [
  ['Beagle Radio', 'https://stream.beagleradio.co.nz/stream'],
  ['The Hits', 'https://playerservices.streamtheworld.com/api/livestream-redirect/NZME_74AAC.aac'],
  ['The Rock', 'https://digitalstreams.mediaworks.nz/rock_net_icy'],
  ['The Breeze', 'https://mediaworks.streamguys1.com/breeze_net_icy'],
  ['More FM', 'https://mediaworks.streamguys1.com/more-whg-high_icy'],
  ['Breeze Classic', 'https://mediaworks.streamguys1.com/breeze_classic_net_icy'],
  ['Radio Hauraki', 'https://playerservices.streamtheworld.com/api/livestream-redirect/NZME_04AAC.aac'],
  ['The Edge', 'https://mediaworks.streamguys1.com/edge_net_icy'],
  ['ZM', 'https://playerservices.streamtheworld.com/api/livestream-redirect/NZME_03AAC.aac'],
  ['iHeartCountry', 'https://playerservices.streamtheworld.com/api/livestream-redirect/NZME_09AAC.aac'],
  ['Coast', 'https://playerservices.streamtheworld.com/api/livestream-redirect/NZME_07AAC.aac'],
  ['The Sound', 'https://digitalstreams.mediaworks.nz/sound_net_icy'],
  ['Life FM', 'https://rhema-radio.streamguys1.com/rhema-lifefm.aac'],
  ['Ngāti Hine FM', 'https://icast1.streamcom.net/NgatiHine'],
  ['RNZ Concert', 'https://stream-ice.radionz.co.nz/concert.mp3'],
  ['RNZ National', 'https://stream-ice.radionz.co.nz/national.mp3'],
  ['PMN 531pi', 'https://18243.live.streamtheworld.com/531PI_SC'],
  ['Flava', 'https://playerservices.streamtheworld.com/api/livestream-redirect/NZME_08AAC.aac'],
  ['Mai FM', 'https://mediaworks.streamguys1.com/mai_net_icy'],
  ['The Generator', 'https://s1.myradiostream.com/14268/stream/1/'],
  ['Rhema', 'https://rhema-radio.streamguys1.com/rhema.aac'],
  ['Newstalk ZB', 'https://playerservices.streamtheworld.com/api/livestream-redirect/NZME_01AAC.aac']
];
function cleanIcyText(raw) {
  return String(raw || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/`+/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
function parseRadioStreamMeta(metaStr, stationName) {
  const m = String(metaStr || '').match(/StreamTitle='([^']*)'/i);
  const u = String(metaStr || '').match(/StreamUrl='([^']*)'/i);
  let raw = cleanIcyText(m ? m[1] : '');
  let cover = '';
  if (u && u[1]) {
    const pic = u[1].match(/[?&]picture=([^&]+)/i);
    if (pic && /^https:\/\//i.test(pic[1])) cover = pic[1];
  }
  if (!raw || /^\d+:\d+/.test(raw) || /^(ad|commercial|spot|promo|station|welcome|live|stream)$/i.test(raw)) {
    return { ok: true, station: stationName, title: '', artist: '', raw: '', cover: '' };
  }
  const parts = raw.split(' - ').map(x => x.trim()).filter(Boolean);
  let artist = '', title = '';
  if (parts.length >= 4 && parts[0].toLowerCase() === parts[2].toLowerCase() && parts[1].toLowerCase() === parts[3].toLowerCase()) {
    artist = parts[0];
    title = parts[1];
  } else if (parts.length >= 2) {
    artist = parts[0];
    title = parts.slice(1).join(' - ');
    if (title.toLowerCase().endsWith((' - ' + artist + ' - ' + title.split(' - ')[0]).toLowerCase())) {
      title = title.split(' - ')[0];
    }
  } else {
    title = raw;
  }
  if (/^(more fm|the breeze|the sound|the rock|the edge|mai fm|coast|zm|the hits|radio hauraki|newstalk zb|flava)$/i.test(artist) && (!title || title.toLowerCase() === artist.toLowerCase())) {
    return { ok: true, station: stationName, title: '', artist: '', raw: '', cover: '' };
  }
  return { ok: true, station: stationName, title: title.slice(0, 120), artist: artist.slice(0, 120), raw: (artist && title ? artist + ' – ' + title : raw).slice(0, 200), cover };
}
async function getRadioNow(idx, fetchImpl = fetch) {
  const entry = RADIO_STREAMS[idx];
  if (!entry) return { ok: false, error: 'bad_station' };
  const [stationName, streamUrl] = entry;
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetchImpl(streamUrl, { headers: { 'Icy-MetaData': '1', 'User-Agent': 'Mozilla/5.0 (compatible; ShaneCarStereo/1.0)' }, signal: ctl.signal });
    const metaint = +(r.headers.get('icy-metaint') || 0);
    if (!metaint || metaint > 65536 || !r.body) {
      if (r.body) try { r.body.cancel(); } catch (e) { }
      return { ok: true, station: stationName, title: '', artist: '', raw: '', cover: '' };
    }
    const reader = r.body.getReader();
    let buf = new Uint8Array(0);
    while (buf.length < metaint + 512) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      const next = new Uint8Array(buf.length + value.length);
      next.set(buf); next.set(value, buf.length);
      buf = next;
    }
    try { reader.cancel(); } catch (e) { }
    if (buf.length <= metaint) return { ok: true, station: stationName, title: '', artist: '', raw: '', cover: '' };
    const len = buf[metaint] * 16;
    const metaStr = len > 0 ? new TextDecoder().decode(buf.slice(metaint + 1, metaint + 1 + len)).replace(/\0+$/, '') : '';
    return parseRadioStreamMeta(metaStr, stationName);
  } catch (e) {
    return { ok: true, station: stationName, title: '', artist: '', raw: '', cover: '' };
  } finally {
    clearTimeout(tm);
  }
}

import { renoRoute } from './reno.js';
import { carsAlexaRoute } from './cars-alexa.js';
import { sharedTodoRoute, sharedCarRoute, sharedPhotoRoute } from './shared-todo.js';
import { sharedPushRoute } from './shop-notify.js';
import { brandsRoute } from './brands.js';
import { pricesRoute, mhPricesRoute } from './prices.js';
import { primeRoute } from './prime.js';
import { getTides } from './tides.js';
import { getTraffic } from './traffic.js';
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
import { getClosures, getRoadClosures } from './closures.js';
import { getCouncilRoadworks } from './roadworks.js';
import { getBridgeTraffic } from './bridge-traffic.js';
import { getDrive } from './drive.js';
import { getStoreBusy } from './busy.js';
import { getLocalNews, ogImage, articleFromUrl, recipeFromUrl } from './news.js';
import { dvrRoute } from './livetv.js';
import { getPowerDoc, refreshSolarZero } from './solarzero.js';
import { getPlanning } from './planning.js';
import { getBlogs } from './blogs.js';
import { getRecs } from './recs.js';
import { getPodcasts } from './podcasts.js';
import { pushRoute } from './push.js';
import { sunshineRoute } from './sunshine.js';
import { remindersRoute } from './sarah-notify.js';
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
  planning_unavailable: 'Planning updates could not be loaded right now.',
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
    h['Access-Control-Allow-Headers'] = 'Content-Type, X-Cash-Key';
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

import { hueRoute } from './hue.js';
import { akahuRoute } from './akahu.js';
import { healthRoute } from './health.js';
import { smsRoute } from './sms.js';
import { moveRoute, oldOriginRetired } from './move.js';
import { sharedAuth, pairRoute, SHARED_RE } from './pair.js';
import { appOk } from './health.js';
import { allow, blocked, fail } from './ratelimit.js';
import { sha as sha256b64, eq as ctEq, seal as sealMe, open as openMe } from './akahu.js';
import { smsPushNow } from './push.js';
import { heatRoute } from './heat.js';
import { alarmRoute } from './alarm.js';
import { fuelRoute } from './fuel.js';
import { getOutages, runOutages } from './outages.js';
import { getCrashes, runCrashes } from './crashes.js';
// 2.27.45: routes that take a key in the body or header get a per-IP limit on wrong keys (30 an hour).
const KEYED_RE = /^\/(cars\/alexa|shared-todo|shared-photo|shared-car|reno|sync|sunshine\/|shared-push\/|brands|prices|pair\/redeem)/;
export async function handle(request, env = {}, fetchImpl = fetch) {
  const p0 = new URL(request.url).pathname.replace(/\/+$/, '') || '/', keyed = KEYED_RE.test(p0) && request.method !== 'OPTIONS';
  if (keyed && await blocked('key', request, 30, 3600)) return json(429, 'rate_limited', request.headers.get('Origin') || '', env);
  const res = await handleInner(request, env, fetchImpl);
  if (keyed && (res.status === 401 || res.status === 403 || res.status === 404) && !res.headers.get('X-Key-Retired')) { try { // 404 = no record for that key (a guess)
    await fail('key', request, 3600); } catch (e) { } }
  return res;
}
const PRIVATE_RE = /^\/(cashflow|akahu\/|health\/(?!upload)|sms\/(list|key|test|clear|revoke)|power$|ai(\/|$)|sarah\/seen$|push\/|shared-push\/|sync$|me$|pair\/(shane|code|cancel|unlink|status)$|alarm\/|hue\/|heat\/|cars\/alexa|move\/start|move\/put)/;
const devKeyOk = async (env, request) => { try { return await appOk(env, request); } catch (e) { return false; } };
async function handleInner(request, env = {}, fetchImpl = fetch) {
  const origin = request.headers.get('Origin') || '';
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const okOrigin = allowedOrigins(env).includes(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: okOrigin ? 204 : 403, headers: corsHeaders(origin, env) });
  }
  // 2.27.46: once My App has moved to its own address (plus 3 days' grace), the shared github.io address can no longer
  // use My App's private routes. Sarah's To-do, Monique's Helper and Millesha's page keep their own routes.
  if (PRIVATE_RE.test(path) && await oldOriginRetired(env, origin)) return json(403, 'forbidden_origin', origin, env);
  if (path.startsWith('/pair/')) { // 2.27.48: per-device shared-list keys
    if (path === '/pair/redeem' && !(await allow('pair', request, 20, 3600))) return json(429, 'rate_limited', origin, env);
    let st = 500, data = { error: 'pair_failed' };
    try { [st, data] = await pairRoute(path, request, env, okOrigin); } catch (e) { }
    return new Response(JSON.stringify(data), { status: st, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
  }
  // 2.27.48: shared-list routes take a per-device key (or the old key during the grace period); swap it for the internal list id
  if (SHARED_RE.test(path) && request.method === 'POST' && env.SHARED_NS) {
    let raw = '', body = null; try { raw = await request.text(); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    if (body && typeof body === 'object' && typeof body.key === 'string' && body.key) {
      const a = await sharedAuth(env, body.key);
      if (!a.ok) return new Response(JSON.stringify({ error: a.retired ? 'key_retired' : 'bad_key' }), { status: 403, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', ...(a.retired ? { 'X-Key-Retired': '1' } : {}) } }); // a retired old key isn't a guess, so it doesn't count toward the lockout
      body.key = env.SHARED_NS; raw = JSON.stringify(body);
    }
    request = new Request(request.url, { method: 'POST', headers: request.headers, body: raw });
  }
  if (path === '/me') { // 2.27.47: Shane's private profile (addresses, family, health notes) for My App; sealed in KV, device key only
    if (request.method !== 'GET') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    if (!(await devKeyOk(env, request))) return json(401, 'no_key', origin, env);
    const kv = env.EVENTS_KV; let me = null;
    try { me = await openMe(env, await kv.get('me-v1')); } catch (e) { me = null; }
    if (!me) { const p = await kv.get('me-plain-v1'); if (p) { try { me = JSON.parse(p); await kv.put('me-v1', await sealMe(env, me)); await kv.delete('me-plain-v1'); } catch (e) { } } }
    if (!me) return json(404, 'not_found', origin, env);
    return new Response(JSON.stringify({ me }), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
  }
  if (path.startsWith('/move/')) {
    if (!(await allow('move', request, 120, 3600))) return json(429, 'rate_limited', origin, env);
    let st = 500, data = { error: 'move_failed' };
    try { [st, data] = await moveRoute(path, request, env, origin); } catch (e) { }
    return new Response(JSON.stringify(data), { status: st, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
  }
  if (path.startsWith('/alarm/')) {
    try { return await alarmRoute(path, request, env, fetchImpl, okOrigin, (status, data) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })); }
    catch (e) { return new Response(JSON.stringify({ error: 'alarm_unavailable' }), { status: 502, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json' } }); }
  }
  if (path.startsWith('/heat/')) {
    try { return await heatRoute(path, request, env, fetchImpl, okOrigin, (status, data) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })); }
    catch (e) { return json(502, 'heat_unavailable', origin, env); }
  }
  if (path.startsWith('/hue/')) { // 2.23.79: Philips Hue
    try { return await hueRoute(path, request, env, fetchImpl, okOrigin, (status, data) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })); }
    catch (e) { return json(502, 'hue_unavailable', origin, env); }
  }
  if (path === '/crashes') { // 2.27.67 / 2.28.18: NZTA crashes, Whangārei Police/emergency updates, and GeoNet/USGS large earthquakes
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try { let d = await getCrashes(env); if (!d || !Array.isArray(d.quakes)) d = await runCrashes(env, fetchImpl, Date.now(), true); return new Response(JSON.stringify(d || { active: [], cleared: [], police: [], quakes: [] }), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
    catch (e) { return json(502, 'crashes_unavailable', origin, env); }
  }
  if (path === '/outages') { // 2.27.40: Northpower outages (current, planned, recently restored)
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try { let d = await getOutages(env); if (!d) d = await runOutages(env, fetchImpl, Date.now(), true); return new Response(JSON.stringify(d || { planned: [], unplanned: [], restored: [] }), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
    catch (e) { return json(502, 'outages_unavailable', origin, env); }
  }
  if (path === '/fuel') { // 2.27.36: Marsden Point terminal gate prices (BP and Z public lists), 30 days
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try { const data = await fuelRoute(env, fetchImpl); return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
    catch (e) { return json(502, 'fuel_unavailable', origin, env); }
  }
  if (path === '/' || path === '/health') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return json(405, 'method_not_allowed', origin, env);
    if (path === '/health' || okOrigin) {
      return new Response(JSON.stringify({ ok: true, service: 'due-dates-calendar-relay' }), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    }
    return new Response('Due Dates calendar link service is running. It only answers requests from the Due Dates app.\n', { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (path === '/events' || path === '/concerts' || path === '/weather' || path === '/closures' || path === '/road-closures' || path === '/roadworks' || path === '/bridge-traffic') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = path === '/events' ? await getFeed(env, fetchImpl) : path === '/concerts' ? await getConcerts(env, fetchImpl) : path === '/closures' ? await getClosures(env, fetchImpl) : path === '/road-closures' ? await getRoadClosures(env, fetchImpl) : path === '/roadworks' ? await getCouncilRoadworks(env, fetchImpl) : path === '/bridge-traffic' ? await getBridgeTraffic(fetchImpl) : await getWeather(env, fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) {
      const code = path === '/events' || path === '/concerts' ? 'events_unavailable' : path === '/closures' || path === '/road-closures' ? 'closures_unavailable' : path === '/roadworks' ? 'roadworks_unavailable' : path === '/bridge-traffic' ? 'bridge_traffic_unavailable' : 'weather_unavailable';
      return json(502, code, origin, env);
    }
  }
  if (path === '/ai/ask' || path === '/ai/reply') {
    if (request.method !== 'POST') return json(405, 'post_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    if (!(await devKeyOk(env, request))) return json(401, 'no_key', origin, env); // 2.27.45: My App's device key
    if (!(await allow('ai', request, 60, 3600))) return json(429, 'rate_limited', origin, env);
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
    if (!(await devKeyOk(env, request))) return json(401, 'no_key', origin, env);
    if (!(await allow('ai', request, 60, 3600))) return json(429, 'rate_limited', origin, env);
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
      const data = await getDrive(fetchImpl, env);
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
  if (path === '/planning') { // 2.27.83: planning & development updates (planning.js). Fixed sources, no input.
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try {
      const data = await getPlanning(env, fetchImpl);
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) { return json(502, 'planning_unavailable', origin, env); }
  }
  if (path === '/recipe') { // 2.28.1: recipe from a website link
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let u = ''; try { const x = new URL(new URL(request.url).searchParams.get('u') || ''); if (/^https?:$/.test(x.protocol) && !/^(localhost|[\d.]+|\[)/.test(x.hostname) && !/\.(local|internal)$/.test(x.hostname)) u = x.toString(); } catch (e) { }
    if (!u) return json(400, 'bad_url', origin, env);
    let d; try { d = await recipeFromUrl(u, fetchImpl); } catch (e) { d = { error: 'fetch_failed' }; }
    return new Response(JSON.stringify(d), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  }
  if (path === '/article' || path === '/news-article') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let u = '';
    try {
      const sp = new URL(request.url).searchParams;
      const x = new URL(sp.get('u') || sp.get('url') || '');
      if (x.protocol === 'https:' && !/^(localhost|[\d.]+|\[)/.test(x.hostname)) u = x.toString();
    } catch (e) {}
    if (!u) return json(400, 'bad_url', origin, env);
    const data = await articleFromUrl(u, env, fetchImpl);
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  }
  if (path === '/livetv-dvr' || path.startsWith('/livetv-recording/')) {
    if (!okOrigin && !path.startsWith('/livetv-recording/')) return json(403, 'forbidden_origin', origin, env);
    const [st, body, ctype] = await dvrRoute(path, request, env, fetchImpl);
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(payload, { status: st, headers: { ...corsHeaders(origin || 'https://shane-my-app.pages.dev', env), 'Access-Control-Allow-Origin': '*', 'Content-Type': ctype || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  if (path === '/ogimg') { // 2.27.94: link-preview picture for a recipe link (robots.txt respected, KV cached 7 days)
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let u = ''; try { const x = new URL(new URL(request.url).searchParams.get('u') || ''); if (x.protocol === 'https:' && !/^(localhost|[\d.]+|\[)/.test(x.hostname)) u = x.toString(); } catch (e) { }
    const img = u ? await ogImage(u, env, fetchImpl) : '';
    return new Response(JSON.stringify({ img }), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
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
  if (path === '/radio-now') {
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    const idx = parseInt(new URL(request.url).searchParams.get('i') || '0', 10);
    const data = await getRadioNow(idx, fetchImpl);
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
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
    if (!(await devKeyOk(env, request))) return json(401, 'no_key', origin, env);
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
  if (path === '/traffic') { // 2.26.0: NZTA highway events near Whangārei, Cache API only
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try { const data = await getTraffic(fetchImpl); return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
    catch (e) { return json(502, 'traffic_unavailable', origin, env); }
  }
  if (path === '/tides') { // 2.26.0: LINZ tides for Whangārei, Cache API only
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try { const data = await getTides(fetchImpl); return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=21600' } }); }
    catch (e) { return json(502, 'tides_unavailable', origin, env); }
  }
  if (path === '/recs') { // 2.27.3: Top 40 new entries, top-rated PC/Switch games, topic blogs, world news (12 h cache)
    if (request.method !== 'GET') return json(405, 'get_only', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try { const data = await getRecs(new URL(request.url).searchParams.get('k'), env, fetchImpl); return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }); }
    catch (e) { return json(e.message === 'bad_kind' ? 400 : 502, 'recs_unavailable', origin, env); }
  }
  if (path === '/prime') {
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try { const data = await primeRoute(env, fetchImpl); return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }); }
    catch (e) { return json(502, 'prime_unavailable', origin, env); }
  }
  if (path === '/mh-prices') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try { const raw = await request.text(); if (raw.length > 2048) return json(413, 'too_large', origin, env); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const [status, data] = await mhPricesRoute(body, request.headers.get('cf-connecting-ip'), fetchImpl);
      return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) { return json(502, 'prices_unavailable', origin, env); }
  }
  if (path === '/prices') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try { const raw = await request.text(); if (raw.length > 8192) return json(413, 'too_large', origin, env); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const [status, data] = await pricesRoute(body, env, fetchImpl);
      if (data && data.error) return json(status, data.error, origin, env);
      return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) { return json(502, 'prices_unavailable', origin, env); }
  }
  if (path === '/brands') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try { const raw = await request.text(); if (raw.length > 1024) return json(413, 'too_large', origin, env); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const [status, data] = await brandsRoute(body, env, fetchImpl);
      if (data && data.error) return json(status, data.error, origin, env);
      return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) { return json(502, 'brands_unavailable', origin, env); }
  }
  if (path === '/shared-photo') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try { const raw = await request.text(); if (raw.length > 460000) return json(413, 'too_large', origin, env); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const [status, data] = await sharedPhotoRoute(body, env);
      if (data && data.error) return json(status, data.error, origin, env);
      return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) { return json(502, 'shared_unavailable', origin, env); }
  }
  if (path === '/shared-car') {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try { const raw = await request.text(); if (raw.length > 2048) return json(413, 'too_large', origin, env); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const [status, data] = await sharedCarRoute(body, env);
      if (data && data.error) return json(status, data.error, origin, env);
      return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) { return json(502, 'shared_unavailable', origin, env); }
  }
  if (path.startsWith('/sms/')) { // 2.27.44: appointment and delivery texts (forwarder app posts with its key; My App reads with its device key)
    const H = { ...corsHeaders(origin, env), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    try { const [status, data] = await smsRoute(path, request, env, okOrigin, smsPushNow); return new Response(JSON.stringify(data), { status, headers: H }); }
    catch (e) { return json(502, 'sms_unavailable', origin, env); }
  }
  if (path.startsWith('/health/')) { // 2.26.95: Huawei watch sync (webhook app posts with its sync code; My App reads with its device key)
    const H = { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
    try { const [status, data] = await healthRoute(path, request, env, okOrigin); return new Response(JSON.stringify(data), { status, headers: H }); }
    catch (e) { return new Response(JSON.stringify({ error: 'health_failed' }), { status: 502, headers: H }); }
  }
  if (path === '/cashflow' || path.startsWith('/cashflow/') || path.startsWith('/akahu/')) { // 2.26.57: Akahu cash flow (app origin + device key)
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    try { const [status, data] = await akahuRoute(path, request, env, fetchImpl); return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
    catch (e) { return new Response(JSON.stringify({ error: 'cashflow_failed', detail: String(e && e.name || 'Error').slice(0, 40) }), { status: 502, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json' } }); }
  }
  if (path === '/power') { // 2.26.39: SolarZero power figures pushed from the box
    const H = { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
    if (request.method === 'GET') {
      if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
      if (!(await devKeyOk(env, request))) return json(401, 'no_key', origin, env); // 2.27.45: home power figures need the device key
      const wantRefresh = new URL(request.url).searchParams.get('refresh') === '1';
      let doc = await getPowerDoc(env);
      const ageMs = doc && doc.updatedAt ? (Date.now() - Date.parse(doc.updatedAt)) : Infinity;
      if (wantRefresh || ageMs > 25 * 60e3) {
        try { doc = await refreshSolarZero(env, fetchImpl, Date.now()); } catch (e) {}
      }
      return new Response(JSON.stringify(doc || {}), { status: 200, headers: H });
    }
    if (request.method !== 'PUT' && request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    const tok = env.POWER_WRITE_TOKEN || '';
    const got = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!(await allow('power-put', request, 120, 3600))) return json(429, 'rate_limited', origin, env);
    if (!tok || !got || got.length > 400 || !ctEq(await sha256b64(got), await sha256b64(tok))) return json(401, 'unauthorised', origin, env); // 2.27.45: hashed, constant-time
    let body; try { const raw = await request.text(); if (raw.length > 20000) return json(413, 'too_large', origin, env); body = JSON.parse(raw); } catch (e) { return json(400, 'bad_request', origin, env); }
    if (!body || typeof body !== 'object' || !body.updatedAt) return json(400, 'bad_request', origin, env);
    await env.EVENTS_KV.put('power-v1', JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: H });
  }
  if (path === '/cars/alexa') { // E1: car dates for the Alexa skill. Writes need the app's Origin; the skill reads with the key alone.
    const H = { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
    const m = request.method; let key = request.headers.get('X-Cars-Key') || '', body = null;
    // 2.27.45: the key goes in the X-Cars-Key header. ?k= is still accepted until 30 Nov 2026 so the Echo doesn't break.
    if (m === 'GET') { if (!key && Date.now() < Date.parse('2026-11-30T00:00:00+13:00')) key = new URL(request.url).searchParams.get('k') || ''; }
    else if (m === 'PUT' || m === 'POST' || m === 'DELETE') {
      if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
      try { const raw = await request.text(); if (raw.length > 20000) return json(413, 'too_large', origin, env); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
      key = key || (body && body.key) || '';
    } else return json(405, 'method_not_allowed', origin, env);
    try { const [status, data] = await carsAlexaRoute(m !== 'GET' && body && body.off ? 'DELETE' : m, key, body, env); return new Response(JSON.stringify(data), { status, headers: H }); }
    catch (e) { return json(502, 'cars_unavailable', origin, env); }
  }
  if (path === '/reno') { // 2.26.25: Millesha's Renovation (own key, own list)
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body;
    try { const raw = await request.text(); if (raw.length > 120000) return json(413, 'too_large', origin, env); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    try {
      const [status, data] = await renoRoute(body, env);
      if (data && data.error) return json(status, data.error, origin, env);
      return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (e) { return json(502, 'reno_unavailable', origin, env); }
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
  if (path.startsWith('/shared-push/')) {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body = {};
    try { const raw = await request.text(); if (raw.length > 4096) throw new Error('big'); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    const [status, data] = await sharedPushRoute(path, body, env, Date.now(), path === '/shared-push/subscribe' ? await devKeyOk(env, request) : false);
    return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
  }
  if (path.startsWith('/sunshine/')) {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body = {};
    try { const raw = await request.text(); if (raw.length > (path === '/sunshine/reminders' ? 32768 : 4096)) throw new Error('big'); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    const [status, data] = path === '/sunshine/reminders' ? await remindersRoute(body, env) : await sunshineRoute(path, body, env, fetchImpl);
    return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' } });
  }
  if (path.startsWith('/push/')) {
    if (request.method !== 'POST') return json(405, 'method_not_allowed', origin, env);
    if (!okOrigin) return json(403, 'forbidden_origin', origin, env);
    let body = {};
    try { const raw = await request.text(); const cap = path === '/push/reminders' ? 32768 : 4096; if (raw.length > cap) throw new Error('big'); body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(400, 'bad_request', origin, env); }
    if (path === '/push/reminders' && body && body.sms === 'on' && !(await devKeyOk(env, request))) body.sms = 'off'; // 2.27.45: SMS pushes need the device key
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
  if (!(await allow('fetch', request, 240, 3600))) return json(429, 'rate_limited', origin, env); // 2.27.45

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
