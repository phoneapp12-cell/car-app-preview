# Car & Life Due Dates

A small installable web app (PWA) for keeping track of WOF, rego and servicing for the family's cars, plus service history, drivers (AA membership and licence dates), bills, to-dos, appointments, birthdays and ideas, with reminders. It can also show events from an Outlook.com, Google or iCloud calendar link.

- Open it: https://phoneapp12-cell.github.io/car-app-preview/
- Install it: in Chrome on Android tap ⋮ then **Add to Home screen** / **Install app**. On iPhone (Safari) tap **Share** then **Add to Home Screen**.
- Your data is saved on your phone only (IndexedDB). The only thing that leaves the phone is a connected calendar link, which is passed to the calendar link service (`relay/`) to fetch the calendar. Use **Settings › Export backup** now and then.

## Files
- `index.html` – page and styles
- `app.js` – the app screens (Home, Cars, Calendar, To-do, More › Bills, Birthdays, Ideas, Settings) and calendar sync
- `core.js` – dates, reminder schedule and on-device storage (shared with the service worker)
- `ical-import.js` – reads .ics calendars (time zones incl. Windows names, all-day, repeats, exceptions, cancellations)
- `vendor/ical.min.js` – ical.js 2.2.1 (Mozilla, MPL-2.0), unmodified
- `sw.js` – service worker: offline cache, background reminder checks, notification taps
- `relay/` – the tiny calendar link service (Cloudflare Worker). See `relay/README.md`
- `manifest.webmanifest`, `icons/` – install details and app icons

## Calendar link service
Set `RELAY_DEFAULT` in `app.js` to the deployed address (e.g. `https://due-dates-calendar-relay.<name>.workers.dev`). Until then the app says the service is being set up and everything else works as normal.

## Shipping an update
Change `VERSION` in `sw.js` (and `APP_VERSION` in `app.js`), commit and push. The app picks up the new version the next time it's opened.
