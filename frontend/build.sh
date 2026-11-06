#!/bin/sh
# Builds the React app with Vite into dist/. The API base URL is configured
# per-environment via the API_BASE_URL env var, which is mapped to
# VITE_API_BASE_URL and baked into the bundle at build time. If API_BASE_URL is
# unset, an existing VITE_API_BASE_URL / frontend/.env.local is honoured, else
# the app default http://localhost:4000 applies.
set -e
cd "$(dirname "$0")"
if [ -n "${API_BASE_URL:-}" ]; then
  export VITE_API_BASE_URL="$API_BASE_URL"
fi
npm ci --no-audit --no-fund
npm run build
