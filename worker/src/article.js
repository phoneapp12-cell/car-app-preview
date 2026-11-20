/* 1.9.290 Info Book magazine reader: a readability-style excerpt of a source article.
   Public GET /article?u=… on shane-my-feed-data. Respects robots.txt, paywalls, login walls
   and nosnippet. Returns a short excerpt only, never a full copy. Nothing is invented. */
import { safeUrl } from './preview.js';
import { paywallUrl, paywallHtml } from './paywall.js';
import { isUnsafe } from './safe.js';
import { SPORT_RE } from './sources.js';

export const ARTICLE_MAX_CHARS = 4200;
export const ARTICLE_MAX_PARAS = 8;
export const FETCH_MAX = 400000;
export const UA = 'InfoBook/1.0 (personal magazine reader; +https://shane-my-app.pages.dev/feed/)';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const PRIVATE_HOST = /(^|\.)(localhost|local|internal|lan|home|arpa|invalid)$/i;
const META_HOST = /^(169\.254\.|10\.|127\.|0\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fd[0-9a-f]{2}:|fe80:)/i;
const JUNK_PARA = /^(subscribe|sign in|log in|sign up|advertisement|advert|related (stories|articles|news)|share this|follow us|read more|cookie|newsletter|sponsored|recommended|most (read|popular)|comments? \d+|photo:|image:|credit:)\b/i;
const NOSNIPPET = /<meta[^>]+(?:name|property)=["']robots["'][^>]+content=["'][^"']*\b(nosnippet|max-snippet\s*:\s*0)\b/i;
const NOSNIPPET2 = /<meta[^>]+content=["'][^"']*\b(nosnippet|max-snippet\s*:\s*0)\b[^>]+(?:name|property)=["']robots["']/i;
const LOGIN_RE = /\/(login|signin|sign-in|log-in|accounts\/login|checkpoint|auth\/|sso|oauth)(\b|\/|\.|\?|$)/i;

const dec = s => String(s || '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&hellip;/g, '…')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/\s+/g, ' ').trim();

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', ...extra }
  });
}

export function siteName(url, html = '') {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const og = (html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i) || [])[1];
    return dec(og || '') || host;
  } catch (e) { return ''; }
}

/* Longest Allow/Disallow prefix wins. A matching User-agent group (InfoBook / MyFeed / *) is used. */
export function robotsPathAllowed(text, path, ua = 'InfoBook') {
  const lines = String(text || '').split(/\r?\n/).map(l => l.replace(/#.*$/, '').trim());
  const groups = [];
  let cur = null;
  for (const line of lines) {
    if (!line) continue;
    const m = line.match(/^(user-agent|allow|disallow|crawl-delay)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [val], rules: [] }; groups.push(cur); }
      else cur.agents.push(val);
    } else if (cur) {
      cur.rules.push({ allow: key === 'allow', path: val, delay: key === 'crawl-delay' });
    }
  }
  const uaLower = String(ua || 'InfoBook').toLowerCase();
  const score = g => {
    let best = -1;
    for (const a of g.agents) {
      const al = a.toLowerCase();
      if (al === '*') best = Math.max(best, 1);
      else if (uaLower.startsWith(al) || al.startsWith(uaLower.split('/')[0])) best = Math.max(best, al.length);
    }
    return best;
  };
  const ranked = groups.map(g => ({ g, s: score(g) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  if (!ranked.length) return true;
  const use = ranked.filter(x => x.s === ranked[0].s).map(x => x.g);
  let winner = null;
  for (const g of use) {
    for (const r of g.rules) {
      if (r.delay) continue;
      if (!r.path && r.allow) continue;
      if (!r.path && !r.allow) { // Disallow: with empty path means allow all
        continue;
      }
      const pat = r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      try {
        if (!new RegExp('^' + pat).test(path)) continue;
      } catch (e) { continue; }
      if (!winner || r.path.length > winner.path.length || (r.path.length === winner.path.length && r.allow)) winner = r;
    }
  }
  if (!winner) return true;
  return !!winner.allow;
}

export async function robotsAllowed(pageUrl, fetcher = fetch, ua = UA) {
  let origin, path;
  try {
    const u = new URL(pageUrl);
    origin = u.origin;
    path = u.pathname || '/';
  } catch (e) { return false; }
  try {
    const r = await fetcher(origin + '/robots.txt', {
      headers: { 'User-Agent': ua, Accept: 'text/plain,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000)
    });
    if (r.status === 404 || r.status === 410) return true;
    if (!r.ok) return true;
    const text = (await r.text()).slice(0, 200000);
    return robotsPathAllowed(text, path, ua);
  } catch (e) {
    return true;
  }
}

function stripJunk(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(nav|footer|form|iframe|svg|button)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function firstMatch(html, re) {
  const m = html.match(re);
  return m ? m[0] : '';
}

function pickBody(html) {
  const clean = stripJunk(html);
  const articles = clean.match(/<article\b[\s\S]*?<\/article>/gi) || [];
  const scored = articles
    .map(a => ({ a, n: (a.match(/<p\b/gi) || []).length, len: a.length }))
    .sort((x, y) => (y.n - x.n) || (y.len - x.len));
  if (scored[0] && scored[0].n >= 2) return scored[0].a;
  const named = firstMatch(clean, /<(div|section)[^>]*(?:article-body|article__body|article-content|story-body|storybody|entry-content|post-content|rich-text|itemprop=["']articleBody["']|c-article|ArticleBody|article_body)[^>]*>[\s\S]*$/i);
  if (named) {
    // take a reasonable chunk of the first matching container
    const open = named.match(/^<(\w+)/)[1];
    const cut = named.slice(0, 350000);
    const closeAt = cut.toLowerCase().lastIndexOf('</' + open.toLowerCase() + '>');
    const chunk = closeAt > 200 ? cut.slice(0, closeAt + open.length + 3) : cut.slice(0, 200000);
    if ((chunk.match(/<p\b/gi) || []).length >= 2) return chunk;
  }
  const main = firstMatch(clean, /<main\b[\s\S]*?<\/main>/i);
  if (main && (main.match(/<p\b/gi) || []).length >= 2) return main;
  return clean;
}

export function paragraphsFromHtml(html) {
  const body = pickBody(html);
  const out = [];
  const re = /<(p|h2|h3|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(body))) {
    const tag = m[1].toLowerCase();
    const text = dec(m[2].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '));
    if (!text) continue;
    if (tag === 'h2' || tag === 'h3') {
      if (text.length < 2 || text.length > 80) continue;
      if (JUNK_PARA.test(text)) continue;
      out.push({ heading: true, text });
      continue;
    }
    if (text.length < 60) continue;
    if (JUNK_PARA.test(text)) continue;
    if (/^[\d\s.,€$£¥%/-]+$/.test(text)) continue;
    out.push({ heading: false, text });
  }
  return out;
}

export function excerptBlocks(blocks, maxChars = ARTICLE_MAX_CHARS, maxParas = ARTICLE_MAX_PARAS) {
  const paras = [];
  let chars = 0, nPara = 0, cropped = false;
  for (const b of blocks) {
    if (b.heading) {
      if (!paras.length) continue;
      if (chars >= maxChars || nPara >= maxParas) { cropped = true; break; }
      paras.push({ heading: true, text: b.text });
      continue;
    }
    if (nPara >= maxParas || chars >= maxChars) { cropped = true; break; }
    let t = b.text;
    if (chars + t.length > maxChars) {
      const room = maxChars - chars;
      if (room < 80) { cropped = true; break; }
      t = t.slice(0, room).replace(/\s+\S*$/, '').replace(/[,:;–—-]\s*$/, '') + '…';
      cropped = true;
      paras.push({ heading: false, text: t });
      nPara++;
      chars += t.length;
      break;
    }
    paras.push({ heading: false, text: t });
    nPara++;
    chars += t.length;
  }
  if (!cropped && blocks.filter(b => !b.heading).length > nPara) cropped = true;
  return { paras, excerpt: cropped, chars };
}

export function articleFromHtml(html, pageUrl, finalUrl) {
  const url = finalUrl || pageUrl;
  if (NOSNIPPET.test(html) || NOSNIPPET2.test(html)) {
    return { ok: false, reason: 'nosnippet', url };
  }
  if (paywallHtml(html)) {
    return { ok: false, reason: 'paywall', url, site: siteName(url, html) };
  }
  if (LOGIN_RE.test(String(finalUrl || '')) && /sign in|log in|create an account|subscribe/i.test(html.slice(0, 20000))) {
    return { ok: false, reason: 'login', url };
  }
  const title = dec((html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const by = dec((html.match(/<meta[^>]+(?:name|property)=["'](?:author|article:author)["'][^>]+content=["']([^"']+)["']/i) || [])[1] || '');
  const blocks = paragraphsFromHtml(html);
  const { paras, excerpt, chars } = excerptBlocks(blocks);
  if (paras.filter(p => !p.heading).length < 2) {
    return { ok: false, reason: 'empty', url, title, site: siteName(url, html) };
  }
  const blob = paras.map(p => p.text).join(' ');
  if (isUnsafe({ t: title, s: blob })) return { ok: false, reason: 'unsafe', url };
  if (SPORT_RE.test(title + ' ' + blob)) return { ok: false, reason: 'sport', url };
  return {
    ok: true,
    url,
    title,
    site: siteName(url, html),
    byline: by,
    paras: paras.map(p => p.heading ? { heading: p.text } : { text: p.text }),
    excerpt: excerpt || chars >= ARTICLE_MAX_CHARS,
    wordCount: blob.split(/\s+/).filter(Boolean).length
  };
}

export function isSafePageUrl(raw) {
  const u = safeUrl(raw);
  if (!u) return null;
  const h = u.hostname.toLowerCase();
  if (PRIVATE_HOST.test(h) || META_HOST.test(h) || !h.includes('.')) return null;
  if (/^(metadata\.google|metadata\.internal|instance-data)/i.test(h)) return null;
  return u;
}

export async function fetchArticle(rawUrl, fetcher = fetch) {
  const u = isSafePageUrl(rawUrl);
  if (!u) return { ok: false, reason: 'badurl' };
  if (paywallUrl(u.href)) return { ok: false, reason: 'paywall', url: u.href, site: siteName(u.href) };
  const allowed = await robotsAllowed(u.href, fetcher, UA);
  if (!allowed) return { ok: false, reason: 'robots', url: u.href, site: siteName(u.href) };
  let r;
  try {
    r = await fetcher(u.href, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'Accept-Language': 'en-NZ,en;q=0.9'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });
  } catch (e) {
    return { ok: false, reason: 'fetch', url: u.href };
  }
  const finalUrl = r.url || u.href;
  const final = isSafePageUrl(finalUrl);
  if (!final) return { ok: false, reason: 'badurl', url: u.href };
  if (paywallUrl(final.href)) return { ok: false, reason: 'paywall', url: final.href, site: siteName(final.href) };
  if (!r.ok) return { ok: false, reason: 'fetch', url: final.href, status: r.status };
  const type = (r.headers && r.headers.get && r.headers.get('content-type')) || '';
  if (type && !/html|xml|text\/plain/i.test(type)) return { ok: false, reason: 'empty', url: final.href };
  let html = '';
  try {
    if (r.body && r.body.getReader) {
      const rd = r.body.getReader(), dc = new TextDecoder();
      while (html.length < FETCH_MAX) {
        const { done, value } = await rd.read();
        if (done) break;
        html += dc.decode(value, { stream: true });
      }
      try { rd.cancel(); } catch (e) {}
    } else {
      html = String(await r.text()).slice(0, FETCH_MAX);
    }
  } catch (e) {
    return { ok: false, reason: 'fetch', url: final.href };
  }
  return articleFromHtml(html, u.href, final.href);
}

export async function handleArticle(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json({ ok: false, reason: 'method' }, 405);
  const u = new URL(req.url);
  const raw = u.searchParams.get('u') || u.searchParams.get('url') || '';
  if (!raw) return json({ ok: false, reason: 'badurl' }, 400);
  try {
    const ck = new Request('https://cache.local/article?u=' + encodeURIComponent(raw));
    const hit = await caches.default.match(ck);
    if (hit) return hit;
    const data = await fetchArticle(raw);
    const res = json(data, 200, { 'Cache-Control': data.ok ? 'public, max-age=600' : 'public, max-age=60' });
    if (data.ok) {
      try { await caches.default.put(ck, res.clone()); } catch (e) {}
    }
    return res;
  } catch (e) {
    const data = await fetchArticle(raw);
    return json(data, 200, { 'Cache-Control': 'public, max-age=60' });
  }
}
