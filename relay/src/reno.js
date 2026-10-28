/* 2.26.25 / 2.28.70: Millesha's Renovation. One small job list shared between My App and Millesha's page, stored in EVENTS_KV under a
   hash of its own key (separate from every other shared list, so it never exposes other My App data). Each entry merges on
   its own `updated` time (newest wins). Writes only when something actually changed.
   2.28.70: Daily 8:30 pm NZT countdown notification/reminder sent to every person/phone that has the app (millesha.html, My App, Sarah's To-do)
   stating how many days until the project needs to be finished. */
import { sendPush, cleanSub, b64u, loadSubs } from './push.js';
import { SUN_KEY } from './sunshine.js';
import { SHOP_KEY } from './shop-notify.js';

const MAX = 300;
const ST = ['todo', 'doing', 'done'];
const RENO_SUBS_KEY = 'reno-subs-v1';
const RENO_REM_STATE_KEY = 'reno-remind-state-v1';
const DEFAULT_RENO_KEY = '3im0XgV50Be1sR1NgqrHDMIjKltsOJcmG9g8Gj57';
const DEFAULT_DEADLINE = '2026-11-22';
const TOTAL_MAIN_JOBS = 68; // 9 inside rooms * 7 + 5 outside jobs

const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const enc = new TextEncoder();
const hash16 = async s => b64u(await crypto.subtle.digest('SHA-256', enc.encode(s))).slice(0, 16);

export function normRenoKey(raw) { const s = String(raw || ''); return /^[A-Za-z0-9_-]{32,128}$/.test(s) ? s : ''; }
export async function kvKey(k) {
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
  if ('notes' in x) o.notes = str(x.notes, 1200);
  if ('due' in x) o.due = /^\d{4}-\d{2}-\d{2}$/.test(String(x.due || '')) ? x.due : '';
  if ('floor' in x) o.floor = x.floor === 'tiles' ? 'tiles' : 'carpet';
  if ('deadline' in x) o.deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(x.deadline || '')) ? x.deadline : '';
  if ('count' in x) { const c = Math.floor(Number(x.count)); o.count = c >= 0 && c < 1000 ? c : 0; }
  if ('hidden' in x) o.hidden = !!x.hidden;
  if ('phones' in x && Array.isArray(x.phones)) {
    o.phones = x.phones.slice(0, 20).map(p => ({
      name: str(p && p.name, 40).trim(),
      phone: str(p && p.phone, 30).replace(/[^0-9+\s()-]/g, '').trim()
    })).filter(p => p.name || p.phone);
  }
  return o;
}

export function nzTimeParts(now = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, minute: +p.minute };
}

export function buildRenoCountdownMsg(items, todayNz) {
  const list = Array.isArray(items) ? items : [];
  const proj = list.find(x => x && x.id === 'project') || {};
  const deadline = (/^\d{4}-\d{2}-\d{2}$/.test(proj.deadline || '') ? proj.deadline : '') || DEFAULT_DEADLINE;
  const days = Math.round((Date.parse(deadline + 'T00:00:00Z') - Date.parse(todayNz + 'T00:00:00Z')) / 864e5);
  const doneCount = list.filter(x => x && x.id !== 'project' && x.id !== 'phones' && !/^a-/.test(x.id) && x.status === 'done').length;
  const doingCount = list.filter(x => x && x.id !== 'project' && x.id !== 'phones' && !/^a-/.test(x.id) && x.status === 'doing').length;
  const pct = Math.min(100, Math.round(((doneCount + doingCount * 0.5) / TOTAL_MAIN_JOBS) * 100));
  const fmtDl = new Date(deadline + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  let title = '';
  let body = '';
  if (days > 1) {
    title = `🏠 Millesha’s Renovation: ${days} days left`;
    body = `${days} days until Millesha’s renovation project needs to be finished (Deadline: ${fmtDl}). Currently ${pct}% done (${doneCount} jobs ticked off) — tap to view or tick off jobs.`;
  } else if (days === 1) {
    title = `🏠 Millesha’s Renovation: 1 day left!`;
    body = `1 day until Millesha’s renovation project needs to be finished (Deadline tomorrow: ${fmtDl}). Currently ${pct}% done — tap to check the final jobs.`;
  } else if (days === 0) {
    title = `🏠 Millesha’s Renovation: Due today!`;
    body = `Today (${fmtDl}) is the finish deadline for Millesha’s renovation project! Currently ${pct}% done.`;
  } else {
    const past = Math.abs(days);
    title = `🏠 Millesha’s Renovation: ${past} ${past === 1 ? 'day' : 'days'} past deadline`;
    body = `Millesha’s renovation deadline was ${fmtDl} (${past} ${past === 1 ? 'day' : 'days'} ago). Currently ${pct}% done.`;
  }
  const smsText = days > 1
    ? `Millesha’s Renovation reminder: ${days} days until the project needs to be finished (Deadline: ${fmtDl}). Currently ${pct}% done. Checklist: https://shane-my-app.pages.dev/millesha.html#k=${DEFAULT_RENO_KEY}`
    : days === 1
      ? `Millesha’s Renovation reminder: 1 day left until the project needs to be finished (Deadline tomorrow: ${fmtDl})! Currently ${pct}% done. Checklist: https://shane-my-app.pages.dev/millesha.html#k=${DEFAULT_RENO_KEY}`
      : `Millesha’s Renovation reminder: Today (${fmtDl}) is the project deadline! Currently ${pct}% done. Checklist: https://shane-my-app.pages.dev/millesha.html#k=${DEFAULT_RENO_KEY}`;

  return { days, deadline, fmtDl, doneCount, pct, title, body, smsText };
}

async function loadRenoSubs(env) {
  if (!env || !env.EVENTS_KV) return [];
  try {
    const d = await env.EVENTS_KV.get(RENO_SUBS_KEY, { type: 'json' });
    return Array.isArray(d) ? d : [];
  } catch (e) { return []; }
}

async function saveRenoSubs(env, subs) {
  if (!env || !env.EVENTS_KV) return;
  await env.EVENTS_KV.put(RENO_SUBS_KEY, JSON.stringify(subs.slice(-25)));
}

export async function renoRoute(body, env, now = Date.now(), fetchImpl = fetch) {
  const k = normRenoKey(body && body.key); if (!k) return [403, { error: 'bad_key' }];
  const kv = env && env.EVENTS_KV; if (!kv) return [503, { error: 'not_configured' }];
  const action = String((body && body.action) || '');

  // Push subscription & manual test/trigger routes for Millesha's Renovation
  if (action === 'push-status') {
    const ep = body && body.endpoint;
    const id = typeof ep === 'string' ? await hash16(ep) : '';
    const subs = await loadRenoSubs(env);
    const hit = subs.find(s => s.id === id);
    return [200, { subscribed: !!hit, who: hit ? hit.who : '', totalDevices: subs.length }];
  }
  if (action === 'push-subscribe') {
    const sub = cleanSub(body && body.subscription);
    if (!sub) return [400, { error: 'bad_subscription' }];
    const id = await hash16(sub.endpoint);
    const who = str((body && body.who) || 'Millesha', 40).trim();
    const pageUrl = str((body && body.url) || ('millesha.html#k=' + k), 200);
    let subs = await loadRenoSubs(env);
    subs = subs.filter(s => s.id !== id);
    subs.push({ id, endpoint: sub.endpoint, keys: sub.keys, who, url: pageUrl, k, at: now });
    await saveRenoSubs(env, subs);
    if (!body.quiet && env.VAPID_PRIVATE_JWK) {
      const key = await kvKey(k);
      let cur = []; try { cur = JSON.parse(await kv.get(key) || '[]'); } catch (e) { cur = []; }
      const info = buildRenoCountdownMsg(cur, nzTimeParts(now).date);
      await sendPush(sub, {
        title: '🔔 8:30 pm Daily Renovation Reminder On',
        body: `${info.days} days until Millesha’s renovation needs to be finished (${info.fmtDl}). You’ll get a daily countdown at 8:30 pm NZT.`,
        url: pageUrl,
        tag: 'reno-on-' + id,
        ttl: 3600
      }, env, fetchImpl, now);
    }
    return [200, { subscribed: true, totalDevices: subs.length }];
  }
  if (action === 'push-unsubscribe') {
    const ep = body && body.endpoint;
    const id = typeof ep === 'string' ? await hash16(ep) : '';
    const subs = await loadRenoSubs(env);
    const next = subs.filter(s => s.id !== id);
    await saveRenoSubs(env, next);
    return [200, { subscribed: false, totalDevices: next.length }];
  }
  if (action === 'push-send-now') {
    const res = await sendRenoCountdownToAll(env, k, fetchImpl, now, true);
    return [200, res];
  }

  const key = await kvKey(k);
  let cur = []; try { cur = JSON.parse(await kv.get(key) || '[]'); } catch (e) { cur = []; }
  const map = new Map(); (Array.isArray(cur) ? cur : []).forEach(x => { const c = cleanReno(x, now); if (c) map.set(c.id, c); });
  let changed = false;
  (Array.isArray(body.items) ? body.items : []).slice(0, MAX).forEach(x => { const c = cleanReno(x, now); if (!c) return; const h = map.get(c.id); if (!h || c.updated > h.updated) { map.set(c.id, c); changed = true; } });
  const items = [...map.values()].slice(-MAX);
  if (changed) await kv.put(key, JSON.stringify(items));
  return [200, { items, at: now }];
}

// Sends the countdown push notification to every person/phone that has the app:
// 1) All phones registered on Millesha's Renovation (millesha.html / #reno in reno-subs-v1)
// 2) Shane's My App phones (push-subs-v1 and shop-notify-v1)
// 3) Sarah's To-do phones (sunshine-v1)
export async function sendRenoCountdownToAll(env, renoKey = DEFAULT_RENO_KEY, fetchImpl = fetch, now = Date.now(), force = false) {
  if (!env || !env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return { ok: false, sent: 0, error: 'push_unavailable' };
  const nz = nzTimeParts(now);
  const key = await kvKey(renoKey || DEFAULT_RENO_KEY);
  let items = [];
  try { items = JSON.parse(await env.EVENTS_KV.get(key) || '[]'); } catch (e) { items = []; }
  const info = buildRenoCountdownMsg(items, nz.date);
  if (info.days < 0 && !force) return { ok: true, sent: 0, skipped: 'past_deadline', info };

  const targets = new Map(); // endpoint -> { sub, url }
  const addTarget = (sub, url) => {
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return;
    if (!targets.has(sub.endpoint)) targets.set(sub.endpoint, { sub, url });
  };

  // 1) Millesha's Renovation subscribers (millesha.html & #reno)
  const renoSubs = await loadRenoSubs(env);
  for (const s of renoSubs) addTarget(s, s.url || ('millesha.html#k=' + (s.k || renoKey)));

  // 2) My App subscribers (Shane's phone(s))
  try {
    const mySubs = await loadSubs(env);
    for (const s of mySubs) addTarget(s, '#reno');
  } catch (e) { }
  try {
    const shopDoc = (await env.EVENTS_KV.get(SHOP_KEY, { type: 'json' })) || {};
    for (const h of Object.keys(shopDoc)) {
      const shaneList = (shopDoc[h] && shopDoc[h].subs && shopDoc[h].subs.shane) || [];
      for (const s of shaneList) addTarget(s, '#reno');
    }
  } catch (e) { }

  // 3) Sarah's To-do subscribers (Sarah's phone(s))
  try {
    const sunDoc = (await env.EVENTS_KV.get(SUN_KEY, { type: 'json' })) || {};
    const sunSubs = Array.isArray(sunDoc.subs) ? sunDoc.subs : [];
    for (const s of sunSubs) addTarget(s, 'https://shane-my-app.pages.dev/millesha.html#k=' + (renoKey || DEFAULT_RENO_KEY));
  } catch (e) { }

  let sent = 0;
  const goneEndpoints = new Set();
  for (const [ep, t] of targets.entries()) {
    const msg = {
      title: info.title,
      body: info.body,
      url: t.url,
      tag: 'reno-countdown-' + nz.date,
      ttl: 14 * 3600
    };
    const r = await sendPush(t.sub, msg, env, fetchImpl, now);
    if (r === 'ok') sent++;
    else if (r === 'gone') goneEndpoints.add(ep);
  }

  if (goneEndpoints.size && renoSubs.length) {
    await saveRenoSubs(env, renoSubs.filter(s => !goneEndpoints.has(s.endpoint)));
  }

  await env.EVENTS_KV.put(RENO_REM_STATE_KEY, JSON.stringify({
    sentDay: nz.date,
    sentAt: now,
    sentCount: sent,
    totalTargets: targets.size,
    daysLeft: info.days,
    deadline: info.deadline
  }));

  return { ok: true, sent, totalTargets: targets.size, daysLeft: info.days, deadline: info.deadline, fmtDl: info.fmtDl, pct: info.pct, title: info.title, body: info.body, smsText: info.smsText };
}

// Called every minute from worker.js REMIND_CRON. Fires at 8:30 pm NZT (20:30 Pacific/Auckland) every day.
export async function runRenoReminder(env, fetchImpl = fetch, now = Date.now()) {
  if (!env || !env.EVENTS_KV || !env.VAPID_PRIVATE_JWK) return { sent: 0 };
  const nz = nzTimeParts(now);
  // Fire in the 8:30 pm NZT window (20:30 to 20:44 in case a cron tick was slightly delayed)
  if (nz.hour !== 20 || nz.minute < 30 || nz.minute > 44) return { skipped: 'not_830pm' };
  let st = null;
  try { st = await env.EVENTS_KV.get(RENO_REM_STATE_KEY, { type: 'json' }); } catch (e) { st = null; }
  if (st && st.sentDay === nz.date) return { skipped: 'already_sent_today' };
  return await sendRenoCountdownToAll(env, DEFAULT_RENO_KEY, fetchImpl, now, false);
}
