/* 2.26.57: Akahu (NZ open banking, read-only personal app) for My App's Cash flow page.
   The User Access Token and App ID Token are sent once from Settings, checked against Akahu /me, then stored
   here only, encrypted with AES-GCM using the Worker secret AKAHU_ENC_KEY. They are never sent back.
   Connect returns a random device key (only its SHA-256 is kept). Reading, refreshing and disconnecting need it.
   Connecting again needs that key, or tokens for the same Akahu user. Bank data is cached encrypted too.
   Akahu refreshes from the banks daily; we read it once a day (cron) and on 'Refresh' (at most once an hour). */
const API = 'https://api.akahu.io/v1';
const K_CRED = 'akahu-cred-v1', K_DATA = 'akahu-data-v1', K_RL = 'akahu-rl-v1', K_DIAG = 'akahu-diag-v1';
const DAY = 864e5;

// 2.26.59: chunked; spreading a large ciphertext into fromCharCode overflowed the stack (bank data didn't save, connect failed)
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
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

const safeMsg = m => String(m || '').replace(/(user|app)_token_[A-Za-z0-9_-]+/g, '$1_token_…').replace(/[^\w .,:;'’()\/-]/g, ' ').slice(0, 160).trim();
async function akahu(cred, path, fetchImpl, method = 'GET') {
  const step = path.split('?')[0].replace(/^\//, '');
  let r; try { r = await fetchImpl(API + path, { method, headers: { Authorization: 'Bearer ' + cred.user, 'X-Akahu-Id': cred.app, Accept: 'application/json' } }); }
  catch (e) { const er = new Error('akahu_unreachable'); er.status = 502; er.code = 'akahu_unreachable'; er.step = step; throw er; }
  let d = null; try { d = await r.json(); } catch (e) { d = null; }
  const fail = code => { const e = new Error(code); e.status = r.status; e.code = code; e.step = step; e.msg = safeMsg(d && (d.message || d.error)); throw e; };
  if (r.status === 401) fail('akahu_rejected');
  if (r.status === 403) fail('akahu_forbidden');
  if (r.status === 429) fail('akahu_rate');
  if (!r.ok || !d || d.success === false) fail('akahu_error');
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
    const clean = v => String(v || '').replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, '');
    const user = clean(body.user), app = clean(body.app);
    if (!/^user_token_[A-Za-z0-9_-]{8,200}$/.test(user) || !/^app_token_[A-Za-z0-9_-]{8,200}$/.test(app)) return [400, { error: user.startsWith('app_token_') && app.startsWith('user_token_') ? 'swapped' : user && user === app ? 'same_token' : 'bad_tokens' }];
    // only tries that reach Akahu count towards the 6 an hour
    if (!(await rate(env, 'connect', 6, 3600))) return [429, { error: 'rate_limited', mins: Math.max(1, Math.ceil((3600e3 - Date.now() % 3600e3) / 60e3)) }];
    const cand = { user, app };
    const diag = async (e) => { try { await env.EVENTS_KV.put(K_DIAG, JSON.stringify({ at: new Date().toISOString(), step: e.step || '', status: e.status || 0, code: e.code || String(e.message || e).slice(0, 60), msg: e.msg || '', userLen: user.length, appLen: app.length }), { expirationTtl: 7 * 86400 }); } catch (er) { } };
    const errOut = async e => { await diag(e); return [e.code === 'akahu_rejected' ? 401 : e.code === 'akahu_forbidden' ? 403 : e.code === 'akahu_rate' ? 429 : 502, { error: e.code || 'akahu_error', step: e.step || '', status: e.status || 0, akahu: e.msg || '' }]; };
    let me; try { me = await akahu(cand, '/me', fetchImpl); } catch (e) { return errOut(e); }
    const item = me.item || {}, uid = String(item._id || ''), name = String(item.preferred_name || item.first_name || String(item.name || '').split(' ')[0] || '').slice(0, 40);
    const { cred: old, ok } = await authed(env, request);
    if (old && !ok && !(uid && eq(uid, old.uid))) return [409, { error: 'already_connected' }];
    const key = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const cred = { user, app, uid, name, keyHash: await sha(key), at: new Date().toISOString(), manualAt: '' };
    let data = null; try { data = await fetchAll(cred, fetchImpl); } catch (e) { return errOut(e); }
    cred.accounts = data.accounts.length;
    let sd, sc; try { sd = await seal(env, data); sc = await seal(env, cred); } catch (e) { return errOut({ code: 'save_failed', step: 'encrypt', msg: safeMsg(e && e.message) }); }
    await env.EVENTS_KV.put(K_DATA, sd); // data first, so a stored login always has data
    await env.EVENTS_KV.put(K_CRED, sc);
    try { await env.EVENTS_KV.delete(K_DIAG); } catch (e) { }
    return [200, { ok: true, key, name, accounts: data.accounts.length }];
  }
  const { cred, ok } = await authed(env, request);
  if (!cred) return [200, { connected: false }];
  if (!ok) { if (!(await rate(env, 'badkey', 30, 3600))) return [429, { error: 'rate_limited' }]; return [401, { error: 'unauthorised' }]; }
  if (path === '/akahu/status') { const data = await open(env, await env.EVENTS_KV.get(K_DATA)); return [200, pubStatus(cred, data)]; }
  if (path === '/akahu/disconnect' && request.method === 'POST') { await env.EVENTS_KV.delete(K_CRED); await env.EVENTS_KV.delete(K_DATA); return [200, { ok: true, connected: false }]; }
  if (path === '/cashflow' && request.method === 'GET') {
    let data = await open(env, await env.EVENTS_KV.get(K_DATA));
    if (!data) { try { data = await refetch(env, cred, fetchImpl); } catch (e) { return [e.code === 'akahu_rejected' ? 401 : 502, { error: e.code || 'akahu_error', step: e.step || '', status: e.status || 0, akahu: e.msg || '' }]; } }
    return [200, Object.assign(pubStatus(cred, data), { data })];
  }
  if (path === '/cashflow/refresh' && request.method === 'POST') {
    const last = Date.parse(cred.manualAt || '') || 0;
    if (Date.now() - last < 3600e3) return [429, { error: 'too_soon', next: new Date(last + 3600e3).toISOString() }];
    cred.manualAt = new Date().toISOString(); cred.pending = Date.now();
    await env.EVENTS_KV.put(K_CRED, await seal(env, cred));
    try { await akahu(cred, '/refresh', fetchImpl, 'POST'); } catch (e) { if (e.status === 401) return [401, { error: 'akahu_rejected' }]; }
    let data; try { data = await refetch(env, cred, fetchImpl); } catch (e) { return [502, { error: e.code || 'akahu_error', step: e.step || '', status: e.status || 0, akahu: e.msg || '' }]; }
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
// one-off, owner-triggered summary of regular credits (no tokens, no account numbers, long digit runs masked); kept 30 minutes
export async function runAkahuInsight(env) {
  const req = env.EVENTS_KV && env.AKAHU_ENC_KEY && await env.EVENTS_KV.get('akahu-insight-req'); if (!req) return 'none';
  const deb = req === 'debits';
  if (req === 'plan') {
    let D = null, fresh = false; const cred = await getCred(env);
    try { const old = await open(env, await env.EVENTS_KV.get(K_DATA)); if (cred && (!old || Date.now() - Date.parse(old.at) > 3600e3)) { D = await refetch(env, cred, fetch); fresh = true; } else D = old; } catch (e) { D = await open(env, await env.EVENTS_KV.get(K_DATA)); }
    if (!D) return 'nodata';
    const mk = s => String(s || '').replace(/\d{4,}/g, '#').replace(/\s+/g, ' ').trim().toUpperCase();
    const an = Object.fromEntries(D.accounts.map(a => [a.id, a.name + ' · ' + a.bank]));
    const g = new Map();
    D.transactions.filter(t => !t.pair && D.accounts.find(a => a.id === t.acct && a.type !== 'CREDITCARD' && !(a.type === 'LOAN' && !a.limit))).forEach(t => { const k = (t.amount < 0 ? 'OUT ' : 'IN ') + mk(t.desc).replace(/#.*$/, '').slice(0, 36) + ' | ' + an[t.acct]; (g.get(k) || g.set(k, []).get(k)).push(t); });
    const groups = [...g.entries()].filter(([, L]) => L.length >= 2).map(([k, L]) => { const d = L.map(t => t.date.slice(0, 10)).sort(); return { k, n: L.length, d, amt: L.sort((a, b) => a.date.localeCompare(b.date)).map(t => t.amount), type: [...new Set(L.map(t => t.type))].join('/') }; });
    await env.EVENTS_KV.put('akahu-insight-v1', JSON.stringify({ at: new Date().toISOString(), dataAt: D.at, fresh, accounts: D.accounts.map(a => ({ n: a.name, bank: a.bank, type: a.type, bal: a.balance, avail: a.available, limit: a.limit })), groups,
      last14: D.transactions.filter(t => Date.now() - Date.parse(t.date) < 14 * DAY && D.accounts.find(a => a.id === t.acct && a.type !== 'CREDITCARD' && !(a.type === 'LOAN' && !a.limit))).map(t => [t.date.slice(0, 10), mk(t.desc).slice(0, 36), t.amount, an[t.acct], t.pair ? 'pair' : '']) }), { expirationTtl: 1800 });
    return 'plan';
  }
  if (req === 'mort3') { // 2.26.66: third mortgage (old ANZ), Ecotricity and Kora history, balances; masked, no account numbers
    await env.EVENTS_KV.delete('akahu-insight-req');
    const D = await open(env, await env.EVENTS_KV.get(K_DATA)); if (!D) return 'nodata';
    const mk = s => String(s || '').replace(/\d{4,}/g, '#').replace(/\s+/g, ' ').trim().toUpperCase();
    const A = Object.fromEntries(D.accounts.map(a => [a.id, a]));
    const an = id => { const a = A[id]; return a ? mk(a.name) + ' · ' + a.bank + ' · ' + a.type : '?'; };
    const row = t => [t.date.slice(0, 10), mk(t.desc).slice(0, 60), t.amount, an(t.acct), t.type, t.pair ? 'pair' : '', t.cat2 || ''];
    const T = D.transactions.slice().sort((a, b) => a.date.localeCompare(b.date));
    const isAnz = t => A[t.acct] && /ANZ/i.test(A[t.acct].bank);
    await env.EVENTS_KV.put('akahu-insight-v1', JSON.stringify({ at: new Date().toISOString(), dataAt: D.at, first: T[0] && T[0].date,
      accounts: D.accounts.map(a => ({ n: mk(a.name), bank: a.bank, type: a.type, bal: a.balance, avail: a.available, limit: a.limit, refreshed: a.refreshed })),
      anzOut: T.filter(t => isAnz(t) && t.amount <= -100).map(row),
      loanish: T.filter(t => /loan|mortgage|home ?l|hl |repay|principal|interest/i.test(t.desc + ' ' + t.merchant)).map(row),
      eco: T.filter(t => /ecotric/i.test(t.desc + ' ' + t.merchant)).map(row),
      kora: T.filter(t => /kora/i.test(t.desc + ' ' + t.merchant)).map(row),
      big: T.filter(t => Math.abs(t.amount) >= 1000 && t.date.slice(0, 10) >= '2026-08-25' && t.date.slice(0, 10) <= '2026-09-15').map(row),
      recent: T.filter(t => t.date.slice(0, 10) >= '2026-10-03' && A[t.acct] && A[t.acct].type !== 'CREDITCARD' && !(A[t.acct].type === 'LOAN' && !A[t.acct].limit)).map(row) }), { expirationTtl: 1800 });
    return 'mort3';
  }
  if (req === 'outs') { // 2.26.73: every payment out (and card purchases) for bill matching checks; masked, no account numbers
    await env.EVENTS_KV.delete('akahu-insight-req');
    const D = await open(env, await env.EVENTS_KV.get(K_DATA)); if (!D) return 'nodata';
    const mk = s => String(s || '').replace(/\d{4,}/g, '#').replace(/\s+/g, ' ').trim().toUpperCase();
    const A = Object.fromEntries(D.accounts.map(a => [a.id, a]));
    const T = D.transactions.slice().sort((a, b) => a.date.localeCompare(b.date));
    await env.EVENTS_KV.put('akahu-insight-v1', JSON.stringify({ at: new Date().toISOString(), dataAt: D.at, first: T[0] && T[0].date,
      outs: T.filter(t => t.amount < 0).map(t => [t.date.slice(0, 10), mk(t.desc).slice(0, 50), t.amount, A[t.acct] ? mk(A[t.acct].name) + ' · ' + A[t.acct].bank + ' · ' + A[t.acct].type : '?', t.pair ? 'pair' : '', t.cat2 || '', mk(t.merchant).slice(0, 30)]),
      insBig: T.filter(t => t.amount >= 20).map(t => [t.date.slice(0, 10), mk(t.desc).slice(0, 40), t.amount, A[t.acct] ? mk(A[t.acct].name) + ' · ' + A[t.acct].bank : '?', t.pair ? 'pair' : '']) }), { expirationTtl: 1800 });
    return 'outs';
  }
  if (req === 'card') {
    const D = await open(env, await env.EVENTS_KV.get(K_DATA)); if (!D) return 'nodata';
    const mk = s => String(s || '').replace(/\d{4,}/g, '#').replace(/\s+/g, ' ').trim().toUpperCase();
    const c = D.accounts.find(a => a.type === 'CREDITCARD'); if (!c) return 'nocard';
    const T = D.transactions.filter(t => t.acct === c.id);
    await env.EVENTS_KV.put('akahu-insight-v1', JSON.stringify({ at: new Date().toISOString(), card: { bal: c.balance, avail: c.available, limit: c.limit, refreshed: c.refreshed }, n: T.length, first: T.length ? T[T.length - 1].date : '',
      credits: T.filter(t => t.amount > 0).map(t => [t.date.slice(0, 10), mk(t.desc).slice(0, 40), t.amount, t.type, t.cat2]),
      fees: T.filter(t => /interest|fee|charge/i.test(t.desc)).map(t => [t.date.slice(0, 10), mk(t.desc).slice(0, 40), t.amount]),
      toCard: D.transactions.filter(t => t.acct !== c.id && t.amount < 0 && /card|visa/i.test(t.desc)).map(t => [t.date.slice(0, 10), mk(t.desc).slice(0, 40), t.amount, t.cat2]),
      spendByMonth: Object.entries(T.filter(t => t.amount < 0).reduce((m, t) => { const k = t.date.slice(0, 7); m[k] = Math.round(((m[k] || 0) - t.amount) * 100) / 100; return m; }, {})) }), { expirationTtl: 1800 });
    return 'card';
  }
  if (req === 'orbit') {
    const data0 = await open(env, await env.EVENTS_KV.get(K_DATA)); if (!data0) return 'nodata';
    const mask0 = s => String(s || '').replace(/\d{4,}/g, '#').replace(/\s+/g, ' ').trim().toUpperCase();
    const o = data0.accounts.find(a => a.type === 'LOAN' && a.limit); if (!o) return 'noorbit';
    const T = data0.transactions.filter(t => t.acct === o.id).sort((a, b) => a.date.localeCompare(b.date));
    const pick = T.filter(t => t.amount < 0 && (/interest|\bint\b|debit int/i.test(t.desc) || ['01', '02', '28', '29', '30', '31'].includes(t.date.slice(8, 10)) && Math.abs(t.amount) < 400));
    // daily balances backwards from today's balance
    let bal = o.balance, days = {}; const byDay = {}; T.forEach(t => { const d = t.date.slice(0, 10); byDay[d] = (byDay[d] || 0) + t.amount; });
    for (let d = new Date(); d > new Date(Date.now() - 92 * DAY); d = new Date(d - DAY)) { const k = d.toISOString().slice(0, 10); days[k] = Math.round(bal * 100) / 100; bal -= byDay[k] || 0; }
    const avg = m => { const v = Object.entries(days).filter(([k]) => k.startsWith(m)).map(([, v]) => v); return v.length ? { n: v.length, avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length) } : null; };
    await env.EVENTS_KV.put('akahu-insight-v1', JSON.stringify({ at: new Date().toISOString(), orbit: { bal: o.balance, avail: o.available, limit: o.limit, first: T[0] && T[0].date }, picks: pick.map(t => [t.date.slice(0, 10), mask0(t.desc), t.amount, t.type, t.cat2]), avg: { aug: avg('2026-08'), sep: avg('2026-09'), oct: avg('2026-10') }, small: T.filter(t => t.amount < 0 && Math.abs(t.amount) < 150).map(t => [t.date.slice(0, 10), mask0(t.desc).slice(0, 40), t.amount]).slice(-40) }), { expirationTtl: 1800 });
    return 'orbit';
  }
  await env.EVENTS_KV.delete('akahu-insight-req');
  const data = await open(env, await env.EVENTS_KV.get(K_DATA)); if (!data) return 'nodata';
  const an = Object.fromEntries(data.accounts.map(a => [a.id, (a.name + ' · ' + a.bank + ' · ' + a.type).slice(0, 80)]));
  const bals = data.accounts.map(a => ({ n: an[a.id], bal: a.balance, avail: a.available, limit: a.limit }));
  const mask = s => String(s || '').replace(/\d{4,}/g, '#').replace(/\s+/g, ' ').trim().toUpperCase();
  const g = new Map();
  data.transactions.filter(t => (deb ? t.amount <= -150 : t.amount >= 50) && (deb || t.cat2 !== 'transfer')).forEach(t => { const k = mask(t.desc).replace(/#.*$/, '').slice(0, 40) + ' | ' + (an[t.acct] || '?'); (g.get(k) || g.set(k, []).get(k)).push(t); });
  const out = [...g.entries()].map(([k, ts]) => { const d = ts.map(t => t.date.slice(0, 10)).sort(); const gaps = d.slice(1).map((x, i) => Math.round((Date.parse(x) - Date.parse(d[i])) / DAY)); const am = ts.map(t => t.amount).sort((a, b) => a - b);
    return { key: k, n: ts.length, dates: d, gaps, min: am[0], max: am[am.length - 1], sample: [...new Set(ts.map(t => mask(t.desc)))].slice(0, 3), merchant: [...new Set(ts.map(t => t.merchant).filter(Boolean))].slice(0, 2), cat: [...new Set(ts.map(t => t.cat2 + '/' + t.cat))].slice(0, 3) }; })
    .sort((a, b) => b.n - a.n || b.max - a.max).slice(0, 60);
  await env.EVENTS_KV.put('akahu-insight-v1', JSON.stringify({ at: new Date().toISOString(), accounts: bals, txCount: data.transactions.length, dataAt: data.at, credits: out }), { expirationTtl: 1800 });
  return 'done';
}
