/* 1.9.24 📺 'Coming up to watch': new and upcoming shows and movies on Netflix NZ, TVNZ+ (TVNZ 1 & 2 on demand) and ThreeNow,
   from JustWatch's public NZ catalogue (no key, no account, no AI). Refreshed every ~6 hours by the cron.
   Kept: arriving in the next 14 days, or out in the last 7. Never sport, R18, money or anything not family-safe. */
import { isUnsafe } from './safe.js';
import { SPORT_RE } from './sources.js';
import { MONEY_RE } from './preview.js';
const JW = 'https://apis.justwatch.com/graphql';
export const WATCH_PK = { nfx: ['Netflix', 'https://www.netflix.com/search?q='], tnz: ['TVNZ+', 'https://www.tvnz.co.nz/search?q='], thn: ['ThreeNow', 'https://www.threenow.co.nz/search?q='] };
const C = `content(country: NZ, language: "en") { title shortDescription posterUrl backdrops { backdropUrl } genres { shortName } originalReleaseYear upcomingReleases(releaseTypes: [DIGITAL]) { releaseDate package { shortName } } ... on MovieContent { ageCertification } }`;
const Q = `query Q($date: Date!, $pt: NewPageType!, $first: Int!) { newTitles(country: NZ, date: $date, first: $first, priceDrops: false, pageType: $pt, filter: { packages: ["nfx", "tnz", "thn"] }) { edges { newOffer(platform: WEB) { package { shortName } standardWebURL } node { __typename ... on MovieOrSeason { id objectType ${C} } ... on Season { show { id content(country: NZ, language: "en") { title shortDescription posterUrl backdrops { backdropUrl } genres { shortName } ageCertification } } } } } } }`;
const GENRE = { act: 'Action', ani: 'Animation', cmy: 'Comedy', crm: 'Crime', doc: 'Documentary', drm: 'Drama', fnt: 'Fantasy', hst: 'History', hrr: 'Horror', fml: 'Family', msc: 'Music', trl: 'Thriller', rma: 'Romance', scf: 'Sci-fi', spt: 'Sport', war: 'War', wsn: 'Western', rly: 'Reality', eur: 'European' };
const NOPE = /\b(sex|sexy|erotic|strip(per|ping)?|porn|nude|naked|onlyfans|brothel|escort|playboy|lust|seduc\w*|kinky|fetish|bdsm|gore|slasher|cannibal|torture)\b/i;
const img = (p, prof) => p ? 'https://images.justwatch.com' + p.replace('{profile}', prof).replace('{format}', 'jpg') : '';
const nzNoon = d => Date.parse(d + 'T12:00:00+13:00'); // the day, midday NZ (release days are NZ calendar days)
async function q(date, pt, first) {
  const r = await fetch(JW, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; InfoBook/1.0; family feed)' }, body: JSON.stringify({ query: Q, variables: { date, pt, first } }) });
  if (!r.ok) throw new Error('justwatch ' + r.status); const j = await r.json(); if (j.errors) throw new Error('justwatch ' + (j.errors[0] || {}).message);
  return (j.data && j.data.newTitles && j.data.newTitles.edges) || [];
}
export function watchItem(e, date, pt) {
  const n = e.node || {}, c = n.content || {}, sh = (n.show && n.show.content) || null, o = e.newOffer || {};
  const up = (c.upcomingReleases || []).find(u => u.package && WATCH_PK[u.package.shortName]);
  const pk = pt === 'UPCOMING' ? up && up.package.shortName : o.package && o.package.shortName; if (!WATCH_PK[pk]) return null;
  const day = pt === 'UPCOMING' ? up && up.releaseDate : date; if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return null;
  const isSeason = n.__typename === 'Season' || n.objectType === 'SHOW_SEASON', title = isSeason && sh ? sh.title : c.title; if (!title) return null;
  const label = isSeason ? (c.title || '') : (c.originalReleaseYear ? String(c.originalReleaseYear) : '');
  const genres = [...new Set([...(c.genres || []), ...((sh && sh.genres) || [])].map(g => g.shortName))];
  const cert = String((isSeason ? sh && sh.ageCertification : c.ageCertification) || '').toUpperCase();
  const blurb = String(c.shortDescription || (sh && sh.shortDescription) || '').replace(/\s+/g, ' ').trim();
  const text = title + ' ' + label + ' ' + blurb;
  if (genres.includes('spt') || SPORT_RE.test(text) || /\b(wwe|ufc|wrestl\w*|boxing|f1|formula 1|nfl|nba|darts|luke littler|golf|snooker|cricket|rugby|marathon|olympics?|tennis|surf(ing)? champ\w*)\b/i.test(text)) return null; // never sport (or sport docos)
  if (/^(R18|RP18|R)$/.test(cert) || (/^R1[56]$/.test(cert) && (genres.includes('rma') || genres.includes('hrr')))) return null; // family-safe imagery
  if (NOPE.test(text) || isUnsafe({ t: title, s: blurb }) || MONEY_RE.test(title + ' ' + blurb)) return null;
  const bd = ((c.backdrops || [])[0] || (sh && (sh.backdrops || [])[0]) || {}).backdropUrl, po = c.posterUrl || (sh && sh.posterUrl);
  const pic = img(bd, 's1440') || img(po, 's592'); if (!pic) return null;
  const ev = nzNoon(day);
  return { id: 'wt' + String(n.id || title).replace(/[^\w]/g, '').slice(-24), t: title, label, s: blurb.length > 220 ? blurb.slice(0, 217).replace(/\s+\S*$/, '') + '…' : blurb, img: pic, poster: img(po, 's592'), pk, plat: WATCH_PK[pk][0], url: o.standardWebURL || WATCH_PK[pk][1] + encodeURIComponent(title), ev, day, up: pt === 'UPCOMING' ? 1 : 0, genres: genres.filter(g => GENRE[g]).slice(0, 4), gl: genres.map(g => GENRE[g]).filter(Boolean).slice(0, 2).join(' · '), cert, movie: !isSeason ? 1 : 0, kind: 'watch', topic: 'watch' };
}
export async function fetchWatch(now = Date.now()) {
  const nzd = k => new Date(now + 13 * 36e5 - k * 864e5).toISOString().slice(0, 10); // NZ dates (close enough either side of daylight saving)
  const jobs = [q(nzd(0), 'UPCOMING', 100).then(E => E.map(e => watchItem(e, nzd(0), 'UPCOMING')))];
  for (let k = 0; k <= 6; k++) jobs.push(q(nzd(k), 'NEW', 40).then(E => E.map(e => watchItem(e, nzd(k), 'NEW'))));
  const res = await Promise.allSettled(jobs), out = new Map(); let errs = 0;
  for (const r of res) { if (r.status !== 'fulfilled') { errs++; continue; } for (const i of r.value) if (i && i.ev < now + 14.5 * 864e5 && i.ev > now - 7 * 864e5 && !out.has(i.id)) out.set(i.id, i); }
  if (errs === res.length) throw new Error(String(res[0].reason && res[0].reason.message || 'justwatch down'));
  return { items: [...out.values()].sort((a, b) => a.ev - b.ev), errs };
}
