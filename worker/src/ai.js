/* 1.9.12 🤖 Info Bot: a clearly-labelled AI family member that sometimes answers comments. Free: Cloudflare Workers AI
   (env.AI binding, free daily allocation of 10,000 neurons). It only ever sees the one post's title/source and that card's
   comment thread – nothing from anyone's private cards, cars, appointments, ages or life stages. */
import { isUnsafe } from './safe.js';
import { SPORT_RE } from './sources.js';

export const BOT_ID = 'bot:info', BOT_NAME = '🤖 Info Bot';
export const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FREQ = { rare: 0.15, some: 0.33, often: 0.5 };
const SH_CAP = 30, DAY_CAP = 40, THREAD_GAP = 60 * 60e3;
const nzDay = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const MENTION = /(^|\s)@?(info ?bot|infobot)\b|🤖/i;
const QUESTION = /\?\s*$|\?\s|^(what|how|why|when|where|who|which|does|do|is|are|can|could|should|would|any ?one)\b/i;
const MONEY = /\$\s?\d|\b(invest\w*|shares?|stocks?|crypto|bitcoin|kiwisaver|loan|mortgage|interest rate|tax|budget|savings?|bank)\b/i;
const MED = /\b(diagnos\w*|prescri\w*|dosage|dose|mg\b|medication|antibiotic\w*|lawyer|legal advice|sue)\b/i;
const PRIV = /\b(rego|wof|warrant|number ?plate|appointment|years? old|birthday on|address|phone number|password)\b/i;

export class InfoBot {
  constructor(f) { this.f = f;
    f.sql.exec(`CREATE TABLE IF NOT EXISTS aiq (cid INTEGER PRIMARY KEY, card TEXT NOT NULL, due INTEGER NOT NULL, why TEXT);
      CREATE TABLE IF NOT EXISTS aimute (mid TEXT PRIMARY KEY, at INTEGER);
      CREATE TABLE IF NOT EXISTS ailog (day TEXT PRIMARY KEY, n INTEGER DEFAULT 0, tin INTEGER DEFAULT 0, tout INTEGER DEFAULT 0, skip INTEGER DEFAULT 0);`);
    try { f.sql.exec(`ALTER TABLE ailog ADD COLUMN sh INTEGER DEFAULT 0`); } catch (e) { } }
  cfg() { const r = this.f.one(`SELECT v FROM meta WHERE k='aibot'`); let c = {}; try { c = JSON.parse(r ? r.v : '{}') || {}; } catch (e) { } return { on: c.on !== 0, freq: FREQ[c.freq] ? c.freq : 'some' }; }
  save(c) { this.f.sql.exec(`INSERT INTO meta (k,v) VALUES ('aibot',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, JSON.stringify({ on: c.on ? 1 : 0, freq: c.freq })); }
  muted(mid) { return !!this.f.one(`SELECT mid FROM aimute WHERE mid=?`, mid); }
  usage(day = nzDay(Date.now())) { return this.f.one(`SELECT n, tin, tout, skip, sh FROM ailog WHERE day=?`, day) || { n: 0, tin: 0, tout: 0, skip: 0, sh: 0 }; }
  // after a person's comment: decide whether (and when) Info Bot answers
  async consider(me, card, cid, text, now = Date.now(), force) {
    const c = this.cfg(); if (!c.on || !this.f.env.AI) return null;
    if (this.muted(me.id)) return null;
    const mention = MENTION.test(text), q = QUESTION.test(text), playful = /^dq\d/.test(card);
    const p = force ? 1 : mention ? 1 : q ? 0.85 : playful ? Math.max(0.5, FREQ[c.freq]) : FREQ[c.freq];
    if (Math.random() >= p) return null;
    const last = this.f.one(`SELECT MAX(at) t FROM comments WHERE card=? AND mid=? AND del=0`, card, BOT_ID);
    if (!mention && !force && last && last.t && now - last.t < THREAD_GAP) return null; // one per thread per hour (a direct @mention can still get an answer)
    if (last && last.t && now - last.t < 10 * 60e3) return null; // never twice in 10 minutes
    if (this.f.one(`SELECT cid FROM aiq WHERE card=?`, card)) return null;
    if (this.usage().n >= DAY_CAP) return null;
    const due = now + (force ? 5e3 : (60 + Math.floor(Math.random() * 240)) * 1e3); // 1–5 minutes, so it feels natural
    this.f.sql.exec(`INSERT OR REPLACE INTO aiq (cid,card,due,why) VALUES (?,?,?,?)`, cid, card, due, mention ? 'mention' : q ? 'question' : playful ? 'daily' : 'random');
    const cur = await this.f.ctx.storage.getAlarm(); if (!cur || cur > due) await this.f.ctx.storage.setAlarm(due);
    return due;
  }
  next() { const r = this.f.one(`SELECT MIN(due) t FROM aiq`); return r && r.t ? r.t : null; }
  async run(now = Date.now()) {
    for (const q of this.f.all(`SELECT cid, card, why FROM aiq WHERE due <= ? ORDER BY due LIMIT 5`, now + 5e3)) {
      this.f.sql.exec(`DELETE FROM aiq WHERE cid=?`, q.cid);
      try { await this.reply(q, now); } catch (e) { this.log(0, 0, 0, 1); }
    }
  }
  log(n, tin, tout, skip) { this.f.sql.exec(`INSERT INTO ailog (day,n,tin,tout,skip) VALUES (?,?,?,?,?) ON CONFLICT(day) DO UPDATE SET n=n+excluded.n, tin=tin+excluded.tin, tout=tout+excluded.tout, skip=skip+excluded.skip`, nzDay(Date.now()), n, tin, tout, skip); }
  async reply(q, now, model) {
    const c = this.cfg(); if (!c.on || this.usage().n >= DAY_CAP) return;
    const thread = this.f.all(`SELECT c.id, c.mid, m.name, m.pron, c.text, c.at, c.snap FROM comments c LEFT JOIN members m ON m.id=c.mid WHERE c.card=? AND c.del=0 AND (m.role IS NULL OR m.role!='friend') ORDER BY c.at DESC LIMIT 12`, q.card).reverse(); // 1.9.230 friends' comments never go into a family reply
    const target = thread.find(x => x.id === q.cid); if (!target || target.mid === BOT_ID) return;
    let snap = {}; for (const x of thread) { try { const s = JSON.parse(x.snap || '{}'); if (s && s.t) snap = s; } catch (e) { } }
    const fw = n => String(n || 'Someone').trim().split(/\s+/)[0], cnt = {}; for (const x of thread) if (x.mid !== BOT_ID) cnt[fw(x.name)] = (cnt[fw(x.name)] || new Set()).add(x.mid);
    const first = n => cnt[fw(n)] && cnt[fw(n)].size > 1 ? String(n).trim() : fw(n); // full name when two people share a first word
    const convo = thread.map(x => `${x.mid === BOT_ID ? 'Info Bot (you)' : first(x.name)}: ${String(x.text).slice(0, 300)}`).join('\n');
    const post = /^dq\d/.test(q.card) ? `Today's family question: "${String(snap.t || '').slice(0, 200)}"` : `A post${snap.sn ? ' from ' + String(snap.sn).slice(0, 60) : ''}: "${String(snap.t || '').slice(0, 200)}"`;
    const PR = { she: 'she/her', he: 'he/him', they: 'they/them' }, seenN = {}; for (const x of thread) if (x.mid !== BOT_ID) seenN[first(x.name)] = PR[x.pron] || 'they/them (not set – always use they/them)';
    const pronLine = Object.entries(seenN).map(([n, v]) => `${n}: ${v}`).join('; ');
    const sys = `You are Info Bot, the friendly AI helper in a New Zealand family's private app (Info Book). You are clearly an AI, not a person.
Reply to ${first(target.name)}'s latest comment in ONE or TWO short sentences (under 40 words). Warm, witty and a bit cheeky: dry humour and light, good-natured sarcasm are welcome (teasing, never mean, never about anyone's looks, weight, health or feelings). Plain everyday English. Never use Kiwi slang or catchphrases like "sweet as", "chur" or "good as", and never use Māori words or phrases (no "kia ora", "ka pai", "whānau", "mahi", "kai" etc.). At most one emoji.
Rules: family-safe only. Never talk about sport. No money, investment or financial advice. No medical or legal advice – at most a gentle "worth asking your GP / someone who knows". Don't invent facts about the family or anyone's private life, plans, cars, health, appointments or ages; only use what is in the comments below. React to what they actually said, like a cheerful friend would. If they ask what you'd do, answer playfully and imaginatively. Don't claim real personal experiences ("our dog", "I tried"), and don't talk about being an AI unless they ask. Only mention a GP or expert if they asked a health or legal question. Never suggest pesticides, sprays or killing garden creatures (in NZ, caterpillars on swan plants are monarch caterpillars – people want them). No alcohol jokes or drink emojis. If asked about sport or money, just say kindly that's not your area. Pronouns for the people in this thread – ${pronLine}. Use exactly these when you refer to someone; never guess anyone's gender from their name. Don't ask for personal details. If you're not sure, keep it simple and kind. Don't start with "Hi" every time. No hashtags. Reply with the comment text only.`;
    const user = `${post}\n\nComments so far:\n${convo}\n\nWrite Info Bot's reply to ${first(target.name)}.`;
    const ai = this.f.env.AI; if (!ai) return;
    const r = await ai.run(model || AI_MODEL, { messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: 90, temperature: 0.8 });
    const tin = (r && r.usage && r.usage.prompt_tokens) || Math.round((sys.length + user.length) / 4), tout = (r && r.usage && r.usage.completion_tokens) || 0;
    let text = String((r && (r.response || r.result && r.result.response)) || '').replace(/^\s*(info bot|🤖 info bot)\s*:\s*/i, '').replace(/^["“]|["”]$/g, '').replace(/#\w+/g, '').replace(/[🍺🍻🍷🍸🍹🥂🥃🍾]/gu, '').trim();
    if (text.length > 280) text = text.slice(0, 277).replace(/\s+\S*$/, '') + '…';
    if (!text || isUnsafe({ t: text }) || SPORT_RE.test(text) || MONEY.test(text) || MED.test(text) || PRIV.test(text) || /\b(as an ai language model|i cannot)\b/i.test(text)) { this.log(0, tin, tout, 1); return; }
    if (q.dry) return text;
    this.f.sql.exec(`INSERT INTO comments (card,mid,text,at,snap) VALUES (?,?,?,?,?)`, q.card, BOT_ID, text, Date.now(), JSON.stringify(snap));
    this.log(1, tin, tout, 0);
    try { const short = text.length > 70 ? text.slice(0, 68) + '…' : text; if (!this.muted(target.mid)) await this.f.rt.note(target.mid, 'reply', `${BOT_NAME} replied: “${short}”`, q.card); } catch (e) { }
    return text;
  }

  /* 1.9.18 🔗 link shares: one short call writes a neutral 1–2 sentence description from the public text only, plus a few
     words to find a fitting picture. Counted in the same daily Workers AI log (its own cap of SH_CAP a day). */
  async summarise(pv, caption) {
    const ai = this.f.env.AI, u = this.usage(); if (!ai || (u.sh || 0) >= SH_CAP) return null;
    const src = [pv.t && 'Title: ' + pv.t, pv.s && 'Public description: ' + pv.s, pv.site && 'Site/page: ' + pv.site, caption && 'The sharer says: ' + caption].filter(Boolean).join('\n').slice(0, 1400);
    if (src.replace(/^Site\/page:.*$/m, '').trim().length < 12) return null;
    const sys = `You write the short description for a link someone is sharing into a New Zealand family's private app.
Use ONLY the text given – never invent details, names, dates, numbers or claims that aren't there. Neutral and friendly, NZ English. The summary is TWO complete sentences, 20–45 words in total: the first says what it is (who posted it and what about), the second gives the main detail or why it might be useful. no emoji, no hashtags, don't start with "This post".
Then give 2–4 plain words for a generic stock-style photo that fits (e.g. "monarch butterfly", "beach sunset", "vegetable garden"). Never people's names, never logos or brands.
Answer as JSON only: {"summary": "...", "image": "..."}`;
    let r; try { r = await ai.run(AI_MODEL, { messages: [{ role: 'system', content: sys }, { role: 'user', content: src }], max_tokens: 110, temperature: 0.3 }); } catch (e) { return null; }
    const tin = (r && r.usage && r.usage.prompt_tokens) || Math.round((sys.length + src.length) / 4), tout = (r && r.usage && r.usage.completion_tokens) || 0;
    this.f.sql.exec(`INSERT INTO ailog (day,n,tin,tout,skip,sh) VALUES (?,0,?,?,0,1) ON CONFLICT(day) DO UPDATE SET tin=tin+excluded.tin, tout=tout+excluded.tout, sh=COALESCE(sh,0)+1`, nzDay(Date.now()), tin, tout);
    let txt = String((r && (r.response || r.result && r.result.response)) || ''), j = null;
    if (txt && typeof r.response === 'object') j = r.response; else { const m = txt.match(/\{[\s\S]*\}/); try { j = m ? JSON.parse(m[0]) : null; } catch (e) { } }
    if (!j) return null;
    let sum = String(j.summary || '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim(); if (sum.length > 260) sum = sum.slice(0, 257).replace(/\s+\S*$/, '') + '…';
    const img = String(j.image || '').replace(/[^\p{L}\p{N} '-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!sum || isUnsafe({ t: sum }) || SPORT_RE.test(sum) || MONEY.test(sum)) return { sum: '', img };
    return { sum, img };
  }
}
