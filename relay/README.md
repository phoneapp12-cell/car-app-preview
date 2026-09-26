# Due Dates calendar link service (relay)

A tiny, private relay so the Due Dates app (https://phoneapp12-cell.github.io/car-app-preview/)
can read an Outlook.com, Google or iCloud calendar link (.ics). Those services don't send CORS
headers, so a web app can't read the link directly.

- Only answers the Due Dates app (`Access-Control-Allow-Origin: https://phoneapp12-cell.github.io`).
- The app sends `POST /fetch` with JSON `{"url": "..."}`; the link is in the body, never in the address, so it can't end up in access logs.
- Only `https://` links on outlook.live.com, outlook.office365.com, outlook.office.com, calendar.google.com and *.icloud.com (checked again on every redirect). `webcal://` is converted to `https://`.
- GET only to the calendar service, 15 second timeout, 5 MB cap, the reply must be an iCalendar file.
- `/fetch` keeps nothing: no logging, no storage, no cache (`Cache-Control: no-store`). Worker logs/observability are turned off in `wrangler.jsonc`.

## Local weather, events and bridge closures (read-only, public data)

Three narrow GET endpoints for the app's Home screen. Both only answer the app's origin, take no
parameters, and only ever contact the one fixed source below. Nothing about the person using the
app is stored.

- `GET /events` – upcoming Whangārei events for the next 60 days, as JSON
  (`{source, updated, windowDays, count, events:[{id,title,url,date,end,time,endTime,timeKnown,venue,desc,cats,cost}]}`).
  Source: Whangārei District Council "What's On" (https://www.wdc.govt.nz/Events/Whats-On).
  robots.txt allows these pages, and the council's copyright notice allows reproducing the content for
  personal, informational and non-commercial use. The relay identifies itself as
  `DueDatesApp/1.0 (+https://phoneapp12-cell.github.io/car-app-preview/)`.
  - The list (about 8 pages) is re-read at most every 3 hours; each event page (exact times, venue, cost)
    at most once a day. A cron trigger every 10 minutes does a small piece of that work, so a normal
    request is answered from the saved copy in Workers KV (`EVENTS_KV`, key `wdc-events-v1`; Cloudflare's
    edge key-value store, read with a 5-minute edge cache) plus a 5-minute in-memory copy. The Workers
    Cache API isn't available on `workers.dev` addresses, so KV is the edge cache here.
  - If nothing is saved yet, the first request builds the list directly (takes about 10 seconds).
  - On failure it returns `502 {"error":"events_unavailable"}`; the app then shows "Couldn't load events".
- `GET /weather` – a fallback copy of the Open-Meteo forecast for Whangārei (the app normally calls
  Open-Meteo directly). One fixed URL, kept for 20 minutes in memory/KV (`weather-v1`, expires after 1 hour).
  Weather data by Open-Meteo.com (CC BY 4.0).

- `GET /closures` – planned closures that mention the lifting bridge (Te Matau ā Pohe) or Dave Culham Drive, as JSON
  (`{source, updated, count, closures:[{id,title,where,desc,url,dates:[{start,end,time,endTime}]}]}`; finished dates are dropped).
  Source: Whangārei District Council "Roadworks and closures"
  (https://www.wdc.govt.nz/Services/Roads-and-Transportation/Roads/Roadworks-and-closures). Pages disallowed by robots.txt
  (re-read daily) are skipped. Same origin lock, no parameters, no logging.
  - The list (2 pages) is re-read every 3 hours and a few notice pages per run by a second cron trigger
    (`5-59/10 * * * *`, offset from the events cron); the result is saved in KV (`wdc-closures-v1`) with a
    5-minute in-memory copy. If nothing is saved (or it's more than 12 hours old) the request rebuilds it directly.
  - Multi-location notices are matched per location; single-location notices also count if the map pin is within 400 m of the bridge.
  - On failure it returns `502 {"error":"closures_unavailable"}`; the app then quietly shows the schedule only.

KV holds only those three public copies. If you deploy your own copy, create a KV namespace
(`npx wrangler kv namespace create due-dates-events-cache`) and put its id in `wrangler.jsonc`.

## Deploy (free Cloudflare Workers plan)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/phoneapp12-cell/car-app-preview/tree/main/relay)

Sign in with GitHub, keep the suggested names, tap **Create and deploy**. The service address
looks like `https://due-dates-calendar-relay.<your-name>.workers.dev`. Put that address in
`RELAY_DEFAULT` in the app's `app.js`.

Check it: open `https://…workers.dev/health` – it should say `{"ok":true,...}`.

## Files

- `src/relay.js` – all the logic (standard Request/Response, no dependencies)
- `src/worker.js` – Cloudflare Workers entry
- `deno-main.js` – alternative entry for Deno Deploy
- `local-server.mjs` – runs the same code under Node for local tests
- `src/events.js` – the council events reader and `/events` feed (list + detail parsing, KV state, cron step)
- `src/closures.js` – the council roadworks and closures reader and `/closures` feed
- `test/relay.test.mjs` – `node test/relay.test.mjs`
- `test/events.test.mjs` – `node test/events.test.mjs` (synthetic pages, no network)
- `test/closures.test.mjs` – `node test/closures.test.mjs` (synthetic pages, no network)
