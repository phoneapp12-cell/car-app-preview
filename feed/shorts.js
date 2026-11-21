/* Info Book Shorts — full-screen portrait clips from the Today tile.
   Preview only: direct MP4s from free stock hosts, no YouTube/TikTok/Instagram embeds. */
(() => {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const root = typeof window !== 'undefined' ? window : globalThis;
  const HOSTS = /(^|\.)((assets\.)?mixkit\.co|upload\.wikimedia\.org|videos\.pexels\.com|player\.vimeo\.com|cdn\.pixabay\.com)$/i;
  const EMBED_HOSTS = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com)$/i;
  const SPORT = /\b(sport|sports|rugby|soccer|football|nfl|nba|nhl|mlb|tennis|cricket|golf|hockey|all[-\s]?star|ovechkin|fifa|premier league|super rugby|formula\s?1|\bf1\b|world cup|match day|stadium)\b/i;
  const UNFRIENDLY = /\b(protest|smoking|cigarette|nude|nsfw|xxx|erotic)\b/i;

  /* Curated, already-probed portrait (720x1280) MP4s. Mixkit Stock Video Free License.
     Fireworks clips on Mixkit were landscape-only, so the portrait filter keeps them out. */
  const FALLBACK = [
    { id: 'mk-51500', title: 'Turquoise waves on the sand', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51500/51500-720.mp4' },
    { id: 'mk-1548', title: 'A dog panting in the sun', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1548/1548-720.mp4' },
    { id: 'mk-51791', title: 'Forest and mountains from the air', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51791/51791-720.mp4' },
    { id: 'mk-10428', title: 'Pouring a glass of orange juice', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/10428/10428-720.mp4' },
    { id: 'mk-1545', title: 'White cat with blue eyes', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1545/1545-720.mp4' },
    { id: 'mk-51502', title: 'Waves on a rocky coast', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51502/51502-720.mp4' },
    { id: 'mk-12171', title: 'Parmesan over spaghetti', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/12171/12171-720.mp4' },
    { id: 'mk-1487', title: 'A red frog on a log', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1487/1487-720.mp4' },
    { id: 'mk-40657', title: 'A meadow in the sun', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/40657/40657-720.mp4' },
    { id: 'mk-1197', title: 'Seagulls on a wooden pier', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1197/1197-720.mp4' },
    { id: 'mk-1186', title: 'Small pink flowers', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1186/1186-720.mp4' },
    { id: 'mk-26094', title: 'Cutting a sandwich', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/26094/26094-720.mp4' },
    { id: 'mk-51501', title: 'Flying over a mangrove swamp', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51501/51501-720.mp4' },
    { id: 'mk-1541', title: 'A black cat in its house', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1541/1541-720.mp4' },
    { id: 'mk-1164', title: 'Waves in the water', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1164/1164-720.mp4' }
  ];

  function isPortrait(width, height) {
    const w = +width, h = +height;
    return w > 0 && h > 0 && w < h;
  }
  function isAllowedTopic(text) {
    const s = String(text || '');
    return !SPORT.test(s) && !UNFRIENDLY.test(s);
  }
  function isDirectVideo(url) {
    if (!url) return false;
    let u;
    try { u = new URL(url, 'https://example.invalid'); } catch (e) { return false; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = String(u.hostname || '').replace(/^www\./, '');
    if (EMBED_HOSTS.test(host)) return false;
    if (/\.(mp4|webm|mov)(\?|$)/i.test(u.pathname)) return true;
    return HOSTS.test(host);
  }
  function filterPortrait(items) {
    return (items || []).filter(it => it && isDirectVideo(it.url) && isPortrait(it.width, it.height) && isAllowedTopic((it.title || '') + ' ' + (it.credit || '')));
  }

  function commonsSrc(info) {
    const derivs = (info && info.derivatives) || [];
    const pick = derivs.find(d => /720p.*mp4|1080p.*mp4|mp4/i.test((d.transcodekey || '') + ' ' + (d.type || '') + ' ' + (d.src || '')) && isPortrait(d.width, d.height))
      || derivs.find(d => /720p|1080p|480p/i.test(d.transcodekey || '') && isPortrait(d.width, d.height) && d.src)
      || null;
    if (pick && pick.src) return { url: pick.src, width: pick.width, height: pick.height };
    if (info && isPortrait(info.width, info.height) && info.url && isDirectVideo(info.url) && (info.size || 0) < 12e6) {
      return { url: info.url, width: info.width, height: info.height };
    }
    return null;
  }

  async function fetchCommons() {
    const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*'
      + '&generator=categorymembers&gcmtitle=Category:Vertical_videos&gcmnamespace=6&gcmlimit=40'
      + '&prop=videoinfo&viprop=url|size|dimensions|mediatype|derivatives|extmetadata'
      + '&viextmetadatafilter=LicenseShortName|Artist|ObjectName';
    const res = await fetch(api);
    if (!res.ok) throw new Error('commons ' + res.status);
    const data = await res.json();
    const pages = Object.values((data.query && data.query.pages) || {});
    const out = [];
    for (const p of pages) {
      const info = ((p.videoinfo || p.imageinfo) || [])[0] || {};
      const meta = info.extmetadata || {};
      const val = k => { const v = meta[k]; return (v && v.value) ? String(v.value).replace(/<[^>]+>/g, '') : ''; };
      const title = val('ObjectName') || String(p.title || '').replace(/^File:/, '').replace(/\.(webm|mp4|ogv)$/i, '');
      if (!isAllowedTopic(title)) continue;
      const src = commonsSrc(info);
      if (!src) continue;
      out.push({
        id: 'cm-' + (p.pageid || title),
        title: title,
        credit: (val('Artist') || 'Wikimedia Commons').slice(0, 80),
        license: val('LicenseShortName') || 'Commons',
        width: src.width,
        height: src.height,
        url: src.url
      });
    }
    return filterPortrait(out);
  }

  async function loadCatalog() {
    const base = filterPortrait(FALLBACK);
    try {
      const extra = await Promise.race([
        fetchCommons(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2200))
      ]);
      const seen = new Set(base.map(x => x.url));
      for (const it of extra || []) {
        if (!seen.has(it.url)) { seen.add(it.url); base.push(it); }
      }
    } catch (e) { /* curated list is enough */ }
    return base;
  }

  let on = false, hist = false, muted = true, catalog = [], io = null, reel = null, shell = null;

  function capText(it) {
    const bits = [it.title, it.credit, it.license].filter(Boolean);
    return bits.join(' · ');
  }

  function ensureShell() {
    let el = $('#ib-shorts');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'ib-shorts';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Shorts');
    el.innerHTML = `<button type="button" class="sh-close" data-sh-close aria-label="Close">×</button>
      <button type="button" class="sh-mute" data-sh-mute aria-label="Sound"></button>
      <div class="sh-reel" data-sh-reel></div>`;
    document.body.appendChild(el);
    return el;
  }

  function slides() { return reel ? [...reel.querySelectorAll('.sh-slide')] : []; }

  function visibleIndex() {
    if (!reel) return 0;
    const mid = reel.scrollTop + reel.clientHeight * 0.5;
    let best = 0, dist = Infinity;
    slides().forEach((s, i) => {
      const top = s.offsetTop, d = Math.abs(top + s.offsetHeight * 0.5 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }

  function paintMute() {
    const btn = shell && shell.querySelector('[data-sh-mute]');
    if (!btn) return;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }

  function attachSrc(video, url) {
    if (!video || !url) return;
    if (video.getAttribute('data-loaded') === url) return;
    video.setAttribute('data-loaded', url);
    video.src = url;
  }

  function applyPreload(i) {
    slides().forEach((s, j) => {
      const v = s.querySelector('video');
      const it = catalog[j];
      if (!v || !it) return;
      const near = j === i || j === i + 1 || j === i - 1;
      if (near) {
        attachSrc(v, it.url);
        v.preload = (j === i || j === i + 1) ? 'auto' : 'metadata';
      } else {
        v.preload = 'none';
        if (!v.paused) try { v.pause(); } catch (e) { }
        if (v.getAttribute('data-loaded')) {
          v.removeAttribute('data-loaded');
          v.removeAttribute('src');
          try { v.load(); } catch (e) { }
        }
      }
    });
  }

  function playAt(i) {
    slides().forEach((s, j) => {
      const v = s.querySelector('video');
      if (!v) return;
      s.classList.toggle('on', j === i);
      if (j === i) {
        v.muted = muted;
        v.loop = true;
        const go = v.play();
        if (go && go.catch) {
          go.catch(() => {
            muted = true;
            v.muted = true;
            paintMute();
            v.play().catch(() => { });
          });
        }
      } else {
        try { v.pause(); } catch (e) { }
      }
    });
    applyPreload(i);
  }

  function onMeta(ev) {
    const v = ev.target;
    if (!isPortrait(v.videoWidth, v.videoHeight)) {
      const slide = v.closest('.sh-slide');
      if (!slide) return;
      const i = slides().indexOf(slide);
      slide.remove();
      catalog.splice(i, 1);
      if (on) playAt(Math.min(visibleIndex(), Math.max(0, catalog.length - 1)));
    }
  }

  function renderReel(items) {
    catalog = items.slice();
    reel.innerHTML = catalog.map((it, i) =>
      `<section class="sh-slide" data-sh-i="${i}" data-sh-id="${String(it.id || i).replace(/"/g, '')}">
        <video playsinline webkit-playsinline loop muted preload="${i <= 1 ? 'auto' : 'none'}"></video>
        <div class="sh-cap">${escapeHtml(capText(it))}</div>
        <div class="sh-paused" hidden>▶</div>
      </section>`
    ).join('');
    slides().forEach((s, i) => {
      const v = s.querySelector('video');
      v.loop = true;
      v.muted = muted;
      v.playsInline = true;
      v.addEventListener('loadedmetadata', onMeta);
      if (i <= 1) attachSrc(v, catalog[i].url);
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function watchVisible() {
    if (io) { try { io.disconnect(); } catch (e) { } io = null; }
    if (!('IntersectionObserver' in root)) {
      reel.addEventListener('scroll', onScroll, { passive: true });
      playAt(0);
      return;
    }
    io = new IntersectionObserver(entries => {
      const onScreen = entries.filter(e => e.isIntersecting && e.intersectionRatio >= 0.65)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!onScreen) return;
      const i = slides().indexOf(onScreen.target);
      if (i >= 0) playAt(i);
    }, { root: reel, threshold: [0.65, 0.9] });
    slides().forEach(s => io.observe(s));
    playAt(0);
  }

  function onScroll() {
    if (!on) return;
    playAt(visibleIndex());
  }

  function togglePause(slide) {
    const v = slide && slide.querySelector('video');
    if (!v) return;
    const mark = slide.querySelector('.sh-paused');
    if (v.paused) {
      v.play().catch(() => { });
      if (mark) mark.hidden = true;
    } else {
      v.pause();
      if (mark) mark.hidden = false;
    }
  }

  function open() {
    shell = ensureShell();
    reel = shell.querySelector('[data-sh-reel]');
    shell.hidden = false;
    on = true;
    muted = true;
    document.documentElement.classList.add('ib-shorts-on');
    try { document.documentElement.classList.remove('portal-on'); } catch (e) { }
    paintMute();
    if (!hist) {
      try { root.history.pushState({ ibShorts: 1 }, ''); hist = true; } catch (e) { hist = false; }
    }
    const start = items => {
      if (!on) return;
      if (!items.length) {
        reel.innerHTML = `<p class="sh-empty">No portrait clips could be loaded just now.</p>`;
        return;
      }
      renderReel(items);
      reel.scrollTop = 0;
      watchVisible();
    };
    /* Curated portrait MP4s only — live Commons enrichment can include off-topic clips, so the player stays on the probed fallback list. */
    start(filterPortrait(FALLBACK));
  }

  function close(fromPop) {
    if (!on) return;
    on = false;
    document.documentElement.classList.remove('ib-shorts-on');
    if (io) { try { io.disconnect(); } catch (e) { } io = null; }
    slides().forEach(s => {
      const v = s.querySelector('video');
      if (!v) return;
      try { v.pause(); } catch (e) { }
      v.removeAttribute('src');
      try { v.load(); } catch (e) { }
    });
    if (shell) shell.hidden = true;
    if (hist && !fromPop) {
      hist = false;
      try { if (root.history.state && root.history.state.ibShorts) root.history.back(); } catch (e) { }
    }
    hist = false;
  }

  function onClick(e) {
    const t = e.target;
    if (!on || !shell) return;
    if (t.closest && t.closest('[data-sh-close]')) { e.preventDefault(); close(); return; }
    if (t.closest && t.closest('[data-sh-mute]')) {
      e.preventDefault();
      muted = !muted;
      const v = slides()[visibleIndex()] && slides()[visibleIndex()].querySelector('video');
      if (v) {
        v.muted = muted;
        if (!muted) v.play().catch(() => { muted = true; v.muted = true; paintMute(); });
      }
      paintMute();
      return;
    }
    const slide = t.closest && t.closest('.sh-slide');
    if (slide) { e.preventDefault(); togglePause(slide); }
  }

  if (root.addEventListener) {
    root.addEventListener('click', onClick);
    root.addEventListener('popstate', () => { if (on) { hist = false; close(true); } });
    root.addEventListener('keydown', e => { if (on && e.key === 'Escape') close(); });
  }

  root.ibShortsOpen = open;
  root.ibShortsClose = close;
  root.ibShorts = {
    isPortrait, isAllowedTopic, isDirectVideo, filterPortrait, commonsSrc,
    FALLBACK, SPORT, HOSTS, open, close, loadCatalog
  };
})();
