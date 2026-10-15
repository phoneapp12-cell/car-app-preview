/* 2.23.97: Alarm.com (ADT NZ) READ-ONLY status. No arm/disarm or any command endpoint exists here.
   Secrets: ADC_USERNAME, ADC_PASSWORD, ADC_MFA_COOKIE (trusted-device cookie). Session cookies cache in EVENTS_KV.
   Gated like Hue: allowed Origin + the phone's Hue key fingerprint. */
const B = 'https://www.alarm.com';
const KV = 'alarm-v1', CACHE_MS = 60000, SESS_MS = 20 * 60000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
async function hueOwner(env) { try { const r = await env.EVENTS_KV.get('hue-v1', { type: 'json' }); return r && r.owner || ''; } catch (e) { return ''; } }
async function keyOk(env, key) {
  if (typeof key !== 'string' || !/^[a-f0-9]{48}$/.test(key)) return false;
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hue-v1:' + key));
  return [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2, '0')).join('') === (await hueOwner(env));
}
async function load(env) { try { return await env.EVENTS_KV.get(KV, { type: 'json' }) || {}; } catch (e) { return {}; } }
async function save(env, rec) { await env.EVENTS_KV.put(KV, JSON.stringify(rec)); }
function takeCookies(jar, res) {
  let list = []; try { list = res.headers.getSetCookie ? res.headers.getSetCookie() : []; } catch (e) { }
  if (!list.length) { const one = res.headers.get('set-cookie'); if (one) list = one.split(/,(?=\s*[A-Za-z0-9_.-]+=)/); }
  for (const c of list) { const m = String(c).match(/^\s*([^=;\s]+)=([^;]*)/); if (m) jar[m[1]] = m[2]; }
}
const cookieStr = jar => Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');
async function req(f, jar, url, opt = {}) {
  let u = url, o = opt;
  for (let i = 0; i < 6; i++) {
    const r = await f(u, { ...o, redirect: 'manual', headers: { 'user-agent': UA, cookie: cookieStr(jar), ...(o.headers || {}) } });
    takeCookies(jar, r);
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = new URL(r.headers.get('location'), u).toString(); o = { method: 'GET' }; continue; }
    return r;
  }
  throw new Error('too_many_redirects');
}
async function login(env, f) {
  const jar = { twoFactorAuthenticationId: env.ADC_MFA_COOKIE };
  const r1 = await req(f, jar, B + '/login.aspx'); const html = await r1.text();
  const hv = n => { const m = html.match(new RegExp('name="' + n + '"[^>]*value="([^"]*)"')) || html.match(new RegExp('value="([^"]*)"[^>]*name="' + n + '"')); return m ? m[1].replace(/&amp;/g, '&') : ''; };
  const form = new URLSearchParams({ 'ctl00$ContentPlaceHolder1$loginform$txtUserName': env.ADC_USERNAME, txtPassword: env.ADC_PASSWORD, __VIEWSTATE: hv('__VIEWSTATE'), __VIEWSTATEGENERATOR: hv('__VIEWSTATEGENERATOR'), __EVENTVALIDATION: hv('__EVENTVALIDATION'), __PREVIOUSPAGE: hv('__PREVIOUSPAGE'), IsFromNewSite: '1' });
  if (!form.get('__VIEWSTATE')) throw new Error(r1.status === 403 ? 'blocked' : 'no_viewstate');
  const r2 = await req(f, jar, B + '/web/Default.aspx', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form.toString() });
  await r2.text().catch(() => '');
  if (!jar.afg) throw new Error(r2.status === 403 ? 'blocked' : 'login_failed');
  const H = hdr(jar);
  const ri = await req(f, jar, B + '/web/api/identities', { headers: H }); if (!ri.ok) throw new Error('identities_' + ri.status);
  const ji = await ri.json(); const id = Array.isArray(ji.data) ? ji.data[0] : ji.data; const uid = id && id.id;
  try { const r2f = await req(f, jar, B + '/web/api/engines/twoFactorAuthentication/twoFactorAuthentications/' + uid, { headers: H }); if (r2f.ok) { const a = ((await r2f.json()).data || {}).attributes || {}; if (a.isCurrentDeviceTrusted === false && a.enabledTwoFactorTypes) throw new Error('2fa_required'); } } catch (e) { if (String(e.message) === '2fa_required') throw e; }
  return jar;
}
const hdr = jar => ({ ajaxrequestuniquekey: jar.afg || '', accept: 'application/vnd.api+json', referer: B + '/web/system/home' });
const PSTATE = { 0: 'unknown', 1: 'disarmed', 2: 'armed stay', 3: 'armed away', 4: 'armed night' };
function battLow(a) { const c = a.batteryLevelClassification; return c != null && c !== 0 && !/normal|good|full/i.test(String(c)); }
async function read(env, f) {
  const rec = await load(env);
  let jar = rec.jar && Date.now() - (rec.jarAt || 0) < SESS_MS ? rec.jar : null;
  for (let i = 0; i < 2; i++) {
    if (!jar) { jar = await login(env, f); rec.jar = jar; rec.jarAt = Date.now(); }
    const rs = await req(f, jar, B + '/web/api/devices/sensors', { headers: hdr(jar) });
    if (rs.status === 401 || rs.status === 403 || rs.status === 409) { if (i === 0) { jar = null; continue; } throw new Error(rs.status === 409 ? '2fa_required' : 'auth_' + rs.status); }
    if (!rs.ok) throw new Error('sensors_' + rs.status);
    const js = await rs.json();
    const rp = await req(f, jar, B + '/web/api/devices/partitions', { headers: hdr(jar) }); const jp = rp.ok ? await rp.json() : { data: [] };
    const sensors = (js.data || []).map(d => { const a = d.attributes || {}; const t = a.deviceType;
      const kind = t === 1 ? 'contact' : t === 2 ? 'motion' : t === 5 ? 'smoke' : 'other';
      return { name: String(a.description || 'Sensor'), kind, state: String(a.displayStateText || ''), open: t === 1 && a.state === 2, fault: !!a.isMalfunctioning || a.state === 0, lowBatt: battLow(a) }; });
    let events = [];
    try { const rh = await req(f, jar, B + '/web/api/activity/historyEvents', { headers: hdr(jar) });
      if (rh.ok) { const jh = await rh.json(); events = (jh.data || []).map(d => { const a = d.attributes || {}; return { t: String(a.eventDate || ''), dev: String(a.deviceDescription || ''), what: String(a.description || ''), crit: !!a.isCritical, type: a.eventType ?? null }; }).filter(e => e.t && !/^idle$/i.test(e.what)).slice(0, 40); } } catch (e) { events = []; }
    const parts = (jp.data || []).map(d => { const a = d.attributes || {}; return { name: String(a.description || 'Alarm'), state: PSTATE[a.state] || 'unknown' }; });
    await save(env, { ...rec, jar, jarAt: rec.jarAt || Date.now(), err: null });
    return { sensors, partitions: parts, events };
  }
  throw new Error('auth_failed');
}
export async function alarmRoute(path, request, env, f, okOrigin, reply) {
  if (request.method !== 'POST') return reply(405, { error: 'post_only' });
  if (!okOrigin) return reply(403, { error: 'forbidden_origin' });
  if (!(env && env.EVENTS_KV && env.ADC_USERNAME && env.ADC_PASSWORD)) return reply(200, { setup: false, linked: false });
  let body = {}; try { const raw = await request.text(); if (raw.length > 2000) return reply(413, { error: 'too_large' }); body = raw ? JSON.parse(raw) : {}; } catch (e) { return reply(400, { error: 'bad_request' }); }
  if (!(await keyOk(env, body.key))) return reply(200, { setup: true, linked: false });
  if (path !== '/alarm/status') return reply(404, { error: 'not_found' });
  try {
    const rec = await load(env);
    if (rec.cache && Date.now() - rec.cache.at < CACHE_MS) return reply(200, { setup: true, linked: true, at: rec.cache.at, ...rec.cache.data });
    const data = await read(env, f);
    const r2 = await load(env); r2.cache = { at: Date.now(), data }; await save(env, r2);
    return reply(200, { setup: true, linked: true, at: r2.cache.at, ...data });
  } catch (e) {
    const err = String(e && e.message || e).slice(0, 40); const r3 = await load(env); r3.err = err; r3.jar = null; await save(env, r3).catch(() => { });
    if (r3.cache) return reply(200, { setup: true, linked: true, stale: true, error: err, at: r3.cache.at, ...r3.cache.data });
    return reply(200, { setup: true, linked: true, error: err, sensors: [], partitions: [] });
  }
}
