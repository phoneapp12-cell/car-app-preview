/* 1.9.1 keep only the easy, everyday OpenTDB questions: no dates/years, no "which is NOT", no episode or game lore, short, clearly different options */
const HARD_Q = /\b(in what year|what year|which year|when was|when did|how many seasons|episode|season \d|isotope|federal|nickname|first president|founded|uploaded|album|released|release|which of (the|these) .{0,40}\bnot\b|\bNOT\b|\bnot\b|codename|code name|voiced|voice actor|portray|directed|director|composer|composed|lyric|b-side|debut|chart|sequel|prequel|franchise|anime|manga|pok[eé]mon go|developer|engine|console|dlc|level \d|boss|villain|protagonist|antagonist|character named|real name|born|died|dynasty|emperor|treaty|battle|war\b|wwi|wwii|world war|empire|century|bc\b|ad\b|latin|greek god|element symbol|atomic number|formula|equation|genus|species|phylum|enzyme|protein|chromosome|molecule|compound|acid|isotope|kelvin|population|gdp|currency|stock|bank|price|cost|dollar|\$)/i;
const ADULT = /\b(beer|wine|vodka|whisk(e)?y|alcohol|drunk|drug|kill|murder|death|dead|die|blood|gun|weapon|bomb|nazi|terror|sex|naked|nude|horror|zombie|devil|hell|satan|slave)\b/i;
const GAMES_OK = /\b(mario|luigi|pac-?man|tetris|minecraft|sonic|pikachu|lego|monopoly|scrabble|chess|uno|cluedo)\b/i;
const words = s => String(s).toLowerCase().replace(/[^a-z0-9ā-ū ]/g, ' ').split(/\s+/).filter(w => w.length >= 4);
export function distinct(opts) {
  const o = opts.map(x => String(x).trim()); if (new Set(o.map(x => x.toLowerCase())).size !== o.length) return false;
  if (o.some(x => !/[a-z0-9]/i.test(x) || x.length > 38)) return false;
  if (o.filter(x => /^\d[\d,.\s]*$/.test(x)).length >= 2) { const n = o.map(Number); if (n.some(isNaN)) return false; } // number answers are fine if they're plain numbers
  for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) { const a = words(o[i]), b = new Set(words(o[j])); if (a.some(w => b.has(w))) return false; const x = o[i].toLowerCase(), y = o[j].toLowerCase(); if (x.length > 3 && y.length > 3 && (x.includes(y) || y.includes(x))) return false; }
  return true;
}
export function easyEnough(q, strict) {
  const [cat, diff, text] = q, opts = q.slice(3, 7);
  if (cat === 'games' && !GAMES_OK.test(text + ' ' + opts.join(' '))) return false;
  if (cat === 'books' || cat === 'hist' && !strict) return false;
  if (text.length > (strict ? 90 : 110) || HARD_Q.test(text) || ADULT.test(text + ' ' + opts.join(' '))) return false;
  if (/\d{4}/.test(opts.join(' '))) return false; // no years as answers
  return distinct(opts);
}
