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
import { shanePush } from './shop-notify.js';
/* 2.27.5: one push when today's steps reach his goal (and 10,000 if the goal is lower). My App sends the goal and the
   on/off switch (/health/prefs). At most 3 a day, none from 10pm to 8am (NZ). Kept: goal, switch, today's sent list. */
const K_PREF = 'health-prefs-v1';
export function stepPushes(pref, steps, nzNow) {
  if (!pref || pref.push === false || !(steps > 0)) return [];
  const g = pref.goal > 0 ? pref.goal : 8000, st = pref.sent && pref.sent.date === nzNow.date ? pref.sent : { date: nzNow.date, keys: [], n: 0 };
  if (nzNow.min < 480 || nzNow.min >= 1320) return [];
  const want = [g].concat(g < 10000 ? [10000] : []).filter(m => steps >= m && !st.keys.includes(m));
  const fmt = n => Number(n).toLocaleString('en-NZ');
  return want.slice(0, Math.max(0, 3 - st.n)).slice(-1).map(m => ({ m, msg: m === g
    ? { title: '\u{1F45F} Step goal reached', body: `${fmt(steps)} steps today. Nice work!`, url: '#watch', tag: 'steps-' + nzNow.date, ttl: 6 * 3600 }
    : { title: '\u{1F45F} 10,000 steps today', body: `${fmt(steps)} and counting. Great going!`, url: '#watch', tag: 'steps-' + nzNow.date, ttl: 6 * 3600 } }));
}
async function stepPushRun(env, D, now = Date.now()) {
  let pref = null; try { pref = JSON.parse(await env.EVENTS_KV.get(K_PREF) || 'null'); } catch (e) { pref = null; }
  const z = nz(now), d = D.days[z.date]; const todo = stepPushes(pref, d && d.steps, z); if (!todo.length) return 0;
  const g = pref.goal > 0 ? pref.goal : 8000;
  pref.sent = pref.sent && pref.sent.date === z.date ? pref.sent : { date: z.date, keys: [], n: 0 };
  // a bigger milestone also covers the smaller ones, so they don't come through later
  [g, 10000].filter(m => m <= todo[0].m || (d.steps >= m)).forEach(m => { if (!pref.sent.keys.includes(m)) pref.sent.keys.push(m); });
  pref.sent.n++; await env.EVENTS_KV.put(K_PREF, JSON.stringify(pref));
  return shanePush(env, todo[0].msg, now);
}
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
function blank() { return { v: 2, days: {}, sess: {}, hrB: {}, stB: {}, stR: {}, org: [], lastAt: '', lastTypes: [], posts: 0 }; }
/* 2.27.11: steps were too high (15,516 in My App vs 10,098 on the watch). Health Connect holds steps from more than one app
   (Health Sync writing the Huawei watch's steps, plus the phone's own step counter), and raw records were added together
   whatever app wrote them. Now raw records are kept per app (data_origin) and per interval (a resend or edit replaces),
   split at NZ midnight, and the day uses ONE app: Health Sync / Huawei when it's there (matches the Huawei Health total),
   otherwise the highest app in each hour (never a sum of apps). Daily totals (HC Webhook 'Daily' resolution) are Health
   Connect's own de-duplicated total and replace the day. Sleep and heart rate also prefer Health Sync / Huawei. */
const KEEP_RAW = 8;
const PREF_RE = /healthsync|huawei|hihealth/i;
const NZ_OFF = iso => { for (const h of [13, 12]) { const c = Date.parse(iso + 'T00:00:00Z') - h * 3600e3, z = nz(c); if (z.date === iso && z.min === 0) return c; } return Date.parse(iso + 'T00:00:00Z') - 13 * 3600e3; };
export const nzStart = NZ_OFF;
function orgIdx(D, pkg) { pkg = String(pkg || '').replace(/[^\w.:-]/g, '').slice(0, 80); if (!pkg) return -1; D.org = D.org || []; let i = D.org.indexOf(pkg); if (i < 0) { if (D.org.length >= 30) return -1; D.org.push(pkg); i = D.org.length - 1; } return i; }
const originOf = r => r && r.metadata && typeof r.metadata.data_origin === 'string' ? r.metadata.data_origin : '';
// split [s,e) at NZ midnights -> [[date, s, e], ...]
function nzPieces(s, e) {
  const out = []; let a = s;
  for (let i = 0; i < 10 && a < e; i++) { const d = nz(a).date, nx = NZ_OFF(addDays(d, 1)); const b = Math.min(e, nx); out.push([d, a, b]); a = b; }
  return out.length ? out : [[nz(s).date, s, e]];
}
// one app per day: Health Sync / Huawei if present, else the highest app in each hour
export function stepPick(D, k) {
  const R = D.stR && D.stR[k]; if (!R || !R.full || !R.r) return null;
  const tot = {}, hours = {};
  for (const [key, c] of Object.entries(R.r)) { const [oi, s] = key.split(':'); tot[oi] = (tot[oi] || 0) + c; const h = Math.floor(Number(s) / 3600); (hours[h] = hours[h] || {})[oi] = (hours[h][oi] || 0) + c; }
  const ois = Object.keys(tot); if (!ois.length) return null;
  const name = oi => (D.org || [])[oi] || 'unknown', by = {}; ois.forEach(oi => by[name(oi)] = tot[oi]);
  const pref = ois.filter(oi => PREF_RE.test(name(oi)) && tot[oi] > 0).sort((a, b) => tot[b] - tot[a]);
  // 2.27.31: Health Sync often leaves hours empty or short (the watch reaches Huawei Health late). Each hour takes the watch,
  // or the phone when the phone counted more that hour; the two are never added together.
  if (pref.length) { const w = pref[0]; let n = 0; Object.values(hours).forEach(H => { n += Math.max(...Object.values(H)); });
    return n > tot[w] ? { steps: n, how: 'fill', used: name(w), watch: tot[w], by } : { steps: tot[w], how: 'origin', used: name(w), by }; }
  if (ois.length === 1) return { steps: tot[ois[0]], how: 'origin', used: name(ois[0]), by };
  let n = 0; Object.values(hours).forEach(H => { n += Math.max(...Object.values(H)); });
  return { steps: n, how: 'max', used: '', by };
}
// sleep: the same night from two apps counts once (Health Sync / Huawei first, else the longer one)
function sleepDedupe(list, D) {
  const L = Object.values(list || {}).filter(x => x && x.m > 0).sort((a, b) => (PREF_RE.test((D.org || [])[b.o] || '') - PREF_RE.test((D.org || [])[a.o] || '')) || b.m - a.m), keep = [];
  for (const x of L) { if (keep.some(y => Math.min(x.e, y.e) - Math.max(x.s, y.s) > 0.5 * Math.min(x.e - x.s, y.e - y.s))) continue; keep.push(x); }
  return keep;
}
const day = (D, k) => D.days[k] || (D.days[k] = {});

function sleepSummary(list, D) {
  const L = D ? sleepDedupe(list, D) : Object.values(list || {}).filter(x => x && x.m > 0); if (!L.length) return null;
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
  D.stR = D.stR || {}; D.org = D.org || [];
  if (!(D.v >= 2)) { // first run of 2.27.11: recent days were added up across apps; they're rebuilt when the phone resends them
    const td = nz(now).date; for (let i = 0; i < KEEP_RAW; i++) { const k = addDays(td, -i); if (D.days[k] && D.days[k].steps != null && !D.days[k].stepsFull) D.stR[k] = { since: now, full: false, r: {} }; }
    D.v = 2;
  }
  const rawFirst = {}, rawN = {};
  (Array.isArray(p.steps) ? p.steps : []).slice(0, 20000).forEach(r => {
    const s = t(r.start_time), e = t(r.end_time), c = int(r.count); if (!Number.isFinite(s) || !(c >= 0) || c > 200000) return;
    const oi = orgIdx(D, originOf(r));
    if (oi >= 0) { // raw record (Full resolution): kept per app and interval, split at NZ midnight
      seen.add('steps'); const P = nzPieces(s, Number.isFinite(e) && e > s ? e : s), len = Math.max(1, (Number.isFinite(e) && e > s ? e : s) - s); let left = c;
      P.forEach(([k, a, b], i) => {
        if (k < addDays(nz(now).date, -(KEEP_RAW - 1)) || k > nz(now).date) return; // older days stay as they were
        const n = i === P.length - 1 ? left : Math.round(c * (b - a) / len); left -= n;
        let R = D.stR[k];
        if (!R) { const had = D.days[k] && D.days[k].steps != null && !D.days[k].stepsFull; R = D.stR[k] = { since: now, full: !had, r: {} }; }
        R.r[oi + ':' + Math.round(a / 1000) + ':' + Math.round((b - a) / 1000)] = n;
        rawFirst[k] = Math.min(rawFirst[k] == null ? Infinity : rawFirst[k], a); rawN[k] = (rawN[k] || 0) + 1; touchedSt.add(k);
        day(D, k).stepsAt = new Date(now).toISOString();
      });
      return;
    }
    seen.add('steps'); const z = nz(s), d = day(D, z.date);
    if (Number.isFinite(e) && e - s >= 3 * 3600e3) {
      if (z.min === 0) { d.steps = c; d.stepsFull = 1; touchedSt.add(z.date); } else if (!d.stepsFull) d.steps = Math.max(d.steps || 0, c);
    } else {
      const B = D.stB[z.date] || (D.stB[z.date] = {}); B[String(s)] = c; touchedSt.add(z.date); // N-minute buckets: a resent bucket replaces (HC Webhook adds up all apps inside a bucket)
    }
    d.stepsAt = new Date(now).toISOString();
  });
  (Array.isArray(p.daily_totals) ? p.daily_totals : []).slice(0, 400).forEach(r => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || '')) || !(int(r.steps) >= 0)) return;
    seen.add('steps'); const d = day(D, r.date); d.steps = int(r.steps); d.stepsFull = 1; d.stSrc = { how: 'daily' }; d.stepsAt = new Date(now).toISOString();
  });
  // a resend of the whole day (manual sync with a time range) completes a day that was being rebuilt
  Object.keys(rawFirst).forEach(k => { const R = D.stR[k]; if (R && !R.full && rawN[k] >= 10 && rawFirst[k] < R.since - 4 * 3600e3) { R.full = true; } });
  touchedSt.forEach(k => {
    const d = day(D, k), pk = stepPick(D, k), R = D.stR[k];
    if (pk) { d.steps = pk.steps; d.stSrc = { how: pk.how, used: pk.used, by: pk.by }; if (pk.watch != null) d.stSrc.watch = pk.watch; return; }
    if (d.stepsFull) { d.stSrc = { how: 'daily' }; return; }
    if (R && !R.full && Object.keys(R.r).length) { const by = {}; Object.entries(R.r).forEach(([key, c]) => { const nm = D.org[key.split(':')[0]] || 'unknown'; by[nm] = (by[nm] || 0) + c; }); d.stSrc = { how: 'rebuild', by }; return; }
    if (D.stB[k]) { d.steps = Object.values(D.stB[k]).reduce((a, b) => a + b, 0); d.stSrc = { how: 'buckets' }; }
  });
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
    (D.sess[k] || (D.sess[k] = {}))[id] = { s, e, m: Math.round((e - s) / 60000), st, o: orgIdx(D, originOf(r)) }; touchedSl.add(k);
  });
  (Array.isArray(p.deleted) ? p.deleted : []).forEach(x => { if (!x || !/sleep/i.test(String(x.type || ''))) return; Object.keys(D.sess).forEach(dk => { if (D.sess[dk][x.id]) { delete D.sess[dk][x.id]; touchedSl.add(dk); } }); });
  touchedSl.forEach(k => { const sm = sleepSummary(D.sess[k], D); if (sm) day(D, k).sleep = sm; else if (D.days[k]) delete D.days[k].sleep; });
  // heart rate: minute buckets (avg, min, max) for a few days, rolled up per day
  (Array.isArray(p.heart_rate) ? p.heart_rate : []).slice(0, 30000).forEach(r => {
    const ms = t(r.time), a = Number(r.avg != null ? r.avg : r.bpm); if (!Number.isFinite(ms) || !(a >= 25 && a <= 240)) return;
    const lo = Number.isFinite(Number(r.min)) ? Number(r.min) : a, hi = Number.isFinite(Number(r.max)) ? Number(r.max) : a;
    seen.add('heart_rate'); const k = nz(ms).date, B = D.hrB[k] || (D.hrB[k] = {});
    const oi = orgIdx(D, originOf(r)), pref = PREF_RE.test(D.org[oi] || ''), mk = Math.floor(ms / 60000), old = B[mk];
    if (old && old[3] != null && PREF_RE.test(D.org[old[3]] || '') && !pref && old[3] !== oi) return; // keep the watch's reading for that minute
    B[mk] = [Math.round(a * 10) / 10, Math.round(lo), Math.round(hi)].concat(oi >= 0 ? [oi] : []); touchedHr.add(k);
  });
  touchedHr.forEach(k => { const h = hrSummary(D.hrB[k]); const d = day(D, k), rest = d.hr && d.hr.restSrc === 'watch' ? { rest: d.hr.rest, restSrc: 'watch' } : {}; d.hr = Object.assign(h || {}, rest); });
  (Array.isArray(p.resting_heart_rate) ? p.resting_heart_rate : []).slice(0, 400).forEach(r => {
    const ms = t(r.time), b = int(r.bpm); if (!Number.isFinite(ms) || !(b >= 25 && b <= 200)) return;
    seen.add('resting_heart_rate'); const d = day(D, nz(ms).date), oi = orgIdx(D, originOf(r)), pref = PREF_RE.test(D.org[oi] || '');
    if (d.hr && d.hr.restSrc === 'watch' && d.hr.restPref && !pref) return; // Health Sync / Huawei's resting rate wins
    d.hr = Object.assign(d.hr || {}, { rest: b, restSrc: 'watch', restPref: pref ? 1 : 0 });
  });
  // tidy: summaries ~400 days, sessions two weeks, heart-rate buckets three days
  const today = nz(now).date, cut = (n) => addDays(today, -n);
  Object.keys(D.days).forEach(k => { if (k < cut(KEEP_DAYS) || k > addDays(today, 1)) delete D.days[k]; });
  Object.keys(D.sess).forEach(k => { if (k < cut(KEEP_SESS)) delete D.sess[k]; });
  Object.keys(D.hrB).forEach(k => { if (k < cut(KEEP_HR)) delete D.hrB[k]; });
  Object.keys(D.stB).forEach(k => { if (k < cut(KEEP_HR)) delete D.stB[k]; });
  Object.keys(D.stR).forEach(k => { if (k < cut(KEEP_RAW - 1)) delete D.stR[k]; });
  return [...seen];
}
export function publicDays(D, n = 30, now = Date.now()) {
  const from = addDays(nz(now).date, -Math.max(1, Math.min(KEEP_DAYS, n)) + 1);
  return Object.keys(D.days).filter(k => k >= from).sort().map(k => {
    const d = D.days[k], o = { date: k };
    if (d.steps != null) o.steps = d.steps; if (d.stepsAt) o.stepsAt = d.stepsAt;
    if (d.stSrc) o.stSrc = { how: d.stSrc.how, used: d.stSrc.used || '', by: d.stSrc.by || null }; if (d.stSrc && d.stSrc.watch != null) o.stSrc.watch = d.stSrc.watch;
    if (d.sleep) o.sleep = d.sleep;
    if (d.hr) { const h = d.hr; o.hr = { rest: h.rest != null ? h.rest : h.restEst != null ? h.restEst : null, restEst: h.rest == null, min: h.min, max: h.max, avg: h.avg }; }
    return o;
  });
}

async function getHCred(env) { try { return JSON.parse(await env.EVENTS_KV.get(K_CRED) || 'null'); } catch (e) { return null; } }
async function getData(env) { return (await open(env, await env.EVENTS_KV.get(K_DATA))) || blank(); }
// My App proves itself with its device key: the bank link's key, or the key that made the current sync code
export async function appOk(env, request) {
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
    try { const st = Array.isArray(p.steps) ? p.steps : [], o = {}; st.forEach(r => { const k = originOf(r) || '(none)'; o[k] = (o[k] || 0) + 1; }); D.lastShape = { at: new Date().toISOString(), steps: st.length, daily: Array.isArray(p.daily_totals) ? p.daily_totals.length : 0, origins: o, first: st.length ? String(st[0].start_time || '').slice(0, 25) : '', last: st.length ? String(st[st.length - 1].end_time || '').slice(0, 25) : '' }; } catch (e) { }
    D.lastAt = new Date().toISOString(); D.posts = (D.posts || 0) + 1; if (types.length) D.lastTypes = types;
    await env.EVENTS_KV.put(K_DATA, await seal(env, D));
    if (types.includes('steps')) { try { await stepPushRun(env, D); } catch (e) { } }
    return [200, { ok: true, types }];
  }
  if (!okOrigin) return [403, { error: 'forbidden_origin' }];
  if (!(await appOk(env, request))) { if (!(await rate(env, 'health-badkey', 30, 3600))) return [429, { error: 'rate_limited' }]; return [401, { error: request.headers.get('X-Cash-Key') ? 'unauthorised' : 'no_key' }]; }
  const hc = await getHCred(env);
  if (path === '/health/prefs' && request.method === 'POST') { // 2.27.5: step goal and push on/off from My App
    let b = {}; try { b = await request.json(); } catch (e) { b = {}; }
    const goal = Math.round(Number(b && b.goal)); if (!(goal >= 1000 && goal <= 50000)) return [400, { error: 'bad_goal' }];
    let pref = null; try { pref = JSON.parse(await env.EVENTS_KV.get(K_PREF) || 'null'); } catch (e) { pref = null; }
    pref = Object.assign(pref || {}, { goal, push: b.push !== false, at: new Date().toISOString() });
    await env.EVENTS_KV.put(K_PREF, JSON.stringify(pref)); return [200, { ok: true, goal: pref.goal, push: pref.push }];
  }
  if (path === '/health/status' && request.method === 'GET') return [200, status(hc, await getData(env))];
  if (path === '/health/daily' && request.method === 'GET') { const D = await getData(env); return [200, Object.assign(status(hc, D), { list: publicDays(D, Number(url.searchParams.get('days')) || 30) })]; }
  if (path === '/health/token' && request.method === 'POST') { // new sync code (replaces any old one); shown once
    const tok = 'hw_' + b64url(crypto.getRandomValues(new Uint8Array(24)));
    const cred = { tokHash: await sha(tok), appKeyHash: await sha(request.headers.get('X-Cash-Key')), created: new Date().toISOString() };
    await env.EVENTS_KV.put(K_CRED, JSON.stringify(cred));
    return [200, { ok: true, token: tok, url: url.origin + '/health/in', created: cred.created }];
  }
  if (path === '/health/revoke' && request.method === 'POST') { // stop syncing and delete the watch data
    await env.EVENTS_KV.delete(K_CRED); await env.EVENTS_KV.delete(K_DATA); await env.EVENTS_KV.delete(K_PREF);
    return [200, { ok: true, connected: false }];
  }
  return [404, { error: 'not_found' }];
}

// 2.27.31: owner-triggered step diagnosis (no token, no samples): per-day steps, which app each came from, last payload shape. Kept 30 minutes.
export async function runHealthDiag(env) {
  if (!env.EVENTS_KV || !env.AKAHU_ENC_KEY) return 'off'; const req = await env.EVENTS_KV.get('health-diag-req'); if (!req) return 'none';
  await env.EVENTS_KV.delete('health-diag-req'); const D = await getData(env), td = nz(Date.now()).date, out = { at: new Date().toISOString(), lastAt: D.lastAt, lastTypes: D.lastTypes, posts: D.posts, org: D.org, lastShape: D.lastShape || null, days: [] };
  for (let i = 0; i < 4; i++) { const k = addDays(td, -i), d = D.days[k] || {}, R = D.stR && D.stR[k], per = {};
    if (R && R.r) Object.entries(R.r).forEach(([key, c]) => { const [oi, s0, len] = key.split(':'); const nm = (D.org || [])[oi] || oi; const x = per[nm] || (per[nm] = { n: 0, steps: 0, first: Infinity, last: 0 }); x.n++; x.steps += c; const hh = Math.floor(nz(+s0 * 1000).min / 60); (x.h || (x.h = {}))[hh] = (x.h[hh] || 0) + c; x.first = Math.min(x.first, +s0 * 1000); x.last = Math.max(x.last, (+s0 + +len) * 1000); });
    Object.values(per).forEach(x => { x.first = x.first === Infinity ? '' : new Date(x.first).toISOString(); x.last = x.last ? new Date(x.last).toISOString() : ''; });
    out.days.push({ date: k, steps: d.steps, stepsFull: d.stepsFull || 0, stSrc: d.stSrc || null, stepsAt: d.stepsAt || '', raw: R ? { full: R.full, since: R.since ? new Date(R.since).toISOString() : '', per } : null, buckets: D.stB && D.stB[k] ? Object.keys(D.stB[k]).length : 0 }); }
  await env.EVENTS_KV.put('health-diag', JSON.stringify(out), { expirationTtl: 1800 }); return 'done';
}
