/* Narrow YouTube search for a Videos category the user types.
 * The phone cannot read YouTube search (no CORS). This asks YouTube, then confirms each id
 * with oembed and returns only that title and channel. It does not fetch arbitrary links.
 * Nothing is logged or stored. Food topics are searched as gluten-free.
 */
export const VIDEO_SEARCH_URL = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';
const CLIENT = { clientName: 'WEB', clientVersion: '2.20250925.01.00', hl: 'en', gl: 'US' };
const FOOD_RE = /\b(food|cook(?:ing)?|recipe|recipes|bake|baking|bread|dinner|lunch|breakfast|meal|meals|cake|cakes|pasta|pizza|soup|salad|dessert|biscuit|biscuits|cookie|cookies|pastry|gluten|coeliac|celiac|noodle|noodles|chicken|beef|pork|lamb|fish|pie|pies|muffin|muffins|pancake|pancakes|roast|stew|curry|sandwich|sandwiches|flour)\b/i;
const GF_RE = /gluten|coeliac|celiac|\bgf\b/i;

export function normaliseVideoQuery(raw) {
  if (typeof raw !== 'string') throw new Error('bad_query');
  let q = raw.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q || q.length > 80) throw new Error('bad_query');
  if (!/^[A-Za-z0-9][A-Za-z0-9 '&+.,-]{0,79}$/.test(q)) throw new Error('bad_query');
  const food = FOOD_RE.test(q);
  if (food && !/gluten[-\s]?free/i.test(q)) q = (q + ' gluten free').slice(0, 100);
  return { q, food };
}

function collectRenderers(o, out) {
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o)) { o.forEach(x => collectRenderers(x, out)); return; }
  if (o.videoRenderer && typeof o.videoRenderer.videoId === 'string') out.push(o.videoRenderer);
  Object.keys(o).forEach(k => { if (k !== 'videoRenderer') collectRenderers(o[k], out); });
}

function lengthSeconds(vr) {
  const t = vr.lengthText && vr.lengthText.simpleText;
  if (typeof t !== 'string' || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return null;
  return t.split(':').reduce((n, p) => n * 60 + Number(p), 0);
}

function oembedUrl(id) {
  return 'https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json';
}

export async function searchVideos(raw, fetchImpl = fetch) {
  const { q, food } = normaliseVideoQuery(raw);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    let res;
    try {
      res = await fetchImpl(VIDEO_SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en', 'User-Agent': 'DueDatesVideoSearch/1.0' },
        body: JSON.stringify({ context: { client: CLIENT }, query: q }),
        signal: ctl.signal
      });
    } catch (e) { throw new Error(ctl.signal.aborted ? 'videos_unavailable' : 'videos_unavailable'); }
    if (!res.ok) throw new Error('videos_unavailable');
    let data;
    try { data = await res.json(); } catch (e) { throw new Error('videos_unavailable'); }
    const vrs = [];
    collectRenderers(data, vrs);
    const ids = [];
    const seen = new Set();
    for (const vr of vrs) {
      const id = vr.videoId;
      if (!/^[A-Za-z0-9_-]{11}$/.test(id) || seen.has(id)) continue;
      const secs = lengthSeconds(vr);
      if (secs != null && secs < 90) continue;
      seen.add(id);
      ids.push(id);
      if (ids.length >= 12) break;
    }
    const videos = [];
    for (const id of ids) {
      let o;
      try {
        o = await fetchImpl(oembedUrl(id), {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Accept-Language': 'en', 'User-Agent': 'DueDatesVideoSearch/1.0' },
          signal: ctl.signal
        });
      } catch (e) { continue; }
      if (!o.ok) continue;
      let d;
      try { d = await o.json(); } catch (e) { continue; }
      const title = String(d.title || '').replace(/\s+/g, ' ').trim();
      const channel = String(d.author_name || '').replace(/\s+/g, ' ').trim();
      if (!title || !channel) continue;
      if (food && !GF_RE.test(title)) continue;
      videos.push({ id, title: title.slice(0, 180), channel: channel.slice(0, 80) });
      if (videos.length >= 8) break;
    }
    return { videos };
  } finally { clearTimeout(timer); }
}
