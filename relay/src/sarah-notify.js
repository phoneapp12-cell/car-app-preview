/* 2.28.3 / Sarah's To-do 1.13.0: full-detail pushes to Sarah's phone.
 * 1) Shane adds a shared to-do or appointment (not Shopping, which shop-notify handles) -> one push per item/batch.
 * 2) Sarah's To-do sends her upcoming reminders (text already worded on her phone); the 1-minute cron pushes each once when due.
 * Stored in KV 'sarah-notify-v1' by hashed list key. No logging. */
import { sendPush } from './push.js';
import { normSharedKey } from './shared-todo.js';
import { sunHash } from './shop-notify.js';
import { SUN_KEY } from './sunshine.js';

export const SN_KEY = 'sarah-notify-v1';
const BATCH_MS = 60 * 1000, SEEN_MAX = 800, REM_MAX = 60, LATE_MS = 30 * 60000;
const str = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
export const fmtD = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(',', '') : '';
export const fmtT = hm => { if (!/^\d\d:\d\d$/.test(hm || '')) return ''; const h = +hm.slice(0, 2), m = hm.slice(3); return (h % 12 || 12) + (m === '00' ? '' : ':' + m) + (h < 12 ? 'am' : 'pm'); };
const isAppt = x => String(x.list || '').trim().toLowerCase() === 'appointments' || !!x.appt;
const isShop = x => String(x.list || '').trim().toLowerCase() === 'shopping';
const TYPE = { doctor: 'Doctor', dentist: 'Dentist', other: '' };

export function todoLine(x) {
  return [x.list && x.list !== 'To-do' ? x.list : '', x.due ? 'Due ' + fmtD(x.due) : '', x.priority === 'high' ? 'High priority' : '', str(x.notes, 200)].filter(Boolean).join(' · ');
}
export function apptLine(x) {
  const a = x.appt || {};
  const when = x.due ? fmtD(x.due) + (a.time ? ' at ' + fmtT(a.time) : '') : '';
  return [TYPE[a.type] || '', when, str(a.place, 100), str(x.notes, 200)].filter(Boolean).join(' · ');
}
// Newly added open items by Shane, not Shopping
export function newShaneItems(before, after) {
  const had = new Set((before || []).map(x => x && x.id));
  return (after || []).filter(x => x && !x.deleted && !x.done && x.by === 'shane' && !isShop(x) && !had.has(x.id));
}
export function batchMsg(items) {
  const ap = items.filter(i => i.k === 'a'), n = items.length;
  if (n === 1) { const i = items[0]; return { title: (i.k === 'a' ? '\u{1F4C5} Shane added an appointment: ' : '\u{1F4CB} Shane added to your list: ') + i.t, body: i.d || (i.k === 'a' ? 'Appointment' : 'To-do') }; }
  const title = ap.length === n ? `\u{1F4C5} Shane added ${n} appointments` : ap.length ? `\u{1F4CB} Shane added ${n} things to your lists` : `\u{1F4CB} Shane added ${n} to-dos`;
  return { title, body: items.slice(0, 8).map(i => i.t + (i.d ? ' (' + i.d + ')' : '')).join('\n') + (n > 8 ? `\nand ${n - 8} more` : '') };
}
async function load(env) { try { return (await env.EVENTS_KV.get(SN_KEY, { type: 'json' })) || {}; } catch (e) { return {}; } }
async function store(env, doc) { await env.EVENTS_KV.put(SN_KEY, JSON.stringify(doc)); }
const ent = (doc, h) => { const e = doc[h] = doc[h] && typeof doc[h] === 'object' ? doc[h] : {}; e.seen = Array.isArray(e.seen) ? e.seen : []; e.rem = Array.isArray(e.rem) ? e.rem : []; e.sent = Array.isArray(e.sent) ? e.sent : []; return e; };

export async function queueShaneAdds(env, key, before, after, now = Date.now()) {
  const fresh = newShaneItems(before, after); if (!fresh.length) return { queued: 0 };
  const h = await sunHash(key), doc = await load(env), e = ent(doc, h), seen = new Set(e.seen); let queued = 0;
  for (const x of fresh) {
    if (seen.has(x.id)) continue; seen.add(x.id); e.seen.push(x.id);
    const q = e.q = e.q || { at: now, items: [] };
    if (q.items.length < 40) q.items.push(isAppt(x) ? { k: 'a', t: str(x.title, 80), d: apptLine(x) } : { k: 't', t: str(x.title, 80), d: todoLine(x) });
    queued++;
  }
  if (!queued) return { queued: 0 };
  e.seen = e.seen.slice(-SEEN_MAX); await store(env, doc); return { queued };
}
// /sunshine/reminders: { key, reminders: [{ id, at, title, body }] } replaces her list of upcoming reminders
export function cleanRem(r, now) {
  if (!r || typeof r !== 'object') return null;
  const id = str(r.id, 80), at = Number(r.at), title = str(r.title, 100);
  if (!/^[\w|:.-]{2,80}$/.test(id) || !title || !(at > now - LATE_MS) || at > now + 40 * 864e5) return null;
  return { id, at, title, body: String(r.body == null ? '' : r.body).slice(0, 300), url: /^\.\/(#[\w-]*)?$/.test(r.url || '') ? r.url : './' };
}
export async function remindersRoute(body, env, now = Date.now()) {
  if (!env || !env.EVENTS_KV) return [503, { error: 'push_unavailable' }];
  const key = normSharedKey(body && body.key); if (!key) return [403, { error: 'bad_key' }];
  const list = (Array.isArray(body.reminders) ? body.reminders : []).map(r => cleanRem(r, now)).filter(Boolean).sort((a, b) => a.at - b.at).slice(0, REM_MAX);
  const doc = await load(env), e = ent(doc, await sunHash(key));
  e.rem = list; await store(env, doc); return [200, { ok: true, count: list.length }];
}
async function subsFor(env, sunK) { try { const d = (await env.EVENTS_KV.get(SUN_KEY, { type: 'json' })) || {}; return (Array.isArray(d.subs) ? d.subs : []).filter(s => s.k === sunK); } catch (e) { return []; } }
export async function runSarahNotify(env, fetchImpl = fetch, now = Date.now()) {
  if (!env || !env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return { sent: 0 };
  const doc = await load(env); let sent = 0, changed = false;
  for (const h of Object.keys(doc)) {
    const e = ent(doc, h), msgs = [];
    if (e.q && now - e.q.at >= BATCH_MS) { msgs.push(Object.assign(batchMsg(e.q.items), { url: './', tag: 'shane-add-' + e.q.at })); delete e.q; changed = true; }
    const sentSet = new Set(e.sent);
    for (const r of e.rem) if (r.at <= now && now - r.at < LATE_MS && !sentSet.has(r.id + '@' + r.at)) { msgs.push({ title: r.title, body: r.body, url: r.url, tag: 'rem-' + r.id }); e.sent.push(r.id + '@' + r.at); changed = true; }
    const before = e.rem.length; e.rem = e.rem.filter(r => now - r.at < LATE_MS); if (e.rem.length !== before) changed = true;
    e.sent = e.sent.slice(-300);
    if (!msgs.length) continue;
    const subs = await subsFor(env, h);
    for (const m of msgs) for (const s of subs) if (await sendPush(s, Object.assign({ ttl: 6 * 3600 }, m), env, fetchImpl, now) === 'ok') sent++;
  }
  if (changed) await store(env, doc);
  return { sent };
}
