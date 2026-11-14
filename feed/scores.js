/* Info Book 1.9.149 – Family scoreboard for the games (Tetris, Scrabble).
   Scores go to the family data service with this phone's own family link (the token Info Book keeps in mf.member), so the
   name on the board is the member's name from the server, not one typed into a game. With no family link, or offline,
   it shows this phone's own bests and stays quiet. Loaded by tetris.html and scrabble.html (same origin as Info Book). */
(function (root) {
  const API = 'https://shane-my-feed-data.phoneapp12.workers.dev/api';
  const TITLE = { tetris: 'Tetris', scrabble: 'Scrabble' };
  const d = root.document;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number(n || 0).toLocaleString('en-NZ');
  const ls = {
    get(k, f) { try { const v = root.localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  function who() { // this phone's family member (Shane's admin link counts), or null
    const m = ls.get('mf.member', null);
    return m && m.id && m.tok && !m.pending ? { id: String(m.id), tok: m.tok, name: String(m.name || '').trim(), first: String(m.name || '').trim().split(/\s+/)[0] || '', admin: m.role === 'admin' } : null;
  }
  // Shane is the member named Shane. Prefer a stable member id when one is known; otherwise match the first name.
  const SHANE_IDS = [];
  function isShane(me) {
    me = me || who();
    if (!me) return false;
    if (SHANE_IDS.length && SHANE_IDS.indexOf(me.id) >= 0) return true;
    return /^Shane$/i.test(me.first);
  }
  function nzDate(ms) {
    if (!ms) return '';
    const o = { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short' };
    const y = x => new Date(x).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland', year: 'numeric' });
    if (y(ms) !== y(Date.now())) o.year = 'numeric';
    return new Date(ms).toLocaleDateString('en-NZ', o);
  }
  function localBests(game) { return ls.get('ib-scores-' + game, []); }
  function addLocal(game, e) {
    const list = localBests(game).concat([{ name: e.name || '', score: e.score, at: e.at || Date.now(), note: e.note || '' }]);
    list.sort((a, b) => b.score - a.score || a.at - b.at);
    ls.set('ib-scores-' + game, list.slice(0, 10));
  }
  async function call(path, opt) {
    const me = who(); if (!me) return null;
    try {
      const ctl = root.AbortController ? new AbortController() : null; const tm = ctl && setTimeout(() => ctl.abort(), 7000);
      const r = await root.fetch(API + path, { ...(opt || {}), signal: ctl && ctl.signal, headers: { Authorization: 'Bearer ' + me.tok, ...(opt && opt.body ? { 'Content-Type': 'application/json' } : {}) } });
      if (tm) clearTimeout(tm);
      const j = await r.json().catch(() => null);
      return r.ok ? j : null;
    } catch (e) { return null; }
  }
  // Save on this phone, then send to the family board if this phone has a family link. Never throws.
  function submit(game, data, local) {
    addLocal(game, { name: (local && local.name) || (who() || {}).first || '', score: data.score, note: local && local.note });
    return who() && !(local && local.localOnly) ? call('/scores', { method: 'POST', body: JSON.stringify({ game, ...data }) }) : Promise.resolve(null);
  }
  const load = game => call('/scores?game=' + encodeURIComponent(game));
  // 1.9.210 Sugar Rush family race (same family token as the scoreboard).
  const loadRace = () => call('/sugar-race');
  async function saveRace(data) {
    const me = who(); if (!me) return null;
    try {
      const ctl = root.AbortController ? new AbortController() : null; const tm = ctl && setTimeout(() => ctl.abort(), 7000);
      const r = await root.fetch(API + '/sugar-race', { method: 'POST', signal: ctl && ctl.signal, headers: { Authorization: 'Bearer ' + me.tok, 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
      if (tm) clearTimeout(tm);
      return await r.json().catch(() => null);
    } catch (e) { return null; }
  }

  function style() {
    if (d.getElementById('ibs-style')) return;
    const s = d.createElement('style'); s.id = 'ibs-style';
    s.textContent = `.ibs-ov{position:fixed;inset:0;z-index:50;background:rgba(5,8,12,.9);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}
.ibs-card{width:100%;max-width:400px;max-height:calc(100dvh - 32px);overflow:auto;background:#111a22;border:1px solid var(--ibs-acc,#22d3ee);border-radius:18px;padding:16px;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;text-shadow:none;box-sizing:border-box}
.ibs-card h2{margin:0 0 4px;font-size:22px;line-height:1.2}
.ibs-card .ibs-you{margin:0 0 10px;font-size:15px;color:rgba(255,255,255,.85)}
.ibs-card .ibs-you b{color:var(--ibs-acc,#22d3ee)}
.ibs-t{width:100%;border-collapse:collapse;font-size:15px;margin:0 0 10px}
.ibs-t th{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.55);text-align:left;padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.12)}
.ibs-t td{padding:7px 6px;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap}
.ibs-t td.n{max-width:180px;overflow:hidden;text-overflow:ellipsis}.ibs-t td.n small{display:block;font-weight:400;color:rgba(255,255,255,.6);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ibs-t .r,.ibs-t .s{text-align:right;font-variant-numeric:tabular-nums}
.ibs-t th.s{text-align:right}
.ibs-t td.s{font-weight:700}
.ibs-t td.dt{color:rgba(255,255,255,.6);font-size:13px}
.ibs-t tr.me td{background:rgba(255,255,255,.08)}
.ibs-t td.n .ibs-you{color:var(--ibs-acc,#22d3ee);font-size:12px;font-weight:600}.ibs-t td.n .ibs-you::before{content:' · '}
.ibs-h{margin:12px 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.55)}
.ibs-pb{list-style:none;margin:0 0 12px;padding:0;font-size:14px}
.ibs-pb li{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.ibs-pb small{color:rgba(255,255,255,.6)}
.ibs-note{font-size:13px;color:rgba(255,255,255,.65);margin:0 0 10px;line-height:1.35}
.ibs-card.ibs-inline{max-height:none;overflow:visible;background:none;border:0;padding:0;margin:0 0 12px;text-align:left}
.ibs-btns{display:flex;gap:8px}
.ibs-btns button{flex:1;min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font:600 16px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.ibs-btns button.pri{background:var(--ibs-btn,#0e7490);border-color:var(--ibs-acc,#22d3ee)}`;
    d.head.appendChild(s);
  }
  function table(rows, opt) {
    if (!rows.length) return `<p class="ibs-note">${esc(opt.empty || 'No scores yet. Be the first!')}</p>`;
    return `<table class="ibs-t"><thead><tr><th class="r">#</th><th>Name</th><th class="s">Score</th><th>Date</th></tr></thead><tbody>${rows.map((x, i) =>
      `<tr${x.mine ? ' class="me"' : ''}><td class="r">${i + 1}</td><td class="n">${esc(x.name || 'Player')}${x.mine ? ' <span class="ibs-you">you</span>' : ''}${x.note ? ` <small>${esc(x.note)}</small>` : ''}</td><td class="s">${num(x.score)}</td><td class="dt">${esc(nzDate(x.at))}</td></tr>`).join('')}</tbody></table>`;
  }
  // 1.9.205: the headline list is every member's personal best, not the top 10
  // individual games (one frequent player could fill those 10 and hide the others).
  // The worker already returns every member in data.best with no limit.
  function uniqueBest(top) {
    const by = [], ix = new Map();
    for (const x of top || []) {
      const k = x.mine ? '__mine__' : String(x.name || '');
      const i = ix.get(k);
      if (i == null) { ix.set(k, by.length); by.push(x); }
      else if ((x.score || 0) > (by[i].score || 0)) by[i] = x;
    }
    return by;
  }
  function personalBests(data) {
    const src = (data && Array.isArray(data.best) && data.best.length) ? data.best
      : (data && Array.isArray(data.top) ? uniqueBest(data.top) : []);
    return src.slice().sort((a, b) => (b.score - a.score) || ((a.at || 0) - (b.at || 0)));
  }
  function leaderRows(game, list) {
    return (list || []).map(x => {
      let note = x.note || '';
      if (game === 'scrabble' && (x.winsComputer != null || x.winsFamily != null)) {
        note = 'wins: ' + (x.winsComputer || 0) + ' v 🤖 · ' + (x.winsFamily || 0) + ' v family';
      } else if (!note && x.games) note = x.games + ' game' + (x.games === 1 ? '' : 's');
      return note ? Object.assign({}, x, { note }) : x;
    });
  }
  function bests(game, list) {
    if (!list || !list.length) return '';
    return `<p class="ibs-h">Everyone’s best</p><ul class="ibs-pb">${list.map(x => {
      const extra = game === 'scrabble' ? `wins: ${x.winsComputer || 0} v 🤖 · ${x.winsFamily || 0} v family` : `${x.games} game${x.games === 1 ? '' : 's'}`;
      return `<li><span>${esc(x.name)}${x.mine ? ' <small>(you)</small>' : ''}</span><span><b>${num(x.score)}</b> <small>${esc(extra)}</small></span></li>`;
    }).join('')}</ul>`;
  }
  function html(game, data, opt) {
    const me = who();
    let h = opt.inline ? '' : `<h2>🏆 ${opt.over ? 'Game over' : 'Family scoreboard'}</h2>`;
    if (opt.over && opt.score != null) h += `<p class="ibs-you">${opt.youLabel ? esc(opt.youLabel) + ': ' : 'You scored '}<b>${num(opt.score)}</b>${opt.detail ? ' · ' + esc(opt.detail) : ''}${opt.sent && opt.sent.newBest ? ' · new personal best!' : ''}</p>`;
    if (opt.over || opt.inline) h += `<p class="ibs-h">🏆 Family scoreboard · ${esc(TITLE[game] || game)}</p>`;
    if (data && (Array.isArray(data.best) || Array.isArray(data.top))) {
      const leaders = personalBests(data);
      h += `<p class="ibs-h">Each player's best</p>`;
      h += table(leaderRows(game, leaders), { empty: 'No family scores yet. Be the first!' });
      if (opt.note) h += `<p class="ibs-note">${esc(opt.note)}</p>`;
    } else if (data === undefined) {
      h += `<p class="ibs-note">Loading the family scores…</p>`;
    } else {
      h += `<p class="ibs-note">${me ? 'The family scoreboard didn’t load (no internet?).' : 'The family scoreboard needs your Info Book family link on this phone.'} Best scores on this phone:</p>`;
      h += table(localBests(game), { empty: 'No scores on this phone yet.' });
    }
    if (opt.inline) return h;
    const btns = [];
    if (opt.onContinue) btns.push('<button type="button" class="pri" data-ibs="continue">Continue</button>');
    if (opt.onAgain) btns.push('<button type="button"' + (opt.onContinue ? '' : ' class="pri"') + ' data-ibs="again">Play again</button>');
    btns.push('<button type="button" data-ibs="close"' + (opt.onAgain || opt.onContinue ? '' : ' class="pri"') + '>Close</button>');
    h += `<div class="ibs-btns">${btns.join('')}</div>`;
    return h;
  }
  let cur = null;
  function close() { if (cur) { cur.el.remove(); const f = cur.onClose; cur = null; if (f) f(); } }
  // opt: { over, score, detail, youLabel, note, sent (promise or result), onAgain, onContinue, onClose, acc, btn }
  function open(game, opt) {
    opt = opt || {}; style(); close();
    const el = d.createElement('div'); el.className = 'ibs-ov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Family scoreboard');
    if (opt.acc) el.style.setProperty('--ibs-acc', opt.acc); if (opt.btn) el.style.setProperty('--ibs-btn', opt.btn);
    el.innerHTML = `<div class="ibs-card">${html(game, who() ? undefined : null, opt)}</div>`;
    el.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-ibs]');
      if (b && b.dataset.ibs === 'continue') { const f = opt.onContinue; opt.onClose = null; close(); if (f) f(); }
      else if (b && b.dataset.ibs === 'again') { const f = opt.onAgain; opt.onClose = null; close(); if (f) f(); }
      else if ((b && b.dataset.ibs === 'close') || e.target === el) close();
    });
    d.body.appendChild(el);
    const me = cur = { el, onClose: opt.onClose };
    if (!who()) return Promise.resolve(null);
    return Promise.resolve(opt.sent).catch(() => null).then(sent => { opt.sent = sent; return load(game); }).then(data => {
      if (cur !== me) return data;
      el.firstChild.innerHTML = html(game, data || null, opt); return data;
    });
  }
  // The same board inside a game's own game-over card (no buttons).
  function fill(el, game, opt) {
    opt = { ...(opt || {}), inline: true }; style(); el.classList.add('ibs-card', 'ibs-inline');
    el.innerHTML = html(game, who() ? undefined : null, opt);
    if (!who()) return Promise.resolve(null);
    return Promise.resolve(opt.sent).catch(() => null).then(sent => { opt.sent = sent; return load(game); }).then(data => { el.innerHTML = html(game, data || null, opt); return data; });
  }
  const SHANE_BEST_CLEAR = 'ib-tetris-best-cleared-20261113';
  function clearShaneLocalBestOnce() {
    try {
      const me = who();
      if (!isShane(me) || !me.admin) return false;
      if (root.localStorage.getItem(SHANE_BEST_CLEAR)) return false;
      root.localStorage.removeItem('tetris-best');
      root.localStorage.setItem(SHANE_BEST_CLEAR, '1');
      return true;
    } catch (e) { return false; }
  }
  clearShaneLocalBestOnce();
  // 1.9.207: one-time reset of everyone's local Tetris scores on first load, never again.
  const TETRIS_SCORES_CLEAR_207 = 'ib-tetris-scores-cleared-1.9.207';
  function clearTetrisScoresOnce207() {
    try {
      if (!root.localStorage) return false;
      if (root.localStorage.getItem(TETRIS_SCORES_CLEAR_207)) return false;
      root.localStorage.removeItem('tetris-best');
      root.localStorage.removeItem('ib-scores-tetris');
      root.localStorage.setItem(TETRIS_SCORES_CLEAR_207, '1');
      return true;
    } catch (e) { return false; }
  }
  clearTetrisScoresOnce207();
  root.IBScores = { fill, API, who, isShane, submit, load, loadRace, saveRace, open, close, localBests, nzDate, isOpen: () => !!cur, clearShaneLocalBestOnce, clearTetrisScoresOnce207, TETRIS_SCORES_CLEAR_207, personalBests, uniqueBest, leaderRows, html };
})(typeof window !== 'undefined' ? window : globalThis);
