/* Preview: religion opt-in (including cults and high-control groups), Auckland concerts
   carousel, NZ Top 40 + in-app videos, and bringing playable videos back to the feed.
   Do not production-deploy from this branch. */
(function (root) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const REL_KEY = 'religion';
  const VENUE_OK = /spark arena|eden park|go media|town hall|the civic|western springs|auckland live/i;
  const NOT_CONCERT = /e-waste|recycl|comedy|stand-?up|bluey|paul smith|wwe|breakers|wrestling|basketball|rugby|netball|football|cricket/i;
  const REL_KEEP = /tikanga|wairua|rongo[aā]|karakia|tohunga|whakapapa|atua|poukai|kiingitanga|kīngitanga|matakite|faith|church|religio|spiritual|cults?\b|islam|christian|catholic|hindu|buddhist|jewish|synagogue|mosque|temple|bible|gospel|ministry|rongoa/i;
  const REL_DROP = /\brugby|league|nrl|afl|cricket|netball|football|sport\b|election|parliament|politic/i;
  const REL_SPORT = /\brugby|league|nrl|afl|cricket|netball|football|sport\b/i;
  // Word-bounded so "culture", "cultivate" and "section" are not tagged as cults.
  const CULT_KEEP = /\b(?:cults?|cultish|cultic|cultists?|cult[\s-]?survivors?|cult[\s-]?leaders?|ex[\s-]?cult|high[\s-]?control\s+groups?|doomsday\s+cults?|gloriavale|scientology|scientologists?|l\.?\s*ron\s+hubbard|david\s+miscavige|jonestown|peoples?\s+temple|jim\s+jones|nxivm|keith\s+raniere|heaven['’]?s?\s+gate|branch\s+davidians?|children\s+of\s+god|the\s+family\s+international|aum\s+shinrikyo|solar\s+temple|rajneesh(?:puram)?|wild\s+wild\s+country|flds\b|warren\s+jeffs|synanon|centrepoint(?:\s+community)?|cultproof|sects?|sectarian)\b/i;
  const CULT_DROP = /\b(you won'?t believe|shocking video|horrifying footage|gruesome|gore\b|nsfw)\b/i;
  const REL_FEEDS = [
    { url: 'https://www.rnz.co.nz/rss/te-manu-korihi.xml', sn: 'RNZ Te Manu Korihi', mode: 'religion' },
    { url: 'https://www.rnz.co.nz/rss/national.xml', sn: 'RNZ', mode: 'cult' },
    { url: 'https://www.rnz.co.nz/rss/world.xml', sn: 'RNZ World', mode: 'cult' },
    { url: 'https://www.rnz.co.nz/podcasts/the-lodge.rss', sn: 'RNZ The Lodge', mode: 'lodge', kind: 'podcast' }
  ];

  function religionBlob(i) {
    if (i == null) return '';
    if (typeof i === 'string') return i;
    const nest = i.it || i.h || i;
    return [i.t, i.s, i.sn, i.src, i.url, i.tag, i.sub, nest && nest.t, nest && nest.s, nest && nest.sn, nest && nest.url].map(x => x || '').join(' ');
  }
  function isCultText(text) {
    const blob = String(text || '');
    if (!blob || CULT_DROP.test(blob) || REL_SPORT.test(blob)) return false;
    return CULT_KEEP.test(blob);
  }
  function isCultItem(i) { return isCultText(religionBlob(i)); }
  function hideFromFeed(i) { return isCultItem(i); }
  function rssKeep(blob, mode) {
    if (!blob || CULT_DROP.test(blob) || REL_SPORT.test(blob)) return false;
    if (mode === 'religion') return REL_KEEP.test(blob) && !REL_DROP.test(blob);
    if (mode === 'cult') return CULT_KEEP.test(blob);
    if (mode === 'lodge') return CULT_KEEP.test(blob) || /cultproof|the lodge|takaro lodge|aiping wang|high[\s-]?control/i.test(blob);
    return false;
  }
  function religionDedupe(items) {
    const seen = new Set();
    return (items || []).filter(it => {
      if (!it || !it.t) return false;
      const keys = [
        String(it.url || '').toLowerCase().replace(/\/+$/, ''),
        String(it.t || '').toLowerCase().replace(/\s+/g, ' ').trim()
      ].filter(Boolean);
      if (keys.some(k => seen.has(k))) return false;
      keys.forEach(k => seen.add(k));
      return true;
    });
  }
  function religionSort(items) {
    return (items || []).slice().sort((a, b) => {
      const da = String(a.published || ''), db = String(b.published || '');
      if (da && db) return db.localeCompare(da);
      if (da && !db) return -1;
      if (!da && db) return 1;
      return 0;
    });
  }
  function collectFromFeed(feed) {
    const f = feed || feedObj() || {};
    const out = [];
    for (const list of [f.items, f.vlogs]) {
      for (const i of list || []) {
        if (!isCultItem(i) || !i.t) continue;
        const at = i.at || i.first;
        let published = '';
        try { if (at) published = new Date(at).toISOString().slice(0, 10); } catch (e) { }
        out.push({
          id: i.id || ('rel-feed-' + String(i.url || i.t).replace(/\W+/g, '').slice(-16)),
          t: i.t,
          s: i.s || '',
          url: i.url || '',
          img: i.img || '',
          vid: i.vid || '',
          sn: i.sn || i.src || 'Feed',
          published,
          kind: i.vid ? 'documentary' : (i.kind || 'news'),
          fromFeed: true
        });
      }
    }
    return out;
  }
  async function fetchReligionRss(src) {
    const items = [];
    try {
      const r = await fetch(src.url, { cache: 'no-store' });
      if (!r.ok || typeof DOMParser === 'undefined') return items;
      const doc = new DOMParser().parseFromString(await r.text(), 'text/xml');
      for (const it of [...doc.querySelectorAll('item')]) {
        const t = (it.querySelector('title') || {}).textContent || '';
        const url = (it.querySelector('link') || {}).textContent || '';
        const s = ((it.querySelector('description') || {}).textContent || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const pub = (it.querySelector('pubDate') || {}).textContent || '';
        if (!url || !rssKeep(t + ' ' + s, src.mode)) continue;
        let published = '';
        try { if (pub) published = new Date(pub).toISOString().slice(0, 10); } catch (e) { }
        items.push({ id: 'rel-live-' + url.replace(/\W+/g, '').slice(-16), t, s, url, sn: src.sn, published, kind: src.kind || 'news' });
      }
    } catch (e) { }
    return items;
  }

  function memberTag() {
    try {
      const who = root.IBScores && root.IBScores.who && root.IBScores.who();
      if (who && who.id) return ':' + who.id;
    } catch (e) { }
    try {
      const me = JSON.parse((root.localStorage && root.localStorage.getItem('mf.member')) || 'null');
      if (me && me.id) return ':' + me.id;
    } catch (e) { }
    return '';
  }
  function store() {
    if (typeof ls !== 'undefined' && ls && typeof ls.get === 'function') return ls;
    if (root.ls && typeof root.ls.get === 'function') return root.ls;
    return null;
  }
  function feedObj() { return (typeof FEED !== 'undefined' && FEED) || root.FEED || null; }
  function famOn() { return (typeof FAM_ON !== 'undefined' && FAM_ON) || (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) || (typeof PRIVATE_OK !== 'undefined' && PRIVATE_OK); }
  function currentTab() { return (typeof tab !== 'undefined' && tab) || root.tab || 'all'; }
  function nzToday() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function fmtDay(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso + 'T12:00:00+13:00'));
    } catch (e) { return iso; }
  }

  /* ---- Religion opt-in (same prompt pattern as sport, but Shane is asked too) ---- */
  function relPref() {
    const s = store();
    if (!s) return null;
    const v = s.get(REL_KEY, null);
    if (v === true || v === 'true') return true;
    if (v === false || v === 'false') return false;
    return null;
  }
  function religionOn() { return relPref() === true; }
  function shouldAskReligion() {
    if (!famOn()) return false;
    const v = relPref();
    return v !== true && v !== false;
  }
  function showReligionSettings() {
    return famOn();
  }
  function setReligion(on) {
    const s = store();
    if (s && typeof s.set === 'function') s.set(REL_KEY, !!on);
    try { if (typeof toast === 'function') toast(on ? 'Religion is on in your feed' : 'Religion stays out of your feed'); } catch (e) { }
    try { if (typeof draw === 'function') draw(); else if (typeof root.draw === 'function') root.draw(); } catch (e) { }
    return !!on;
  }
  function religionAskCard(i) {
    const xh = typeof root.xHead === 'function' ? root.xHead('🕯️', 'A question for you', 'An optional topic in your feed', 'Religion') : '';
    return `<article class="card xc relask" data-id="${esc((i && i.id) || 'ib-rel-ask')}" data-topic="religion" style="--c1:#6d28d9;--c2:#0f766e">${xh}
      <div class="bd"><h3>Want Religion in your feed?</h3>
      <div class="xbtns"><button type="button" class="btn pri" data-ib-religion="yes">Yes</button><button type="button" class="btn" data-ib-religion="no">No</button></div>
      <p>Optional stories about traditional practices and beliefs — including Māori tikanga and wairua, rongoā and other traditional methods — plus respectful news, investigations, documentaries and podcasts about religions, cults and high-control groups. It stays factual and is hidden until you say yes. You can change this later in Settings → Interests.</p>
      </div></article>`;
  }
  function religionCard(i) {
    const it = i.it || i;
    const when = it.published ? fmtDay(String(it.published).slice(0, 10)) : '';
    const xh = typeof root.xHead === 'function' ? root.xHead('🕯️', 'Religion', [it.sn, when].filter(Boolean).join(' · ') || 'Optional topic', 'Religion') : '';
    const blurb = it.s || '';
    return `<article class="card xc religion" data-id="${esc(i.id)}" data-topic="religion" style="--c1:#6d28d9;--c2:#0f766e">${xh}
      <div class="bd"><h3>${esc(it.t)}</h3>
      ${blurb ? `<p>${esc(blurb)}</p>` : ''}
      <p class="plsrc">${esc(it.sn || 'Religion')}</p></div></article>`;
  }

  let REL_ITEMS = null, REL_FOR = '';
  function applyFeedCults(feed) {
    REL_ITEMS = religionSort(religionDedupe((REL_ITEMS || []).concat(collectFromFeed(feed))));
    return REL_ITEMS;
  }
  function onFeed(feed) { applyFeedCults(feed || feedObj()); }
  async function loadReligion() {
    const k = nzToday();
    if (REL_FOR === k && REL_ITEMS) {
      applyFeedCults(feedObj());
      return REL_ITEMS;
    }
    let items = [];
    try {
      const r = await fetch('religion-local.json?v=1.9.313', { cache: 'no-store' });
      if (r.ok) items = ((await r.json()).items || []).slice();
    } catch (e) { }
    const rss = await Promise.all(REL_FEEDS.map(fetchReligionRss));
    rss.forEach(list => { items = items.concat(list); });
    items = items.concat(collectFromFeed(feedObj()));
    REL_ITEMS = religionSort(religionDedupe(items));
    REL_FOR = k;
    return REL_ITEMS;
  }

  /* ---- Auckland concerts carousel ---- */
  function concertFromFeed(c) {
    if (!c || !c.t || !c.venue) return null;
    if (!VENUE_OK.test(c.venue)) return null;
    if (NOT_CONCERT.test((c.t || '') + ' ' + (c.venue || ''))) return null;
    const date = c.day || (c.days && c.days[0]) || '';
    if (!date || date < nzToday()) return null;
    return { id: c.id || ('akl-' + date + '-' + c.t), artist: c.t, title: c.t, venue: c.venue, date, dates: c.days || [date], image: c.img || '', url: c.url || '', source: c.venue };
  }
  let CON_FALLBACK = null;
  async function loadConcerts() {
    if (!CON_FALLBACK) {
      try {
        const r = await fetch('akl-concerts.json?v=1.9.313', { cache: 'no-store' });
        if (r.ok) CON_FALLBACK = (await r.json()).events || [];
      } catch (e) { CON_FALLBACK = []; }
    }
    const today = nzToday();
    const byKey = new Map();
    function add(ev) {
      if (!ev || !ev.date || ev.date < today) return;
      if (NOT_CONCERT.test((ev.artist || ev.title || '') + ' ' + (ev.venue || ''))) return;
      const k = String(ev.artist || ev.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '') + '|' + ev.date;
      if (!byKey.has(k)) byKey.set(k, ev);
    }
    (CON_FALLBACK || []).forEach(add);
    ((feedObj() && feedObj().concerts) || []).forEach(c => add(concertFromFeed(c)));
    return [...byKey.values()].sort((a, b) => (a.date + (a.artist || '')).localeCompare(b.date + (b.artist || '')));
  }
  function concertSlide(ev) {
    const when = ev.dates && ev.dates.length > 1
      ? ev.dates.map(fmtDay).join(' & ')
      : fmtDay(ev.date);
    const xh = typeof root.xHead === 'function' ? root.xHead('🎤', 'Big Auckland concerts', ev.venue, 'Concert') : '';
    const img = ev.image
      ? `<a class="media" href="${esc(ev.url)}" target="_blank" rel="noopener"><img src="${esc(ev.image)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`
      : '';
    const btn = ev.url ? `<div class="xbtns"><a class="btn pri" href="${esc(ev.url)}" target="_blank" rel="noopener">Tickets & info ↗</a></div>` : '';
    return { id: ev.id, x: 'aklcon', ev, topic: 'events', t: ev.artist || ev.title };
  }
  function concertCard(i) {
    const ev = i.ev || i;
    const when = ev.dates && ev.dates.length > 1 ? ev.dates.map(fmtDay).join(' & ') : fmtDay(ev.date);
    const xh = typeof root.xHead === 'function' ? root.xHead('🎤', 'Big Auckland concerts', ev.venue, 'Concert') : '';
    const img = ev.image
      ? `<a class="media" href="${esc(ev.url || '#')}" target="_blank" rel="noopener"><img src="${esc(ev.image)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`
      : '';
    const btn = ev.url ? `<div class="xbtns"><a class="btn pri" href="${esc(ev.url)}" target="_blank" rel="noopener">Tickets & info ↗</a></div>` : '';
    return `<article class="card xc aklcon" data-id="${esc(i.id)}" data-topic="events" style="--c1:#86198f;--c2:#e11d48">${xh}
      ${img}
      <div class="bd"><h3>${esc(ev.artist || ev.title)}</h3>
      <p>${esc(when)}${ev.venue ? ' · ' + esc(ev.venue) : ''}</p>
      ${btn}
      <p class="plsrc">${esc(ev.source || ev.venue || 'Auckland')}</p></div></article>`;
  }

  /* ---- NZ Top 40 ---- */
  let TOP40 = null;
  async function loadTop40() {
    if (TOP40 && TOP40.songs && TOP40.songs.length) return TOP40;
    try {
      const r = await fetch('top40-local.json?v=1.9.313', { cache: 'no-store' });
      if (r.ok) TOP40 = await r.json();
    } catch (e) { }
    try {
      const r = await fetch('/app.js?v=' + Date.now(), { cache: 'no-store' });
      if (r.ok) {
        const txt = await r.text();
        const um = txt.match(/TOP40_UPDATED\s*=\s*['"](\d{4}-\d{2}-\d{2})['"]/);
        const m = txt.match(/const TOP40\s*=\s*(\[[\s\S]*?\n\]);/);
        if (m) {
          const songs = (new Function('return ' + m[1]))();
          if (Array.isArray(songs) && songs.length) {
            TOP40 = Object.assign({}, TOP40 || {}, {
              updated: um ? um[1] : (TOP40 && TOP40.updated) || '',
              songs: songs.map((s, i) => ({
                rank: s.rank || s.pos || (i + 1),
                title: s.title || s.t,
                artist: s.artist || s.a,
                videoId: s.videoId || s.vid || s.id || '',
                url: s.url || ((s.videoId || s.vid || s.id) ? 'https://www.youtube.com/watch?v=' + (s.videoId || s.vid || s.id) : ''),
                image: s.image || s.img || ((s.videoId || s.vid || s.id) ? 'https://i.ytimg.com/vi/' + (s.videoId || s.vid || s.id) + '/hqdefault.jpg' : '')
              }))
            });
          }
        }
      }
    } catch (e) { }
    return TOP40 || { songs: [] };
  }
  function top40Card(i) {
    const s = i.song || i;
    const xh = typeof root.xHead === 'function' ? root.xHead('🎵', 'NZ Top 40', '#' + s.rank, 'Music') : '';
    const img = s.image
      ? `<button type="button" class="media" data-top40="${esc(s.videoId || s.rank)}" aria-label="Play ${esc(s.title)}"><img src="${esc(s.image)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="play"><span></span></span></button>`
      : '';
    return `<article class="card xc top40" data-id="${esc(i.id)}" data-topic="music" data-top40="${esc(s.videoId || s.rank)}" style="--c1:#be185d;--c2:#7c3aed">${xh}
      ${img}
      <div class="bd"><h3>${esc(s.rank + '. ' + s.title)}</h3>
      <p>${esc(s.artist)}</p>
      <div class="xbtns"><button type="button" class="btn pri" data-top40="${esc(s.videoId || s.rank)}">Watch the video</button></div>
      <p class="plsrc">Official NZ Top 40 · week of ${esc((TOP40 && TOP40.week) || '')}</p></div></article>`;
  }
  function openTop40Video(id) {
    const pack = TOP40 || { songs: [] };
    const s = (pack.songs || []).find(x => String(x.videoId) === String(id) || String(x.rank) === String(id));
    if (!s) return;
    root.__ibTop40Back = true;
    const feed = root.document.getElementById('feed');
    if (!feed) return;
    const vid = s.videoId || '';
    const week = pack.week || '';
    const embed = vid
      ? `<div class="ib-t40-stage"><iframe title="${esc(s.title)}" src="https://www.youtube-nocookie.com/embed/${esc(vid)}?rel=0&amp;modestbranding=1&amp;playsinline=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
      : `<p>No official video id was listed for this song.</p>`;
    feed.innerHTML = `<article class="card ib-t40-page" data-id="top40-${esc(vid || s.rank)}">
      <p><button type="button" class="btn" id="ib-t40-back">← Back to the feed</button></p>
      <h2>${esc(s.title)}</h2>
      <p class="ib-t40-artist">${esc(s.artist)}${s.rank ? ' · #' + esc(s.rank) : ''}${week ? ' · NZ Top 40, ' + esc(week) : ''}</p>
      ${embed}
      <p class="plsrc">The video is a YouTube embed (youtube-nocookie.com, modest branding, no autoplay). YouTube can still show ads in embeds. Nothing is ripped or blocked.</p>
    </article>`;
    root.scrollTo({ top: 0 });
    const back = root.document.getElementById('ib-t40-back');
    if (back) back.onclick = function () {
      root.__ibTop40Back = false;
      try { if (typeof draw === 'function') draw(); } catch (e) { }
    };
  }

  /* ---- Videos row + full-viewport player ---- */
  function soundAllKey() { return 'ib-vid-sound-all' + memberTag(); }
  function soundAll() {
    try { return root.localStorage && root.localStorage.getItem(soundAllKey()) === '1'; } catch (e) { return false; }
  }
  function setSoundAll(on) {
    try { if (root.localStorage) root.localStorage.setItem(soundAllKey(), on ? '1' : '0'); } catch (e) { }
  }
  function playableVid(i) {
    if (!i) return '';
    if (i.vid && /^[\w-]{6,}$/.test(String(i.vid))) return i.vid;
    const h = i.h || {};
    if (h.vid && /^[\w-]{6,}$/.test(String(h.vid))) return h.vid;
    const u = String(h.url || i.url || '');
    const m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : '';
  }
  function closeVidFs() {
    const el = root.document.getElementById('ib-vidfs');
    if (el) el.remove();
    root.document.documentElement.classList.remove('ib-vidfs-on');
  }
  function openVidFs(opts) {
    opts = opts || {};
    closeVidFs();
    const id = opts.vid || '';
    const title = opts.title || 'Video';
    const wantSound = !!opts.sound || soundAll();
    const doc = root.document;
    const el = doc.createElement('div');
    el.id = 'ib-vidfs';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', title);
    const src = id
      ? 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&modestbranding=1&playsinline=1&autoplay=1&mute=' + (wantSound ? '0' : '1')
      : '';
    el.innerHTML = '<button type="button" class="ib-vidfs-back" id="ib-vidfs-back">← Back</button>'
      + '<div class="ib-vidfs-stage">' + (src ? '<iframe title="' + esc(title) + '" src="' + src + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>' : '') + '</div>'
      + '<div class="ib-vidfs-bar"><p>' + esc(title) + '</p>'
      + '<button type="button" class="btn pri" id="ib-vidfs-snd" aria-pressed="' + (wantSound ? 'true' : 'false') + '">' + (wantSound ? 'Sound on' : 'Turn sound on') + '</button>'
      + '<button type="button" class="btn" id="ib-vidfs-all" aria-pressed="' + (soundAll() ? 'true' : 'false') + '">' + (soundAll() ? '✓ Sound for all videos' : 'Sound for all videos') + '</button>'
      + '<p class="plsrc">Muted until you ask for sound. YouTube can still show ads in this embed.</p></div>';
    doc.body.appendChild(el);
    doc.documentElement.classList.add('ib-vidfs-on');
    const frame = el.querySelector('iframe');
    function reload(mute, auto) {
      if (!frame || !id) return;
      frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&modestbranding=1&playsinline=1&autoplay=' + (auto ? '1' : '0') + '&mute=' + (mute ? '1' : '0');
    }
    doc.getElementById('ib-vidfs-back').onclick = closeVidFs;
    doc.getElementById('ib-vidfs-snd').onclick = function (e) {
      const btn = e.currentTarget;
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? 'Sound on' : 'Turn sound on';
      reload(!on, true);
    };
    doc.getElementById('ib-vidfs-all').onclick = function (e) {
      const on = !soundAll();
      setSoundAll(on);
      e.currentTarget.setAttribute('aria-pressed', on ? 'true' : 'false');
      e.currentTarget.textContent = on ? '✓ Sound for all videos' : 'Sound for all videos';
      if (on) {
        const btn = doc.getElementById('ib-vidfs-snd');
        if (btn) { btn.setAttribute('aria-pressed', 'true'); btn.textContent = 'Sound on'; }
        reload(false, true);
      }
    };
    el.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeVidFs(); });
  }
  function videoSlide(i) {
    const vid = playableVid(i);
    const title = i.t || (i.h && i.h.t) || 'Video';
    const img = i.img || (i.h && i.h.img) || (vid ? 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg' : '');
    const xh = typeof root.xHead === 'function' ? root.xHead('▶️', 'Videos', i.sn || (i.h && i.h.sn) || 'YouTube', 'Video') : '';
    const media = `<button type="button" class="media vid" data-ib-openvid="${esc(vid)}" aria-label="Play ${esc(title)}"><img class="vthumb" src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="play"><span></span></span></button>`;
    return `<article class="card xc ibvid" data-id="${esc(i.id)}" data-topic="${esc(i.topic || '')}" style="--c1:#dc2626;--c2:#f97316">${xh}
      ${media}
      <div class="bd"><h3>${esc(title)}</h3>
      <div class="xbtns"><button type="button" class="btn pri" data-ib-openvid="${esc(vid)}">Play</button></div>
      <p class="plsrc">${esc(i.sn || (i.h && i.h.sn) || 'Video')}</p></div></article>`;
  }

  function insertRows(order) {
    if (!order) return order;
    const out = order.filter(i => !(i && i.x === 'concert')); // the swipe row replaces the one-off concert card
    const tabNow = currentTab();
    if (tabNow && tabNow !== 'all') return out;
    let pinEnd = 0;
    while (pinEnd < out.length && out[pinEnd] && out[pinEnd].pin) pinEnd++;
    const at = Math.min(pinEnd, 1);

    const front = [];
    if (shouldAskReligion() && !out.some(i => i && i.x === 'relask')) {
      front.push({ id: 'ib-rel-ask', x: 'relask', topic: 'religion', t: 'Want Religion in your feed?' });
    }
    if (root.__ibConcerts && root.__ibConcerts.length && !out.some(i => i && i.x === 'row' && i.k === 'akl-con')) {
      const items = root.__ibConcerts.slice(0, 16).map(ev => concertSlide(ev));
      if (items.length) front.push({ id: 'row-akl-con', x: 'row', k: 'akl-con', title: 'Big Auckland concerts', items, topic: 'events' });
    }
    if (TOP40 && TOP40.songs && TOP40.songs.length && !out.some(i => i && i.x === 'row' && i.k === 'top40')) {
      const items = TOP40.songs.map(s => ({ id: 't40-' + (s.videoId || s.rank), x: 'top40', song: s, topic: 'music', t: s.title, vid: s.videoId }));
      front.push({ id: 'row-top40', x: 'row', k: 'top40', title: 'NZ Top 40 singles', items, topic: 'music' });
    }
    applyFeedCults(feedObj());
    if (religionOn() && REL_ITEMS && REL_ITEMS.length && !out.some(i => i && i.x === 'row' && i.k === 'religion')) {
      const items = REL_ITEMS.slice(0, 10).map(it => ({ id: it.id, x: 'religion', it, topic: 'religion', t: it.t, s: it.s, url: it.url, sn: it.sn }));
      if (items.length) front.push({ id: 'row-religion', x: 'row', k: 'religion', title: 'Religion', items, topic: 'religion' });
    }
    if (!out.some(i => i && i.x === 'row' && i.k === 'vidrow')) {
      const seen = new Set();
      const vids = [];
      const feed = feedObj() || {};
      const pool = ((feed.items) || []).concat(((feed.vlogs) || []).map(v => ({ id: v.id, x: 'vlog', h: v, topic: 'vlogs', t: v.t, vid: v.vid, img: v.img, sn: v.sn, url: v.url })));
      for (const i of pool) {
        const id = playableVid(i);
        if (!id || seen.has(id) || seen.has(i.id)) continue;
        if (hideFromFeed(i)) continue;
        if (typeof root.ibNz !== 'undefined' && root.ibNz.usNetworkPromo && root.ibNz.usNetworkPromo(i)) continue;
        seen.add(id); seen.add(i.id);
        vids.push(Object.assign({}, i, { vid: id }));
        if (vids.length >= 10) break;
      }
      if (vids.length >= 3) {
        const items = vids.map(v => ({ id: v.id, x: 'ibvid', it: v, topic: v.topic || 'sitcoms', t: v.t, vid: playableVid(v) }));
        front.push({ id: 'row-vidrow', x: 'row', k: 'vidrow', title: 'Videos', items, topic: 'sitcoms' });
      }
    }
    if (front.length) out.splice(at, 0, ...front);
    return out;
  }

  function ibVidCard(i) { return videoSlide(i.it || i); }

  /* hooks */
  const prevFestive = root.festive;
  root.festive = function (order, nPins) {
    order = prevFestive ? prevFestive(order, nPins) : order;
    return insertRows(order);
  };
  const prevCard = root.card;
  root.card = function (i) {
    if (!i) return prevCard ? prevCard(i) : '';
    if (i.x === 'relask') return religionAskCard(i);
    if (i.x === 'religion') return religionCard(i);
    if (i.x === 'aklcon') return concertCard(i);
    if (i.x === 'top40') return top40Card(i);
    if (i.x === 'ibvid') return ibVidCard(i);
    return prevCard ? prevCard(i) : '';
  };

  root.ibPreview = {
    religionOn, shouldAskReligion, setReligion, showReligionSettings, relPref,
    isCultText, isCultItem, hideFromFeed, collectFromFeed, onFeed, rssKeep,
    playableVid, openVidFs, closeVidFs, openTop40Video, soundAll, setSoundAll
  };
  root.setReligion = setReligion;

  function onClick(e) {
    const rel = e.target.closest && e.target.closest('[data-ib-religion]');
    if (rel) { e.preventDefault(); setReligion(rel.getAttribute('data-ib-religion') === 'yes'); return; }
    const t40 = e.target.closest && e.target.closest('[data-top40]');
    if (t40 && !e.target.closest('a')) { e.preventDefault(); openTop40Video(t40.getAttribute('data-top40')); return; }
    const vid = e.target.closest && e.target.closest('[data-ib-openvid]');
    if (vid) {
      e.preventDefault();
      e.stopPropagation();
      const card = vid.closest('.card');
      const title = (card && card.querySelector('h3') && card.querySelector('h3').textContent) || 'Video';
      openVidFs({ vid: vid.getAttribute('data-ib-openvid'), title, sound: soundAll() });
      return;
    }
    const media = e.target.closest && e.target.closest('#feed .media.vid[data-vid]');
    if (media && !e.target.closest('[data-snd], [data-fs], a')) {
      const id = media.getAttribute('data-vid');
      if (id) {
        e.preventDefault();
        e.stopPropagation();
        const title = media.getAttribute('aria-label') || 'Video';
        openVidFs({ vid: id, title, sound: soundAll() });
      }
    }
  }
  if (root.document) {
    root.document.addEventListener('click', onClick, true);
    const css = root.document.createElement('style');
    css.id = 'ib-preview-css';
    css.textContent = 'html.ib-vidfs-on{overflow:hidden}#ib-vidfs{position:fixed;inset:0;z-index:20050;background:#0b0b0f;color:#fff;display:flex;flex-direction:column}'
      + '#ib-vidfs .ib-vidfs-back{position:absolute;top:max(10px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left));z-index:2;min-height:44px;padding:8px 14px;border:0;border-radius:22px;background:rgba(255,255,255,.92);color:#111;font-weight:800}'
      + '#ib-vidfs .ib-vidfs-stage{flex:1;display:flex;align-items:center;justify-content:center;min-height:40vh}'
      + '#ib-vidfs .ib-vidfs-stage iframe{width:100%;height:100%;border:0;background:#000}'
      + '#ib-vidfs .ib-vidfs-bar{padding:12px 16px calc(16px + env(safe-area-inset-bottom));display:grid;gap:8px}'
      + '.ib-t40-page{padding:16px}.ib-t40-stage{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:16px;overflow:hidden}.ib-t40-stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0}'
      + '.ib-t40-artist{color:var(--muted,#666)}';
    (root.document.head || root.document.documentElement).appendChild(css);
  }

  function boot() {
    Promise.all([loadReligion(), loadConcerts(), loadTop40()]).then(function (res) {
      root.__ibConcerts = res[1] || [];
      try { if (typeof draw === 'function' && feedObj()) draw(); } catch (e) { }
    });
  }
  if (root.document && (root.document.readyState === 'complete' || root.document.readyState === 'interactive')) boot();
  else if (root.document) root.document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : this);
