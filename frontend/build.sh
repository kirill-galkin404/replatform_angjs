#!/bin/sh
# Minimal "build": copies static assets into dist/ and writes env.js so the
# API base URL can be configured per-environment via the API_BASE_URL env var
# instead of being hardcoded in app.js.
set -e
mkdir -p dist
cp index.html app.js dist/
printf 'window.API_BASE_URL = "%s";\n' "${API_BASE_URL:-http://localhost:4000}" > dist/env.js
