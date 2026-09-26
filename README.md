# Car & Life Due Dates

A small installable web app (PWA) for keeping track of WOF, rego and servicing for the family's cars, plus service history, drivers (AA membership and licence dates), bills, to-dos, appointments, birthdays and ideas, with reminders. It can also show events from an Outlook.com, Google or iCloud calendar link.

- Open it: https://phoneapp12-cell.github.io/car-app-preview/
- Install it: in Chrome on Android tap ⋮ then **Add to Home screen** / **Install app**. On iPhone (Safari) tap **Share** then **Add to Home Screen**.
- Your data is saved on your phone only (IndexedDB). The only thing that leaves the phone is a connected calendar link, which is passed to the calendar link service (`relay/`) to fetch the calendar. Use **Settings › Export backup** now and then.
- Home shows the Whangārei weather (from Open-Meteo, straight from the phone) and **More › Events** lists what's on in Whangārei over the next 60 days (from the council, through the relay). Neither sends anything about you.

- New Zealand public holidays are built in and on by default (Settings › Show public holidays). No setup and no internet needed.
- **Lifting bridge – Dave Culham Drive** (Te Matau ā Pohe): the likely state of the bridge and the next change, worked out from the council's lift times. It's **not live**. Open it from Home, **More › Lifting bridge**, or the **Bridge** app shortcut (long-press the app icon on Android).

## Public holidays
Built into `core.js` (`nzHolidays(year)`), using the Holidays Act rules and the official dates published on
[employment.govt.nz](https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates) and
[govt.nz](https://www.govt.nz/browse/work-and-tax/public-holidays-and-work/dates-for-public-holidays-and-anniversary-days/):
New Year's Day and 2 January, Waitangi Day, Good Friday, Easter Monday, ANZAC Day, King's Birthday, Matariki (dates from Schedule 1 of
Te Kāhui o Matariki Public Holiday Act 2022, to 2052), Labour Day, Christmas Day and Boxing Day, plus Auckland Anniversary Day
(Northland's regional holiday, the Monday nearest 29 January). When Waitangi, ANZAC, Christmas, Boxing Day, 1 or 2 January falls on a
weekend, the Monday (or Tuesday) day off is shown as "(observed)". If a connected calendar (e.g. Google's NZ holidays) has the same
holiday on the same day, it isn't shown twice. The 2026–2028 dates are checked by `pwtest/holidays.mjs`.

## Lifting bridge card
The council doesn't publish live lift status, so the card says "Not live – based on the council's lift times". The rules (`bridgeStatus` in `core.js`) come from the
[council's bridge page](https://www.wdc.govt.nz/Services/Roads-and-Transportation/Transportation/Te-Matau-a-Pohe-bridge):
- Summer hours from the last Sunday in September to the day before the first Sunday in April: weekdays 9 am – 4 pm and 6 – 7 pm, weekends 7 am – 7 pm. Winter: weekdays 9 am – 4 pm, weekends 8 am – 5 pm. In those hours lifts are on request (about 5 a day, each stopping traffic for about 5–7 minutes).
- No lifts on weekdays 7 – 9 am and 4 – 6 pm (peak traffic). A scheduled lift at 12:00 noon. Outside staffed hours lifts are on call only.
- "Too windy for lifts (forecast)" when the Open-Meteo wind forecast is over gale force (34 knots, about 63 km/h).
- "Closed" during a planned closure that mentions the bridge or Dave Culham Drive on the council's [Roadworks and closures](https://www.wdc.govt.nz/Services/Roads-and-Transportation/Roads/Roadworks-and-closures) page (read by the relay's `GET /closures`, saved on the phone as `closures`, refreshed every 3 hours; if it can't be read the card just shows the schedule).
- **Live traffic** opens Google Maps at the bridge with the traffic layer.

Where it shows (Settings › Lifting bridge): **Near only** (default), **Always on Home** or **Off**. With Near only, Home shows a short line under the weather until you tap **Show when I'm near**; after that the card appears at the top of Home only when the app is opened within about 2 km of the bridge. Location is used only while the app is open and never saved; only the yes/no choice is stored. Tested by `pwtest/bridge.mjs`.

## Weather and events sources
- **Weather:** [Open-Meteo](https://open-meteo.com/) forecast API (no key, free for non-commercial use). Weather data by Open-Meteo.com, licensed CC BY 4.0; the credit is shown on the weather screen. Whangārei: lat -35.7251, lon 174.3237, Pacific/Auckland, °C, km/h. The last forecast is saved on the phone (`localStorage` key `wx`) and refreshed when the app opens if it's more than 30 minutes old. If Open-Meteo can't be reached, the app tries the relay's `/weather` copy. The full forecast screen links to [MetService Whangārei](https://www.metservice.com/towns-cities/regions/northland/locations/whangarei) for warnings.
- **Events:** [Whangārei District Council – What's On](https://www.wdc.govt.nz/Events/Whats-On), read by the relay's `GET /events` (the council site has no feed and doesn't allow browser access). The council's copyright notice allows reproducing its content for personal, informational and non-commercial use, and robots.txt allows these pages. Each event links back to its council page. Saved on the phone as `events` and refreshed every 3 hours. **Add to calendar** creates a normal appointment in the app's own Calendar (Undo in the message, or delete it like any appointment).

## Files
- `index.html` – page and styles
- `app.js` – the app screens (Home with weather and the lifting bridge, Cars, Calendar, To-do, More › Events, Bills, Birthdays, Ideas, Settings) and calendar sync
- `core.js` – dates, reminder schedule and on-device storage (shared with the service worker)
- `ical-import.js` – reads .ics calendars (time zones incl. Windows names, all-day, repeats, exceptions, cancellations)
- `vendor/ical.min.js` – ical.js 2.2.1 (Mozilla, MPL-2.0), unmodified
- `sw.js` – service worker: offline cache, background reminder checks, notification taps
- `relay/` – the tiny calendar link service (Cloudflare Worker), plus the read-only `/events`, `/weather` and `/closures` endpoints. See `relay/README.md`
- `manifest.webmanifest`, `icons/` – install details and app icons

## Calendar link service
`RELAY_DEFAULT` in `app.js` is the deployed address: `https://due-dates-calendar-relay.phoneapp12.workers.dev` (Cloudflare Workers, free plan; only accepts requests from `https://phoneapp12-cell.github.io`). If it's ever set back to empty, the app says the service is being set up and everything else works as normal.

## Shipping an update
Change `VERSION` in `sw.js` (and `APP_VERSION` in `app.js`), commit and push. The app picks up the new version the next time it's opened.
