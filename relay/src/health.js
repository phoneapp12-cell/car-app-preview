/* 2.26.95: Huawei watch sync. Huawei Health -> Health Sync -> Health Connect -> HC Webhook (Android) -> POST /health/in.
   (GET /health stays the relay's plain 'is it running' check.)
   The phone app posts its JSON (docs: github.com/mcnaveen/health-connect-webhook/blob/main/docs/webhook.md) with
   'Authorization: Bearer <sync code>' (or ?token=). The sync code is made here for My App, which proves itself with its
   device key (the same X-Cash-Key as the bank link); only SHA-256 hashes of the code and key are kept.
   Kept: one summary per day (Pacific/Auckland): steps, sleep (start, end, minutes, stages) and heart rate (resting, min,
   max, average), about 400 days, encrypted with AKAHU_ENC_KEY. Raw samples are dropped. A few days of minute-level
   heart-rate buckets and two weeks of sleep sessions are kept only so resent or edited records replace, not add.
   One KV write per delivery. */
import { sha, seal, open, eq, b64url, rate, getCred } from './akahu.js';
const K_CRED = 'health-cred-v1', K_DATA = 'health-data-v1';
const KEEP_DAYS = 400, KEEP_HR = 3, KEEP_SESS = 14, MAX_BODY = 4e6;
const NZ = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function nz(ms) {
  const p = Object.fromEntries(NZ.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}
const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const t = v => { const n = Date.parse(v); return Number.isFinite(n) ? n : NaN; };
const int = v => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : NaN; };
// Health Connect SleepSessionRecord stage constants (0 unknown, 1 awake, 2 sleeping, 3 out of bed, 4 light, 5 deep, 6 REM, 7 awake in bed)
const STAGE = { 1: 'awake', 2: 'asleep', 3: 'awake', 4: 'light', 5: 'deep', 6: 'rem', 7: 'awake' };
function stageName(v) {
  const s = String(v == null ? '' : v).toLowerCase();
  if (STAGE[s]) return STAGE[s];
  if (/rem/.test(s)) return 'rem'; if (/deep/.test(s)) return 'deep'; if (/light/.test(s)) return 'light';
  if (/awake|out_of_bed|out of bed/.test(s)) return 'awake'; if (/sleep/.test(s)) return 'asleep';
  return '';
}
function blank() { return { v: 1, days: {}, sess: {}, hrB: {}, stB: {}, lastAt: '', lastTypes: [], posts: 0 }; }
const day = (D, k) => D.days[k] || (D.days[k] = {});

function sleepSummary(list) {
  const L = Object.values(list || {}).filter(x => x && x.m > 0); if (!L.length) return null;
  const main = L.reduce((a, b) => b.m > a.m ? b : a);
  const asleep = x => x.st ? (x.st.light || 0) + (x.st.deep || 0) + (x.st.rem || 0) + (x.st.asleep || 0) || x.m - (x.st.awake || 0) : x.m;
  const out = { start: new Date(main.s).toISOString(), end: new Date(main.e).toISOString(), bed: main.m, mins: asleep(main), total: L.reduce((n, x) => n + asleep(x), 0), parts: L.length };
  if (main.st) out.stages = main.st;
  return out;
}
function hrSummary(B) {
  const keys = Object.keys(B || {}).map(Number).sort((a, b) => a - b); if (!keys.length) return null;
  let mn = Infinity, mx = -Infinity, sum = 0;
  keys.forEach(k => { const [a, lo, hi] = B[k]; sum += a; if (lo < mn) mn = lo; if (hi > mx) mx = hi; });
  // resting estimate: the lowest average over any 30-minute stretch with at least 3 readings
  let rest = null;
  for (let i = 0, j = 0, s = 0; i < keys.length; i++) {
    while (j < keys.length && keys[j] - keys[i] < 30) { s += B[keys[j]][0]; j++; }
    const n = j - i; if (n >= 3) { const m = s / n; if (rest == null || m < rest) rest = m; }
    s -= B[keys[i]][0];
  }
  return { min: Math.round(mn), max: Math.round(mx), avg: Math.round(sum / keys.length), n: keys.length, restEst: rest == null ? null : Math.round(rest) };
}

// apply one HC Webhook (or Life Dashboard) payload to the stored summaries; returns the types seen
export function applyPayload(D, p, now = Date.now()) {
  const seen = new Set(), touchedHr = new Set(), touchedSl = new Set(), touchedSt = new Set();
  const idOf = r => String((r && r.metadata && r.metadata.id) || (r && r.uuid) || '').slice(0, 80);
  // steps: daily totals (the default 'Daily' resolution) replace; short buckets are summed by their start time
  (Array.isArray(p.steps) ? p.steps : []).slice(0, 5000).forEach(r => {
    const s = t(r.start_time), e = t(r.end_time), c = int(r.count); if (!Number.isFinite(s) || !(c >= 0) || c > 200000) return;
    seen.add('steps'); const z = nz(s), d = day(D, z.date);
    if (Number.isFinite(e) && e - s >= 3 * 3600e3) {
      if (z.min === 0) { d.steps = c; d.stepsFull = 1; } else if (!d.stepsFull) d.steps = Math.max(d.steps || 0, c);
    } else {
      const B = D.stB[z.date] || (D.stB[z.date] = {}); B[String(s) + (r.uuid ? '|' + idOf(r).slice(0, 12) : '')] = c; touchedSt.add(z.date);
    }
    d.stepsAt = new Date(now).toISOString();
  });
  (Array.isArray(p.daily_totals) ? p.daily_totals : []).slice(0, 400).forEach(r => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || '')) || !(int(r.steps) >= 0)) return;
    seen.add('steps'); const d = day(D, r.date); d.steps = int(r.steps); d.stepsFull = 1; d.stepsAt = new Date(now).toISOString();
  });
  touchedSt.forEach(k => { const d = day(D, k); if (!d.stepsFull) d.steps = Object.values(D.stB[k]).reduce((a, b) => a + b, 0); });
  // sleep sessions: kept by record id for two weeks so a resend replaces; filed under the morning they ended
  (Array.isArray(p.sleep) ? p.sleep : []).slice(0, 200).forEach(r => {
    const e = t(r.session_end_time || r.end_time), dur = int(r.duration_seconds);
    const s = Number.isFinite(t(r.start_time)) ? t(r.start_time) : e - dur * 1000;
    if (!Number.isFinite(e) || !Number.isFinite(s) || e <= s || e - s > 20 * 3600e3) return;
    seen.add('sleep'); const k = nz(e).date, id = idOf(r) || String(s);
    let st = null;
    if (Array.isArray(r.stages) && r.stages.length) {
      st = {}; r.stages.slice(0, 2000).forEach(g => { const n = stageName(g.stage); if (!n) return; const sec = Number.isFinite(int(g.duration_seconds)) ? int(g.duration_seconds) : (t(g.end_time) - t(g.start_time)) / 1000; if (sec > 0) st[n] = (st[n] || 0) + sec / 60; });
      Object.keys(st).forEach(n => st[n] = Math.round(st[n])); if (!Object.keys(st).length) st = null;
    }
    Object.keys(D.sess).forEach(dk => { if (D.sess[dk][id] && dk !== k) { delete D.sess[dk][id]; touchedSl.add(dk); } });
    (D.sess[k] || (D.sess[k] = {}))[id] = { s, e, m: Math.round((e - s) / 60000), st }; touchedSl.add(k);
  });
  (Array.isArray(p.deleted) ? p.deleted : []).forEach(x => { if (!x || !/sleep/i.test(String(x.type || ''))) return; Object.keys(D.sess).forEach(dk => { if (D.sess[dk][x.id]) { delete D.sess[dk][x.id]; touchedSl.add(dk); } }); });
  touchedSl.forEach(k => { const sm = sleepSummary(D.sess[k]); if (sm) day(D, k).sleep = sm; else if (D.days[k]) delete D.days[k].sleep; });
  // heart rate: minute buckets (avg, min, max) for a few days, rolled up per day
  (Array.isArray(p.heart_rate) ? p.heart_rate : []).slice(0, 30000).forEach(r => {
    const ms = t(r.time), a = Number(r.avg != null ? r.avg : r.bpm); if (!Number.isFinite(ms) || !(a >= 25 && a <= 240)) return;
    const lo = Number.isFinite(Number(r.min)) ? Number(r.min) : a, hi = Number.isFinite(Number(r.max)) ? Number(r.max) : a;
    seen.add('heart_rate'); const k = nz(ms).date, B = D.hrB[k] || (D.hrB[k] = {});
    B[Math.floor(ms / 60000)] = [Math.round(a * 10) / 10, Math.round(lo), Math.round(hi)]; touchedHr.add(k);
  });
  touchedHr.forEach(k => { const h = hrSummary(D.hrB[k]); const d = day(D, k), rest = d.hr && d.hr.restSrc === 'watch' ? { rest: d.hr.rest, restSrc: 'watch' } : {}; d.hr = Object.assign(h || {}, rest); });
  (Array.isArray(p.resting_heart_rate) ? p.resting_heart_rate : []).slice(0, 400).forEach(r => {
    const ms = t(r.time), b = int(r.bpm); if (!Number.isFinite(ms) || !(b >= 25 && b <= 200)) return;
    seen.add('resting_heart_rate'); const d = day(D, nz(ms).date); d.hr = Object.assign(d.hr || {}, { rest: b, restSrc: 'watch' });
  });
  // tidy: summaries ~400 days, sessions two weeks, heart-rate buckets three days
  const today = nz(now).date, cut = (n) => addDays(today, -n);
  Object.keys(D.days).forEach(k => { if (k < cut(KEEP_DAYS) || k > addDays(today, 1)) delete D.days[k]; });
  Object.keys(D.sess).forEach(k => { if (k < cut(KEEP_SESS)) delete D.sess[k]; });
  Object.keys(D.hrB).forEach(k => { if (k < cut(KEEP_HR)) delete D.hrB[k]; });
  Object.keys(D.stB).forEach(k => { if (k < cut(KEEP_HR)) delete D.stB[k]; });
  return [...seen];
}
export function publicDays(D, n = 30, now = Date.now()) {
  const from = addDays(nz(now).date, -Math.max(1, Math.min(KEEP_DAYS, n)) + 1);
  return Object.keys(D.days).filter(k => k >= from).sort().map(k => {
    const d = D.days[k], o = { date: k };
    if (d.steps != null) o.steps = d.steps;
    if (d.sleep) o.sleep = d.sleep;
    if (d.hr) { const h = d.hr; o.hr = { rest: h.rest != null ? h.rest : h.restEst != null ? h.restEst : null, restEst: h.rest == null, min: h.min, max: h.max, avg: h.avg }; }
    return o;
  });
}

async function getHCred(env) { try { return JSON.parse(await env.EVENTS_KV.get(K_CRED) || 'null'); } catch (e) { return null; } }
async function getData(env) { return (await open(env, await env.EVENTS_KV.get(K_DATA))) || blank(); }
// My App proves itself with its device key: the bank link's key, or the key that made the current sync code
async function appOk(env, request) {
  const key = request.headers.get('X-Cash-Key') || ''; if (!key || key.length > 200) return false;
  const h = await sha(key), hc = await getHCred(env), ak = await getCred(env);
  return !!((hc && hc.appKeyHash && eq(h, hc.appKeyHash)) || (ak && ak.keyHash && eq(h, ak.keyHash)));
}
const status = (hc, D) => ({ connected: !!hc, created: hc ? hc.created : '', lastAt: D.lastAt || '', lastTypes: D.lastTypes || [], days: Object.keys(D.days).length });

// returns [status, body]
export async function healthRoute(path, request, env, okOrigin) {
  if (!env.EVENTS_KV) return [503, { error: 'unavailable' }];
  if (!env.AKAHU_ENC_KEY) return [503, { error: 'not_configured' }];
  const url = new URL(request.url);
  if (path === '/health/in' && request.method === 'POST') { // from the phone's webhook app (no Origin)
    const auth = request.headers.get('Authorization') || '', tok = (/^Bearer\s+(\S+)$/i.exec(auth) || [])[1] || url.searchParams.get('token') || request.headers.get('X-Sync-Code') || '';
    const hc = await getHCred(env);
    if (!hc || !tok || tok.length > 200 || !eq(await sha(tok), hc.tokHash)) { if (!(await rate(env, 'health-bad', 30, 3600))) return [429, { error: 'rate_limited' }]; return [401, { error: 'unauthorised' }]; }
    const len = Number(request.headers.get('content-length') || 0); if (len > MAX_BODY) return [413, { error: 'too_large' }];
    let p; try { const raw = await request.text(); if (raw.length > MAX_BODY) return [413, { error: 'too_large' }]; p = raw ? JSON.parse(raw) : {}; } catch (e) { return [400, { error: 'bad_json' }]; }
    if (!p || typeof p !== 'object' || Array.isArray(p)) return [400, { error: 'bad_json' }];
    const D = await getData(env), types = applyPayload(D, p);
    D.lastAt = new Date().toISOString(); D.posts = (D.posts || 0) + 1; if (types.length) D.lastTypes = types;
    await env.EVENTS_KV.put(K_DATA, await seal(env, D));
    return [200, { ok: true, types }];
  }
  if (!okOrigin) return [403, { error: 'forbidden_origin' }];
  if (!(await appOk(env, request))) { if (!(await rate(env, 'health-badkey', 30, 3600))) return [429, { error: 'rate_limited' }]; return [401, { error: request.headers.get('X-Cash-Key') ? 'unauthorised' : 'no_key' }]; }
  const hc = await getHCred(env);
  if (path === '/health/status' && request.method === 'GET') return [200, status(hc, await getData(env))];
  if (path === '/health/daily' && request.method === 'GET') { const D = await getData(env); return [200, Object.assign(status(hc, D), { list: publicDays(D, Number(url.searchParams.get('days')) || 30) })]; }
  if (path === '/health/token' && request.method === 'POST') { // new sync code (replaces any old one); shown once
    const tok = 'hw_' + b64url(crypto.getRandomValues(new Uint8Array(24)));
    const cred = { tokHash: await sha(tok), appKeyHash: await sha(request.headers.get('X-Cash-Key')), created: new Date().toISOString() };
    await env.EVENTS_KV.put(K_CRED, JSON.stringify(cred));
    return [200, { ok: true, token: tok, url: url.origin + '/health/in', created: cred.created }];
  }
  if (path === '/health/revoke' && request.method === 'POST') { // stop syncing and delete the watch data
    await env.EVENTS_KV.delete(K_CRED); await env.EVENTS_KV.delete(K_DATA);
    return [200, { ok: true, connected: false }];
  }
  return [404, { error: 'not_found' }];
}
