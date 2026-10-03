/* Recent posts from a few public blogs for the Due Dates app.
 *
 * The phone cannot read these feeds itself: none of them send a CORS header.
 * This route fetches only the addresses below (no user-supplied URL), keeps
 * the title, link, time and a short summary when the feed has one, and
 * returns that. A feed that fails is marked failed with no items. Nothing
 * is invented. Kept for 15 minutes. No logging.
 *
 * Checked live on 3 Oct 2026: each URL returned recent posts.
 *   Kiwiblog — https://www.kiwiblog.co.nz/feed
 *   No Right Turn — https://norightturn.blogspot.com/feeds/posts/default
 *   Daring Fireball — https://daringfireball.net/feeds/main
 *   kottke.org — https://feeds.kottke.org/main
 */
import { decode, clip, get } from './events.js';

export const BLOGS = [
  { id: 'kiwiblog', name: 'Kiwiblog', home: 'https://www.kiwiblog.co.nz/', feed: 'https://www.kiwiblog.co.nz/feed' },
  { id: 'norightturn', name: 'No Right Turn', home: 'https://norightturn.blogspot.com/', feed: 'https://norightturn.blogspot.com/feeds/posts/default' },
  { id: 'daringfireball', name: 'Daring Fireball', home: 'https://daringfireball.net/', feed: 'https://daringfireball.net/feeds/main' },
  { id: 'kottke', name: 'kottke.org', home: 'https://kottke.org/', feed: 'https://feeds.kottke.org/main' }
];

const KV_KEY = 'public-blogs-v1';
const TTL = 15 * 60 * 1000;
const MAX_ITEMS = 6;
let mem = null;

function plain(s) {
  const raw = String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decode(raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function field(block, name) {
  const m = new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i').exec(block);
  return m ? m[1] : '';
}

export function httpsUrl(raw) {
  try {
    const u = new URL(plain(raw));
    if (u.protocol !== 'https:' || u.username || u.password) return '';
    if (u.port && u.port !== '443') return '';
    return u.toString();
  } catch (e) { return ''; }
}

function summaryOf(raw, title) {
  let s = plain(raw).replace(/\s*The post .+ (?:appeared first on|first appeared on) .+$/i, '').trim();
  if (!s) return '';
  const base = String(title || '').trim();
  if (!base) return clip(s, 180);
  if (/(?:\.{3}|…)\s*$/.test(base)) return clip(s, 180);
  if (s.toLowerCase() === base.toLowerCase()) return '';
  if (s.toLowerCase().startsWith(base.toLowerCase())) {
    s = s.slice(base.length).replace(/^[\s.…:–—-]+/, '').trim();
    if (s.length < 40) return '';
  }
  return clip(s, 180);
}

function atomPostUrl(block) {
  const tags = [...block.matchAll(/<link\b([^>]*)\/?>/gi)];
  const links = tags.map(t => {
    const href = /href=["']([^"']+)["']/i.exec(t[1]);
    const rel = /rel=["']([^"']+)["']/i.exec(t[1]);
    const type = /type=["']([^"']+)["']/i.exec(t[1]);
    return { href: href ? href[1] : '', rel: (rel ? rel[1] : 'alternate').toLowerCase(), type: (type ? type[1] : '').toLowerCase() };
  }).filter(l => l.href);
  const alt = links.find(l => l.rel === 'alternate' && (l.type === 'text/html' || l.type === '')) || links.find(l => l.rel === 'alternate');
  return httpsUrl(alt ? alt.href : '');
}

function rssPostUrl(block) {
  const link = httpsUrl(field(block, 'link'));
  if (link) return link;
  const guid = /<guid\b[^>]*isPermaLink=["']false["'][^>]*>/i.test(block) ? '' : field(block, 'guid');
  return httpsUrl(guid);
}

function takeItems(blocks, pick) {
  const items = [];
  const seen = new Set();
  const whens = Array.isArray(pick.when) ? pick.when : [pick.when];
  for (const block of blocks) {
    const fullTitle = plain(field(block, 'title'));
    const title = clip(fullTitle, 160);
    const url = pick.url(block);
    let publishedMs = NaN;
    for (const w of whens) {
      publishedMs = Date.parse(plain(field(block, w)));
      if (Number.isFinite(publishedMs)) break;
    }
    if (!title || !url || !Number.isFinite(publishedMs)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const summary = summaryOf(field(block, pick.summary) || (pick.alt ? field(block, pick.alt) : ''), fullTitle);
    const item = { title, url, published: new Date(publishedMs).toISOString() };
    if (summary) item.summary = summary;
    items.push(item);
  }
  items.sort((a, b) => b.published.localeCompare(a.published));
  return items.slice(0, MAX_ITEMS);
}

export function parseBlogFeed(xml) {
  const raw = String(xml || '');
  if (/<feed\b/i.test(raw) && /<entry\b/i.test(raw)) {
    const blocks = [...raw.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map(m => m[1]);
    const items = takeItems(blocks, { url: atomPostUrl, when: ['published', 'updated'], summary: 'summary', alt: 'content' });
    if (!items.length) throw new Error('blogs_changed');
    return items;
  }
  if (/<rss\b/i.test(raw) && /<item\b/i.test(raw)) {
    const blocks = [...raw.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
    const items = takeItems(blocks, { url: rssPostUrl, when: 'pubDate', summary: 'description', alt: 'content:encoded' });
    if (!items.length) throw new Error('blogs_changed');
    return items;
  }
  throw new Error('blogs_changed');
}

function failed(blog) {
  return { id: blog.id, name: blog.name, home: blog.home, feed: blog.feed, ok: false, items: [] };
}

function fresh(saved, now) {
  if (!saved || !saved.data || !Array.isArray(saved.data.blogs) || now - saved.at >= TTL) return false;
  const ids = saved.data.blogs.map(b => b && b.id).join(',');
  return ids === BLOGS.map(b => b.id).join(',');
}

async function readOne(blog, fetchImpl) {
  try {
    const xml = await get(blog.feed, fetchImpl, { headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.1' } });
    const items = parseBlogFeed(xml);
    return { id: blog.id, name: blog.name, home: blog.home, feed: blog.feed, ok: true, items };
  } catch (e) {
    return failed(blog);
  }
}

export async function getBlogs(env = {}, fetchImpl = fetch, now = Date.now()) {
  if (fresh(mem, now)) return mem.data;
  if (env.EVENTS_KV) {
    try {
      const c = await env.EVENTS_KV.get(KV_KEY, { type: 'json' });
      if (fresh(c, now)) { mem = c; return c.data; }
    } catch (e) { /* a bad cache must not hide a fresh read */ }
  }
  const blogs = await Promise.all(BLOGS.map(b => readOne(b, fetchImpl)));
  const data = { blogs };
  if (blogs.some(b => b.ok)) {
    mem = { at: now, data };
    if (env.EVENTS_KV) { try { await env.EVENTS_KV.put(KV_KEY, JSON.stringify(mem)); } catch (e) { } }
  }
  return data;
}

export function resetBlogs() { mem = null; }
