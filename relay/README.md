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

- `GET /roadworks` – council roading projects the [Roading improvements](https://www.wdc.govt.nz/Council/Projects/Roading-improvements) page marks “Construction underway”, as JSON
  (`{source, updated, count, projects:[{id,name,detail,full,start,status,url}]}`).
  The phone cannot read that page (no CORS header). robots.txt allows it. Re-read at most every 3 hours and saved in KV (`wdc-roadworks-v1`). A failed refresh keeps the saved copy. On failure with nothing saved: `502 {"error":"roadworks_unavailable"}`.

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

## Bridge closure alerts (push notifications)

`POST /push/subscribe`, `/push/unsubscribe`, `/push/status`, `/push/test` (app origin only, JSON body). The app sends its
browser push subscription (a push-service address plus two public keys; Chrome's is on fcm.googleapis.com). Only real
push-service hosts are accepted, at most 10 subscriptions are kept, and a small hourly limit stops misuse.
After each closures check the cron (`src/push.js`) sends an encrypted Web Push (RFC 8291) signed with the VAPID key
(RFC 8292) when a new notice about the bridge appears (held until 7 am if found overnight) and at 6 pm the evening
before each closure date. Expired subscriptions are removed. The VAPID private key is the Worker secret
`VAPID_PRIVATE_JWK` (`npx wrangler secret put VAPID_PRIVATE_JWK`); the public key is `VAPID_PUBLIC` in `wrangler.jsonc`
and in the app. KV keys: `push-subs-v1`, `push-alerts-v1`.

`POST /push/reminders` stores reminders for that phone (`{subscription, reminders:[{id,title,date,time}]}`) and replaces its pending list. `date` is `YYYY-MM-DD` and `time` is `HH:MM` in Pacific/Auckland. A separate cron (`* * * * *`) sends the push in that minute, including evenings and weekends. It does not use the bridge quiet hours (a new bridge notice found overnight still waits until 7 am). A phone that only turns on reminders is saved with `bridge: false`, so it does not start receiving bridge alerts. Turning bridge alerts off keeps the subscription while reminders are still pending. KV key: `push-reminders-v1` (title, date and time only, tied to the existing push subscription).

KV holds those public copies, the push subscriptions above, and (when you turn on Sync in the app) one encrypted blob per sync code.

## Sync between two devices

`POST /sync` with `{"op":"pull","code":"..."}` or `{"op":"push","code":"...","updatedAt":"...","iv":"...","ct":"..."}`.
App origin only. The code is a 16-character private code the person creates in Settings. The worker stores ciphertext only (AES-GCM, encrypted on the device) in the existing `EVENTS_KV` binding, under `sync-v1:` plus a SHA-256 of the code. It does not log the body. A newer `updatedAt` replaces an older copy. The first push fills an empty key. About 2 MB maximum. No per-record timestamps: the whole blob is last-write by `updatedAt`, except the app will not let a device that still has only the starter records replace a device that already has real records.

The public copies and push subscriptions are unchanged aside from that sync blob. If you deploy your own copy, create a KV namespace
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
- `src/roadworks.js` – council roading-improvements projects and `/roadworks`
- `test/roadworks.test.mjs` – `node test/roadworks.test.mjs`
- `test/relay.test.mjs` – `node test/relay.test.mjs`
- `test/events.test.mjs` – `node test/events.test.mjs` (synthetic pages, no network)
- `test/closures.test.mjs` – `node test/closures.test.mjs` (synthetic pages, no network)
