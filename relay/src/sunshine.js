/* Sunshine notes for the shared to-do app (Sarah's To-do).
 *
 * The app can turn on notifications; its push address is kept here, apart from My App's own push list.
 * On the 10-minute cron, during the day, the current weather for Onerahi is read from Open-Meteo about every
 * 20 minutes. When it has been clear or mainly clear for two checks in a row, one short friendly note is sent:
 * at most one per New Zealand day, only between 8 am and 8 pm. Notes go round the whole list before any repeat.
 * Stored in KV: the push addresses (address and keys only) and a small state record. No AI, no logging.
 */
import { sendPush, cleanSub, b64u } from './push.js';
import { normSharedKey } from './shared-todo.js';

export const SUN_KEY = 'sunshine-v1';
export const SUN_PLACE = { lat: -35.7251, lon: 174.3237 };
export const SUN_URL = `https://api.open-meteo.com/v1/forecast?latitude=${SUN_PLACE.lat}&longitude=${SUN_PLACE.lon}&current=weather_code,is_day,cloud_cover&timezone=Pacific%2FAuckland`;
export const SUN_FROM = 8, SUN_TO = 20;        // send window, NZ hours (8 am up to 8 pm)
const CHECK_MS = 18 * 60 * 1000;               // weather read about every 20 minutes (the cron runs every 10)
const STREAK_GAP_MS = 45 * 60 * 1000;          // a longer gap between checks starts the count again
const MAX_SUBS = 6;
export const SUN_TITLE = '\u2600\uFE0F The sun\u2019s out';
export const SUN_NOTES = [
  "The sun’s out, and so is your quiet strength.",
  "A bit of sunshine for someone who brings plenty of her own.",
  "You make ordinary days feel warmer just by being in them.",
  "The sky cleared up. Hope you get a minute to enjoy it.",
  "You’re doing a lot more than anyone sees, and it matters.",
  "Sunshine looks good on you.",
  "Step outside for a moment if you can. The warmth is for you.",
  "You have a kind heart, and people notice it.",
  "Here’s a little light for your day.",
  "You’re someone people are lucky to have around.",
  "The sun found its way through. So do you, every time.",
  "A clear sky, and a reminder that you’re appreciated.",
  "You don’t have to do everything today. You’re enough as you are.",
  "The light’s lovely right now. Hope it finds you.",
  "Your kindness makes a real difference to the people around you.",
  "Blue sky, warm sun, and you. Good combination.",
  "You’ve got a way of making a house feel like home.",
  "The sun came out to say hello.",
  "You’re allowed to take a slow moment and just enjoy this.",
  "Someone out there is grateful for you today.",
  "A sunny moment for a lovely person.",
  "You bring calm to the people who need it.",
  "The clouds moved on. Enjoy the warmth while it’s here.",
  "You’re braver than you know, and kinder than most.",
  "A little sunshine, a little reminder: you’re wonderful.",
  "Hope the sun on your face feels as good as you deserve.",
  "You give so much. Take a little of this light for yourself.",
  "It’s a bright one out there. A bit like you.",
  "You make the people around you feel cared for.",
  "The sky’s clear. Take a deep breath of it.",
  "You’re doing a good job. Really.",
  "Some warmth for you, straight from the sky.",
  "Lucky world, having you in it.",
  "Sunshine’s here. Maybe a cuppa outside?",
  "Your smile is one of the best things about any day.",
  "Here’s to you, and to blue skies.",
  "You have a gift for making little moments special.",
  "A patch of sun, just for you.",
  "You’re thought of more than you know.",
  "The light’s out. Let it warm your shoulders for a minute.",
  "You’re good company, even on the quiet days.",
  "The sun’s shining, and you’re one of the reasons today is good.",
  "You handle so much with so much grace.",
  "Bright skies for a bright soul.",
  "You matter, exactly as you are.",
  "Sunshine break. You’ve earned it.",
  "You have a beautiful way of looking after people.",
  "A clear sky can make everything feel a bit lighter. Enjoy it.",
  "You’re loved, simply for being you.",
  "Here comes the sun. Hope it brightens your afternoon.",
  "You notice the little things, and that’s a lovely quality.",
  "It’s warm out. Let yourself soak it up.",
  "You’ve got more patience than most, and it shows.",
  "A sunny hello for you.",
  "You make hard work look easy, and that’s no small thing.",
  "The sun’s out. A good excuse to pause.",
  "You’re a lot of good things rolled into one.",
  "Light on the garden, light on you.",
  "You deserve good things, today and every day.",
  "The sky turned blue just in time for you.",
  "You’re the kind of person others feel safe around.",
  "Hope this sunshine finds you somewhere comfy.",
  "Your warmth rubs off on everyone near you.",
  "The sun’s doing its thing. You keep doing yours.",
  "You bring a little brightness wherever you go.",
  "A golden moment outside, if you want it.",
  "You’re appreciated in more ways than you realise.",
  "Sunshine, fresh air, and a moment just for you.",
  "You’ve got a lovely way with people.",
  "The day just got brighter. Hope yours does too.",
  "You are a good person, through and through.",
  "Warm sun, soft breeze, kind heart. That’s you.",
  "You make the everyday feel special.",
  "A bit of sky to brighten your to-do list.",
  "You’re worth slowing down for.",
  "The sun is out and the day is yours.",
  "You’ve got a strength that’s gentle, and that’s the best kind.",
  "Here’s some sunshine to go with your cup of tea.",
  "You make people feel welcome, every single time.",
  "The sky’s putting on a show. Have a look.",
  "You’re a bright spot in a lot of people’s days.",
  "Hope the sun reminds you how lovely you are.",
  "You do so much for others. Here’s something nice for you.",
  "Clear skies and good thoughts, headed your way.",
  "You’ve got a heart as warm as this sunshine.",
  "The sun’s out. Even five minutes in it counts.",
  "You are valued and you are loved.",
  "Sunlight on the deck, and a moment of quiet for you.",
  "You make the people you love feel lucky.",
  "A sunny little nudge to be kind to yourself today.",
  "You shine in your own quiet way.",
  "It’s lovely outside. Hope you get a peek.",
  "You’ve got a good eye for beautiful things.",
  "Here’s a little warmth, with love from the sky.",
  "You’re one of a kind, and that’s a good thing.",
  "The sun showed up. It knew you’d appreciate it.",
  "You bring out the best in people.",
  "Blue sky above, good things ahead.",
  "You’re someone worth celebrating, any day of the week.",
  "A bright moment, just because.",
  "You have a calm about you that people treasure.",
  "The sunshine’s free. Help yourself.",
  "You’re doing beautifully.",
  "Let the sun warm you up for a minute. You deserve a break.",
  "Your laugh is one of the best sounds there is.",
  "A gentle bit of sunshine for a gentle soul.",
  "You’re cared about, today and always.",
  "The clouds cleared. Enjoy the view.",
  "You make the world a softer, kinder place.",
  "Hope the light outside matches the light you bring.",
  "You’re a treasure, and it’s worth saying out loud.",
  "A sunny moment for the person who makes home feel like home.",
  "You’ve got this, and you’ve got people who love you.",
  "Sunshine, and a reminder to take things at your own pace.",
  "You make a difference, more than you know.",
  "The sun’s out. Go on, stand in it for a bit.",
  "You are so much more than your to-do list.",
  "A bright patch of sky, sent your way.",
  "You’re lovely. That’s all. Enjoy the sun.",
  "The sun’s out over Onerahi. Hope you catch a bit of it."
];

const enc = new TextEncoder();
const hash16 = async s => b64u(await crypto.subtle.digest('SHA-256', enc.encode(s))).slice(0, 16);
export function nzNow(now = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(now)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, minute: +p.minute };
}
export const inWindow = now => { const h = nzNow(now).hour; return h >= SUN_FROM && h < SUN_TO; };
// Clear (0) or mainly clear (1), in daylight, and not mostly cloud
export function isSunny(cur) {
  if (!cur || typeof cur !== 'object') return false;
  const code = Number(cur.weather_code), day = Number(cur.is_day), cc = cur.cloud_cover == null ? null : Number(cur.cloud_cover);
  return day === 1 && (code === 0 || code === 1) && (cc == null || !Number.isFinite(cc) || cc <= 50);
}
// One weather reading -> new state and whether to send now. Pure.
export function planSun(st, cur, now = Date.now()) {
  st = Object.assign({ streak: 0, lastAt: 0, sentDay: '' }, st || {});
  const nz = nzNow(now), sunny = isSunny(cur);
  if (!st.lastAt || now - st.lastAt > STREAK_GAP_MS) st.streak = 0;
  st.streak = sunny ? Math.min((st.streak || 0) + 1, 99) : 0;
  st.lastAt = now; st.lastCode = cur && cur.weather_code != null ? Number(cur.weather_code) : null;
  const send = sunny && st.streak >= 2 && st.sentDay !== nz.date && nz.hour >= SUN_FROM && nz.hour < SUN_TO;
  return { st, send, date: nz.date };
}
// Next note: a shuffled order, all of them before any repeat, never the same twice in a row. Returns [index, state].
export function nextNote(st, rnd = Math.random) {
  st = Object.assign({}, st || {});
  const n = SUN_NOTES.length;
  const shuffle = avoid => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (n > 1 && a[0] === avoid) [a[0], a[1]] = [a[1], a[0]]; return a; };
  if (!Array.isArray(st.order) || st.order.length !== n || typeof st.pos !== 'number') { st.order = shuffle(st.last == null ? -1 : st.last); st.pos = 0; }
  if (st.pos >= n) { st.order = shuffle(st.last == null ? -1 : st.last); st.pos = 0; }
  const i = st.order[st.pos]; st.pos += 1; st.last = i;
  return [i, st];
}
// Seconds until 8 pm NZ today (so a phone that was off doesn't get it late at night), at most 3 hours
export function ttlFor(now = Date.now()) { const z = nzNow(now); const left = ((SUN_TO - z.hour) * 60 - z.minute) * 60; return Math.max(60, Math.min(3 * 3600, left)); }

async function load(env) { try { return (await env.EVENTS_KV.get(SUN_KEY, { type: 'json' })) || {}; } catch (e) { return {}; } }
async function store(env, doc) { await env.EVENTS_KV.put(SUN_KEY, JSON.stringify(doc)); }

// Cron (every 10 minutes). Does nothing outside 8 am to 8 pm, with nobody signed up, or once today's note has gone.
export async function runSunshine(env, fetchImpl = fetch, now = Date.now(), rnd = Math.random) {
  if (!env || !env.EVENTS_KV || !env.VAPID_PRIVATE_JWK || !inWindow(now)) return { skipped: 'window' };
  const doc = await load(env);
  const subs = Array.isArray(doc.subs) ? doc.subs : [];
  const st = doc.st || {};
  if (!subs.length) return { skipped: 'nobody' };
  if (st.sentDay === nzNow(now).date) return { skipped: 'sent' };
  if (st.lastAt && now - st.lastAt < CHECK_MS) return { skipped: 'soon' };
  let cur = null;
  try {
    const r = await fetchImpl(SUN_URL, { headers: { 'Accept': 'application/json' } });
    if (r.ok) cur = ((await r.json()) || {}).current || null;
  } catch (e) { cur = null; }
  if (!cur) return { skipped: 'weather' };
  const p = planSun(st, cur, now);
  doc.st = p.st;
  let sent = 0;
  if (p.send) {
    const [i, ns] = nextNote(p.st, rnd);
    const msg = { title: SUN_TITLE, body: SUN_NOTES[i], url: './', tag: 'sunshine', ttl: ttlFor(now) };
    const gone = new Set();
    for (const s of subs) { const r = await sendPush(s, msg, env, fetchImpl, now); if (r === 'ok') sent++; else if (r === 'gone') gone.add(s.id); }
    doc.subs = subs.filter(s => !gone.has(s.id));
    if (sent) { doc.st = Object.assign(ns, { sentDay: p.date, sentAt: now }); }
  }
  await store(env, doc);
  return { sunny: isSunny(cur), streak: doc.st.streak, sent };
}

// ---- Routes: /sunshine/subscribe, /sunshine/unsubscribe, /sunshine/status (app origin only, POST JSON with the shared list key) ----
const hits = [];
function limited(now) { while (hits.length && now - hits[0] > 3600e3) hits.shift(); if (hits.length >= 30) return true; hits.push(now); return false; }
export async function sunshineRoute(path, body, env, fetchImpl = fetch, now = Date.now()) {
  if (!env || !env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return [503, { error: 'push_unavailable' }];
  const key = normSharedKey(body && body.key);
  if (!key) return [403, { error: 'bad_key' }];
  const k = await hash16('sun:' + key);
  const doc = await load(env); doc.subs = Array.isArray(doc.subs) ? doc.subs : [];
  if (path === '/sunshine/status') {
    const ep = body && body.endpoint; const id = typeof ep === 'string' ? await hash16(ep) : '';
    return [200, { subscribed: doc.subs.some(s => s.id === id && s.k === k) }];
  }
  if (path === '/sunshine/unsubscribe') {
    const ep = body && body.endpoint; const id = typeof ep === 'string' ? await hash16(ep) : '';
    const before = doc.subs.length; doc.subs = doc.subs.filter(s => !(s.id === id && s.k === k));
    if (doc.subs.length !== before) await store(env, doc);
    return [200, { removed: doc.subs.length !== before }];
  }
  if (path === '/sunshine/subscribe') {
    if (limited(now)) return [429, { error: 'too_many' }];
    const sub = cleanSub(body && body.subscription); if (!sub) return [400, { error: 'bad_subscription' }];
    const id = await hash16(sub.endpoint);
    const prevId = body && typeof body.previous === 'string' ? await hash16(body.previous) : '';
    doc.subs = doc.subs.filter(s => s.id !== id && !(prevId && s.id === prevId && s.k === k));
    doc.subs.push({ id, k, endpoint: sub.endpoint, keys: sub.keys, at: now });
    doc.subs = doc.subs.slice(-MAX_SUBS);
    await store(env, doc);
    if (body.quiet) return [200, { subscribed: true }];
    const r = await sendPush(sub, { title: 'Sarah\u2019s To-do', body: 'Notifications are on.', url: './', tag: 'notify-on', ttl: 600 }, env, fetchImpl, now);
    return [200, { subscribed: true, test: r }];
  }
  return [404, { error: 'not_found_route' }];
}
