/* Info Book – service worker. To ship an update: change VERSION. */
const CACHE = 'my-feed-';
const VERSION = '1.9.203';
const SHELL = ['./', 'index.html', 'portal.js?v=' + VERSION, 'app.js?v=' + VERSION, 'family.js?v=' + VERSION, 'extras.js?v=' + VERSION, 'jokes.js?v=' + VERSION, 'learn.js?v=' + VERSION, 'common-en.js?v=' + VERSION, 'explain.js?v=' + VERSION, 'effects.js?v=' + VERSION, 'stories.js?v=' + VERSION, 'weekly.js?v=' + VERSION, 'play.js?v=' + VERSION, 'nz.js?v=' + VERSION, 'read.js?v=' + VERSION, 'sights.js?v=' + VERSION, 'art3d.js?v=' + VERSION, 'cal.js?v=' + VERSION, 'back.js?v=' + VERSION, 'manifest.webmanifest', 'icons/icon-192.png', 'icons/logo.svg', 'img/xmas.webp', 'img/newyear.webp', 'img/play/banner-match.svg', 'img/play/banner-sitcom.svg', 'img/play/banner-animal.svg', 'img/play/zoomquilt.svg', 'img/play/falling.svg', 'img/play/tetris.svg', 'tetris', 'tetris.js?v=' + VERSION, 'scrabble', 'scrabble.js?v=' + VERSION, 'scores.js?v=' + VERSION, 'sugar-rush', 'sugar-rush.js?v=' + VERSION, 'img/play/kiwi.svg', 'img/play/tui.svg', 'img/play/pukeko.svg', 'img/play/korora.svg', 'img/play/kea.svg', 'img/play/fantail.svg', 'img/play/ruru.svg', 'img/play/dog.svg'];
/* 1.9.83 wait-verify: new SW waits (no skipWaiting or clients.claim) — new SW waits until the next open so the page never reloads mid-session */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE + VERSION);
    // cache: 'reload' skips the browser HTTP cache, so this version cannot store an old portal.js
    await Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))));
  })());
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n.startsWith(CACHE) && n !== CACHE + VERSION).map(n => caches.delete(n))))); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || /\.mp3$/i.test(u.pathname)) return; // music streams with range requests, so leave it to the browser // feed data and pictures go straight to the network
  // 1.9.166 Always fetch game scripts as this VERSION (and with cache: 'reload') so a cached
  // tetris.html that still says src="tetris.js" cannot keep playing from an old tetris.js.
  // Game pages (pretty URLs /feed/tetris, /feed/sugar-rush, /feed/scrabble) also reload.
  const gameJs = /\/(tetris|sugar-rush|scrabble|scores)\.js$/i.test(u.pathname);
  const gamePage = /\/(tetris|sugar-rush|scrabble)(\.html)?$/i.test(u.pathname);
  const url = gameJs ? (u.pathname + '?v=' + VERSION) : e.request.url;
  const bust = e.request.mode === 'navigate' || /\.js$/i.test(u.pathname) || gamePage;
  const net = bust ? fetch(url, { cache: 'reload', credentials: 'same-origin', redirect: 'follow' }) : fetch(e.request);
  e.respondWith(net.then(r => { const copy = r.clone(); caches.open(CACHE + VERSION).then(c => { c.put(url, copy); if (gameJs) c.put(u.pathname, r.clone()); }); return r; }).catch(() => caches.match(url).then(r => r || caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(r => r || caches.match('index.html')))));
});

/* 1.9.0 family notifications: the push has no content; ask the family service what's new (with this person's own token,
   saved here by the page when they turned notifications on) and show it. Always shows something, as browsers require. */
function nzQuiet(ms) {
  const h = Number(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', hour: '2-digit' }).format(new Date(ms)));
  return h >= 21 || h < 8;
}
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'ib-comeback') return;
  e.waitUntil((async () => {
    const cache = await caches.open('ib-comeback');
    const saved = await cache.match('/feed/__comeback');
    if (!saved) return;
    const s = await saved.json();
    const now = Date.now();
    if (!s.lastOpen || now - s.lastOpen < 2 * 86400000 || (s.lastNote && now - s.lastNote < 2 * 86400000) || nzQuiet(now)) return;
    await self.registration.showNotification('Info Book', { body: 'It has been a couple of days. Come back when you have a minute.', tag: 'comeback', icon: 'icons/icon-192.png' });
    s.lastNote = now;
    await cache.put('/feed/__comeback', new Response(JSON.stringify(s)));
  })());
});
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let data = null;
    try { data = e.data && e.data.json(); } catch (err) {}
    if (data && data.type === 'comeback') {
      await self.registration.showNotification(data.title || 'Info Book', { body: data.body || 'Come back when you have a minute.', tag: 'comeback', icon: 'icons/icon-192.png' });
      return;
    }
    let notes = [];
    try { const a = await (await caches.open('ib-auth')).match('/feed/__ib_auth'); if (a) { const { tok, api } = await a.json(); const r = await fetch(api + '/push/inbox', { headers: { Authorization: 'Bearer ' + tok } }); if (r.ok) notes = (await r.json()).notes || []; } } catch (err) { }
    const title = notes.length > 1 ? `Info Book · ${notes.length} new` : 'Info Book';
    const body = notes.length ? notes.slice(0, 4).map(n => n.text).join('\n') : 'Something new from the family';
    await self.registration.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'family', renotify: true, data: { card: (notes[0] || {}).card || '' } });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => { const all = await clients.matchAll({ type: 'window', includeUncontrolled: true }); for (const c of all) if (c.url.includes('/feed/')) { await c.focus(); return; } await clients.openWindow('./'); })());
});
