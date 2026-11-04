/* Info Book – service worker. To ship an update: change VERSION. */
const CACHE = 'my-feed-';
const VERSION = '1.9.51';
const SHELL = ['./', 'index.html', 'app.js?v=' + VERSION, 'family.js?v=' + VERSION, 'extras.js?v=' + VERSION, 'manifest.webmanifest', 'icons/icon-192.png', 'icons/logo.svg', 'img/xmas.webp', 'img/newyear.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE + VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n.startsWith(CACHE) && n !== CACHE + VERSION).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // feed data and pictures go straight to the network
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE + VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(r => r || caches.match('index.html'))));
});

/* 1.9.0 family notifications: the push has no content; ask the family service what's new (with this person's own token,
   saved here by the page when they turned notifications on) and show it. Always shows something, as browsers require. */
self.addEventListener('push', e => {
  e.waitUntil((async () => {
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
