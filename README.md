# Car & Life Due Dates

A small installable web app (PWA) for keeping track of WOF, rego and servicing for the family's cars, plus service history, drivers (AA membership and licence dates), bills, to-dos, appointments, birthdays and ideas, with reminders. It can also show events from an Outlook.com, Google or iCloud calendar link.

- Open it: https://phoneapp12-cell.github.io/car-app-preview/
- Install it: in Chrome on Android tap ⋮ then **Add to Home screen** / **Install app**. On iPhone (Safari) tap **Share** then **Add to Home Screen**.
- Your data is saved on your phone only (IndexedDB). The only thing that leaves the phone is a connected calendar link, which is passed to the calendar link service (`relay/`) to fetch the calendar. Use **Settings › Export backup** now and then.
- Home shows the Whangārei weather (from Open-Meteo, straight from the phone) and **More › Events** lists what's on in Whangārei over the next 60 days (from the council, through the relay). Neither sends anything about you.

- New Zealand public holidays are built in and on by default (Settings › Show public holidays). No setup and no internet needed.

## Public holidays
Built into `core.js` (`nzHolidays(year)`), using the Holidays Act rules and the official dates published on
[employment.govt.nz](https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates) and
[govt.nz](https://www.govt.nz/browse/work-and-tax/public-holidays-and-work/dates-for-public-holidays-and-anniversary-days/):
New Year's Day and 2 January, Waitangi Day, Good Friday, Easter Monday, ANZAC Day, King's Birthday, Matariki (dates from Schedule 1 of
Te Kāhui o Matariki Public Holiday Act 2022, to 2052), Labour Day, Christmas Day and Boxing Day, plus Auckland Anniversary Day
(Northland's regional holiday, the Monday nearest 29 January). When Waitangi, ANZAC, Christmas, Boxing Day, 1 or 2 January falls on a
weekend, the Monday (or Tuesday) day off is shown as "(observed)". If a connected calendar (e.g. Google's NZ holidays) has the same
holiday on the same day, it isn't shown twice. The 2026–2028 dates are checked by `pwtest/holidays.mjs`.

## Weather and events sources
- **Weather:** [Open-Meteo](https://open-meteo.com/) forecast API (no key, free for non-commercial use). Weather data by Open-Meteo.com, licensed CC BY 4.0; the credit is shown on the weather screen. Whangārei: lat -35.7251, lon 174.3237, Pacific/Auckland, °C, km/h. The last forecast is saved on the phone (`localStorage` key `wx`) and refreshed when the app opens if it's more than 30 minutes old. If Open-Meteo can't be reached, the app tries the relay's `/weather` copy. The full forecast screen links to [MetService Whangārei](https://www.metservice.com/towns-cities/regions/northland/locations/whangarei) for warnings.
- **Events:** [Whangārei District Council – What's On](https://www.wdc.govt.nz/Events/Whats-On), read by the relay's `GET /events` (the council site has no feed and doesn't allow browser access). The council's copyright notice allows reproducing its content for personal, informational and non-commercial use, and robots.txt allows these pages. Each event links back to its council page. Saved on the phone as `events` and refreshed every 3 hours. **Add to calendar** creates a normal appointment in the app's own Calendar (Undo in the message, or delete it like any appointment).

## Files
- `index.html` – page and styles
- `app.js` – the app screens (Home with weather, Cars, Calendar, To-do, More › Events, Bills, Birthdays, Ideas, Settings) and calendar sync
- `core.js` – dates, reminder schedule and on-device storage (shared with the service worker)
- `ical-import.js` – reads .ics calendars (time zones incl. Windows names, all-day, repeats, exceptions, cancellations)
- `vendor/ical.min.js` – ical.js 2.2.1 (Mozilla, MPL-2.0), unmodified
- `sw.js` – service worker: offline cache, background reminder checks, notification taps
- `relay/` – the tiny calendar link service (Cloudflare Worker), plus the read-only `/events` and `/weather` endpoints. See `relay/README.md`
- `manifest.webmanifest`, `icons/` – install details and app icons

## Calendar link service
`RELAY_DEFAULT` in `app.js` is the deployed address: `https://due-dates-calendar-relay.phoneapp12.workers.dev` (Cloudflare Workers, free plan; only accepts requests from `https://phoneapp12-cell.github.io`). If it's ever set back to empty, the app says the service is being set up and everything else works as normal.

## Shipping an update
Change `VERSION` in `sw.js` (and `APP_VERSION` in `app.js`), commit and push. The app picks up the new version the next time it's opened.
