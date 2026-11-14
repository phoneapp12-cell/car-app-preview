import { isUnsafe } from './safe.js';
/* 1.7.0 Family: a private network for My Feed. Members (invited by Shane), their comments on public cards, and their
   feed settings. Stored in one SQLite-backed Durable Object (free plan), not in KV. Every call needs a member's token;
   tokens are only kept as SHA-256 hashes. Nothing from Shane's own My App data ever comes here: cards that are his
   (For You, photos, About you) have no comment button and the server refuses their ids. */
import { DurableObject } from 'cloudflare:workers';
import { Retain, nudgeFor, TAGS } from './retain.js';
import { InfoBot, BOT_ID, BOT_NAME, AI_MODEL } from './ai.js';
import { paywallUrl, paywallHtml } from './paywall.js';
import { preview, blockedWhy, findUrl, safeUrl, stockPics } from './preview.js';
import { scoresInit, scoresRoute, clearShaneTetrisOnce, clearShaneTetrisOnce20261113, clearAllTetrisOnce20261114 } from './scores.js'; // 1.9.149 family scoreboard; 12–14 Nov 2026 one-off Tetris clears
import { scrabbleInit, scrabbleRoute, bindDict } from './scrabble.js'; // 1.9.214 family Scrabble online challenges
import lexicon from './lexicon.js';

const ORIGINS = /^https:\/\/([a-z0-9]+\.)?shane-my-app\.pages\.dev$|^http:\/\/localhost:\d+$/;
const PRIVATE_ID = /:|^tip\d/;                        // Shane's own cards (life:, app:, ph:, you:) and the app's tips: never commentable
// 1.8.0 family photos: kept as SQLite blobs in this Durable Object (R2 isn't switched on for the account). Each photo is
// shrunk and re-saved on the phone (≤1600px JPEG, which drops EXIF/GPS); the server checks it's a JPEG, strips any
// metadata segments again and only hands it to members with a valid token.
const PH_MAX = 1.5e6, PH_POST = 4, PH_DAY = 30, PH_PERSON = 1.5e9, PH_ALL = 4e9;
function stripJpeg(u8) { // keep only the image itself: drop APP1–APP15 (EXIF, GPS, XMP …) and comment segments
  if (u8[0] !== 0xFF || u8[1] !== 0xD8) return null;
  const out = [u8.subarray(0, 2)]; let i = 2;
  while (i + 4 <= u8.length) {
    if (u8[i] !== 0xFF) return null;
    const mk = u8[i + 1];
    if (mk === 0xDA) { out.push(u8.subarray(i)); break; } // start of scan: the rest is picture data
    const len = (u8[i + 2] << 8) | u8[i + 3]; if (len < 2 || i + 2 + len > u8.length) return null;
    if (!((mk >= 0xE1 && mk <= 0xEF) || mk === 0xFE)) out.push(u8.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  if (out.length < 2) return null;
  const n = out.reduce((a, b) => a + b.length, 0), r = new Uint8Array(n); let o = 0; for (const b of out) { r.set(b, o); o += b.length; } return r;
}
const MAX_TEXT = 1000, RATE_N = 20, RATE_MS = 10 * 60e3; // at most 20 comments per person per 10 minutes

const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const newToken = () => { const b = new Uint8Array(32); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const newId = () => { const b = new Uint8Array(6); crypto.getRandomValues(b); return 'm' + hex(b); };
const clean = (s, n) => String(s || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, n);

export function cors(req) {
  const o = req.headers.get('Origin') || '';
  return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-App-Version', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : { Vary: 'Origin' };
}

const BLOCK_MSG = { sport: 'Info Book keeps sport out of the feeds, so this one can’t be shared.', money: 'Money and bills stay out of Info Book, so this one can’t be shared.', unsafe: 'That one isn’t family-safe, so it can’t be shared here.', paywall: 'That article is behind a paywall, so it can’t be shared – try a free version (RNZ, Stuff, 1News, The Spinoff). 🔒' };
const EMO = { love: ['❤️', 'loved'], laugh: ['😂', 'laughed at'], angry: ['😠', 'reacted 😠 to'], wow: ['😮', 'was surprised by'], meh: ['😐', 'reacted 😐 to'], cool: ['😎', 'reacted 😎 to'], up: ['👍', 'gave a 👍 to'] }, NEUTRAL_EMO = new Set(['angry', 'meh']); // 1.9.42
export class Family extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tok TEXT, created INTEGER, seen INTEGER, removed INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, card TEXT NOT NULL, mid TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL, snap TEXT, del INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS c_card ON comments(card);
      CREATE INDEX IF NOT EXISTS c_at ON comments(at);
      CREATE TABLE IF NOT EXISTS shares (id INTEGER PRIMARY KEY AUTOINCREMENT, mid TEXT NOT NULL, orig TEXT, snap TEXT NOT NULL, caption TEXT, priv INTEGER DEFAULT 0, at INTEGER NOT NULL, del INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS prefs (mid TEXT PRIMARY KEY, j TEXT, at INTEGER);
      CREATE TABLE IF NOT EXISTS pvcache (url TEXT PRIMARY KEY, j TEXT, at INTEGER);
      CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY AUTOINCREMENT, mid TEXT NOT NULL, post INTEGER, w INTEGER, h INTEGER, size INTEGER NOT NULL, data BLOB NOT NULL, at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS p_post ON photos(post);
      DROP TABLE IF EXISTS likes;
      CREATE TABLE IF NOT EXISTS reacts (card TEXT NOT NULL, mid TEXT NOT NULL, kind TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (card, mid, kind));
      CREATE INDEX IF NOT EXISTS p_mid ON photos(mid, at);`);
    try { this.sql.exec(`ALTER TABLE members ADD COLUMN ver TEXT`); } catch (e) { } // 1.8.2
    try { this.sql.exec(`ALTER TABLE shares ADD COLUMN vis TEXT`); } catch (e) { } // 1.9.16 link shares for chosen people: ',mid,mid,' (null = whole family)
    try { this.sql.exec(`ALTER TABLE members ADD COLUMN pron TEXT`); } catch (e) { } try { this.sql.exec(`ALTER TABLE members ADD COLUMN pshow INTEGER DEFAULT 0`); } catch (e) { } // 1.9.15 pronouns (optional; not set = they)
    scoresInit(this.sql); // 1.9.149 game scores (Tetris, Scrabble)
    scrabbleInit(this.sql); // 1.9.214 family Scrabble games, in this same database
    bindDict(lexicon);
    this.rt = new Retain(this); // 1.9.0
    this.bot = new InfoBot(this); // 1.9.12
    this.sql.exec(`CREATE TABLE IF NOT EXISTS clikes (cid INTEGER NOT NULL, mid TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (cid, mid))`); // 1.9.14 ❤️ on comments
    for (const t of ['reacts', 'clikes']) try { this.sql.exec(`ALTER TABLE ${t} ADD COLUMN emo TEXT`); } catch (e) { } // 1.9.42 ❤️😂😠😮😐😎 (null = ❤️)
    try { // 1.9.33 one reaction of each kind per member per item: make sure no duplicates exist (keeps the earliest row), once
      if (!this.one(`SELECT v FROM meta WHERE k='rxdedupe'`)) {
        const dup = (t, g) => (this.one(`SELECT COUNT(*) - (SELECT COUNT(*) FROM (SELECT 1 FROM ${t} GROUP BY ${g})) n FROM ${t}`) || {}).n || 0;
        const a = dup('reacts', 'card, mid, kind'), b = dup('clikes', 'cid, mid');
        if (a) this.sql.exec(`DELETE FROM reacts WHERE rowid NOT IN (SELECT MIN(rowid) FROM reacts GROUP BY card, mid, kind)`);
        if (b) this.sql.exec(`DELETE FROM clikes WHERE rowid NOT IN (SELECT MIN(rowid) FROM clikes GROUP BY cid, mid)`);
        this.sql.exec(`CREATE UNIQUE INDEX IF NOT EXISTS rx_one ON reacts(card, mid, kind)`); this.sql.exec(`CREATE UNIQUE INDEX IF NOT EXISTS cl_one ON clikes(cid, mid)`);
        this.sql.exec(`INSERT OR REPLACE INTO meta (k,v) VALUES ('rxdedupe',?)`, JSON.stringify({ reacts: a, clikes: b, at: Date.now() }));
      }
    } catch (e) { }
  }
  async alarm() { // 1.9.0 batched push notifications; 1.9.12 Info Bot's queued replies
    await this.rt.flush(); try { await this.bot.run(); } catch (e) { } try { await this.rt.flush(); } catch (e) { }
    const nb = this.bot.next(), cur = await this.ctx.storage.getAlarm(); if (nb && (!cur || cur > nb)) await this.ctx.storage.setAlarm(Math.max(nb, Date.now() + 1000));
  }
  one(q, ...a) { return this.sql.exec(q, ...a).toArray()[0] || null; }
  all(q, ...a) { return this.sql.exec(q, ...a).toArray(); }
  canSee(card, mid) { // 1.9.16 a share for chosen people is only visible (and commentable/likeable) by them and the sharer
    if (!/^sh\d+$/.test(card || '')) return true;
    const r = this.one(`SELECT mid, vis FROM shares WHERE id=?`, +card.slice(2)); return !r || !r.vis || r.mid === mid || r.vis.includes(',' + mid + ',');
  }
  botReact(what, id, text = '', p = 0.4) { // 1.9.61 🤖 Info Bot sometimes reacts too (never to its own, never sport/money)
    try {
      if (Math.random() > p) return; const t = String(text || '');
      const emo = /\b(haha|lol|lmao|funny|joke)\b|😂|🤣/i.test(t) ? 'laugh' : /\b(wow|amazing|incredible|unreal|omg)\b|😮|!{2,}/i.test(t) ? 'wow' : /\b(cool|awesome|legend|epic)\b|😎/i.test(t) ? 'cool' : what === 'photo' ? ['love', 'love', 'cool', 'wow'][Math.floor(Math.random() * 4)] : ['up', 'up', 'love'][Math.floor(Math.random() * 3)];
      if (what === 'photo') this.sql.exec(`INSERT OR IGNORE INTO reacts (card,mid,kind,at,emo) VALUES (?,?,?,?,?)`, id, BOT_ID, 'love', Date.now() + 1, emo === 'love' ? null : emo);
      else this.sql.exec(`INSERT OR IGNORE INTO clikes (cid,mid,at,emo) VALUES (?,?,?,?)`, id, BOT_ID, Date.now() + 1, emo === 'love' ? null : emo);
    } catch (e) { }
  }
  reactsOf(card, kind) { return this.all(`SELECT l.mid, CASE WHEN l.mid='bot:info' THEN '🤖 Info Bot' ELSE m.name END name, l.at, l.emo FROM reacts l LEFT JOIN members m ON m.id=l.mid WHERE l.card=? AND l.kind=? AND (m.removed=0 OR l.mid='bot:info') ORDER BY l.at`, card, kind); }

  /* 1.9.18 🔗 a link's public preview + Info Bot's short description + a picture, kept 30 minutes so typing, the preview
     and posting don't cost extra fetches or AI calls */
  async linkPv(raw, caption = '') {
    const u0 = safeUrl(raw), key = u0 ? u0.href : raw, now = Date.now();
    this.sql.exec(`DELETE FROM pvcache WHERE at < ?`, now - 30 * 60e3);
    const c = this.one(`SELECT j FROM pvcache WHERE url=?`, key); let pv = c ? JSON.parse(c.j) : null;
    if (!pv && paywallUrl(raw)) pv = { blocked: 'paywall', site: (String(raw).match(/^https?:\/\/(?:www\.)?([^/?#]+)/i) || [])[1] || '', url: raw };
    if (!pv) { pv = await preview(raw); if (!pv.err) { const why = (paywallUrl(pv.url || raw) || pv.pay || /^\s*(?:The )?(?:Washington Post|New York Times|Wall Street Journal|Financial Times|Bloomberg|The Economist)\s*[:–-]/i.test(pv.s || '')) ? 'paywall' : blockedWhy(pv.t, pv.s); if (why) pv = { blocked: why, site: pv.site, url: pv.url }; } }
    if (!pv.err && !pv.blocked && !pv.sum && (!pv.tried || (caption && pv.tried !== 2)) && (pv.s || pv.t && !/^an? \w+ post$/i.test(pv.t) || caption)) { // one short AI call per link
      let r = null; try { r = await this.bot.summarise(pv, caption); } catch (e) { }
      if (r) { pv.sum = r.sum || ''; pv.q = r.img || ''; }
      pv.tried = caption ? 2 : 1;
    }
    if (!pv.err && !pv.blocked && !pv.pics) { // a free photo when the link has no public picture (and a few to swap to)
      const qs = [pv.q, pv.q && pv.q.split(' ').slice(-1)[0], 'Whangārei', 'New Zealand'].filter(Boolean); let pics = [];
      if (!pv.img || pv.needPic) for (const q of qs) { pics = await stockPics(q, 6); if (pics.length) { pv.picq = q; break; } }
      pv.pics = pics; if (!pv.img && pics.length) { pv.img = pics[0].img; pv.stock = 1; pv.needPic = false; }
      if (pv.brand) { if (!pv.img) { pv.img = pv.brand; pv.needPic = false; pv.branded = 1; } pv.pics = pv.pics.concat([{ img: pv.brand }]); } // 1.9.37 always something to post with
    }
    if (!pv.err && !pv.blocked) { if (pv.sum) { const why = blockedWhy(pv.sum); if (why) pv.sum = ''; } pv.needDesc = !(pv.sum || (pv.s && pv.s.length >= 10)); pv.desc = pv.sum || pv.s || ''; }
    if (!pv.err) this.sql.exec(`INSERT OR REPLACE INTO pvcache (url,j,at) VALUES (?,?,?)`, key, JSON.stringify(pv), c ? (this.one(`SELECT at FROM pvcache WHERE url=?`, key) || {}).at || now : now);
    return pv;
  }
  thread(card, me) { // a card's comments as this member may see them (Info Bot hidden if they muted it)
    const hideBot = this.bot.muted(me.id), rows = this.all(`SELECT c.id, c.mid, m.name, CASE WHEN m.pshow=1 THEN m.pron END pron, c.text, c.at FROM comments c LEFT JOIN members m ON m.id=c.mid WHERE c.card=? AND c.del=0 ORDER BY c.at LIMIT 200`, card).filter(r => !(hideBot && r.mid === BOT_ID));
    const lk = {}; if (rows.length) for (const l of this.all(`SELECT l.cid, l.mid, CASE WHEN l.mid='bot:info' THEN '🤖 Info Bot' ELSE m.name END name, l.at, l.emo FROM clikes l LEFT JOIN members m ON m.id=l.mid WHERE (m.removed=0 OR l.mid='bot:info') AND l.cid IN (${rows.map(() => '?').join(',')}) ORDER BY l.at`, ...rows.map(r => r.id))) (lk[l.cid] ||= []).push({ mid: l.mid, name: l.name, at: l.at, emo: l.emo || undefined });
    return rows.map(r => ({ ...r, name: r.mid === BOT_ID ? BOT_NAME : r.name || 'Former member', bot: r.mid === BOT_ID ? 1 : 0, mine: r.mid === me.id, likes: lk[r.id] || [] }));
  }
  async fetch(req) {
    const u = new URL(req.url), p = u.pathname.replace(/^\/api/, ''), m = req.method;
    const J = (o, s = 200) => Response.json(o, { status: s });
    const body = async () => { try { return await req.json(); } catch (e) { return {}; } };
    try { clearShaneTetrisOnce(this.sql); } catch (e) { } // 12 Nov 2026 one-off: Shane's Tetris rows, once
    try { clearShaneTetrisOnce20261113(this.sql); } catch (e) { } // 13 Nov 2026 one-off: Shane's Tetris rows again, once
    try { clearAllTetrisOnce20261114(this.sql); } catch (e) { } // 14 Nov 2026 one-off: everyone's Tetris rows, once

    if (p === '/bootstrap') { // first admin only (needs the service's secret key); does nothing once an admin exists
      if (!this.env.SEED_KEY || u.searchParams.get('key') !== this.env.SEED_KEY) return J({ err: 'no' }, 403);
      if (this.one(`SELECT id FROM members WHERE role='admin' AND removed=0`)) return J({ err: 'admin exists' }, 409);
      const tok = newToken(), id = newId();
      this.sql.exec(`INSERT INTO members (id,name,role,tok,created) VALUES (?,?,?,?,?)`, id, clean(u.searchParams.get('name') || 'Shane', 40), 'admin', await sha(tok), Date.now());
      return J({ id, token: tok });
    }

    if (p === '/rxcheck') { // 1.9.33 duplicate-reaction check result (service key only; numbers only)
      if (!this.env.SEED_KEY || req.headers.get('X-Seed-Key') !== this.env.SEED_KEY) return J({ err: 'no' }, 403);
      const live = { reacts: (this.one(`SELECT COUNT(*) - (SELECT COUNT(*) FROM (SELECT 1 FROM reacts GROUP BY card, mid, kind)) n FROM reacts`) || {}).n, clikes: (this.one(`SELECT COUNT(*) - (SELECT COUNT(*) FROM (SELECT 1 FROM clikes GROUP BY cid, mid)) n FROM clikes`) || {}).n };
      return J({ removed: JSON.parse((this.one(`SELECT v FROM meta WHERE k='rxdedupe'`) || {}).v || 'null'), dupNow: live });
    }
    if (p === '/feedstore') { // 1.9.31 the refresher's stored feed lives here (SQLite, no KV daily write limit); service key only
      if (!this.env.SEED_KEY || req.headers.get('X-Seed-Key') !== this.env.SEED_KEY) return J({ err: 'no' }, 403);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS feedstore (i INTEGER PRIMARY KEY, v TEXT NOT NULL)`);
      if (m === 'GET') { const rows = this.all(`SELECT v FROM feedstore ORDER BY i`); return new Response(rows.length ? rows.map(r => r.v).join('') : 'null', { headers: { 'Content-Type': 'application/json' } }); }
      if (m === 'PUT') { const t = await req.text(); if (!t || t[0] !== '{') return J({ err: 'bad' }, 400); const h = await sha(t);
        if ((this.one(`SELECT v FROM meta WHERE k='feedhash'`) || {}).v === h) return J({ ok: true, same: true }); // unchanged: nothing written
        const CH = 400000; this.ctx.storage.transactionSync(() => { this.sql.exec(`DELETE FROM feedstore`); for (let k = 0, n = 0; k < t.length; k += CH, n++) this.sql.exec(`INSERT INTO feedstore (i,v) VALUES (?,?)`, n, t.slice(k, k + CH)); this.sql.exec(`INSERT OR REPLACE INTO meta (k,v) VALUES ('feedhash',?)`, h); });
        return J({ ok: true, bytes: t.length }); }
      return J({ err: 'method' }, 405);
    }
    if (p === '/tick') { if (!this.env.SEED_KEY || req.headers.get('X-Seed-Key') !== this.env.SEED_KEY) return J({ err: 'no' }, 403); return J(await this.rt.tick()); } // 1.9.0 from the cron

    const auth = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (auth.length < 30) return J({ err: 'not a member' }, 401);
    const me = this.one(`SELECT id,name,role,seen,ver FROM members WHERE tok=? AND removed=0`, await sha(auth));
    if (!me) return J({ err: 'not a member' }, 401);
    const now = Date.now(), ver = clean(req.headers.get('X-App-Version'), 12); // 1.8.2: last seen to ~2 min, and which app version they're on
    if (!me.seen || now - me.seen > 2 * 60e3 || (ver && ver !== me.ver)) this.sql.exec(`UPDATE members SET seen=?, ver=COALESCE(NULLIF(?,''),ver) WHERE id=?`, now, ver, me.id);
    const admin = me.role === 'admin';

    if (p === '/me') return J({ id: me.id, name: me.name, role: me.role });
    if (p === '/people') return J(this.all(`SELECT id,name,role FROM members WHERE removed=0 ORDER BY created`));
    { const r = await scoresRoute(this.sql, me, p, m, u, body, now); if (r) return J(r.body, r.status); } // 1.9.149 family scoreboard
    { const r = await scrabbleRoute(this.sql, me, p, m, u, body, now, { note: (mid, text, card) => this.rt.note(mid, 'scrabble', text, card) }); if (r) return J(r.body, r.status); } // 1.9.214 family Scrabble

    // ---- admin: members and their invite links
    if (p === '/members' && m === 'GET') { if (!admin) return J({ err: 'admin only' }, 403); return J(this.all(`SELECT m.id,m.name,m.role,m.created,m.seen,m.ver,m.pron,m.pshow,p.age,p.stage,p.sugg,p.sit FROM members m LEFT JOIN mprof p ON p.mid=m.id WHERE m.removed=0 ORDER BY m.created`)); }
    if (p === '/members' && m === 'POST') {
      if (!admin) return J({ err: 'admin only' }, 403);
      const b = await body(), name = clean(b.name, 40); if (!name) return J({ err: 'name needed' }, 400);
      if ((this.one(`SELECT COUNT(*) n FROM members WHERE removed=0`) || {}).n >= 30) return J({ err: 'too many members' }, 400);
      const tok = newToken(), id = newId();
      this.sql.exec(`INSERT INTO members (id,name,role,tok,created) VALUES (?,?,?,?,?)`, id, name, 'member', await sha(tok), now);
      return J({ id, name, token: tok });
    }
    let mm = p.match(/^\/members\/(m[0-9a-f]{12})(\/token|\/check|\/unseen|\/addpick|\/pron|\/prefs|\/vltags)?$/);
    if (mm) {
      if (!admin) return J({ err: 'admin only' }, 403);
      const t = this.one(`SELECT id,role FROM members WHERE id=? AND removed=0`, mm[1]); if (!t) return J({ err: 'no such member' }, 404);
      if (mm[2] === '/check' && m === 'POST') { const b = await body(); const r = this.one(`SELECT id,name,role,seen FROM members WHERE id=? AND tok=?`, t.id, await sha(String(b.token || ''))); return J(r ? { ok: 1, ...r } : { ok: 0 }); } // 1.8.3: test a link without marking them seen
      if (mm[2] === '/prefs' && m === 'GET') { if (!admin) return J({ err: 'admin only' }, 403); const r = this.one(`SELECT j FROM prefs WHERE mid=?`, t.id); return J({ prefs: r ? JSON.parse(r.j) : null }); } // 1.9.24 admin: their interest picks (to check targeting)
      if (mm[2] === '/vltags' && m === 'POST') { // 1.9.40 Shane adds vlog likes for someone (e.g. cruise, famvlog): their phone ranks those vlogs higher
        if (!admin) return J({ err: 'admin only' }, 403); const b = await body(), tags = (Array.isArray(b.tags) ? b.tags : []).map(x => clean(x, 16)).filter(x => /^[a-z]{2,16}$/.test(x)).slice(0, 12);
        const r = this.one(`SELECT j FROM prefs WHERE mid=?`, t.id), p = r ? JSON.parse(r.j) : {}; p.vlTags = [...new Set([...(p.vlTags || []), ...tags])];
        this.sql.exec(`INSERT INTO prefs (mid,j,at) VALUES (?,?,?) ON CONFLICT(mid) DO UPDATE SET j=excluded.j, at=excluded.at`, t.id, JSON.stringify(p), now); return J({ ok: 1, vlTags: p.vlTags });
      }
      if (mm[2] === '/addpick' && m === 'POST') { // 1.8.5 Shane turns an interest on for someone: merged into their picks; their phone adds it on next open
        const b = await body(), topic = clean(b.topic, 24); if (!/^[a-z]{2,12}$/.test(topic)) return J({ err: 'bad topic' }, 400);
        const r = this.one(`SELECT j FROM prefs WHERE mid=?`, t.id), p = r ? JSON.parse(r.j) : {};
        if (Array.isArray(p.pick) && !p.pick.includes(topic)) p.pick.push(topic);
        p.adds = [...new Set([...(p.adds || []), topic])];
        this.sql.exec(`INSERT INTO prefs (mid,j,at) VALUES (?,?,?) ON CONFLICT(mid) DO UPDATE SET j=excluded.j, at=excluded.at`, t.id, JSON.stringify(p), now);
        return J({ ok: 1, prefs: p });
      }
      if (mm[2] === '/pron' && m === 'PUT') { const b = await body(), v = ['she', 'he', 'they'].includes(b.pron) ? b.pron : null; this.sql.exec(`UPDATE members SET pron=? WHERE id=?`, v, t.id); return J({ ok: 1, pron: v }); } // 1.9.15 Shane sets someone's pronouns (wording only)
      if (mm[2] === '/unseen' && m === 'POST') { this.sql.exec(`UPDATE members SET seen=NULL, ver=NULL WHERE id=?`, t.id); try { this.sql.exec(`DELETE FROM visits WHERE mid=? AND day=?`, t.id, new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }).replace(/-/g, '')); } catch (e) { } return J({ ok: 1 }); } // undo a "seen" (and the streak day) caused by checking their link
      if (mm[2] === '/token' && m === 'POST') { const tok = newToken(); this.sql.exec(`UPDATE members SET tok=? WHERE id=?`, await sha(tok), t.id); return J({ id: t.id, token: tok }); } // new link; the old one stops working
      if (!mm[2] && m === 'DELETE') { if (t.id === me.id) return J({ err: 'you can’t remove yourself' }, 400); this.sql.exec(`UPDATE members SET removed=1, tok=NULL WHERE id=?`, t.id); this.sql.exec(`DELETE FROM prefs WHERE mid=?`, t.id); this.sql.exec(`DELETE FROM reacts WHERE mid=?`, t.id); this.sql.exec(`DELETE FROM subs WHERE mid=?`, t.id); this.sql.exec(`DELETE FROM notes WHERE mid=?`, t.id); return J({ ok: 1 }); }
    }
    if (p === '/purge' && m === 'POST') { // admin: wipe a removed member's comments too (used for test members)
      if (!admin) return J({ err: 'admin only' }, 403);
      const b = await body(); const t = this.one(`SELECT id FROM members WHERE id=? AND removed=1`, String(b.id || '')); if (!t) return J({ err: 'remove them first' }, 400);
      this.sql.exec(`DELETE FROM clikes WHERE mid=? OR cid IN (SELECT id FROM comments WHERE mid=?)`, t.id, t.id); this.sql.exec(`DELETE FROM comments WHERE mid=?`, t.id); this.sql.exec(`DELETE FROM shares WHERE mid=?`, t.id); this.sql.exec(`DELETE FROM photos WHERE mid=?`, t.id); this.sql.exec(`DELETE FROM reacts WHERE mid=?`, t.id); for (const tb of ['visits', 'trivia', 'subs', 'notes', 'npref', 'mprof', 'carshare', 'sappt']) this.sql.exec(`DELETE FROM ${tb} WHERE mid=?`, t.id); this.sql.exec(`DELETE FROM dates WHERE mid=? OR by=?`, t.id, t.id); this.sql.exec(`DELETE FROM members WHERE id=?`, t.id); return J({ ok: 1 });
    }

    // ---- comments
    if (p === '/counts') {
      const ids = (u.searchParams.get('ids') || '').split(',').filter(x => x && x.length <= 64).slice(0, 80);
      const out = {}; if (!ids.length) return J(out);
      const tail = Math.min(3, +u.searchParams.get('last') || 0); // 1.9.19 the latest few comments too, so threads show open without a tap
      for (const r of this.all(`SELECT card, COUNT(*) n, MAX(at) last FROM comments WHERE del=0 AND card IN (${ids.map(() => '?').join(',')}) GROUP BY card`, ...ids)) if (this.canSee(r.card, me.id)) {
        if (!tail) { out[r.card] = [r.n, r.last]; continue; }
        const th = this.thread(r.card, me); if (th.length) out[r.card] = [th.length, r.last, th.slice(-tail)];
      }
      return J(out);
    }
    if (p === '/pron' && m === 'PUT') { // 1.9.15 a member sets their own pronouns, and whether to show them on their comments
      const b = await body(), cur = this.one(`SELECT pron, pshow FROM members WHERE id=?`, me.id) || {};
      const v = 'pron' in b ? (['she', 'he', 'they'].includes(b.pron) ? b.pron : null) : cur.pron, sh = 'show' in b ? (b.show ? 1 : 0) : cur.pshow || 0;
      this.sql.exec(`UPDATE members SET pron=?, pshow=? WHERE id=?`, v, sh, me.id); return J({ ok: 1, pron: v, show: !!sh });
    }
    if (p === '/comments' && m === 'GET') {
      const card = String(u.searchParams.get('card') || '').slice(0, 64); if (!this.canSee(card, me.id)) return J([]);
      return J(this.thread(card, me));
    }
    if (p === '/comments' && m === 'POST') {
      const b = await body(), card = clean(b.card, 64), text = clean(b.text, MAX_TEXT + 1);
      if (!card || PRIVATE_ID.test(card) || !this.canSee(card, me.id)) return J({ err: 'comments are only for public cards' }, 400);
      if (!text) return J({ err: 'empty' }, 400);
      if (isUnsafe({ t: text })) return J({ err: 'please keep it family-friendly' }, 400);
      if (text.length > MAX_TEXT) return J({ err: `keep it under ${MAX_TEXT} characters` }, 400);
      if ((this.one(`SELECT COUNT(*) n FROM comments WHERE mid=? AND at>?`, me.id, now - RATE_MS) || {}).n >= RATE_N) return J({ err: 'slow down a little – try again in a few minutes' }, 429);
      const s = b.snap || {}, snap = JSON.stringify({ t: clean(s.t, 160), url: /^https:\/\//.test(s.url || '') ? clean(s.url, 400) : '', img: /^https:\/\//.test(s.img || '') ? clean(s.img, 400) : '', vid: clean(s.vid, 20), sn: clean(s.sn, 80), topic: clean(s.topic, 20), src: clean(s.src, 40) });
      this.sql.exec(`INSERT INTO comments (card,mid,text,at,snap) VALUES (?,?,?,?,?)`, card, me.id, text, now, snap);
      const cid = this.one(`SELECT last_insert_rowid() id`).id;
      try { // 1.9.0 tell the post's owner, and anyone else already talking there (a direct reply goes straight away)
        const owner = /^sh\d+$/.test(card) ? (this.one(`SELECT mid FROM shares WHERE id=? AND del=0`, +card.slice(2)) || {}).mid : (this.one(`SELECT mid FROM shares WHERE orig=? AND del=0 ORDER BY at LIMIT 1`, card) || {}).mid;
        const short = text.length > 70 ? text.slice(0, 68) + '…' : text, sent = new Set([me.id]);
        if (owner && !sent.has(owner)) { sent.add(owner); await this.rt.note(owner, 'mine', `💬 ${me.name} on your post: “${short}”`, card); }
        for (const r of this.all(`SELECT DISTINCT mid FROM comments WHERE card=? AND del=0 AND id<?`, card, cid)) if (!sent.has(r.mid)) { sent.add(r.mid); await this.rt.note(r.mid, 'reply', `↩️ ${me.name} replied: “${short}”`, card); }
      } catch (e) { }
      try { await this.bot.consider(me, card, cid, text, now); } catch (e) { } // 1.9.12 🤖 sometimes answers
      if (!this.bot.muted(me.id)) this.botReact('comment', cid, text, 0.35);
      return J({ id: cid, at: now });
    }
    mm = p.match(/^\/comments\/(\d+)\/like$/);
    if (mm && m === 'POST') { // 1.9.14 ❤️ a comment (any comment on a public card, Info Bot's too); everyone in the family sees who
      const c = this.one(`SELECT id, mid, card, text FROM comments WHERE id=? AND del=0`, +mm[1]); if (!c || PRIVATE_ID.test(c.card) || !this.canSee(c.card, me.id)) return J({ err: 'that comment is gone' }, 404);
      const b = await body(), hadR = this.one(`SELECT at, emo FROM clikes WHERE cid=? AND mid=?`, c.id, me.id), had = !!hadR, want = typeof b.on === 'boolean' ? b.on : true, emo = EMO[b.emo] && b.emo !== 'love' ? b.emo : null;
      if (want && had && (hadR.emo || null) !== emo) this.sql.exec(`UPDATE clikes SET emo=?, at=? WHERE cid=? AND mid=?`, emo, now, c.id, me.id); else
      if (want && !had) {
        if ((this.one(`SELECT COUNT(*) n FROM clikes WHERE mid=? AND at>?`, me.id, now - RATE_MS) || {}).n >= 60) return J({ err: 'slow down a little' }, 429);
        this.sql.exec(`INSERT OR IGNORE INTO clikes (cid,mid,at,emo) VALUES (?,?,?,?)`, c.id, me.id, now, emo);
        if (c.mid !== me.id && c.mid !== BOT_ID) { const short = c.text.length > 50 ? c.text.slice(0, 48) + '…' : c.text; try { await this.rt.note(c.mid, 'mine', `${EMO[emo || 'love'][0]} ${me.name} ${EMO[emo || 'love'][1]} your comment: “${short}”`, c.card); } catch (e) { } }
      } else if (!want && had) this.sql.exec(`DELETE FROM clikes WHERE cid=? AND mid=?`, c.id, me.id);
      return J({ id: c.id, likes: this.all(`SELECT l.mid, CASE WHEN l.mid='bot:info' THEN '🤖 Info Bot' ELSE m.name END name, l.at, l.emo FROM clikes l LEFT JOIN members m ON m.id=l.mid WHERE (m.removed=0 OR l.mid='bot:info') AND l.cid=? ORDER BY l.at`, c.id) });
    }
    mm = p.match(/^\/comments\/(\d+)$/);
    if (mm && m === 'DELETE') {
      const c = this.one(`SELECT id,mid FROM comments WHERE id=? AND del=0`, +mm[1]); if (!c) return J({ err: 'gone' }, 404);
      if (c.mid !== me.id && !admin) return J({ err: 'only your own' }, 403);
      this.sql.exec(`UPDATE comments SET del=1, text='' WHERE id=?`, c.id); return J({ ok: 1 });
    }
    // ---- 1.9.12 🤖 Info Bot settings: Shane turns it on/off and sets how often; anyone can mute it for themselves
    if (p === '/aibot' && m === 'GET') return J({ mute: this.bot.muted(me.id), ...(admin ? { cfg: this.bot.cfg(), usage: this.bot.usage(), model: AI_MODEL, ai: !!this.env.AI, queued: this.all(`SELECT card, due, why FROM aiq`) } : {}) });
    if (p === '/aibot/mute' && m === 'PUT') { const b = await body(); if (b.mute) this.sql.exec(`INSERT OR REPLACE INTO aimute (mid,at) VALUES (?,?)`, me.id, now); else this.sql.exec(`DELETE FROM aimute WHERE mid=?`, me.id); return J({ mute: this.bot.muted(me.id) }); }
    if (p === '/aibot/cfg' && m === 'PUT') { if (!admin) return J({ err: 'admin only' }, 403); const b = await body(), c = this.bot.cfg(); if ('on' in b) c.on = !!b.on; if (['rare', 'some', 'often'].includes(b.freq)) c.freq = b.freq; this.bot.save(c); if (!c.on) this.sql.exec(`DELETE FROM aiq`); return J({ cfg: this.bot.cfg() }); }
    if (p === '/aibot/try' && m === 'POST') { if (!admin) return J({ err: 'admin only' }, 403); const b = await body(); const out = {}; for (const md of (b.models || []).slice(0, 4)) { try { out[md] = await this.bot.reply({ cid: +b.cid, card: String(b.card), dry: 1 }, now, md); } catch (e) { out[md] = 'ERR ' + e.message; } } return J(out); } // admin testing: draft replies, nothing saved
    if (p === '/aibot/kick' && m === 'POST') { if (!admin) return J({ err: 'admin only' }, 403); this.sql.exec(`UPDATE aiq SET due=?`, now); await this.bot.run(now + 1); try { await this.rt.flush(); } catch (e) { } return J({ ok: 1, usage: this.bot.usage() }); } // testing: answer the queued ones now
    if (p === '/recent') { // cards the family has talked about lately, newest first (for the 💬 Family tab)
      return J(this.all(`SELECT card, COUNT(*) n, MAX(at) last, MAX(snap) snap FROM comments WHERE del=0 AND mid!='bot:info' AND at>? GROUP BY card ORDER BY last DESC LIMIT 40`, now - 60 * 864e5).filter(r => this.canSee(r.card, me.id)).map(r => ({ card: r.card, n: r.n, last: r.last, snap: JSON.parse(r.snap || '{}') })));
    }

    // ---- reposts: a card shared with the family ("Shared by …"), shown to everyone whatever their interests
    if (p === '/shares' && m === 'GET') {
      return J(this.all(`SELECT s.id, s.mid, m.name, s.orig, s.snap, s.caption, s.priv, s.at, s.tag, s.vis FROM shares s LEFT JOIN members m ON m.id=s.mid WHERE s.del=0 AND s.at>? AND (s.vis IS NULL OR s.mid=? OR instr(s.vis, ?) > 0) ORDER BY s.at DESC LIMIT 80`, now - 90 * 864e5, me.id, ',' + me.id + ',')
        .map(r => { const card = r.priv ? 'sh' + r.id : r.orig; return { id: r.id, mid: r.mid, name: r.name || 'Former member', orig: r.orig, card, snap: JSON.parse(r.snap), caption: r.caption || '', priv: !!r.priv, up: r.priv === 2, link: r.priv === 3, text: r.priv === 4, to: r.vis ? r.vis.split(',').filter(x => x && x !== r.mid).map(x => (x === me.id ? 'You' : (this.one(`SELECT name FROM members WHERE id=?`, x) || {}).name)).filter(Boolean) : null, tag: r.tag || '', at: r.at, mine: r.mid === me.id, likes: this.reactsOf(card, 'love'), ups: this.reactsOf(card, 'up'), nc: (this.one(`SELECT COUNT(*) n FROM comments WHERE card=? AND del=0`, card) || {}).n || 0 }; }));
    }
    if (p === '/popular') { // 1.8.1 what the family has ❤️/👍'd in the last 4 days (ids, names, kind, time) – feeds everyone's ranking
      const rows = this.all(`SELECT l.card, l.kind, l.at, l.mid, m.name, l.emo FROM reacts l JOIN members m ON m.id=l.mid AND m.removed=0 WHERE l.at>? ORDER BY l.at DESC LIMIT 800`, now - 4 * 864e5), out = {};
      for (const r of rows) if (this.canSee(r.card, me.id) && !(r.kind === 'love' && NEUTRAL_EMO.has(r.emo))) (out[r.card] = out[r.card] || []).push([r.mid, r.name, r.kind === 'love' ? 2 : 1, r.at]); // 1.9.42 😠/😐 don't boost
      return J({ at: now, pop: out });
    }
    if (p === '/likes' && m === 'GET') { // 1.8.6 who ❤️/👍'd some public cards (the pinned specials)
      const out = {};
      for (const c of (u.searchParams.get('cards') || '').split(',').slice(0, 10)) { const card = clean(c, 120); if (/^[\w.-]{2,80}$/.test(card) && !PRIVATE_ID.test(card) && this.canSee(card, me.id)) out[card] = { likes: this.reactsOf(card, 'love'), ups: this.reactsOf(card, 'up') }; }
      return J({ rx: out });
    }
    if (p === '/likes' && m === 'POST') { // 1.8.1 ❤️ and 👍 on anything in the family network: everyone in the family sees how many and who
      const b = await body(), card = clean(b.card, 120), kinds = b.kind === 'none' ? ['love', 'up'] : [b.kind === 'up' ? 'up' : 'love'];
      // a family post (sh…) must still be there; any other card must be a public feed card id (never Shane's own life:/app:/ph:/you: cards)
      const sh = /^sh\d+$/.test(card) ? this.one(`SELECT id FROM shares WHERE id=? AND del=0 AND priv>0`, +card.slice(2)) : /^[\w.-]{2,80}$/.test(card) && !PRIVATE_ID.test(card);
      if (!sh || !this.canSee(card, me.id)) return J({ err: 'that post is gone' }, 404);
      const emo = EMO[b.emo] && b.emo !== 'love' ? b.emo : null; // 1.9.42 one reaction per person: another emoji switches it
      for (const kind of kinds) {
        const hadR = this.one(`SELECT at, emo FROM reacts WHERE card=? AND mid=? AND kind=?`, card, me.id, kind), had = !!hadR;
        if (kind === 'love' && had && b.kind !== 'none' && b.on !== false && (hadR.emo || null) !== emo) { this.sql.exec(`UPDATE reacts SET emo=?, at=? WHERE card=? AND mid=? AND kind='love'`, emo, now, card, me.id); continue; }
        const want = b.kind === 'none' ? false : typeof b.on === 'boolean' ? b.on : true; // 1.9.33 never an implicit toggle: a repeat tap can't undo or add // 'none' = a private 👎: takes back their ❤️/👍
        if (want === had) continue;
        if (want && (this.one(`SELECT COUNT(*) n FROM reacts WHERE mid=? AND at>?`, me.id, now - RATE_MS) || {}).n >= 60) return J({ err: 'slow down a little' }, 429);
        if (want) { this.sql.exec(`INSERT OR IGNORE INTO reacts (card,mid,kind,at,emo) VALUES (?,?,?,?,?)`, card, me.id, kind, now, kind === 'love' ? emo : null); try { const ow = /^sh\d+$/.test(card) ? (this.one(`SELECT mid FROM shares WHERE id=?`, +card.slice(2)) || {}).mid : null; if (ow && ow !== me.id) await this.rt.note(ow, 'mine', kind === 'love' ? `${EMO[emo || 'love'][0]} ${me.name} ${EMO[emo || 'love'][1]} your post` : `👍 ${me.name} liked your post`, card); } catch (e) { } } else this.sql.exec(`DELETE FROM reacts WHERE card=? AND mid=? AND kind=?`, card, me.id, kind);
      }
      return J({ likes: this.reactsOf(card, 'love'), ups: this.reactsOf(card, 'up') });
    }
    if (p === '/photos' && m === 'POST') { // one picture (raw JPEG body); becomes visible once it's attached to a post
      if (+(req.headers.get('Content-Length') || 0) > PH_MAX) return J({ err: 'that photo is too big' }, 413);
      const raw = new Uint8Array(await req.arrayBuffer()); if (raw.length > PH_MAX) return J({ err: 'that photo is too big' }, 413);
      const img = stripJpeg(raw); if (!img || img.length < 500) return J({ err: 'not a photo' }, 400);
      this.sql.exec(`DELETE FROM photos WHERE mid=? AND post IS NULL AND at<?`, me.id, now - 864e5); // never-posted leftovers
      if ((this.one(`SELECT COUNT(*) n FROM photos WHERE mid=? AND at>?`, me.id, now - 864e5) || {}).n >= PH_DAY) return J({ err: `that's ${PH_DAY} photos today – more tomorrow` }, 429);
      if ((this.one(`SELECT COALESCE(SUM(size),0) n FROM photos WHERE mid=?`, me.id) || {}).n + img.length > PH_PERSON) return J({ err: 'your photo space is full – delete some old posts' }, 507);
      if ((this.one(`SELECT COALESCE(SUM(size),0) n FROM photos`) || {}).n + img.length > PH_ALL) return J({ err: 'the family photo space is full – ask Shane' }, 507);
      const w = Math.min(4000, +u.searchParams.get('w') || 0), h = Math.min(4000, +u.searchParams.get('h') || 0);
      this.sql.exec(`INSERT INTO photos (mid,post,w,h,size,data,at) VALUES (?,NULL,?,?,?,?,?)`, me.id, w, h, img.length, img.buffer.slice(img.byteOffset, img.byteOffset + img.length), now);
      return J({ id: this.one(`SELECT last_insert_rowid() id`).id, size: img.length });
    }
    mm = p.match(/^\/photos\/(\d+)$/);
    if (mm && m === 'GET') {
      const r = this.one(`SELECT ph.mid, ph.post, ph.data FROM photos ph LEFT JOIN shares s ON s.id=ph.post WHERE ph.id=? AND ((ph.post IS NOT NULL AND s.del=0 AND (s.vis IS NULL OR instr(s.vis, ',' || ? || ',') > 0)) OR (ph.post IS NULL AND ph.mid=?))`, +mm[1], me.id, me.id);
      if (!r) return J({ err: 'gone' }, 404);
      return new Response(r.data, { headers: { 'Content-Type': 'image/jpeg', 'X-Content-Type-Options': 'nosniff' } });
    }
    if (p === '/shares' && m === 'POST' && u.searchParams.get('photos') !== null) { // a post of the member's own photos
      const b = await body(), ids = [...new Set((b.photos || []).map(x => +x).filter(Boolean))];
      if (!ids.length || ids.length > PH_POST) return J({ err: `1–${PH_POST} photos per post` }, 400);
      const caption = clean(b.caption, 300), tag = clean(b.tag, 20), tagOk = !tag || Object.values(TAGS).some(re => re.test(tag));
      if (!tagOk) return J({ err: 'unknown tag' }, 400);
      if (isUnsafe({ t: caption })) return J({ err: 'please keep it family-friendly' }, 400);
      const mine = this.all(`SELECT id,w,h FROM photos WHERE mid=? AND post IS NULL AND id IN (${ids.map(() => '?').join(',')})`, me.id, ...ids);
      if (mine.length !== ids.length) return J({ err: 'those photos aren’t ready – try again' }, 400);
      if ((this.one(`SELECT COUNT(*) n FROM shares WHERE mid=? AND at>?`, me.id, now - RATE_MS) || {}).n >= RATE_N) return J({ err: 'slow down a little' }, 429);
      const snap = { t: caption, photos: ids.map(id => { const x = mine.find(y => y.id === id); return { id, w: x.w, h: x.h }; }), topic: 'family', kind: 'upload', sn: me.name };
      if (tag) snap.tag = tag;
      this.sql.exec(`INSERT INTO shares (mid,orig,snap,caption,priv,at,tag) VALUES (?,?,?,?,2,?,?)`, me.id, 'up' + now, JSON.stringify(snap), '', now, tag || null);
      const sid = this.one(`SELECT last_insert_rowid() id`).id;
      try { for (const r of this.all(`SELECT id FROM members WHERE removed=0 AND id!=?`, me.id)) await this.rt.note(r.id, 'photo', `📷 ${me.name} posted ${ids.length > 1 ? ids.length + ' photos' : 'a photo'}${caption ? ': “' + caption.slice(0, 60) + '”' : ''}`, 'sh' + sid); } catch (e) { }
      this.sql.exec(`UPDATE photos SET post=? WHERE mid=? AND id IN (${ids.map(() => '?').join(',')})`, sid, me.id, ...ids);
      if (!this.bot.muted(me.id)) this.botReact('photo', 'sh' + sid, caption, 0.7);
      return J({ id: sid, at: now });
    }
    if (p === '/photos/usage') { const a = this.one(`SELECT COUNT(*) n, COALESCE(SUM(size),0) b FROM photos WHERE mid=?`, me.id), t = this.one(`SELECT COUNT(*) n, COALESCE(SUM(size),0) b FROM photos`); return J({ mine: a, all: admin ? t : undefined, limits: { perPhoto: PH_MAX, perPost: PH_POST, perDay: PH_DAY, perPerson: PH_PERSON, family: PH_ALL } }); }
    // ---- 1.9.16 🔗 share a link from Facebook, Instagram, TikTok or any website (Android Share sheet, or paste)
    if (p === '/preview' && m === 'GET') {
      const raw = findUrl(u.searchParams.get('url'), u.searchParams.get('text'), u.searchParams.get('title')); if (!raw) return J({ err: 'No link found – copy the link and paste it here.' }, 400);
      if (admin && u.searchParams.get('fresh')) this.sql.exec(`DELETE FROM pvcache`);
      const pv = await this.linkPv(raw, clean(u.searchParams.get('caption'), 300)); if (pv.err) return J(pv, 400);
      return J(pv.blocked ? { blocked: pv.blocked, err: BLOCK_MSG[pv.blocked], site: pv.site } : pv);
    }
    if (p === '/preview/debug' && m === 'GET' && admin) { // admin: how a public page looks from here (status, final address, og:title)
      const out = [];
      for (const ua of ['facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36', 'WhatsApp/2.23.20.0', 'Twitterbot/1.0', 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)']) {
        try { const r = await fetch(u.searchParams.get('url'), { headers: { 'User-Agent': ua, 'Accept-Language': 'en-NZ,en;q=0.8' }, redirect: 'follow' }); const t = (await r.text()).slice(0, 300000);
          out.push({ ua: ua.slice(0, 20), st: r.status, url: r.url.slice(0, 90), og: (t.match(/property="og:title" content="([^"]*)"/) || [])[1] || '', desc: ((t.match(/property="og:description" content="([^"]*)"/) || [])[1] || '').slice(0, 80) }); } catch (e) { out.push({ ua: ua.slice(0, 20), e: e.message }); }
      }
      return J(out);
    }
    if (p === '/preview/pics' && m === 'GET') { // 1.9.18 "another picture": more free photos for a few words
      const q = clean(u.searchParams.get('q'), 60); return J({ pics: q ? await stockPics(q, 8) : [] });
    }
    if (p === '/shares/link' && m === 'POST') {
      const b = await body(), raw = findUrl(b.url, b.text); if (!raw || !safeUrl(raw)) return J({ err: 'No link found – copy the link and paste it here.' }, 400);
      const caption = clean(b.caption, 300);
      if ((this.one(`SELECT COUNT(*) n FROM shares WHERE mid=? AND at>?`, me.id, now - RATE_MS) || {}).n >= RATE_N) return J({ err: 'slow down a little' }, 429);
      const pv = await this.linkPv(raw, caption); if (pv.err) return J(pv, 400);
      if (pv.blocked) return J({ blocked: pv.blocked, err: BLOCK_MSG[pv.blocked] }, 400);
      // 1.9.18 the description: theirs if they edited it, else the automatic one; it must say something real
      const desc = clean(b.desc, 300) || pv.sum || pv.s || '';
      // 1.9.37 the description is optional when the post can't be read: their comment, or just where it's from
      const why = blockedWhy(pv.t, desc, caption); if (why) return J({ blocked: why, err: BLOCK_MSG[why] }, 400);
      // the picture: their own photo, one of the offered free photos, or the link's own public picture – never a bare logo
      let img = '', photos = null; const pid = +b.photo || 0;
      if (pid) { const ph = this.one(`SELECT id,w,h FROM photos WHERE id=? AND mid=? AND post IS NULL`, pid, me.id); if (!ph) return J({ err: 'that photo isn’t ready – try again' }, 400); photos = [{ id: ph.id, w: ph.w, h: ph.h }]; }
      else { const want = clean(b.img, 500); img = want && (want === pv.img || want === pv.brand || /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(want)) ? want : pv.img; }
      if (!img && !photos) img = pv.brand || 'https://shane-my-app.pages.dev/feed/img/share-web.svg'; // 1.9.37 never blocked for want of a picture
      if (!img && !photos) return J({ needPic: 1, err: 'Pick a picture for it – tap “Another picture” or “Use my photo”.' }, 400);
      let vis = null; const to = Array.isArray(b.to) ? [...new Set(b.to.map(String))] : [];
      if (to.length) { const ok = this.all(`SELECT id FROM members WHERE removed=0 AND id IN (${to.map(() => '?').join(',')})`, ...to.slice(0, 20)).map(r => r.id).filter(x => x !== me.id); if (!ok.length) return J({ err: 'Pick at least one person' }, 400); vis = ',' + [me.id, ...ok].join(',') + ','; }
      const dup = this.one(`SELECT id FROM shares WHERE mid=? AND orig=? AND del=0 AND at>?`, me.id, 'ln:' + pv.url.slice(0, 110), now - 864e5); if (dup) return J({ id: dup.id, dup: 1 });
      const snap = { t: pv.t, s: desc || (caption ? '' : `Shared from ${pv.site}`), url: pv.url, img, sn: pv.site, topic: 'family', src: 'family', kind: 'link', plat: pv.plat, auto: !clean(b.desc, 300) && !!pv.sum ? 1 : 0 };
      if (pv.vid && /^[\w-]{11}$/.test(pv.vid)) snap.vid = pv.vid; // ▶️ plays in the card
      if (photos) snap.photos = photos;
      this.sql.exec(`INSERT INTO shares (mid,orig,snap,caption,priv,at,vis) VALUES (?,?,?,?,3,?,?)`, me.id, 'ln:' + pv.url.slice(0, 110), JSON.stringify(snap), caption, now, vis);
      const sid = this.one(`SELECT last_insert_rowid() id`).id;
      if (photos) this.sql.exec(`UPDATE photos SET post=? WHERE id=?`, sid, photos[0].id);
      try { const who = vis ? this.all(`SELECT id FROM members WHERE removed=0 AND instr(?, ',' || id || ',') > 0 AND id!=?`, vis, me.id) : this.all(`SELECT id FROM members WHERE removed=0 AND id!=?`, me.id); for (const r of who) await this.rt.note(r.id, 'photo', `🔗 ${me.name} shared${vis ? ' with you' : ''}: ${caption ? '“' + caption.slice(0, 50) + '” – ' : ''}${pv.t.slice(0, 60)}`, 'sh' + sid); } catch (e) { }
      return J({ id: sid, at: now, card: 'sh' + sid, snap });
    }

    if (p === '/shares/text' && m === 'POST') { // 1.9.176 words-only family post
      const b = await body(), text = clean(b.text || b.body || b.caption, MAX_TEXT + 1);
      if (!text) return J({ err: 'Write a few words first' }, 400);
      if (text.length > MAX_TEXT) return J({ err: `keep it under ${MAX_TEXT} characters` }, 400);
      if (isUnsafe({ t: text })) return J({ err: 'please keep it family-friendly' }, 400);
      const why = blockedWhy(text); if (why) return J({ blocked: why, err: BLOCK_MSG[why] }, 400);
      if ((this.one(`SELECT COUNT(*) n FROM shares WHERE mid=? AND at>?`, me.id, now - RATE_MS) || {}).n >= RATE_N) return J({ err: 'slow down a little' }, 429);
      let vis = null; const to = Array.isArray(b.to) ? [...new Set(b.to.map(String))] : [];
      if (to.length) { const ok = this.all(`SELECT id FROM members WHERE removed=0 AND id IN (${to.map(() => '?').join(',')})`, ...to.slice(0, 20)).map(r => r.id).filter(x => x !== me.id); if (!ok.length) return J({ err: 'Pick at least one person' }, 400); vis = ',' + [me.id, ...ok].join(',') + ','; }
      const snap = { t: text, s: '', topic: 'family', src: 'family', kind: 'text', sn: me.name };
      this.sql.exec(`INSERT INTO shares (mid,orig,snap,caption,priv,at,vis) VALUES (?,?,?,?,4,?,?)`, me.id, 'tx' + now, JSON.stringify(snap), '', now, vis);
      const sid = this.one(`SELECT last_insert_rowid() id`).id;
      try { const who = vis ? this.all(`SELECT id FROM members WHERE removed=0 AND instr(?, ',' || id || ',') > 0 AND id!=?`, vis, me.id) : this.all(`SELECT id FROM members WHERE removed=0 AND id!=?`, me.id); const short = text.length > 70 ? text.slice(0, 68) + '…' : text; for (const r of who) await this.rt.note(r.id, 'photo', `✏️ ${me.name} wrote${vis ? ' to you' : ''}: “${short}”`, 'sh' + sid); } catch (e) { }
      if (!this.bot.muted(me.id)) this.botReact('comment', 'sh' + sid, text, 0.4);
      return J({ id: sid, at: now, card: 'sh' + sid, snap });
    }
    if (p === '/shares' && m === 'POST') {
      const b = await body(), s = b.snap || {}, orig = clean(b.orig, 120), priv = !!b.priv;
      if (!orig || (!priv && PRIVATE_ID.test(orig))) return J({ err: 'bad card' }, 400);
      if (priv && !admin) return J({ err: 'only Shane can share his own boards' }, 403);
      const https = x => /^https:\/\//.test(x || '') ? clean(x, 500) : '';
      const snap = { t: clean(s.t, 160), s: clean(s.s, 400), url: https(s.url), img: https(s.img), vid: /^[\w-]{6,20}$/.test(s.vid || '') ? s.vid : '', sn: clean(s.sn, 80), topic: clean(s.topic, 24), src: clean(s.src, 40), kind: clean(s.kind, 12), cat: clean(s.cat, 16), ev: +s.ev || 0 };
      if (!snap.t) return J({ err: 'nothing to share' }, 400);
      if (isUnsafe(snap, snap.topic) || isUnsafe({ t: b.caption })) return J({ err: 'that can’t be shared (family-safe only)' }, 400);
      if (/\$\s?\d|\b(bills?|payments?|invoices?|mortgage|loan|debt|bank)\b/i.test(snap.t + ' ' + snap.s)) return J({ err: 'money things are never shared' }, 400);
      if ((this.one(`SELECT COUNT(*) n FROM shares WHERE mid=? AND at>?`, me.id, now - RATE_MS) || {}).n >= RATE_N) return J({ err: 'slow down a little' }, 429);
      const dup = this.one(`SELECT id FROM shares WHERE mid=? AND orig=? AND del=0`, me.id, orig); if (dup) return J({ id: dup.id, dup: 1 });
      this.sql.exec(`INSERT INTO shares (mid,orig,snap,caption,priv,at) VALUES (?,?,?,?,?,?)`, me.id, orig, JSON.stringify(snap), clean(b.caption, 200), priv ? 1 : 0, now);
      return J({ id: this.one(`SELECT last_insert_rowid() id`).id, at: now });
    }
    mm = p.match(/^\/shares\/(\d+)$/);
    if (mm && m === 'DELETE') {
      const r = this.one(`SELECT id,mid,orig FROM shares WHERE id=? AND del=0`, +mm[1]); if (!r) return J({ err: 'gone' }, 404);
      if (r.mid !== me.id && !admin) return J({ err: 'only your own' }, 403);
      this.sql.exec(`UPDATE shares SET del=1, snap='{}' WHERE id=?`, r.id); this.sql.exec(`DELETE FROM photos WHERE post=?`, r.id); this.sql.exec(`UPDATE comments SET del=1 WHERE card=?`, 'sh' + r.id);
      this.sql.exec(`DELETE FROM reacts WHERE card=?`, 'sh' + r.id);
      return J({ ok: 1 }); // un-shared: its copy is wiped
    }

    // ---- each person's own feed settings (interests, mood), so a new phone picks them up
    if (p === '/prefs' && m === 'GET') { const r = this.one(`SELECT j,at FROM prefs WHERE mid=?`, me.id), pr = this.one(`SELECT stage, sugg, sit, age FROM mprof WHERE mid=?`, me.id), nudge = pr ? nudgeFor(pr.stage, pr.sugg, pr.sit, pr.age) : null; return J(r ? { at: r.at, prefs: JSON.parse(r.j), nudge } : { nudge }); } // 1.9.0 nudge: suggestions only (the stage itself stays with Shane)
    if (p === '/prefs' && m === 'PUT') { const t = await req.text(); if (t.length > 20000) return J({ err: 'too big' }, 400); let np; try { np = JSON.parse(t); } catch (e) { return J({ err: 'bad' }, 400); } const op = this.one(`SELECT j FROM prefs WHERE mid=?`, me.id); if (op) { try { const o = JSON.parse(op.j); if (o.adds) np.adds = [...new Set([...(o.adds || []), ...(np.adds || [])])]; if (o.vlTags) np.vlTags = o.vlTags; } catch (e) { } } this.sql.exec(`INSERT INTO prefs (mid,j,at) VALUES (?,?,?) ON CONFLICT(mid) DO UPDATE SET j=excluded.j, at=excluded.at`, me.id, JSON.stringify(np), now); return J({ ok: 1 }); }

    const rr = await this.rt.route(p, m, u, req, me, admin, J, body); if (rr) return rr; // 1.9.0
    return J({ err: 'unknown' }, 404);
  }
}
