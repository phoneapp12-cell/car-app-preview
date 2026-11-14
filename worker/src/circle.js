/* 1.9.230 Friends. Every member is either family (role 'admin' or 'member', everyone from before 1.9.230) or a friend
   (role 'friend'), invited by one family member: their host. A friend's circle is their host plus the host's other
   friends. Two people can see each other (names, comments, reactions, game boards) when:
     - both are family, or
     - one is a friend and the other is their host, or
     - both are friends of the same host.
   Everything else is hidden on the server. Family posts default to the family; a family member can also post to their
   own friends circle, or to both. A friend's posts always go to their circle. */
export const isFriend = m => !!m && m.role === 'friend';
export const isFam = m => !!m && !!m.role && m.role !== 'friend';
const rows = (sql, q, ...a) => sql.exec(q, ...a).toArray();

export function memberRow(sql, id) {
  const r = rows(sql, `SELECT * FROM members WHERE id=?`, String(id || ''))[0]; // SELECT *: older test tables have fewer columns
  return r ? { id: r.id, name: r.name, role: r.role, host: r.host || null, removed: r.removed || 0 } : null;
}
// Can a and b see each other? (a, b: member rows with id, role, host)
export function sees(a, b) {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  const fa = isFriend(a), fb = isFriend(b);
  if (!fa && !fb) return true;
  if (fa && fb) return !!a.host && a.host === b.host;
  return fa ? a.host === b.id : b.host === a.id;
}
export function activeMembers(sql) { return rows(sql, `SELECT * FROM members WHERE removed=0`).map(r => ({ id: r.id, name: r.name, role: r.role, host: r.host || null, created: r.created || 0 })).sort((a, b) => a.created - b.created); }
// Everyone (still active) this member can see, themselves included.
export function seeRows(sql, me) { return activeMembers(sql).filter(r => sees(me, r)); }
export function seeIds(sql, me) { return new Set(seeRows(sql, me).map(r => r.id)); }
// Game boards (scores, the Sugar Rush race board): family see the family; a friend sees their circle (host + host's friends).
export function gameRows(sql, me) {
  if (!isFriend(me)) return activeMembers(sql).filter(r => !isFriend(r));
  return activeMembers(sql).filter(r => r.id === me.host || (isFriend(r) && r.host === me.host));
}
export function gameIds(sql, me) { return new Set(gameRows(sql, me).map(r => r.id)); }
// Race events only start between people in the same group: the family, or one host's friends.
export function raceGroup(m) { return isFriend(m) ? 'c:' + m.host : 'fam'; }
// The friends circle that belongs to a family member (host): the host and their active friends.
export function circleIds(sql, hostId) {
  return new Set([hostId, ...rows(sql, `SELECT id FROM members WHERE removed=0 AND role='friend' AND host=?`, hostId).map(r => r.id)]);
}
/* Can this member see a post? s: { mid, vis, aud, circ }.
   aud: null/'fam' = the family, 'fr' = the friends circle of circ, 'both' = the family and that circle.
   vis (chosen people, ',id,id,'): only them and the poster, whatever aud says. */
export function shareVisible(me, s) {
  if (!me || !s) return false;
  if (s.mid === me.id) return true;
  if (s.vis) return s.vis.includes(',' + me.id + ',');
  const aud = s.aud || 'fam';
  const inCirc = !!s.circ && (me.id === s.circ || (isFriend(me) && me.host === s.circ));
  if (aud === 'fr') return inCirc;
  if (aud === 'both') return isFam(me) || inCirc;
  return isFam(me);
}
/* What a friend may call (everything else is refused with 403: default deny). Family data such as the reno card,
   calendar dates, birthdays, cars, appointments, the family poll, daily question, trivia, memories, streaks,
   profiles, weather/power alerts and every admin route stays family-only. */
export const FRIEND_OK = [
  [/^\/me$/, 'GET'], [/^\/people$/, 'GET'], [/^\/friends$/, 'GET'],
  [/^\/scores$/, '*'], [/^\/sugar-race$/, '*'], [/^\/sugar-lives$/, '*'], [/^\/scrabble(\/.*)?$/, '*'],
  [/^\/counts$/, 'GET'], [/^\/pron$/, 'PUT'], [/^\/comments$/, '*'], [/^\/comments\/\d+(\/like)?$/, '*'], [/^\/recent$/, 'GET'],
  [/^\/shares$/, '*'], [/^\/shares\/(link|text)$/, 'POST'], [/^\/shares\/\d+$/, 'DELETE'],
  [/^\/popular$/, 'GET'], [/^\/likes$/, '*'], [/^\/photos$/, 'POST'], [/^\/photos\/\d+$/, 'GET'], [/^\/photos\/usage$/, 'GET'],
  [/^\/preview$/, 'GET'], [/^\/preview\/pics$/, 'GET'], [/^\/prefs$/, '*'], [/^\/aibot$/, 'GET'], [/^\/aibot\/mute$/, 'PUT'],
  [/^\/push\/(key|sub|prefs|inbox|test)$/, '*'], [/^\/visit(\/award)?$/, 'POST'], [/^\/profile$/, 'GET'], // /profile: their own only (retain.js)
  [/^\/weather$/, 'GET'], [/^\/trivia$/, '*'], [/^\/trivia\/board$/, 'GET'], // 1.9.231 MetService's public warnings; trivia boards and counts are scoped to the circle (retain.js)
];
export function friendMay(p, m) { return FRIEND_OK.some(([re, mm]) => re.test(p) && (mm === '*' || mm === m)); }
// Card ids that belong to family-only cards (reno, poll, daily question, streaks, dates, game notices …):
// friends can't read, comment on or react to them, even though they look like public card ids.
export const FAMILY_CARD = /^(reno$|poll\d|dq\d|streaks$|intlist|sugg$|date\d|bday|cars?$|sappt|sa:|comeback|scrabble-|sugar-)/;
// Notification types a friend can get; the rest (daily poll, birthdays, streaks, weather, events, appointments,
// come-back teasers) are about the family and are never queued for a friend.
export const FRIEND_NOTES = new Set(['mine', 'reply', 'photo', 'scrabble', 'sugar']);
export const INVITE_MS = 7 * 864e5, FRIENDS_PER_HOST = 12, MAX_MEMBERS = 80, MAX_FAMILY = 30;
