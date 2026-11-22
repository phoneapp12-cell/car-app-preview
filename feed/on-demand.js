/* Preview: On demand row — official YouTube full episodes and public-domain
   Archive.org sitcoms, played in Info Book’s own full-screen player.
   Do not production-deploy from this branch. */
(function (root) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const JSON_URL = 'on-demand.json?v=1.9.319';
  const OFFICIAL = {
    UCsfIjK5sy9Upzcf316Xpytw: 'RedGreenTV',
    UCkAGrHCLFmlK3H2kd6isipg: 'MrBean',
    UCT5C7yaO3RVuOgwP8JVAujQ: 'Taskmaster',
    UCx9l0FfNQ3G79_9SBxkhR9g: 'TaskmasterInternational',
    UCsZXuHKonP9utl5q2hFCkgA: 'StudioCtv',
    UCKg_ZFByYTINckLG76cjUEg: 'WhoseLineIsItAnyway',
    UCahQQyMAU3ft_tBZxhFyPGA: 'TheDrewCareyShow',
    UCijVIIfFzspulKc7yWA2Qhg: 'Friends'
  };
  const SPORT = /\b(sport|rugby|nrl|afl|nfl|nba|nhl|cricket|netball|football|soccer|wwe|wrestling|boxing)\b/i;
  const BLOCKED = /\b(neon|neontv|the big bang theory|young sheldon)\b/i;
  let DATA = null;

  function setData(j) { DATA = j && Array.isArray(j.shows) ? j : null; return DATA; }
  function catalog() { return DATA; }
  function shows() { return (DATA && DATA.shows) || []; }
  function showById(id) { return shows().find(s => s.id === id) || null; }
  function episodeOf(show, eid) {
    const s = typeof show === 'string' ? showById(show) : show;
    return ((s && s.episodes) || []).find(e => e.id === eid) || null;
  }

  function allowedShow(s) {
    if (!s || !s.title || !Array.isArray(s.episodes) || !s.episodes.length) return false;
    const blob = [s.title, s.id, s.channel, s.source, s.label, s.about].join(' ');
    if (SPORT.test(blob) || BLOCKED.test(blob)) return false;
    if (s.source === 'youtube') {
      if (!s.official || !OFFICIAL[s.channelId] || !s.ads) return false;
    } else if (s.source === 'archive') {
      if (!/public domain/i.test(s.label + ' ' + (s.license || ''))) return false;
    } else return false;
    return s.episodes.some(allowedEpisode);
  }
  const HIDE_KEY = 'ib-od-hide-nz';
  let memHidden = null;
  function hiddenSet() {
    if (memHidden) return memHidden;
    try {
      const raw = root.localStorage && root.localStorage.getItem(HIDE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      memHidden = new Set(Array.isArray(arr) ? arr : []);
    } catch (e) { memHidden = new Set(); }
    return memHidden;
  }
  function persistHidden() {
    try {
      if (root.localStorage) root.localStorage.setItem(HIDE_KEY, JSON.stringify(Array.from(hiddenSet())));
    } catch (err) { }
  }
  function hideOnDevice(e) {
    const id = (e && (e.vid || e.id)) || '';
    if (!id) return;
    hiddenSet().add(id);
    persistHidden();
  }
  function unhideOnDevice(e) {
    const id = (e && (e.vid || e.id)) || '';
    if (!id) return;
    hiddenSet().delete(id);
    persistHidden();
  }
  function isHiddenOnDevice(e) {
    const id = (e && (e.vid || e.id)) || '';
    return !!(id && hiddenSet().has(id));
  }
  function allowedEpisode(e) {
    if (!e || !e.t || !e.id) return false;
    if (BLOCKED.test(e.t)) return false;
    if (isHiddenOnDevice(e)) return false;
    if (e.vid) return /^[\w-]{11}$/.test(e.vid);
    if (e.mp4) return /^https:\/\/archive\.org\/download\/[^\s]+$/i.test(e.mp4);
    return false;
  }
  function nextPlayable(show, ep) {
    const s = typeof show === 'string' ? showById(show) : show;
    const all = (s && s.episodes) || [];
    const idx = all.findIndex(x => x && ep && x.id === ep.id);
    for (let i = idx + 1; i < all.length; i++) {
      if (allowedEpisode(all[i])) return all[i];
    }
    return null;
  }
  function visibleShows(opts) {
    opts = opts || {};
    const sitcomsOn = opts.sitcomsOn;
    const list = shows().filter(allowedShow).map(s => {
      const episodes = (s.episodes || []).filter(allowedEpisode);
      return Object.assign({}, s, { episodes });
    }).filter(s => s.episodes.length);
    list.sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : 1000;
      const bo = Number.isFinite(b.order) ? b.order : 1000;
      if (ao !== bo) return ao - bo;
      const ak = a.kind === 'sitcom' ? 0 : 1, bk = b.kind === 'sitcom' ? 0 : 1;
      if (ak !== bk) return ak - bk;
      return 0;
    });
    if (sitcomsOn === false) return list;
    return list;
  }

  function youtubeEmbedUrl(vid, opts) {
    opts = opts || {};
    if (!/^[\w-]{11}$/.test(vid || '')) return '';
    const auto = opts.autoplay === false ? '0' : '1';
    const mute = opts.mute ? '1' : '0';
    let url = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(vid) + '?rel=0&modestbranding=1&playsinline=1&autoplay=' + auto + '&mute=' + mute + '&enablejsapi=1';
    try {
      if (root.location && root.location.origin && root.location.origin !== 'null') {
        url += '&origin=' + encodeURIComponent(root.location.origin);
      }
    } catch (e) { }
    return url;
  }
  function playerSrc(ep, opts) {
    if (!allowedEpisode(ep)) return null;
    if (ep.vid) return { type: 'youtube', vid: ep.vid, src: youtubeEmbedUrl(ep.vid, opts), ads: true };
    return { type: 'mp4', src: ep.mp4, ads: false };
  }

  function epLabel(e) {
    const bits = [];
    if (e.season && e.ep) bits.push('S' + e.season + ' E' + e.ep);
    else if (e.season && e.no) bits.push('S' + e.season + ' · ep ' + e.no);
    else if (e.season) bits.push('Season ' + e.season);
    else if (e.no) bits.push('Episode ' + e.no);
    if (e.mins) bits.push(e.mins + ' min');
    return bits.join(' · ');
  }

  function showCard(i) {
    const s = (i && i.show) || showById(i && i.showId) || i;
    if (!s) return '';
    const n = (s.episodes || []).length;
    const xh = typeof root.xHead === 'function' ? root.xHead('📺', 'On demand', s.label || '', 'On demand') : '';
    const img = s.poster ? `<button type="button" class="media" data-od-show="${esc(s.id)}" aria-label="Episodes of ${esc(s.title)}"><img src="${esc(s.poster)}" alt="Poster for ${esc(s.title)}" loading="lazy" referrerpolicy="no-referrer"></button>` : '';
    return `<article class="card xc odshow" data-id="${esc(i.id || ('od-' + s.id))}" data-topic="${esc(s.topic || 'sitcoms')}" data-od-show="${esc(s.id)}" style="--c1:#1e3a8a;--c2:#0ea5e9">${xh}
      ${img}
      <div class="bd"><h3>${esc(s.title)}</h3>
      <p>${n} episode${n === 1 ? '' : 's'}${s.about ? '. ' + esc(s.about) : ''}</p>
      <div class="xbtns"><button type="button" class="btn pri" data-od-show="${esc(s.id)}">Episodes</button></div>
      <p class="plsrc">${esc(s.label || '')}</p></div></article>`;
  }

  function rowItems(opts) {
    return visibleShows(opts).map(s => ({ id: 'od-' + s.id, x: 'odshow', showId: s.id, show: s, topic: s.topic || 'sitcoms', t: s.title }));
  }
  function makeRow(opts) {
    const items = rowItems(opts);
    if (!items.length) return null;
    return { id: 'row-ondemand', x: 'row', k: 'ondemand', title: 'On demand', items, topic: 'sitcoms' };
  }

  function topicSitcomsOn() {
    try { if (typeof root.topicOn === 'function') return !!root.topicOn('sitcoms'); } catch (e) { }
    try { if (typeof topicOn === 'function') return !!topicOn('sitcoms'); } catch (e) { }
    return true;
  }
  function currentTab() { return (typeof tab !== 'undefined' && tab) || root.tab || 'all'; }

  function insertRow(order) {
    if (!order) return order;
    const row = makeRow({ sitcomsOn: topicSitcomsOn() });
    if (!row) return order;
    if (order.some(i => i && i.x === 'row' && i.k === 'ondemand')) return order;
    const tabNow = currentTab();
    if (tabNow && tabNow !== 'all') return order;
    const out = order.slice();
    let pinEnd = 0;
    while (pinEnd < out.length && out[pinEnd] && out[pinEnd].pin) pinEnd++;
    // Sitcom fans: put On demand with the other early rows, just after any already-inserted front rows.
    let at = pinEnd;
    while (at < out.length && out[at] && (out[at].x === 'row' || out[at].x === 'relask')) at++;
    if (!topicSitcomsOn()) {
      at = Math.min(out.length, Math.max(at, pinEnd + 6));
    }
    out.splice(at, 0, row);
    return out;
  }

  function episodesHtml(show) {
    const s = typeof show === 'string' ? showById(show) : show;
    if (!s) return '';
    const eps = (s.episodes || []).filter(allowedEpisode);
    const rows = eps.map(e => {
      const meta = epLabel(e);
      return `<button type="button" class="ib-od-ep" data-od-play="${esc(s.id)}:${esc(e.id)}">
        <b>${esc(e.t)}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</button>`;
    }).join('');
    return `<div class="ib-od-eps" id="ib-od-eps" role="dialog" aria-label="${esc(s.title)} episodes">
      <div class="ib-od-epsbar"><button type="button" class="ib-od-x" data-od-eps-close aria-label="Close">×</button>
      <div><h2>${esc(s.title)}</h2><p>${esc(s.label || '')}</p></div></div>
      <div class="ib-od-epslist">${rows}</div></div>`;
  }

  function playerHtml(show, ep, opts) {
    const s = typeof show === 'string' ? showById(show) : show;
    const src = playerSrc(ep, opts);
    if (!s || !src) return '';
    const ads = src.ads ? '<p class="ib-od-ads">YouTube · may show ads</p>' : '<p class="ib-od-ads">Public domain</p>';
    const stage = src.type === 'youtube'
      ? `<iframe id="ib-od-yt" title="${esc(ep.t)}" src="${esc(src.src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`
      : `<video title="${esc(ep.t)}" src="${esc(src.src)}" controls playsinline autoplay></video>`;
    return `<div class="ib-od-fs" id="ib-od-fs" role="dialog" aria-label="${esc(ep.t)}">
      <button type="button" class="ib-od-x" data-od-fs-close aria-label="Close">×</button>
      <div class="ib-od-stage">${stage}</div>
      <div class="ib-od-cap"><p>${esc(ep.t)}</p>${ads}</div></div>`;
  }

  function closeEpisodes() {
    const el = root.document && root.document.getElementById('ib-od-eps');
    if (el) el.remove();
    if (root.document) root.document.documentElement.classList.remove('ib-od-eps-on');
  }
  function closePlayer() {
    clearSkipTimer();
    try { if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy(); } catch (e) { }
    ytPlayer = null;
    const el = root.document && root.document.getElementById('ib-od-fs');
    if (el) {
      const v = el.querySelector('video');
      if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { } }
      el.remove();
    }
    if (root.document) root.document.documentElement.classList.remove('ib-od-fs-on');
  }
  function openEpisodes(id) {
    const s = showById(id);
    const doc = root.document;
    if (!s || !doc) return;
    closeEpisodes();
    closePlayer();
    doc.body.insertAdjacentHTML('beforeend', episodesHtml(s));
    doc.documentElement.classList.add('ib-od-eps-on');
  }
  let ytPlayer = null;
  let skipTimer = 0;
  function clearSkipTimer() {
    if (skipTimer) { try { clearTimeout(skipTimer); } catch (e) { } skipTimer = 0; }
  }
  function ensureYtApi(cb) {
    if (root.YT && root.YT.Player) { cb(); return; }
    const prev = root.onYouTubeIframeAPIReady;
    root.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') prev();
      cb();
    };
    const doc = root.document;
    if (doc && !doc.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = doc.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      (doc.head || doc.documentElement).appendChild(s);
    }
  }
  function bindYtPlayer(showId, ep) {
    if (!root.YT || !root.YT.Player || !root.document.getElementById('ib-od-yt')) return;
    try { if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy(); } catch (e) { }
    ytPlayer = null;
    try {
      ytPlayer = new root.YT.Player('ib-od-yt', {
        events: {
          onError: function (ev) {
            const code = ev && ev.data;
            if (code === 101 || code === 150 || code === 100) onUnavailable(showId, ep, code);
          }
        }
      });
    } catch (e) { }
  }
  function onUnavailable(showId, ep, code) {
    hideOnDevice(ep);
    const doc = root.document;
    const stage = doc && doc.querySelector('#ib-od-fs .ib-od-stage');
    if (!stage) return;
    const nxt = nextPlayable(showId, ep);
    const nextBtn = nxt ? '<button type="button" class="btn pri" data-od-play="' + esc(showId) + ':' + esc(nxt.id) + '">Play next episode</button>' : '';
    stage.innerHTML = '<div class="ib-od-unavail"><p>Not available in NZ</p>'
      + (nxt ? '<p class="ib-od-unavail-next">Playing the next episode…</p>' : '')
      + nextBtn + '</div>';
    const cap = doc.querySelector('#ib-od-fs .ib-od-cap p');
    if (cap) cap.textContent = (ep && ep.t ? ep.t + ' · ' : '') + 'Not available in NZ';
    // Refresh the episode list if it is still open, and drop empty shows from the page.
    const epsEl = doc.getElementById('ib-od-eps');
    if (epsEl) {
      const s = showById(showId);
      if (s && (s.episodes || []).some(allowedEpisode)) epsEl.outerHTML = episodesHtml(s);
      else closeEpisodes();
    }
    try { if (typeof drawPage === 'function') drawPage(); } catch (e) { }
    clearSkipTimer();
    if (nxt) skipTimer = setTimeout(function () { openPlayer(showId, nxt.id); }, 2200);
  }
  function openPlayer(showId, epId) {
    const s = showById(showId);
    const e = episodeOf(s, epId);
    const doc = root.document;
    const src = playerSrc(e, { autoplay: true, mute: false });
    if (!s || !e || !src || !doc) return;
    closePlayer();
    doc.body.insertAdjacentHTML('beforeend', playerHtml(s, e, { autoplay: true, mute: false }));
    doc.documentElement.classList.add('ib-od-fs-on');
    if (src.type === 'youtube') ensureYtApi(function () { bindYtPlayer(showId, e); });
  }

  function onClick(ev) {
    const t = ev.target && ev.target.closest && ev.target.closest('[data-od-fs-close], [data-od-eps-close], [data-od-play], [data-od-show]');
    if (!t) return;
    if (t.hasAttribute('data-od-fs-close')) { ev.preventDefault(); closePlayer(); return; }
    if (t.hasAttribute('data-od-eps-close')) { ev.preventDefault(); closeEpisodes(); return; }
    const play = t.getAttribute('data-od-play');
    if (play) {
      ev.preventDefault();
      ev.stopPropagation();
      const parts = play.split(':');
      openPlayer(parts[0], parts.slice(1).join(':'));
      return;
    }
    const sid = t.getAttribute('data-od-show');
    if (sid) { ev.preventDefault(); ev.stopPropagation(); openEpisodes(sid); }
  }

  const CSS = 'html.ib-od-eps-on,html.ib-od-fs-on{overflow:hidden}'
    + '.hscroll > .card.odshow .media img{aspect-ratio:2/3!important;object-fit:cover;background:#123}'
    + '#ib-od-eps{position:fixed;inset:0;z-index:20040;background:var(--bg,#f4f5f8);color:var(--ink,#14161b);display:flex;flex-direction:column}'
    + '#ib-od-eps .ib-od-epsbar{display:flex;align-items:flex-start;gap:12px;padding:max(12px,env(safe-area-inset-top)) 16px 12px;border-bottom:1px solid var(--line,#e7e8ee)}'
    + '#ib-od-eps .ib-od-epsbar h2{margin:0;font-size:1.15rem;font-weight:800;color:var(--hr-title,#1e3a8a)}'
    + '#ib-od-eps .ib-od-epsbar p{margin:2px 0 0;font-weight:700;color:var(--mute,#6b7280);font-size:.85rem}'
    + '#ib-od-eps .ib-od-epslist{overflow:auto;padding:8px 12px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px}'
    + '#ib-od-eps .ib-od-ep{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:14px 16px;border-radius:16px;background:var(--card,#fff);border:1px solid var(--line,#e7e8ee);font:inherit;color:inherit}'
    + '#ib-od-eps .ib-od-ep b{font-weight:800}#ib-od-eps .ib-od-ep small{color:var(--mute,#6b7280);font-weight:600}'
    + '#ib-od-fs{position:fixed;inset:0;z-index:20060;background:#0b0b0f;color:#fff;display:flex;flex-direction:column}'
    + '#ib-od-fs .ib-od-stage{flex:1;display:flex;align-items:center;justify-content:center;min-height:40vh;background:#000}'
    + '#ib-od-fs .ib-od-stage iframe,#ib-od-fs .ib-od-stage video{width:100%;height:100%;border:0;background:#000;object-fit:contain}'
    + '#ib-od-fs .ib-od-cap{padding:12px 16px calc(16px + env(safe-area-inset-bottom))}'
    + '#ib-od-fs .ib-od-cap p{margin:0 0 4px;font-weight:800}'
    + '#ib-od-fs .ib-od-ads{margin:0;font-weight:700;opacity:.8}'
    + '#ib-od-fs .ib-od-unavail{color:#fff;text-align:center;padding:24px;max-width:22rem}'
    + '#ib-od-fs .ib-od-unavail p{margin:0 0 12px;font-weight:800;font-size:1.15rem}'
    + '#ib-od-fs .ib-od-unavail .ib-od-unavail-next{font-weight:650;font-size:.95rem;opacity:.85}'
    + '#ib-od-fs .ib-od-unavail .btn{margin-top:8px}'
    + '.ib-od-x{position:absolute;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));z-index:2;width:44px;height:44px;border:0;border-radius:22px;background:rgba(255,255,255,.92);color:#111;font-size:28px;font-weight:800;line-height:1;cursor:pointer}'
    + '#ib-od-eps .ib-od-x{position:relative;top:0;right:0;flex:none}'
    + '.today-od-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
    + '.today-od-grid .card{margin:0}'
    + '.today-od-grid .card .media img{aspect-ratio:2/3;object-fit:cover;width:100%;display:block}'
    + '.today-od-grid .card .bd h3{font-size:1rem}'
    + '.today-od-grid .xHead,.today-od-grid .hd{display:none}';

  async function loadJson() {
    if (DATA) return DATA;
    try {
      const r = await fetch(JSON_URL, { cache: 'no-store' });
      if (r.ok) setData(await r.json());
    } catch (e) { }
    return DATA;
  }

  function pageHtml() {
    const items = visibleShows();
    const tiles = items.map(sh => showCard({ id: 'od-' + sh.id, x: 'odshow', show: sh, showId: sh.id })).join('');
    const empty = items.length ? '' : '<p class="lede">Shows will appear here once the catalogue has loaded.</p>';
    return '<div class="today-page today-od-page"><h1>On demand.</h1>'
      + '<p class="lede">Full episodes play in Info Book. YouTube ones may show ads. Public-domain classics play from Archive.org.</p>'
      + '<div class="today-od-grid">' + (tiles || empty) + '</div></div>';
  }
  function drawPage() {
    const m = root.document && (root.document.getElementById('feed') || root.document.querySelector('#feed'));
    if (!m) return;
    m.innerHTML = pageHtml();
  }

  root.ibOnDemand = {
    JSON_URL, OFFICIAL, setData, catalog, shows, showById, episodeOf,
    allowedShow, allowedEpisode, visibleShows, youtubeEmbedUrl, playerSrc,
    epLabel, showCard, rowItems, makeRow, insertRow, episodesHtml, playerHtml,
    openEpisodes, openPlayer, closeEpisodes, closePlayer, loadJson, pageHtml, drawPage,
    hideOnDevice, unhideOnDevice, isHiddenOnDevice, nextPlayable, HIDE_KEY
  };

  if (!root.document) return;

  const prevFestive = root.festive;
  root.festive = function (order, nPins) {
    order = prevFestive ? prevFestive(order, nPins) : order;
    return insertRow(order);
  };
  const prevCard = root.card;
  root.card = function (i) {
    if (i && i.x === 'odshow') return showCard(i);
    return prevCard ? prevCard(i) : '';
  };

  root.document.addEventListener('click', onClick, true);
  root.document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (root.document.getElementById('ib-od-fs')) { ev.preventDefault(); closePlayer(); }
    else if (root.document.getElementById('ib-od-eps')) { ev.preventDefault(); closeEpisodes(); }
  });
  const css = root.document.createElement('style');
  css.id = 'ib-ondemand-css';
  css.textContent = CSS;
  (root.document.head || root.document.documentElement).appendChild(css);

  function boot() {
    loadJson().then(function () {
      try { if (typeof draw === 'function') draw(); else if (typeof root.draw === 'function') root.draw(); } catch (e) { }
    });
  }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
