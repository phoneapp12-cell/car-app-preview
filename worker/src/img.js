/* 1.8.5 sharper pictures: many feeds hand out thumbnails (Eventfinda 60×60, WordPress -300x200, ?w=564 …).
   upsize() turns a picture link into the biggest sensible version of the same picture (about 1200–1600px wide). */
const JUNK = /^blob:|s\.w\.org\/images\/core\/emoji|\/count\.gif|\/pixel\.|1x1\.(gif|png)|\/index\.html|youtube\.com\/embed\/|players\.brightcove/i;
const photon = x => { const m = x.match(/^https:\/\/([^?#]+)/); return m && !/(^|\.)wp\.com\//.test(m[1]) ? `https://i0.wp.com/${m[1]}?w=1200` : x; }; // WordPress's free image resizer: originals can be 4000px / several MB
export function upsize(u) {
  if (!u || typeof u !== 'string') return u;
  let x = u.replace(/&amp;/g, '&').replace(/^http:\/\//, 'https://').replace(/^(https:\/\/([^/]+))\/\2\//, '$1/'); // (one feed doubles its host)
  if (JUNK.test(x)) return ''; // emoji, tracking pixels, players – not pictures
  try {
    // Eventfinda: …/transformed/<id>-<n>.jpg; -36 is the uncropped picture that fits 1024px (the feeds give -13 = 60×60)
    if (/cdn\.eventfinda\.co\.nz\/uploads\/events\/transformed\//.test(x)) return photon(x.replace(/(\/transformed\/\d+-\d+)-\d+(\.\w+)/, '$1-36$2'));
    if (/audioculture\.co\.nz\/content\/images\/\d+\/thumb_/.test(x)) return x.replace('/thumb_', '/');
    // YouTube: hqdefault is 480×360 with black bars; the app swaps in maxresdefault (falls back if missing)
    if (/i\.ytimg\.com\/vi\//.test(x)) return x.replace(/\/(default|mqdefault)\.jpg/, '/hqdefault.jpg');
    // Reddit previews: use the full picture
    if (/preview\.redd\.it\//.test(x)) { const m = x.match(/preview\.redd\.it\/([^?]+)/); if (m && m[1].length <= 24 && /\.(jpe?g|png|gif)$/i.test(m[1])) return 'https://i.redd.it/' + m[1]; }
    // phys.org / sciencex: tmb → 800
    if (/b-cdn\.net\/csz\/news\/tmb\//.test(x)) return x.replace('/csz/news/tmb/', '/csz/news/800a/');
    // Shopify: _small / _300x / _300x200 before the extension
    if (/cdn\.shopify\.com|\/cdn\/shop\//.test(x)) x = x.replace(/_(pico|icon|thumb|small|compact|medium|large|grande|\d+x\d*|x\d+)(?=\.(jpe?g|png|webp|gif)(\?|$))/i, '');
    // Cloudinary: w_300 → w_1200
    x = x.replace(/\/(w_)(\d+)([,/])/, (m, a, w, b) => +w < 1000 ? `/${a}1200${b}` : m);
    // WordPress size suffix: -300x200.jpg → .jpg (originals are usually 1–2k wide); also -scaled is fine as is
    if (!/cdn\.sanity\.io|geekdo-images|cdn-si-edu/.test(x) && /\/wp-content\/uploads\//.test(x)) { const y = x.replace(/-(\d{2,4})x(\d{2,4})(?=\.(jpe?g|png|webp)(\?|$))/i, (m, w) => +w < 1000 ? '' : m); if (y !== x) return photon(y); }
    // width / w / resize query parameters that ask for something small
    const url = new URL(x);
    let wide = false;
    for (const k of ['w', 'width', 'wid', 'maxwidth', 'imwidth']) { const v = url.searchParams.get(k); if (v && +v > 0 && +v < 1000) { url.searchParams.set(k, '1200'); wide = true; } }
    if (/cdn\.shopify\.com|\/cdn\/shop\//.test(x) && !url.searchParams.get('width')) url.searchParams.set('width', '1200'); // Shopify resizes on request
    if (wide) for (const k of ['h', 'height', 'hei']) url.searchParams.delete(k); // keep the shape, don't crop to the old height
    const fit = url.searchParams.get('fit'); if (fit && /^\d+,\d+$/.test(fit)) { const [w, hh] = fit.split(',').map(Number); if (w < 1000) url.searchParams.set('fit', `1200,${Math.round(1200 * hh / w)}`); }
    const rs = url.searchParams.get('resize'); if (rs && /^\d+,\d+$/.test(rs)) { const [w, hh] = rs.split(',').map(Number); if (w < 1000) url.searchParams.set('resize', `1200,${Math.round(1200 * hh / w)}`); }
    if (/^\d+$/.test(url.searchParams.get('format') || '') && +url.searchParams.get('format') < 1000) url.searchParams.set('format', '1500w'); // Squarespace
    if (/^\d+w$/.test(url.searchParams.get('format') || '') && parseInt(url.searchParams.get('format')) < 1000) url.searchParams.set('format', '1500w');
    x = url.toString();
  } catch (e) { return u; }
  return x;
}
// RSS: of several media:content / media:thumbnail pictures, take the widest
export function widestMedia(b) {
  let best = '', bw = -1;
  for (const m of b.matchAll(/<media:(content|thumbnail)\b([^>]*)>/gi)) {
    const a = m[2], url = (a.match(/\burl=["']([^"']+)["']/i) || [])[1]; if (!url) continue;
    const med = (a.match(/\bmedium=["']([^"']+)["']/i) || [])[1], type = (a.match(/\btype=["']([^"']+)["']/i) || [])[1] || '';
    if ((med && med !== 'image') || (type && !/^image\//.test(type))) continue;
    const w = +((a.match(/\bwidth=["'](\d+)["']/i) || [])[1] || 0) + (m[1] === 'content' ? 1 : 0);
    if (w > bw) { bw = w; best = url; }
  }
  return best;
}
