// node test/push.test.mjs – bridge closure push alerts: planning, subscriptions, routes, cron (no network)
import crypto from 'crypto';
import { planAlerts, cleanSub, endpointAllowed, whenTxt, runAlerts, b64u, encryptPayload } from '../src/push.js';
import { handle } from '../src/relay.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const O = 'https://phoneapp12-cell.github.io';
const at = s => Date.parse(s); // UTC; NZ is +13 in Oct
const C1 = { id: 'wdc-closure-a-0', title: 'Te Matau a Pohe bridge maintenance', where: 'Dave Culham Drive, Whangārei 0110', url: 'u1', dates: [{ start: '2026-10-02', end: '2026-10-02', time: '20:00', endTime: '23:00' }] };
const C2 = { id: 'wdc-closure-b-0', title: 'Rally closures', where: 'Dave Culham Drive', url: 'u2', dates: [{ start: '2026-10-10', end: '2026-10-11', time: '08:00', endTime: '17:00' }] };

// wording
ok(whenTxt(C1.dates[0]) === 'Fri 2 Oct, 8 pm to 11 pm', 'one-day wording: ' + whenTxt(C1.dates[0]));
ok(whenTxt(C2.dates[0]) === 'Sat 10 Oct 8 am to Sun 11 Oct 5 pm', 'multi-day wording: ' + whenTxt(C2.dates[0]));

// planning
let p = planAlerts({ closures: [C1] }, null, at('2026-09-28T22:00:00Z')); // 11 am Tue NZ
ok(p.msgs.length === 0 && p.alerts.seeded && p.alerts.announced[C1.id] && p.changed, 'first run: existing closures are noted, not announced');
p = planAlerts({ closures: [C1, C2] }, p.alerts, at('2026-09-28T23:00:00Z'));
ok(p.msgs.length === 1 && /new closure/.test(p.msgs[0].title) && /Rally closures\. Sat 10 Oct/.test(p.msgs[0].body) && p.msgs[0].url === '#bridge', 'new notice announced: ' + p.msgs[0].body);
const a2 = p.alerts;
p = planAlerts({ closures: [C1, C2] }, a2, at('2026-09-28T23:10:00Z'));
ok(p.msgs.length === 0 && !p.changed, 'not announced twice');
p = planAlerts({ closures: [C1, C2, { ...C2, id: 'x-new' }] }, a2, at('2026-09-29T09:30:00Z')); // 10:30 pm NZ
ok(p.msgs.length === 0 && !p.alerts.announced['x-new'], 'overnight: new notice waits');
p = planAlerts({ closures: [C1, C2, { ...C2, id: 'x-new' }] }, a2, at('2026-09-29T18:05:00Z')); // 7:05 am NZ
ok(p.msgs.length === 1 && p.alerts.announced['x-new'], '… and is sent after 7 am');
p = planAlerts({ closures: [C1, C2] }, a2, at('2026-10-01T04:00:00Z')); // 5 pm Thu 1 Oct NZ
ok(p.msgs.length === 0, 'no reminder before 6 pm the evening before');
p = planAlerts({ closures: [C1, C2] }, a2, at('2026-10-01T05:05:00Z')); // 6:05 pm Thu 1 Oct NZ
ok(p.msgs.length === 1 && p.msgs[0].title === 'Tomorrow: bridge closure from 8 pm to 11 pm', 'reminder at 6 pm the evening before: ' + (p.msgs[0] || {}).title);
p = planAlerts({ closures: [C1, C2] }, p.alerts, at('2026-10-01T06:00:00Z'));
ok(p.msgs.length === 0, 'reminder only once');
const C3 = { ...C1, id: 'late', dates: [{ start: '2026-10-02', end: '2026-10-02', time: '09:00', endTime: '15:00' }] };
p = planAlerts({ closures: [C1, C3] }, { ...a2, reminded: { [C1.id + '|2026-10-02']: 1 } }, at('2026-10-01T05:30:00Z'));
ok(p.msgs.length === 1 && /new closure/.test(p.msgs[0].title), 'notice for tomorrow found in the evening: one alert, not two');
const many = [1, 2, 3, 4, 5].map(i => ({ ...C2, id: 'm' + i }));
p = planAlerts({ closures: many }, { seeded: true }, at('2026-09-28T23:00:00Z'));
ok(p.msgs.length === 1 && /5 updates/.test(p.msgs[0].body), 'lots at once: one summary');

// subscriptions
const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
const SUB = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc:def', keys: { p256dh: b64u(ua.getPublicKey()), auth: b64u(crypto.randomBytes(16)) } };
ok(cleanSub(SUB) && !cleanSub({ ...SUB, endpoint: 'https://evil.example/x' }) && !cleanSub({ ...SUB, endpoint: 'http://fcm.googleapis.com/x' }) && !cleanSub({ ...SUB, keys: { p256dh: 'abc', auth: 'x' } }), 'only real push services and valid keys accepted');
ok(endpointAllowed('https://wns2-par02p.notify.windows.com/w/?token=x') && endpointAllowed('https://web.push.apple.com/abc') && !endpointAllowed('https://notify.windows.com.evil.example/'), 'push host allowlist');
const body = await encryptPayload(SUB, 'hello');
ok(body.length === 16 + 4 + 1 + 65 + 5 + 1 + 16 && body[20] === 65, 'encrypted body has the aes128gcm header');

// routes + cron
const kp = await crypto.webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const mem = {};
const env = { ALLOWED_ORIGIN: O, VAPID_PRIVATE_JWK: JSON.stringify(await crypto.webcrypto.subtle.exportKey('jwk', kp.privateKey)), VAPID_PUBLIC: 'pub',
  EVENTS_KV: { get: async k => mem[k] ? JSON.parse(mem[k]) : null, put: async (k, v) => { mem[k] = v; } } };
const sent = []; let pushStatus = 201;
const fake = async (url, o) => { sent.push({ url, o }); return new Response('', { status: pushStatus }); };
const post = (path, data, origin = O) => handle(new Request('https://relay.example' + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), env, fake);
let r = await post('/push/subscribe', { subscription: SUB }, 'https://evil.example');
ok(r.status === 403 && !sent.length, 'other sites can’t subscribe');
r = await post('/push/subscribe', { subscription: { ...SUB, endpoint: 'https://evil.example/x' } });
ok(r.status === 400 && !sent.length, 'non-push endpoint refused, nothing sent');
r = await post('/push/subscribe', { subscription: SUB });
let j = await r.json();
ok(r.status === 200 && j.subscribed && j.test === 'ok' && sent.length === 1 && sent[0].url === SUB.endpoint && /^vapid t=/.test(sent[0].o.headers.Authorization), 'subscribe saves it and sends a “turned on” notification');
ok(JSON.parse(mem['push-subs-v1']).length === 1 && !/abc:def/.test(JSON.stringify(Object.keys(mem))), 'one subscription saved');
r = await post('/push/subscribe', { subscription: SUB, quiet: true }); ok(r.status === 200 && sent.length === 1 && JSON.parse(mem['push-subs-v1']).length === 1, 'quiet re-register: no notification, no duplicate');
r = await post('/push/status', { endpoint: SUB.endpoint }); ok((await r.json()).subscribed === true, 'status: subscribed');
r = await post('/push/test', { endpoint: SUB.endpoint }); ok((await r.json()).test === 'ok' && sent.length === 2, 'test notification');
r = await post('/push/test', { endpoint: 'https://fcm.googleapis.com/fcm/send/other' }); ok(r.status === 404 && sent.length === 2, 'test only for saved subscriptions');
r = await handle(new Request('https://relay.example/push/status', { headers: { Origin: O } }), env, fake); ok(r.status === 405, 'GET refused');

const state = { listAt: 1, list: [{ url: 'u1', title: C1.title, desc: '', where: C1.where }], pages: { u1: { at: 1, entries: [{ where: C1.where, desc: '', dates: C1.dates }] } } };
sent.length = 0;
let res = await runAlerts(env, state, fake, at('2026-09-28T22:00:00Z'));
ok(res.sent === 0 && mem['push-alerts-v1'], 'cron first run: notes existing closures');
state.list.push({ url: 'u2', title: 'Te Matau a Pohe night works', desc: '', where: 'Dave Culham Drive' });
res = await runAlerts(env, state, fake, at('2026-09-28T22:10:00Z'));
ok(res.sent === 0, 'new notice whose page hasn’t been read yet waits for its dates');
state.pages.u2 = { at: 2, entries: [{ where: 'Dave Culham Drive', desc: '', dates: [{ start: '2026-10-06', end: '2026-10-06', time: '21:00', endTime: '05:00' }] }] };
res = await runAlerts(env, state, fake, at('2026-09-28T22:20:00Z'));
ok(res.sent === 1 && sent.length === 1, 'then it’s announced by push');
pushStatus = 410; state.list.push({ url: 'u3', title: 'Dave Culham Drive resurfacing', desc: '', where: '' }); state.pages.u3 = { at: 3, entries: null, skipped: true };
res = await runAlerts(env, state, fake, at('2026-09-28T22:30:00Z'));
ok(res.removed === 1 && JSON.parse(mem['push-subs-v1']).length === 0, 'expired subscription (410) removed');
r = await post('/push/unsubscribe', { endpoint: SUB.endpoint }); ok(r.status === 200, 'unsubscribe ok');
ok(!/console\.log/.test((await import('fs')).readFileSync(new URL('../src/push.js', import.meta.url), 'utf8')), 'no logging in push.js');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
