/* 2.27.44: text messages from Shane's phone. An SMS forwarder app (SMS to URL Forwarder, F-Droid) POSTs each incoming text
   to /sms/in with his forwarding key (?k=… or 'Authorization: Bearer …'). Only two kinds are kept:
   (A) appointment and booking texts and (B) delivery and parcel texts. Anything that looks like a code (OTP, verification,
   PIN, 'code is', or a 4–8 digit number next to bank or login words) is dropped first and never stored, and so is every
   other text. Kept (encrypted, 14 days): sender, a short summary, a parsed date/time, carrier/status/tracking, received time.
   The key is made here for My App (which proves itself with its device key); only its SHA-256 hash is kept. */
import { sha, seal, open, eq, b64url, rate } from './akahu.js';
import { appOk } from './health.js';
const K_CRED = 'sms-cred-v1', K_DATA = 'sms-v1', KEEP = 14 * 864e5, MAX_BODY = 8000;

// ---- code filter: true means drop it, unread and unstored ----
const CODE_WORDS = /\b(otp|one[- ]?time|verification|verify|verif|passcode|pass code|pin|security code|auth(entication|orisation|orization)?\s*code|login code|log ?in code|sign[- ]?in code|access code|2fa|two[- ]factor|code is|your code|use code|enter code|confirmation code|reset code)\b/i;
const BANK_WORDS = /\b(bank|asb|anz|bnz|westpac|kiwibank|tsb|rabobank|co-?operative bank|heartland|card|account|acct|login|log in|logon|sign in|signin|password|transaction|payment|transfer|approve|authori[sz]e|netguard|wallet|paypal|apple pay|google pay|ird|myir|realme)\b/i;
export function looksLikeCode(text) {
  const t = String(text || '');
  if (CODE_WORDS.test(t)) return true;
  if (/\b\d{4,8}\b/.test(t.replace(/\b\d{1,2}[:.]\d{2}\b/g, ' ')) && BANK_WORDS.test(t)) return true;
  if (/\b(code|pin)\b[^\n]{0,20}\b[A-Z0-9]{4,8}\b/i.test(t)) return true;
  return false;
}

// ---- classifier ----
const CARRIERS = [['NZ Post', /\bnz ?post\b|nzpost/i], ['CourierPost', /courier ?post/i], ['Aramex', /\baramex\b|fastway/i], ['DHL', /\bdhl\b/i], ['NZ Couriers', /nz ?couriers/i],
  ['Post Haste', /post ?haste/i], ['PBT', /\bpbt\b/i], ['Mainfreight', /mainfreight|owens/i], ['Castle Parcels', /castle parcels/i], ['FedEx', /\bfed ?ex\b/i], ['UPS', /\bups\b/i], ['Team Global Express', /team global|\btge\b|\btoll\b/i], ['Parcel Pod', /parcel ?pod/i], ['Pace', /\bpace couriers?\b/i]];
const PARCEL_WORDS = /\b(parcel|package|courier|delivery|delivered|deliver(ing)?|shipment|shipped|dispatched|out for delivery|on its way|tracking|track your|ready (for|to) (collect|pick ?up)|collect(ion)? point|parcel locker|signature required|failed delivery|attempted)\b/i;
const APPT_WORDS = /\b(appointment|appt|booking|booked|reservation|consult(ation)?|check-?up|recall|wof|warrant of fitness|car service|service booking|dentist|dental|hygienist|doctor|\bdr\b|gp|medical (centre|center|practice)|health ?centre|clinic|physio|physiotherap|optometrist|eye test|podiatr|chiro|vet|vaccin|immuni[sz]ation|blood test|lab ?test|x-?ray|specialist|hospital|haircut|hair ?dresser|barber|salon|massage|tyres?|mechanic|garage)\b/i;
const APPT_CONFIRM = /\b(you have|your|is (booked|confirmed|scheduled)|see you|reply (y|yes|c)|to confirm|to cancel|confirm|scheduled|due)\b/i;
const CARRIER_HOSTS = /^(?:[a-z0-9-]+\.)*(nzpost\.co\.nz|courierpost\.co\.nz|aramex\.co\.nz|aramex\.com|dhl\.com|dhl\.co\.nz|nzcouriers\.co\.nz|posthaste\.co\.nz|pbt\.com|mainfreight\.com|castleparcels\.co\.nz|fedex\.com|ups\.com|teamglobalexp\.com|parcelpod\.co\.nz)$/i;
const TRACK_URL = { 'NZ Post': t => 'https://www.nzpost.co.nz/tools/tracking?trackid=' + t, CourierPost: t => 'https://www.nzpost.co.nz/tools/tracking?trackid=' + t, Aramex: t => 'https://www.aramex.co.nz/tools/track?l=' + t, DHL: t => 'https://www.dhl.com/nz-en/home/tracking.html?tracking-id=' + t, 'NZ Couriers': t => 'https://www.nzcouriers.co.nz/track?ticket=' + t };
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const DOW = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const nzDate = ms => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const pad = n => String(n).padStart(2, '0');
const addD = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
// Pure: text + received time -> { date: 'YYYY-MM-DD'|'', time: 'HH:MM'|'' } (NZ day/month order; the year is the next one that fits).
export function parseWhen(text, now = Date.now()) {
  const t = String(text || ''), T = nzDate(now), [ty, tm] = T.split('-').map(Number); let date = '', time = '';
  const fit = (d, m, y) => { if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return ''; let yy = y ? (y < 100 ? 2000 + y : y) : ty; let iso = `${yy}-${pad(m)}-${pad(d)}`; if (!y && iso < addD(T, -1)) iso = `${yy + 1}-${pad(m)}-${pad(d)}`; return iso; };
  let m;
  if ((m = /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/.exec(t)) && !/\d[:.]\d{2}\s*(am|pm)/i.test(m[0])) date = fit(+m[1], +m[2], m[3] ? +m[3] : 0);
  if (!date && (m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?(?:\s+(\d{4}))?/i.exec(t))) date = fit(+m[1], MON[m[2].toLowerCase()], m[3] ? +m[3] : 0);
  if (!date && (m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i.exec(t))) date = fit(+m[2], MON[m[1].toLowerCase()], 0);
  if (!date && /\btoday\b/i.test(t)) date = T;
  if (!date && /\btomorrow\b/i.test(t)) date = addD(T, 1);
  if (!date && (m = /\b(sun|mon|tues?|wed|thur?s?|fri|sat)[a-z]*\b/i.exec(t))) { const want = DOW[m[1].toLowerCase()], cur = new Date(T + 'T12:00:00Z').getUTCDay(); if (want != null) date = addD(T, (want - cur + 7) % 7); }
  if ((m = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i.exec(t))) { let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; if (h < 24 && (!m[2] || +m[2] < 60)) time = `${pad(h)}:${m[2] || '00'}`; }
  else if ((m = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(t))) time = `${pad(+m[1])}:${m[2]}`;
  return { date, time };
}
function parcelInfo(text, from) {
  const t = String(text || ''), blob = from + ' ' + t, carrier = (CARRIERS.find(([, re]) => re.test(blob)) || [''])[0];
  const status = /\bdelivered\b/i.test(t) ? 'Delivered' : /out for delivery|on (the|its) way to you|with (our|the) courier today|arriving today/i.test(t) ? 'Out for delivery' : /ready (for|to) (collect|pick ?up)|collect (it )?from|parcel locker|collection point/i.test(t) ? 'Ready to collect' : /attempted|missed|we tried|couldn.?t deliver|card left/i.test(t) ? 'Delivery attempted' : /dispatched|shipped|on its way|in transit|has been sent/i.test(t) ? 'On its way' : 'Update';
  const urls = (t.match(/https?:\/\/[^\s)]+/gi) || []).map(u => { try { return new URL(u); } catch (e) { return null; } }).filter(Boolean);
  const good = urls.find(u => CARRIER_HOSTS.test(u.hostname)), bad = urls.find(u => !CARRIER_HOSTS.test(u.hostname));
  const scam = !!bad && /\b(pay|fee|customs|duty|redeliver(y)? fee|unpaid|outstanding|update (your )?(address|details)|confirm (your )?(address|details)|held|suspend)/i.test(t);
  const tm = /\b([A-Z]{2}\d{9}[A-Z]{2})\b/.exec(t) || /\b(?=[A-Z0-9]*\d{6})([A-Z0-9]{10,30})\b/.exec(t);
  const tracking = tm ? tm[1] : '';
  const trackUrl = scam ? '' : good ? good.href.slice(0, 300) : tracking && TRACK_URL[carrier] ? TRACK_URL[carrier](encodeURIComponent(tracking)) : '';
  return { carrier: carrier || (from && !/^\+?\d+$/.test(from) ? String(from).slice(0, 30) : ''), status: scam ? 'Possible scam' : status, tracking, trackUrl, scam };
}
const tidy = s => String(s || '').replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
// Pure: one incoming text -> null (dropped) or the small record to keep.
export function classifySms(from, text, now = Date.now()) {
  const f = String(from || '').slice(0, 40).trim(), t = String(text || '').slice(0, 1600);
  if (!t.trim() || looksLikeCode(t)) return null;
  const blob = f + ' ' + t, carrierHit = CARRIERS.some(([, re]) => re.test(blob));
  const at = new Date(now).toISOString(), id = 's' + now.toString(36) + Math.random().toString(36).slice(2, 6);
  if ((carrierHit && PARCEL_WORDS.test(t)) || (PARCEL_WORDS.test(t) && /\b(parcel|package|courier|tracking|delivery)\b/i.test(t) && /\b(your|you)\b/i.test(t))) {
    const p = parcelInfo(t, f);
    return { id, kind: 'parcel', from: f, summary: tidy(t).slice(0, 140), carrier: p.carrier, status: p.status, tracking: p.tracking, trackUrl: p.trackUrl, scam: p.scam, at };
  }
  const w = parseWhen(t, now);
  if (APPT_WORDS.test(t) && (w.date || w.time) && (APPT_CONFIRM.test(t) || /\b(appointment|appt|booking|booked|reservation)\b/i.test(t))) {
    return { id, kind: 'appt', from: f, summary: tidy(t).slice(0, 140), date: w.date, time: w.time, at };
  }
  return null;
}
// Pure: push for a kept text (sms- id, due now).
export function smsReminder(rec, now = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
  const title = rec.kind === 'parcel' ? '📦 ' + (rec.carrier ? rec.carrier + ': ' : 'Delivery: ') + rec.status : '📅 Appointment text from ' + (rec.from || 'unknown');
  return { id: 'sms-' + rec.id.replace(/[^a-z0-9]/gi, '').slice(0, 40), title: title.slice(0, 80), date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, repeat: 'none' };
}

async function getCredS(env) { try { return JSON.parse(await env.EVENTS_KV.get(K_CRED) || 'null'); } catch (e) { return null; } }
async function getList(env) { const d = await open(env, await env.EVENTS_KV.get(K_DATA)); return d && Array.isArray(d.items) ? d : { items: [], lastAt: '', dropped: 0 }; }
const prune = (D, now) => { D.items = D.items.filter(x => now - Date.parse(x.at) < KEEP).slice(-60); return D; };
export async function smsRoute(path, request, env, okOrigin, onKept) {
  if (!env.EVENTS_KV) return [503, { error: 'unavailable' }];
  if (!env.AKAHU_ENC_KEY) return [503, { error: 'not_configured' }];
  const url = new URL(request.url), now = Date.now();
  if (path === '/sms/in' && request.method === 'POST') { // from the forwarder app on the phone (no Origin)
    const auth = request.headers.get('Authorization') || '', key = (/^Bearer\s+(\S+)$/i.exec(auth) || [])[1] || url.searchParams.get('k') || request.headers.get('X-SMS-Key') || '';
    const c = await getCredS(env);
    if (!c || !key || key.length > 200 || !eq(await sha(key), c.keyHash)) { if (!(await rate(env, 'sms-bad', 30, 3600))) return [429, { error: 'rate_limited' }]; return [401, { error: 'unauthorised' }]; }
    const raw = await request.text(); if (raw.length > MAX_BODY) return [413, { error: 'too_large' }];
    let p; try { p = raw ? JSON.parse(raw) : {}; } catch (e) { return [400, { error: 'bad_json' }]; }
    const st = Number(p && (p.receivedStamp || p.sentStamp)), when = st > 1e12 && Math.abs(st - now) < 7 * 864e5 ? st : now;
    const rec = classifySms(p && p.from, p && p.text, when);
    // The text itself is never logged or kept; a dropped one only bumps a counter.
    const D = prune(await getList(env), now); D.lastAt = new Date(now).toISOString();
    if (!rec) { D.dropped = (D.dropped || 0) + 1; await env.EVENTS_KV.put(K_DATA, await seal(env, D)); return [200, { ok: true, kept: false }]; }
    rec.at = new Date(when).toISOString(); D.items.push(rec); await env.EVENTS_KV.put(K_DATA, await seal(env, D));
    if (onKept) { try { await onKept(env, [smsReminder(rec, now)]); } catch (e) { } }
    return [200, { ok: true, kept: true, kind: rec.kind }];
  }
  if (!okOrigin) return [403, { error: 'forbidden_origin' }];
  if (!(await appOk(env, request))) { if (!(await rate(env, 'sms-badkey', 30, 3600))) return [429, { error: 'rate_limited' }]; return [401, { error: request.headers.get('X-Cash-Key') ? 'unauthorised' : 'no_key' }]; }
  const c = await getCredS(env);
  if (path === '/sms/list' && request.method === 'GET') { const D = prune(await getList(env), now); return [200, { connected: !!c, created: c ? c.created : '', lastAt: D.lastAt || '', dropped: D.dropped || 0, items: D.items }]; }
  if (path === '/sms/key' && request.method === 'POST') { // new forwarding key (replaces any old one); shown once in My App
    const key = 'sms_' + b64url(crypto.getRandomValues(new Uint8Array(24)));
    const cred = { keyHash: await sha(key), created: new Date(now).toISOString() }; await env.EVENTS_KV.put(K_CRED, JSON.stringify(cred));
    return [200, { ok: true, key, url: url.origin + '/sms/in', created: cred.created }];
  }
  if (path === '/sms/test' && request.method === 'POST') { // checks the relay end and the filters with sample texts; nothing is kept
    const a = classifySms('NZPost', 'NZ Post: your parcel LN123456789NZ is out for delivery today.', now), b = classifySms('ASB', 'Your ASB code is 482913. Never share it.', now);
    return [200, { ok: !!(c && a && a.kind === 'parcel' && !b), connected: !!c, lastAt: (await getList(env)).lastAt || '' }];
  }
  if (path === '/sms/clear' && request.method === 'POST') { let b = {}; try { b = await request.json(); } catch (e) { } const D = await getList(env); D.items = b && b.id ? D.items.filter(x => x.id !== b.id) : []; await env.EVENTS_KV.put(K_DATA, await seal(env, D)); return [200, { ok: true }]; }
  if (path === '/sms/revoke' && request.method === 'POST') { await env.EVENTS_KV.delete(K_CRED); await env.EVENTS_KV.delete(K_DATA); return [200, { ok: true, connected: false }]; }
  return [404, { error: 'not_found' }];
}
