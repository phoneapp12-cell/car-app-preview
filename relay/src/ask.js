/* POST /ai/ask and /ai/reply: "Getting to know you" questions for Shane's app (Workers AI, free allowance).
 * /ai/ask   { facts, known:[{q,a}], asked:[q..], tabs:[{key,name}] } -> { q, choices:[..] }
 * /ai/reply { q, a, facts, known, tabs, ctx } -> { say, tab, tabLabel }
 * Nothing is stored here; the app keeps the answers. */
const MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/mistralai/mistral-small-3.1-24b-instruct', '@cf/google/gemma-3-12b-it'];
const ASK = `You help Shane's personal phone app get to know him better. Shane is 52 and lives in Onerahi, Whangarei, New Zealand (NZ English).
Write ONE new multiple-choice question that will help the app be more useful to him day to day: his tastes, habits, plans, goals, home, family, dog Zeus, cars, food (he is coeliac, so gluten free), music, films, books, gym, garden, weekends, travel, shopping, money habits, how he likes reminders, etc.
Rules: never repeat or rephrase any question in "asked"; don't ask what "facts" or "known" already answer; one topic per question; friendly and short (under 15 words); 3 to 5 short answer choices (under 6 words each) that cover the likely answers, last one can be "Something else". No sensitive topics (health conditions, politics, religion, income figures).
Return ONLY JSON: {"q":"...","choices":["...","..."]}`;
const REPLY = `You are the friendly assistant inside Shane's personal phone app. Shane is 52 and lives in Onerahi, Whangarei, New Zealand (NZ English). He just answered a getting-to-know-you question.
Reply like a warm, clever mate in 1 to 3 short sentences. Do ONE of these, whichever is most useful:
(a) point him to the most relevant tab of the app (pick a key from "tabs") and say what he could do there;
(b) give a genuinely useful tip or piece of information he probably doesn't have yet that relates to his answer (general knowledge only, e.g. a gluten-free idea, a Northland walk, a film he might like, a gym tip; never invent prices, opening hours, dates or event details);
(c) just chat back naturally, with a light dry joke if it fits.
Food must be gluten free. Never nag about bedtime, sleep, medication, being late or work hours.
Return ONLY JSON: {"say":"...","tab":"tab key or empty string"}`;

function clip(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n); }
function parseOut(txt) {
  if (txt && typeof txt === 'object') return txt;
  const s = String(txt || ''), a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no_json');
  return JSON.parse(s.slice(a, b + 1));
}
async function run(env, system, user, temp) {
  let last = null;
  for (const m of MODELS) {
    try {
      const r = await env.AI.run(m, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 400, temperature: temp });
      return parseOut(r && (r.response != null ? r.response : r));
    } catch (e) { last = e; }
  }
  throw last || new Error('no_model');
}
const norm = s => clip(s, 200).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
export async function aiAsk(env, body) {
  if (!env || !env.AI) throw new Error('no_ai');
  const b = body && typeof body === 'object' ? body : {};
  const asked = (Array.isArray(b.asked) ? b.asked : []).map(x => clip(x, 140)).slice(-120);
  const user = clip(JSON.stringify({ facts: b.facts || [], known: (b.known || []).slice(-30), asked }), 9000);
  const seen = new Set(asked.map(norm));
  for (let i = 0; i < 2; i++) {
    const out = await run(env, ASK, user + (i ? ' (Pick a completely different topic.)' : ''), 0.95);
    const q = clip(out.q, 140), choices = (Array.isArray(out.choices) ? out.choices : []).map(x => clip(x, 40)).filter(Boolean).slice(0, 5);
    if (q && choices.length >= 2 && !seen.has(norm(q))) return { q, choices };
  }
  throw new Error('no_question');
}
export async function aiReply(env, body) {
  if (!env || !env.AI) throw new Error('no_ai');
  const b = body && typeof body === 'object' ? body : {};
  const tabs = (Array.isArray(b.tabs) ? b.tabs : []).filter(t => t && t.key).slice(0, 80);
  const user = clip(JSON.stringify({ question: clip(b.q, 140), answer: clip(b.a, 200), facts: b.facts || [], known: (b.known || []).slice(-20), tabs }), 9000);
  const out = await run(env, REPLY, user, 0.8);
  const say = clip(out.say, 400);
  if (!say) throw new Error('empty');
  const t = tabs.find(x => x.key === clip(out.tab, 30));
  return { say, tab: t ? t.key : '', tabLabel: t ? clip(t.name, 40) : '' };
}
