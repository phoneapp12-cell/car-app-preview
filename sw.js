/* Car & Life Due Dates – service worker.
   To ship an update: change VERSION. The new worker precaches the new files and removes old caches. */
const VERSION = '2.10.0';
const CACHE = 'due-dates-' + VERSION;
const OCR_CACHE = 'dd-ocr-tesseract-5.1.1';
const SHELL = ['./', './index.html', './app.js', './sync-logic.js', './core.js', './ical-import.js', './vendor/ical.min.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png', './images/whangarei-growers-market.jpg',
  './images/quote-01.jpg', './images/quote-02.jpg', './images/quote-03.jpg', './images/quote-04.jpg', './images/quote-05.jpg', './images/quote-06.jpg', './images/quote-07.jpg', './images/quote-08.jpg', './images/quote-09.jpg', './images/quote-10.jpg', './images/quote-11.jpg', './images/quote-12.jpg', './images/quote-13.jpg', './images/quote-14.jpg', './images/quote-15.jpg', './images/quote-16.jpg', './images/quote-17.jpg', './images/quote-18.jpg', './images/quote-19.jpg', './images/quote-20.jpg', './images/recipe-bacon-and-egg-pie.jpg', './images/recipe-bbq-chicken-thighs-with-corn.jpg', './images/recipe-bbq-lamb-steaks.jpg', './images/recipe-bbq-sausages-steak-and-salads.jpg', './images/recipe-beef-and-broccoli-stir-fry.jpg', './images/recipe-beef-and-vege-stew.jpg', './images/recipe-beef-nachos.jpg', './images/recipe-beef-tacos.jpg', './images/recipe-butter-chicken.jpg', './images/recipe-chicken-curry.jpg', './images/recipe-chicken-kebabs-on-the-bbq.jpg', './images/recipe-chicken-pasta-bake.jpg', './images/recipe-chicken-schnitzel-with-salad.jpg', './images/recipe-chicken-stir-fry.jpg', './images/recipe-chilli-con-carne.jpg', './images/recipe-corned-beef-with-white-sauce.jpg', './images/recipe-crispy-pork-belly.jpg', './images/recipe-fish-and-chips-night.jpg', './images/recipe-fish-tacos.jpg', './images/recipe-fried-rice.jpg', './images/recipe-homemade-burgers.jpg', './images/recipe-homemade-pizza.jpg', './images/recipe-honey-soy-chicken-drumsticks.jpg', './images/recipe-lamb-chops-mash-and-peas.jpg', './images/recipe-lasagne.jpg', './images/recipe-macaroni-cheese.jpg', './images/recipe-meatballs-and-spaghetti.jpg', './images/recipe-mince-and-cheese-pies.jpg', './images/recipe-pork-chops-with-apple-and-mash.jpg', './images/recipe-pulled-pork-burgers.jpg', './images/recipe-roast-chicken.jpg', './images/recipe-roast-lamb-with-veges.jpg', './images/recipe-salmon-with-rice-and-greens.jpg', './images/recipe-satay-chicken.jpg', './images/recipe-sausage-casserole.jpg', './images/recipe-savoury-mince-on-toast.jpg', './images/recipe-shepherds-pie.jpg', './images/recipe-spaghetti-bolognese.jpg', './images/recipe-steak-chips-and-salad.jpg', './images/recipe-sweet-and-sour-pork.jpg'];

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
  // The recipe scanner's text reader (about 7 MB) is only downloaded on the first scan, then kept for offline use.
  // It lives in its own cache so app updates don't throw it away.
  if (url.pathname.includes('/vendor/tesseract/')) {
    e.respondWith((async () => {
      const c = await caches.open(OCR_CACHE);
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone()).catch(() => { });
      return res;
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

// Push from the relay: bridge closure alerts, and reminders at the time you set.
// Both arrive even when the app is closed. The payload says what to show.
const RELAY = 'https://due-dates-calendar-relay.phoneapp12.workers.dev';
const VAPID_PUBLIC = 'BEsNn0TcOiNQqSE7AbDFgYGL_v45EEm-mma2_6DtecoG5c7ZvwZ7lKpAXOQry7cqfvWM0JTjtPPdK93arc0VXMU';
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Lifting bridge', {
    body: d.body || 'There’s an update about the lifting bridge.', tag: d.tag || 'bridge', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || '#bridge' }
  }));
});
// The phone occasionally renews its push address; tell the relay the new one (no "turned on" notification).
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    const key = Uint8Array.from(atob(VAPID_PUBLIC.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - VAPID_PUBLIC.length % 4) % 4)), c => c.charCodeAt(0));
    const sub = e.newSubscription || await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    // Register the new address first and move any reminders across, then drop the old one.
    await fetch(RELAY + '/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), quiet: true, previous: e.oldSubscription ? e.oldSubscription.endpoint : undefined }) });
    if (e.oldSubscription && e.oldSubscription.endpoint !== sub.endpoint) await fetch(RELAY + '/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: e.oldSubscription.endpoint }) }).catch(() => { });
  })());
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
