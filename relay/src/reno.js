/* 2.26.25: Millesha's Renovation. One small job list shared between My App and Millesha's page, stored in EVENTS_KV under a
   hash of its own key (separate from every other shared list, so it never exposes other My App data). Each entry merges on
   its own `updated` time (newest wins). Writes only when something actually changed. */
const MAX = 300;
const ST = ['todo', 'doing', 'done'];
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
export function normRenoKey(raw) { const s = String(raw || ''); return /^[A-Za-z0-9_-]{32,128}$/.test(s) ? s : ''; }
async function kvKey(k) {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('reno-v1:' + k));
  let hex = ''; for (const b of new Uint8Array(dig)) hex += b.toString(16).padStart(2, '0');
  return 'reno-v1:' + hex;
}
export function cleanReno(x, now = Date.now()) {
  if (!x || typeof x !== 'object') return null;
  const id = String(x.id || ''); if (!/^[A-Za-z0-9_-]{2,64}$/.test(id)) return null;
  const updated = Math.min(Number(x.updated) || 0, now + 5 * 60000); if (!updated) return null;
  const o = { id, updated, by: str(x.by, 40).trim() };
  if ('status' in x) o.status = ST.includes(x.status) ? x.status : 'todo';
  if ('who' in x) o.who = str(x.who, 40).trim();
  if ('notes' in x) o.notes = str(x.notes, 600);
  if ('due' in x) o.due = /^\d{4}-\d{2}-\d{2}$/.test(String(x.due || '')) ? x.due : '';
  if ('floor' in x) o.floor = x.floor === 'tiles' ? 'tiles' : 'carpet';
  if ('deadline' in x) o.deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(x.deadline || '')) ? x.deadline : '';
  if ('count' in x) { const c = Math.floor(Number(x.count)); o.count = c >= 0 && c < 1000 ? c : 0; }
  if ('hidden' in x) o.hidden = !!x.hidden;
  return o;
}
export async function renoRoute(body, env, now = Date.now()) {
  const k = normRenoKey(body && body.key); if (!k) return [403, { error: 'bad_key' }];
  const kv = env && env.EVENTS_KV; if (!kv) return [503, { error: 'not_configured' }];
  const key = await kvKey(k);
  let cur = []; try { cur = JSON.parse(await kv.get(key) || '[]'); } catch (e) { cur = []; }
  const map = new Map(); (Array.isArray(cur) ? cur : []).forEach(x => { const c = cleanReno(x, now); if (c) map.set(c.id, c); });
  let changed = false;
  (Array.isArray(body.items) ? body.items : []).slice(0, MAX).forEach(x => { const c = cleanReno(x, now); if (!c) return; const h = map.get(c.id); if (!h || c.updated > h.updated) { map.set(c.id, c); changed = true; } });
  const items = [...map.values()].slice(-MAX);
  if (changed) await kv.put(key, JSON.stringify(items));
  return [200, { items, at: now }];
}
