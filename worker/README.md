# shane-my-feed-data worker

Source of the live `shane-my-feed-data` Cloudflare Worker (family data service for Info Book + My Feed refresher).
It was recovered from the deployed script's source map (deployed 2026-11-06 11:47 UTC); `wrangler deploy --dry-run`
on the first commit of this folder builds a bundle byte-identical to the live one.

1.9.149 adds the family scoreboard (`src/scores.js`, wired into `src/family.js`): `GET/POST /api/scores`, stored in a new
`scores` table in the existing `FAMILY` SQLite Durable Object. No new bindings, secrets or migrations.

Deploy (only when Shane says go live): `cd worker && npx wrangler deploy`
Tests: `node worker/test/scores.test.mjs`
