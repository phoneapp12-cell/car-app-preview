/* Info Book magazine article reader.
   Single-tap on a news, article or family post turns the page into a full
   magazine view. Wikipedia (lead, key sections, images, facts and related
   topics) is used when the topic clearly matches. A short source excerpt may
   be added through the feed worker. Nothing is invented. */
(function (root) {
  const WIKI_API = 'https://en.wikipedia.org/w/api.php';
  const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  const WIKI_MEDIA = 'https://en.wikipedia.org/api/rest_v1/page/media-list/';
  const WIKI_RELATED = 'https://en.wikipedia.org/api/rest_v1/page/related/';
  const WIKIDATA = 'https://www.wikidata.org/w/api.php';
  const CC_BY_SA = 'https://creativecommons.org/licenses/by-sa/4.0/';
  const WIKI_EN = 'https://en.wikipedia.org/wiki/';
  const ARTICLE_API = 'https://shane-my-feed-data.phoneapp12.workers.dev/article';
  const cache = new Map();
  let openOn = false, hist = false, turnTimer = 0, swipe = null;

  const SKIP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'near', 'over', 'into', 'onto', 'news', 'new', 'after', 'before', 'about', 'have', 'been', 'will', 'says', 'said', 'than', 'then', 'when', 'what', 'which', 'their', 'they', 'them', 'your', 'you', 'are', 'was', 'were', 'has', 'had', 'its', 'his', 'her', 'our', 'out', 'just', 'more', 'some', 'also', 'week', 'today', 'years', 'year', 'first', 'along', 'coast', 'south', 'north', 'east', 'west', 'here', 'there', 'could', 'would', 'should', 'might', 'under', 'still', 'already']);
  const GENERIC_TITLES = new Set(['new zealand', 'australia', 'united states', 'united kingdom', 'england', 'europe', 'asia', 'africa', 'world', 'news', 'the news', 'coast', 'island', 'islands', 'city', 'town', 'people', 'history', 'science', 'nature', 'weather', 'list of']);
  const SKIP_SECTIONS = /^(see also|references|further reading|external links|notes|bibliography|citations|sources|footnotes|gallery|publications|awards|honours|honors|selected works|discography|filmography|electoral history)\b/i;
  const FACT_PROPS = [
    ['P31', 'Type'], ['P17', 'Country'], ['P131', 'Located in'], ['P36', 'Capital'],
    ['P27', 'Citizenship'], ['P19', 'Born in'], ['P20', 'Died in'], ['P569', 'Born'],
    ['P570', 'Died'], ['P106', 'Occupation'], ['P50', 'Author'], ['P170', 'Creator'],
    ['P57', 'Director'], ['P86', 'Composer'], ['P175', 'Performer'], ['P495', 'Country of origin'],
    ['P571', 'Started'], ['P577', 'Published'], ['P585', 'Date'], ['P1082', 'Population'],
    ['P2046', 'Area'], ['P2044', 'Elevation'], ['P225', 'Scientific name'], ['P281', 'Postcode'],
    ['P1376', 'Capital of'], ['P36', 'Capital'], ['P37', 'Official language'], ['P38', 'Currency'],
    ['P1082', 'Population'], ['P2067', 'Mass'], ['P2043', 'Length'], ['P2048', 'Height']
  ];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function reduceMotion() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function doc() { return root.document; }
  function htmlEl() { return doc() && doc().documentElement; }

  function itemOf(cardOrId) {
    const id = typeof cardOrId === 'string' ? cardOrId : (cardOrId && cardOrId.dataset && cardOrId.dataset.id);
    if (!id) return null;
    try {
      if (typeof order !== 'undefined' && Array.isArray(order)) {
        const hit = order.find(x => x && x.id === id);
        if (hit) return hit;
      }
    } catch (e) {}
    try {
      if (typeof FEED !== 'undefined' && FEED && Array.isArray(FEED.items)) {
        const hit = FEED.items.find(x => x && x.id === id);
        if (hit) return hit;
      }
    } catch (e) {}
    try {
      if (typeof LIFE_BY_ID !== 'undefined' && LIFE_BY_ID && LIFE_BY_ID.get) {
        const hit = LIFE_BY_ID.get(id);
        if (hit) return hit;
      }
    } catch (e) {}
    return null;
  }

  function isFamilyPost(item, card) {
    if (item && (item._share || item.topic === 'family' || (item.kind === 'photo' && item.priv))) return true;
    if (card && card.classList && card.classList.contains('shared')) return true;
    return false;
  }
  function isFriend() {
    try { if (typeof IS_FRIEND !== 'undefined') return !!IS_FRIEND; } catch (e) {}
    return !!(root.IS_FRIEND);
  }
  function famOn() {
    try { if (typeof FAM_ON !== 'undefined') return !!FAM_ON; } catch (e) {}
    return !!(root.FAM_ON);
  }

  /* News, articles, photos with a story, and family/friend posts. Not games, My App life cards, or bare tool tiles. */
  function canOpen(card, item) {
    if (!card && !item) return false;
    item = item || itemOf(card);
    if (card) {
      if (card.classList.contains('life') || card.classList.contains('soon')) return false;
      if (card.querySelector('[data-art], [data-calopen]')) return false;
      if (card.closest && card.closest('.calwrap, .calbook-wrap, #ib-reader')) return false;
    }
    if (!item) return false;
    if (item.topic === 'life' || item.x === 'gamesoon' || item.x === 'row' || item.x === 'art3d') return false;
    if (isFamilyPost(item, card)) return !!(item.t || item.s || item.img);
    return !!(item.t || item.s) && !!(item.url || item.img || item.s);
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  /* Accept Wikipedia only when the title is clearly the same topic as the headline. */
  function closeMatch(wikiTitle, headline) {
    const a = norm(wikiTitle), b = norm(headline);
    if (!a || !b) return false;
    if (a === b) return true;
    const skip = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'near', 'over', 'into', 'news', 'new', 'zealand']);
    const significant = a.split(' ').filter(w => w.length > 3 && !skip.has(w));
    // A short title must be the subject of the headline, not a word that merely appears in it.
    if (b.startsWith(a + ' ') || b.startsWith('the ' + a + ' ') || b === 'the ' + a) return a.length >= 4;
    if (significant.length >= 2) {
      const wrd = b.split(' ');
      let n = 0; significant.forEach(w => { if (wrd.includes(w)) n++; });
      return n >= Math.max(2, Math.ceil(significant.length * 0.7));
    }
    return false;
  }

  function wikiTitleFromUrl(url) {
    const m = String(url || '').match(/https?:\/\/(?:[a-z]+\.)?wikipedia\.org\/wiki\/([^?#]+)/i);
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/_/g, ' ')); } catch (e) { return m[1].replace(/_/g, ' '); }
  }

  function extractEntities(headline, desc) {
    const out = [];
    const seen = new Set();
    function add(s) {
      const t = String(s || '').replace(/\s+/g, ' ').replace(/^[^A-Za-zĀ-ž0-9]+|[^A-Za-zĀ-ž0-9]+$/g, '').trim();
      if (t.length < 4 || t.length > 60) return;
      const n = norm(t);
      if (!n || seen.has(n) || GENERIC_TITLES.has(n) || SKIP_WORDS.has(n)) return;
      if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|june|july|august|september|october|november|december)$/.test(n)) return;
      seen.add(n);
      out.push(t);
    }
    const text = String(headline || '');
    const extra = String(desc || '');
    const before = text.replace(/\s*[–—|:].*$/, '').trim();
    if (before && before.length < 80) add(before);
    const re = /\p{Lu}[\p{L}'’-]+(?:\s+(?:of|the|and|de|da|di|du|van|von|&)\s+\p{Lu}[\p{L}'’-]+|\s+\p{Lu}[\p{L}'’-]+)*/gu;
    let m;
    const blob = text + ' ' + extra;
    while ((m = re.exec(blob)) && out.length < 8) add(m[0]);
    const place = /(?:\b(?:in|at|near|from|over|around|across)\s+)(\p{Lu}[\p{L}'’-]+(?:\s+\p{Lu}[\p{L}'’-]+){0,3})/gu;
    while ((m = place.exec(blob)) && out.length < 8) add(m[1]);
    return out.slice(0, 6);
  }

  function searchQueries(item) {
    const headline = String(item.t || '');
    const desc = String(item.s || '');
    const q = headline.replace(/\s*[–—|:].*$/, '').trim();
    const qs = [];
    const seen = new Set();
    function add(s) {
      const t = String(s || '').replace(/\s+/g, ' ').trim();
      if (t.length < 4) return;
      const n = norm(t);
      if (!n || seen.has(n)) return;
      seen.add(n);
      qs.push(t);
    }
    add(q);
    extractEntities(headline, desc).forEach(add);
    return qs.slice(0, 4);
  }

  function isGenericTitle(title) {
    const n = norm(title);
    if (!n) return true;
    if (GENERIC_TITLES.has(n)) return true;
    if (/^list of /.test(n)) return true;
    return false;
  }

  function scoreCandidate(title, snippet, headline, desc) {
    const t = norm(title), h = norm(headline), d = norm((headline || '') + ' ' + (desc || '')), sn = norm(snippet || '');
    if (!t) return 0;
    if (t === h) return 1;
    if (h.startsWith(t + ' ') || h.startsWith('the ' + t + ' ')) return 0.96;
    if (closeMatch(title, headline) || closeMatch(title, String(headline || '').replace(/\s*[–—|:].*$/, ''))) return 0.92;
    const phrase = ' ' + d + ' ';
    if (t.length >= 4 && phrase.includes(' ' + t + ' ')) {
      return isGenericTitle(title) ? 0.4 : 0.86;
    }
    const skip = SKIP_WORDS;
    const words = t.split(' ').filter(w => w.length > 3 && !skip.has(w));
    if (words.length >= 2) {
      const bag = new Set(d.split(' '));
      let n = 0; words.forEach(w => { if (bag.has(w)) n++; });
      const ratio = n / words.length;
      if (ratio >= 0.7 && n >= 2) return 0.8;
      if (ratio >= 0.5 && n >= 2) return 0.62;
    }
    if (sn) {
      const hw = new Set(h.split(' ').filter(w => w.length > 3 && !skip.has(w)));
      const sw = sn.split(' ').filter(w => w.length > 3 && !skip.has(w) && hw.has(w));
      if (sw.length >= 3) return 0.7;
      if (sw.length >= 2) return 0.58;
    }
    return 0;
  }

  function confidenceOk(score, title, headline, family) {
    if (family) return closeMatch(title, headline) || norm(headline).startsWith(norm(title) + ' ');
    if (isGenericTitle(title)) return score >= 0.95;
    return score >= 0.75;
  }

  async function getJSON(url) {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }

  async function wikiSummary(title) {
    const d = await getJSON(WIKI_SUMMARY + encodeURIComponent(title.replace(/ /g, '_')));
    if (!d || d.type === 'disambiguation' || !d.title) return null;
    if (/may refer to/i.test(d.extract || d.description || '')) return null;
    return d;
  }

  async function wikiExtract(title) {
    const u = WIKI_API + '?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(title);
    const d = await getJSON(u);
    const pages = d && d.query && d.query.pages;
    if (!pages) return '';
    const page = Object.values(pages)[0];
    if (!page || page.missing != null) return '';
    return String(page.extract || '').trim();
  }

  function sectionsFromText(text, maxSections, maxParas) {
    maxSections = maxSections == null ? 8 : maxSections;
    maxParas = maxParas == null ? 18 : maxParas;
    const raw = String(text || '').replace(/\r/g, '').trim();
    if (!raw) return [];
    const lines = raw.split('\n');
    const sections = [{ heading: '', paras: [] }];
    let cur = sections[0];
    for (const line of lines) {
      const hm = line.match(/^={2,}\s*([^=]+?)\s*={2,}\s*$/);
      if (hm) {
        const heading = hm[1].trim();
        if (SKIP_SECTIONS.test(heading)) { cur = { heading: '', paras: [], skip: true }; continue; }
        if (sections.length >= maxSections + 1) break;
        cur = { heading, paras: [] };
        sections.push(cur);
        continue;
      }
      if (cur.skip) continue;
      const p = line.replace(/\s+/g, ' ').trim();
      if (p.length < 40) continue;
      cur.paras.push(p);
    }
    const out = sections.filter(s => s.paras.length);
    let n = 0;
    for (const s of out) {
      if (n >= maxParas) { s.paras = []; continue; }
      if (n + s.paras.length > maxParas) s.paras = s.paras.slice(0, maxParas - n);
      n += s.paras.length;
    }
    return out.filter(s => s.paras.length);
  }

  function paragraphsFromText(text, limit) {
    const secs = sectionsFromText(text, 12, limit || 6);
    const paras = [];
    secs.forEach(s => s.paras.forEach(p => { if (paras.length < (limit || 6)) paras.push(p); }));
    return paras;
  }

  function pullQuotesFrom(text) {
    const s = String(text || '');
    const out = [];
    const re = /[“"]([^”"]{40,180})[”"]/g;
    let m;
    while ((m = re.exec(s)) && out.length < 2) {
      const q = m[1].trim();
      if (q && !out.includes(q)) out.push(q);
    }
    return out;
  }

  async function wikiSearch(q) {
    const d = await getJSON(WIKI_API + '?action=query&list=search&srlimit=5&format=json&origin=*&srsearch=' + encodeURIComponent(q));
    return (d && d.query && d.query.search) || [];
  }

  async function findWiki(item, opts) {
    const family = !!(opts && opts.family);
    const headline = String(item.t || '');
    const desc = String(item.s || '');
    const direct = wikiTitleFromUrl(item.url);
    if (direct) {
      const sum = await wikiSummary(direct);
      if (sum) return { sum, title: sum.title, confidence: 1 };
    }
    const queries = searchQueries(item);
    if (!queries.length) return null;
    const seen = new Set();
    const candidates = [];
    for (const q of queries) {
      let hits = [];
      try { hits = await wikiSearch(q); } catch (e) { hits = []; }
      hits.forEach(h => {
        const key = norm(h.title);
        if (!key || seen.has(key)) return;
        seen.add(key);
        const score = scoreCandidate(h.title, h.snippet, headline, desc);
        candidates.push({ title: h.title, snippet: h.snippet, score });
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best || !confidenceOk(best.score, best.title, headline, family)) return null;
    const sum = await wikiSummary(best.title);
    if (!sum) return null;
    const score = Math.max(best.score, scoreCandidate(sum.title, sum.description || sum.extract, headline, desc));
    if (!confidenceOk(score, sum.title, headline, family) && !direct) return null;
    const relatedHints = candidates.filter(c => c.title !== best.title && c.score >= 0.8 && !isGenericTitle(c.title)).slice(0, 3);
    return { sum, title: sum.title, confidence: score, relatedHints };
  }

  function absWiki(u) {
    if (!u) return '';
    if (u.startsWith('//')) return 'https:' + u;
    return u;
  }

  function pickSrcset(item) {
    const set = (item && item.srcset) || [];
    if (!set.length) return '';
    const ranked = set.slice().sort((a, b) => {
      const aw = parseInt((String(a.src || '').match(/\/(\d+)px-/) || [])[1] || '0', 10);
      const bw = parseInt((String(b.src || '').match(/\/(\d+)px-/) || [])[1] || '0', 10);
      return aw - bw;
    });
    const mid = ranked.find(x => {
      const w = parseInt((String(x.src || '').match(/\/(\d+)px-/) || [])[1] || '0', 10);
      return w >= 640 && w <= 1280;
    }) || ranked[Math.min(ranked.length - 1, 1)] || ranked[0];
    return absWiki(mid && mid.src);
  }

  async function wikiImages(title) {
    try {
      const d = await getJSON(WIKI_MEDIA + encodeURIComponent(title.replace(/ /g, '_')));
      const items = (d && d.items) || [];
      const out = [];
      for (const it of items) {
        if (it.type && it.type !== 'image') continue;
        const src = pickSrcset(it);
        if (!src) continue;
        if (/\.svg(?:\?|$)/i.test(src)) continue;
        if (/icon|logo|signature|coat_of_arms|flag_of|wordmark|pictogram/i.test(src + ' ' + (it.title || ''))) continue;
        const cap = (it.caption && (it.caption.text || it.caption)) || '';
        out.push({ src, caption: String(cap || '').trim(), lead: !!it.leadImage });
        if (out.length >= 4) break;
      }
      out.sort((a, b) => (b.lead - a.lead));
      return out.slice(0, 3);
    } catch (e) { return []; }
  }

  function formatWdTime(t) {
    const m = String(t || '').match(/^([+-])(\d+)-(\d+)-(\d+)/);
    if (!m) return '';
    const year = (m[1] === '-' ? '-' : '') + String(parseInt(m[2], 10));
    const mo = parseInt(m[3], 10), da = parseInt(m[4], 10);
    if (!mo) return year;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (!da) return months[mo - 1] + ' ' + year;
    return da + ' ' + months[mo - 1] + ' ' + year;
  }
  function formatWdQty(v) {
    if (!v || v.amount == null) return '';
    const n = Number(String(v.amount).replace(/^[+]/, ''));
    if (!isFinite(n)) return String(v.amount);
    const num = Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-NZ') : String(n);
    return num;
  }

  async function wikiFacts(qid) {
    if (!qid || !/^Q\d+$/.test(qid)) return [];
    try {
      const d = await getJSON(WIKIDATA + '?action=wbgetentities&props=labels|claims|descriptions&languages=en&format=json&origin=*&ids=' + encodeURIComponent(qid));
      const ent = d && d.entities && d.entities[qid];
      if (!ent || !ent.claims) return [];
      const want = [];
      const seenProp = new Set();
      const itemIds = [];
      for (const [prop, label] of FACT_PROPS) {
        if (seenProp.has(prop)) continue;
        const claims = ent.claims[prop];
        if (!claims || !claims.length) continue;
        const snak = claims[0].mainsnak;
        if (!snak || snak.snaktype !== 'value' || !snak.datavalue) continue;
        seenProp.add(prop);
        const dv = snak.datavalue;
        let value = '', id = '';
        if (dv.type === 'wikibase-entityid' && dv.value && dv.value.id) { id = dv.value.id; itemIds.push(id); value = id; }
        else if (dv.type === 'time') value = formatWdTime(dv.value && dv.value.time);
        else if (dv.type === 'quantity') value = formatWdQty(dv.value);
        else if (dv.type === 'monolingualtext') value = (dv.value && dv.value.text) || '';
        else if (dv.type === 'string') value = String(dv.value || '');
        if (value) want.push({ prop, label, value, id });
        if (want.length >= 8) break;
      }
      if (itemIds.length) {
        const lab = await getJSON(WIKIDATA + '?action=wbgetentities&props=labels&languages=en&format=json&origin=*&ids=' + encodeURIComponent(itemIds.join('|')));
        const ents = (lab && lab.entities) || {};
        want.forEach(f => {
          if (f.id && ents[f.id] && ents[f.id].labels && ents[f.id].labels.en) f.value = ents[f.id].labels.en.value;
        });
      }
      return want.filter(f => f.value && !/^Q\d+$/.test(f.value)).map(f => ({ label: f.label, value: f.value }));
    } catch (e) { return []; }
  }

  async function wikiRelated(title, hints, used) {
    const out = [];
    const seen = new Set([norm(title), ...(used || []).map(norm)]);
    async function addTitle(t) {
      const key = norm(t);
      if (!key || seen.has(key) || isGenericTitle(t)) return;
      seen.add(key);
      try {
        const sum = await wikiSummary(t);
        if (!sum || !sum.extract) return;
        out.push({
          title: sum.title,
          extract: String(sum.extract || '').trim(),
          url: (sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page) || (WIKI_EN + encodeURIComponent(sum.title.replace(/ /g, '_'))),
          thumb: (sum.thumbnail && sum.thumbnail.source) || ''
        });
      } catch (e) {}
    }
    for (const h of (hints || []).slice(0, 3)) {
      if (out.length >= 3) break;
      await addTitle(h.title || h);
    }
    if (out.length < 3) {
      try {
        let pages = [];
        try {
          const d = await getJSON(WIKI_RELATED + encodeURIComponent(title.replace(/ /g, '_')));
          pages = (d && d.pages) || [];
        } catch (e) { pages = []; }
        if (!pages.length) {
          const more = await wikiSearch('morelike:' + title);
          pages = more.map(h => ({ title: h.title, extract: String(h.snippet || '').replace(/<[^>]+>/g, ' ') }));
        }
        for (const p of pages) {
          if (out.length >= 3) break;
          const t = p.title || (p.titles && (p.titles.normalized || p.titles.display));
          if (!t) continue;
          const key = norm(t);
          if (seen.has(key) || isGenericTitle(t)) continue;
          if (!p.extract || String(p.extract).replace(/<[^>]+>/g, ' ').trim().length < 40) {
            await addTitle(t);
            continue;
          }
          seen.add(key);
          const extract = String(p.extract || p.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (extract.length < 40) continue;
          out.push({
            title: t,
            extract,
            url: (p.content_urls && p.content_urls.desktop && p.content_urls.desktop.page) || (WIKI_EN + encodeURIComponent(t.replace(/ /g, '_'))),
            thumb: (p.thumbnail && p.thumbnail.source) || ''
          });
        }
      } catch (e) {}
    }
    return out.slice(0, 3);
  }

  async function loadWikiFull(found) {
    const title = found.title;
    const textP = wikiExtract(title).catch(() => '');
    const imgP = wikiImages(title);
    const qid = found.sum && (found.sum.wikibase_item || (found.sum.wikibase_item));
    const factP = wikiFacts(qid);
    const relP = wikiRelated(title, found.relatedHints, [title]);
    const [text, images, facts, related] = await Promise.all([textP, imgP, factP, relP]);
    const body = text || (found.sum && found.sum.extract) || '';
    const sections = sectionsFromText(body, 8, 18);
    const summary = String((found.sum && found.sum.extract) || (sections[0] && sections[0].paras[0]) || '').trim();
    const quotes = pullQuotesFrom(body);
    const paras = [];
    sections.forEach(s => s.paras.forEach(p => paras.push(p)));
    return { sections, images, facts, related, quotes, summary, text: body, paras };
  }

  async function fetchSource(url) {
    if (!url || !/^https?:\/\//i.test(url)) return null;
    if (/wikipedia\.org\//i.test(url)) return null;
    try {
      const r = await fetch(ARTICLE_API + '?u=' + encodeURIComponent(url), { headers: { accept: 'application/json' } });
      if (!r.ok) return null;
      const d = await r.json();
      if (!d || !d.ok || !Array.isArray(d.paras) || d.paras.filter(p => p && p.text).length < 2) {
        return d && d.reason ? { ok: false, reason: d.reason, site: d.site || '', url: d.url || url } : null;
      }
      return d;
    } catch (e) { return null; }
  }

  async function loadContent(item, onUpdate) {
    const key = String(item.id || item.url || item.t);
    if (cache.has(key) && cache.get(key) && cache.get(key)._done) return cache.get(key);
    const family = isFamilyPost(item);
    const out = { wiki: null, paras: [], quotes: [], sections: [], images: [], facts: [], related: [], summary: '', source: null, error: '', pending: true, _done: false };
    const emit = () => { cache.set(key, out); if (onUpdate) onUpdate(out); };
    cache.set(key, out);
    const srcP = (!family && item.url) ? fetchSource(item.url) : Promise.resolve(null);
    try {
      const found = await findWiki(item, { family });
      if (found && found.sum) {
        out.wiki = found;
        out.summary = String(found.sum.extract || '').trim();
        out.paras = paragraphsFromText(out.summary, 3);
        out.pending = true;
        emit();
        try {
          const full = await loadWikiFull(found);
          out.sections = full.sections;
          out.images = full.images;
          out.facts = full.facts;
          out.related = full.related;
          out.quotes = full.quotes;
          out.summary = full.summary || out.summary;
          out.paras = full.paras.length ? full.paras : out.paras;
        } catch (e) {}
      }
    } catch (e) {
      out.error = 'wiki';
    }
    try { out.source = await srcP; } catch (e) { out.source = null; }
    out.pending = false;
    out._done = true;
    emit();
    return out;
  }

  function byline(item, card) {
    const who = (item._share && (item._share.name || (item._share.snap && item._share.sn))) || item.sn || '';
    let when = '';
    try { if (item.at && typeof ago === 'function') when = ago(item.at); } catch (e) {}
    return [who, when].filter(Boolean).join(' · ');
  }

  function postParas(item) {
    const s = String(item.s || '').trim();
    if (!s) return [];
    return s.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  }

  function wikiPageUrl(wiki) {
    const sum = wiki && wiki.sum;
    if (!sum) return '';
    return (sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page) || (WIKI_EN + encodeURIComponent((sum.title || wiki.title || '').replace(/ /g, '_')));
  }

  function skeletonHtml() {
    return `<div class="ibr-skel" aria-hidden="true"><div class="ibr-skel-line"></div><div class="ibr-skel-line"></div><div class="ibr-skel-line short"></div></div><p class="ibr-loading">Looking up more about this story…</p>`;
  }

  function viewHtml(item, extra, card) {
    extra = extra || { wiki: null, paras: [], quotes: [], sections: [], images: [], facts: [], related: [], summary: '', source: null };
    const family = isFamilyPost(item, card);
    const title = item.t || (family ? 'Family post' : 'Article');
    const srcName = (item._share && item._share.name) ? item._share.name : (item.sn || (extra.source && extra.source.site) || '');
    const kicker = family ? (isFriend() ? 'Friends' : 'Family') : (srcName || item.topic || 'Story');
    const heroImg = item.img || (extra.images && extra.images[0] && extra.images[0].src) || (extra.wiki && extra.wiki.sum && extra.wiki.sum.thumbnail && extra.wiki.sum.thumbnail.source) || '';
    const imgFromWiki = !item.img && !!heroImg;
    const heroCap = imgFromWiki ? ((extra.images && extra.images[0] && extra.images[0].caption) || 'Image via Wikipedia') : '';
    const by = byline(item, card);
    const quotes = extra.quotes || [];
    const sections = (extra.sections && extra.sections.length) ? extra.sections : null;
    const bodyParas = sections ? [] : (extra.paras && extra.paras.length ? extra.paras : postParas(item));
    const summary = String(extra.summary || '').trim();
    const facts = extra.facts || [];
    const related = extra.related || [];
    const moreImgs = (extra.images || []).slice(item.img ? 0 : 1);
    let body = '';
    function paraHtml(p, drop) { return `<p${drop ? ' class="ibr-leadp"' : ''}>${esc(p)}</p>`; }
    if (sections) {
      sections.forEach((sec, si) => {
        if (sec.heading) body += `<h2>${esc(sec.heading)}</h2>`;
        sec.paras.forEach((p, pi) => {
          body += paraHtml(p, si === 0 && pi === 0);
          if (si === 0 && pi === 0 && quotes[0]) body += `<blockquote class="ibr-pull">${esc(quotes[0])}</blockquote>`;
          if (si === 1 && pi === 0 && quotes[1]) body += `<blockquote class="ibr-pull">${esc(quotes[1])}</blockquote>`;
        });
        if (moreImgs[si]) {
          const im = moreImgs[si];
          body += `<figure class="ibr-fig"><img src="${esc(im.src)}" alt="" referrerpolicy="no-referrer">${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : '<figcaption>Image via Wikipedia</figcaption>'}</figure>`;
        }
      });
    } else if (bodyParas.length) {
      bodyParas.forEach((p, n) => {
        body += paraHtml(p, n === 0);
        if (n === 0 && quotes[0]) body += `<blockquote class="ibr-pull">${esc(quotes[0])}</blockquote>`;
        if (n === 3 && quotes[1]) body += `<blockquote class="ibr-pull">${esc(quotes[1])}</blockquote>`;
      });
      moreImgs.slice(0, 2).forEach(im => {
        body += `<figure class="ibr-fig"><img src="${esc(im.src)}" alt="" referrerpolicy="no-referrer">${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : '<figcaption>Image via Wikipedia</figcaption>'}</figure>`;
      });
    } else if (!extra.pending) {
      body = `<p class="ibr-empty">${family ? 'This post has no extra text.' : 'The full article could not be loaded. You can still read the original at the source.'}</p>`;
    }
    if (extra.pending) body += skeletonHtml();

    let factsHtml = '';
    if (facts.length) {
      factsHtml = `<aside class="ibr-facts"><h2>Key facts</h2><dl>${facts.map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl></aside>`;
    }
    let summaryHtml = '';
    if (summary && (sections || (extra.paras && extra.paras.length))) {
      // Don't repeat the same paragraph as both the summary and the first body paragraph with no extra content
      summaryHtml = `<section class="ibr-summary"><h2>Quick summary</h2><p>${esc(summary)}</p></section>`;
    }
    let sourceHtml = '';
    const src = extra.source;
    if (src && src.ok && src.paras && src.paras.length) {
      const bits = src.paras.map(p => p.heading ? `<h3>${esc(p.heading)}</h3>` : `<p>${esc(p.text)}</p>`).join('');
      const note = src.excerpt ? '<p class="ibr-excerpt-note">This is a short excerpt. The full piece is at the source.</p>' : '';
      sourceHtml = `<section class="ibr-fromsrc"><h2>From the original${src.site ? ' on ' + esc(src.site) : ' article'}</h2>${bits}${note}</section>`;
    } else if (src && src.reason === 'paywall') {
      sourceHtml = `<section class="ibr-fromsrc"><p class="ibr-empty">The original article looks like it may be behind a paywall, so it isn’t shown here.</p></section>`;
    }

    let relatedHtml = '';
    if (related.length) {
      relatedHtml = `<section class="ibr-related"><h2>More on this topic</h2>${related.map(r => `<details><summary>${esc(r.title)}</summary><p>${esc(r.extract)}</p><p class="ibr-rel-link"><a href="${esc(r.url)}" target="_blank" rel="noopener">Wikipedia</a>, <a href="${CC_BY_SA}" target="_blank" rel="noopener">CC BY-SA</a></p></details>`).join('')}</section>`;
    }

    const wiki = extra.wiki && extra.wiki.sum;
    const wikiPage = wikiPageUrl(extra.wiki);
    let credit = '';
    if (wiki) {
      credit = `<p>From <a href="${esc(wikiPage)}" target="_blank" rel="noopener">Wikipedia</a>, <a href="${CC_BY_SA}" target="_blank" rel="noopener">CC BY-SA</a>.</p>`;
      if (imgFromWiki || moreImgs.length) credit += '<p>Images via Wikipedia.</p>';
    }
    const orig = item.url ? `<p><a class="ibr-orig" href="${esc(item.url)}" target="_blank" rel="noopener">Read the original${srcName ? ' on ' + esc(srcName) : ''}</a></p>` : '';
    const comments = (family && famOn() && typeof loadThread === 'function')
      ? `<div class="ibr-cmts"><div class="cmts" data-cid="${esc(item.id)}"><div class="cl">Loading comments…</div><form class="cf"><textarea rows="1" maxlength="1000" placeholder="Write a comment…" aria-label="Write a comment"></textarea><button class="btn pri" type="submit">Send</button></form></div></div>`
      : '';
    const hero = heroImg ? `<figure class="ibr-hero"><img src="${esc(heroImg)}" alt="" referrerpolicy="no-referrer">${heroCap ? `<figcaption>${esc(heroCap)}</figcaption>` : ''}</figure>` : '';
    return `<button type="button" class="ibr-back backpill" data-ibr-back>← Back to feed</button>
      <header>
        <p class="ibr-kicker">${esc(kicker)}</p>
        <h1>${esc(title)}</h1>
        ${by ? `<p class="ibr-by">${esc(by)}</p>` : ''}
      </header>
      ${summaryHtml}
      ${hero}
      ${factsHtml}
      <div class="ibr-body${(sections || bodyParas.length) ? ' ibr-drop' : ''}">${body}</div>
      ${sourceHtml}
      ${relatedHtml}
      <footer class="ibr-src">${credit}${orig}</footer>
      ${comments}`;
  }

  function rootEl() { return doc() && doc().getElementById('ib-reader'); }

  function ensureShell() {
    let el = rootEl();
    if (el) return el;
    el = doc().createElement('div');
    el.id = 'ib-reader';
    el.className = 'ib-reader';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="ibr-book"><div class="ibr-under" aria-hidden="true"></div><article class="ibr-page"></article></div>';
    doc().body.appendChild(el);
    el.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('[data-ibr-back]')) { e.preventDefault(); close(); }
    });
    bindSwipe(el);
    return el;
  }

  function bindSwipe(el) {
    let x0 = 0, y0 = 0, pid = null;
    el.addEventListener('pointerdown', e => {
      if (e.button && e.button !== 0) return;
      if (e.target.closest && e.target.closest('button, a, input, textarea, select, form, label, .cmts')) return;
      x0 = e.clientX; y0 = e.clientY; pid = e.pointerId;
    });
    el.addEventListener('pointerup', e => {
      if (pid == null) return;
      pid = null;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx > 0) close(); // swipe right / back, like turning the page back
    });
    el.addEventListener('pointercancel', () => { pid = null; });
  }

  function setOn(v) {
    const h = htmlEl();
    if (h && h.classList) h.classList.toggle('ib-reader-on', !!v);
  }

  function fillComments(item) {
    if (!famOn() || !isFamilyPost(item) || typeof loadThread !== 'function') return;
    const box = rootEl() && rootEl().querySelector('.cmts[data-cid]');
    if (!box) return;
    loadThread(box, item.id);
  }

  function paint(page, item, extra, card, keepScroll) {
    const top = keepScroll ? page.scrollTop : 0;
    page.innerHTML = viewHtml(item, extra, card);
    fillComments(item);
    if (keepScroll) page.scrollTop = top;
  }

  async function open(card, item) {
    item = item || itemOf(card);
    if (!canOpen(card, item)) return false;
    const el = ensureShell();
    const page = el.querySelector('.ibr-page');
    paint(page, item, { wiki: null, paras: postParas(item), quotes: [], pending: true }, card, false);
    el.hidden = false;
    openOn = true;
    setOn(true);
    el.classList.remove('ibr-out', 'ibr-turn-hold', 'ibr-reduce');
    el.classList.toggle('ibr-reduce', reduceMotion());
    el.classList.remove('ibr-in');
    void el.offsetWidth;
    el.classList.add('ibr-in');
    page.scrollTop = 0;
    if (!hist) {
      try { root.history.pushState({ ibReader: 1 }, ''); hist = true; } catch (e) { hist = false; }
    }
    try {
      const openId = item.id;
      await loadContent(item, extra => {
        if (!openOn) return;
        const still = itemOf(card) || item;
        if (still && still.id !== openId) return;
        const keep = page.scrollTop > 80;
        paint(page, still, extra, card, keep);
      });
    } catch (e) {}
    return true;
  }

  function close(fromPop) {
    if (!openOn) return;
    const el = rootEl();
    const go = () => {
      openOn = false;
      setOn(false);
      if (el) { el.hidden = true; el.classList.remove('ibr-in', 'ibr-out', 'ibr-turn-hold'); }
      if (hist && !fromPop) {
        hist = false;
        try { if (root.history.state && root.history.state.ibReader) root.history.back(); } catch (e) {}
      }
      hist = false;
    };
    if (!el) { go(); return; }
    el.classList.remove('ibr-in');
    el.classList.add('ibr-out');
    if (reduceMotion()) el.classList.add('ibr-reduce');
    clearTimeout(turnTimer);
    turnTimer = root.setTimeout(go, reduceMotion() ? 260 : 460);
  }

  if (root.addEventListener) {
    root.addEventListener('popstate', () => {
      if (openOn) { hist = false; close(true); }
    });
    root.addEventListener('keydown', e => {
      if (openOn && e.key === 'Escape') close();
    });
  }

  root.ibReader = {
    canOpen, open, close, itemOf, closeMatch, wikiTitleFromUrl, paragraphsFromText,
    pullQuotesFrom, viewHtml, findWiki, loadContent, isFamilyPost, byline, postParas,
    extractEntities, scoreCandidate, sectionsFromText, confidenceOk, searchQueries
  };
})(typeof window !== 'undefined' ? window : globalThis);
