#!/usr/bin/env bash
# 2.27.46: publish My App to its own address (Cloudflare Pages project shane-my-app -> https://shane-my-app.pages.dev).
# Part of the ship rule: run after pushing to main, then poll https://shane-my-app.pages.dev/sw.js for the new VERSION.
set -euo pipefail
cd "$(dirname "$0")/.."
out=$(mktemp -d)
git ls-files -z | grep -zv -E '^(relay/|tests/|tools/|\.github/|README\.md$|\.gitignore$)' | xargs -0 -I{} cp --parents {} "$out"/
cat > "$out/_headers" <<'H'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
# Tetris is our own page, opened in the feed window. DENY on /* made Chrome
# show its error page in that frame (live check 7 Nov 2026: tetris.html 308
# to /feed/tetris, both responses X-Frame-Options DENY). SAMEORIGIN lets the
# feed frame it and still blocks other sites.
/feed/tetris
  ! X-Frame-Options
  X-Frame-Options: SAMEORIGIN
/feed/tetris.html
  ! X-Frame-Options
  X-Frame-Options: SAMEORIGIN
# 1.9.147 Scrabble opens in the same feed window, so it needs the same rule.
/feed/scrabble
  ! X-Frame-Options
  X-Frame-Options: SAMEORIGIN
/feed/scrabble.html
  ! X-Frame-Options
  X-Frame-Options: SAMEORIGIN
# 1.9.156 Sugar Rush opens in the same feed window too.
/feed/sugar-rush
  ! X-Frame-Options
  X-Frame-Options: SAMEORIGIN
/feed/sugar-rush.html
  ! X-Frame-Options
  X-Frame-Options: SAMEORIGIN
/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/
  Cache-Control: no-cache
/feed/sw.js
  Cache-Control: no-cache
/feed/index.html
  Cache-Control: no-cache
/feed/*.js
  Cache-Control: no-cache
H
(cd relay && npx wrangler pages deploy "$out" --project-name shane-my-app --branch main --commit-dirty=true --commit-message "$(git log -1 --format=%h)") 2>&1 | grep -E "Success|Deployment complete|https://|rror" || true
rm -rf "$out"
v=$(sed -n 3p sw.js | grep -o "'[0-9.]*'" | tr -d "'")
for i in $(seq 1 30); do
  live=$(curl -s "https://shane-my-app.pages.dev/sw.js?x=$RANDOM" | sed -n 3p | grep -o "'[0-9.]*'" | tr -d "'" || true)
  [ "$live" = "$v" ] && { echo "pages live: $live"; exit 0; }; sleep 5
done
echo "pages NOT live yet (want $v, got ${live:-none})"; exit 1
