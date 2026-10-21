/* 2.27.37: TV series links. The GitHub Action (tools/tv-trim.py) publishes the trimmed guide (sport already dropped)
 * to the repo's tv-data branch, one small JSON file per NZ day. The relay reads today to 2 days ahead (cached an hour),
 * and for each phone's series links schedules one-off 'Starting in 10 min' pushes for matching episodes, about hourly
 * on the 10-minute cron and straight away when the phone sends its reminders. Passed episodes are skipped. */
import { cacheGet, cachePut } from './kvguard.js';
export const TV_DATA = 'https://raw.githubusercontent.com/phoneapp12-cell/car-app-preview/tv-data/tv/';
const SPORT = /\b(sports?|rugby|cricket|netball|football|soccer|golf|tennis|racing|boxing|ufc|nrl|afl|nba|nfl)\b/i;
export const tvNorm = t => String(t || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/^(new|premiere|final)\s*:\s*/, '').replace(/[^a-z0-9\u00c0-\u024f]+/g, ' ').trim().slice(0, 80);
const nzParts = ms => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
const nzDay = ms => { const p = nzParts(ms); return `${p.year}-${p.month}-${p.day}`; };
const clock = ms => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
async function getJson(name, fetchImpl) {
  const c = await cacheGet('tvd-' + name); if (c) return c;
  const r = await fetchImpl(TV_DATA + name + '.json', { cf: { cacheTtl: 900 } }); if (!r.ok) throw new Error('tv ' + r.status);
  const v = await r.json(); await cachePut('tvd-' + name, v, 3600); return v;
}
export function cleanLinks(L) {
  return (Array.isArray(L) ? L : []).map(l => ({ n: tvNorm(l && (l.n || l.t)), ch: /^(\*|[a-z0-9.-]{1,40})$/i.test(String(l && l.ch)) ? String(l.ch) : '*' })).filter(l => l.n).slice(0, 30);
}
// Pure: links + guide days in, one-off reminders for matching episodes starting more than 10 min from now (next 48 h).
export function seriesReminders(links, days, names, now) {
  const out = [], seen = new Set(); if (!links.length) return out;
  for (const day of days) for (const [ch, progs] of Object.entries((day && day.ch) || {})) for (const p of progs) {
    const s = p[0] * 1000, at = s - 600000; if (at <= now + 60000 || s > now + 48 * 3600e3) continue;
    const n = tvNorm(p[2]); if (!links.some(l => l.n === n && (l.ch === '*' || l.ch === ch)) || SPORT.test(p[2] + ' ' + (p[3] || ''))) continue;
    const id = 'tv-' + ch.replace(/[^\w]/g, '') + '-' + s; if (seen.has(id)) continue; seen.add(id);
    const cn = (names && names[ch]) || ch, head = '📺 Starting in 10 min: ', tail = ` on ${cn} at ${clock(s)}`, room = 80 - head.length - tail.length;
    const t = p[2].length > room ? p[2].slice(0, Math.max(8, room - 1)) + '…' : p[2], q = nzParts(at);
    out.push({ id, title: (head + t + tail).slice(0, 80), date: `${q.year}-${q.month}-${q.day}`, time: `${q.hour}:${q.minute}`, repeat: 'none' });
  }
  return out.slice(0, 25);
}
export async function seriesFor(links, fetchImpl = fetch, now = Date.now()) {
  if (!links || !links.length) return [];
  const idx = await getJson('index', fetchImpl), want = [0, 1, 2].map(i => nzDay(now + i * 86400e3)).filter(d => (idx.days || []).includes(d));
  const days = []; for (const d of want) { try { days.push(await getJson(d, fetchImpl)); } catch (e) { } }
  const names = Object.assign({}, idx.names || {}), today = nzDay(now); // 2.27.38: Sky renames by date (ids unchanged)
  for (const [k, v] of Object.entries(idx.renames || {})) if (Array.isArray(v) && today >= v[0]) names[k] = v[1];
  return seriesReminders(links, days, names, now);
}
