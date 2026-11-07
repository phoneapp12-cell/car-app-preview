/* 1.9.108 Keep TV and gardening honest, and sometimes show one current
   Event Cinemas Whangārei film. The feed data service is not in this repo, so this
   is a display filter. Films come from the existing relay GET /events `cinema`
   field (Event Cinemas' public JSON for cinema 503, 18 James Street). */
(function (root) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RELAY = 'https://due-dates-calendar-relay.phoneapp12.workers.dev/events';
  const CACHE = 'ib.cineWhg';
  /* Streaming cards stay only when this item itself shows a verified NZ service.
   Checked against the live feed: TVNZ / TVNZ+ (tvnz.co.nz), Three / ThreeNow (threenow.co.nz),
   Sky Go (skygo.co.nz), and the feed's own NZ guides nz-tvg2, tvm-nz, nz-yt-three.
   Stan (stan.news, stan.com.au) is Australia-only. Neon is excluded on purpose.
   A .com link, English text, or the word sitcom is not treated as NZ. */
  const NZ_TV_SRC = new Set(['nz-tvg2', 'tvm-nz', 'nz-yt-three']);
  const NZ_TV_HOST = /(^|\.)(tvnz\.co\.nz|threenow\.co\.nz|skygo\.co\.nz)$/i;
  const G_KEEP = new Set(['kings-sow', 'kings-veg', 'kings-flowers', 'yates', 'nz-tui-guides', 'nz-tui-qa', 'nz-oderings', 'nz-sarahgardener', 'rd-nzgarden', 'tips', 'nz-yt-mitre10']);
  const G_DROP = new Set(['gw', 'yt-epic', 'yt-gardenau', 'rd-gardening', 'rd-veg', 'rd-beekeeping']);
  const OK_RATE = /^(G|PG|M|E)$/i;
  const BAD_TITLE = /\b(horror|gore|murder|serial killer|nude|naked|porn|erotic|sex scene|terrorist)\b/i;
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const SEASON = { december: 'summer', january: 'summer', february: 'summer', march: 'autumn', april: 'autumn', may: 'autumn', june: 'winter', july: 'winter', august: 'winter', september: 'spring', october: 'spring', november: 'spring' };

  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function streamingCard(i) {
    if (!i) return false;
    if (String(i.src || '').indexOf('you-') === 0) return false;
    if (i.kind === 'tv' || i.x === 'watch' || i.plat) return true;
    if (/^tvm-/.test(i.src || '') || i.src === 'nz-tvg2' || i.src === 'yt-neon') return true;
    if (/^New on streaming$|^New episodes|^Coming soon$|^On NZ TV/i.test(i.sn || '')) return true;
    return false;
  }
  function blockedService(i) {
    if (!i) return false;
    const where = String(i.where || '').trim(), plat = String(i.plat || '').trim(), sn = String(i.sn || ''), src = String(i.src || ''), pk = String(i.pk || '');
    const host = hostOf(i.url || '');
    if (src === 'yt-neon' || pk === 'neon') return true;
    if (/(^|\.)(stan\.news|stan\.com\.au|neontv\.co\.nz)$/i.test(host)) return true;
    if (/^(Stan|Neon)( NZ)?$/i.test(where) || /^(Stan|Neon)( NZ)?$/i.test(plat)) return true;
    if (/\bNeon NZ\b/i.test(sn)) return true;
    if (/[·•]\s*(Stan|Neon)\b/.test(String(i.s || ''))) return true;
    return false;
  }
  function neon(i) { return blockedService(i) && /neon/i.test([i && i.src, i && i.pk, i && i.where, i && i.plat, i && i.sn, i && i.url, i && i.s].join(' ')); }
  function nzVerified(i) {
    if (!i) return false;
    if (NZ_TV_SRC.has(i.src)) return true;
    if (NZ_TV_HOST.test(hostOf(i.url || ''))) return true;
    return false;
  }
  function tvDrop(i) {
    if (!i || !streamingCard(i)) return false;
    if (blockedService(i)) return true;
    return !nzVerified(i);
  }
  function watchDrop(w) {
    if (!w) return false;
    if (blockedService(w)) return true;
    return !nzVerified(w);
  }
  function nzMonth(now) { return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', month: 'long' }).format(now).toLowerCase(); }
  function wrongSeason(i, now) {
    const month = nzMonth(now), season = SEASON[month];
    if (!season) return false;
    const title = String(i.t || '').replace(/spring onions?/gi, '');
    for (const m of MONTHS) if (m !== month && new RegExp('\\b' + m + '\\b', 'i').test(title) && /garden|plant|sow|list|guide|tasks|jobs/i.test(title)) return true;
    const other = { spring: ['autumn', 'winter', 'summer'], summer: ['autumn', 'winter', 'spring'], autumn: ['winter', 'summer', 'spring'], winter: ['summer', 'autumn', 'spring'] }[season];
    for (const s of other) if (new RegExp('\\b' + s + '\\b', 'i').test(title) && /plant|sow|garden|prun|feed|tasks|guide|list|season/i.test(title)) return true;
    return false;
  }
  function gardenDrop(i, now) {
    if (!i) return false;
    const src = String(i.src || ''), topic = i.topic || '', cat = i.cat || '';
    const isG = topic === 'garden' || cat === 'gardening' || G_KEEP.has(src) || G_DROP.has(src);
    if (!isG) return false;
    if (cat === 'garden' && i.mine) return false;
    if (G_DROP.has(src)) return true;
    const host = hostOf(i.url || '');
    const nzHost = /\.co\.nz$|\.nz$/i.test(host);
    const nzSrc = G_KEEP.has(src) || src.indexOf('nz-') === 0;
    if (!nzSrc && !nzHost) return true;
    return wrongSeason(i, now || Date.now());
  }
  function drop(i, now) {
    if (!i) return false;
    if (blockedService(i) || blockedService(i.w) || blockedService(i.h) || blockedService(i._share && i._share.snap)) return true;
    if (i.x === 'watch') return watchDrop(i.w);
    if (watchDrop(i) && (i.plat || i.pk)) return true;
    if (tvDrop(i) || tvDrop(i.h) || tvDrop(i._share && i._share.snap)) return true;
    if (gardenDrop(i, now) || (i.h && gardenDrop(i.h, now))) return true;
    if (i.cat === 'gardening' && !i.mine && gardenDrop(i, now)) return true;
    return false;
  }
  function nzStamp(now) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
    return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute;
  }
  function filmLink(m) {
    const u = String(m.url || '');
    if (/^https:\/\/www\.eventcinemas\.co\.nz\/movie\//.test(u)) return u;
    if (/^https:\/\/www\.eventcinemas\.co\.nz\/cinema\/whangarei/i.test(u)) return u;
    return '';
  }
  function currentFilms(cinema, now) {
    if (!cinema || !/whang[aā]rei/i.test(cinema.name || '') || !/james street/i.test(cinema.address || '')) return [];
    const stamp = nzStamp(now || Date.now()), out = [];
    for (const m of cinema.movies || []) {
      if (!m || !m.title || m.soon) continue;
      if (!OK_RATE.test(String(m.rating || '').trim())) continue;
      if (BAD_TITLE.test(m.title)) continue;
      if (!/^https:\/\/cdn\.eventcinemas\.co\.nz\//.test(m.poster || '')) continue;
      const fut = (m.sessions || []).filter(s => /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s.t || '') && s.t.slice(0, 16) >= stamp);
      if (!fut.length) continue;
      const link = filmLink(m) || 'https://www.eventcinemas.co.nz/cinema/whangarei/sessions';
      if (/\/orders\//.test(link)) continue;
      out.push({ id: m.id, title: m.title, rating: String(m.rating).trim(), mins: Number(m.mins) || 0, poster: m.poster, link, sessions: 'https://www.eventcinemas.co.nz/cinema/whangarei/sessions' });
    }
    return out;
  }
  function pickFilm(list, seed) { if (!list || !list.length) return null; const n = (seed >>> 0) % list.length; return list[n]; }
  function cineCard(i) {
    const f = i.film, meta = [f.rating, f.mins ? f.mins + ' min' : ''].filter(Boolean).join(' · ');
    const xh = typeof root.xHead === 'function' ? root.xHead('🎬', 'At the movies', 'Event Cinemas Whangārei · 18 James Street', 'Whangārei') : '';
    return `<article class="card xc cine" data-id="${esc(i.id)}" data-topic="events" style="--c1:#be123c;--c2:#7c3aed">${xh}
      <a class="media" href="${esc(f.link)}" target="_blank" rel="noopener"><img src="${esc(f.poster)}" alt="Poster for ${esc(f.title)}" loading="lazy" referrerpolicy="no-referrer"></a>
      <div class="bd"><h3>${esc(f.title)}</h3>
      <p>${esc(meta)}. Now showing at Event Cinemas Whangārei. This title is in their current session list for 18 James Street.</p>
      <p>Session times stay on their site, because they change. Info Book doesn’t sell tickets.</p>
      <div class="xbtns"><a class="btn pri" href="${esc(f.sessions)}" target="_blank" rel="noopener">Whangārei sessions ↗</a><a class="btn" href="${esc(f.link)}" target="_blank" rel="noopener">Film page ↗</a></div>
      <p class="plsrc">Event Cinemas · cinema 503 · eventcinemas.co.nz</p></div></article>`;
  }
  function insertCinema(order, nPins, film, now) {
    if (!film) return order;
    const out = order.slice(), lo = Math.max(nPins | 0, 2);
    const day = Math.floor((now || Date.now()) / 864e5);
    let at = Math.min(out.length, lo + 11 + (day % 3));
    const busy = i => { const x = out[i]; return x && (x.x === 'play' || x.x === 'zoomq' || x.x === 'fallq' || x.x === 'cine'); };
    let g = 0; while (g++ < 8 && (busy(at) || busy(at - 1) || busy(at + 1))) at = Math.min(out.length, at + 3);
    out.splice(at, 0, { id: 'cine-' + film.id + '-' + day, x: 'cine', film, topic: 'events', t: fTitle(film) });
    return out;
  }
  function fTitle(f) { return f.title; }
  function cachedFilms(now) {
    try {
      const raw = root.localStorage && root.localStorage.getItem(CACHE);
      if (!raw) return [];
      const pack = JSON.parse(raw);
      if (!pack || Date.now() - pack.at > 6 * 3600e3) return [];
      return currentFilms(pack, now);
    } catch (e) { return []; }
  }
  function videoFate(i) {
  if (!i) return 'photo';
  const u = String((i.h && i.h.url) || i.url || '');
  const vid = String(i.vid || (i.h && i.h.vid) || '');
  if (/^[\w-]{6,}$/.test(vid)) return 'full';
  if (/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{11}/.test(u)) return 'full';
  if (/vimeo\.com\/(?:channels\/[\w.-]+\/|video\/)?\d{6,12}(?:$|[/?#])/.test(u)) return 'full';
  if (/^https:\/\/[^?#\s]+\.mp4(\?|$)/i.test(u)) return 'full';
  if (/tiktok\.com\/@[\w.-]+\/video\/\d+/.test(u)) return 'drop';
  if (/instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|tv)\//.test(u)) return 'drop';
  if (/facebook\.com\/(?:.+\/videos\/|watch\/?\?v=|reel\/|share\/v\/|share\/r\/)|fb\.watch\//.test(u)) return 'drop';
  if (/^https:\/\/v\.redd\.it\//i.test(u)) return 'drop';
  if (i.kind === 'video' || i.x === 'vlog') return 'drop';
  return 'photo';
}
function presentVideos(order) {
  const out = [];
  for (const i of order || []) {
    if (i && i.x === 'row') {
      const keep = [], vids = [];
      for (const it of i.items || []) {
        const fate = videoFate(it);
        if (fate === 'drop') continue;
        (fate === 'full' || it.vid || it.x === 'vlog' ? vids : keep).push(it);
      }
      if (i.k !== 'vid' && i.k !== 'vlog' && keep.length >= 3) out.push(Object.assign({}, i, { items: keep }));
      vids.forEach(v => out.push(v));
      continue;
    }
    if (videoFate(i) === 'drop') continue;
    out.push(i);
  }
  return out;
}
function keptItems(list) { return (list || []).filter(i => !drop(i)); }
  root.ibNz = { neon, blockedService, streamingCard, nzVerified, tvDrop, watchDrop, gardenDrop, drop, keptItems, wrongSeason, currentFilms, pickFilm, insertCinema, cineCard, nzStamp, videoFate, presentVideos, CACHE, RELAY };
  if (!root.document) return;
  const prevVisible = root.visible;
  if (typeof prevVisible === 'function') root.visible = function () { return prevVisible().filter(i => !drop(i) && videoFate(i) !== 'drop'); };
  const prevCarousel = root.carouselize;
  if (typeof prevCarousel === 'function') root.carouselize = function (order) { return presentVideos(prevCarousel(order)); };
  const prevPins = root.pins;
  if (typeof prevPins === 'function') root.pins = function () { return keptItems(prevPins()); };
  const prevShares = root.weaveShares;
  if (typeof prevShares === 'function') root.weaveShares = function (order) { return keptItems(prevShares(order)); };
  const prevLife = root.lifeMix;
  if (typeof prevLife === 'function') root.lifeMix = function () { return prevLife().filter(i => !(i.cat === 'gardening' && !i.mine && gardenDrop(i))); };
  const prevCard = root.card;
  root.card = function (i) { if (i && i.x === 'cine') return cineCard(i); return prevCard ? prevCard(i) : ''; };
  const prevFest = root.festive;
  root.festive = function (order, nPins) {
    order = prevFest ? prevFest(order, nPins) : (order || []);
    order = order.filter(i => !drop(i));
    const films = cachedFilms(Date.now());
    const seed = (typeof root.ibPlay === 'object' && root.ibPlay.hash) ? root.ibPlay.hash(String(Math.floor(Date.now() / 864e5))) : 1;
    return insertCinema(order, nPins, pickFilm(films, seed), Date.now());
  };
  function refresh() {
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ac ? setTimeout(() => ac.abort(), 20000) : 0;
    fetch(RELAY, { headers: { Accept: 'application/json' }, signal: ac ? ac.signal : undefined }).then(r => { if (!r.ok) throw new Error('events ' + r.status); return r.json(); }).then(j => {
      const c = j && j.cinema; if (!c || !Array.isArray(c.movies)) return;
      root.localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), name: c.name, address: c.address, movies: c.movies }));
      // Do not redraw. The next refresh or reopen uses the saved list, so a card never jumps while someone is reading.
    }).catch(() => {}).finally(() => clearTimeout(timer));
  }
  setTimeout(refresh, 400);
})(typeof window !== 'undefined' ? window : globalThis);
