/* 2.27.3: daily recommendations for My App's Notifications "New today". GET /recs?k=top40|games|topics|world
 * Only real items from the sources below; nothing is invented, no AI. Each kind cached 12 h (memory + KV).
 *   top40  – The Official Aotearoa Music Charts singles page (new entries are marked with the 'new' arrow)
 *   games  – OpenCritic "best of the last 90 days" for PC and Nintendo Switch (score shown, Mighty/Strong only)
 *   topics – blogs on his topics: Home Assistant + The Verge Smart Home (tech/smart home), Gardeners' World,
 *            Becoming Minimalist (organising), Mama Knows Gluten Free + Gluten Free on a Shoestring,
 *            Wilderness magazine NZ (bushwalks), Guardian Books
 *   world  – BBC News World RSS (the app applies its usual no-sport / no court-violence-sexual filter too)
 * Checked live 18 Oct 2026: every source returned current items. */
import { decode, get } from './events.js';
import { parseBlogFeed } from './blogs.js';
import { isBlocked, sameStory, SPORT_RE } from './news.js';

const TTL = 12 * 3600 * 1000;
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const mem = {};
const ent = s => decode(String(s || '')).replace(/\s+/g, ' ').trim();
async function html(u, f) { const r = await f(u, { headers: { 'user-agent': UA, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'en-NZ,en;q=0.9' } }); if (!r.ok) throw new Error('http ' + r.status); return r.text(); }

export const TOPIC_FEEDS = [
  { id: 'ha', topic: 'Smart home', name: 'Home Assistant', feed: 'https://www.home-assistant.io/atom.xml' },
  { id: 'verge', topic: 'Smart home', name: 'The Verge', feed: 'https://www.theverge.com/rss/smart-home/index.xml' },
  { id: 'gw', topic: 'Gardening', name: 'Gardeners’ World', feed: 'https://www.gardenersworld.com/feed/' },
  { id: 'bm', topic: 'Organising', name: 'Becoming Minimalist', feed: 'https://www.becomingminimalist.com/feed/' },
  { id: 'mkgf', topic: 'Gluten free cooking', name: 'Mama Knows Gluten Free', feed: 'https://www.mamaknowsglutenfree.com/feed/' },
  { id: 'gfos', topic: 'Gluten free cooking', name: 'Gluten Free on a Shoestring', feed: 'https://glutenfreeonashoestring.com/feed/' },
  { id: 'wild', topic: 'Bushwalks', name: 'Wilderness (NZ)', feed: 'https://www.wildernessmag.co.nz/feed/' },
  { id: 'books', topic: 'Books', name: 'Guardian Books', feed: 'https://www.theguardian.com/books/rss' }
];

export function parseChart(s) {
  s = String(s || ''); const out = [];
  const parts = s.split('<img alt="').slice(1);
  for (const p of parts) {
    const m = /^(.*?) by (.*?) cover"/.exec(p); if (!m) continue;
    const nxt = p.indexOf('<img alt="'), chunk = nxt > 0 ? p.slice(0, nxt) : p.slice(0, 6000);
    const cov = /src="(\/images\/covers\/[^"?]+)/.exec(chunk);
    out.push({ rank: out.length + 1, title: ent(m[1]), artist: ent(m[2]), isNew: /arrow-new/.test(chunk), re: /arrow-re-entry/.test(chunk), cover: cov ? 'https://aotearoamusiccharts.co.nz' + cov[1] + '?w=384' : '' });
    if (out.length >= 40) break;
  }
  const wk = /(\d{1,2} [A-Z][a-z]+ 20\d\d)/.exec(s);
  return { week: wk ? wk[1] : '', items: out };
}
export function parseOpenCritic(s, platform) {
  const out = []; const re = /<div class="inner-orb small-orb">\s*(\d{2,3})\s*<\/div>[\s\S]*?<a href="(\/game\/\d+\/[^"]+)"><img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[\s\S]*?first-release-date[\s\S]*?<span[^>]*>([^<]*)<\/span>/g; let m;
  s = String(s || '').replace(/ _ng(content|host)-[\w-]+=""/g, '');
  while ((m = re.exec(s))) { const score = +m[1]; if (score < 80) continue; out.push({ name: ent(m[3]), score, url: 'https://opencritic.com' + m[2], img: m[4], released: ent(m[5]), platform }); if (out.length >= 12) break; }
  return out;
}
async function build(k, f) {
  if (k === 'top40') { const d = parseChart(await html('https://aotearoamusiccharts.co.nz/charts/singles', f)); if (!d.items.length) throw new Error('chart_changed'); return Object.assign({ source: 'Official Aotearoa Music Charts', link: 'https://aotearoamusiccharts.co.nz/charts/singles' }, d); }
  if (k === 'games') {
    const [pc, sw] = await Promise.allSettled([html('https://opencritic.com/browse/pc/last90/score', f), html('https://opencritic.com/browse/switch/last90/score', f)]);
    const items = [...(pc.status === 'fulfilled' ? parseOpenCritic(pc.value, 'PC') : []), ...(sw.status === 'fulfilled' ? parseOpenCritic(sw.value, 'Switch') : [])];
    if (!items.length) throw new Error('games_changed'); return { source: 'OpenCritic', items };
  }
  if (k === 'topics') {
    const rs = await Promise.allSettled(TOPIC_FEEDS.map(async b => ({ b, items: parseBlogFeed(await get(b.feed, f, { headers: { 'user-agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } })) })));
    const items = []; rs.forEach(r => { if (r.status !== 'fulfilled') return; r.value.items.slice(0, 4).forEach(x => items.push({ topic: r.value.b.topic, source: r.value.b.name, title: x.title, url: x.url, published: x.published, summary: x.summary || '' })); });
    if (!items.length) throw new Error('topics_unavailable'); return { items, ok: rs.filter(r => r.status === 'fulfilled').map(r => r.value.b.id) };
  }
  if (k === 'world') { const xml = await get('https://feeds.bbci.co.uk/news/world/rss.xml', f, { headers: { 'user-agent': UA } });
    const fld = (b, n) => { const m = new RegExp('<' + n + '\\b[^>]*>([\\s\\S]*?)<\\/' + n + '>', 'i').exec(b); return m ? ent(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')) : ''; };
    const items = [...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m => m[1]).map(b => { const u = fld(b, 'link').split('?')[0], t = Date.parse(fld(b, 'pubDate')), im = (b.match(/<media:thumbnail[^>]+url=["\'](https:\/\/[^"\']+)["\']/i) || [])[1] || ''; return { title: fld(b, 'title'), url: /^https:\/\/www\.bbc\.(co\.uk|com)\//.test(u) ? u : '', published: Number.isFinite(t) ? new Date(t).toISOString() : '', summary: fld(b, 'description').slice(0, 220), img: im ? im.replace('/standard/240/', '/standard/640/') : '', source: 'BBC News' }; })
      .filter(x => x.title && x.url && x.published).slice(0, 25);
    // 2.27.4: NZ Herald World too; a story BBC already has shows once (BBC kept). Court/violence/sexual and sport dropped here as well.
    try { const hx = await get('https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/world/?outputType=xml', f, { headers: { 'user-agent': UA } });
      [...String(hx).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m => m[1]).forEach(b => { const u = fld(b, 'link').trim(), t = Date.parse(fld(b, 'pubDate')), title = fld(b, 'title').trim(), sm = fld(b, 'description').slice(0, 220);
        if (!title || !/^https:\/\/www\.nzherald\.co\.nz\//.test(u) || !Number.isFinite(t) || /\/sport\//.test(u) || SPORT_RE.test(title) || isBlocked(title, sm)) return;
        if (items.some(y => sameStory(y.title, title))) return;
        const im = (b.match(/<media:content[^>]+url=["\'](https:\/\/[^"\']+)["\']/i) || [])[1] || ''; items.push({ title, url: u, published: new Date(t).toISOString(), summary: sm, img: im ? ent(im) : '', source: 'NZ Herald' }); });
    } catch (e) { /* BBC alone */ }
    items.sort((a, b) => b.published.localeCompare(a.published));
    if (!items.length) throw new Error('world_changed'); return { items: items.slice(0, 35) }; }
  if (k === 'suno') { // 2.27.4: Suno's own release notes page (no RSS): title, date, kind (New Feature / Improvement …), link
    const h = String(await get('https://suno.com/release-notes', f, { headers: { 'user-agent': UA } })), seen = new Set(), items = [];
    for (const m of h.matchAll(/href="\/release-notes\/([a-z0-9-]+)"[^>]*>([\s\S]{0,1200}?)<button/g)) {
      if (seen.has(m[1])) continue; const parts = m[2].replace(/<[^>]+>/g, '|').split('|').map(x => ent(x).trim()).filter(Boolean);
      const di = parts.findIndex(x => /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(x)); if (di < 1) continue; const t = Date.parse(parts[di] + ' 12:00 UTC'); if (!Number.isFinite(t)) continue;
      seen.add(m[1]); items.push({ title: parts.slice(0, di).join(' ').slice(0, 140), kind: parts[di + 1] || '', published: new Date(t).toISOString(), url: 'https://suno.com/release-notes/' + m[1] });
      if (items.length >= 12) break; }
    if (!items.length) throw new Error('suno_changed'); return { items }; }
  throw new Error('bad_kind');
}
export async function getRecs(k, env = {}, fetchImpl = fetch, now = Date.now()) {
  if (!/^(top40|games|topics|world|suno)$/.test(k || '')) throw new Error('bad_kind');
  const key = (k === 'world' ? 'recs-v3-' : 'recs-v1-') + k, ok = c => c && c.data && now - c.at < TTL;
  if (ok(mem[k])) return mem[k].data;
  if (env.EVENTS_KV) { try { const c = await env.EVENTS_KV.get(key, { type: 'json' }); if (ok(c)) { mem[k] = c; return c.data; } } catch (e) { } }
  const data = Object.assign({ checked: new Date(now).toISOString() }, await build(k, fetchImpl));
  mem[k] = { at: now, data }; if (env.EVENTS_KV) { try { await env.EVENTS_KV.put(key, JSON.stringify(mem[k]), { expirationTtl: 3 * 86400 }); } catch (e) { } }
  return data;
}
