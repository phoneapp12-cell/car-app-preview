# Car & Life Due Dates

A small installable web app (PWA) for keeping track of WOF, rego and servicing for the family's cars, plus bills, to-dos and appointments, with reminders.

- Open it: https://phoneapp12-cell.github.io/car-app-preview/
- Install it: in Chrome on Android tap ⋮ then **Add to Home screen** / **Install app**. On iPhone (Safari) tap **Share** then **Add to Home Screen**.
- Your data is saved on your phone only (IndexedDB). Nothing is sent anywhere. Use **Settings › Export backup** now and then.

## Files
- `index.html` – page and styles
- `app.js` – the app screens
- `core.js` – dates, reminder schedule and on-device storage (shared with the service worker)
- `sw.js` – service worker: offline cache, background reminder checks, notification taps
- `manifest.webmanifest`, `icons/` – install details and app icons

## Shipping an update
Change `VERSION` in `sw.js` (and `APP_VERSION` in `app.js`), commit and push. The app picks up the new version the next time it's opened.
