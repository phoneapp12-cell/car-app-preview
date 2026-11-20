/* Info Book 1.9.288 — magazine article reader.
   Single-tap on a news, article or family post turns the page into a full
   magazine view. Wikipedia text is fetched only when the topic clearly matches;
   otherwise the original post is shown as it is. Nothing is invented. */
(function (root) {
  const WIKI_API = 'https://en.wikipedia.org/w/api.php';
  const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  const CC_BY_SA = 'https://creativecommons.org/licenses/by-sa/4.0/';
  const WIKI_EN = 'https://en.wikipedia.org/wiki/';
  const cache = new Map();
  let openOn = false, hist = false, turnTimer = 0, swipe = null;

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
    const u = WIKI_API + '?action=query&prop=extracts&explaintext=1&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(title);
    const d = await getJSON(u);
    const pages = d && d.query && d.query.pages;
    if (!pages) return '';
    const page = Object.values(pages)[0];
    if (!page || page.missing != null) return '';
    return String(page.extract || '').trim();
  }

  function paragraphsFromText(text, limit) {
    const raw = String(text || '').replace(/\r/g, '').replace(/^==+[^=\n]+==+\s*$/gm, '').trim();
    if (!raw) return [];
    const skip = /^(see also|references|further reading|external links|notes|bibliography)\b/i;
    const parts = raw.split(/\n{2,}/).map(p => p.replace(/\n+/g, ' ').trim()).filter(p => p.length > 40 && !skip.test(p));
    return parts.slice(0, limit || 6);
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

  async function findWiki(item) {
    const headline = String(item.t || '');
    const direct = wikiTitleFromUrl(item.url);
    if (direct) {
      const sum = await wikiSummary(direct);
      if (sum) return { sum, title: sum.title };
    }
    const q = headline.replace(/\s*[–—|:].*$/, '').trim();
    if (q.length < 4) return null;
    const d = await getJSON(WIKI_API + '?action=query&list=search&srlimit=5&format=json&origin=*&srsearch=' + encodeURIComponent(q));
    const hits = (d && d.query && d.query.search) || [];
    const hit = hits.find(h => closeMatch(h.title, headline) || closeMatch(h.title, q));
    if (!hit) return null;
    const sum = await wikiSummary(hit.title);
    if (!sum) return null;
    if (!closeMatch(sum.title, headline) && !closeMatch(sum.title, q) && !direct) return null;
    return { sum, title: sum.title };
  }

  async function loadContent(item) {
    const key = String(item.id || item.url || item.t);
    if (cache.has(key)) return cache.get(key);
    const out = { wiki: null, paras: [], quotes: [], error: '' };
    try {
      const found = await findWiki(item);
      if (found && found.sum) {
        let text = '';
        try { text = await wikiExtract(found.title); } catch (e) { text = found.sum.extract || ''; }
        if (!text) text = found.sum.extract || '';
        const paras = paragraphsFromText(text, 8);
        out.wiki = found;
        out.paras = paras.length ? paras : paragraphsFromText(found.sum.extract || '', 4);
        out.quotes = pullQuotesFrom(text || found.sum.extract || '');
      }
    } catch (e) {
      out.error = 'wiki';
    }
    cache.set(key, out);
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

  function viewHtml(item, extra, card) {
    extra = extra || { wiki: null, paras: [], quotes: [] };
    const family = isFamilyPost(item, card);
    const title = item.t || (family ? 'Family post' : 'Article');
    const srcName = (item._share && item._share.name) ? item._share.name : (item.sn || '');
    const kicker = family ? (isFriend() ? 'Friends' : 'Family') : (srcName || item.topic || 'Story');
    const img = item.img || (extra.wiki && extra.wiki.sum && extra.wiki.sum.thumbnail && extra.wiki.sum.thumbnail.source) || '';
    const imgFromWiki = !item.img && !!img;
    const by = byline(item, card);
    const bodyParas = extra.paras.length ? extra.paras : postParas(item);
    const quotes = extra.quotes || [];
    let body = '';
    if (bodyParas.length) {
      bodyParas.forEach((p, n) => {
        body += `<p>${esc(p)}</p>`;
        if (n === 0 && quotes[0]) body += `<blockquote class="ibr-pull">${esc(quotes[0])}</blockquote>`;
        if (n === 3 && quotes[1]) body += `<blockquote class="ibr-pull">${esc(quotes[1])}</blockquote>`;
      });
    } else {
      body = `<p class="ibr-empty">${family ? 'This post has no extra text.' : 'The full article could not be loaded. You can still read the original at the source.'}</p>`;
    }
    const wiki = extra.wiki && extra.wiki.sum;
    const wikiPage = wiki && ((wiki.content_urls && wiki.content_urls.desktop && wiki.content_urls.desktop.page) || (WIKI_EN + encodeURIComponent(wiki.title.replace(/ /g, '_'))));
    let credit = '';
    if (wiki) {
      credit = `<p>From <a href="${esc(wikiPage)}" target="_blank" rel="noopener">Wikipedia</a>, <a href="${CC_BY_SA}" target="_blank" rel="noopener">CC BY-SA</a>.</p>`;
      if (imgFromWiki) credit += '<p>Image via Wikipedia.</p>';
    }
    const orig = item.url ? `<p><a class="ibr-orig" href="${esc(item.url)}" target="_blank" rel="noopener">Read the original${srcName ? ' on ' + esc(srcName) : ''}</a></p>` : '';
    const comments = (family && famOn() && typeof loadThread === 'function')
      ? `<div class="ibr-cmts"><div class="cmts" data-cid="${esc(item.id)}"><div class="cl">Loading comments…</div><form class="cf"><textarea rows="1" maxlength="1000" placeholder="Write a comment…" aria-label="Write a comment"></textarea><button class="btn pri" type="submit">Send</button></form></div></div>`
      : '';
    const hero = img ? `<figure class="ibr-hero"><img src="${esc(img)}" alt="" referrerpolicy="no-referrer">${imgFromWiki ? '<figcaption>Image via Wikipedia</figcaption>' : ''}</figure>` : '';
    return `<button type="button" class="ibr-back backpill" data-ibr-back>← Back to feed</button>
      <header>
        <p class="ibr-kicker">${esc(kicker)}</p>
        <h1>${esc(title)}</h1>
        ${by ? `<p class="ibr-by">${esc(by)}</p>` : ''}
      </header>
      ${hero}
      <div class="ibr-body${bodyParas.length ? ' ibr-drop' : ''}">${body}</div>
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

  async function open(card, item) {
    item = item || itemOf(card);
    if (!canOpen(card, item)) return false;
    const el = ensureShell();
    const page = el.querySelector('.ibr-page');
    page.innerHTML = viewHtml(item, { wiki: null, paras: postParas(item), quotes: [] }, card);
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
    fillComments(item);
    try {
      const extra = await loadContent(item);
      if (!openOn) return true;
      const still = itemOf(card) || item;
      if (extra && (extra.wiki || extra.paras.length > postParas(item).length)) {
        page.innerHTML = viewHtml(still, extra, card);
        fillComments(still);
      }
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
    pullQuotesFrom, viewHtml, findWiki, loadContent, isFamilyPost, byline, postParas
  };
})(typeof window !== 'undefined' ? window : globalThis);
