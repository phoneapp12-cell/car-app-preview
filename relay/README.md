# Due Dates calendar link service (relay)

A tiny, private relay so the Due Dates app (https://phoneapp12-cell.github.io/car-app-preview/)
can read an Outlook.com, Google or iCloud calendar link (.ics). Those services don't send CORS
headers, so a web app can't read the link directly.

- Only answers the Due Dates app (`Access-Control-Allow-Origin: https://phoneapp12-cell.github.io`).
- The app sends `POST /fetch` with JSON `{"url": "..."}`; the link is in the body, never in the address, so it can't end up in access logs.
- Only `https://` links on outlook.live.com, outlook.office365.com, outlook.office.com, calendar.google.com and *.icloud.com (checked again on every redirect). `webcal://` is converted to `https://`.
- GET only to the calendar service, 15 second timeout, 5 MB cap, the reply must be an iCalendar file.
- Keeps nothing: no logging, no storage, no cache (`Cache-Control: no-store`). Worker logs/observability are turned off in `wrangler.jsonc`.

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
- `test/relay.test.mjs` – `node test/relay.test.mjs`
