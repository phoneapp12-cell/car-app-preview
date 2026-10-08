/* GET /alerts: MetService severe weather watches and warnings (public CAP feed) that cover Whangārei.
 * Source: https://alerts.metservice.com/cap/rss (CC BY 4.0, Meteorological Service of New Zealand Ltd).
 * The phone can't read it directly (its CORS header only allows about.metservice.com).
 * Fixed source, no input. Each alert's CAP file is read from alerts.metservice.com only.
 * An alert counts when one of its area polygons contains Whangārei or Onerahi, or its area text names
 * Northland or Whangārei. Cancelled and expired alerts are left out. Kept 5 minutes in memory and KV.
 */
export const CAP_RSS = 'https://alerts.metservice.com/cap/rss';
const TTL = 5 * 60 * 1000;
const KV_KEY = 'metservice-alerts-v1';
const POINTS = [[-35.7251, 174.3237], [-35.7495, 174.3646]]; // Whangārei city, Onerahi
let mem = null;

const decode = s => String(s || '')
  .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&amp;/g, '&').trim();
// First <name>…</name> (namespace prefixes allowed), or all of them.
export function tags(xml, name) {
  const re = new RegExp('<(?:[\\w-]+:)?' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?' + name + '>', 'gi');
  const out = []; let m;
  while ((m = re.exec(String(xml || '')))) out.push(m[1]);
  return out;
}
const tag = (xml, name) => decode(tags(xml, name)[0] || '');

export function inPolygon(lat, lon, poly) {
  const pts = String(poly || '').trim().split(/\s+/).map(p => p.split(',').map(Number)).filter(p => p.length === 2 && p.every(Number.isFinite));
  if (pts.length < 4) return false;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [yi, xi] = pts[i], [yj, xj] = pts[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function rssLinks(xml) {
  return tags(xml, 'item').map(it => tag(it, 'link') || tag(it, 'guid'))
    .filter(u => { try { const x = new URL(u); return x.protocol === 'https:' && x.hostname === 'alerts.metservice.com'; } catch (e) { return false; } })
    .slice(0, 40);
}

// One CAP file → zero or more alerts for Whangārei (one per <info>, English only).
export function parseCap(xml, now = Date.now()) {
  const out = [];
  const msgType = tag(xml, 'msgType');
  if (/^cancel$/i.test(msgType)) return out;
  const id = tag(xml, 'identifier');
  const sent = tag(xml, 'sent');
  tags(xml, 'info').forEach((info, n) => {
    const lang = tag(info, 'language');
    if (lang && !/^en/i.test(lang)) return;
    const expires = tag(info, 'expires'), onset = tag(info, 'onset') || tag(info, 'effective');
    const exp = Date.parse(expires);
    if (Number.isFinite(exp) && exp < now) return;
    const params = {};
    tags(info, 'parameter').forEach(p => { const k = tag(p, 'valueName'); if (k) params[k] = tag(p, 'value'); });
    const areas = tags(info, 'area');
    const names = areas.map(a => tag(a, 'areaDesc')).filter(Boolean);
    const hit = areas.some(a => tags(a, 'polygon').some(poly => POINTS.some(([la, lo]) => inPolygon(la, lo, decode(poly)))))
      || names.some(s => /northland|whang[aā]rei/i.test(s));
    if (!hit) return;
    const colour = String(params.ColourCode || '').trim();
    out.push({
      id: (id || 'alert') + (n ? '-' + n : ''),
      event: tag(info, 'event').slice(0, 80),
      headline: tag(info, 'headline').slice(0, 160),
      severity: tag(info, 'severity').slice(0, 20),
      colour: /^(red|orange|yellow)$/i.test(colour) ? colour[0].toUpperCase() + colour.slice(1).toLowerCase() : '',
      area: names.join('; ').slice(0, 300),
      onset, expires, sent,
      desc: tag(info, 'description').replace(/\s+/g, ' ').slice(0, 600),
      web: (() => { const w = tag(info, 'web'); try { const u = new URL(w); return u.protocol === 'https:' && /(^|\.)metservice\.com$/.test(u.hostname) ? u.toString() : ''; } catch (e) { return ''; } })()
    });
  });
  return out;
}

async function getText(url, fetchImpl, ms = 10000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetchImpl(url, { headers: { 'Accept': 'application/xml, text/xml, application/rss+xml', 'User-Agent': 'DueDatesApp/1.0 (+https://phoneapp12-cell.github.io/car-app-preview/)' }, signal: ctl.signal, redirect: 'manual' });
    if (!r.ok) throw new Error('upstream');
    const text = await r.text();
    if (text.length > 2 * 1024 * 1024) throw new Error('too_large');
    return text;
  } finally { clearTimeout(t); }
}

export async function getMetAlerts(env = {}, fetchImpl = fetch, now = Date.now()) {
  if (mem && now - mem.at < TTL) return mem.data;
  let saved = null;
  if (env.EVENTS_KV) { try { saved = await env.EVENTS_KV.get(KV_KEY, { type: 'json' }); } catch (e) { saved = null; } }
  if (saved && saved.data && now - saved.at < TTL) { mem = saved; return saved.data; }
  try {
    const rss = await getText(CAP_RSS, fetchImpl);
    if (!/<rss[\s>]/i.test(rss)) throw new Error('not_rss');
    const links = rssLinks(rss);
    const caps = await Promise.all(links.map(u => getText(u, fetchImpl).catch(() => '')));
    const seen = new Set(), alerts = [];
    caps.forEach(x => parseCap(x, now).forEach(a => { const k = a.event + '|' + a.onset + '|' + a.area; if (!seen.has(k)) { seen.add(k); alerts.push(a); } }));
    const rank = { Red: 0, Orange: 1, Yellow: 2 };
    alerts.sort((a, b) => (rank[a.colour] ?? 3) - (rank[b.colour] ?? 3) || String(a.onset).localeCompare(String(b.onset)));
    const data = { source: 'MetService', feed: CAP_RSS, licence: 'CC BY 4.0', updated: new Date(now).toISOString(), checked: links.length, count: alerts.length, alerts };
    mem = { at: now, data };
    if (env.EVENTS_KV) { try { await env.EVENTS_KV.put(KV_KEY, JSON.stringify(mem), { expirationTtl: 6 * 3600 }); } catch (e) { } }
    return data;
  } catch (e) {
    if (saved && saved.data) return Object.assign({}, saved.data, { stale: true });
    throw e;
  }
}
