/* Brand choices for a shopping-list item (Sarah's To-do 1.3.0, My App 2.23.13).
 *
 * POST /brands { key, q } -> up to 6 brand options for q from New World Onerahi's own website search
 * (Foodstuffs North Island public site API, anonymous guest sign-in, the same calls the website makes).
 * Each option is real store data: brand, product name, size, shelf price, Clubcard/promo price, and a
 * gluten-free flag only when the store's own "Gluten Free" tag or product name says so. Nothing is made up:
 * no price in the data means no price. Cached 24 h per query in KV; protected by the shared to-do key and
 * rate-limited per key. No AI.
 */
import { normSharedKey } from './shared-todo.js';

export const NW_STORE = { id: '4664daab-1897-4e69-9117-067b4afd41bb', name: 'New World Onerahi' };
const NW_SITE = 'https://www.newworld.co.nz';
const NW_API = 'https://api-prod.newworld.co.nz/v1/edge/search/paginated/products';
const CACHE_TTL = 24 * 3600;
const MAX_OPTS = 6;
const RATE = { perKey: 30, global: 200, windowMs: 60000 };

let tok = { value: '', exp: 0 };
const hits = new Map();
const mem = new Map();

export function normQuery(raw) {
  const q = String(raw || '').toLowerCase().replace(/[^a-z0-9&' .\-āēīōū]/g, ' ').replace(/\s+/g, ' ').trim();
  return q.length >= 2 && q.length <= 60 ? q : '';
}
export function rateOk(k, now = Date.now()) {
  const w = Math.floor(now / RATE.windowMs);
  const g = hits.get('*') || { w, n: 0 }; if (g.w !== w) { g.w = w; g.n = 0; }
  const e = hits.get(k) || { w, n: 0 }; if (e.w !== w) { e.w = w; e.n = 0; }
  if (g.n >= RATE.global || e.n >= RATE.perKey) return false;
  g.n++; e.n++; hits.set('*', g); hits.set(k, e);
  if (hits.size > 500) hits.clear();
  return true;
}
const cents = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) / 100 : null);
const stem = w => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
// Pure: New World search products in, brand options out.
export function brandOptions(products, q) {
  const words = normQuery(q).split(' ').filter(w => w.length > 1).map(stem);
  const rows = (Array.isArray(products) ? products : []).filter(p => p && p.name && !p.tobaccoFlag && !p.liquorFlag).map(p => {
    const brand = String(p.brand || '').trim(), name = String(p.name || '').trim();
    const hay = (brand + ' ' + name).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).map(stem);
    const match = words.every(w => hay.includes(w) || hay.some(h => h.startsWith(w)));
    const sp = p.singlePrice || {};
    const byKg = p.saleType !== 'UNITS' && /^kg$/i.test(String(p.displayName || ''));
    const promo = (Array.isArray(p.promotions) ? p.promotions : []).find(x => x && x.bestPromotion) || (Array.isArray(p.promotions) ? p.promotions[0] : null);
    const promoPrice = promo && promo.rewardType === 'NEW_PRICE' ? cents(promo.rewardValue) : null;
    const facets = (Array.isArray(p.facets) ? p.facets : []).map(f => String(f && f.itemDescription || ''));
    const gf = facets.some(f => /^gluten free$/i.test(f)) || /\bgluten[ -]free\b/i.test(brand + ' ' + name);
    return {
      brand, product: name, size: byKg ? '' : String(p.displayName || '').slice(0, 30), price: cents(sp.price), per: byKg ? 'kg' : '',
      promo: promoPrice && promoPrice < (cents(sp.price) || Infinity) ? promoPrice : null, club: !!(promo && promo.cardDependencyFlag && promoPrice),
      gf, id: String(p.productId || '').slice(0, 40), match
    };
  });
  const phrase = normQuery(q);
  rows.forEach((r, i) => { r.rank = (r.match ? 0 : 2) + ((r.brand + ' ' + r.product).toLowerCase().includes(phrase) ? 0 : 1); r.i = i; });
  const pool = (rows.filter(r => r.match).length >= 2 ? rows.filter(r => r.match) : rows).sort((a, b) => a.rank - b.rank || a.i - b.i);
  const seen = new Set(), out = [];
  for (const r of pool) {
    const b = (r.brand || r.product).toLowerCase();
    if (seen.has(b)) continue;
    seen.add(b); delete r.match; delete r.rank; delete r.i; out.push(r);
    if (out.length >= MAX_OPTS) break;
  }
  return out;
}
async function guestToken(fetchImpl, force) {
  if (!force && tok.value && Date.now() < tok.exp) return tok.value;
  const r = await fetchImpl(NW_SITE + '/api/user/get-current-user', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; SharedTodo/1.0)' }, body: '{}' });
  if (!r.ok) throw new Error('nw_token_' + r.status);
  const d = await r.json();
  if (!d || !d.access_token) throw new Error('nw_token');
  const exp = Date.parse(d.expires_time || '') || Date.now() + 20 * 60000;
  tok = { value: d.access_token, exp: exp - 60000 };
  return tok.value;
}
async function nwSearch(q, fetchImpl) {
  const body = JSON.stringify({
    algoliaQuery: { attributesToHighlight: [], attributesToRetrieve: ['productID', 'Type', 'sponsored', 'category0NI', 'category1NI', 'category2NI'], facets: ['brand'], filters: 'stores:' + NW_STORE.id, hitsPerPage: 30, page: 0, query: q, analyticsTags: ['fs-website'] },
    algoliaFacetQueries: [], storeId: NW_STORE.id, hitsPerPage: 30, page: 0, sortOrder: 'NI_POPULARITY_ASC', tobaccoQuery: false,
    precisionMedia: { adDomain: 'SEARCH_PAGE', adPositions: [], publishImpressionEvent: false, disableAds: true }
  });
  for (let i = 0; i < 2; i++) {
    const t = await guestToken(fetchImpl, i > 0);
    const r = await fetchImpl(NW_API, { method: 'POST', headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json', accept: 'application/json', origin: NW_SITE, referer: NW_SITE + '/', 'user-agent': 'Mozilla/5.0 (compatible; SharedTodo/1.0)' }, body });
    if (r.status === 401 || r.status === 403) continue;
    if (!r.ok) throw new Error('nw_search_' + r.status);
    const d = await r.json();
    return Array.isArray(d && d.products) ? d.products : [];
  }
  throw new Error('nw_auth');
}
export async function brandsRoute(body, env, fetchImpl = fetch, now = Date.now()) {
  const k = normSharedKey(body && body.key);
  if (!k) return [403, { error: 'bad_key' }];
  const q = normQuery(body && body.q);
  if (!q) return [400, { error: 'bad_query' }];
  const ck = 'brands-v1:' + q;
  const m = mem.get(ck);
  if (m && now - m.at < CACHE_TTL * 1000) return [200, m.data];
  const kv = env && env.EVENTS_KV && typeof env.EVENTS_KV.get === 'function' ? env.EVENTS_KV : null;
  if (kv) { try { const c = await kv.get(ck, { type: 'json' }); if (c && Array.isArray(c.options)) { mem.set(ck, { at: Date.parse(c.checked) || now, data: c }); return [200, c]; } } catch (e) { } }
  if (!rateOk(k, now)) return [429, { error: 'slow_down' }];
  const products = await nwSearch(q, fetchImpl);
  const data = { ok: true, q, store: NW_STORE.name, source: 'newworld.co.nz', checked: new Date(now).toISOString(), options: brandOptions(products, q) };
  mem.set(ck, { at: now, data }); if (mem.size > 300) mem.clear();
  if (kv) { try { await kv.put(ck, JSON.stringify(data), { expirationTtl: CACHE_TTL }); } catch (e) { } }
  return [200, data];
}
