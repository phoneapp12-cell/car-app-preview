/* My Feed – service worker. To ship an update: change VERSION. */
const CACHE = 'my-feed-';
const VERSION = '1.2.1';
const SHELL = ['./', 'index.html', 'app.js?v=' + VERSION, 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE + VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n.startsWith(CACHE) && n !== CACHE + VERSION).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // feed data and pictures go straight to the network
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE + VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(r => r || caches.match('index.html'))));
});
