/* Shared to-do list between Sarah's To-do app and My App (2.22.94).
   One small list in the existing EVENTS_KV binding, under a hash of the shared key (the key itself is not stored).
   Each item merges on its own `updated` time (newest wins), so a tick on one phone and a new item on the other
   never overwrite each other. Deletes are kept as short tombstones so they don't come back. No AI, nothing logged. */
export const SHARED_MAX_ITEMS = 500;
const TOMBSTONE_MS = 60 * 24 * 3600 * 1000;
const PRI = ['high', 'normal', 'low'];

export function normSharedKey(raw) {
  const s = String(raw || '');
  return /^[A-Za-z0-9_-]{32,128}$/.test(s) ? s : '';
}
async function kvKey(k) {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('shared-todo-v1:' + k));
  let hex = ''; for (const b of new Uint8Array(dig)) hex += b.toString(16).padStart(2, '0');
  return 'shared-todo-v1:' + hex;
}
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
export function cleanItem(x, now = Date.now()) {
  if (!x || typeof x !== 'object') return null;
  const id = String(x.id || '');
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return null;
  const updated = Math.min(Number(x.updated) || 0, now + 5 * 60000);
  if (!updated) return null;
  if (x.deleted) return { id, deleted: true, updated };
  const title = str(x.title, 120).trim(); if (!title) return null;
  return {
    id, title, list: str(x.list, 24).trim() || 'To-do', due: /^\d{4}-\d{2}-\d{2}$/.test(String(x.due || '')) ? x.due : '',
    notes: str(x.notes, 1000), priority: PRI.includes(x.priority) ? x.priority : 'normal', done: !!x.done,
    doneAt: x.done ? Number(x.doneAt) || updated : 0, created: Number(x.created) || updated, by: x.by === 'shane' ? 'shane' : 'sarah', updated
  };
}
export function mergeItems(cur, incoming, now = Date.now()) {
  const map = new Map();
  (Array.isArray(cur) ? cur : []).forEach(x => { const c = cleanItem(x, now); if (c) map.set(c.id, c); });
  let changed = false;
  (Array.isArray(incoming) ? incoming : []).slice(0, SHARED_MAX_ITEMS).forEach(x => {
    const c = cleanItem(x, now); if (!c) return;
    const have = map.get(c.id);
    if (!have || c.updated > have.updated) { map.set(c.id, c); changed = true; }
  });
  let out = [...map.values()].filter(x => !x.deleted || now - x.updated < TOMBSTONE_MS);
  if (out.length > SHARED_MAX_ITEMS) { // drop the oldest finished ones first
    out.sort((a, b) => (a.deleted || a.done ? 0 : 1) - (b.deleted || b.done ? 0 : 1) || a.updated - b.updated);
    out = out.slice(out.length - SHARED_MAX_ITEMS); changed = true;
  }
  return { items: out, changed };
}
// body: { key, items?: [...] }. Returns the whole list (tombstones included, so phones can drop deleted items).
export async function sharedTodoRoute(body, env, now = Date.now()) {
  const k = normSharedKey(body && body.key);
  if (!k) return [403, { error: 'bad_key' }];
  if (!env || !env.EVENTS_KV || typeof env.EVENTS_KV.get !== 'function') return [503, { error: 'shared_unavailable' }];
  const key = await kvKey(k);
  let cur = null;
  try { cur = await env.EVENTS_KV.get(key, { type: 'json' }); } catch (e) { cur = null; }
  const items = cur && Array.isArray(cur.items) ? cur.items : [];
  const inc = body && Array.isArray(body.items) ? body.items : [];
  if (inc.length > SHARED_MAX_ITEMS) return [413, { error: 'too_many' }];
  const m = mergeItems(items, inc, now);
  let rev = cur && Number(cur.rev) || 0;
  if (m.changed) { rev += 1; await env.EVENTS_KV.put(key, JSON.stringify({ rev, updatedAt: new Date(now).toISOString(), items: m.items })); }
  return [200, { ok: true, rev, items: m.items, now }];
}
