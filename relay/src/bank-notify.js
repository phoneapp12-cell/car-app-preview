/* 2.27.9: phone push for money in / out (Shane). Runs on the relay each time the Akahu data is fetched again: the
   transactions that weren't there last time are compared, and a push goes out for money in and for money out over his
   threshold (default $100). Own transfers (paired in categorise) are skipped. Quiet 10pm–8am NZ, at most 8 a day, a
   burst of more than 5 is one summary push. Only a friendly account name, the amount and a payee name with any long
   number runs removed go in the push: never account numbers or tokens. First fetch, or a newly linked account: nothing. */
import { shanePush } from './shop-notify.js';
export const K_BPREF = 'bank-pref-v1';
const K_BCOUNT = 'bank-push-n-v1';
export const bankPrefDefault = () => ({ on: true, inPush: true, outOver: 100, off: [], quietFrom: 22, quietTo: 8 });
export function cleanBankPref(b) {
  const d = bankPrefDefault(); b = b && typeof b === 'object' ? b : {};
  const n = Number(b.outOver);
  return { on: b.on !== false, inPush: b.inPush !== false, outOver: Number.isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n) : (b.outOver === null ? null : d.outOver),
    off: (Array.isArray(b.off) ? b.off : []).map(x => String(x).slice(0, 60)).filter(Boolean).slice(0, 40),
    quietFrom: Number.isInteger(b.quietFrom) && b.quietFrom >= 0 && b.quietFrom <= 23 ? b.quietFrom : d.quietFrom, quietTo: Number.isInteger(b.quietTo) && b.quietTo >= 0 && b.quietTo <= 23 ? b.quietTo : d.quietTo };
}
const money = v => '$' + Math.abs(v).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const acctName = a => !a ? 'Bank' : a.type === 'CREDITCARD' ? (a.bank || 'ASB') + ' credit card' : /orbit/i.test(a.name) ? 'ORBIT' : `${a.bank ? a.bank + ' ' : ''}${a.name}`.slice(0, 40);
export const payeeOf = t => String(t.merchant || t.desc || '').replace(/[*#]+/g, ' ').replace(/\b\d[\d\s-]{2,}\d\b/g, '').replace(/\b\d{3,}\b/g, '').replace(/\b(card|ref|reference|particulars|code)\b.*$/i, '').replace(/\s+/g, ' ').trim().slice(0, 40)
  .toLowerCase().replace(/(^|[\s\-\/&(])([a-z])/g, (x, p, c) => p + c.toUpperCase());
const nzHour = now => Number(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hourCycle: 'h23' }).format(new Date(now)));
const nzDay = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date(now));
// pure: which transactions are new and should push
export function bankPushes(oldD, newD, pref, now = Date.now()) {
  pref = cleanBankPref(pref); if (!pref.on || !oldD || !newD) return [];
  const h = nzHour(now), q = pref.quietFrom > pref.quietTo ? (h >= pref.quietFrom || h < pref.quietTo) : (h >= pref.quietFrom && h < pref.quietTo); if (q) return [];
  const had = new Set((oldD.transactions || []).map(t => t.id)), oldAcct = new Set((oldD.accounts || []).map(a => a.id)), acc = Object.fromEntries((newD.accounts || []).map(a => [a.id, a]));
  const cut = now - 10 * 864e5;
  const fresh = (newD.transactions || []).filter(t => t.id && !had.has(t.id) && oldAcct.has(t.acct) && !pref.off.includes(t.acct) && Date.parse(t.date) >= cut && !(t.cat2 === 'transfer' && t.pair));
  const want = fresh.filter(t => t.amount > 0 ? pref.inPush : (pref.outOver != null && -t.amount >= pref.outOver));
  if (!want.length) return [];
  if (want.length > 5) { const tin = want.filter(t => t.amount > 0).reduce((n, t) => n + t.amount, 0), tout = want.filter(t => t.amount < 0).reduce((n, t) => n - t.amount, 0);
    return [{ title: `\u{1F4B3} ${want.length} new bank transactions`, body: [tin ? money(tin) + ' in' : '', tout ? money(tout) + ' out' : ''].filter(Boolean).join(', '), url: '#alerts', tag: 'bank-burst', ttl: 12 * 3600 }]; }
  return want.slice(0, 4).map(t => ({ title: `${t.amount > 0 ? '\u2B07\uFE0F' : '\u2B06\uFE0F'} ${money(t.amount)} ${t.amount > 0 ? 'in' : 'out'} \u00B7 ${acctName(acc[t.acct])}`, body: payeeOf(t) ? (t.amount > 0 ? 'from ' : '') + payeeOf(t) : 'Bank transaction', url: '#alerts', tag: 'bank-' + t.id.slice(-12), ttl: 12 * 3600 }));
}
export async function bankPushRun(env, oldD, newD, now = Date.now(), fetchImpl = fetch) {
  try { const pref = await env.EVENTS_KV.get(K_BPREF, { type: 'json' }); const L = bankPushes(oldD, newD, pref || bankPrefDefault(), now); if (!L.length) return 0;
    const k = K_BCOUNT + ':' + nzDay(now), n = Number(await env.EVENTS_KV.get(k)) || 0; let sent = 0;
    for (const m of L.slice(0, Math.max(0, 8 - n))) { await shanePush(env, m, now, fetchImpl); sent++; }
    if (sent) await env.EVENTS_KV.put(k, String(n + sent), { expirationTtl: 2 * 86400 }); return sent; } catch (e) { return 0; }
}
