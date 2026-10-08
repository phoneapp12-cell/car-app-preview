/* POST /ai: write Shane's Notifications summary with Cloudflare Workers AI (free daily allowance).
 * The app sends a small JSON context (time, place, weather, due items, to-dos, notes, roster, profile facts).
 * Nothing is stored. Returns { lines: [..], sugs: [{ text, type }] } or throws. */
const MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/mistralai/mistral-small-3.1-24b-instruct', '@cf/google/gemma-3-12b-it', '@cf/meta/llama-3.2-3b-instruct'];
const SYSTEM = `You write the short notifications summary in Shane's personal phone app. Shane is 52, lives in Onerahi, Whangarei, New Zealand. Use New Zealand English.
Write like a warm, clever mate: short, natural, upbeat, a little cheeky humour is welcome. Use only the facts in the context. Never invent dates, amounts, names or events. Never nag about bedtime, sleep, teeth, medication, being late or work hours. Food ideas must be gluten free (he has coeliac disease). Mention bills only if overdue.
Fit the time of day and where he is: at work keep it brief and work-friendly; at home in the evening lean to relaxing (TV, AI music, spa, merlot on Fri/Sat, cooking on Fri/Sat); on days off suggest things like walking Zeus, bushwalks, beach, garden, tidying.
Return ONLY JSON: {"lines":["3 to 5 short bullet sentences"],"sugs":[{"text":"suggestion as a short question","type":"todo|note|appt","title":"short title to add"}]} with at most 3 sugs. Urgent overdue or due-today items come first in lines.`;

function clip(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n); }
function parseOut(txt) {
  if (txt && typeof txt === 'object') return txt;
  const s = String(txt || '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no_json');
  return JSON.parse(s.slice(a, b + 1));
}
export async function aiSummary(env, body) {
  if (!env || !env.AI) throw new Error('no_ai');
  const ctx = body && typeof body === 'object' ? body.ctx : null;
  if (!ctx || typeof ctx !== 'object') throw new Error('bad_input');
  const ctxText = clip(JSON.stringify(ctx), 6000);
  let r = null, used = '', lastErr = null;
  for (const m of MODELS) {
    try {
      r = await env.AI.run(m, {
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: 'Context: ' + ctxText }],
        max_tokens: 500, temperature: 0.8
      });
      used = m; break;
    } catch (e) { lastErr = e; }
  }
  if (!used) throw lastErr || new Error('no_model');
  const out = parseOut(r && (r.response != null ? r.response : r));
  const lines = (Array.isArray(out.lines) ? out.lines : []).map(x => clip(x, 220)).filter(Boolean).slice(0, 5);
  const sugs = (Array.isArray(out.sugs) ? out.sugs : []).map(x => ({
    text: clip(x && x.text, 160), title: clip(x && x.title, 80),
    type: ['todo', 'note', 'appt'].includes(x && x.type) ? x.type : 'todo'
  })).filter(x => x.text).slice(0, 3);
  if (!lines.length) throw new Error('empty');
  return { lines, sugs, model: used };
}
