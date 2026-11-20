/* 1.9.171 Opening intro, once per app open (not on scroll or topic changes).
   Preview: the ring stage is replaced by the 3s infobook-intro-9f25b444 film.
   A crisp HTML “Info Book” wordmark (Fraunces 700, ink #1B1916) sits under the
   logo from about 2.4s. Muted, playsinline autoplay; tap to skip. If the film
   cannot play, the poster is shown, then we fade into the feed.
   Skipped only when the phone asks for less motion (logged with ?portaldebug=1),
   aside from a brief static poster + wordmark so the brand is still seen. */
(function (root) {
  const KEY = 'ibPortal';
  const MP4 = 'img/infobook-intro-9f25b444.mp4';
  const WEBM = 'img/infobook-intro-9f25b444.webm';
  const POSTER = 'img/infobook-intro-9f25b444-poster.jpg';
  const WORD_AT = 2.4;

  function reduced() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function debugging() {
    try { return /(?:\?|&)portaldebug=1(?:&|$)/.test((root.location && root.location.search) || ''); } catch (e) { return false; }
  }
  const debug = debugging();
  function dbg(kind, detail) {
    if (!debug) return;
    try {
      if (kind === 'finish') console.log('[portal] finish', detail == null ? '' : detail);
      else console.log('[portal] start', detail == null ? '' : detail);
    } catch (e) {}
  }
  root.ibPortal = { KEY, reduced, POSTER, MP4, WEBM };
  root.ibPortalRise = function () {};
  if (!root.document || !root.sessionStorage) return;

  try {
    if (root.sessionStorage.getItem(KEY) === '1') return;
    root.sessionStorage.setItem(KEY, '1');
  } catch (e) { return; }

  const doc = root.document;
  if (doc.getElementById('ibportal')) return;
  doc.documentElement.classList.add('portal-on');
  const el = doc.createElement('div');
  el.id = 'ibportal';
  el.className = 'ib-intro-film';
  el.setAttribute('aria-label', 'Info Book');
  el.innerHTML = '<video id="ib-intro-video" playsinline webkit-playsinline muted autoplay preload="auto" poster="' + POSTER + '">'
    + '<source src="' + WEBM + '" type="video/webm">'
    + '<source src="' + MP4 + '" type="video/mp4">'
    + '</video>'
    + '<img class="ib-intro-poster" src="' + POSTER + '" alt="" aria-hidden="true">'
    + '<p class="ib-intro-word" id="ib-intro-word">Info Book</p>'
    + '<button type="button" class="ib-intro-skip" id="ib-intro-skip">Skip</button>';
  (doc.body || doc.documentElement).append(el);

  const video = el.querySelector('video');
  const poster = el.querySelector('.ib-intro-poster');
  const word = el.querySelector('#ib-intro-word');
  let done = false, bye = 0, hard = 0, wordT = 0, failT = 0;

  function showWord() {
    if (word) word.classList.add('on');
  }
  function kill() {
    if (done) return;
    done = true;
    clearTimeout(bye);
    clearTimeout(hard);
    clearTimeout(wordT);
    clearTimeout(failT);
    doc.removeEventListener('pointerdown', skip, true);
    try { if (video) video.pause(); } catch (e) {}
    if (el.parentNode) el.remove();
    doc.documentElement.classList.remove('portal-on');
    doc.querySelectorAll('.portal-rise').forEach(n => {
      n.classList.add('portal-rose');
      n.classList.remove('portal-rise');
    });
    dbg('finish', { name: 'intro' });
  }
  function fade() {
    if (done || el.classList.contains('out')) return;
    showWord();
    el.classList.add('out');
    dbg('start', { name: 'portalFade' });
    el.addEventListener('animationend', ev => {
      if (ev.target !== el || !el.classList.contains('out')) return;
      if (ev.animationName && ev.animationName !== 'portalFade') return;
      dbg('finish', { name: 'portalFade' });
      clearTimeout(bye);
      kill();
    });
    bye = setTimeout(kill, 700);
  }
  function skip(ev) {
    if (done) return;
    if (ev && ev.target && ev.target.id === 'ib-intro-skip') ev.preventDefault();
    fade();
  }
  doc.addEventListener('pointerdown', skip, true);

  function armWord(from) {
    clearTimeout(wordT);
    const wait = Math.max(0, (WORD_AT - (from || 0)) * 1000);
    wordT = setTimeout(showWord, wait);
  }

  function usePosterThenFade(ms) {
    if (poster) poster.hidden = false;
    if (video) video.style.opacity = '0';
    showWord();
    clearTimeout(failT);
    failT = setTimeout(fade, ms == null ? 1500 : ms);
  }

  if (reduced()) {
    dbg('start', { skip: 'reduced-motion' });
    usePosterThenFade(1200);
    hard = setTimeout(() => { if (!done && el.isConnected) fade(); }, 2500);
    return;
  }

  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('autoplay', '');
    try { video.currentTime = 0; } catch (e) {}
    video.addEventListener('timeupdate', () => {
      if (video.currentTime >= WORD_AT) showWord();
    });
    video.addEventListener('playing', () => {
      if (poster) poster.hidden = true;
      armWord(video.currentTime || 0);
    });
    video.addEventListener('ended', fade);
    video.addEventListener('error', () => usePosterThenFade(1500));
    const start = video.play();
    if (start && start.catch) {
      start.catch(() => usePosterThenFade(1500));
    }
    armWord(0);
  } else {
    usePosterThenFade(1500);
  }
  hard = setTimeout(() => { if (!done && el.isConnected) fade(); }, 5000);
})(typeof window !== 'undefined' ? window : globalThis);
