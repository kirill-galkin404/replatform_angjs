#!/bin/sh
# Builds the React app with Vite into dist/. The API base URL is configured
# per-environment via the API_BASE_URL env var (default http://localhost:4000);
# it is mapped to VITE_API_BASE_URL and baked into the bundle at build time.
set -e
cd "$(dirname "$0")"
export VITE_API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
npm ci --no-audit --no-fund
npm run build
