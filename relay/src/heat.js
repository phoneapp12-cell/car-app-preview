/* Heat pumps (2.23.86): Panasonic Comfort Cloud + Mitsubishi MELCloud.
   Emails/passwords are Worker secrets; never returned. Tokens cache in EVENTS_KV.
   Gated like Hue: allowed Origin + the phone's Hue key fingerprint (same key as Lights). */
const P_AUTH = 'https://authglb.digital.panasonic.com';
const P_ACC = 'https://accsmart.panasonic.com';
const P_CID = 'Xmy6xIYIitMxngjB2rHvlm6HSDNnaMJx';
const P_A0 = 'eyJuYW1lIjoiQXV0aDAuQW5kcm9pZCIsImVudiI6eyJhbmRyb2lkIjoiMzAifSwidmVyc2lvbiI6IjIuOS4zIn0=';
const P_REDIR = 'panasonic-iot-cfc://authglb.digital.panasonic.com/android/com.panasonic.ACCsmart/callback';
const MEL = 'https://app.melcloud.com/Mitsubishi.Wifi.Client';
const KV = 'heat-v1', CACHE_MS = 120000;
const rnd = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62]).join(''); };
const sha = async s => { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); };
async function hueOwner(env) { try { const r = await env.EVENTS_KV.get('hue-v1', { type: 'json' }); return r && r.owner || ''; } catch (e) { return ''; } }
async function keyOk(env, key) {
  if (typeof key !== 'string' || !/^[a-f0-9]{48}$/.test(key)) return false;
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hue-v1:' + key));
  const hex = [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === (await hueOwner(env));
}
async function load(env) { try { return await env.EVENTS_KV.get(KV, { type: 'json' }) || {}; } catch (e) { return {}; } }
async function save(env, rec) { await env.EVENTS_KV.put(KV, JSON.stringify(rec)); }

function pApiKey(ts, token) {
  const ms = String(Date.parse(ts.replace(' ', 'T') + 'Z'));
  const buf = new TextEncoder().encode('Comfort Cloud' + '521325fb2dd486bf4831b47644317fca' + ms + 'Bearer ' + token);
  // sync sha256 via SubtleCrypto needs async — callers use pHeaders
  return buf;
}
async function pHeaders(tok, clientId, ver) {
  // Comfort Cloud's client builds the timestamp in the phone's local clock, then hashes it as if it were UTC.
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const ms = String(Date.parse(ts.replace(' ', 'T') + 'Z'));
  const input = new TextEncoder().encode('Comfort Cloud' + '521325fb2dd486bf4831b47644317fca' + ms + 'Bearer ' + tok);
  const dig = await crypto.subtle.digest('SHA-256', input);
  const hex = [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2, '0')).join('');
  const key = hex.slice(0, 9) + 'cfc' + hex.slice(9);
  const h = { accept: 'application/json; charset=utf-8', 'content-type': 'application/json', 'user-agent': 'G-RAC', 'x-app-name': 'Comfort Cloud', 'x-app-timestamp': ts, 'x-app-type': '1', 'x-app-version': ver || '4.4.0', 'x-cfc-api-key': key, 'x-user-authorization-v2': 'Bearer ' + tok };
  if (clientId) h['x-client-id'] = clientId;
  return h;
}
async function pLogin(env, f) {
  const email = env.PANASONIC_EMAIL, pass = env.PANASONIC_PASSWORD;
  if (!email || !pass) return { ok: false, error: 'not_configured' };
  const jar = new Map();
  const cook = () => [...jar.entries()].map(([k, v]) => k + '=' + v).join('; ');
  const take = r => { const a = r.headers.getSetCookie ? r.headers.getSetCookie() : []; (a.length ? a : [r.headers.get('set-cookie')]).filter(Boolean).forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); }); };
  const ver = rnd(43), chall = await sha(ver), state = rnd(20);
  let r = await f(P_AUTH + '/authorize?' + new URLSearchParams({ scope: 'openid offline_access comfortcloud.control a2w.control', audience: `https://digital.panasonic.com/${P_CID}/api/v1/`, protocol: 'oauth2', response_type: 'code', code_challenge: chall, code_challenge_method: 'S256', auth0Client: P_A0, client_id: P_CID, redirect_uri: P_REDIR, state }), { headers: { 'user-agent': 'okhttp/4.10.0' }, redirect: 'manual' });
  take(r);
  let loc = r.headers.get('Location') || '';
  if (loc.startsWith(P_REDIR)) {
    const code = new URL(loc.replace(P_REDIR, 'https://x/')).searchParams.get('code');
    return pToken(env, f, code, ver);
  }
  r = await f(P_AUTH + '/' + loc.replace(/^\//, ''), { headers: { 'user-agent': 'okhttp/4.10.0', cookie: cook() }, redirect: 'manual' });
  take(r);
  const csrf = jar.get('_csrf'); if (!csrf) return { ok: false, error: 'no_csrf' };
  const authState = new URL(P_AUTH + '/' + (loc.startsWith('http') ? new URL(loc).pathname + new URL(loc).search : loc)).searchParams.get('state') || state;
  r = await f(P_AUTH + '/usernamepassword/login', { method: 'POST', headers: { 'Auth0-Client': P_A0, 'user-agent': 'okhttp/4.10.0', 'content-type': 'application/json', cookie: cook() }, body: JSON.stringify({ client_id: P_CID, redirect_uri: P_REDIR, tenant: 'pdpauthglb-a1', response_type: 'code', scope: 'openid offline_access comfortcloud.control a2w.control', audience: `https://digital.panasonic.com/${P_CID}/api/v1/`, _csrf: csrf, state: authState, _intstate: 'deprecated', username: email, password: pass, lang: 'en', connection: 'PanasonicID-Authentication' }), redirect: 'manual' });
  take(r);
  if (!r.ok) return { ok: false, error: 'login_' + r.status };
  const html = await r.text();
  if (/mfa_token|__g_config/.test(html)) return { ok: false, error: 'mfa_required' };
  const params = {};
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0]; if (!/type=["']hidden["']/i.test(tag)) continue;
    const n = (tag.match(/\bname=["']([^"']+)["']/i) || [])[1]; if (!n) continue;
    let v = (tag.match(/\bvalue=["']([^"']*)["']/i) || [])[1];
    if (v == null) { const u = tag.match(/\bvalue=([^\s>]+)/i); v = u ? u[1] : ''; }
    params[n] = String(v || '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  if (params.mfa_token) return { ok: false, error: 'mfa_required' };
  r = await f(P_AUTH + '/login/callback', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36', cookie: cook() }, body: new URLSearchParams(params).toString(), redirect: 'manual' });
  take(r);
  loc = r.headers.get('Location') || '';
  r = await f(loc.startsWith('http') ? loc : P_AUTH + '/' + loc.replace(/^\//, ''), { headers: { 'user-agent': 'okhttp/4.10.0', cookie: cook() }, redirect: 'manual' });
  take(r);
  loc = r.headers.get('Location') || '';
  const code = loc.includes('code=') ? new URL(loc.replace(P_REDIR, 'https://x/')).searchParams.get('code') : null;
  if (!code) return { ok: false, error: 'no_code' };
  return pToken(env, f, code, ver);
}
async function pToken(env, f, code, ver) {
  const r = await f(P_AUTH + '/oauth/token', { method: 'POST', headers: { 'Auth0-Client': P_A0, 'user-agent': 'okhttp/4.10.0', 'content-type': 'application/json' }, body: JSON.stringify({ scope: 'openid', client_id: P_CID, grant_type: 'authorization_code', code, redirect_uri: P_REDIR, code_verifier: ver }) });
  if (!r.ok) return { ok: false, error: 'token_' + r.status };
  const j = await r.json();
  const rec = await load(env);
  rec.p = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, scope: j.scope, clientId: null, ver: '4.4.0' };
  let h = await pHeaders(rec.p.access, null, rec.p.ver);
  let r2 = await f(P_ACC + '/auth/v2/login', { method: 'POST', headers: h, body: JSON.stringify({ language: 0 }) });
  if (!r2.ok) {
    const t = await r2.text();
    if (/New version/i.test(t)) {
      try {
        const pg = await f('https://play.google.com/store/apps/details?id=com.panasonic.ACCsmart');
        const html = await pg.text(); const m = html.match(/\["(\d+\.\d+\.\d+)"\]/);
        if (m) { rec.p.ver = m[1]; h = await pHeaders(rec.p.access, null, rec.p.ver); r2 = await f(P_ACC + '/auth/v2/login', { method: 'POST', headers: h, body: JSON.stringify({ language: 0 }) }); }
      } catch (e) { }
    }
    if (!r2.ok) return { ok: false, error: 'acc_' + r2.status };
  }
  const j2 = await r2.json(); rec.p.clientId = j2.clientId; await save(env, rec);
  return { ok: true };
}
async function pRefresh(env, f, rec) {
  if (!rec.p || !rec.p.refresh) return pLogin(env, f);
  const r = await f(P_AUTH + '/oauth/token', { method: 'POST', headers: { 'Auth0-Client': P_A0, 'user-agent': 'okhttp/4.10.0', 'content-type': 'application/json' }, body: JSON.stringify({ scope: rec.p.scope || 'openid offline_access comfortcloud.control a2w.control', client_id: P_CID, refresh_token: rec.p.refresh, grant_type: 'refresh_token' }) });
  if (!r.ok) return pLogin(env, f);
  const j = await r.json();
  Object.assign(rec.p, { access: j.access_token, refresh: j.refresh_token || rec.p.refresh, exp: Date.now() + (j.expires_in || 3600) * 1000, scope: j.scope || rec.p.scope });
  await save(env, rec); return { ok: true };
}
async function pEnsure(env, f) {
  const rec = await load(env);
  if (rec.p && rec.p.access && rec.p.exp - Date.now() > 120000) return rec;
  if (rec.p && rec.p.refresh) { const x = await pRefresh(env, f, rec); if (x.ok) return await load(env); }
  const x = await pLogin(env, f); if (!x.ok) { rec.pErr = x.error; await save(env, rec); return rec; }
  return await load(env);
}
const PMODE = { 0: 'auto', 1: 'dry', 2: 'cool', 3: 'heat', 4: 'fan' }, PFAN = { 0: 'auto', 1: 'low', 2: 'lowmid', 3: 'mid', 4: 'highmid', 5: 'high' };
const PMODE_R = Object.fromEntries(Object.entries(PMODE).map(([k, v]) => [v, +k])), PFAN_R = Object.fromEntries(Object.entries(PFAN).map(([k, v]) => [v, +k]));
async function pUnits(env, f) {
  const rec = await pEnsure(env, f); if (!rec.p || !rec.p.access) return { error: rec.pErr || 'login_failed', units: [] };
  try {
    const h = await pHeaders(rec.p.access, rec.p.clientId, rec.p.ver);
    const g = await f(P_ACC + '/device/group', { headers: h }); if (!g.ok) throw new Error('group_' + g.status);
    const gj = await g.json(); const list = [];
    for (const grp of gj.groupList || []) {
      for (const d of grp.deviceList || grp.deviceIdList || []) {
        if (!d || !d.deviceGuid) continue;
        const st = await f(P_ACC + '/deviceStatus/now/' + encodeURIComponent(d.deviceGuid), { headers: h });
        const sj = st.ok ? await st.json() : {};
        const p = sj.parameters || d.parameters || {};
        list.push({ id: 'p:' + d.deviceGuid, brand: 'Panasonic', name: d.deviceName || d.deviceGuid, on: p.operate === 1, mode: PMODE[p.operationMode] || 'auto', temp: p.temperatureSet, room: p.insideTemperature ?? p.temperatureInside, outdoor: p.outTemperature ?? p.temperatureOutside, fan: PFAN[p.fanSpeed] || 'auto' });
      }
    }
    rec.pErr = null; await save(env, rec); return { units: list };
  } catch (e) { rec.pErr = String(e.message || e).slice(0, 40); await save(env, rec); return { error: rec.pErr, units: [] }; }
}
async function pSet(env, f, id, body) {
  const guid = id.slice(2); const rec = await pEnsure(env, f); if (!rec.p) return { ok: false, error: rec.pErr || 'login_failed' };
  const params = {}; if (typeof body.on === 'boolean') params.operate = body.on ? 1 : 0;
  if (body.mode && PMODE_R[body.mode] != null) params.operationMode = PMODE_R[body.mode];
  if (Number.isFinite(+body.temp)) params.temperatureSet = +body.temp;
  if (body.fan && PFAN_R[body.fan] != null) params.fanSpeed = PFAN_R[body.fan];
  if (!Object.keys(params).length) return { ok: false, error: 'nothing_to_do' };
  const h = await pHeaders(rec.p.access, rec.p.clientId, rec.p.ver);
  const r = await f(P_ACC + '/deviceStatus/control', { method: 'POST', headers: h, body: JSON.stringify({ deviceGuid: guid, parameters: params }) });
  return r.ok ? { ok: true } : { ok: false, error: 'set_' + r.status };
}

async function mLogin(env, f) {
  const email = env.MELCLOUD_EMAIL, pass = env.MELCLOUD_PASSWORD;
  if (!email || !pass) return { ok: false, error: 'not_configured' };
  const r = await f(MEL + '/Login/ClientLogin', { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' }, body: JSON.stringify({ Email: email, Password: pass, Language: 0, AppVersion: '1.32.1.0', Persist: true, CaptchaResponse: null }) });
  if (!r.ok) return { ok: false, error: 'login_' + r.status };
  const j = await r.json(); if (!(j.LoginData && j.LoginData.ContextKey)) return { ok: false, error: j.ErrorMessage || 'login_failed' };
  const rec = await load(env); rec.m = { key: j.LoginData.ContextKey, at: Date.now() }; rec.mErr = null; await save(env, rec); return { ok: true };
}
async function mEnsure(env, f) {
  const rec = await load(env); if (rec.m && rec.m.key && Date.now() - (rec.m.at || 0) < 12 * 3600000) return rec;
  await mLogin(env, f); return await load(env);
}
const MMODE = { 1: 'heat', 2: 'dry', 3: 'cool', 7: 'fan', 8: 'auto' }, MFAN = { 0: 'auto', 1: 'low', 2: 'mid', 3: 'high' };
const MMODE_R = Object.fromEntries(Object.entries(MMODE).map(([k, v]) => [v, +k])), MFAN_R = Object.fromEntries(Object.entries(MFAN).map(([k, v]) => [v, +k]));
async function mUnits(env, f) {
  const rec = await mEnsure(env, f); if (!rec.m || !rec.m.key) return { error: rec.mErr || 'login_failed', units: [] };
  try {
    const r = await f(MEL + '/User/ListDevices', { headers: { 'X-MitsContextKey': rec.m.key, 'content-type': 'application/json' } });
    if (!r.ok) throw new Error('list_' + r.status);
    const j = await r.json(); const list = [];
    for (const b of (Array.isArray(j) ? j : [])) for (const d of b.Structure?.Devices || []) {
      const de = d.Device || d; list.push({ id: 'm:' + de.DeviceID, brand: 'Mitsubishi', name: d.DeviceName || de.DeviceName || ('Unit ' + de.DeviceID), on: !!de.Power, mode: MMODE[de.OperationMode] || 'auto', temp: de.SetTemperature, room: de.RoomTemperature, outdoor: de.OutdoorTemperature ?? null, fan: MFAN[de.FanSpeed] || 'auto', building: b.ID });
    }
    rec.mErr = null; await save(env, rec); return { units: list };
  } catch (e) { rec.mErr = String(e.message || e).slice(0, 40); await save(env, rec); return { error: rec.mErr, units: [] }; }
}
async function mSet(env, f, id, body) {
  const did = +id.slice(2); const rec = await mEnsure(env, f); if (!rec.m) return { ok: false, error: rec.mErr || 'login_failed' };
  const list = await f(MEL + '/User/ListDevices', { headers: { 'X-MitsContextKey': rec.m.key } });
  const j = await list.json(); let cur = null, building = null;
  for (const b of (Array.isArray(j) ? j : [])) for (const d of b.Structure?.Devices || []) if ((d.Device || d).DeviceID === did) { cur = d.Device || d; building = b.ID; }
  if (!cur) return { ok: false, error: 'not_found' };
  let flags = 0; if (typeof body.on === 'boolean') { cur.Power = body.on; flags |= 1; }
  if (body.mode && MMODE_R[body.mode] != null) { cur.OperationMode = MMODE_R[body.mode]; flags |= 2; }
  if (Number.isFinite(+body.temp)) { cur.SetTemperature = +body.temp; flags |= 4; }
  if (body.fan && MFAN_R[body.fan] != null) { cur.FanSpeed = MFAN_R[body.fan]; flags |= 8; }
  cur.EffectiveFlags = flags; cur.HasPendingCommand = true; cur.DeviceID = did;
  const r = await f(MEL + '/Device/SetAta', { method: 'POST', headers: { 'X-MitsContextKey': rec.m.key, 'content-type': 'application/json' }, body: JSON.stringify(cur) });
  return r.ok ? { ok: true } : { ok: false, error: 'set_' + r.status };
}

function ready(env) { return !!(env && env.EVENTS_KV && ((env.PANASONIC_EMAIL && env.PANASONIC_PASSWORD) || (env.MELCLOUD_EMAIL && env.MELCLOUD_PASSWORD))); }
export async function heatRoute(path, request, env, f, okOrigin, reply) {
  if (request.method !== 'POST') return reply(405, { error: 'post_only' });
  if (!okOrigin) return reply(403, { error: 'forbidden_origin' });
  if (!ready(env)) return reply(200, { setup: false, linked: false, message: 'Heat pumps are not set up yet.' });
  let body = {}; try { const raw = await request.text(); if (raw.length > 4000) return reply(413, { error: 'too_large' }); body = raw ? JSON.parse(raw) : {}; } catch (e) { return reply(400, { error: 'bad_request' }); }
  if (!(await keyOk(env, body.key))) return reply(200, { setup: true, linked: false });
  try {
    if (path === '/heat/status') {
      const rec = await load(env);
      if (rec.cache && Date.now() - (rec.cache.at || 0) < CACHE_MS) return reply(200, { setup: true, linked: true, ...rec.cache.data });
      const [p, m] = await Promise.all([pUnits(env, f), mUnits(env, f)]);
      const data = { brands: { panasonic: p.error ? { ok: false, error: p.error } : { ok: true }, mitsubishi: m.error ? { ok: false, error: m.error } : { ok: true } }, units: [...(p.units || []), ...(m.units || [])] };
      const r2 = await load(env); r2.cache = { at: Date.now(), data }; await save(env, r2);
      return reply(200, { setup: true, linked: true, ...data });
    }
    if (path === '/heat/set') {
      const id = String(body.id || ''); if (!/^([pm]):/.test(id)) return reply(400, { error: 'bad_id' });
      const r = id.startsWith('p:') ? await pSet(env, f, id, body) : await mSet(env, f, id, body);
      if (r.ok) { const rec = await load(env); delete rec.cache; await save(env, rec); }
      return reply(200, r);
    }
  } catch (e) { return reply(502, { error: 'heat_unavailable', detail: String(e && e.message || e).slice(0, 80) }); }
  return reply(404, { error: 'not_found' });
}
