// node test/sunshine.test.mjs – sunshine notes: weather rule, timing, one a day, no repeats, routes (no network)
import crypto from 'crypto';
import { isSunny, planSun, nextNote, runSunshine, sunshineRoute, SUN_NOTES, SUN_URL, ttlFor, inWindow, SUN_TITLE } from '../src/sunshine.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const at = s => Date.parse(s); // UTC; NZ is +13 in Oct
const NZ = (d, hm) => { const [h, m] = hm.split(':').map(Number); return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), h - 13, m); };

// sun rule
ok(isSunny({ weather_code: 0, is_day: 1, cloud_cover: 5 }), 'clear by day = sunny');
ok(isSunny({ weather_code: 1, is_day: 1, cloud_cover: 30 }), 'mainly clear = sunny');
ok(!isSunny({ weather_code: 2, is_day: 1, cloud_cover: 60 }), 'partly cloudy is not');
ok(!isSunny({ weather_code: 61, is_day: 1 }), 'rain is not');
ok(!isSunny({ weather_code: 0, is_day: 0 }), 'clear at night is not');
ok(!isSunny({ weather_code: 1, is_day: 1, cloud_cover: 80 }), 'code 1 but 80% cloud is not');
// streak and one a day
const C = { weather_code: 3, is_day: 1, cloud_cover: 95 }, S = { weather_code: 0, is_day: 1, cloud_cover: 5 };
let p = planSun({}, C, NZ('2026-10-12', '09:00')); ok(!p.send && p.st.streak === 0, 'cloudy: nothing');
p = planSun(p.st, S, NZ('2026-10-12', '09:20')); ok(!p.send && p.st.streak === 1, 'first sunny check: waits (no flicker)');
let q = planSun(p.st, C, NZ('2026-10-12', '09:40')); ok(!q.send && q.st.streak === 0, 'cloud back: count starts again');
p = planSun(p.st, S, NZ('2026-10-12', '09:40')); ok(p.send && p.st.streak === 2, 'second sunny check in a row: send');
p.st.sentDay = p.date;
p = planSun(p.st, S, NZ('2026-10-12', '14:00')); ok(!p.send, 'only one a day');
p = planSun(p.st, S, NZ('2026-10-13', '08:00')); p = planSun(p.st, S, NZ('2026-10-13', '08:20')); ok(p.send && p.date === '2026-10-13', 'next day sunny from the morning: sent at the second check (8:20)');
let g = planSun({ streak: 1, lastAt: NZ('2026-10-14', '09:00') }, S, NZ('2026-10-14', '10:30')); ok(!g.send && g.st.streak === 1, 'long gap between checks: count starts again');
ok(!planSun({ streak: 5, lastAt: NZ('2026-10-14', '19:50') }, S, NZ('2026-10-14', '20:05')).send, 'not after 8 pm');
ok(!planSun({ streak: 5, lastAt: NZ('2026-10-14', '07:30') }, S, NZ('2026-10-14', '07:50')).send, 'not before 8 am');
ok(inWindow(NZ('2026-10-14', '08:00')) && inWindow(NZ('2026-10-14', '19:59')) && !inWindow(NZ('2026-10-14', '20:00')) && !inWindow(NZ('2026-10-14', '07:59')), 'window 8:00–7:59 pm');
ok(ttlFor(NZ('2026-10-14', '19:30')) === 1800 && ttlFor(NZ('2026-10-14', '10:00')) === 10800, 'push expires by 8 pm (max 3 h)');
// notes
ok(SUN_NOTES.length >= 120 && new Set(SUN_NOTES).size === SUN_NOTES.length, SUN_NOTES.length + ' notes, all different');
ok(!SUN_NOTES.some(n => /depress|sad|mood|down\\b|heal|fix|struggl|god|pray|bless/i.test(n)), 'no mood/clinical/religious words');
let st = {}, seen = [], back = 0, prev = -1;
for (let i = 0; i < SUN_NOTES.length * 3; i++) { const [k, ns] = nextNote(st); st = ns; if (k === prev) back++; prev = k; seen.push(k); }
const n = SUN_NOTES.length;
ok([0, 1, 2].every(c => new Set(seen.slice(c * n, (c + 1) * n)).size === n), 'every note once per round (3 rounds)');
ok(back === 0, 'never the same twice in a row, across rounds too');

// cron with fake KV/fetch
const kv = () => { const m = new Map(); return { m, get: async (k, o) => m.has(k) ? (o && o.type === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null, put: async (k, v) => { m.set(k, v); } }; };
const { privateKey, publicKey } = await crypto.webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await crypto.webcrypto.subtle.exportKey('jwk', privateKey);
const ua = await crypto.webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const raw = new Uint8Array(await crypto.webcrypto.subtle.exportKey('raw', ua.publicKey));
const b64 = u => Buffer.from(u).toString('base64url');
const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-123', keys: { p256dh: b64(raw), auth: b64(crypto.randomBytes(16)) } };
const env = { EVENTS_KV: kv(), VAPID_PRIVATE_JWK: JSON.stringify(jwk), VAPID_PUBLIC: 'x' };
const KEY = 'testKey' + 'A'.repeat(32);
let wx = C, weatherCalls = 0, pushes = [];
const f = async (u, o) => { if (u === SUN_URL) { weatherCalls++; return new Response(JSON.stringify({ current: wx })); } pushes.push({ u, ttl: o.headers.TTL }); return new Response('', { status: 201 }); };
let r = await runSunshine(env, f, NZ('2026-10-12', '10:00')); ok(r.skipped === 'nobody' && weatherCalls === 0, 'nobody signed up: weather not even read');
let rr = await sunshineRoute('/sunshine/subscribe', { key: KEY, subscription: sub }, env, f, NZ('2026-10-12', '10:00'));
ok(rr[0] === 200 && rr[1].subscribed && pushes.length === 1, 'subscribe stores it and sends "Notifications are on"');
ok((await sunshineRoute('/sunshine/status', { key: KEY, endpoint: sub.endpoint }, env))[1].subscribed, 'status: subscribed');
ok(!(await sunshineRoute('/sunshine/status', { key: 'other' + 'B'.repeat(32), endpoint: sub.endpoint }, env))[1].subscribed, 'another key cannot see it');
ok((await sunshineRoute('/sunshine/subscribe', { key: 'short', subscription: sub }, env))[0] === 403, 'bad key refused');
ok(!JSON.parse(env.EVENTS_KV.m.get('sunshine-v1')).subs.some(s => s.k == null) && !env.EVENTS_KV.m.has('push-subs-v1'), "kept apart from My App's push list");
pushes = [];
r = await runSunshine(env, f, NZ('2026-10-12', '07:40')); ok(r.skipped === 'window' && weatherCalls === 0, 'before 8 am: nothing read');
r = await runSunshine(env, f, NZ('2026-10-12', '10:00')); ok(weatherCalls === 1 && !r.sent, 'cloudy check');
r = await runSunshine(env, f, NZ('2026-10-12', '10:10')); ok(r.skipped === 'soon' && weatherCalls === 1, '10 minutes later: skipped (about every 20 min)');
wx = S; r = await runSunshine(env, f, NZ('2026-10-12', '10:20')); ok(!r.sent && r.streak === 1, 'sun comes out: first check');
r = await runSunshine(env, f, NZ('2026-10-12', '10:40')); ok(r.sent === 1 && pushes.length === 1, 'still sunny: one note sent');
r = await runSunshine(env, f, NZ('2026-10-12', '11:00')); ok(r.skipped === 'sent' && weatherCalls === 3, 'rest of the day: no more checks or notes');
const d = JSON.parse(env.EVENTS_KV.m.get('sunshine-v1'));
ok(d.st.sentDay === '2026-10-12' && typeof d.st.pos === 'number' && d.st.pos === 1, 'state saved (day sent, place in list)');
// failed push: retried next check; gone: removed
const env2 = { EVENTS_KV: kv(), VAPID_PRIVATE_JWK: JSON.stringify(jwk) };
await sunshineRoute('/sunshine/subscribe', { key: KEY, subscription: sub, quiet: true }, env2, f, NZ('2026-10-12', '10:00'));
const fe = async u => u === SUN_URL ? new Response(JSON.stringify({ current: S })) : new Response('', { status: 500 });
await runSunshine(env2, fe, NZ('2026-10-12', '10:00')); r = await runSunshine(env2, fe, NZ('2026-10-12', '10:20'));
ok(r.sent === 0 && JSON.parse(env2.EVENTS_KV.m.get('sunshine-v1')).st.sentDay !== '2026-10-12', 'push failed: not marked sent, tries again');
const fg = async u => u === SUN_URL ? new Response(JSON.stringify({ current: S })) : new Response('', { status: 410 });
await runSunshine(env2, fg, NZ('2026-10-12', '10:40'));
ok(JSON.parse(env2.EVENTS_KV.m.get('sunshine-v1')).subs.length === 0, 'expired push address removed');
ok(SUN_TITLE === '☀️ The sun’s out', 'title: ' + SUN_TITLE);
ok((await sunshineRoute('/sunshine/unsubscribe', { key: KEY, endpoint: sub.endpoint }, env))[1].removed, 'unsubscribe');
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
