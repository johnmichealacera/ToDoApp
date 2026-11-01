#!/usr/bin/env bash
# Serve the app on http://localhost:8080 in cloud mode, using the deployed taskify-api stack.
# The filled config.js goes to a temporary copy, so the real API URL never lands in git.
set -euo pipefail
cd "$(dirname "$0")/.."

out() {
  aws cloudformation describe-stacks --region ap-southeast-1 --stack-name taskify-api \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

API_URL=$(out ApiUrl)
DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT
cp -r src/. "$DIR"/
printf 'window.TASKIFY_CONFIG = { apiUrl: "%s" };\n' "$API_URL" > "$DIR/config.js"

echo "Cloud mode → $API_URL"
echo "Open http://localhost:8080 (Ctrl+C to stop)"
python3 -m http.server 8080 --bind 127.0.0.1 -d "$DIR"
