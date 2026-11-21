/* Sugar Rush open intro assets and playback.
   Play starts unmuted inside the same user gesture as "Play Sugar Rush".
   If play() with sound is rejected, fall back to muted and unmute on the first touch.
   Every fresh open plays the ~23s film (5dab8424). Resume plays no intro.
   The film is lazy-loaded and is not service-worker precached. song stays empty:
   audio is already in the video. */
(function (root) {
  const INTRO = {
    poster: 'img/sugar-rush/sugar-rush-intro-long-5dab8424-poster.jpg',
    webm: 'img/sugar-rush/sugar-rush-intro-long-5dab8424.webm',
    mp4: 'img/sugar-rush/sugar-rush-intro-long-5dab8424.mp4',
    song: '',
    songMp3: '',
    videoHasAudio: true
  };
  root.SUGAR_INTRO = INTRO;

  const SHOP_INTRO = {
    poster: 'img/sugar-rush/sweet-shop-rush-intro-9030f05b-poster.jpg',
    webm: 'img/sugar-rush/sweet-shop-rush-intro-9030f05b.webm',
    mp4: 'img/sugar-rush/sweet-shop-rush-intro-9030f05b.mp4',
    song: '',
    songMp3: '',
    videoHasAudio: true
  };
  root.SUGAR_SHOP_INTRO = SHOP_INTRO;

  const MARKET_INTRO = {
    poster: 'img/sugar-rush/island-night-market-intro-9a01c1f8-poster.jpg',
    webm: 'img/sugar-rush/island-night-market-intro-9a01c1f8.webm',
    mp4: 'img/sugar-rush/island-night-market-intro-9a01c1f8.mp4',
    song: '',
    songMp3: '',
    videoHasAudio: true
  };
  root.SUGAR_MARKET_INTRO = MARKET_INTRO;

  const LEAVE_NZ_INTRO = {
    poster: 'img/sugar-rush/leaving-nz-intro-8b496564-poster.jpg',
    webm: 'img/sugar-rush/leaving-nz-intro-8b496564.webm',
    mp4: 'img/sugar-rush/leaving-nz-intro-8b496564.mp4',
    song: '',
    songMp3: '',
    videoHasAudio: true
  };
  root.SUGAR_LEAVE_NZ_INTRO = LEAVE_NZ_INTRO;


  function pickIntro() {
    return {
      useLong: true,
      poster: INTRO.poster,
      webm: INTRO.webm,
      mp4: INTRO.mp4,
      song: INTRO.song,
      songMp3: INTRO.songMp3,
      videoHasAudio: !!INTRO.videoHasAudio
    };
  }
  root.sugarIntroPick = pickIntro;

  const STYLE_ID = 'sr-intro-style';
  const CSS = '#sr-open-intro{position:fixed;inset:0;z-index:20000;background:#16010c;display:flex;align-items:center;justify-content:center;color:#fff}'
    + '#sr-open-intro[hidden]{display:none!important}'
    + '#sr-open-intro.fade{opacity:0;transition:opacity .4s ease;pointer-events:none}'
    + '#sr-open-intro video,#sr-open-intro .sr-intro-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#16010c}'
    + '#sr-intro-skip{position:absolute;top:max(12px,env(safe-area-inset-top,0px));right:max(12px,env(safe-area-inset-right,0px));z-index:2;min-height:44px;min-width:72px;padding:8px 16px;border:0;border-radius:22px;background:rgba(255,255,255,.92);color:#111;font-weight:800;font-size:16px;cursor:pointer}'
    + '#sr-open-intro audio{display:none}';

  function ensureStyle(doc) {
    if (!doc || doc.getElementById(STYLE_ID)) return;
    const s = doc.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  function fillSources(video, songEl, pick) {
    if (video) {
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('preload', 'auto');
      video.playsInline = true;
      video.poster = pick.poster || '';
      video.innerHTML = (pick.webm ? '<source src="' + pick.webm + '" type="video/webm">' : '')
        + (pick.mp4 ? '<source src="' + pick.mp4 + '" type="video/mp4">' : '');
      try { video.load(); } catch (e) { }
    }
    if (songEl) {
      const src = (pick.song || '') + '|' + (pick.songMp3 || '');
      if (songEl.getAttribute('data-src') !== src) {
        songEl.setAttribute('data-src', src);
        songEl.innerHTML = (pick.song ? '<source src="' + pick.song + '" type="audio/mp4">' : '')
          + (pick.songMp3 ? '<source src="' + pick.songMp3 + '" type="audio/mpeg">' : '');
        if (!pick.song && !pick.songMp3) songEl.removeAttribute('src');
        try { songEl.load(); } catch (e) { }
      }
    }
  }

  function ensureOverlay(doc, host) {
    let el = doc.getElementById('sr-open-intro');
    if (!el) {
      el = doc.createElement('div');
      el.id = 'sr-open-intro';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Sugar Rush intro');
      el.innerHTML = '<video id="sr-intro-video" playsinline webkit-playsinline preload="auto"></video>'
        + '<img class="sr-intro-poster" alt="" aria-hidden="true">'
        + '<button type="button" id="sr-intro-skip">Skip</button>'
        + '<audio id="sr-intro-song" preload="auto"></audio>';
      (host || doc.body || doc.documentElement).appendChild(el);
    }
    return el;
  }

  function startUnmuted(media) {
    if (!media) return Promise.resolve();
    media.muted = false;
    media.defaultMuted = false;
    media.volume = 1;
    try { media.removeAttribute('muted'); } catch (e) { }
    const p = media.play();
    return p && p.catch ? p : Promise.resolve();
  }
  function startMuted(media) {
    if (!media) return Promise.resolve();
    media.muted = true;
    const p = media.play();
    return p && p.catch ? p.catch(function () { }) : Promise.resolve();
  }
  function armUnmute(doc, items) {
    function go() {
      items.forEach(function (m) {
        if (!m) return;
        m.muted = false;
        m.defaultMuted = false;
        m.volume = 1;
        if (m.paused) m.play().catch(function () { });
      });
      doc.removeEventListener('pointerdown', go, true);
      doc.removeEventListener('touchstart', go, true);
      doc.removeEventListener('click', go, true);
      doc.removeEventListener('keydown', go, true);
    }
    doc.addEventListener('pointerdown', go, true);
    doc.addEventListener('touchstart', go, { capture: true, passive: true });
    doc.addEventListener('click', go, true);
    doc.addEventListener('keydown', go, true);
  }
  function tryUnmuted(media) {
    return startUnmuted(media).then(function () { return true; }).catch(function () { return false; });
  }

  root.playSugarIntro = function (opts) {
    opts = opts || {};
    const doc = opts.doc || root.document;
    if (!doc) { if (opts.onDone) opts.onDone(); return { started: false }; }
    const pick = (opts && opts.pick) || pickIntro();
    ensureStyle(doc);
    const overlay = ensureOverlay(doc, opts.host);
    if (opts.label) overlay.setAttribute('aria-label', opts.label);
    const video = overlay.querySelector('video');
    const songEl = overlay.querySelector('audio');
    const poster = overlay.querySelector('.sr-intro-poster');
    const skip = overlay.querySelector('#sr-intro-skip');
    fillSources(video, songEl, pick);
    if (poster) {
      poster.src = pick.poster || '';
      poster.hidden = !pick.poster;
    }
    overlay.hidden = false;
    overlay.classList.remove('fade');
    try { video.pause(); video.currentTime = 0; } catch (e) { }
    try { if (songEl) { songEl.pause(); songEl.currentTime = 0; } } catch (e) { }

    const useSong = !!( (pick.song || pick.songMp3) && songEl && !pick.videoHasAudio );
    let done = false;
    let safety = 0;
    function finish() {
      if (done) return;
      done = true;
      if (safety) try { root.clearTimeout(safety); } catch (e) { }
      overlay.classList.add('fade');
      try { video.pause(); } catch (e) { }
      try { if (songEl) songEl.pause(); } catch (e) { }
      try {
        root.setTimeout(function () {
          overlay.hidden = true;
          overlay.classList.remove('fade');
        }, 420);
      } catch (e) {
        overlay.hidden = true;
      }
      if (opts.onDone) opts.onDone();
    }

    video.onended = finish;
    video.onplaying = function () {
      if (poster) poster.hidden = true;
      if (safety) try { root.clearTimeout(safety); } catch (e) { }
      const left = Math.max(2000, ((video.duration || 23) * 1000) + 2500);
      safety = root.setTimeout(finish, left);
    };
    video.onerror = function () {
      if (poster) poster.hidden = false;
      if (safety) try { root.clearTimeout(safety); } catch (e) { }
      safety = root.setTimeout(finish, pick.poster ? 1200 : 0);
    };
    if (skip) skip.onclick = function (e) { if (e) { e.preventDefault(); e.stopPropagation(); } finish(); };
    overlay.onclick = function (e) {
      if (e && e.target && (e.target.id === 'sr-intro-skip' || (e.target.closest && e.target.closest('#sr-intro-skip')))) return;
      finish();
    };

    // ~23s film; wait long enough for it to end itself.
    safety = root.setTimeout(finish, 40000);

    const tasks = [tryUnmuted(video)];
    if (useSong) tasks.push(tryUnmuted(songEl));
    Promise.all(tasks).then(function (oks) {
      if (done) return;
      const ok = oks.every(Boolean) && video && !video.paused && !video.muted && (!useSong || (songEl && !songEl.muted && !songEl.paused));
      if (ok) return;
      startMuted(video);
      if (useSong) startMuted(songEl);
      armUnmute(doc, useSong ? [video, songEl] : [video]);
    });

    return { started: true, finish: finish, pick: pick };
  };
})(typeof window !== 'undefined' ? window : this);
