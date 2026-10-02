/* Council roading projects for the Due Dates app.
 *
 * Source: Whangārei District Council "Roading improvements"
 * https://www.wdc.govt.nz/Council/Projects/Roading-improvements
 * The council site does not send CORS headers, so the phone cannot read it.
 * robots.txt allows this page. Council terms allow reproducing the content for
 * personal, informational and non-commercial use. Each project links back.
 *
 * Only rows the page marks "Construction underway" are returned. Nothing is invented.
 * One page, re-read at most every 3 hours, saved in KV. No logging.
 */
import { decode, text, get } from './events.js';

export const ROADWORKS_URL = 'https://www.wdc.govt.nz/Council/Projects/Roading-improvements';
const KV_KEY = 'wdc-roadworks-v1';
const TTL = 3 * 3600 * 1000;
let mem = null;

export function parseRoadworks(html) {
  const raw = String(html || '');
  const updated = (text(raw).match(/last updated on (\d{1,2} [A-Za-z]+ \d{4})/i) || [])[1] || '';
  const projects = [];
  let rows = 0;
  for (const tr of raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const tds = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
    if (tds.length < 3) continue;
    rows++;
    const status = text(tds[2]);
    if (!/^construction underway$/i.test(status)) continue;
    const full = text(tds[0]);
    if (!full) continue;
    const start = text(tds[1]);
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
    const data = parseRoadworks(await get(ROADWORKS_URL, fetchImpl));
    mem = { at: now, data };
    if (env.EVENTS_KV) { try { await env.EVENTS_KV.put(KV_KEY, JSON.stringify(mem)); } catch (e) { } }
    return data;
  } catch (e) {
    if (mem && mem.data) return mem.data;
    throw e;
  }
}
export function resetRoadworks() { mem = null; }
