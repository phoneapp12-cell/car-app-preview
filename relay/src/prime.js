/* New on Prime Video NZ for My App's rotating strip (2.23.58). GET /prime -> { items: [{ title, date }], source, link }.
 * Real titles and NZ dates only, from Flicks' monthly "coming to Prime Video NZ" guide (dated list), falling back to
 * ottpath.com's "New on Prime Video in New Zealand this month" (dates the platform reports). Cached 24 h. No AI. */
const FLICKS = 'https://www.flicks.co.nz/features/best-coming-to-prime-video-nz/';
const OTT = 'https://ottpath.com/nz/prime/this-month';
const TTL = 24 * 3600, CK = 'prime-v5';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
let mem = null;
const ent = s => String(s).replace(/&#0?38;|&amp;/g, '&').replace(/&#8217;|&rsquo;|&#039;|&#39;/g, '’').replace(/&#43;/g, '+').replace(/&quot;|&#8220;|&#8221;/g, '"').replace(/&#8211;|&ndash;/g, '–').replace(/&nbsp;/g, ' ').replace(/&[a-z#0-9]+;/gi, '');
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export function parseFlicks(html) {
  const s = String(html || ''), i = s.search(/All titles arriving on Prime Video NZ/i); if (i < 0) return [];
  const yr = (s.match(/(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (20\d\d)/) || [])[3] || String(new Date().getUTCFullYear());
  const part = s.slice(i, i + 20000).split(/<\/div>/)[0], out = [];
  const re = /<strong>\s*([A-Za-z]+)\s+(\d{1,2})\s*<\/strong>\s*<\/p>\s*<p>([\s\S]*?)<\/p>/g; let m;
  while ((m = re.exec(part))) {
    const mo = MONTHS.indexOf(m[1].toLowerCase()); if (mo < 0) continue;
    m[3].split(/<br\s*\/?>/i).map(t => ent(t.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()).filter(t => t.length > 1 && t.length < 120)
      .forEach(title => out.push({ title, date: iso(+yr, mo, +m[2]) }));
  }
  return out;
}
export function parseOtt(html) {
  const out = [], re = /<span class="card-title">([\s\S]*?)<span class="card-year">[\s\S]*?<span class="card-note">Added to Prime Video on (\d{1,2}) ([A-Za-z]{3}) (20\d\d)<\/span>/g; let m;
  while ((m = re.exec(String(html || '')))) { const mo = MONTHS.findIndex(x => x.startsWith(m[3].toLowerCase())); if (mo >= 0) out.push({ title: ent(m[1]).trim(), date: iso(+m[4], mo, +m[2]) }); }
  return out;
}
async function get(u, f) { const r = await f(u, { headers: { 'user-agent': UA, accept: 'text/html', 'accept-language': 'en-NZ,en;q=0.9' } }); if (!r.ok) throw new Error('http ' + r.status); return r.text(); }

const POSTER_FALLBACK = "";
async function lookupPoster(rawTitle, fetchImpl = fetch) {
  const raw = String(rawTitle || "");
  const isSeries = /:\s*s(?:eason)?\s*\d+|\(season\s*\d+\)|\bseries\b/i.test(raw);
  const altMatch = raw.match(/\(([^)]+)\)/);
  const altTitle = altMatch && !/season\s*\d+/i.test(altMatch[1]) ? altMatch[1].trim() : "";
  const clean = raw
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/:\s*s(?:eason)?\s*\d+.*$/i, "")
    .replace(/\s+s(?:eason)?\s*\d+.*$/i, "")
    .replace(/f\*\*k/gi, "fuck")
    .replace(/\s+35\+$/i, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

  // 1. IMDb Suggestion API (covers both movies & TV shows accurately)
  const queries = [clean, clean.replace(/favour/gi, "favor"), altTitle, clean.split(":")[0].trim()].filter(Boolean);
  for (const q of queries) {
    const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!slug) continue;
    try {
      const r = await fetchImpl("https://v3.sg.media-imdb.com/suggestion/x/" + encodeURIComponent(slug) + ".json", { signal: AbortSignal.timeout(3500) });
      if (r.ok) {
        const j = await r.json();
        const d = (j && Array.isArray(j.d)) ? j.d.filter(x => x && x.i && x.i.imageUrl) : [];
        if (d.length) {
          const qn = norm(q);
          const hit =
            d.find(x => norm(x.l) === qn && (isSeries ? /tv/i.test(x.qid || "") : /movie|feature|short|tvMovie/i.test(x.qid || ""))) ||
            d.find(x => norm(x.l) === qn) ||
            d.find(x => isSeries ? /tv/i.test(x.qid || "") : /movie|feature/i.test(x.qid || "")) ||
            d[0];
          if (hit && hit.i && hit.i.imageUrl) {
            return String(hit.i.imageUrl).replace(/\._V1_.*\.jpg$/i, "._V1_QL75_UX480_.jpg");
          }
        }
      }
    } catch (e) {}
  }

  // 2. TVMaze (exact title check)
  try {
    const r = await fetchImpl("https://api.tvmaze.com/singlesearch/shows?q=" + encodeURIComponent(clean), { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const j = await r.json();
      const img = j && j.image && (j.image.medium || j.image.original);
      if (img && img.startsWith("https://") && norm(j.name) === norm(clean)) return img;
    }
  } catch (e) {}

  // 3. Wikipedia summary thumbnail
  for (const suffix of [" (film)", " (TV series)", ""]) {
    try {
      const r = await fetchImpl("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(clean + suffix), { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const j = await r.json();
        const src = j && ((j.thumbnail && j.thumbnail.source) || (j.originalimage && j.originalimage.source));
        if (src && src.startsWith("https://")) return src;
      }
    } catch (e) {}
  }

  return "";
}
export async function posterRoute(urlObj, fetchImpl = fetch) {
  const q = (urlObj.searchParams.get("q") || "").trim().slice(0, 140);
  if (!q) return { img: "" };
  const img = await lookupPoster(q, fetchImpl);
  return { q, img };
}

export async function primeRoute(env, fetchImpl = fetch, now = Date.now()) {
  if (mem && now - mem.at < TTL * 1000) return mem.data;
  const kv = env && env.EVENTS_KV && typeof env.EVENTS_KV.get === 'function' ? env.EVENTS_KV : null;
  if (kv) { try { const c = await kv.get(CK, { type: 'json' }); if (c && Array.isArray(c.items) && now - Date.parse(c.checked) < TTL * 1000) { mem = { at: Date.parse(c.checked), data: c }; return c; } } catch (e) { } }
  let items = [], source = '', link = '';
  try { items = parseFlicks(await get(FLICKS, fetchImpl)); source = 'flicks.co.nz'; link = FLICKS; } catch (e) { }
  if (!items.length) { try { items = parseOtt(await get(OTT, fetchImpl)); source = 'ottpath.com'; link = OTT; } catch (e) { } }
  const top = items.slice(0, 45);
  for (let i = 0; i < top.length; i += 6) {
    await Promise.all(top.slice(i, i + 6).map(async x => {
      if (!x.img) x.img = await lookupPoster(x.title, fetchImpl);
    }));
  }
  const data = { ok: true, source, link, checked: new Date(now).toISOString(), items: top };
  if (items.length) { mem = { at: now, data }; if (kv) { try { await kv.put(CK, JSON.stringify(data), { expirationTtl: TTL }); } catch (e) { } } }
  return data;
}
