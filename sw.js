/* Car & Life Due Dates – service worker.
   To ship an update: change VERSION. The new worker precaches the new files and removes old caches. */
const VERSION = '2.27.74';
const CACHE = 'due-dates-' + VERSION;
const OCR_CACHE = 'dd-ocr-tesseract-5.1.1';
const SHELL = ['./reno.js', 'art/i3-house.webp', 'art/cu-banner.webp', 'art/ja-banner.webp', 'art/i3-bill.webp', 'art/i3-car.webp', 'art/i3-bday.webp', 'art/i3-health.webp', 'art/i3-dentist.webp', 'art/i3-hol.webp', 'art/i3-ev.webp', 'art/i3-todo.webp', 'art/i3-shop.webp', 'art/i3-sarah.webp', 'art/i3-news.webp', 'art/i3-radio.webp', 'art/i3-travel.webp', 'art/i3-weather.webp', 'art/i3-money.webp', 'art/i3-gym.webp', 'art/i3-fuel.webp', 'art/i3-cal.webp', 'art/i3-plate.webp', 'art/i3-bin.webp', 'art/i3-rewards.webp', 'art/i3-tv.webp', 'art/i3-garden.webp', 'art/i3-pet.webp', 'art/dog.webp', './', './app.js', './app.js?v=' + VERSION, './sync-logic.js', './move.js', './move.js?v=' + VERSION, './core.js', './ical-import.js', './vendor/ical.min.js', './manifest.webmanifest', './data/tides-whangarei.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png', './images/whangarei-growers-market.jpg', './images/wx-clear-day.svg', './images/wx-clear-night.svg', './images/wx-partly-day.svg', './images/wx-partly-night.svg', './images/wx-cloudy.svg', './images/wx-fog.svg', './images/wx-rain.svg', './images/wx-rain-night.svg', './images/wx-showers.svg', './images/wx-showers-night.svg', './images/wx-snow.svg', './images/wx-storm.svg', './images/wx-wind.svg', './images/wx-wind-night.svg', './images/wx-soft.svg',
  './images/quote-01.jpg', './images/quote-02.jpg', './images/quote-03.jpg', './images/quote-04.jpg', './images/quote-05.jpg', './images/quote-06.jpg', './images/quote-07.jpg', './images/quote-08.jpg', './images/quote-09.jpg', './images/quote-10.jpg', './images/quote-11.jpg', './images/quote-12.jpg', './images/quote-13.jpg', './images/quote-14.jpg', './images/quote-15.jpg', './images/quote-16.jpg', './images/quote-17.jpg', './images/quote-18.jpg', './images/quote-19.jpg', './images/quote-20.jpg', './images/recipe-bacon-and-egg-pie.jpg', './images/recipe-lamb-and-vegetable-tray-bake.jpg', './images/recipe-chicken-and-kumara-traybake.jpg', './images/recipe-pork-and-cabbage-stir-fry.jpg', './images/recipe-vegetable-frittata.jpg', './images/recipe-stuffed-capsicums.jpg', './images/recipe-pumpkin-and-chickpea-curry.jpg', './images/recipe-roast-vegetable-salad-with-feta.jpg', './images/recipe-chicken-and-vegetable-soup.jpg', './images/recipe-minestrone-with-rice.jpg', './images/recipe-salmon-with-roast-veges.jpg', './images/recipe-thai-green-chicken-curry.jpg', './images/recipe-chickpea-flour-vegetable-fritters.jpg', './images/recipe-chicken-cacciatore.jpg', './images/recipe-mushroom-and-courgette-risotto.jpg', './images/recipe-chicken-rice-paper-rolls.jpg', './images/recipe-halloumi-and-vegetable-skewers.jpg', './images/recipe-cauliflower-and-broccoli-cheese.jpg', './images/recipe-bbq-chicken-thighs-with-corn.jpg', './images/recipe-bbq-lamb-steaks.jpg', './images/recipe-bbq-sausages-steak-and-salads.jpg', './images/recipe-beef-and-broccoli-stir-fry.jpg', './images/recipe-beef-and-vege-stew.jpg', './images/recipe-beef-nachos.jpg', './images/recipe-beef-tacos.jpg', './images/recipe-butter-chicken.jpg', './images/recipe-chicken-curry.jpg', './images/recipe-chicken-kebabs-on-the-bbq.jpg', './images/recipe-chicken-pasta-bake.jpg', './images/recipe-chicken-schnitzel-with-salad.jpg', './images/recipe-chicken-stir-fry.jpg', './images/recipe-chilli-con-carne.jpg', './images/recipe-corned-beef-with-white-sauce.jpg', './images/recipe-crispy-pork-belly.jpg', './images/recipe-fish-and-chips-night.jpg', './images/recipe-fish-tacos.jpg', './images/recipe-fried-rice.jpg', './images/recipe-homemade-burgers.jpg', './images/recipe-homemade-pizza.jpg', './images/recipe-honey-soy-chicken-drumsticks.jpg', './images/recipe-lamb-chops-mash-and-peas.jpg', './images/recipe-lasagne.jpg', './images/recipe-macaroni-cheese.jpg', './images/recipe-meatballs-and-spaghetti.jpg', './images/recipe-mince-and-cheese-pies.jpg', './images/recipe-pork-chops-with-apple-and-mash.jpg', './images/recipe-pulled-pork-burgers.jpg', './images/recipe-roast-chicken.jpg', './images/recipe-roast-lamb-with-veges.jpg', './images/recipe-salmon-with-rice-and-greens.jpg', './images/recipe-satay-chicken.jpg', './images/recipe-sausage-casserole.jpg', './images/recipe-savoury-mince-on-toast.jpg', './images/recipe-shepherds-pie.jpg', './images/recipe-spaghetti-bolognese.jpg', './images/recipe-steak-chips-and-salad.jpg', './images/recipe-sweet-and-sour-pork.jpg'];

importScripts('core.js?v=' + VERSION);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // cache: 'reload' skips the browser's HTTP cache so we always store the fresh files
    // 2.26.21: cache each file on its own, so one missing file can never block an update again
    // (2.26.18–2.26.20 listed deleted mascot files here, which made every install fail and left phones on 2.26.17)
    const res = await Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    if (res.some((r, i) => r.status === 'rejected' && (SHELL[i] === './' || /app\.js|core\.js/.test(SHELL[i])))) throw new Error('core file missing');
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

// 2.27.20: Android Share → My App (manifest share_target). Photos go straight into this phone's IndexedDB (never uploaded);
// the app downscales them next time it opens, then asks for tags.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'POST' || u.origin !== location.origin || !/\/share-photo$/.test(u.pathname)) return;
  e.respondWith((async () => {
    try { const fd = await e.request.formData(), files = fd.getAll('photos').filter(f => f && f.type && /^image\//.test(f.type));
      const db = await new Promise((ok, no) => { const r = indexedDB.open('myPhotos', 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('p')) r.result.createObjectStore('p', { keyPath: 'id' }); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
      await new Promise((ok, no) => { const t = db.transaction('p', 'readwrite'), st = t.objectStore('p'); files.forEach((f, i) => st.put({ id: 'ph-' + Date.now().toString(36) + i + Math.random().toString(36).slice(2, 6), blob: f, thumb: null, raw: true, shared: true, title: '', note: String(fd.get('text') || fd.get('title') || '').slice(0, 2000), tags: [], added: Date.now(), name: f.name || '' })); t.oncomplete = ok; t.onerror = () => no(t.error); });
    } catch (err) { }
    return Response.redirect(new URL('./#photos/tag', self.registration.scope).href, 303);
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never touch other sites
  if (/millesha\.html$/.test(url.pathname)) return; // 2.26.25: Millesha's own page loads straight from the network
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      // 2.27.50: Cloudflare Pages answers /index.html with a 308 to /. A redirected response handed to a page
      // load makes Chrome show ERR_FAILED, so the shell is './' and anything redirected is re-wrapped first.
      // Order: cached shell → network → plain offline page. Never rejects.
      const clean = async r => (r && r.redirected) ? new Response(await r.blob(), { status: 200, headers: r.headers }) : r;
      try {
        const c = await caches.open(CACHE);
        const hit = (await c.match('./')) || (await c.match('./index.html'));
        if (hit && hit.ok) return await clean(hit);
      } catch (err) { }
      try {
        const res = await fetch(new URL('./', self.registration.scope).href, { cache: 'no-cache' });
        if (res.ok) return await clean(res);
      } catch (err) { }
      try { return await clean(await fetch(req)); } catch (err) { }
      return new Response('<meta name=viewport content="width=device-width"><p style="font:18px sans-serif;padding:24px">My App can’t load right now. Check the connection, then reopen it.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
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
