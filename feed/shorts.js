/* Info Book Shorts — Reddit clips (Braynix, BeAmazed and the rest).
   YouTube is kept out of the reel on the client. The Worker may still list
   YouTube items in feed.json for other cards; Shorts ignores them.
   Mixkit stays as an offline/empty fallback only. */
(() => {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const root = typeof window !== 'undefined' ? window : globalThis;
  const FEED_DEFAULT = 'https://shane-my-feed-data.phoneapp12.workers.dev/feed.json';
  const MAX_DUR = 90;
  const YT_EVERY = 5;
  /* r/BeAmazed is the live-reel source that best matches Shane asking for more
     "braining" shorts. Boost it to about one in three, without repeating clips. */
  const BOOST_SUBS = { beamazed: 1 };
  const BOOST_EVERY = 3;
  const BRAYNIX_AUTHOR = 'braynixgames';
  const CMAF_RES = ['CMAF_720', 'CMAF_480', 'DASH_720', 'DASH_480', 'CMAF_360', 'DASH_360'];
  const CMAF_AUDIO = ['CMAF_AUDIO_128', 'CMAF_AUDIO_64', 'DASH_AUDIO_128', 'DASH_audio'];

  const ALLOW_SUBS = {
    aww: 1, animalsbeingderps: 1, animalsbeingbros: 1, animalsbeingfunny: 1,
    mademesmile: 1, beamazed: 1, unexpectedlywholesome: 1, rarepuppers: 1,
    startledcats: 1, catsareliquid: 1, cats: 1, whatswrongwithyourdog: 1,
    likeus: 1, eyebleach: 1, funnyanimals: 1, contagiouslaughter: 1,
    oddlysatisfying: 1, robotics: 1, scuba: 1, castiron: 1, homegym: 1,
    beekeeping: 1, gardening: 1, nzgardening: 1, nzbirds: 1, diynz: 1, diy: 1,
    crafts: 1, cleaningtips: 1, upcycling: 1, camping: 1, campingandhiking: 1,
    tramping: 1, horses: 1, crystals: 1, gemstones: 1, tarotdecks: 1,
    antiques: 1, opticalillusions: 1, synthesizers: 1, glutenfreebaking: 1,
    ballet: 1, oldnz: 1
  };
  /* Crude-named subs stay out, even if the feed already has them. */
  const BLOCK_SUBS = { interestingasfuck: 1, natureisfuckinglit: 1, nextfuckinglevel: 1, satisfyingasfuck: 1 };

  const EDU_SRC = {
    'yt-ted': 'TED',
    'fun-kurzgesagt': 'Kurzgesagt',
    'yt-nasa': 'NASA',
    'yt-natgeo': 'National Geographic',
    'yt-bbcearth': 'BBC Earth',
    'yt-crashcourse': 'Crash Course',
    'yt-veritasium': 'Veritasium',
    'fun-smarter': 'SmarterEveryDay',
    'yt-oversimplified': 'OverSimplified',
    'kids-yt-scishowkids': 'SciShow Kids'
  };

  const SPORT = /\b(sports?|rugby|all blacks|black ferns|super rugby|league|nrl|warriors|cricket|black ?caps|netball|silver ferns|football|soccer|fifa|premier league|afl|basketball|nba|nfl|nhl|mlb|golf|tennis|hockey|motorsport|formula ?1|\bf1\b|grand prix|boxing|ufc|mma|wrestling|athletics|olympics?|world cup|match day|stadium|touchdown|wicket|playoffs?)\b/i;
  const NSFW = /\b(nsfw|nsfl|over_?18|nud(e|es|ity)|naked|porn(o|ography)?|onlyfans|xxx|erotic|lingerie|sensual|sexy|sexual|gore|nsfl)\b/i;
  const NOT_WANT = /\b(drunk|beer|wine|vodka|drugs?|weed|cannabis|murder|shoot\w*|gun|war|injur\w*|funeral|abuse|tinder|dating|divorce|wtf|f\*+|sh\*t)\b/i;
  const HOSTS = /(^|\.)((assets\.)?mixkit\.co|upload\.wikimedia\.org|videos\.pexels\.com|cdn\.pixabay\.com)$/i;
  const EMBED_HOSTS = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com)$/i;

  /* Curated portrait Mixkit MP4s — used only when the feed has nothing to show. */
  const FALLBACK = [
    { id: 'mk-51500', title: 'Turquoise waves on the sand', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51500/51500-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-1548', title: 'A dog panting in the sun', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1548/1548-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-51791', title: 'Forest and mountains from the air', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51791/51791-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-10428', title: 'Pouring a glass of orange juice', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/10428/10428-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-1545', title: 'White cat with blue eyes', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1545/1545-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-51502', title: 'Waves on a rocky coast', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51502/51502-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-12171', title: 'Parmesan over spaghetti', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/12171/12171-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-1487', title: 'A red frog on a log', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1487/1487-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-40657', title: 'A meadow in the sun', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/40657/40657-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-1197', title: 'Seagulls on a wooden pier', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1197/1197-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-1186', title: 'Small pink flowers', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1186/1186-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-26094', title: 'Cutting a sandwich', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/26094/26094-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-51501', title: 'Flying over a mangrove swamp', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/51501/51501-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-1541', title: 'A black cat in its house', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1541/1541-720.mp4', kind: 'mp4', fallback: true },
    { id: 'mk-1164', title: 'Waves in the water', credit: 'Mixkit', license: 'Mixkit License', width: 720, height: 1280, url: 'https://assets.mixkit.co/videos/1164/1164-720.mp4', kind: 'mp4', fallback: true }
  ];

  function isPortrait(width, height) {
    const w = +width, h = +height;
    return w > 0 && h > 0 && w < h;
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
  function isAllowedTopic(text) {
    const s = String(text || '');
    return !SPORT.test(s) && !NSFW.test(s) && !NOT_WANT.test(s);
  }
  function durationOk(sec) {
    if (sec == null || sec === '' || !isFinite(+sec) || +sec <= 0) return true;
    return +sec <= MAX_DUR;
  }
  function subredditOf(item) {
    const u = String((item && (item.url || item.permalink || item.link)) || '');
    const m = u.match(/reddit\.com\/r\/([^/?#]+)/i);
    return m ? m[1] : '';
  }
  function isAllowedSub(sub) {
    const s = String(sub || '').toLowerCase();
    if (!s || BLOCK_SUBS[s]) return false;
    return !!ALLOW_SUBS[s];
  }
  function isEduSource(src) { return !!EDU_SRC[src]; }

  function itemText(item) {
    return [item && item.t, item && item.title, item && item.s, item && item.tag, item && item.sn].join(' ');
  }
  function memberAllows(item, profile) {
    if (!item) return false;
    if (!isAllowedTopic(itemText(item))) return false;
    try { if (typeof unsafe === 'function' && unsafe(item)) return false; } catch (e) { }
    const topic = item.topic;
    if (profile) {
      const pick = profile.pick;
      const optIn = profile.optIn || [];
      if (pick && pick.length && topic && !['all', 'liked', 'family'].includes(topic) && pick.indexOf(topic) < 0) return false;
      const optin = { parent: 1, rainbow: 1, social: 1, candy: 1, pets: 1, nd: 1, hp: 1, monarch: 1, aiassist: 1, smart: 1, innov: 1, celeb: 1 };
      if (topic && optin[topic] && optIn.indexOf(topic) < 0 && !(pick && pick.indexOf(topic) >= 0)) return false;
      const off = profile.intOff || {};
      if (topic && typeof INTERESTS !== 'undefined' && Array.isArray(INTERESTS)) {
        const names = INTERESTS.filter(x => x && x.topic === topic).map(x => x.name);
        if (names.length && names.every(n => off[n])) return false;
      }
      return true;
    }
    try { if (topic && typeof topicOn === 'function' && !topicOn(topic)) return false; } catch (e) { }
    try { if (typeof intHidden === 'function' && intHidden(item)) return false; } catch (e) { }
    return true;
  }

  function redditSrc(vu, res) {
    return 'https://v.redd.it/' + vu + '/' + res + '.mp4';
  }
  function isRedditClip(item) {
    return !!(item && item.vk === 'reddit' && item.vu);
  }
  function filterReddit(items, profile) {
    const out = [];
    const seen = {};
    for (const it of items || []) {
      if (!isRedditClip(it)) continue;
      if (!durationOk(it.vdur)) continue;
      const sub = subredditOf(it);
      const author = String(it.by || it.author || '').replace(/^u\//i, '').toLowerCase();
      const bray = author === BRAYNIX_AUTHOR || isBraynix(it, null);
      if (!isAllowedSub(sub) && !bray) continue;
      if (!memberAllows(it, profile)) continue;
      if (seen[it.vu]) continue;
      seen[it.vu] = 1;
      out.push({
        kind: 'reddit',
        id: 'rd-' + it.vu,
        vu: it.vu,
        title: it.t || it.title || 'Reddit clip',
        credit: bray ? braynixCredit({ sub, credit: 'r/' + sub }) : ('r/' + sub),
        url: it.url || ('https://www.reddit.com/r/' + sub),
        topic: it.topic || '',
        src: it.src || '',
        vdur: it.vdur,
        permalink: it.url,
        author: author || undefined,
        by: author || undefined,
        braynix: bray || undefined
      });
    }
    return out;
  }
  function filterEduYoutube(items, profile) {
    const out = [], seen = {};
    for (const it of items || []) {
      const vid = it && (it.vid || it.videoId);
      if (!vid || !isEduSource(it.src)) continue;
      if (!memberAllows(it, profile)) continue;
      if (seen[vid]) continue;
      seen[vid] = 1;
      out.push({
        kind: 'youtube',
        lane: 'edu',
        id: 'yt-' + vid,
        videoId: vid,
        title: it.t || it.title || EDU_SRC[it.src],
        credit: EDU_SRC[it.src] || it.sn || 'YouTube',
        topic: it.topic || '',
        src: it.src,
        url: it.url || ('https://www.youtube.com/watch?v=' + vid)
      });
    }
    return out;
  }
  function top40Clips(pack, profile) {
    if (profile ? !memberAllows({ topic: 'music', t: 'Top 40' }, profile) : (typeof topicOn === 'function' && !topicOn('music'))) return [];
    const songs = (pack && pack.songs) || [];
    return songs.filter(s => s && (s.videoId || s.vid)).map(s => ({
      kind: 'youtube',
      lane: 'music',
      id: 't40-' + (s.videoId || s.vid),
      videoId: s.videoId || s.vid,
      title: (s.artist ? s.artist + ' — ' : '') + (s.title || 'Top 40'),
      credit: 'NZ Top 40',
      topic: 'music',
      src: 'top40',
      url: s.url || ('https://www.youtube.com/watch?v=' + (s.videoId || s.vid))
    }));
  }
  function braynixVuSet(pack) {
    const set = {};
    const clips = (pack && pack.clips) || [];
    for (const c of clips) if (c && c.vu) set[c.vu] = 1;
    return set;
  }
  function isBraynix(it, pack) {
    if (!it) return false;
    if (it.braynix) return true;
    const author = String(it.author || it.by || it.u || '').replace(/^u\//i, '').toLowerCase();
    if (author === BRAYNIX_AUTHOR) return true;
    const url = String(it.url || it.permalink || it.credit || '');
    if (/\/user\/braynixgames\b/i.test(url) || /\/u\/braynixgames\b/i.test(url)) return true;
    if (it.vu && pack && braynixVuSet(pack)[it.vu]) return true;
    return false;
  }
  function braynixCredit(it) {
    const sub = (it && (it.sub || it.credit)) ? String(it.sub || it.credit).replace(/^r\//i, '') : '';
    const nice = sub && sub.toLowerCase() !== 'u_braynixgames' ? 'r/' + sub : '';
    return nice ? ('Braynix Games · ' + nice) : 'Braynix Games';
  }
  function braynixClips(pack, profile) {
    const out = [], seen = {};
    for (const c of (pack && pack.clips) || []) {
      if (!c || !c.vu || seen[c.vu]) continue;
      if (c.width && c.height && !isPortrait(c.width, c.height)) continue;
      if (!durationOk(c.vdur)) continue;
      const item = {
        kind: 'reddit',
        braynix: true,
        id: 'bn-' + c.vu,
        vu: c.vu,
        title: c.title || 'Braynix Games',
        credit: braynixCredit(c),
        author: BRAYNIX_AUTHOR,
        url: c.url,
        permalink: c.url,
        topic: c.topic || 'games',
        src: 'braynix',
        vdur: c.vdur,
        width: c.width,
        height: c.height,
        sub: c.sub || ''
      };
      if (!memberAllows(item, profile)) continue;
      if (!isAllowedTopic(itemText(item))) continue;
      seen[c.vu] = 1;
      out.push(item);
    }
    return out;
  }
  function mergeBraynix(reddit, pack, profile) {
    const local = braynixClips(pack, profile);
    const byVu = {};
    for (const it of local) byVu[it.vu] = it;
    const out = [];
    const seen = {};
    for (const it of local) {
      out.push(it);
      seen[it.vu] = 1;
    }
    for (const it of reddit || []) {
      if (it.vu && seen[it.vu]) continue;
      if (it.vu && byVu[it.vu] || isBraynix(it, pack)) {
        out.push(Object.assign({}, it, { braynix: true, author: BRAYNIX_AUTHOR, credit: braynixCredit(Object.assign({ sub: it.credit }, it)) }));
      } else {
        out.push(it);
      }
      if (it.vu) seen[it.vu] = 1;
    }
    return out;
  }
  function frontLoad(items, pred) {
    const head = [], tail = [];
    for (const it of items || []) (pred(it) ? head : tail).push(it);
    return head.concat(boostSource(tail));
  }

  const LOVE_STOP = { the:1, and:1, for:1, with:1, this:1, that:1, from:1, your:1, you:1, comment:1, plz:1, please:1, what:1, left:1, right:1, or:1 };
  function loveKey(it) { return (it && (it.id || it.vu || it.videoId)) ? String(it.id || it.vu || it.videoId) : ''; }
  function readLoves() {
    try { if (typeof ls !== 'undefined' && ls.get) return ls.get('shortsLoves', {}) || {}; } catch (e) { }
    return {};
  }
  function writeLoves(map) {
    try { if (typeof ls !== 'undefined' && ls.set) { ls.set('shortsLoves', map); if (typeof famPrefsChanged === 'function') famPrefsChanged(); } } catch (e) { }
  }
  function isLoved(it, loves) {
    const map = loves || readLoves();
    const k = loveKey(it);
    return !!(k && map[k]);
  }
  function loveRecord(it) {
    const sub = (it.sub || ((it.credit || '').replace(/^.*\br\//i, '').split(/\s/)[0]) || '').replace(/^r\//i, '');
    const author = String(it.author || it.by || (isBraynix(it) ? BRAYNIX_AUTHOR : '')).replace(/^u\//i, '').toLowerCase();
    return {
      at: Date.now(),
      vu: it.vu || '',
      videoId: it.videoId || '',
      id: it.id || '',
      sub: sub,
      author: author,
      src: it.src || '',
      topic: it.topic || '',
      title: it.title || '',
      kind: it.kind || ''
    };
  }
  function setLoved(it, on, loves) {
    const map = Object.assign({}, loves || readLoves());
    const k = loveKey(it);
    if (!k) return map;
    if (on) map[k] = loveRecord(it);
    else delete map[k];
    writeLoves(map);
    return map;
  }
  function loveWords(title) {
    return String(title || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !LOVE_STOP[w]);
  }
  function loveScore(it, recs) {
    if (!it || !recs || !recs.length) return 0;
    let s = 0;
    const sub = String(it.sub || (it.credit || '').replace(/^.*\br\//i, '').split(/[^A-Za-z0-9_]/)[0] || '').replace(/^r\//i, '').toLowerCase();
    const author = String(it.author || it.by || '').replace(/^u\//i, '').toLowerCase();
    const words = new Set(loveWords(it.title));
    for (const r of recs) {
      if (r.vu && it.vu && r.vu === it.vu) s += 6;
      if (r.videoId && it.videoId && r.videoId === it.videoId) s += 6;
      if (r.author && author && r.author === author) s += 3;
      if (r.sub && sub && r.sub.toLowerCase() === sub) s += 2;
      if (r.src && it.src && r.src === it.src) s += 2;
      if (r.topic && it.topic && r.topic === it.topic) s += 1;
      for (const w of loveWords(r.title)) if (words.has(w)) s += 1;
    }
    return s;
  }
  function interleavePreferred(preferred, rest, every) {
    const step = every || 3;
    const a = (preferred || []).slice(), b = (rest || []).slice();
    if (!a.length) return b;
    const out = [];
    let ai = 0, bi = 0;
    while (ai < a.length || bi < b.length) {
      if ((out.length % step) === 0 && ai < a.length) out.push(a[ai++]);
      else if (bi < b.length) out.push(b[bi++]);
      else out.push(a[ai++]);
    }
    return out;
  }
  function loveRank(items, loves, pack) {
    const recs = Object.values(loves || {});
    const list = (items || []).slice();
    if (!recs.length) return list;
    const head = [], tail = [];
    for (const it of list) (isBraynix(it, pack) ? head : tail).push(it);
    const amaz = tail.filter(isBoosted);
    const sim = tail.filter(it => !isBoosted(it) && loveScore(it, recs) > 0);
    const other = tail.filter(it => !isBoosted(it) && loveScore(it, recs) <= 0);
    if (!sim.length) return list;
    return head.concat(boostSource(interleavePreferred(sim, other, 3).concat(amaz)));
  }

  function isBoosted(it) {
    if (!it) return false;
    const credit = String(it.credit || '');
    const fromCredit = /^r\//i.test(credit) ? credit.slice(2) : '';
    const sub = fromCredit || it.sub || (it.url && (it.url.match(/reddit\.com\/r\/([^/]+)/i) || [])[1]) || '';
    return !!BOOST_SUBS[String(sub).toLowerCase()];
  }
  function boostSource(items, every) {
    const step = every || BOOST_EVERY;
    const list = items || [];
    const boost = list.filter(isBoosted);
    const rest = list.filter(it => !isBoosted(it));
    if (!boost.length) return list.slice();
    const out = [];
    let bi = 0, ri = 0;
    while (bi < boost.length || ri < rest.length) {
      if ((out.length % step) === 0 && bi < boost.length) out.push(boost[bi++]);
      else if (ri < rest.length) out.push(rest[ri++]);
      else out.push(boost[bi++]);
    }
    return out;
  }
  function mixLane(reddit, youtube, every) {
    const step = every || YT_EVERY;
    const r = (reddit || []).slice(), y = (youtube || []).slice();
    if (!y.length) return r;
    if (!r.length) return y;
    const out = [];
    let yi = 0;
    for (let i = 0; i < r.length; i++) {
      out.push(r[i]);
      if ((out.length % step) === (step - 1) && yi < y.length) out.push(y[yi++]);
    }
    if (yi === 0 && y.length) out.push(y[yi++]);
    return out;
  }
  function isYoutubeClip(it) {
    if (!it) return false;
    if (it.kind === 'youtube') return true;
    if (it.videoId && !it.vu) return true;
    const u = String(it.url || '') + ' ' + String(it.src || '') + ' ' + String(it.credit || '');
    return /(?:youtube\.com|youtu\.be|youtube-nocookie)/i.test(u);
  }
  function withoutYoutube(items) {
    return (items || []).filter(it => !isYoutubeClip(it));
  }
  function filterPortrait(items) {
    return (items || []).filter(it => {
      if (it && it.kind === 'youtube') return !!it.videoId;
      if (it && it.kind === 'reddit') return !!it.vu;
      return it && isDirectVideo(it.url) && isPortrait(it.width, it.height) && isAllowedTopic((it.title || '') + ' ' + (it.credit || ''));
    });
  }

  function filterPeertube(items, profile) {
    const out = [], seen = {};
    for (const it of items || []) {
      if (!it || it.vk !== 'peertube') continue;
      const mp4 = it.ext || it.url;
      if (!mp4 || !/\.mp4(\?|$)/i.test(mp4)) continue;
      if (!durationOk(it.vdur)) continue;
      if (it.vw && it.vh && !isPortrait(it.vw, it.vh)) continue;
      if (!memberAllows(it, profile)) continue;
      if (seen[mp4] || seen[it.vu]) continue;
      if (it.vu) seen[it.vu] = 1;
      seen[mp4] = 1;
      out.push({
        kind: 'mp4', id: 'pt-' + (it.vu || it.id), title: it.t || it.title || 'PeerTube clip',
        credit: it.sn || 'PeerTube', url: mp4, topic: it.topic || '', src: it.src || '',
        width: it.vw, height: it.vh, at: it.at
      });
    }
    return out;
  }
  function weave(a, b, every) {
    if (!b || !b.length) return (a || []).slice();
    if (!a || !a.length) return b.slice();
    const out = [];
    let bi = 0, step = Math.max(2, every || 5);
    for (let i = 0; i < a.length; i++) {
      out.push(a[i]);
      if (((i + 1) % step) === 0 && bi < b.length) out.push(b[bi++]);
    }
    while (bi < b.length) out.push(b[bi++]);
    return out;
  }

  function buildCatalog(feed, top40, profile, braynixPack, loves) {
    const items = (feed && feed.items) || feed || [];
    const reddit = filterReddit(items, profile);
    const edu = filterEduYoutube(items, profile);
    const music = top40Clips(top40, profile);
    /* YouTube music/education still exists in the feed and Top 40, but Shorts
       no longer mixes those clips into the reel. */
    const youtube = [];
    const braynix = braynixClips(braynixPack, profile);
    const peertube = filterPeertube(items, profile);
    const merged = mergeBraynix(reddit, braynixPack, profile);
    const mixed = withoutYoutube(loveRank(weave(frontLoad(merged, it => isBraynix(it, braynixPack)), peertube, 5), loves || readLoves(), braynixPack));
    return { reddit: merged, braynix, edu, music, youtube, mixed, fallback: filterPortrait(FALLBACK) };
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function readFeed() {
    try {
      if (typeof FEED !== 'undefined' && FEED && Array.isArray(FEED.items) && FEED.items.length) return FEED;
    } catch (e) { }
    try {
      if (typeof ls !== 'undefined' && ls.get) {
        const cached = ls.get('feed', null);
        if (cached && Array.isArray(cached.items) && cached.items.length) return cached;
      }
    } catch (e) { }
    const url = (typeof FEED_URL !== 'undefined' && FEED_URL) || FEED_DEFAULT;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('feed ' + r.status);
    return r.json();
  }
  async function readTop40() {
    try {
      if (typeof TOP40 !== 'undefined' && TOP40 && Array.isArray(TOP40.songs) && TOP40.songs.length) return TOP40;
    } catch (e) { }
    const ver = (typeof APP_VERSION !== 'undefined' && APP_VERSION) || (typeof VERSION !== 'undefined' && VERSION) || '1.9.301';
    try {
      const r = await fetch('top40-local.json?v=' + ver, { cache: 'no-store' });
      if (r.ok) return r.json();
    } catch (e) { }
    return { songs: [] };
  }
  async function readBraynix() {
    try {
      if (typeof BRAYNIX !== 'undefined' && BRAYNIX && Array.isArray(BRAYNIX.clips)) return BRAYNIX;
    } catch (e) { }
    const ver = (typeof APP_VERSION !== 'undefined' && APP_VERSION) || (typeof VERSION !== 'undefined' && VERSION) || '1.9.304';
    try {
      const r = await fetch('braynix-local.json?v=' + ver, { cache: 'no-store' });
      if (r.ok) return r.json();
    } catch (e) { }
    return { clips: [] };
  }

  let on = false, hist = false, muted = true, catalog = [], io = null, reel = null, shell = null, audioEl = null, lastTapAt = 0, lastTapSlide = null, singleTapT = 0, playingI = -1;

  function stopAudio() {
    if (!audioEl) return;
    try { audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); } catch (e) { }
    audioEl = null;
  }
  function startRedditAudio(vu, video) {
    stopAudio();
    if (!vu || muted) return;
    let i = 0;
    const au = new Audio(redditSrc(vu, CMAF_AUDIO[0]));
    audioEl = au;
    au.onerror = () => {
      if (audioEl !== au) return;
      i += 1;
      if (i < CMAF_AUDIO.length) au.src = redditSrc(vu, CMAF_AUDIO[i]);
    };
    try { au.currentTime = video && video.currentTime || 0; } catch (e) { }
    au.play().catch(() => { });
    if (video) {
      video.addEventListener('pause', () => { if (audioEl === au) au.pause(); }, { once: false });
      video.addEventListener('ended', () => { if (audioEl === au) au.pause(); });
      const iv = setInterval(() => {
        if (audioEl !== au || !video.isConnected) { au.pause(); clearInterval(iv); return; }
        if (Math.abs(au.currentTime - video.currentTime) > 0.4) {
          try { au.currentTime = video.currentTime; } catch (e) { }
        }
      }, 1000);
    }
  }
  function ytUrl(id) {
    let origin = '';
    try { origin = '&origin=' + encodeURIComponent(location.origin); } catch (e) { }
    return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id)
      + '?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&autoplay=1&mute=' + (muted ? '1' : '0') + origin;
  }
  function ytCommand(frame, fn) {
    try { frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: [] }), '*'); } catch (e) { }
  }

  function capHtml(it) {
    if (it.kind === 'youtube') {
      return `<div class="sh-ytlab">YouTube · may show ads</div>
        <div class="sh-cap">${escapeHtml(it.title)} · ${escapeHtml(it.credit)}</div>`;
    }
    if (it.kind === 'reddit') {
      const href = escapeHtml(it.permalink || it.url || '');
      return `<div class="sh-cap"><a class="sh-credit" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(it.title)} · ${escapeHtml(it.credit)}</a></div>`;
    }
    const bits = [it.title, it.credit, it.license].filter(Boolean);
    return `<div class="sh-cap">${escapeHtml(bits.join(' · '))}</div>`;
  }
  function slideHtml(it, i) {
    if (it.kind === 'youtube') {
      return `<section class="sh-slide sh-yt" data-sh-i="${i}" data-sh-kind="youtube" data-sh-id="${escapeHtml(it.id)}">
        <iframe title="${escapeHtml(it.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        ${capHtml(it)}
        <div class="sh-paused" hidden>▶</div>
      </section>`;
    }
    const preload = i <= 1 ? 'auto' : 'none';
    return `<section class="sh-slide" data-sh-i="${i}" data-sh-kind="${escapeHtml(it.kind || 'mp4')}" data-sh-id="${escapeHtml(it.id)}">
      <video playsinline webkit-playsinline loop muted preload="${preload}"></video>
      ${capHtml(it)}
      <div class="sh-paused" hidden>▶</div>
    </section>`;
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
      <button type="button" class="sh-love" data-sh-love aria-label="Loved" hidden>♥</button>
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
      const d = Math.abs(s.offsetTop + s.offsetHeight * 0.5 - mid);
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
  function paintLove() {
    const btn = shell && shell.querySelector('[data-sh-love]');
    if (!btn) return;
    const it = catalog[visibleIndex()];
    const onLove = !!(it && isLoved(it));
    btn.hidden = !onLove;
    btn.classList.toggle('on', onLove);
    btn.setAttribute('aria-pressed', onLove ? 'true' : 'false');
    btn.setAttribute('aria-label', onLove ? 'Unlove' : 'Loved');
  }
  function showHeartBurst(slide, ev) {
    if (!slide) return;
    const burst = document.createElement('div');
    burst.className = 'sh-burst';
    burst.textContent = '♥';
    const r = slide.getBoundingClientRect();
    const x = ev && ev.clientX ? ev.clientX - r.left : r.width / 2;
    const y = ev && ev.clientY ? ev.clientY - r.top : r.height / 2;
    burst.style.left = x + 'px';
    burst.style.top = y + 'px';
    slide.appendChild(burst);
    setTimeout(() => { try { burst.remove(); } catch (e) { } }, 700);
  }
  function loveVisible(on, ev) {
    const i = visibleIndex();
    const it = catalog[i];
    const slide = slides()[i];
    if (!it) return;
    setLoved(it, on);
    paintLove();
    if (on && ev) showHeartBurst(slide, ev);
  }

  function skipSlide(slide, reason) {
    const i = slides().indexOf(slide);
    if (i < 0) return;
    slide.remove();
    catalog.splice(i, 1);
    playingI = -1;
    if (!on) return;
    if (!catalog.length) {
      reel.innerHTML = `<p class="sh-empty">No clips could be played just now.</p>`;
      return;
    }
    watchVisible();
    playAt(Math.min(i, catalog.length - 1));
  }

  function attachReddit(video, it, resIndex) {
    const n = resIndex || 0;
    const src = redditSrc(it.vu, CMAF_RES[n] || CMAF_RES[0]);
    video.dataset.ri = String(n);
    video.dataset.vu = it.vu;
    if (video.getAttribute('src') !== src && video.currentSrc !== src) video.src = src;
    video.loop = true;
    video.muted = true; /* sound is on the separate audio track, or left muted until unmute */
    video.playsInline = true;
  }
  function attachMixkit(video, it) {
    if (it && it.url && video.getAttribute('src') !== it.url && video.currentSrc !== it.url) video.src = it.url;
    video.loop = true;
    video.muted = muted;
    video.playsInline = true;
  }

  function onMeta(ev) {
    const v = ev.target;
    const slide = v.closest('.sh-slide');
    if (!slide) return;
    if (v.duration && !durationOk(v.duration)) { skipSlide(slide, 'long'); return; }
    if (v.videoWidth && v.videoHeight && !isPortrait(v.videoWidth, v.videoHeight)) skipSlide(slide, 'landscape');
  }
  function onVidErr(ev) {
    const v = ev.target;
    const slide = v.closest && v.closest('.sh-slide');
    const it = catalog[slides().indexOf(slide)];
    if (!it || it.kind !== 'reddit') { if (slide) skipSlide(slide, 'gone'); return; }
    const n = (+v.dataset.ri || 0) + 1;
    if (n < CMAF_RES.length) { attachReddit(v, it, n); if (!v.paused) v.play().catch(() => { }); return; }
    skipSlide(slide, 'gone');
  }

  function applyPreload(i) {
    slides().forEach((s, j) => {
      const it = catalog[j];
      if (!it) return;
      const near = j === i || j === i + 1 || j === i - 1;
      if (it.kind === 'youtube') {
        const f = s.querySelector('iframe');
        if (!f) return;
        if (near && j === i) {
          if (f.getAttribute('data-loaded') !== it.videoId + (muted ? '-m' : '-s')) {
            f.setAttribute('data-loaded', it.videoId + (muted ? '-m' : '-s'));
            f.src = ytUrl(it.videoId);
          }
        } else if (!near && f.src && f.src !== 'about:blank') {
          f.removeAttribute('data-loaded');
          f.src = 'about:blank';
        }
        return;
      }
      const v = s.querySelector('video');
      if (!v) return;
      if (near) {
        if (it.kind === 'reddit' && v.dataset.vu !== it.vu) attachReddit(v, it, 0);
        if (it.kind === 'mp4' && v.getAttribute('data-loaded') !== it.url) { v.setAttribute('data-loaded', it.url); attachMixkit(v, it); }
        v.preload = (j === i || j === i + 1) ? 'auto' : 'metadata';
      } else {
        v.preload = 'none';
        if (!v.paused) try { v.pause(); } catch (e) { }
        if (v.getAttribute('src') || v.dataset.vu) {
          v.removeAttribute('data-loaded');
          v.removeAttribute('data-vu');
          v.removeAttribute('src');
          try { v.load(); } catch (e) { }
        }
      }
    });
  }

  function playAt(i) {
    if (i < 0 || i >= catalog.length) return;
    paintLove();
    if (i === playingI) {
      const s = slides()[i], it = catalog[i], v = s && s.querySelector('video');
      if (v && it && it.kind !== 'youtube' && v.paused) {
        v.muted = it.kind === 'reddit' ? true : muted;
        const go = v.play();
        if (go && go.catch) go.catch(() => { v.muted = true; v.play().catch(() => { }); });
      }
      return;
    }
    playingI = i;
    slides().forEach((s, j) => {
      const it = catalog[j];
      s.classList.toggle('on', j === i);
      if (it && it.kind === 'youtube') {
        const f = s.querySelector('iframe');
        if (!f) return;
        if (j === i) {
          if (f.getAttribute('data-loaded') !== it.videoId + (muted ? '-m' : '-s')) {
            f.setAttribute('data-loaded', it.videoId + (muted ? '-m' : '-s'));
            f.src = ytUrl(it.videoId);
          } else {
            ytCommand(f, muted ? 'mute' : 'unMute');
            ytCommand(f, 'playVideo');
          }
        } else {
          ytCommand(f, 'pauseVideo');
        }
        return;
      }
      const v = s.querySelector('video');
      if (!v || !it) return;
      if (j === i) {
        if (it.kind === 'reddit') attachReddit(v, it, +v.dataset.ri || 0);
        if (it.kind === 'mp4') attachMixkit(v, it);
        v.muted = it.kind === 'reddit' ? true : muted;
        const go = v.play();
        if (go && go.catch) go.catch(() => { v.muted = true; v.play().catch(() => { }); });
        if (it.kind === 'reddit' && !muted) startRedditAudio(it.vu, v);
        else if (it.kind !== 'reddit') stopAudio();
      } else {
        try { v.pause(); } catch (e) { }
      }
    });
    applyPreload(i);
  }

  function renderReel(items) {
    catalog = items.slice();
    playingI = -1;
    if (!catalog.length) {
      reel.innerHTML = `<p class="sh-empty">No shorts are ready just now. Try again when the feed has refreshed.</p>`;
      return;
    }
    reel.innerHTML = catalog.map((it, i) => slideHtml(it, i)).join('');
    slides().forEach((s, i) => {
      const v = s.querySelector('video');
      if (!v) return;
      v.addEventListener('loadedmetadata', onMeta);
      v.addEventListener('error', onVidErr);
      const it = catalog[i];
      if (i <= 1 && it) {
        if (it.kind === 'reddit') attachReddit(v, it, 0);
        if (it.kind === 'mp4') attachMixkit(v, it);
      }
    });
  }

  function watchVisible() {
    if (io) { try { io.disconnect(); } catch (e) { } io = null; }
    if (!('IntersectionObserver' in root) || !reel) {
      if (reel) reel.addEventListener('scroll', () => { if (on) playAt(visibleIndex()); }, { passive: true });
      playAt(0);
      return;
    }
    io = new IntersectionObserver(entries => {
      const onScreen = entries.filter(e => e.isIntersecting && e.intersectionRatio >= 0.65)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!onScreen) return;
      const i = slides().indexOf(onScreen.target);
      if (i >= 0 && i !== playingI) playAt(i);
    }, { root: reel, threshold: [0.65, 0.9] });
    slides().forEach(s => io.observe(s));
    playAt(0);
  }

  function togglePause(slide) {
    const it = catalog[slides().indexOf(slide)];
    const mark = slide.querySelector('.sh-paused');
    if (it && it.kind === 'youtube') {
      const f = slide.querySelector('iframe');
      const paused = mark && !mark.hidden;
      if (f) ytCommand(f, paused ? 'playVideo' : 'pauseVideo');
      if (mark) mark.hidden = !paused;
      return;
    }
    const v = slide.querySelector('video');
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => { });
      if (it && it.kind === 'reddit' && !muted) startRedditAudio(it.vu, v);
      if (mark) mark.hidden = true;
    } else {
      v.pause();
      if (audioEl) audioEl.pause();
      if (mark) mark.hidden = false;
    }
  }

  function startWith(items) {
    if (!on) return;
    renderReel(items);
    if (reel) reel.scrollTop = 0;
    watchVisible();
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
    if (reel) reel.innerHTML = `<p class="sh-empty">Loading shorts…</p>`;
    Promise.all([readFeed(), readTop40(), readBraynix()]).then(([feed, top40, braynixPack]) => {
      if (!on) return;
      const built = buildCatalog(feed, top40, null, braynixPack);
      const list = built.mixed.length ? built.mixed : built.fallback;
      startWith(list);
    }).catch(() => {
      if (on) startWith(filterPortrait(FALLBACK));
    });
  }

  function close(fromPop) {
    if (!on) return;
    on = false;
    playingI = -1;
    document.documentElement.classList.remove('ib-shorts-on');
    if (io) { try { io.disconnect(); } catch (e) { } io = null; }
    stopAudio();
    slides().forEach(s => {
      const v = s.querySelector('video');
      if (v) { try { v.pause(); } catch (e) { } v.removeAttribute('src'); try { v.load(); } catch (e) { } }
      const f = s.querySelector('iframe');
      if (f) f.src = 'about:blank';
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
      paintMute();
      const i = visibleIndex();
      const it = catalog[i];
      const slide = slides()[i];
      if (it && it.kind === 'youtube') {
        const f = slide && slide.querySelector('iframe');
        if (f) {
          f.setAttribute('data-loaded', it.videoId + (muted ? '-m' : '-s'));
          f.src = ytUrl(it.videoId);
        }
      } else if (it && it.kind === 'reddit') {
        const v = slide && slide.querySelector('video');
        if (v) v.muted = true;
        if (muted) stopAudio();
        else if (v) startRedditAudio(it.vu, v);
      } else {
        const v = slide && slide.querySelector('video');
        if (v) {
          v.muted = muted;
          if (!muted) v.play().catch(() => { muted = true; v.muted = true; paintMute(); });
        }
      }
      return;
    }
    if (t.closest && t.closest('a.sh-credit')) return;
    if (t.closest && t.closest('[data-sh-love]')) {
      e.preventDefault();
      loveVisible(false);
      return;
    }
    const slide = t.closest && t.closest('.sh-slide');
    if (!slide) return;
    e.preventDefault();
    const now = Date.now();
    if (lastTapSlide === slide && now - lastTapAt < 320) {
      if (singleTapT) { clearTimeout(singleTapT); singleTapT = 0; }
      lastTapAt = 0;
      lastTapSlide = null;
      loveVisible(true, e);
      return;
    }
    lastTapAt = now;
    lastTapSlide = slide;
    if (singleTapT) clearTimeout(singleTapT);
    singleTapT = setTimeout(() => { singleTapT = 0; if (on) togglePause(slide); }, 280);
  }

  if (root.addEventListener) {
    root.addEventListener('click', onClick);
    root.addEventListener('popstate', () => { if (on) { hist = false; close(true); } });
    root.addEventListener('keydown', e => { if (on && e.key === 'Escape') close(); });
  }

  root.ibShortsOpen = open;
  root.ibShortsClose = close;
  root.ibShorts = {
    isPortrait, isDirectVideo, isAllowedTopic, isAllowedSub, isEduSource, isRedditClip,
    durationOk, subredditOf, memberAllows, filterReddit, filterPeertube, filterEduYoutube, top40Clips, weave,
    mixLane, filterPortrait, buildCatalog, FALLBACK, ALLOW_SUBS, EDU_SRC, MAX_DUR, YT_EVERY,
    isYoutubeClip, withoutYoutube,
    BOOST_SUBS, BOOST_EVERY, isBoosted, boostSource,
    BRAYNIX_AUTHOR, isBraynix, braynixClips, mergeBraynix, frontLoad,
    loveKey, isLoved, setLoved, loveScore, loveRank, loveWords, readLoves,
    SPORT, NSFW, NOT_WANT, open, close
  };
})();
