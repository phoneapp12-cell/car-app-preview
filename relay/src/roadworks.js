/* Council roading projects for the Due Dates app.
 *
 * Source: Whangārei District Council "Roading improvements"
 * https://www.wdc.govt.nz/Council/Projects/Roading-improvements
 * The council site does not send CORS headers, so the phone cannot read it.
 * robots.txt allows this page. Council terms allow reproducing the content for
 * personal, informational and non-commercial use. Each project links back.
 *
 * Only projects whose expected start on that page falls in the next 12 months
 * (Pacific/Auckland), including the current month, are returned. A start month
 * already past is left out, and so is anything further than a year ahead.
 * A two-year range ("2026 / 2027") or "TBC" is not a date we can place, so it
 * is left out rather than guessed. Nothing is invented.
 * One page, re-read at most every 3 hours, saved in KV. No logging.
 */
import { decode, text, get } from './events.js';

export const ROADWORKS_URL = 'https://www.wdc.govt.nz/Council/Projects/Roading-improvements';
const KV_KEY = 'wdc-roadworks-v2';
const TTL = 3 * 3600 * 1000;
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
let mem = null;

export function aucklandParts(now = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
  const year = Number(p.year), month = Number(p.month), day = Number(p.day);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function ymd(p) { return p.year * 10000 + p.month * 100 + p.day; }

function addMonths(parts, n) {
  const idx = parts.year * 12 + (parts.month - 1) + n;
  const year = Math.floor(idx / 12), month = (idx % 12) + 1;
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(parts.day, dim) };
}

// Month and year as the council prints them ("October 2026"), or a full day
// ("2 October 2026"). Anything else, including "2026 / 2027" and "TBC", is not a start date.
export function councilStart(start) {
  const s = String(start || '').replace(/\s+/g, ' ').trim();
  let day = 0, name, year;
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) { day = Number(m[1]); name = m[2]; year = Number(m[3]); }
  else {
    m = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (!m) return null;
    name = m[1]; year = Number(m[2]);
  }
  const month = MONTHS[name.toLowerCase()];
  if (!month || year < 1990 || year > 2100) return null;
  if (day && (day < 1 || day > 31)) return null;
  return { year, month, day };
}

// True when the expected start is this month or later, and not more than 12 months ahead.
// A month with no day counts for the whole month. A stated day must be today or later,
// and on or before the same date next year. Compared in Pacific/Auckland.
export function startWithinNextYear(start, now = Date.now()) {
  const today = aucklandParts(now);
  const when = councilStart(start);
  if (!today || !when) return false;
  if (when.day) {
    const end = addMonths(today, 12);
    const key = ymd(when);
    return key >= ymd(today) && key <= ymd(end);
  }
  const startIdx = when.year * 12 + (when.month - 1);
  const nowIdx = today.year * 12 + (today.month - 1);
  return startIdx >= nowIdx && startIdx <= nowIdx + 12;
}

export function parseRoadworks(html, now = Date.now()) {
  const raw = String(html || '');
  const updated = (text(raw).match(/last updated on (\d{1,2} [A-Za-z]+ \d{4})/i) || [])[1] || '';
  const projects = [];
  let rows = 0;
  for (const tr of raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const tds = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
    if (tds.length < 3) continue;
    rows++;
    const full = text(tds[0]);
    if (!full) continue;
    const start = text(tds[1]);
    if (!startWithinNextYear(start, now)) continue;
    const status = text(tds[2]);
    let url = ROADWORKS_URL;
    const href = (tds[0].match(/<a\b[^>]*href="([^"]+)"/i) || [])[1] || '';
    if (href) {
      try {
        const u = new URL(decode(href), 'https://www.wdc.govt.nz');
        if (u.protocol === 'https:' && u.hostname === 'www.wdc.govt.nz') url = u.toString();
      } catch (e) { /* keep the programme page */ }
    }
    const cut = full.indexOf(' - ');
    const name = (cut > 0 ? full.slice(0, cut) : full).trim();
    const detail = cut > 0 ? full.slice(cut + 3).trim() : '';
    const id = full.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'project';
    projects.push({ id, name, detail, full, start, status, url });
  }
  if (!rows) throw new Error('roadworks_changed');
  const seen = new Set();
  for (const p of projects) {
    let id = p.id, n = 2;
    while (seen.has(id)) { id = (p.id.slice(0, 70) || 'project') + '-' + n; n++; }
    seen.add(id);
    p.id = id;
  }
  return { source: ROADWORKS_URL, updated, count: projects.length, projects };
}

export async function getCouncilRoadworks(env = {}, fetchImpl = fetch, now = Date.now()) {
  if (mem && mem.data && now - mem.at < TTL) return mem.data;
  if (env.EVENTS_KV) {
    try {
      const c = await env.EVENTS_KV.get(KV_KEY, { type: 'json' });
      if (c && c.data && now - c.at < TTL) { mem = c; return c.data; }
      if (c && c.data) mem = c;
    } catch (e) { /* a bad cache must not hide a fresh read */ }
  }
  try {
    const data = parseRoadworks(await get(ROADWORKS_URL, fetchImpl), now);
    mem = { at: now, data };
    if (env.EVENTS_KV) { try { await env.EVENTS_KV.put(KV_KEY, JSON.stringify(mem)); } catch (e) { } }
    return data;
  } catch (e) {
    if (mem && mem.data) return mem.data;
    throw e;
  }
}
export function resetRoadworks() { mem = null; }
