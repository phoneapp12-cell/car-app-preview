/* Shopping-list push between My App and Sarah's To-do (My App 2.26.49 / Sarah's To-do 1.10.0).
 * When a new item lands on the shared Shopping list, the other person gets one push per batch:
 * "Shane added to shopping: Milk (Anchor), Bread". Items arriving within about a minute go in one push.
 * Never the person who added it. Each item id is announced once (the phones' self-heal can re-send items).
 * Sarah's phone: her existing Sarah's To-do notification address (sunshine list, same shared key).
 * Shane's phone: My App sends its push address here (/shared-push/subscribe, who: 'shane').
 * Stored in KV under one key: per shared list (hashed), the waiting batch, recently announced ids and
 * Shane's push address(es). Nothing else; no logging. */
import { sendPush, cleanSub, b64u } from './push.js';
import { normSharedKey } from './shared-todo.js';
import { SUN_KEY } from './sunshine.js';

export const SHOP_KEY = 'shop-notify-v1';
export const BATCH_MS = 60 * 1000;      // wait a minute after the first new item so a run of adds goes in one push
const SEEN_MAX = 800, SUBS_MAX = 4, ITEMS_MAX = 40;
const WHO = ['shane', 'sarah'];
const NAME = { shane: 'Shane', sarah: 'Sarah' };
const enc = new TextEncoder();
const hash16 = async s => b64u(await crypto.subtle.digest('SHA-256', enc.encode(s))).slice(0, 16);
export const listHash = k => hash16('shop:' + k);
export const sunHash = k => hash16('sun:' + k);   // how sunshine.js tags Sarah's addresses

const isShopList = l => String(l || '').trim().toLowerCase() === 'shopping';
export function shopLabel(x) {
  const t = String(x.title || '').trim(); const b = x.brand;
  const br = b && !b.any && !b.other ? String(b.brand || '').trim() : '';
  return br && !t.toLowerCase().includes(br.toLowerCase()) ? `${t} (${br})` : t;
}
// New shopping items in this sync: on the merged list, not on the list before, open, on Shopping.
export function newShopItems(before, after) {
  const had = new Set((before || []).map(x => x && x.id));
  return (after || []).filter(x => x && !x.deleted && !x.done && isShopList(x.list) && !had.has(x.id));
}
export function shopBody(labels) {
  const n = labels.length;
  if (n <= 6) return labels.join(', ');
  return labels.slice(0, 5).join(', ') + ` and ${n - 5} more`;
}
async function load(env) { try { return (await env.EVENTS_KV.get(SHOP_KEY, { type: 'json' })) || {}; } catch (e) { return {}; } }
async function store(env, doc) { await env.EVENTS_KV.put(SHOP_KEY, JSON.stringify(doc)); }
function entry(doc, h) {
  const e = doc[h] = doc[h] && typeof doc[h] === 'object' ? doc[h] : {};
  e.seen = Array.isArray(e.seen) ? e.seen : []; e.q = e.q && typeof e.q === 'object' ? e.q : {}; e.subs = e.subs && typeof e.subs === 'object' ? e.subs : {};
  return e;
}

// Called from /shared-todo after a merge that changed the list. Queues new shopping items for the other person.
export async function queueShop(env, key, before, after, now = Date.now()) {
  const fresh = newShopItems(before, after); if (!fresh.length) return { queued: 0 };
  const h = await listHash(key), doc = await load(env), e = entry(doc, h);
  e.sun = await sunHash(key);
  const seen = new Set(e.seen); let queued = 0;
  for (const x of fresh) {
    if (seen.has(x.id)) continue; seen.add(x.id); e.seen.push(x.id);
    const to = x.by === 'shane' ? 'sarah' : 'shane';
    const q = e.q[to] = e.q[to] || { at: now, items: [] };
    if (q.items.length < ITEMS_MAX) q.items.push(shopLabel(x)); else q.more = (q.more || 0) + 1;
    queued++;
  }
  if (!queued) return { queued: 0 };
  e.seen = e.seen.slice(-SEEN_MAX);
  await store(env, doc);
  return { queued };
}

// 2.27.4: shared to-dos Sarah has just ticked off (not done before this sync, done now, ticked by her). Not Shopping or Appointments.
export function newSarahTicks(before, after) {
  const was = new Map((before || []).map(x => [x && x.id, x]));
  return (after || []).filter(x => { if (!x || x.deleted || !x.done || x.doneBy !== 'sarah' || /^(shopping|appointments)$/i.test(String(x.list || '').trim())) return false;
    const b = was.get(x.id); return b && !b.deleted && !b.done; });
}
export async function queueTicks(env, key, before, after, now = Date.now()) {
  const fresh = newSarahTicks(before, after); if (!fresh.length) return { queued: 0 };
  const h = await listHash(key), doc = await load(env), e = entry(doc, h);
  if (e.pref && e.pref.ticks === false) return { queued: 0 };
  const tk = 'tick:'; const seen = new Set(e.seen); let queued = 0;
  for (const x of fresh) { const id = tk + x.id + ':' + (x.doneAt || x.updated); if (seen.has(id)) continue; seen.add(id); e.seen.push(id);
    const q = e.q.ticks = e.q.ticks || { at: now, items: [] }; if (q.items.length < ITEMS_MAX) q.items.push(String(x.title || '').slice(0, 80)); else q.more = (q.more || 0) + 1; queued++; }
  if (!queued) return { queued: 0 };
  e.seen = e.seen.slice(-SEEN_MAX); await store(env, doc); return { queued };
}
// 2.27.5: Shane's phone push address(es), whichever shared list they're under (for the watch step-goal pushes)
export async function shanePush(env, msg, now = Date.now(), fetchImpl = fetch) {
  if (!env || !env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return 0;
  const doc = await load(env), seen = new Set(); let sent = 0;
  for (const h of Object.keys(doc)) for (const s of ((doc[h] && doc[h].subs && doc[h].subs.shane) || [])) { if (seen.has(s.id)) continue; seen.add(s.id); if (await sendPush(s, msg, env, fetchImpl, now) === 'ok') sent++; }
  return sent;
}
async function sarahSubs(env, sunK) {
  try { const d = (await env.EVENTS_KV.get(SUN_KEY, { type: 'json' })) || {}; return (Array.isArray(d.subs) ? d.subs : []).filter(s => s.k === sunK); } catch (e) { return []; }
}
// Send one message straight to Sarah's phone(s) (her Sarah's To-do notifications). Used for WOF status changes.
export async function sarahPush(env, key, msg, now = Date.now(), fetchImpl = fetch) {
  if (!env || !env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return 0;
  const subs = await sarahSubs(env, await sunHash(key)); let sent = 0;
  for (const s of subs) if (await sendPush(s, msg, env, fetchImpl, now) === 'ok') sent++;
  return sent;
}
// Every minute (with reminders): send batches that have waited a minute.
export async function runShop(env, fetchImpl = fetch, now = Date.now()) {
  if (!env || !env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return { sent: 0 };
  const doc = await load(env); let sent = 0, changed = false;
  for (const h of Object.keys(doc)) {
    const e = entry(doc, h);
    for (const to of WHO) {
      const q = e.q[to]; if (!q || now - q.at < BATCH_MS) continue;
      if (to === 'shane' && e.pref && e.pref.shop === false) { delete e.q[to]; changed = true; continue; }
      const from = to === 'shane' ? 'sarah' : 'shane';
      const labels = q.items.concat(q.more ? [`${q.more} more`] : []);
      const subs = to === 'sarah' ? await sarahSubs(env, e.sun) : (e.subs.shane || []);
      const msg = { title: `\u{1F6D2} ${NAME[from]} added to shopping`, body: shopBody(labels), url: to === 'shane' ? '#shopping' : './', tag: 'shop-' + from + '-' + q.at, ttl: 24 * 3600 };
      const gone = new Set();
      for (const s of subs) { const r = await sendPush(s, msg, env, fetchImpl, now); if (r === 'ok') sent++; else if (r === 'gone') gone.add(s.id); }
      if (to === 'shane' && gone.size) e.subs.shane = (e.subs.shane || []).filter(s => !gone.has(s.id));
      delete e.q[to]; changed = true; // one try per batch; the item is on the list either way
    }
    const t = e.q.ticks;
    if (t && now - t.at >= BATCH_MS) {
      const labels = t.items.concat(t.more ? [`${t.more} more`] : []), gone = new Set();
      const msg = { title: '\u2705 Sarah ticked off' + (labels.length > 1 ? ` ${labels.length} to-dos` : ''), body: shopBody(labels), url: '#alerts', tag: 'tick-' + t.at, ttl: 24 * 3600 };
      if (!(e.pref && e.pref.ticks === false)) for (const s of (e.subs.shane || [])) { const r = await sendPush(s, msg, env, fetchImpl, now); if (r === 'ok') sent++; else if (r === 'gone') gone.add(s.id); }
      if (gone.size) e.subs.shane = (e.subs.shane || []).filter(s => !gone.has(s.id));
      delete e.q.ticks; changed = true;
    }
  }
  if (changed) await store(env, doc);
  return { sent };
}

// /shared-push/subscribe, /shared-push/unsubscribe, /shared-push/status (app origin only, POST JSON with the shared key)
const hits = [];
function limited(now) { while (hits.length && now - hits[0] > 3600e3) hits.shift(); if (hits.length >= 30) return true; hits.push(now); return false; }
export async function sharedPushRoute(path, body, env, now = Date.now()) {
  if (!env || !env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return [503, { error: 'push_unavailable' }];
  const key = normSharedKey(body && body.key); if (!key) return [403, { error: 'bad_key' }];
  const who = body && body.who === 'shane' ? 'shane' : '';
  if (!who) return [400, { error: 'bad_who' }]; // Sarah's phone uses her existing Sarah's To-do notifications
  const h = await listHash(key), doc = await load(env), e = entry(doc, h);
  const list = Array.isArray(e.subs[who]) ? e.subs[who] : [];
  const ep = body && (body.endpoint || (body.subscription && body.subscription.endpoint));
  const id = typeof ep === 'string' ? await hash16(ep) : '';
  if (path === '/shared-push/status') return [200, { subscribed: list.some(s => s.id === id), pending: !!e.q[who] }];
  if (path === '/shared-push/unsubscribe') { e.subs[who] = list.filter(s => s.id !== id); await store(env, doc); return [200, { removed: list.length !== e.subs[who].length }]; }
  if (path === '/shared-push/subscribe') {
    if (limited(now)) return [429, { error: 'too_many' }];
    const sub = cleanSub(body && body.subscription); if (!sub) return [400, { error: 'bad_subscription' }];
    const prevId = typeof body.previous === 'string' ? await hash16(body.previous) : '';
    const pref = { shop: body.shop !== false, ticks: body.ticks !== false }, prefCh = JSON.stringify(e.pref || { shop: true, ticks: true }) !== JSON.stringify(pref);
    e.pref = pref; if (prefCh) await store(env, doc);
    const old = list.find(s => s.id === id);
    if (old && old.keys.p256dh === sub.keys.p256dh && old.keys.auth === sub.keys.auth && !prevId) return [200, { subscribed: true, same: true }];
    e.subs[who] = list.filter(s => s.id !== id && s.id !== prevId).concat([{ id, endpoint: sub.endpoint, keys: sub.keys, at: now }]).slice(-SUBS_MAX);
    e.sun = e.sun || await sunHash(key);
    await store(env, doc);
    return [200, { subscribed: true }];
  }
  return [404, { error: 'not_found_route' }];
}
