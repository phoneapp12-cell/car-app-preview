/* 1.9.16 🔗 link shares: a public preview of a link someone shares into Info Book (title, description, picture).
   Only the public page (or the platform's public oEmbed) is read, without any login or cookies. Facebook and Instagram
   usually hide previews behind a login, so those get a branded card with the platform's colours instead. */
import { isUnsafe } from './safe.js';
import { SPORT_RE } from './sources.js';
import { paywallHtml } from './paywall.js';

const APP_IMG = 'https://shane-my-app.pages.dev/feed/img/';
export const PLATS = {
  facebook: { re: /(^|\.)(facebook\.com|fb\.com|fb\.watch|fb\.me)$/i, name: 'Facebook' },
  instagram: { re: /(^|\.)(instagram\.com|instagr\.am)$/i, name: 'Instagram' },
  tiktok: { re: /(^|\.)tiktok\.com$/i, name: 'TikTok' },
  youtube: { re: /(^|\.)(youtube\.com|youtu\.be)$/i, name: 'YouTube' },
  x: { re: /(^|\.)(x\.com|twitter\.com)$/i, name: 'X' },
  reddit: { re: /(^|\.)(reddit\.com|redd\.it)$/i, name: 'Reddit' },
  pinterest: { re: /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/i, name: 'Pinterest' },
};
export const MONEY_RE = /\$\s?\d|\b(bills?|payments?|invoices?|mortgage|loans?|debt|bank(ing)?|kiwisaver|crypto|bitcoin|invest(ing|ment|ments)?|shares? (price|market)|stock market|interest rates?|budget(ing)?)\b/i;
export const platOf = host => { for (const [k, v] of Object.entries(PLATS)) if (v.re.test(host)) return k; return 'web'; };
export function findUrl(...parts) {
  const all = parts.filter(Boolean).join(' ');
  const m = all.match(/https?:\/\/[^\s<>"'”’)]+/i); if (!m) return '';
  return m[0].replace(/[.,!?;:]+$/, '');
}
export function safeUrl(raw) {
  let u; try { u = new URL(String(raw || '').trim()); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || (u.port && !['80', '443'].includes(u.port))) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || /^(\d+\.){3}\d+$/.test(h) || h.includes(':') || /(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(h)) return null;
  if (u.protocol === 'http:') u.protocol = 'https:';
  for (const k of [...u.searchParams.keys()]) if (/^(utm_\w+|fbclid|gclid|igshid|igsh|mibextid|si|ref|ref_src|_t|_r)$/i.test(k)) u.searchParams.delete(k); // tracking bits
  u.hash = '';
  return u;
}
const dec = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/\s+/g, ' ').trim();
const meta = (html, ...keys) => { for (const k of keys) { const re = new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*>`, 'i'), m = html.match(re); if (m) { const c = m[0].match(/content=["']([^"']*)["']/i); if (c && c[1].trim()) return dec(c[1]); } } return ''; };
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
async function getText(url, ms = 7000, max = 400000, ua = UA, whole = false) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': ua, Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5', 'Accept-Language': 'en-NZ,en;q=0.8' }, redirect: 'follow', signal: ac.signal });
    if (!r.ok) return { status: r.status, url: r.url, text: '', type: r.headers.get('content-type') || '' };
    const rd = r.body.getReader(), dc = new TextDecoder(); let s = '';
    while (s.length < max) { const { done, value } = await rd.read(); if (done) break; s += dc.decode(value, { stream: true }); if (!whole && /<\/head>/i.test(s)) break; }
    try { rd.cancel(); } catch (e) { }
    return { status: r.status, url: r.url, text: s, type: r.headers.get('content-type') || '' };
  } catch (e) { return { status: 0, text: '' }; } finally { clearTimeout(t); }
}
const absImg = (src, base) => { if (!src || !String(src).trim()) return ''; try { const u = new URL(src, base); return u.protocol === 'https:' ? u.href : u.protocol === 'http:' ? u.href.replace(/^http:/, 'https:') : ''; } catch (e) { return ''; } };
export function blockedWhy(...texts) {
  const t = texts.filter(Boolean).join(' ');
  if (isUnsafe({ t })) return 'unsafe';
  if (SPORT_RE.test(t)) return 'sport';
  if (MONEY_RE.test(t)) return 'money';
  return '';
}
/* 1.9.18 🔒 public only. Every link is checked the way a stranger with no account would see it:
   - Facebook / Instagram: read as a link-preview crawler (the same way Messenger or WhatsApp build a preview). Facebook and
     Instagram only hand real og: tags to that for public pages, public profiles and posts in public groups; anything
     private, friends-only or in a private group comes back as a login page, so it's refused. Personal-profile links
     (profile.php, /people/, stories, messages) are refused outright.
   - YouTube, TikTok, X: their public oEmbed must answer with a real title/author (private, protected or deleted posts don't).
   - Any other site: it must open (HTTP 200) without being sent to a login/sign-in page.
   When unsure, it's refused. */
const CRAWL_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const NOT_PUBLIC = 'Info Book can only share public posts or public groups/pages 🔒';
const LOGIN_RE = /\/(login|signin|sign-in|log-in|accounts\/login|checkpoint|auth|sso|oauth)(\b|\/|\.|\?|$)/i;
function privPattern(u, plat) {
  const p = u.pathname.toLowerCase();
  if (plat === 'facebook') return /^\/(profile\.php|people\/|stories\/|messages\/|friends\/|me\/?$|settings|notifications|saved)/.test(p);
  if (plat === 'instagram') return /^\/(stories|direct|accounts|explore\/people)\//.test(p);
  if (plat === 'x') return /^\/(i\/|messages|settings|home)/.test(p);
  return false;
}
export async function preview(raw) {
  const u = safeUrl(raw); if (!u) return { err: 'That doesn’t look like a web link.' };
  const plat = platOf(u.hostname), P = PLATS[plat], out = { url: u.href, plat, site: P ? P.name : u.hostname.replace(/^www\./, ''), t: '', s: '', img: '', fallback: false, pub: false };
  // 1.9.37 no public-only rule any more: a post that can't be read (private, a group, a login wall) still shares, with a
  // site-branded picture (or a free photo, or the sharer's own) and an optional line from the sharer
  out.brand = BRAND + (BRAND_PLATS.has(plat) ? plat : 'web') + '.svg';
  const priv = why => finish(u, P, { ...out, unread: why });
  const yid = ytId(u); if (plat === 'youtube' && yid) { out.vid = yid; out.img = `https://i.ytimg.com/vi/${yid}/hqdefault.jpg`; out.url = /\/shorts\//.test(u.pathname) ? u.href : `https://www.youtube.com/watch?v=${yid}`; } // youtu.be, shorts, live, embed: a clear thumbnail that opens the video
  if (privPattern(u, plat)) return priv('pattern');
  try {
    if (plat === 'youtube' || plat === 'tiktok' || plat === 'x') {
      const oe = plat === 'youtube' ? 'https://www.youtube.com/oembed?format=json&url=' : plat === 'tiktok' ? 'https://www.tiktok.com/oembed?url=' : 'https://publish.twitter.com/oembed?omit_script=1&url=';
      const r = await getText(oe + encodeURIComponent(u.href), 7000, 80000); let j = null; try { j = r.text ? JSON.parse(r.text) : null; } catch (e) { }
      if (!j || !(j.title || j.author_name)) return priv('oembed ' + (r.status || 'no answer'));
      out.pub = true;
      if (plat === 'x') { const tx = dec(String(j.html || '').replace(/<a [^>]*>[^<]*<\/a>/g, '').match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1]?.replace(/<[^>]+>/g, ' ') || ''); out.t = (j.author_name ? j.author_name + ' on X' : 'A post on X').slice(0, 160); out.s = tx.slice(0, 300); }
      else { out.t = dec(j.title || '').slice(0, 160); out.s = j.author_name ? 'By ' + dec(j.author_name).slice(0, 80) : ''; out.img = out.vid ? out.img : absImg(j.thumbnail_url || '', u.href); }
    }
    if (plat === 'instagram') { // public posts only: Instagram's embed page exists just for public posts (private accounts can't be embedded)
      const sc = u.pathname.match(/^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]{5,})/);
      if (!sc) return priv('instagram: not a post');
      const r = await getText(`https://www.instagram.com/${sc[1] === 'reels' ? 'reel' : sc[1]}/${sc[2]}/embed/captioned/`, 8000, 600000, 'Mozilla/5.0 (compatible; InfoBook link preview)', true);
      const h = r.text || '';
      if (!r.status || r.status >= 400 || /EmbedIsBroken|class="[^"]*Broken/.test(h) || !/EmbeddedMediaImage|class="Caption"/.test(h)) return priv('instagram embed ' + (r.status || 'no answer'));
      const user = dec((h.match(/class="UsernameText"[^>]*>([^<]*)/) || [])[1] || ''), cap = (h.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
      const img = dec((h.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/) || h.match(/<img[^>]+class="EmbeddedMediaImage"[^>]*>/) && [0, ((h.match(/<img[^>]+class="EmbeddedMediaImage"[^>]*>/)[0].match(/src="([^"]+)"/) || [])[1])] || [])[1] || '');
      out.pub = true; out.t = (user ? '@' + user + ' on Instagram' : 'An Instagram post').slice(0, 160);
      out.s = dec(cap.replace(/<a [^>]*class="CaptionUsername"[^>]*>[\s\S]*?<\/a>/, '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ')).slice(0, 300);
      out.img = absImg(img, u.href);
    }
    if (plat === 'facebook' && /^\/[\w.-]+\/?$/.test(u.pathname) && !/^\/(groups|watch|events|marketplace|share)\/?$/.test(u.pathname)) { // a Page's front page wants a login from here; its public About page doesn't
      const r = await getText(u.href.replace(/\/?(\?.*)?$/, '/about'), 8000, 400000, CRAWL_UA), h = r.text || '';
      if (r.status === 200 && !LOGIN_RE.test(new URL(r.url || u.href).pathname) && meta(h, 'og:title') && !/log ?in|sign ?up/i.test(meta(h, 'og:title'))) {
        out.pub = true; out.t = meta(h, 'og:title').slice(0, 160); out.s = meta(h, 'og:description').slice(0, 300); out.img = absImg(meta(h, 'og:image'), u.href);
      }
    }
    if (!out.t || !out.img || !out.pub) {
      const crawl = plat === 'facebook' || plat === 'instagram' || plat === 'x';
      const r = await getText(u.href, 8000, 400000, crawl ? CRAWL_UA : UA);
      const base = r.url || u.href, fin = (() => { try { return new URL(base); } catch (e) { return u; } })();
      if (!out.pub) {
        if (!r.status || r.status >= 400) return priv('http ' + (r.status || 'unreachable'));
        if (LOGIN_RE.test(fin.pathname) || (fin.hostname !== u.hostname && /login|signin|auth/i.test(fin.hostname))) return priv('login redirect');
      }
      if (r.text && /html/i.test(r.type || 'html')) {
        const h = r.text; if (paywallHtml(h)) out.pay = 1; const title = meta(h, 'og:title', 'twitter:title') || dec((h.match(/<title[^>]*>([^<]{1,300})/i) || [])[1] || '');
        const wall = /log ?in|sign ?up|create an account|this content isn.t available|private (account|group)|this account is private/i.test(title + ' ' + meta(h, 'og:description'));
        if (!out.pub && (plat === 'facebook' || plat === 'instagram') && (wall || !meta(h, 'og:title'))) return priv('login wall');
        if (!out.pub && wall && P) return priv('login wall');
        out.pub = true;
        out.t = out.t || title.replace(/\s*\|\s*Facebook$/i, '').slice(0, 160);
        out.s = out.s || meta(h, 'og:description', 'twitter:description', 'description').slice(0, 300);
        out.img = out.img || absImg(meta(h, 'og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src'), base);
        const sn = meta(h, 'og:site_name'); if (sn && plat === 'web') out.site = sn.slice(0, 60);
      } else if (!out.pub && r.status === 200 && /^image\//i.test(r.type || '')) { out.pub = true; out.img = u.href; }
      else if (!out.pub) return priv('no page');
    }
  } catch (e) { if (!out.pub) return priv('error'); }
  return finish(u, P, out);
}
const BRAND = 'https://shane-my-app.pages.dev/feed/img/share-', BRAND_PLATS = new Set(['facebook', 'instagram', 'pinterest', 'reddit', 'tiktok', 'x', 'youtube']);
export function ytId(u) {
  if (!/(^|\.)(youtube\.com|youtu\.be)$/i.test(u.hostname)) return '';
  const m = /youtu\.be$/i.test(u.hostname) ? u.pathname.match(/^\/([\w-]{11})/) : (u.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/) || [0, (u.searchParams.get('v') || '').match(/^[\w-]{11}$/) ? u.searchParams.get('v') : '']);
  return (m && m[1]) || '';
}
function finish(u, P, out) {
  if (/^(facebook|instagram|tiktok|log in|login|sign up)\b/i.test(out.t) && (!out.s || /make your day|log in|sign up/i.test(out.t + ' ' + out.s)) || (P && out.t.trim().toLowerCase() === P.name.toLowerCase())) out.t = '';
  if (/^see posts, photos and more on facebook/i.test(out.s)) out.s = '';
  out.needDesc = !out.s || out.s.length < 10; // the sharer writes one
  if (!out.t) out.t = out.vid ? 'A YouTube video' : P ? `${/^[AEIOU]/.test(P.name) ? 'An' : 'A'} ${P.name} post` : out.site;
  if (!out.img) { out.img = ''; out.fallback = true; out.needPic = true; } // never just a bare logo: the sharer adds a picture
  return out;
}
/* 1.9.18 a fitting picture when the link has none: free Wikimedia Commons photos (the same library the feed already uses),
   found from a few plain words. Never logos, never anything the family-safe filter catches. */
// Wikimedia only serves pictures to other sites as standard-size thumbnails (originals get blocked), so always ask for one
const wmThumb = (orig, w) => { const m = String(orig || '').match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)/); if (!m) return ''; const W = w >= 960 ? 960 : w >= 500 ? 500 : 0; if (!W) return ''; return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${m[3]}/${W}px-${m[3]}`; };
const WUA = { 'User-Agent': 'InfoBook family app (https://shane-my-app.pages.dev/feed/; phoneapp12)', accept: 'application/json' };
const badPic = t => /logo|icon|flag|map|diagram|chart|coat of arms|seal|screenshot|nude|naked|topless|nsfw|corpse|dead|shot|hunting|weapon|gun/i.test(t) || isUnsafe({ t }) || SPORT_RE.test(t);
export async function stockPics(q, n = 6) {
  q = String(q || '').replace(/[^\p{L}\p{N} '-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); if (!q) return [];
  const out = [], seen = new Set(), add = (img, page, t) => { if (img && !seen.has(img) && out.length < n) { seen.add(img); out.push({ img, page, t }); } };
  try { // 1) the Wikipedia article's own lead photo (best for things like "monarch butterfly")
    const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(q.replace(/ /g, '_')), { headers: WUA });
    if (r.ok) { const d = await r.json(), th = d.thumbnail && d.thumbnail.source, og = d.originalimage && d.originalimage.source;
      if (d.type !== 'disambiguation' && !badPic(d.title || '') && !/\.svg/i.test(og || th || '')) add(wmThumb((og || th || '').replace('//thumb.wikimedia.org/', '//upload.wikimedia.org/'), (d.originalimage && d.originalimage.width) || 960) || '', d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page, d.title); }
  } catch (e) { }
  const words = q.toLowerCase().split(' ').filter(w => w.length > 3).map(w => w.slice(0, 5)), fits = t => { const l = t.toLowerCase(); const k = words.filter(w => l.includes(w)).length; return words.length ? k >= Math.ceil(words.length / 2) : true; };
  try { // 2) more photos from Wikimedia Commons (as the feed's own pictures do)
    const r = await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=24&prop=imageinfo&iiprop=url|size&iiurlwidth=960&gsrsearch=' + encodeURIComponent('filemime:image/jpeg ' + q), { headers: WUA });
    if (r.ok) for (const p of Object.values(((await r.json()).query || {}).pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0))) {
      const ii = (p.imageinfo || [])[0], t = String(p.title || '').replace(/^File:/, '').replace(/\.\w+$/, '');
      if (!ii || !ii.thumburl || ii.width < 600 || ii.width < ii.height * 0.6 || badPic(t) || !fits(t) || !/^https:\/\/upload\.wikimedia\.org\//.test(ii.thumburl)) continue;
      const th = wmThumb(ii.url || ii.thumburl, ii.width); if (th) add(th, ii.descriptionurl || '', t);
    }
  } catch (e) { }
  return out;
}
