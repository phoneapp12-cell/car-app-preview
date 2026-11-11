/* 1.9.24 No paywalls: Shane tapped a card that opened a paywall (a Washington Post story syndicated as NZ Herald premium).
   1) hard-paywall domains (also when an aggregator, Google News or a Reddit post links to them)
   2) NZ premium sections (NZ Herald /premium/ URLs, BusinessDesk, The Post / The Press / Waikato Times)
   3) syndicated stories credited to a paywalled paper ("Washington Post: …")
   4) auto-detection on any article page we read: JSON-LD isAccessibleForFree:false, article:content_tier locked/metered, known paywall markers */
export const PAYWALL_DOMAINS = ['washingtonpost.com', 'nytimes.com', 'wsj.com', 'ft.com', 'theatlantic.com', 'bloomberg.com', 'economist.com', 'telegraph.co.uk', 'thetimes.co.uk', 'thetimes.com', 'newyorker.com', 'businessinsider.com', 'wired.com', 'businessdesk.co.nz', 'thepost.co.nz', 'thepress.co.nz', 'waikatotimes.co.nz', 'theaustralian.com.au', 'afr.com', 'barrons.com', 'hbr.org', 'foreignpolicy.com', 'nzme.co.nz/premium', 'insider.com', 'latimes.com', 'bostonglobe.com', 'thetimes.co.nz', 'theinformation.com', 'seekingalpha.com', 'statnews.com'];
const DOM_RE = new RegExp('(?:^|[/.@])(?:' + PAYWALL_DOMAINS.map(d => d.replace(/[.]/g, '\\.')).join('|') + ')(?:[/:?#]|$)', 'i');
const PREMIUM_URL = /nzherald\.co\.nz\/[^?#]*\/premium\/|[?&](?:premium|paywall)=(?:1|true)|\/premium\/|\bpremium\.[a-z.]+\//i;
const CREDIT = /^\s*(?:The )?(?:Washington Post|New York Times|NYT|Wall Street Journal|WSJ|Financial Times|FT|Bloomberg|The Atlantic|The Economist|Economist|Telegraph|The Telegraph|The Times|Times of London|New Yorker|Business Insider|Wired|BusinessDesk|The Post|The Press)\s*[:–—-]/i;
// a Google News / aggregator link that hides the real domain in a query parameter
function urlsIn(s) { const out = []; String(s || '').replace(/https?(?::|%3A)(?:\/|%2F){2}[^\s"'<>&]+/gi, m => { out.push(decodeURIComponent(m)); return m; }); return out; }
export function paywallUrl(u) {
  u = String(u || ''); if (!u) return false;
  for (const x of [u, ...urlsIn(u.replace(/^https?:\/\/[^/]+/, ''))]) { const h = x.replace(/^https?:\/\/(www\.)?/i, '').split(/[?#]/)[0]; if (DOM_RE.test('/' + h) || PREMIUM_URL.test(x)) return true; }
  return false;
}
export function isPaywalled(i) {
  if (!i) return false;
  if (i.pay) return true;
  if (paywallUrl(i.url) || paywallUrl(i.ext) || paywallUrl(i.link)) return true;
  if (CREDIT.test(i.s || '') || CREDIT.test(i.t || '')) return true;
  if (/\b(subscribers? only|premium content|for subscribers)\b/i.test((i.t || '') + ' ' + (i.s || ''))) return true;
  return false;
}
// an article page (head + as much body as we read): does it say it's locked?
export function paywallHtml(h) {
  h = String(h || '');
  if (/"isAccessibleForFree"\s*:\s*(?:false|"false"|"False")/i.test(h)) return true;
  if (/<meta[^>]+(?:property|name)=["']article:content_tier["'][^>]+content=["'](?:locked|metered|premium)["']/i.test(h) || /<meta[^>]+content=["'](?:locked|metered|premium)["'][^>]+(?:property|name)=["']article:content_tier["']/i.test(h)) return true;
  if (/<meta[^>]+name=["'](?:premium|is-premium|paywall|cXenseParse:[\w-]*paywall)["'][^>]+content=["'](?:true|1|yes)["']/i.test(h)) return true;
  if (/["'](?:isPremium|premium|paywalled|isPaywalled)["']\s*:\s*true\b/.test(h) && /paywall|subscri/i.test(h)) return true;
  if (/class=["'][^"']*\b(?:paywall|piano-paywall|tp-container-inner|premium-paywall|article-paywall)\b/i.test(h) && /subscri/i.test(h)) return true;
  return false;
}
