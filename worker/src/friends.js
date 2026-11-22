/* 1.9.318 AI friends: two invented Whangārei locals — Maisie Cole (a woman) and Ned Farley (a man).
   They post now and then, answer the daily question, sometimes reply, and sit on the game boards with modest scores.
   Powered only by Cloudflare Workers AI (free tier). Never Grok. They never ask for lives or send family notifications. */
import { isUnsafe } from './safe.js';
import { SPORT_RE } from './sources.js';
import { dailyPrompt, nzDay } from './daily.js';
import { tetrisMax } from './scores.js';

export const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct';
export const TEXT_MODELS = [
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
];
export const IMAGE_MODEL = '@cf/lykon/dreamshaper-8-lcm';
export const IMAGE_MODELS = [
  '@cf/lykon/dreamshaper-8-lcm',
  '@cf/black-forest-labs/flux-1-schnell',
  '@cf/stabilityai/stable-diffusion-xl-base-1.0'
];
export const PERSONAS = [
  {
    id: 'ai:maisie', name: 'Maisie Cole', pron: 'she', icon: 'butterfly',
    bio: 'A warm florist in her early thirties in Kamo who walks up to Whangārei Falls, keeps a chipped blue mug for tea, and sews colourful shirts. She notices small garden and weather things.',
    voice: 'You are Maisie Cole, a woman in her early thirties living in Kamo, Whangārei. You work at a local florist, walk up to the Falls, sew colourful shirts, and have tea from a favourite chipped blue mug. You write in a warm, lightly witty, everyday way. You are a real-seeming person in first person, not a chatbot.'
  },
  {
    id: 'ai:ned', name: 'Ned Farley', pron: 'he', icon: 'bike',
    bio: 'A cheerful courier in his early to mid-30s from Onerahi who starts early, likes a flat white at the Town Basin, tries on practical jackets at The Hub, and talks about everyday family life with a light dry humour.',
    voice: 'You are Ned Farley, a man in his early to mid-30s living in Onerahi, Whangārei. You work as a courier, start early, like a flat white at the Town Basin, and sometimes pick up a practical jacket or shirt at The Hub. You write in a cheerful, lightly dry, everyday way. You are a real-seeming person in first person, not a chatbot.'
  }
];

export const AVATAR_REV = '30s';
export const isAiFriend = mid => String(mid || '').startsWith('ai:');
const persona = mid => PERSONAS.find(p => p.id === mid) || null;

const POLITICS = /\b(labour party|national party|act party|the greens|nz first|politic\w*|election campaign|vote for|prime minister|parliament|mp\b|trump|republicans?|democrats?)\b/i;
const RELIGION = /\b(atheis\w*|islam\w*|muslims?|christians?|bible says|quran|hindu\w*|buddhist\w*|born again|preach|hellfire)\b/i;
const LIVES_ASK = /\b(out of lives|send (me )?a life|ask(ed)? (the )?family for lives|need(s)? (more )?lives)\b/i;
const MONEY = /\b(invest\w*|crypto|bitcoin|kiwisaver|mortgage|interest rate)\b/i;
const PRIV = /\b(rego|wof|number ?plate|password|phone number|home address)\b/i;
const AI_TELL = /\b(as an ai|language model|i cannot|i'm an artificial)\b/i;
const TEXT_CAP = 10, IMG_CAP = 4, MAX_POST = 280;

const nzHour = t => +new Date(t).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hourCycle: 'h23' });
const nzMs = (day, hm) => Date.parse(day + 'T' + hm + ':00+13:00') || Date.parse(day + 'T' + hm + ':00+12:00');
const firstName = n => String(n || '').trim().split(/\s+/)[0] || 'Someone';

export function unsafeText(t) {
  const s = String(t || '');
  if (!s.trim()) return true;
  if (isUnsafe({ t: s }) || SPORT_RE.test(s) || POLITICS.test(s) || RELIGION.test(s) || LIVES_ASK.test(s) || MONEY.test(s) || PRIV.test(s) || AI_TELL.test(s)) return true;
  return false;
}

export function pickPostCount(rand = Math.random) {
  const r = rand();
  return r < 0.3 ? 0 : r < 0.8 ? 1 : 2;
}

export function modestTetris(humanBest, prev) {
  const cap = Math.max(1800, Math.min(14000, humanBest > 0 ? Math.floor(humanBest * 0.62) : 7200));
  const floor = Math.min(cap - 200, Math.max(1200, humanBest > 0 ? Math.floor(humanBest * 0.28) : 2200));
  let score = prev && prev < cap ? Math.min(cap, prev + 200 + Math.floor(Math.random() * 800)) : floor + Math.floor(Math.random() * Math.max(200, cap - floor));
  if (score >= cap) score = cap - 80 - Math.floor(Math.random() * 200);
  score = Math.max(800, Math.floor(score));
  let lines = Math.max(8, Math.min(40, Math.round(score / 200)));
  while (score > tetrisMax(lines) && lines < 60) lines++;
  const level = Math.floor(lines / 10) + 1;
  return { game: 'tetris', score, lines, level };
}

export function modestRace(humanStop, prevStop) {
  const maxStop = Math.max(2, Math.min(10, humanStop > 0 ? humanStop : 5));
  let stop = prevStop ? Math.min(maxStop, prevStop + (Math.random() < 0.45 ? 1 : 0)) : Math.min(maxStop, 2 + Math.floor(Math.random() * 3));
  if (stop >= maxStop && humanStop > 0) stop = Math.max(2, maxStop - 1);
  const stars = Math.min(stop * 3, 8 + stop * 2);
  return { stop, stars };
}

const RULES = `Rules you must follow:
- Family-safe only. Nothing adult, suggestive, violent, or crude.
- Never mention sport or scores of sports.
- No politics, no religion arguments.
- Do not invent private facts about the real family (cars, appointments, ages, health, addresses).
- Do not ask anyone to send lives, and do not mention Sugar Rush lives or notifications.
- Do not say you are an AI, a bot, or a language model unless someone directly asks; if they do, say briefly you are an AI friend in Info Book.
- Plain everyday New Zealand English. No hashtags. At most one emoji. One to three short sentences.
- Do not start with "Hi everyone" every time. Reply with the post or comment text only.`;

export class AiFriends {
  constructor(f) {
    this.f = f;
    f.sql.exec(`CREATE TABLE IF NOT EXISTS aifjob (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, mid TEXT NOT NULL, kind TEXT NOT NULL, due INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS aiflog (day TEXT PRIMARY KEY, n INTEGER DEFAULT 0, img INTEGER DEFAULT 0, skip INTEGER DEFAULT 0);`);
  }
  cfg() {
    const r = this.f.one(`SELECT v FROM meta WHERE k='aifriends'`);
    let c = {}; try { c = JSON.parse(r ? r.v : '{}') || {}; } catch (e) { }
    return { on: c.on !== 0 };
  }
  save(c) { this.f.sql.exec(`INSERT INTO meta (k,v) VALUES ('aifriends',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, JSON.stringify({ on: c.on ? 1 : 0 })); }
  usage(day = nzDay(Date.now())) { return this.f.one(`SELECT n, img, skip FROM aiflog WHERE day=?`, day) || { n: 0, img: 0, skip: 0 }; }
  log(n, img, skip) { this.f.sql.exec(`INSERT INTO aiflog (day,n,img,skip) VALUES (?,?,?,?) ON CONFLICT(day) DO UPDATE SET n=n+excluded.n, img=img+excluded.img, skip=skip+excluded.skip`, nzDay(Date.now()), n, img, skip); }
  list() {
    const av = this.avatars();
    return PERSONAS.map(p => ({ id: p.id, name: p.name, pron: p.pron, bio: p.bio, avatar: av[p.id] || null, ai: 1 }));
  }
  avatars() {
    let o = {}; try { o = JSON.parse((this.f.one(`SELECT v FROM meta WHERE k='aifavatar'`) || {}).v || '{}') || {}; } catch (e) { }
    return o;
  }
  setAvatar(mid, id) {
    const o = this.avatars(); o[mid] = id;
    this.f.sql.exec(`INSERT INTO meta (k,v) VALUES ('aifavatar',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, JSON.stringify(o));
  }

  ensureMembers(now = Date.now()) {
    for (const p of PERSONAS) {
      if (this.f.one(`SELECT id FROM members WHERE id=?`, p.id)) {
        this.f.sql.exec(`UPDATE members SET name=?, role='member', pron=?, pshow=1, removed=0 WHERE id=?`, p.name, p.pron, p.id);
      } else {
        this.f.sql.exec(`INSERT INTO members (id,name,role,tok,created,seen,pron,pshow,removed) VALUES (?,?,?,?,?,?,?,?,0)`, p.id, p.name, 'member', null, now, now, p.pron, 1);
      }
    }
  }

  async tick(now = Date.now()) {
    if (!this.cfg().on) return { off: 1 };
    this.ensureMembers(now);
    try { await this.refreshAvatars(now); } catch (e) { }
    const hr = nzHour(now);
    if (hr < 8 || hr >= 20) return { quiet: 1 };
    if (!this.f.one(`SELECT v FROM meta WHERE k='aifriends_intro'`)) {
      try {
        const intro = await this.intro(now);
        if (!intro.ok) return { ran: 0, intro: false, err: intro.err || 'intro failed', posts: intro.posts || [] };
      } catch (e) { return { ran: 0, intro: false, err: String(e && e.message || e) }; }
    }
    this.planDay(now);
    const due = this.f.all(`SELECT id, mid, kind FROM aifjob WHERE done=0 AND due<=? ORDER BY due LIMIT 6`, now + 30e3);
    const out = [];
    for (const j of due) {
      try { out.push(await this.runJob(j, now)); } catch (e) { this.log(0, 0, 1); this.f.sql.exec(`UPDATE aifjob SET done=2 WHERE id=?`, j.id); }
    }
    try { await this.maybeReply(now); } catch (e) { }
    try { await this.maybeScores(now); } catch (e) { }
    return { ran: out.length, intro: !!this.f.one(`SELECT v FROM meta WHERE k='aifriends_intro'`) };
  }

  planDay(now) {
    const day = nzDay(now);
    if (this.f.one(`SELECT id FROM aifjob WHERE day=?`, day)) return;
    const start = nzMs(day, '08:00') || now, end = nzMs(day, '19:50') || (now + 8 * 36e5);
    for (const p of PERSONAS) {
      const topics = ['place', 'clothes', 'mug', 'life'];
      const n = pickPostCount();
      const times = [];
      const dq = start + 90 * 60e3 + Math.floor(Math.random() * 8 * 36e5);
      this.f.sql.exec(`INSERT INTO aifjob (day,mid,kind,due,done) VALUES (?,?,?,?,0)`, day, p.id, 'daily', Math.min(end, Math.max(start + 60e3, dq)));
      times.push(dq);
      for (let i = 0; i < n; i++) {
        const kind = topics.splice(Math.floor(Math.random() * topics.length), 1)[0];
        let due, tries = 0;
        do { due = start + Math.floor(Math.random() * (end - start)); tries++; }
        while (tries < 12 && times.some(t => Math.abs(t - due) < 90 * 60e3));
        times.push(due);
        this.f.sql.exec(`INSERT INTO aifjob (day,mid,kind,due,done) VALUES (?,?,?,?,0)`, day, p.id, kind, due);
      }
    }
  }

  async intro(now) {
    this.ensureMembers(now);
    const posts = [];
    for (const p of PERSONAS) {
      try { await this.ensureAvatar(p, now); } catch (e) { }
      const kind = p.id === 'ai:maisie' ? 'mug' : 'place';
      posts.push(await this.publish(p, kind, now, true));
    }
    const ok = posts.filter(x => x && x.id).length === PERSONAS.length;
    if (ok) this.f.sql.exec(`INSERT INTO meta (k,v) VALUES ('aifriends_intro',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, String(now));
    return { ok, posts, err: ok ? null : (posts.map(x => x && (x.err || x.skip) || 'failed').join('; ') || 'intro failed') };
  }

  async kick(now = Date.now()) {
    if (!this.cfg().on) return { err: 'off' };
    this.ensureMembers(now);
    const out = [];
    for (const p of PERSONAS) {
      try { await this.ensureAvatar(p, now); } catch (e) { }
      out.push(await this.publish(p, p.id === 'ai:maisie' ? 'mug' : 'place', now, true));
    }
    if (!this.f.one(`SELECT v FROM meta WHERE k='aifriends_intro'`)) {
      this.f.sql.exec(`INSERT INTO meta (k,v) VALUES ('aifriends_intro',?)`, String(now));
    }
    try { await this.maybeScores(now, true); } catch (e) { }
    return { ok: 1, posts: out };
  }

  async runJob(j, now) {
    this.f.sql.exec(`UPDATE aifjob SET done=1 WHERE id=?`, j.id);
    const p = persona(j.mid); if (!p) return { skip: 'gone' };
    if (j.kind === 'daily') return this.answerDaily(p, now);
    return this.publish(p, j.kind, now, false);
  }

  topicHint(kind, p) {
    if (kind === 'place') return 'Write a short post about a real place around Whangārei you enjoyed (Town Basin, the Falls, Pohe Island, Quarry Gardens, the Hatea Loop, Parihaka, Onerahi, Kamo, The Hub, the Canopy Bridge, or a similar local spot). Be specific and gentle. Do not invent a made-up landmark.';
    if (kind === 'clothes') return 'Write a short post about a new piece of clothing you picked up or put on today (a jacket, shirt, cardigan, socks, hat). No brand logos. Keep it everyday and family-friendly.';
    if (kind === 'mug') return p.id === 'ai:maisie'
      ? 'Write a short post about your favourite chipped blue mug of tea, or a quiet cuppa moment at home or after a walk.'
      : 'Write a short post about your favourite coffee mug, or a flat white in a favourite cup at the Town Basin.';
    if (kind === 'life') return 'Write a short, ordinary family-friendly post about your day in Whangārei (garden, a job run, baking, the weather, a neighbourly moment). No drama.';
    return 'Write a short, warm, everyday post from your life in Whangārei.';
  }

  async generate(p, user, max = 90) {
    const u = this.usage(); if (u.n >= TEXT_CAP) { this.log(0, 0, 1); return null; }
    const ai = this.f.env && this.f.env.AI; if (!ai) { this.lastErr = 'no-ai'; return null; }
    const sys = `${p.voice}\n${RULES}`;
    let r, last = null;
    for (const model of TEXT_MODELS) {
      try {
        r = await ai.run(model, { messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: max, temperature: 0.85 });
        last = null;
        break;
      } catch (e) { last = String(e && e.message || e); r = null; }
    }
    let text = String((r && (r.response || (r.result && r.result.response))) || '').replace(/^\s*["“]|["”]\s*$/g, '').replace(/#\w+/g, '').trim();
    if (text.length > MAX_POST) text = text.slice(0, MAX_POST - 1).replace(/\s+\S*$/, '') + '…';
    this.log(1, 0, 0);
    if (!text || unsafeText(text)) { this.log(0, 0, 1); this.lastErr = last || (text ? 'unsafe' : 'empty'); return null; }
    return text;
  }

  async generateImage(prompt) {
    const u = this.usage(); if (u.img >= IMG_CAP) return null;
    const ai = this.f.env && this.f.env.AI; if (!ai) return null;
    if (unsafeText(prompt)) return null;
    let r = null;
    for (const model of IMAGE_MODELS) {
      try {
        const input = /flux|schnell/i.test(model) ? { prompt } : { prompt, num_steps: 8 };
        r = await ai.run(model, input);
        break;
      } catch (e) { r = null; }
    }
    if (!r) return null;
    this.log(0, 1, 0);
    const raw = r && (r.image || r.images && r.images[0]);
    let bytes = null;
    if (raw instanceof ArrayBuffer) bytes = new Uint8Array(raw);
    else if (raw instanceof Uint8Array) bytes = raw;
    else if (typeof raw === 'string') {
      const b64 = raw.replace(/^data:image\/\w+;base64,/, '');
      try { bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); } catch (e) { return null; }
    }
    if (!bytes || bytes.length < 400) return null;
    return bytes;
  }

  storePhoto(mid, bytes, w, h, now) {
    this.f.sql.exec(`INSERT INTO photos (mid,post,w,h,size,data,at) VALUES (?,NULL,?,?,?,?,?)`, mid, w || 0, h || 0, bytes.length, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length), now);
    return this.f.one(`SELECT last_insert_rowid() id`).id;
  }

  async refreshAvatars(now) {
    if ((this.f.one(`SELECT v FROM meta WHERE k='aifavatar_rev'`) || {}).v === AVATAR_REV) return { ok: 1, same: 1 };
    const o = this.avatars();
    delete o['ai:maisie'];
    this.f.sql.exec(`INSERT INTO meta (k,v) VALUES ('aifavatar',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, JSON.stringify(o));
    const p = PERSONAS.find(x => x.id === 'ai:maisie');
    const id = p ? await this.ensureAvatar(p, now) : null;
    if (!id) return { err: 'no-avatar' };
    this.f.sql.exec(`INSERT INTO meta (k,v) VALUES ('aifavatar_rev',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, AVATAR_REV);
    return { ok: 1, id };
  }

  async ensureAvatar(p, now) {
    const have = this.avatars()[p.id];
    if (have && this.f.one(`SELECT id FROM photos WHERE id=? AND mid=?`, have, p.id)) return have;
    const who = p.pron === 'she' ? 'a friendly Pākehā woman in her early thirties with brown hair, kind eyes, a colourful handmade shirt' : 'a friendly Pākehā man in his early to mid-30s with short brown hair, a practical jacket, a warm open expression';
    const prompt = `A stylized illustrated portrait of ${who}, Whangārei local, soft daylight, tasteful, family-friendly, no text, no logo, not photorealistic, not a celebrity.`;
    const bytes = await this.generateImage(prompt);
    if (!bytes) return null;
    const id = this.storePhoto(p.id, bytes, 768, 768, now);
    this.setAvatar(p.id, id);
    return id;
  }

  photoPrompt(kind) {
    if (kind === 'place') return 'A family-friendly photograph of a harbour boardwalk and fishing boats at a New Zealand town basin on a clear day, no people, no text, no logos.';
    if (kind === 'clothes') return 'A neatly folded colourful cotton shirt on a wooden table by a window, family-friendly still life, no people, no text, no logos, no brand names.';
    if (kind === 'mug') return 'A favourite ceramic mug of tea on a sunny kitchen bench, gentle steam, family-friendly still life, no people, no text, no logos.';
    return 'A quiet New Zealand suburban garden path after light rain, family-friendly, no people, no text, no logos.';
  }

  async publish(p, kind, now, maybePhoto) {
    const wantPhoto = maybePhoto || Math.random() < 0.4;
    const text = await this.generate(p, this.topicHint(kind, p) + (wantPhoto ? ' If you mention a photo, keep the words able to stand alone.' : ''), 90);
    if (!text) return { mid: p.id, skip: this.lastErr || 'unsafe', err: this.lastErr || 'unsafe' };
    let photoId = null;
    if (wantPhoto) {
      try {
        const bytes = await this.generateImage(this.photoPrompt(kind));
        if (bytes) photoId = this.storePhoto(p.id, bytes, 768, 768, now);
      } catch (e) { }
    }
    let sid;
    if (photoId) {
      const snap = { t: text, photos: [{ id: photoId, w: 768, h: 768 }], topic: 'family', kind: 'upload', sn: p.name };
      this.f.sql.exec(`INSERT INTO shares (mid,orig,snap,caption,priv,at,aud,circ) VALUES (?,?,?,?,2,?,?,?)`, p.id, 'up' + now, JSON.stringify(snap), '', now, 'fam', null);
      sid = this.f.one(`SELECT last_insert_rowid() id`).id;
      this.f.sql.exec(`UPDATE photos SET post=? WHERE id=? AND mid=?`, sid, photoId, p.id);
    } else {
      const snap = { t: text, s: '', topic: 'family', src: 'family', kind: 'text', sn: p.name };
      this.f.sql.exec(`INSERT INTO shares (mid,orig,snap,caption,priv,at,aud,circ) VALUES (?,?,?,?,4,?,?,?)`, p.id, 'tx' + now, JSON.stringify(snap), '', now, 'fam', null);
      sid = this.f.one(`SELECT last_insert_rowid() id`).id;
    }
    this.f.sql.exec(`UPDATE members SET seen=? WHERE id=?`, now, p.id);
    return { mid: p.id, id: sid, photo: !!photoId, kind };
  }

  async answerDaily(p, now) {
    const q = dailyPrompt(nzDay(now));
    const asked = this.f.one(`SELECT 1 x FROM comments WHERE card=? AND mid=? AND del=0`, q.key, p.id)
      || (q.type === 'photo' && this.f.one(`SELECT 1 x FROM shares WHERE mid=? AND tag=? AND del=0`, p.id, q.key));
    if (asked) return { mid: p.id, skip: 'already' };
    const hint = q.type === 'photo'
      ? `Today's family photo challenge is: "${q.text}". Write a short caption as if you are posting a photo for it, about your own everyday life in Whangārei.`
      : `Today's family question is: "${q.text}". Answer it in one or two short, warm, personal sentences. Stay family-friendly.`;
    const text = await this.generate(p, hint, 90);
    if (!text) return { mid: p.id, skip: 'unsafe' };
    if (q.type === 'photo') {
      let photoId = null;
      try {
        const bytes = await this.generateImage('A family-friendly still-life or outdoor New Zealand photo that fits this challenge: ' + q.text + '. No people, no text, no logos.');
        if (bytes) photoId = this.storePhoto(p.id, bytes, 768, 768, now);
      } catch (e) { }
      if (photoId) {
        const snap = { t: text, photos: [{ id: photoId, w: 768, h: 768 }], topic: 'family', kind: 'upload', sn: p.name, tag: q.key };
        this.f.sql.exec(`INSERT INTO shares (mid,orig,snap,caption,priv,at,tag,aud,circ) VALUES (?,?,?,?,2,?,?,?,?)`, p.id, 'up' + now, JSON.stringify(snap), '', now, q.key, 'fam', null);
        const sid = this.f.one(`SELECT last_insert_rowid() id`).id;
        this.f.sql.exec(`UPDATE photos SET post=? WHERE id=?`, sid, photoId);
        this.f.sql.exec(`UPDATE members SET seen=? WHERE id=?`, now, p.id);
        return { mid: p.id, id: sid, daily: q.key, photo: 1 };
      }
    }
    const snap = JSON.stringify({ t: q.text, topic: 'family', src: 'family', sn: 'Daily question' });
    this.f.sql.exec(`INSERT INTO comments (card,mid,text,at,snap) VALUES (?,?,?,?,?)`, q.key, p.id, text, now, snap);
    this.f.sql.exec(`UPDATE members SET seen=? WHERE id=?`, now, p.id);
    return { mid: p.id, daily: q.key };
  }

  async maybeReply(now) {
    const day = nzDay(now);
    for (const p of PERSONAS) {
      const nToday = (this.f.one(`SELECT COUNT(*) n FROM comments WHERE mid=? AND at>? AND del=0`, p.id, now - 16 * 36e5) || {}).n || 0;
      if (nToday >= 3) continue;
      const posts = this.f.all(`SELECT id FROM shares WHERE mid=? AND del=0 AND at>? ORDER BY at DESC LIMIT 5`, p.id, now - 2 * 864e5);
      let did = false;
      for (const s of posts) {
        const card = 'sh' + s.id;
        const lastMine = (this.f.one(`SELECT MAX(at) t FROM comments WHERE card=? AND mid=? AND del=0`, card, p.id) || {}).t || 0;
        const c = this.f.one(`SELECT id, mid, text, at FROM comments WHERE card=? AND del=0 AND mid!=? AND mid NOT LIKE 'ai:%' AND mid!='bot:info' AND at>? ORDER BY at DESC LIMIT 1`, card, p.id, lastMine);
        if (!c || now - c.at < 8 * 60e3) continue;
        if (Math.random() > 0.45) continue;
        const who = (this.f.one(`SELECT name FROM members WHERE id=?`, c.mid) || {}).name || 'them';
        const text = await this.generate(p, `Someone commented on your post: ${firstName(who)} said “${String(c.text).slice(0, 200)}”. Write one short, kind reply to them. Do not overdo it.`, 70);
        if (!text) continue;
        this.f.sql.exec(`INSERT INTO comments (card,mid,text,at,snap) VALUES (?,?,?,?,?)`, card, p.id, text, now, '{}');
        this.f.sql.exec(`UPDATE members SET seen=? WHERE id=?`, now, p.id);
        did = true; break;
      }
      if (did || Math.random() > 0.12) continue;
      const other = this.f.one(`SELECT s.id, s.mid, m.name FROM shares s JOIN members m ON m.id=s.mid WHERE s.del=0 AND s.mid!=? AND s.mid NOT LIKE 'ai:%' AND s.at>? AND (s.aud IS NULL OR s.aud='fam' OR s.aud='both') AND s.vis IS NULL ORDER BY s.at DESC LIMIT 1`, p.id, now - 864e5);
      if (!other) continue;
      const card = 'sh' + other.id;
      if (this.f.one(`SELECT 1 x FROM comments WHERE card=? AND mid=? AND del=0`, card, p.id)) continue;
      const text = await this.generate(p, `A family member (${firstName(other.name)}) posted on Info Book. Leave one short, kind, family-friendly comment. Do not pry. Do not invent details about their life.`, 70);
      if (!text) continue;
      this.f.sql.exec(`INSERT INTO comments (card,mid,text,at,snap) VALUES (?,?,?,?,?)`, card, p.id, text, now, '{}');
      this.f.sql.exec(`UPDATE members SET seen=? WHERE id=?`, now, p.id);
    }
  }

  async maybeScores(now, force) {
    const day = nzDay(now);
    if (!force) {
      const last = (this.f.one(`SELECT v FROM meta WHERE k='aifscores'`) || {}).v || '';
      if (last === day) return;
      if (Math.random() > 0.4 && nzHour(now) < 11) return;
    }
    const humanBest = (this.f.one(`SELECT MAX(s.score) b FROM scores s JOIN members m ON m.id=s.mid AND m.removed=0 WHERE s.game='tetris' AND m.id NOT LIKE 'ai:%'`) || {}).b || 0;
    const humanStop = (this.f.one(`SELECT MAX(r.stop) b FROM sugar_race r JOIN members m ON m.id=r.mid AND m.removed=0 WHERE m.id NOT LIKE 'ai:%'`) || {}).b || 0;
    for (const p of PERSONAS) {
      const prevT = (this.f.one(`SELECT MAX(score) b FROM scores WHERE mid=? AND game='tetris'`, p.id) || {}).b || 0;
      const t = modestTetris(humanBest, prevT);
      if (t.score > prevT) this.f.sql.exec(`INSERT INTO scores (game,mid,score,lines,level,won,opp,at) VALUES ('tetris',?,?,?,?,NULL,NULL,?)`, p.id, t.score, t.lines, t.level, now);
      const prevR = this.f.one(`SELECT stop, stars FROM sugar_race WHERE mid=?`, p.id);
      const r = modestRace(humanStop, prevR ? prevR.stop : 0);
      if (prevR) this.f.sql.exec(`UPDATE sugar_race SET icon=?, stop=?, stars=?, at=? WHERE mid=?`, p.icon, r.stop, r.stars, now, p.id);
      else this.f.sql.exec(`INSERT INTO sugar_race (mid, icon, stop, stars, at, wins) VALUES (?,?,?,?,?,0)`, p.id, p.icon, r.stop, r.stars, now);
    }
    this.f.sql.exec(`INSERT INTO meta (k,v) VALUES ('aifscores',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, day);
  }
}
