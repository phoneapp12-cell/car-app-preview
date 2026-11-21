/* Info Book 1.9.286 — Today magazine chrome: hero, tab bar, People/Games/You,
   magazine side menu, and TikTok-style double-tap heart on feed cards.
   Keeps existing features and friend/family privacy rules. */
(() => {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  document.documentElement.classList.add('today-look');

  /* ---- default to the light magazine look once (old forced-dark default) ---- */
  try {
    if (typeof ls !== 'undefined' && typeof APPEAR !== 'undefined' && !ls.get('ibLook286', 0)) {
      ls.set('ibLook286', 1);
      if (APPEAR === 'dark') { APPEAR = 'light'; ls.set('appear', 'light'); if (typeof applyAppear === 'function') applyAppear(); }
    }
  } catch (e) { }

  /* ---- NZ clock (Pacific/Auckland) ---- */
  function nzParts(d = new Date()) {
    const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hourCycle: 'h23', weekday: 'long', day: 'numeric', month: 'long' }).formatToParts(d);
    const get = t => (parts.find(p => p.type === t) || {}).value || '';
    const h = +get('hour');
    const when = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
    const kicker = when === 'night' ? 'Tonight in Onerahi' : 'This ' + when + ' in Onerahi';
    return { h, when, kicker, weekday: get('weekday'), date: get('day') + ' ' + get('month') };
  }
  function wxLabel(code) {
    if (code == null || code === '') return { em: '⛅', name: 'Looking up the weather' };
    const c = +code;
    if (c >= 95) return { em: '⛈️', name: 'Thunderstorms' };
    if (c >= 80) return { em: '🌦️', name: 'Showers' };
    if (c >= 71) return { em: '❄️', name: 'Snow' };
    if (c >= 66) return { em: '🌧️', name: 'Freezing rain' };
    if (c >= 61) return { em: '🌧️', name: 'Rain' };
    if (c >= 51) return { em: '🌦️', name: 'Drizzle' };
    if (c >= 45) return { em: '🌫️', name: 'Fog' };
    if (c === 3) return { em: '☁️', name: 'Cloudy' };
    if (c === 2) return { em: '⛅', name: 'Partly cloudy' };
    return { em: '☀️', name: c === 1 ? 'Mainly sunny' : 'Mostly sunny' };
  }
  function wxNow() {
    try { if (typeof wxCurrent === 'function') { const c = wxCurrent(); if (c) return c; } } catch (e) { }
    try { const o = JSON.parse(localStorage.getItem('fxWx') || 'null'); if (o && o.w && Date.now() - o.t < 3 * 36e5) return o.w; } catch (e) { }
    return null;
  }

  /* ---- tiles: birthday (family only), trivia, streak ---- */
  function nextBirthday() {
    if (typeof FAM_ON === 'undefined' || !FAM_ON) return null;
    if (typeof IS_FRIEND !== 'undefined' && IS_FRIEND) return null; // never show family birthdays to friends
    const list = (typeof X !== 'undefined' && X.dates) ? X.dates : [];
    const b = list.filter(d => d && d.kind === 'bday' && d.days != null && d.days >= 0).sort((a, b) => a.days - b.days)[0];
    return b || null;
  }
  function triviaTile() {
    const t = (typeof X !== 'undefined') ? X.triv : null;
    if (!t) return { em: '❓', title: 'Today’s trivia', sub: 'Five questions a day', go: 'trivia' };
    const m = t.mine;
    return { em: '❓', title: 'Today’s trivia', sub: m ? 'You got ' + m.score + '/5' : 'Ready to play', go: 'trivia' };
  }
  function streakTile() {
    const s = (typeof X !== 'undefined' && X.st) ? X.st : null;
    if (s && s.cur) return { em: '🔥', title: s.cur + '-day streak', sub: s.best ? 'Best ' + s.best + ' days' : 'Keep it going', go: 'streak' };
    return { em: '🔥', title: 'Your streak', sub: 'Open tomorrow to start', go: 'streak' };
  }

  function sugarLevel() {
    try {
      const p = JSON.parse(localStorage.getItem('ib-sugar-progress') || 'null');
      if (p && p.open) return +p.open;
    } catch (e) { }
    return 1;
  }


  function isoDate(d = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
    const get = typ => (parts.find(x => x.type === typ) || {}).value || '';
    return get('year') + '-' + get('month') + '-' + get('day');
  }
  function daysUntil(dateStr, todayStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return NaN;
    const a = Date.parse(dateStr + 'T00:00:00Z'), b = Date.parse((todayStr || isoDate()) + 'T00:00:00Z');
    return Math.round((a - b) / 86400000);
  }
  function fmtTime(t) {
    const m = /^(\d{2}):(\d{2})$/.exec(t || '');
    if (!m) return t || '';
    let h = +m[1]; const min = m[2], ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return (min === '00' ? String(h) : h + ':' + min) + ' ' + ap;
  }
  function calWhen(days, time) {
    const w = (typeof inDays === 'function') ? inDays(days)
      : days === 0 ? 'today' : days === 1 ? 'tomorrow' : days < 0 ? '' : 'in ' + days + ' days';
    if (!w) return '';
    const clock = fmtTime(time);
    return clock ? w + ' · ' + clock : w;
  }
  function calIcon(kind) {
    return kind === 'bday' ? '🎂' : kind === 'tv' ? '📺' : kind === 'movie' ? '🎬' : kind === 'event' ? '🎉' : '📅';
  }
  /* Upcoming preview for the side menu: personal calendar entries, plus family
     birthdays/events for family members only (friends never see those). */
  function calPreview(dates, calList, friend, todayStr) {
    const today = todayStr || isoDate();
    const out = [];
    if (!friend && Array.isArray(dates)) {
      for (const d of dates) {
        if (!d || d.days == null || d.days < 0) continue;
        const title = String(d.title || (d.kind === 'bday' ? 'Birthday' : 'Event')).trim();
        if (!title) continue;
        out.push({ days: +d.days, title, icon: calIcon(d.kind === 'bday' ? 'bday' : 'event'), when: calWhen(+d.days), src: 'family' });
      }
    }
    if (Array.isArray(calList)) {
      for (const e of calList) {
        if (!e || !e.date) continue;
        const days = daysUntil(e.date, today);
        if (!(days >= 0)) continue;
        const title = String(e.title || '').trim();
        if (!title) continue;
        out.push({ days, title, icon: calIcon(e.kind || 'own'), when: calWhen(days, e.time), src: 'cal' });
      }
    }
    out.sort((a, b) => a.days - b.days || a.title.localeCompare(b.title));
    return out.slice(0, 2);
  }
  function liveCalPreview() {
    const friend = typeof IS_FRIEND !== 'undefined' && IS_FRIEND;
    const dates = (typeof X !== 'undefined' && X.dates) ? X.dates : [];
    let calList = [];
    try { if (typeof ibCal !== 'undefined' && ibCal && typeof ibCal.load === 'function') calList = ibCal.load(); } catch (e) { }
    return calPreview(dates, calList, friend);
  }

  /* ---- Hero + composer on Today ---- */
  function heroHtml() {
    const nz = nzParts();
    const w = wxNow();
    const lab = wxLabel(w && (w.weather_code != null ? w.weather_code : w.weathercode));
    const temp = w && w.temperature_2m != null ? Math.round(w.temperature_2m) : null;
    const wind = w && w.wind_speed_10m != null ? Math.round(w.wind_speed_10m) : null;
    const windTxt = wind == null ? '' : wind < 15 ? 'light breeze' : wind + ' km/h wind';
    const wxSub = [windTxt, 'Onerahi'].filter(Boolean).join(' · ');
    const bd = nextBirthday();
    const bdTitle = bd ? (bd.title || 'Birthday').replace(/^🎂\s*/, '') : (typeof IS_FRIEND !== 'undefined' && IS_FRIEND ? 'Friends' : 'Birthdays');
    const bdSub = bd ? (typeof inDays === 'function' ? inDays(bd.days) : (bd.days === 0 ? 'today' : 'in ' + bd.days + ' days')) : (typeof IS_FRIEND !== 'undefined' && IS_FRIEND ? 'Your circle' : 'None coming up');
    const tr = triviaTile(), st = streakTile();
    return `<section class="today-hero" id="today-hero">
      <div class="kicker">${esc(nz.kicker)}</div>
      <h1>${esc(nz.weekday)}<small>${esc(nz.date)}</small></h1>
      <div class="today-wx"><div class="deg">${temp != null ? temp + '°' : '—'}</div>
        <div class="wxmeta"><b>${lab.em} ${esc(lab.name)}</b><small>${temp != null ? esc(wxSub) : 'Onerahi · Whangārei'}</small></div></div>
      <div class="today-bits">
        <button type="button" class="today-bit" data-today-bit="${bd ? 'bday' : 'people'}"><em>🎂</em><b>${esc(bdTitle)}</b><small>${esc(bdSub)}</small></button>
        <button type="button" class="today-bit" data-today-bit="${tr.go}"><em>${tr.em}</em><b>${esc(tr.title)}</b><small>${esc(tr.sub)}</small></button>
        <button type="button" class="today-bit" data-today-bit="${st.go}"><em>${st.em}</em><b>${esc(st.title)}</b><small>${esc(st.sub)}</small></button>
      </div>
    </section>
    ${typeof FAM_ON !== 'undefined' && FAM_ON ? `<div class="today-composer">
      <button type="button" data-upload>📷 Photo</button>
      <button type="button" data-sharelink>🔗 Link</button>
      <button type="button" data-sharetext>✏️ Write a post</button>
    </div>` : ''}
    <div class="today-sec"><h2>The feed</h2><span>${typeof IS_FRIEND !== 'undefined' && IS_FRIEND ? 'Your circle first' : 'Family first'}</span></div>`;
  }

  function injectHero() {
    const feed = $('#feed'); if (!feed) return;
    $('#today-hero-wrap')?.remove();
    if (typeof tab !== 'undefined' && tab !== 'all') return;
    const wrap = document.createElement('div'); wrap.id = 'today-hero-wrap'; wrap.innerHTML = heroHtml();
    feed.insertBefore(wrap, feed.firstChild);
    try { if (typeof wxFetchNow === 'function') wxFetchNow(); } catch (e) { }
    injectCeleb();
  }

  function celebCardHtml() {
    return `<section class="today-celeb" id="today-celeb">
      <p class="kicker">A question for you</p>
      <h2>Would you like celebrity &amp; reality TV news in your feed?</h2>
      <p>Things like the Kardashians, Love Island and Real Housewives — from NZ Herald Entertainment, Now to Love, E! News and Us Weekly. Sport is never included. You can change this later in Settings.</p>
      <div class="today-celeb-actions">
        <button type="button" class="btn pri" data-celeb="yes">Yes please</button>
        <button type="button" class="btn" data-celeb="no">No thanks</button>
      </div>
    </section>`;
  }

  function injectCeleb() {
    $('#today-celeb')?.remove();
    const ask = typeof CELEB !== 'undefined' && CELEB.ask && typeof tab !== 'undefined' && tab === 'all';
    if (!ask) return;
    const hero = $('#today-hero-wrap');
    const el = document.createElement('div'); el.innerHTML = celebCardHtml();
    const card = el.firstElementChild;
    if (hero && hero.parentNode) hero.after(card);
    else { const feed = $('#feed'); if (feed) feed.insertBefore(card, feed.firstChild); }
  }

  /* ---- Tab bar ---- */
  function paintTabs() {
    let nav = $('#ib-tabs');
    if (!nav) {
      nav = document.createElement('nav'); nav.id = 'ib-tabs'; nav.className = 'ib-tabs'; nav.setAttribute('aria-label', 'Main');
      document.body.append(nav);
    }
    const t = typeof tab !== 'undefined' ? tab : 'all';
    const on = k => t === k || (k === 'all' && t === 'all') ? ' on' : '';
    nav.innerHTML = `
      <button type="button" class="${on('all')}" data-tab="all"><span class="ic">▦</span>Today</button>
      <button type="button" class="${on('people')}" data-tab="people"><span class="ic">☺</span>People</button>
      <button type="button" class="${on('games')}" data-tab="games"><span class="ic">✦</span>Games</button>
      <button type="button" class="${on('you')}" data-tab="you"><span class="ic">◉</span>You</button>`;
    document.documentElement.classList.toggle('ib-tab-all', t === 'all');
    document.documentElement.classList.toggle('ib-tab-family', t === 'family');
    document.documentElement.classList.toggle('ib-tab-people', t === 'people');
    document.documentElement.classList.toggle('ib-tab-games', t === 'games');
    document.documentElement.classList.toggle('ib-tab-you', t === 'you');
  }

  /* ---- People / Games / You ---- */
  const AV_COL = ['#2A6F6F', '#8B2E2E', '#3F6E55', '#2E5270', '#A97820', '#6B3A8A'];
  function avHtml(name, i) {
    const n = String(name || '?').trim();
    const parts = n.split(/\s+/);
    const letters = ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : (parts[0] || '  ')[1] || '')).toUpperCase();
    const col = AV_COL[(n.charCodeAt(0) + (i || 0)) % AV_COL.length];
    return `<div class="av" style="background:${col}">${esc(letters)}</div>`;
  }
  function drawPeoplePage() {
    const m = $('#feed'); if (!m) return;
    const friend = typeof IS_FRIEND !== 'undefined' && IS_FRIEND;
    m.innerHTML = `<div class="today-page" id="today-people"><h1>${friend ? 'Your circle.' : 'The family.'}</h1>
      <p class="lede">${friend ? 'People in your friends circle, and when they last opened Info Book.' : 'When each person last opened Info Book.'}</p>
      <div id="today-plist">Loading…</div></div>`;
    paintPeopleList();
  }
  async function paintPeopleList() {
    const el = $('#today-plist'); if (!el) return;
    const friend = typeof IS_FRIEND !== 'undefined' && IS_FRIEND;
    try {
      if (friend) {
        const r = await fam('/friends');
        const rows = [];
        if (r.host) rows.push({ name: r.host.name || 'Your host', seen: r.host.seen, sub: 'invited you', host: true });
        for (const x of (r.circle || r.friends || [])) rows.push({ name: x.name, seen: x.seen, sub: x.created ? 'friend' : '' });
        el.innerHTML = rows.map((x, i) => personRow(x, i)).join('') || '<p class="lede">Nobody else in your circle yet.</p>';
        return;
      }
      if (typeof FAM_ON === 'undefined' || !FAM_ON) { el.innerHTML = '<p class="lede">People shows once you’re in the family network.</p>'; return; }
      const list = await fam('/members');
      const rows = (list || []).filter(x => x.role !== 'friend').map(x => ({ name: x.name, seen: x.seen, sub: x.role === 'admin' ? 'you · admin' : '', me: x.role === 'admin' || x.mine, role: x.role }));
      el.innerHTML = rows.map((x, i) => personRow(x, i)).join('') || '<p class="lede">Nobody else has joined yet.</p>';
      if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
        el.insertAdjacentHTML('beforeend', `<p style="margin-top:18px"><button class="btn pri" data-ib-open-settings>Family &amp; friends settings</button></p>`);
      }
    } catch (e) { el.textContent = e.message || 'Couldn’t load people.'; }
  }
  function personRow(x, i) {
    const when = x.me || x.role === 'admin' ? 'Online now' : x.seen ? (typeof ago === 'function' ? ago(x.seen) + ' ago' : '') : 'Hasn’t opened it yet';
    return `<div class="today-drow">${avHtml(x.name, i)}<div class="who"><b>${esc(x.name)}</b><small>${esc(x.sub || '')}</small></div><div class="when">${esc(when)}</div></div>`;
  }

  function gameBest(kind) {
    try {
      if (kind === 'sugar') {
        const lv = sugarLevel();
        return lv > 1 ? 'Level ' + lv : '';
      }
      const list = (typeof IBScores !== 'undefined' && IBScores.localBests) ? IBScores.localBests(kind) : [];
      let n = 0;
      (list || []).forEach(x => { if (+x.score > n) n = +x.score; });
      return n ? 'Best ' + n.toLocaleString('en-NZ') : '';
    } catch (e) { return ''; }
  }
  function gameTiles() {
    const lv = sugarLevel();
    const sugarBest = gameBest('sugar');
    const scrabBest = gameBest('scrabble');
    const tetBest = gameBest('tetris');
    const sugar = (typeof sugarOk !== 'function' || sugarOk())
      ? `<button type="button" class="today-game today-gtile sr" data-art="sugar"><span class="gtile-art" aria-hidden="true"><span class="gtile-candy c1"></span><span class="gtile-candy c2"></span><span class="gtile-candy c3"></span></span><span class="gtile-body"><b class="gtile-name">Sugar Rush</b><small class="gtile-hook">Match sweets on a map from Onerahi to Asia.</small>${sugarBest ? '<small class="gtile-best">' + sugarBest + '</small>' : ''}<span class="gtile-play" data-gplay="sugar">Play</span></span></button>`
      : `<button type="button" class="today-game today-gtile sr" disabled><span class="gtile-art" aria-hidden="true"><span class="gtile-candy c1"></span><span class="gtile-candy c2"></span><span class="gtile-candy c3"></span></span><span class="gtile-body"><b class="gtile-name">Sugar Rush</b><small class="gtile-hook">Coming soon</small></span></button>`;
    return `${sugar}
      <button type="button" class="today-game today-gtile sc" data-art="scrabble"><span class="gtile-art" aria-hidden="true"><span class="gtile-letter">S</span><span class="gtile-letter">C</span><span class="gtile-letter">R</span></span><span class="gtile-body"><b class="gtile-name">Scrabble</b><small class="gtile-hook">Make words. Play a friend or the computer.</small>${scrabBest ? '<small class="gtile-best">' + scrabBest + '</small>' : ''}<span class="gtile-play" data-gplay="scrabble">Play</span></span></button>
      <button type="button" class="today-game today-gtile te" data-art="tetris"><span class="gtile-art" aria-hidden="true"><img src="img/play/tetris.svg" alt=""></span><span class="gtile-body"><b class="gtile-name">Tetris</b><small class="gtile-hook">Drop, rotate, clear the line.</small>${tetBest ? '<small class="gtile-best">' + tetBest + '</small>' : ''}<span class="gtile-play" data-gplay="tetris">Play</span></span></button>`;
  }
  function drawGamesPage() {
    const m = $('#feed'); if (!m) return;
    m.innerHTML = `<div class="today-page today-games-page"><h1>Let’s play.</h1>
      <p class="lede">Pick a game. Sugar Rush, Scrabble and Tetris all open from here.</p>
      <div class="today-games today-games-hero">${gameTiles()}</div></div>`;
  }
  function drawYouPage() {
    const m = $('#feed'); if (!m) return;
    const name = (typeof MEMBER !== 'undefined' && MEMBER && MEMBER.name && !MEMBER.pending) ? MEMBER.name : '';
    const appear = typeof APPEAR !== 'undefined' ? APPEAR : 'light';
    const opts = [['dark', '🌙', 'Dark'], ['light', '☀️', 'Light'], ['auto', '📱', 'Match phone'], ['ocean', '🌊', 'Ocean'], ['spring', '🌸', 'Spring'], ['candy', '🍬', 'Candy Crush']];
    m.innerHTML = `<div class="today-page"><h1>${esc(name ? 'Hello, ' + name + '.' : 'You.')}</h1>
      <p class="lede">Appearance, your feed, and settings. Themes include dark, light, and the colour ones.</p>
      <h2 class="mfsec" style="margin-left:0">Settings &amp; themes</h2>
      <div class="today-appear">${opts.map(([k, em, l]) => `<button type="button" class="${appear === k ? 'on' : ''}" data-appear="${k}">${em} ${esc(l)}</button>`).join('')}</div>
      ${typeof PRIVATE_OK !== 'undefined' && PRIVATE_OK ? `<button type="button" class="btn" data-tab="life" style="margin-bottom:10px">📌 For You</button>` : ''}
      <button type="button" class="btn pri" data-ib-open-settings>Open settings</button>
      </div>`;
  }

  /* ---- Magazine side menu (wraps mfDrawer, keeps every existing action) ---- */
  function gamesMenuBlock() {
    return `<p class="mfsec">Games</p><div class="mf-games">${gameTiles()}</div>`;
  }
  function calMenuBlock() {
    const preview = liveCalPreview();
    const rows = preview.length
      ? preview.map(x => `<span class="today-cal-row"><em>${x.icon}</em><span><b>${esc(x.title)}</b><small>${esc(x.when)}</small></span></span>`).join('')
      : `<span class="today-cal-empty">Nothing coming up — open the calendar</span>`;
    return `<p class="mfsec">Calendar</p><div class="mf-cal"><button type="button" class="today-cal" data-calopen="1"><span class="today-cal-hd"><span class="mfe" aria-hidden="true">📅</span><b>Calendar</b></span>${rows}</button></div>`;
  }
  function wrapDrawer() {
    if (typeof mfDrawer !== 'function') return;
    const orig = mfDrawer;
    window.mfDrawer = function (open) {
      orig(open);
      const d = document.getElementById('mfdrawer'); if (!d) return;
      const panel = d.querySelector('.mfpanel'); if (!panel) return;
      const hd = panel.querySelector('.mfhd b'); if (hd) hd.textContent = 'Info Book';
      const extra = panel.querySelector('.mfextra');
      const opts = panel.querySelector('.mfopts');
      if (!open) return;
      const friend = typeof IS_FRIEND !== 'undefined' && IS_FRIEND;
      const t = typeof tab !== 'undefined' ? tab : 'all';
      const browse = [];
      browse.push(`<button type="button" class="mfopt${t === 'all' ? ' on' : ''}" data-mftab="all"><span class="mfe">▦</span><span>Today</span>${t === 'all' ? '<i>✓</i>' : ''}</button>`);
      browse.push(`<button type="button" class="mfopt${t === 'people' ? ' on' : ''}" data-mftab="people"><span class="mfe">☺</span><span>People</span>${t === 'people' ? '<i>✓</i>' : ''}</button>`);
      browse.push(`<button type="button" class="mfopt${t === 'you' ? ' on' : ''}" data-mftab="you"><span class="mfe">◉</span><span>You</span>${t === 'you' ? '<i>✓</i>' : ''}</button>`);
      browse.push(`<button type="button" class="mfopt" data-todo-open><span class="mfe">✓</span><span>To-do list</span></button>`);
      if (typeof FAM_ON !== 'undefined' && FAM_ON) {
        const label = friend ? 'Friends feed' : 'Family feed';
        browse.push(`<button type="button" class="mfopt${t === 'family' ? ' on' : ''}" data-mftab="family"><span class="mfe">${friend ? '🤝' : '👨‍👩‍👧'}</span><span>${label}</span>${t === 'family' ? '<i>✓</i>' : ''}</button>`);
      }
      if (typeof PRIVATE_OK !== 'undefined' && PRIVATE_OK) {
        browse.push(`<button type="button" class="mfopt${t === 'life' ? ' on' : ''}" data-mftab="life"><span class="mfe">📌</span><span>For You</span>${t === 'life' ? '<i>✓</i>' : ''}</button>`);
      }
      browse.push(`<button type="button" class="mfopt${t === 'photos' ? ' on' : ''}" data-mftab="photos"><span class="mfe">🖼️</span><span>Photos</span>${t === 'photos' ? '<i>✓</i>' : ''}</button>`);
      browse.push(`<button type="button" class="mfopt${t === 'liked' ? ' on' : ''}" data-mftab="liked"><span class="mfe">👍</span><span>Liked</span>${t === 'liked' ? '<i>✓</i>' : ''}</button>`);

      let admin = '';
      if (!friend && typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
        admin = `<p class="mfsec">Admin</p><button type="button" class="mfopt" data-ib-open-settings><span class="mfe">👥</span><span>Family &amp; friends</span></button>`;
        if (typeof IS_SHANE === 'function' ? IS_SHANE() : false) {
          admin += `<button type="button" class="mfopt" id="ppl"><span class="mfe">📒</span><span>People: everyone in Info Book</span></button>`;
        }
      }

      if (opts) {
        opts.innerHTML = gamesMenuBlock() + calMenuBlock() + `<p class="mfsec">Browse</p>` + browse.join('');
      }
      if (extra) {
        let x = extra.innerHTML;
        // Keep appearance, My App toggle, interests and media filters from the original drawer,
        // but move "Show me" / appearance after our browse block (already in extra from orig).
        extra.innerHTML = `<p class="mfsec">Show me</p>` + (typeof MF_OPTS !== 'undefined' ? MF_OPTS.map(o => `<button type="button" class="mfopt${o[0] === MF ? ' on' : ''}" data-mfset="${o[0]}" role="menuitemradio" aria-checked="${o[0] === MF}"><span class="mfe">${o[1]}</span><span>${o[2]}</span>${o[0] === MF ? '<i>✓</i>' : ''}</button>`).join('') : '')
          + (typeof intSub === 'function' ? `<p class="mfsec">Interests</p>` + intSub() : '')
          + `<p class="mfsec">Settings &amp; themes</p>` +
          (typeof PRIVATE_OK !== 'undefined' && PRIVATE_OK ? `<button type="button" class="mfopt${SHOW_LIFE ? ' on' : ''}" data-showlife="1" role="switch" aria-checked="${!!SHOW_LIFE}"><span class="mfe">📌</span><span>Show My App stuff</span>${SHOW_LIFE ? '<i>✓</i>' : ''}</button>` : '') +
          `<div class="mfappear">` +
          [['dark', '🌙', 'Dark'], ['light', '☀️', 'Light'], ['auto', '📱', 'Match phone'], ['ocean', '🌊', 'Ocean'], ['spring', '🌸', 'Spring'], ['candy', '🍬', 'Candy Crush']].map(([k, em, l]) =>
            `<button type="button" class="mfopt${APPEAR === k ? ' on' : ''}" data-appear="${k}" role="menuitemradio" aria-checked="${APPEAR === k}"><span class="mfe">${em}</span><span>${l}</span>${APPEAR === k ? '<i>✓</i>' : ''}</button>`).join('') + `</div>`
          + `<button type="button" class="mfopt" data-ib-open-settings><span class="mfe">⚙︎</span><span>Settings</span></button>`
          + admin;
      }
    };
  }

  /* ---- Double-tap heart (TikTok-style) ---- */
  const TAP_WAIT = 280;
  const IGNORE = 'button, input, textarea, select, a.open-l, .fb, .vote, .rxl, .rxpick, .cmts, .cm, .cml, .mini, .ich, .upbs, .today-hero, .today-composer, .today-bit, .today-celeb, .ib-tabs, [data-like], [data-cmt], [data-share], [data-vote], [data-likers], [data-unshare], [data-upload], [data-sharelink], [data-sharetext], [contenteditable]';
  let tap = null, scrolled = false, ptr = null;

  function isIgnore(el) { return !!(el && el.closest && el.closest(IGNORE)); }

  function loveKeep(cardId) {
    if (!cardId) return;
    if (typeof FAM_ON === 'undefined' || !FAM_ON) return;
    if (typeof rxCard !== 'function' || typeof toggleLike !== 'function') return;
    const s = rxCard(cardId); if (!s) return;
    const mine = (s.likes || []).find(typeof isMe === 'function' ? isMe : () => false);
    if (mine) return; // already liked: keep it, do not toggle off
    toggleLike(cardId, 'love');
  }
  function showHeart(x, y) {
    const el = document.createElement('div'); el.className = 'ib-heart'; el.textContent = '❤️'; el.setAttribute('aria-hidden', 'true');
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
  function openReaderOrLink(card, link) {
    try {
      if (card && window.ibReader && typeof ibReader.canOpen === 'function' && ibReader.canOpen(card)) {
        ibReader.open(card);
        return;
      }
    } catch (err) {}
    if (!link) return;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 });
    ev._ibToday = true;
    link.dispatchEvent(ev);
  }
  function openLink(link) {
    const card = link && link.closest && link.closest('#feed .card');
    openReaderOrLink(card, link);
  }

  addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ptr = { x: e.clientX, y: e.clientY }; scrolled = false;
  }, { capture: true, passive: true });
  addEventListener('pointermove', e => {
    if (!ptr) return;
    if (Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 12) scrolled = true;
  }, { capture: true, passive: true });
  addEventListener('pointerup', () => { ptr = null; }, { capture: true, passive: true });
  addEventListener('scroll', () => { scrolled = true; }, { passive: true });

  document.addEventListener('click', e => {
    if (e._ibToday) return;
    const card = e.target.closest && e.target.closest('#feed .card');
    if (!card) return;
    if (isIgnore(e.target) || scrolled) return;
    if (e.target.closest('.media.vid, [data-fs], [data-snd], [data-art]')) return;

    const now = Date.now(), x = e.clientX, y = e.clientY;
    if (tap && tap.card === card && now - tap.t < TAP_WAIT && Math.hypot(x - tap.x, y - tap.y) < 48) {
      clearTimeout(tap.timer); tap = null;
      e.preventDefault(); e.stopPropagation();
      showHeart(x, y);
      loveKeep(card.dataset.id);
      return;
    }

    const link = e.target.closest('a[href]');
    const isArticle = link && (link.classList.contains('media') || link.classList.contains('open-l') || link.target === '_blank' || link.classList.contains('lm'));
    if (isArticle) {
      e.preventDefault(); e.stopPropagation();
      const timer = setTimeout(() => { tap = null; openReaderOrLink(card, link); }, TAP_WAIT);
      tap = { t: now, x, y, card, timer };
      return;
    }
    const timer = setTimeout(() => { tap = null; openReaderOrLink(card, null); }, TAP_WAIT);
    tap = { t: now, x, y, card, timer };
  }, true);

  /* ---- Hooks ---- */
  function hookDraw() {
    if (typeof draw !== 'function') return;
    const orig = draw;
    window.draw = function () {
      const t = typeof tab !== 'undefined' ? tab : 'all';
      if (t === 'people' || t === 'games' || t === 'you') {
        try { if (typeof chips === 'function') chips(); } catch (e) { }
        const bf = document.getElementById('backfeed'); if (bf) bf.hidden = true;
        if (t === 'people') drawPeoplePage();
        else if (t === 'games') drawGamesPage();
        else drawYouPage();
        paintTabs(); return;
      }
      orig.apply(this, arguments);
      if (typeof tab !== 'undefined' && tab === 'all') injectHero();
      paintTabs();
    };
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest && t.closest('#mfdrawer [data-art]')) { try { mfDrawer(false); } catch (err) { } return; }
    if (t.closest && t.closest('[data-ib-open-settings]')) {
      e.preventDefault();
      try { if (typeof mfDrawer === 'function') mfDrawer(false); } catch (err) { }
      if (typeof settings === 'function') settings();
      return;
    }
    const celebBtn = t.closest && t.closest('[data-celeb]');
    if (celebBtn) {
      e.preventDefault();
      const on = celebBtn.dataset.celeb === 'yes';
      celebBtn.disabled = true;
      try { if (typeof setCelebNews === 'function') setCelebNews(on); } catch (err) { }
      return;
    }
    const bit = t.closest && t.closest('[data-today-bit]');
    if (bit) {
      const k = bit.dataset.todayBit;
      if (k === 'trivia' && typeof triviaPlay === 'function') triviaPlay();
      else if (k === 'trivia' && typeof X !== 'undefined' && X.triv) { try { triviaPlay(); } catch (err) { } }
      else if (k === 'streak' && typeof profileSheet === 'function' && typeof FAM_ON !== 'undefined' && FAM_ON) profileSheet();
      else if (k === 'people' || k === 'bday') { try { goTab('people'); } catch (err) { } }
      return;
    }
  });

  hookDraw();
  wrapDrawer();
  paintTabs();
  if (typeof tab !== 'undefined' && tab === 'all' && $('#feed') && !$('#feed .sk')) injectHero();

  window.ibToday = { nzParts, wxLabel, nextBirthday, sugarLevel, loveKeep, TAP_WAIT, IGNORE, heroHtml, celebCardHtml, calPreview, calWhen, fmtTime, daysUntil, isoDate, openReaderOrLink };
})();
