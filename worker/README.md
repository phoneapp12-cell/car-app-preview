# shane-my-feed-data worker

Source of the live `shane-my-feed-data` Cloudflare Worker (family data service for Info Book + My Feed refresher).
It was recovered from the deployed script's source map (deployed 2026-11-06 11:47 UTC); `wrangler deploy --dry-run`
on the first commit of this folder builds a bundle byte-identical to the live one.

1.9.149 adds the family scoreboard (`src/scores.js`, wired into `src/family.js`): `GET/POST /api/scores`, stored in a new
`scores` table in the existing `FAMILY` SQLite Durable Object. No new bindings, secrets or migrations.

1.9.214 adds family Scrabble online challenges (`src/scrabble.js`, same Durable Object). A member challenges
another family member (or starts a 2–4 person game). Each person plays on their own phone, whenever it suits them.
`GET/POST /api/scrabble`, `GET /api/scrabble/:id`, `POST .../play`, `.../pass`, `.../swap`, `.../resign`,
and `DELETE /api/scrabble/:id`. Words are checked against the ENABLE list (`feed/scrabble-words.txt`, imported as text).
Racks and the bag order stay on the server. A finished game writes one scoreboard row per player (`opponent: family`).
A “Your turn in Scrabble vs <name>” notification uses the existing family push (on by default, respects quiet hours).
No new bindings or secrets.

Deploy (only when Shane says go live): `cd worker && npx wrangler deploy`
Tests: `node worker/test/scores.test.mjs` and `node worker/test/scrabble.test.mjs`
