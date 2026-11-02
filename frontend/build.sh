#!/bin/sh
# Wrapper around the Vite build. Dependencies must already be installed
# (npm install). After vite copies public/ into dist/, this writes dist/env.js
# so the API base URL can be configured per-environment via API_BASE_URL
# (or VITE_API_BASE_URL) instead of being baked into the bundle.
set -e
cd "$(dirname "$0")"

API_BASE="${API_BASE_URL:-${VITE_API_BASE_URL:-http://localhost:4000}}"

# Refuse values that would produce a broken or injectable JS string literal.
case "$API_BASE" in
  *'"'* | *'\'* | *'
'* | *"$(printf '\r')"*)
    echo "build.sh: API_BASE_URL must not contain double quotes, backslashes or line breaks" >&2
    exit 1
    ;;
esac

npm run build
mkdir -p dist
printf 'window.API_BASE_URL = "%s";\n' "$API_BASE" > dist/env.js
