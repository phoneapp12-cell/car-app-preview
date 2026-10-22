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
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/
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
