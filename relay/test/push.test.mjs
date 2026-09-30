// node test/push.test.mjs – bridge closure push alerts: planning, subscriptions, routes, cron (no network)
import crypto from 'crypto';
import { planAlerts, cleanSub, endpointAllowed, whenTxt, runAlerts, b64u, encryptPayload, aucklandDue, setReminders, runReminders, subscribe } from '../src/push.js';
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

// Reminders: exact Auckland minute, including evening and weekend. No 7 am hold.
const satNight = aucklandDue('2026-10-03', '22:15');
ok(satNight === Date.parse('2026-10-03T09:15:00Z'), 'Sat 10:15 pm NZDT is 09:15 UTC');
const sunEarly = aucklandDue('2026-10-04', '02:00');
ok(sunEarly === Date.parse('2026-10-03T13:00:00Z'), 'Sun 2:00 am NZDT is 13:00 UTC Saturday');
ok(aucklandDue('2026-02-31', '10:00') === null && aucklandDue('2026-10-03', '24:00') === null, 'impossible dates and times rejected');

const memR = {};
const envR = { ALLOWED_ORIGIN: O, VAPID_PRIVATE_JWK: env.VAPID_PRIVATE_JWK, VAPID_PUBLIC: 'pub',
  EVENTS_KV: { get: async k => memR[k] ? JSON.parse(memR[k]) : null, put: async (k, v) => { memR[k] = v; } } };
const sentR = [];
const fakeR = async (url, o) => { sentR.push({ url, o }); return new Response('', { status: 201 }); };
const postR = (path, data) => handle(new Request('https://relay.example' + path, { method: 'POST', headers: { Origin: O, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), envR, fakeR);
const REM = { id: 'rem-parcel1', title: 'Pick up the parcel', date: '2026-10-03', time: '22:15' };
let rr = await postR('/push/reminders', { subscription: SUB, reminders: [REM] });
let rj = await rr.json();
ok(rr.status === 200 && rj.saved === 1 && sentR.length === 0, 'saving a reminder does not push yet and does not send a bridge “on” notice');
ok(JSON.parse(memR['push-subs-v1'])[0].bridge === false, 'reminder-only subscription is not opted into bridge alerts');
let fired = await runReminders(envR, fakeR, satNight - 60 * 1000);
ok(fired.sent === 0 && sentR.length === 0, 'one minute early: nothing sent');
fired = await runReminders(envR, fakeR, satNight);
ok(fired.sent === 1 && sentR.length === 1, 'fires at the chosen minute');
ok(sentR[0].url === SUB.endpoint, 'reminder uses the same push endpoint');
fired = await runReminders(envR, fakeR, satNight + 60 * 1000);
ok(fired.sent === 0 && sentR.length === 1, 'does not fire again the next minute');

// Evening and overnight are not held until 7 am (bridge alerts still are; covered above).
sentR.length = 0;
const early = { id: 'rem-early01', title: 'Early start', date: '2026-10-04', time: '02:00' };
rr = await postR('/push/reminders', { subscription: SUB, reminders: [early] });
ok((await rr.json()).saved === 1, 'replaced the list with a 2 am reminder');
fired = await runReminders(envR, fakeR, sunEarly);
ok(fired.sent === 1 && sentR.length === 1, '2 am Sunday fires immediately, not held until 7 am');

// Edit moves the time; delete cancels.
sentR.length = 0;
const moved = { id: 'rem-early01', title: 'Early start', date: '2026-10-04', time: '02:05' };
await postR('/push/reminders', { subscription: SUB, reminders: [moved] });
fired = await runReminders(envR, fakeR, sunEarly);
ok(fired.sent === 0 && sentR.length === 0, 'edited reminder does not fire at the old time');
fired = await runReminders(envR, fakeR, sunEarly + 5 * 60 * 1000);
ok(fired.sent === 1, 'edited reminder fires at the new time');
sentR.length = 0;
await postR('/push/reminders', { subscription: SUB, reminders: [] });
fired = await runReminders(envR, fakeR, sunEarly + 5 * 60 * 1000);
ok(fired.sent === 0 && !memR['push-reminders-v1']?.includes('rem-early01') && sentR.length === 0, 'delete cancels the pending notification');

// Bridge alerts still go to a bridge subscription, and not to a reminder-only one.
const memB = {};
const envB = { ALLOWED_ORIGIN: O, VAPID_PRIVATE_JWK: env.VAPID_PRIVATE_JWK, VAPID_PUBLIC: 'pub',
  EVENTS_KV: { get: async k => memB[k] ? JSON.parse(memB[k]) : null, put: async (k, v) => { memB[k] = v; } } };
const sentB = [];
const fakeB = async (url, o) => { sentB.push(url); return new Response('', { status: 201 }); };
await setReminders(envB, SUB, [{ id: 'rem-only0001', title: 'Only me', date: '2026-10-10', time: '09:00' }], at('2026-10-01T00:00:00Z'));
const stB = { listAt: 1, list: [{ url: 'u9', title: 'New bridge works', desc: '', where: 'Dave Culham Drive' }], pages: { u9: { at: 1, entries: [{ where: 'Dave Culham Drive', desc: '', dates: [{ start: '2026-10-12', end: '2026-10-12', time: '09:00', endTime: '15:00' }] }] } } };
await runAlerts(envB, stB, fakeB, at('2026-09-28T22:00:00Z')); // seed
stB.list.push({ url: 'u10', title: 'Extra works', desc: '', where: 'Dave Culham Drive' });
stB.pages.u10 = { at: 2, entries: [{ where: 'Dave Culham Drive', desc: '', dates: [{ start: '2026-10-20', end: '2026-10-20', time: '10:00', endTime: '12:00' }] }] };
let ba = await runAlerts(envB, stB, fakeB, at('2026-09-28T23:00:00Z'));
ok(ba.sent === 0 && sentB.length === 0, 'reminder-only phone does not get bridge alerts');
await subscribe(envB, SUB, at('2026-09-28T23:10:00Z'), { bridge: true });
ba = await runAlerts(envB, { ...stB, list: stB.list.concat([{ url: 'u11', title: 'Later works', desc: '', where: 'Dave Culham Drive' }]), pages: { ...stB.pages, u11: { at: 3, entries: [{ where: 'Dave Culham Drive', desc: '', dates: [{ start: '2026-10-21', end: '2026-10-21', time: '10:00', endTime: '11:00' }] }] } } }, fakeB, at('2026-09-28T23:20:00Z'));
ok(ba.sent === 1, 'turning bridge on still sends a bridge alert');

// Turning bridge off while a reminder is pending keeps the subscription.
const off = await (await postR('/push/reminders', { subscription: SUB, reminders: [{ id: 'rem-keep0001', title: 'Keep me', date: '2026-12-01', time: '18:00' }] })).json();
ok(off.saved === 1, 'reminder stored before bridge-off');
// that phone is bridge false already; subscribe as bridge on then unsubscribe
await subscribe(envR, SUB, Date.now(), { bridge: true });
const un = await (await postR('/push/unsubscribe', { endpoint: SUB.endpoint })).json();
ok(un.kept === true && un.removed === false && JSON.parse(memR['push-subs-v1'])[0].bridge === false, 'bridge off keeps the push address while a reminder is pending');
const still = JSON.parse(memR['push-reminders-v1']);
ok(Object.values(still).some(b => (b.items || []).some(i => i.id === 'rem-keep0001')), 'pending reminder survives bridge off');

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
