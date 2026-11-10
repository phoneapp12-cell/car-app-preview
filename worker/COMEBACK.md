# Come-back push for the existing feed worker

This folder is not a worker you can deploy on its own. `shane-my-feed-data` already serves the feed. Deploying a new worker from this branch would replace that service. Do not run `wrangler deploy` here.

Add these pieces to the worker source that already has the `*/10` cron, the `FEED_KV` binding, and `src/worker.js`.

## One-time secrets

Run this on your own machine. It prints a public key and a private JWK. Paste them into Wrangler secrets. Do not commit either value, and do not put them in a file in this repo.

```bash
node --input-type=module -e '
const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
const jwk = await crypto.subtle.exportKey("jwk", k.privateKey);
const pub = new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey));
let s = ""; for (const b of pub) s += String.fromCharCode(b);
const publicKey = btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
console.log("VAPID_PUBLIC_KEY");
console.log(publicKey);
console.log("VAPID_PRIVATE_KEY");
console.log(JSON.stringify(jwk));
'
```

From the real worker directory (the one with the existing `wrangler.jsonc`):

```bash
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

No new KV namespace. Subscriptions use the existing `FEED_KV` binding, keys `push:<hash>`.

## Call sites

In `src/worker.js`:

```javascript
import { runComeback, handlePush } from './comeback.js';
```

Inside `scheduled`, after the existing refresh:

```javascript
ctx.waitUntil(runComeback(env));
```

Inside `fetch`, before the other routes:

```javascript
const push = await handlePush(req, env);
if (push) return push;
```

The cron stays `*/10`. A run does nothing during 9pm–8am New Zealand time, skips phones opened in the last two days, and sends at most 20 notes per run. Each phone is stored with `lastSent`, so it still gets at most one note every two days.

## Always on

Info Book does not have an off switch for these notes. When someone opens the app, it asks for notification permission. The browser requires that prompt, so it cannot be skipped. If they allow it, the phone subscribes to `POST /push/subscribe` on its own. This module then sends to every stored subscription. A stored `on: false` value does not stop a note. It still needs `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` before any send. Do not deploy this folder by itself.

## Rollback

Remove the `runComeback` call and the two secrets, or redeploy the previous worker script from the Cloudflare dashboard. Subscriptions left in KV are unused until the call is restored.
