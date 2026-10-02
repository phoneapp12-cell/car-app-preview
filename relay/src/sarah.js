/* Sarah Jenkins (@sarahjenkins1510) — one fixed channel, no user input.
 * The phone cannot read YouTube (no CORS) and must not poll it. This reads the
 * public channel RSS, confirms each id with oembed, and keeps a short copy.
 * A newer video is pushed once, through the same Web Push path as other alerts.
 * Nothing else is stored. English only.
 */
import { loadSubs, sendPush } from './push.js';

export const SARAH_CHANNEL_ID = 'UC2sjJeoD0gLkf66iLbm28hg';
export const SARAH_RSS = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + SARAH_CHANNEL_ID;
const SARAH_KEY = 'sarah-feed-v1';
const FRESH_MS = 10 * 60 * 1000;
const MAX_XML = 500000;

export function xmlText(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

// Entries from this channel's Atom feed only. Newest first. Ids are not trusted until oembed.
export function parseSarahFeed(xml) {
  const text = String(xml || '');
  if (!text.includes(SARAH_CHANNEL_ID)) return [];
  const out = [];
  const seen = new Set();
  for (const e of text.split('<entry>').slice(1)) {
    const id = (e.match(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/) || [])[1];
    const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
    if (!id || seen.has(id) || !/^\d{4}-\d{2}-\d{2}T/.test(published)) continue;
    seen.add(id);
    out.push({ id, title: xmlText((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').slice(0, 180), published });
  }
  out.sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));
  return out.slice(0, 5);
}

function oembedUrl(id) {
  return 'https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json';
}

export async function fetchSarah(fetchImpl = fetch) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    let res;
    try {
      res = await fetchImpl(SARAH_RSS, {
        method: 'GET', redirect: 'follow', signal: ctl.signal,
        headers: { 'Accept': 'application/atom+xml, application/xml, text/xml', 'Accept-Language': 'en', 'User-Agent': 'DueDatesSarah/1.0' }
      });
    } catch (e) { throw new Error('sarah_unavailable'); }
    if (!res.ok) throw new Error('sarah_unavailable');
    const xml = await res.text();
    if (xml.length > MAX_XML) throw new Error('sarah_unavailable');
    const parsed = parseSarahFeed(xml);
    const videos = [];
    for (const v of parsed) {
      let o;
      try {
        o = await fetchImpl(oembedUrl(v.id), {
          method: 'GET', signal: ctl.signal,
          headers: { 'Accept': 'application/json', 'Accept-Language': 'en', 'User-Agent': 'DueDatesSarah/1.0' }
        });
      } catch (e) { continue; }
      if (!o.ok) continue;
      let d;
      try { d = await o.json(); } catch (e) { continue; }
      const title = String(d.title || '').replace(/\s+/g, ' ').trim();
      const channel = String(d.author_name || '').replace(/\s+/g, ' ').trim();
      if (!title || channel !== 'Sarah Jenkins') continue;
      videos.push({ id: v.id, title: title.slice(0, 180), channel, published: v.published });
    }
    if (!videos.length) throw new Error('sarah_unavailable');
    return { channelId: SARAH_CHANNEL_ID, channel: 'Sarah Jenkins', videos };
  } finally { clearTimeout(timer); }
}

async function loadSaved(env) {
  if (!env || !env.EVENTS_KV) return null;
  try { return await env.EVENTS_KV.get(SARAH_KEY, { type: 'json' }); } catch (e) { return null; }
}
async function saveSaved(env, rec) {
  if (!env || !env.EVENTS_KV) return;
  try { await env.EVENTS_KV.put(SARAH_KEY, JSON.stringify(rec)); } catch (e) { }
}

// Read the channel. Push once when the newest id is one we have not announced.
// opts.push false skips the alert (used when the phone only wants the list).
export async function refreshSarah(env, fetchImpl = fetch, now = Date.now(), opts = {}) {
  const saved = (await loadSaved(env)) || { at: 0, videos: [], announced: '' };
  let videos = saved.videos;
  let fetched = false;
  if (!(opts.cacheOnly && Array.isArray(videos) && videos.length && now - saved.at < FRESH_MS)) {
    try {
      const data = await fetchSarah(fetchImpl);
      videos = data.videos;
      fetched = true;
    } catch (e) {
      if (!Array.isArray(saved.videos) || !saved.videos.length) throw e;
      videos = saved.videos;
    }
  }
  const newest = videos[0];
  let announced = typeof saved.announced === 'string' ? saved.announced : '';
  if (opts.seen && /^[A-Za-z0-9_-]{11}$/.test(opts.seen)) {
    if (!newest || newest.id === opts.seen || !videos.length) announced = opts.seen;
  }
  if (opts.push === true && newest && newest.id !== announced && env && env.VAPID_PRIVATE_JWK) {
    const subs = await loadSubs(env);
    let sent = false;
    const gone = new Set();
    for (const s of subs) {
      const r = await sendPush(s, {
        title: 'New video from Sarah Jenkins',
        body: newest.title,
        url: '#home',
        tag: 'sarah-' + newest.id
      }, env, fetchImpl, now);
      if (r === 'ok') sent = true;
      else if (r === 'gone') gone.add(s.id);
    }
    if (gone.size && env.EVENTS_KV) {
      const left = subs.filter(s => !gone.has(s.id));
      try { await env.EVENTS_KV.put('push-subs-v1', JSON.stringify(left)); } catch (e) { }
    }
    if (sent) announced = newest.id;
  }
  const rec = { at: fetched ? now : (saved.at || now), videos, announced };
  if (fetched || announced !== saved.announced) await saveSaved(env, rec);
  return {
    channelId: SARAH_CHANNEL_ID,
    channel: 'Sarah Jenkins',
    rss: SARAH_RSS,
    videos,
    announced
  };
}

export async function getSarah(env, fetchImpl = fetch, now = Date.now()) {
  const saved = await loadSaved(env);
  if (saved && Array.isArray(saved.videos) && saved.videos.length && now - saved.at < FRESH_MS) {
    return { channelId: SARAH_CHANNEL_ID, channel: 'Sarah Jenkins', rss: SARAH_RSS, videos: saved.videos, announced: saved.announced || '' };
  }
  return refreshSarah(env, fetchImpl, now);
}

export async function markSarahSeen(env, id, now = Date.now()) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('bad_request');
  const saved = (await loadSaved(env)) || { at: 0, videos: [], announced: '' };
  const newest = Array.isArray(saved.videos) ? saved.videos[0] : null;
  // A different id does not clear the real newest. An empty cache can record the id the phone already showed.
  if (newest && newest.id !== id) return { announced: saved.announced || '' };
  const rec = { at: saved.at || now, videos: Array.isArray(saved.videos) ? saved.videos : [], announced: id };
  await saveSaved(env, rec);
  return { announced: id };
}
