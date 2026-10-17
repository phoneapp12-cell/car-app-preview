/* 2.26.57: Akahu (NZ open banking, read-only personal app) for My App's Cash flow page.
   The User Access Token and App ID Token are sent once from Settings, checked against Akahu /me, then stored
   here only, encrypted with AES-GCM using the Worker secret AKAHU_ENC_KEY. They are never sent back.
   Connect returns a random device key (only its SHA-256 is kept). Reading, refreshing and disconnecting need it.
   Connecting again needs that key, or tokens for the same Akahu user. Bank data is cached encrypted too.
   Akahu refreshes from the banks daily; we read it once a day (cron) and on 'Refresh' (at most once an hour). */
const API = 'https://api.akahu.io/v1';
const K_CRED = 'akahu-cred-v1', K_DATA = 'akahu-data-v1', K_RL = 'akahu-rl-v1';
const DAY = 864e5;

const b64 = u8 => btoa(String.fromCharCode(...u8));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64url = u8 => b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function sha(s) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return b64(new Uint8Array(h)); }
async function encKey(env) {
  const raw = String(env.AKAHU_ENC_KEY || ''); if (!raw) throw new Error('no_key');
  let bytes; try { bytes = unb64(raw.trim()); } catch (e) { bytes = null; }
  if (!bytes || bytes.length < 32) bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)));
  return crypto.subtle.importKey('raw', bytes.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function seal(env, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encKey(env), new TextEncoder().encode(JSON.stringify(obj))); return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(new Uint8Array(ct)) }); }
async function open(env, s) { if (!s) return null; try { const o = JSON.parse(s); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, await encKey(env), unb64(o.ct)); return JSON.parse(new TextDecoder().decode(pt)); } catch (e) { return null; } }
const eq = (a, b) => { a = String(a || ''); b = String(b || ''); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

async function akahu(cred, path, fetchImpl, method = 'GET') {
  const r = await fetchImpl(API + path, { method, headers: { Authorization: 'Bearer ' + cred.user, 'X-Akahu-Id': cred.app, Accept: 'application/json' } });
  let d = null; try { d = await r.json(); } catch (e) { d = null; }
  if (r.status === 401 || r.status === 403) { const e = new Error('akahu_auth'); e.status = 401; throw e; }
  if (r.status === 429) { const e = new Error('akahu_rate'); e.status = 429; throw e; }
  if (!r.ok || !d || d.success === false) { const e = new Error('akahu_error'); e.status = 502; throw e; }
  return d;
}
const num = v => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : null; };
export function cleanAccount(a) {
  const bal = (a && a.balance) || {}, conn = (a && a.connection) || {};
  return { id: String(a._id || ''), name: String(a.name || 'Account').slice(0, 60), bank: String(conn.name || '').slice(0, 40), type: String(a.type || '').toUpperCase(), number: String(a.formatted_account || '').slice(-8),
    balance: num(bal.current), available: num(bal.available), limit: num(bal.limit), status: String(a.status || ''), refreshed: (a.refreshed && (a.refreshed.balance || a.refreshed.transactions)) || '' };
}
export function cleanTx(t) {
  return { id: String(t._id || ''), acct: String(t._account || ''), date: String(t.date || '').slice(0, 25), desc: String(t.description || '').replace(/\s+/g, ' ').slice(0, 120), amount: num(t.amount),
    type: String(t.type || '').toUpperCase(), merchant: t.merchant && t.merchant.name ? String(t.merchant.name).slice(0, 60) : '',
    cat: t.category && t.category.name ? String(t.category.name).slice(0, 60) : '' };
}
const INCOME = /\b(salary|wages?|pay(roll)?|ird|msd|winz|commission|dividend|interest credit)\b/i;
const MORT = /\b(mortgage|home ?loan|loan repay(ment)?|hl repay)\b/i;
// simple categories; transfers between his own accounts are paired so they don't count twice
export function categorise(accounts, txs) {
  const type = Object.fromEntries(accounts.map(a => [a.id, a.type]));
  const used = new Set();
  const byAmt = new Map(); txs.forEach((t, i) => { const k = Math.abs(t.amount).toFixed(2); (byAmt.get(k) || byAmt.set(k, []).get(k)).push(i); });
  txs.forEach((t, i) => {
    if (used.has(i) || !t.amount) return;
    const d0 = Date.parse(t.date);
    const j = (byAmt.get(Math.abs(t.amount).toFixed(2)) || []).find(j => j !== i && !used.has(j) && txs[j].acct !== t.acct && Math.sign(txs[j].amount) === -Math.sign(t.amount) && Math.abs(Date.parse(txs[j].date) - d0) <= 3 * DAY);
    if (j != null) { used.add(i); used.add(j); t.cat2 = txs[j].cat2 = 'transfer'; t.pair = txs[j].id; txs[j].pair = t.id; }
  });
  txs.forEach(t => {
    if (t.cat2) return;
    const s = t.desc + ' ' + t.merchant + ' ' + t.cat;
    if (type[t.acct] === 'CREDITCARD' && t.amount < 0) t.cat2 = 'card';
    else if (t.amount > 0 && INCOME.test(s)) t.cat2 = 'income';
    else if (t.amount < 0 && MORT.test(s)) t.cat2 = 'mortgage';
    else if (t.type === 'TRANSFER' && /\b(transfer|tfr)\b/i.test(s)) t.cat2 = 'transfer';
    else t.cat2 = t.amount > 0 ? 'in' : 'spend';
  });
  return txs;
}
export async function fetchAll(cred, fetchImpl, now = Date.now()) {
  const acc = await akahu(cred, '/accounts', fetchImpl);
  const accounts = (acc.items || []).map(cleanAccount).filter(a => a.id);
  const start = new Date(now - 90 * DAY).toISOString(), end = new Date(now + DAY).toISOString();
  let cursor = '', pages = 0; const txs = [];
  do {
    const d = await akahu(cred, `/transactions?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`, fetchImpl);
    (d.items || []).forEach(t => { const c = cleanTx(t); if (c.id && c.amount != null) txs.push(c); });
    cursor = d.cursor && d.cursor.next ? String(d.cursor.next) : '';
  } while (cursor && ++pages < 40 && txs.length < 6000);
  txs.sort((a, b) => b.date.localeCompare(a.date));
  return { at: new Date(now).toISOString(), accounts, transactions: categorise(accounts, txs) };
}
async function rate(env, name, max, ttl) {
  const kv = env.EVENTS_KV; const k = K_RL + ':' + name + ':' + Math.floor(Date.now() / (ttl * 1000));
  const n = Number(await kv.get(k)) || 0; if (n >= max) return false; await kv.put(k, String(n + 1), { expirationTtl: Math.max(60, ttl * 2) }); return true;
}
async function getCred(env) { return open(env, await env.EVENTS_KV.get(K_CRED)); }
async function authed(env, request) { const cred = await getCred(env); if (!cred) return { cred: null, ok: false }; const key = request.headers.get('X-Cash-Key') || ''; return { cred, ok: !!key && eq(await sha(key), cred.keyHash) }; }
async function refetch(env, cred, fetchImpl) { const data = await fetchAll(cred, fetchImpl); await env.EVENTS_KV.put(K_DATA, await seal(env, data)); return data; }
const pubStatus = (cred, data) => ({ connected: true, name: cred.name || '', accounts: data ? data.accounts.length : cred.accounts || 0, at: data ? data.at : '', manualAt: cred.manualAt || '' });

// returns [status, body]
export async function akahuRoute(path, request, env, fetchImpl = fetch) {
  if (!env.EVENTS_KV) return [503, { error: 'unavailable' }];
  if (!env.AKAHU_ENC_KEY) return [503, { error: 'not_configured' }];
  let body = {};
  if (request.method === 'POST') { try { const raw = await request.text(); if (raw.length > 4000) return [413, { error: 'too_large' }]; body = raw ? JSON.parse(raw) : {}; } catch (e) { return [400, { error: 'bad_request' }]; } }
  if (path === '/akahu/connect' && request.method === 'POST') {
    if (!(await rate(env, 'connect', 6, 3600))) return [429, { error: 'rate_limited' }];
    const user = String(body.user || '').trim(), app = String(body.app || '').trim();
    if (!/^user_token_[A-Za-z0-9_-]{8,200}$/.test(user) || !/^app_token_[A-Za-z0-9_-]{8,200}$/.test(app)) return [400, { error: 'bad_tokens' }];
    const cand = { user, app };
    let me; try { me = await akahu(cand, '/me', fetchImpl); } catch (e) { return [e.status === 401 ? 401 : 502, { error: e.status === 401 ? 'akahu_rejected' : 'akahu_unavailable' }]; }
    const item = me.item || {}, uid = String(item._id || ''), name = String(item.preferred_name || item.first_name || String(item.name || '').split(' ')[0] || '').slice(0, 40);
    const { cred: old, ok } = await authed(env, request);
    if (old && !ok && !(uid && eq(uid, old.uid))) return [409, { error: 'already_connected' }];
    const key = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const cred = { user, app, uid, name, keyHash: await sha(key), at: new Date().toISOString(), manualAt: '' };
    let data = null; try { data = await fetchAll(cred, fetchImpl); } catch (e) { return [502, { error: 'akahu_unavailable' }]; }
    cred.accounts = data.accounts.length;
    await env.EVENTS_KV.put(K_CRED, await seal(env, cred));
    await env.EVENTS_KV.put(K_DATA, await seal(env, data));
    return [200, { ok: true, key, name, accounts: data.accounts.length }];
  }
  const { cred, ok } = await authed(env, request);
  if (!cred) return [200, { connected: false }];
  if (!ok) { if (!(await rate(env, 'badkey', 30, 3600))) return [429, { error: 'rate_limited' }]; return [401, { error: 'unauthorised' }]; }
  if (path === '/akahu/status') { const data = await open(env, await env.EVENTS_KV.get(K_DATA)); return [200, pubStatus(cred, data)]; }
  if (path === '/akahu/disconnect' && request.method === 'POST') { await env.EVENTS_KV.delete(K_CRED); await env.EVENTS_KV.delete(K_DATA); return [200, { ok: true, connected: false }]; }
  if (path === '/cashflow' && request.method === 'GET') {
    let data = await open(env, await env.EVENTS_KV.get(K_DATA));
    if (!data) { try { data = await refetch(env, cred, fetchImpl); } catch (e) { return [502, { error: 'akahu_unavailable' }]; } }
    return [200, Object.assign(pubStatus(cred, data), { data })];
  }
  if (path === '/cashflow/refresh' && request.method === 'POST') {
    const last = Date.parse(cred.manualAt || '') || 0;
    if (Date.now() - last < 3600e3) return [429, { error: 'too_soon', next: new Date(last + 3600e3).toISOString() }];
    cred.manualAt = new Date().toISOString(); cred.pending = Date.now();
    await env.EVENTS_KV.put(K_CRED, await seal(env, cred));
    try { await akahu(cred, '/refresh', fetchImpl, 'POST'); } catch (e) { if (e.status === 401) return [401, { error: 'akahu_rejected' }]; }
    let data; try { data = await refetch(env, cred, fetchImpl); } catch (e) { return [502, { error: 'akahu_unavailable' }]; }
    return [200, Object.assign(pubStatus(cred, data), { data, note: 'The banks can take a few minutes; it checks again shortly.' })];
  }
  return [404, { error: 'not_found' }];
}
// cron (every 10 min): once a day from 6am NZ, and once more about 10 minutes after a manual refresh
export async function runAkahu(env, fetchImpl = fetch, now = Date.now()) {
  if (!env.EVENTS_KV || !env.AKAHU_ENC_KEY) return 'off';
  const cred = await getCred(env); if (!cred) return 'none';
  const data = await open(env, await env.EVENTS_KV.get(K_DATA));
  const age = data ? now - Date.parse(data.at) : Infinity;
  const hr = Number(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hourCycle: 'h23' }).format(new Date(now)));
  const pend = cred.pending && now - cred.pending > 8 * 60e3;
  if (!(pend || (age > 20 * 3600e3 && hr >= 6))) return 'fresh';
  if (pend) { delete cred.pending; await env.EVENTS_KV.put(K_CRED, await seal(env, cred)); }
  await refetch(env, cred, fetchImpl); return 'fetched';
}
