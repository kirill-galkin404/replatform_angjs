#!/bin/sh
# Builds the React (Vite) app into dist/ and writes dist/env.js so the API base
# URL can be configured per-environment via the API_BASE_URL env var at build
# time. env.js is written after the build so it overrides public/env.js.
set -e
cd "$(dirname "$0")"
npm ci
npm run build
mkdir -p dist
printf 'window.API_BASE_URL = "%s";\n' "${API_BASE_URL:-http://localhost:4000}" > dist/env.js
