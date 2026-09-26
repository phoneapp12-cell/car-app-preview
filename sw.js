/* Car & Life Due Dates – service worker.
   To ship an update: change VERSION. The new worker precaches the new files and removes old caches. */
const VERSION = '1.2.1';
const CACHE = 'due-dates-' + VERSION;
const SHELL = ['./', './index.html', './app.js', './core.js', './ical-import.js', './vendor/ical.min.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png'];

importScripts('core.js?v=' + VERSION);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // cache: 'reload' skips the browser's HTTP cache so we always store the fresh files
    await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('due-dates-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never touch other sites
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match('./index.html');
      if (hit) return hit;
      try { return await fetch(req); } catch (err) { return new Response('Offline', { status: 503 }); }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    return fetch(req);
  })());
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'version' && e.ports[0]) e.ports[0].postMessage(VERSION);
});

// Chrome on Android (installed app): runs roughly every 12 hours or more, at Android's discretion.
self.addEventListener('periodicsync', e => {
  if (e.tag === 'due-check') e.waitUntil(DD.runCheck(self.registration, { respectQuiet: true }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.url) || '#home';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.registration.scope)) {
        await c.focus();
        c.postMessage({ type: 'go', hash });
        return;
      }
    }
    await self.clients.openWindow(self.registration.scope + 'index.html' + hash);
  })());
});
