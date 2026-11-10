/* 2.29.22: ASB Visa "left to pay in full" phone pushes (Shane). Works with the app closed.
   My App posts its card snapshot (statement date, due date, statement balance, ticked payments not yet in the bank,
   weekly Wednesday plan, on/off) to /cashflow/card after each bank load. The relay works the figure out again from its
   own Akahu data each time the bank data is fetched (a few times a day), so payments landing are picked up without the
   app being opened, and a new statement is worked out from the bank (owed now, with everything since the statement undone).
   Pushes (tag 'asb-visa', so a newer one replaces the older one on the phone):
   - the figure changes after a bank fetch (a payment lands, or a new statement);
   - Wednesday mornings (weekly payment day) and every morning in the last 3 days before the due date, while still owing;
   - once 'Paid in full ✓' when it reaches $0, then nothing until the next statement.
   None 10pm–8am (held until 8am). Only amounts and dates go in a push: never account numbers or tokens. */
import { shanePush } from './shop-notify.js';
import { K_BPREF } from './bank-notify.js';
export const K_CARDN = 'card-notify-v1';
const RECENT = new Map(); // same push twice in this isolate within 30 min (KV copies can lag between data centres): skip
const r2 = v => Math.round(v * 100) / 100;
const money = v => '$' + Math.abs(v).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const nzDay = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date(now));
const nzHour = now => Number(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hourCycle: 'h23' }).format(new Date(now)));
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dayIn = (y, m, d) => { const L = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return new Date(Date.UTC(y, m, Math.min(d, L))).toISOString().slice(0, 10); };
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const isoOk = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const fmtDay = iso => new Intl.DateTimeFormat('en-NZ', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso + 'T12:00:00Z')).replace(/,/g, '');
const wday = iso => new Date(iso + 'T12:00:00Z').getUTCDay();
export function cardCycle(T, stmtDay = 1, gap = 25) {
  const [y, m] = T.split('-').map(Number);
  for (let i = -3; i <= 2; i++) { const st = dayIn(y, m - 1 + i, stmtDay), due = addDays(st, gap); if (due >= T) return { stmt: st, due }; }
  return null;
}
export const cardAcct = D => { const C = ((D && D.accounts) || []).filter(a => a.type === 'CREDITCARD'); return C.find(a => a.limit === 1000) || C.find(a => /reward/i.test(a.name)) || (C.length === 1 ? C[0] : null); };
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export function cleanSnap(b) {
  b = b && typeof b === 'object' ? b : {};
  const sd = Math.round(num(b.stmtDay)), gp = Math.round(num(b.gap));
  return { on: b.on !== false, stmt: isoOk(b.stmt) ? b.stmt : '', due: isoOk(b.due) ? b.due : '', goal: Math.max(0, Math.min(1e6, r2(num(b.goal)))), sb: !!b.sb,
    stmtDay: sd >= 1 && sd <= 31 ? sd : 1, gap: gp >= 1 && gp <= 40 ? gp : 25,
    pend: (Array.isArray(b.pend) ? b.pend : []).filter(t => t && isoOk(t.d) && num(t.a) > 0).slice(-8).map(t => ({ d: t.d, a: r2(num(t.a)), at: String(t.at || '').slice(0, 30) })),
    weeks: (Array.isArray(b.weeks) ? b.weeks : []).filter(w => w && isoOk(w.d)).slice(0, 8).map(w => ({ d: w.d, a: r2(num(w.a)), cum: r2(num(w.cum)) })) };
}
// pure: what's left to pay this statement in full, from the bank data and the app's snapshot
export function cardLeft(D, snap, now = Date.now()) {
  if (!snap || !D) return null; const T = nzDay(now), cy = cardCycle(T, snap.stmtDay, snap.gap); if (!cy) return null;
  if (T <= cy.stmt) return { wait: true, stmt: cy.stmt, due: cy.due }; // statement not out yet
  const a = cardAcct(D); const tx = a ? (D.transactions || []).filter(t => t.acct === a.id) : [];
  const upTo = cy.due < T ? T : cy.due, pays = tx.filter(t => t.amount > 0 && t.date.slice(0, 10) > cy.stmt && t.date.slice(0, 10) <= upTo).map(t => ({ d: t.date.slice(0, 10), a: t.amount }));
  const bankPaid = r2(pays.reduce((n, p) => n + p.a, 0));
  let goal, about = false;
  if (snap.stmt === cy.stmt && snap.sb) goal = snap.goal;
  else { // a statement the app hasn't seen: owed now, with everything since the statement day undone
    if (!a || a.available == null) return null; const first = tx.reduce((m, t) => t.date < m ? t.date : m, '9999').slice(0, 10); if (first > cy.stmt) return null;
    goal = Math.max(0, r2(Math.max(0, (a.limit || 1000) - (a.available || 0)) + tx.filter(t => t.date.slice(0, 10) > cy.stmt).reduce((n, t) => n + t.amount, 0))); about = true; }
  const pend = snap.stmt === cy.stmt ? snap.pend.filter(t => !pays.some(p => p.d >= t.d && p.a >= t.a - 0.01) && (!t.at || now - Date.parse(t.at) < 10 * 864e5)) : [];
  const paid = r2(bankPaid + pend.reduce((n, t) => n + t.a, 0)), left = Math.max(0, r2(goal - paid));
  return { stmt: cy.stmt, due: cy.due, goal, paid, left, full: left <= 0.005, about, days: dayDiff(T, cy.due), T };
}
const dueBit = r => { const d = r.days; return `by ${fmtDay(r.due)} (${d <= 0 ? 'today' : d === 1 ? '1 day' : d + ' days'})`; };
export function leftMsg(r, kind, snap) {
  const base = { url: '#cashflow', tag: 'asb-visa', ttl: 20 * 3600 };
  if (kind === 'full') return Object.assign(base, { title: '\u{1F4B3} ASB Visa paid in full \u2713', body: `No interest this month. ${money(r.goal)} statement cleared${r.due ? ' before ' + fmtDay(r.due) : ''}.` });
  let extra = r.paid > 0.005 ? ` ${money(r.paid)} paid so far.` : '';
  if (kind === 'wed' && snap) { const w = (snap.weeks || []).find(w => w.d === r.T); if (w) { const need = Math.max(0, r2(w.cum - r.paid)); extra += need > 0.005 ? ` This week: pay ${money(need)} to stay on track.` : ' You\u2019re on track this week.'; } }
  const lead = kind === 'new' ? 'New statement. ' : kind === 'paid' ? 'Payment in. ' : '';
  return Object.assign(base, { title: `\u{1F4B3} ASB Visa: ${money(r.left)} left to pay in full`, body: `${lead}Pay ${dueBit(r)} to avoid interest.${extra}${r.about ? ' (Worked out from the bank.)' : ''}` });
}
async function load(env) { try { return (await env.EVENTS_KV.get(K_CARDN, { type: 'json' })) || {}; } catch (e) { return {}; } }
const store = (env, st) => env.EVENTS_KV.put(K_CARDN, JSON.stringify(st));
// pure: compare with what was last told; returns the message to queue (or null) and updates st.last
export function cardStep(st, r, src) {
  if (!r || r.wait) return null;
  const L = st.last, now = { stmt: r.stmt, due: r.due, left: r.left, full: r.full, goal: r.goal, paid: r.paid, days: r.days, about: r.about, T: r.T };
  st.last = now;
  if (!L) return r.full ? null : leftMsg(r, 'first');
  if (L.stmt !== r.stmt) return r.full ? null : leftMsg(r, 'new');
  if (r.full) return L.full ? null : leftMsg(r, 'full');
  if (src !== 'bank') return null; // the app's own ticks don't push; the bank showing a change does
  if (Math.abs(r.left - L.left) < 0.01) return null;
  return leftMsg(r, r.left < L.left ? 'paid' : 'change');
}
// after a bank fetch (src 'bank') or a snapshot from the app (src 'app')
export async function cardNotifyRun(env, D, src = 'bank', now = Date.now(), snapIn) {
  try { const st = await load(env); if (snapIn) st.snap = snapIn; if (!st.snap) { if (snapIn) await store(env, st); return null; }
    const before = JSON.stringify(st), r = cardLeft(D, st.snap, now);
    if (st.snap.on) { const m = cardStep(st, r, src); if (m) st.q = m; } else if (r && !r.wait) st.last = Object.assign({}, st.last || {}, { stmt: r.stmt, due: r.due, left: r.left, full: r.full, goal: r.goal, paid: r.paid, about: r.about });
    if (JSON.stringify(st) !== before) await store(env, st);
    try { await cardFlush(env, now, st); } catch (e) { }
    return r; } catch (e) { return null; }
}
async function quiet(env, now) { let p = null; try { p = await env.EVENTS_KV.get(K_BPREF, { type: 'json' }); } catch (e) { }
  const f = p && Number.isInteger(p.quietFrom) ? p.quietFrom : 22, t = p && Number.isInteger(p.quietTo) ? p.quietTo : 8, h = nzHour(now);
  return f > t ? (h >= f || h < t) : (h >= f && h < t); }
// every minute: send a held push (outside quiet hours), and the morning reminders (8–11am NZ)
export async function cardFlush(env, now = Date.now(), st0) {
  if (!env || !env.EVENTS_KV) return 0; const st = st0 || await load(env); if (!st.snap) return 0;
  let changed = false, sent = 0;
  if (st.snap.on && st.last && !st.last.full && st.last.left > 0.005 && st.last.stmt) {
    const T = nzDay(now), h = nzHour(now), days = dayDiff(T, st.last.due);
    if (h >= 8 && h < 12 && st.remDay !== T && T > st.last.stmt && days >= 0 && (wday(T) === 3 || days <= 3)) {
      st.remDay = T; changed = true; if (!st.q) st.q = leftMsg(Object.assign({}, st.last, { days, T }), wday(T) === 3 ? 'wed' : 'rem', st.snap);
    }
  }
  if (st.q && !st.snap.on) { delete st.q; changed = true; }
  if (st.q && !(await quiet(env, now))) { const m = st.q, sig = m.title + '|' + m.body; delete st.q; changed = true; st.sentAt = new Date(now).toISOString();
    if (!(RECENT.get(sig) > now - 30 * 60e3)) { RECENT.set(sig, now); sent = await shanePush(env, m, now); } }
  if (changed) await store(env, st);
  return sent;
}
