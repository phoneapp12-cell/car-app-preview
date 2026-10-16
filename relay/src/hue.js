import { cacheGet, cachePut } from './kvguard.js';
/* Philips Hue (Remote Hue API, cloud). Added with app 2.23.79.
   Client id and secret are Worker secrets HUE_CLIENT_ID / HUE_CLIENT_SECRET (HUE_APP_ID optional), never in the repo.
   Only the app can use it: every call needs the allowed Origin AND the phone's own Hue key (random, made by the relay
   at /hue/start, stored on the phone). The relay keeps only a SHA-256 of that key next to the Hue tokens in EVENTS_KV.
   Flow: app POST /hue/start -> opens /hue/login?state=… -> Hue sign-in -> /hue/callback (code -> tokens, remote
   link button + whitelist -> bridge app key) -> back to the app. Tokens refresh themselves before they expire. */
const HUE = 'https://api.meethue.com';
const KV_KEY = 'hue-v1';
const APP_URL = 'https://phoneapp12-cell.github.io/car-app-preview/#lights';

const ready = env => !!(env && env.HUE_CLIENT_ID && env.HUE_CLIENT_SECRET && env.EVENTS_KV);
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hue-v1:' + s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function rand(n = 24) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); }
const basic = env => 'Basic ' + btoa(env.HUE_CLIENT_ID + ':' + env.HUE_CLIENT_SECRET);

async function tokenCall(env, form, f) {
  const r = await f(HUE + '/v2/oauth2/token', { method: 'POST', headers: { Authorization: basic(env), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString() });
  if (!r.ok) throw new Error('token_' + r.status);
  const j = await r.json();
  return { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
}
async function load(env) { try { return await env.EVENTS_KV.get(KV_KEY, { type: 'json' }); } catch (e) { return null; } }
async function access(env, rec, f) {
  if (rec.exp - Date.now() > 120000) return rec.access;
  const t = await tokenCall(env, { grant_type: 'refresh_token', refresh_token: rec.refresh }, f);
  Object.assign(rec, t, { refresh: t.refresh || rec.refresh });
  await env.EVENTS_KV.put(KV_KEY, JSON.stringify(rec));
  return rec.access;
}
async function clip(env, rec, f, method, path, body) {
  const tok = await access(env, rec, f);
  const r = await f(HUE + '/route/clip/v2/resource/' + path, { method, headers: { Authorization: 'Bearer ' + tok, 'hue-application-key': rec.appkey, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('hue_' + r.status);
  return r.json();
}

export async function hueRoute(path, request, env, f, okOrigin, reply) {
  const url = new URL(request.url);
  if (path === '/hue/login') { // opened in the browser, not fetch: guarded by a one-time state from /hue/start
    if (!ready(env)) return new Response('Philips Hue is not set up yet.', { status: 503 });
    const st = url.searchParams.get('state') || '';
    if (!/^[a-f0-9]{48}$/.test(st) || !(await env.EVENTS_KV.get('hue-state:' + st))) return new Response('This link has expired. Go back to My App and tap Connect again.', { status: 400 });
    const q = new URLSearchParams({ client_id: env.HUE_CLIENT_ID, response_type: 'code', state: st });
    if (env.HUE_APP_ID) { q.set('appid', env.HUE_APP_ID); q.set('deviceid', 'myapp-relay'); q.set('devicename', 'My App'); }
    return Response.redirect(HUE + '/v2/oauth2/authorize?' + q, 302);
  }
  if (path === '/hue/callback') {
    if (!ready(env)) return new Response('Philips Hue is not set up yet.', { status: 503 });
    const st = url.searchParams.get('state') || '', code = url.searchParams.get('code') || '';
    const owner = /^[a-f0-9]{48}$/.test(st) ? await env.EVENTS_KV.get('hue-state:' + st) : null;
    if (!owner || !code) return Response.redirect(APP_URL, 302);
    await env.EVENTS_KV.delete('hue-state:' + st);
    try {
      const t = await tokenCall(env, { grant_type: 'authorization_code', code }, f);
      const h = { Authorization: 'Bearer ' + t.access, 'Content-Type': 'application/json' };
      await f(HUE + '/route/api/0/config', { method: 'PUT', headers: h, body: JSON.stringify({ linkbutton: true }) }); // remote "press the link button"
      const r = await f(HUE + '/route/api', { method: 'POST', headers: h, body: JSON.stringify({ devicetype: 'myapp#relay' }) });
      const j = await r.json(); const appkey = j && j[0] && j[0].success && j[0].success.username;
      if (!appkey) throw new Error('no_app_key');
      await env.EVENTS_KV.put(KV_KEY, JSON.stringify({ ...t, appkey, owner, linkedAt: new Date().toISOString() }));
      return Response.redirect(APP_URL, 302);
    } catch (e) { return Response.redirect(APP_URL, 302); }
  }
  // Everything else is called by the app: POST, allowed Origin, JSON body with the phone's key.
  if (request.method !== 'POST') return reply(405, { error: 'post_only' });
  if (!okOrigin) return reply(403, { error: 'forbidden_origin' });
  if (!ready(env)) return reply(200, { setup: false, linked: false, message: 'Philips Hue is not set up yet.' });
  let body = {}; try { const raw = await request.text(); if (raw.length > 4000) return reply(413, { error: 'too_large' }); body = raw ? JSON.parse(raw) : {}; } catch (e) { return reply(400, { error: 'bad_request' }); }
  if (path === '/hue/start') {
    const key = rand(24), st = rand(24);
    await env.EVENTS_KV.put('hue-state:' + st, await sha(key), { expirationTtl: 900 });
    return reply(200, { setup: true, key, url: new URL('/hue/login?state=' + st, request.url).toString() });
  }
  const rec = await load(env);
  const mine = rec && typeof body.key === 'string' && /^[a-f0-9]{48}$/.test(body.key) && (await sha(body.key)) === rec.owner;
  if (path === '/hue/status') return reply(200, { setup: true, linked: !!mine });
  if (!mine) return reply(200, { setup: true, linked: false });
  try {
    if (path === '/hue/lights') {
      // 2.23.87: include zones (e.g. Kitchen spotlights) alongside rooms so Kitchen can toggle every kitchen-named group
      const [rooms, zones, lights, groups, scenes] = await Promise.all(['room', 'zone', 'light', 'grouped_light', 'scene'].map(p => clip(env, rec, f, 'GET', p).then(x => x.data || []).catch(() => [])));
      const gl = Object.fromEntries(groups.map(g => [g.id, g]));
      const mapGroup = r => { const g = (r.services || []).find(s => s.rtype === 'grouped_light'), G = g && gl[g.rid]; return { id: r.id, name: r.metadata && r.metadata.name, group: g && g.rid, on: !!(G && G.on && G.on.on), bri: G && G.dimming ? Math.round(G.dimming.brightness) : null }; };
      return reply(200, { setup: true, linked: true,
        rooms: [...rooms.map(mapGroup), ...zones.map(mapGroup)],
        lights: lights.map(l => ({ id: l.id, name: l.metadata && l.metadata.name, on: !!(l.on && l.on.on), bri: l.dimming ? Math.round(l.dimming.brightness) : null, owner: l.owner && l.owner.rid })),
        scenes: scenes.map(s => ({ id: s.id, name: s.metadata && s.metadata.name, room: s.group && s.group.rid })) });
    }
    if (path === '/hue/sensors') { // added with app 2.23.80: one entry per sensor device
      const get = t => clip(env, rec, f, 'GET', t).then(x => x.data || []).catch(() => []);
      const T = ['device', 'room', 'motion', 'temperature', 'light_level', 'device_power', 'contact', 'button', 'relative_rotary'];
      const [devices, rooms, ...rest] = await Promise.all(T.map(get)), R = Object.fromEntries(T.slice(2).map((t, i) => [t, rest[i]]));
      const roomOf = {}; rooms.forEach(r => (r.children || []).forEach(c => { if (c.rtype === 'device') roomOf[c.rid] = r.metadata && r.metadata.name; }));
      const out = {}, dev = id => out[id] || (out[id] = (() => { const d = devices.find(x => x.id === id) || {}; return { id, name: (d.metadata && d.metadata.name) || (d.product_data && d.product_data.product_name) || 'Sensor', product: d.product_data && d.product_data.product_name || '', room: roomOf[id] || '' }; })());
      const own = x => x.owner && x.owner.rid;
      R.motion.forEach(x => { const m = x.motion || {}, r = m.motion_report || {}; dev(own(x)).motion = { on: r.motion !== undefined ? !!r.motion : !!m.motion, changed: r.changed || null, enabled: x.enabled !== false }; });
      R.temperature.forEach(x => { const t = x.temperature || {}, r = t.temperature_report || {}; const v = r.temperature !== undefined ? r.temperature : t.temperature; if (typeof v === 'number') dev(own(x)).temp = { c: Math.round(v * 10) / 10, changed: r.changed || null }; });
      R.light_level.forEach(x => { const l = x.light || {}, r = l.light_level_report || {}; const v = r.light_level !== undefined ? r.light_level : l.light_level; if (typeof v === 'number') dev(own(x)).light = { lux: Math.round(Math.pow(10, (v - 1) / 10000)), changed: r.changed || null }; });
      R.device_power.forEach(x => { const p = x.power_state || {}; if (typeof p.battery_level === 'number') dev(own(x)).battery = { pct: p.battery_level, state: p.battery_state || '' }; });
      R.contact.forEach(x => { const r = x.contact_report || {}; if (r.state) dev(own(x)).contact = { open: r.state === 'no_contact', changed: r.changed || null }; });
      R.button.forEach(x => { const b = x.button || {}, r = b.button_report || {}; const ev = r.event || b.last_event; if (!ev) return; const d = dev(own(x)), when = r.updated || null; if (!d.button || (when && (!d.button.when || when > d.button.when))) d.button = { event: ev, n: x.metadata && x.metadata.control_id || null, when }; });
      R.relative_rotary.forEach(x => { const q = x.relative_rotary || {}, r = q.rotary_report || q.last_event || {}; const rot = r.rotation || {}; if (r.action || rot.direction) dev(own(x)).rotary = { action: r.action || '', direction: rot.direction || '', steps: rot.steps || null, when: r.updated || null }; });
      delete out.undefined;
      // 2.26.17: devices (lights, sensors, switches) the bridge can't reach right now. Read-only; cached 10 min in the Cache API, no KV.
      let offline = null;
      try { const cc = await cacheGet('hue-conn'); if (cc && Array.isArray(cc.list)) offline = cc.list; } catch (e) { }
      if (!offline) { try { const zc = await get('zigbee_connectivity'); offline = zc.filter(z => z && z.status && z.status !== 'connected').map(z => { const id = own(z), d = devices.find(x => x.id === id) || {}; return { id, name: (d.metadata && d.metadata.name) || (d.product_data && d.product_data.product_name) || 'Device', product: (d.product_data && d.product_data.product_name) || '', room: roomOf[id] || '', status: z.status }; }).filter(x => !/bridge/i.test(x.product)); await cachePut('hue-conn', { list: offline }, 600); } catch (e) { offline = null; } }
      Object.values(out).forEach(d => { if (offline && offline.some(o => o.id === d.id)) d.offline = true; });
      return reply(200, { setup: true, linked: true, offline, sensors: Object.values(out).filter(d => d.motion || d.temp || d.light || d.contact || d.button || d.rotary || (d.battery && !/bridge/i.test(d.product))) });
    }
    if (path === '/hue/alloff') { // 2.23.81: every light off through the bridge's whole-home group
      const homes = await clip(env, rec, f, 'GET', 'bridge_home').then(x => x.data || []);
      const ids = homes.flatMap(h => (h.services || []).filter(x => x.rtype === 'grouped_light').map(x => x.rid));
      if (!ids.length) return reply(200, { ok: false, error: 'no_home_group' });
      for (const id of ids) await clip(env, rec, f, 'PUT', 'grouped_light/' + id, { on: { on: false } });
      return reply(200, { ok: true });
    }
    if (path === '/hue/set') {
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/.test(id)) return reply(400, { error: 'bad_id' });
      if (body.type === 'scene') { await clip(env, rec, f, 'PUT', 'scene/' + id, { recall: { action: 'active' } }); return reply(200, { ok: true }); }
      if (body.type !== 'light' && body.type !== 'grouped_light') return reply(400, { error: 'bad_type' });
      const p = {}; if (typeof body.on === 'boolean') p.on = { on: body.on };
      if (Number.isFinite(+body.bri) && body.bri !== null && body.bri !== undefined) p.dimming = { brightness: Math.max(1, Math.min(100, +body.bri)) };
      if (!Object.keys(p).length) return reply(400, { error: 'nothing_to_do' });
      await clip(env, rec, f, 'PUT', body.type + '/' + id, p); return reply(200, { ok: true });
    }
    if (path === '/hue/unlink') { await env.EVENTS_KV.delete(KV_KEY); return reply(200, { ok: true, linked: false }); }
  } catch (e) { return reply(502, { error: 'hue_unavailable', detail: String(e && e.message || e).slice(0, 80) }); }
  return reply(404, { error: 'not_found' });
}
