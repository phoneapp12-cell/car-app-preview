/* Woolworths NZ shelf prices for shopping-list items (My App 2.23.55).
 * POST /prices { key, items: [{ q, brand }] } -> one real product per item from woolworths.co.nz's own public
 * product search (the call the website makes). Price, unit (cup) price, special flag and product page. A chosen
 * brand must match; otherwise the top relevant result. Nothing is made up: no product, no price. Cached 18 h per
 * query in KV, rate-limited per key, at most 25 items a call. No AI.
 */
import { normSharedKey } from './shared-todo.js';
import { normQuery, rateOk } from './brands.js';

const WW = 'https://www.woolworths.co.nz';
const TTL = 18 * 3600, MAX = 25, LIVE_PER_CALL = 8;
const mem = new Map();
const num = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v) * 100) / 100 : null);
const stem = w => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
const words = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1).map(stem);

// Pure: Woolworths search items in, the best product out (or null).
export function pickProduct(items, q, brand) {
  const want = words(q), b = words(brand);
  const rows = (Array.isArray(items) ? items : []).filter(p => p && p.type === 'Product' && p.name && p.price).map((p, i) => {
    const hay = words((p.brand || '') + ' ' + p.name + ' ' + (p.variety || ''));
    const has = w => hay.includes(w) || hay.some(h => h.startsWith(w));
    const hit = want.filter(has).length, bOk = !b.length || b.every(w => words(p.brand || '').includes(w) || has(w));
    return { p, i, score: (want.length ? hit / want.length : 0), bOk };
  }).filter(r => r.score >= 0.5 && r.bOk).sort((a, b2) => b2.score - a.score || a.i - b2.i);
  const r = rows[0]; if (!r) return null;
  const p = r.p, pr = p.price || {}, sz = p.size || {};
  const price = num(pr.salePrice) || num(pr.originalPrice);
  if (!price) return null;
  const orig = num(pr.originalPrice);
  const special = !!(pr.isSpecial || (orig && price < orig));
  const cup = num(sz.cupPrice), cupM = String(sz.cupMeasure || '').slice(0, 12);
  const sku = String(p.sku || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 20);
  return {
    name: String(p.name).slice(0, 80), brand: String(p.brand || '').slice(0, 40), size: String(sz.volumeSize || '').slice(0, 20),
    price, was: special && orig && orig > price ? orig : null, special, club: !!pr.isClubPrice,
    unit: cup && cupM ? { price: cup, per: cupM } : null, per: p.unit === 'Kg' ? 'kg' : '',
    url: sku ? `${WW}/shop/productdetails?stockcode=${sku}${p.slug ? '&name=' + encodeURIComponent(String(p.slug).slice(0, 80)) : ''}` : ''
  };
}
export async function wwSearch(q, fetchImpl) {
  const u = `${WW}/api/v1/products?target=search&search=${encodeURIComponent(q)}&inStockProductsOnly=false&size=24`;
  const r = await fetchImpl(u, { headers: { accept: 'application/json, text/plain, */*', 'x-requested-with': 'OnlineShopping.WebApp', 'x-ui-ver': '7.60.37', referer: WW + '/shop/searchproducts?search=' + encodeURIComponent(q), 'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36', 'accept-language': 'en-NZ,en;q=0.9' } });
  if (!r.ok) { let t = ''; try { t = (await r.text()).slice(0, 300); } catch (e) { } throw Object.assign(new Error('ww_' + r.status), { status: r.status, snip: t }); }
  const d = await r.json().catch(() => null);
  if (!d || !d.products) throw Object.assign(new Error('ww_shape'), { status: 502 });
  return d.products.items || [];
}
export async function pricesRoute(body, env, fetchImpl = fetch, now = Date.now()) {
  const k = normSharedKey(body && body.key);
  if (!k) return [403, { error: 'bad_key' }];
  const list = (Array.isArray(body && body.items) ? body.items : []).slice(0, MAX);
  const kv = env && env.EVENTS_KV && typeof env.EVENTS_KV.get === 'function' ? env.EVENTS_KV : null;
  const out = []; let live = 0, blocked = 0;
  for (const it of list) {
    const q = normQuery(it && it.q), brand = normQuery(it && it.brand) || '';
    if (!q) { out.push(null); continue; }
    const ck = 'ww-v1:' + q + '|' + brand;
    const m = mem.get(ck);
    if (m && now - m.at < TTL * 1000) { out.push(m.data); continue; }
    if (kv) { try { const c = await kv.get(ck, { type: 'json' }); if (c && c.q) { mem.set(ck, { at: Date.parse(c.checked) || now, data: c }); out.push(c); continue; } } catch (e) { } }
    if (live >= LIVE_PER_CALL || blocked || !rateOk('ww:' + k, now)) { out.push({ q, pending: true }); continue; }
    live++;
    try {
      const items = await wwSearch(brand ? brand + ' ' + q : q, fetchImpl);
      let pick = pickProduct(items, q, brand);
      const data = { q, brand, checked: new Date(now).toISOString(), product: pick };
      mem.set(ck, { at: now, data }); if (mem.size > 500) mem.clear();
      if (kv) { try { await kv.put(ck, JSON.stringify(data), { expirationTtl: TTL }); } catch (e) { } }
      out.push(data);
    } catch (e) { blocked = e.status || 502; out.push({ q, error: 'unavailable', detail: body && body.debug ? String(e.snip || e.message) : undefined }); }
  }
  return [200, { ok: true, source: 'woolworths.co.nz', store: 'Woolworths online (default store prices)', blocked: blocked || 0, items: out }];
}
