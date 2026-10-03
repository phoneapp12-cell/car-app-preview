/* Recent episodes from a few public podcasts for the Due Dates app.
 *
 * The phone cannot read these feeds itself: they do not send a CORS header
 * the app's origin can use. This route fetches only the addresses below
 * (no user-supplied URL), keeps the show, title, link, time, a short summary
 * when the feed has one, and an https mp3 or m4a enclosure when the feed has
 * one. A feed that fails is marked failed with no episodes. Nothing is
 * invented. Kept for 15 minutes. No logging.
 *
 * Checked live on 3 Oct 2026: each URL returned recent episodes.
 *   Checkpoint (RNZ) — https://www.rnz.co.nz/podcasts/checkpoint.rss
 *   This American Life — https://feeds.thisamericanlife.org/talpodcast
 *   99% Invisible — https://feeds.simplecast.com/BqbsxVfO
 */
import { decode, clip, get } from './events.js';
import { httpsUrl } from './blogs.js';

export const PODCASTS = [
  { id: 'checkpoint', name: 'Checkpoint', home: 'https://www.rnz.co.nz/national/programmes/checkpoint', feed: 'https://www.rnz.co.nz/podcasts/checkpoint.rss' },
  { id: 'thisamericanlife', name: 'This American Life', home: 'https://www.thisamericanlife.org/', feed: 'https://feeds.thisamericanlife.org/talpodcast' },
  { id: '99pi', name: '99% Invisible', home: 'https://99percentinvisible.org/', feed: 'https://feeds.simplecast.com/BqbsxVfO' }
];

const KV_KEY = 'public-podcasts-v1';
const TTL = 15 * 60 * 1000;
const MAX_ITEMS = 5;
let mem = null;

function plain(s) {
  const raw = String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decode(raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function field(block, name) {
  const m = new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i').exec(block);
  return m ? m[1] : '';
}

function summaryOf(raw, title) {
  const s = plain(raw);
  if (!s) return '';
  const base = String(title || '').trim();
  if (base && s.toLowerCase() === base.toLowerCase()) return '';
  return clip(s, 180);
}

export function audioUrl(raw) {
  const url = httpsUrl(raw);
  if (!url) return '';
  let path = '';
  try { path = new URL(url).pathname.toLowerCase(); } catch (e) { return ''; }
  if (!path.endsWith('.mp3') && !path.endsWith('.m4a')) return '';
  return url;
}

function enclosureAudio(block) {
  const tags = [...block.matchAll(/<enclosure\b([^>]*?)\/?>/gi)];
  for (const t of tags) {
    const u = /url=["']([^"']+)["']/i.exec(t[1]);
    const audio = u ? audioUrl(u[1]) : '';
    if (audio) return audio;
  }
  return '';
}

export function parsePodcastFeed(xml) {
  const raw = String(xml || '');
  if (!/<rss\b/i.test(raw) || !/<item\b/i.test(raw)) throw new Error('podcasts_changed');
  const blocks = [...raw.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
  const items = [];
  const seen = new Set();
  for (const block of blocks) {
    const fullTitle = plain(field(block, 'title'));
    const title = clip(fullTitle, 160);
    const url = httpsUrl(field(block, 'link'));
    const audio = enclosureAudio(block);
    const publishedMs = Date.parse(plain(field(block, 'pubDate')));
    if (!title || !Number.isFinite(publishedMs) || (!url && !audio)) continue;
    const key = (url || '') + '|' + (audio || '');
    if (seen.has(key)) continue;
    seen.add(key);
    const summary = summaryOf(field(block, 'description') || field(block, 'itunes:summary'), fullTitle);
    const item = { title, published: new Date(publishedMs).toISOString() };
    if (url) item.url = url;
    if (audio) item.audio = audio;
    if (summary) item.summary = summary;
    items.push(item);
  }
  items.sort((a, b) => b.published.localeCompare(a.published));
  const out = items.slice(0, MAX_ITEMS);
  if (!out.length) throw new Error('podcasts_changed');
  return out;
}

function failed(show) {
  return { id: show.id, name: show.name, home: show.home, feed: show.feed, ok: false, items: [] };
}

function fresh(saved, now) {
  if (!saved || !saved.data || !Array.isArray(saved.data.podcasts) || now - saved.at >= TTL) return false;
  const ids = saved.data.podcasts.map(b => b && b.id).join(',');
  return ids === PODCASTS.map(b => b.id).join(',');
}

async function readOne(show, fetchImpl) {
  try {
    const xml = await get(show.feed, fetchImpl, { headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.1' } });
    const items = parsePodcastFeed(xml);
    return { id: show.id, name: show.name, home: show.home, feed: show.feed, ok: true, items };
  } catch (e) {
    return failed(show);
  }
}

export async function getPodcasts(env = {}, fetchImpl = fetch, now = Date.now()) {
  if (fresh(mem, now)) return mem.data;
  if (env.EVENTS_KV) {
    try {
      const c = await env.EVENTS_KV.get(KV_KEY, { type: 'json' });
      if (fresh(c, now)) { mem = c; return c.data; }
    } catch (e) { /* a bad cache must not hide a fresh read */ }
  }
  const podcasts = await Promise.all(PODCASTS.map(b => readOne(b, fetchImpl)));
  const data = { podcasts };
  if (podcasts.some(b => b.ok)) {
    mem = { at: now, data };
    if (env.EVENTS_KV) { try { await env.EVENTS_KV.put(KV_KEY, JSON.stringify(mem)); } catch (e) { } }
  }
  return data;
}

export function resetPodcasts() { mem = null; }
