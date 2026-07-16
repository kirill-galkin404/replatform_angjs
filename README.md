# replatform_angjs

An intentionally "dirty" legacy counter — a test subject for a code rewriting/refactoring tool.

## Stack (deliberately outdated)
- **frontend/** — AngularJS 1.2 (CDN) + jQuery, logic in the controller, `.success()`, jQuery DOM manipulation mixed with Angular.
- **backend/** — Express 4, `var`, global state, synchronous file "DB" (`data.json`), manual CORS, zero validation/error handling.

## Running
```bash
# backend (port 4000)
cd backend && npm install && npm start

# frontend — open frontend/index.html in a browser
# (or any static server, e.g. `npx http-server frontend`)
```

### Environment variables

| Var | Purpose | Default |
|-----|---------|---------|
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of origins allowed to call the API (replaces the old wildcard CORS). | unset — no origins allowed |
| `API_KEY` | Shared secret required in the `X-API-Key` header on mutation routes when `REQUIRE_API_KEY=true`. | unset |
| `REQUIRE_API_KEY` | Set to `true` to require a valid `X-API-Key` header on `POST /inc`, `/dec`, `/reset`. `GET /count` and `GET /history` are never gated. | unset (disabled) |

**Rollout note:** do **not** set `REQUIRE_API_KEY=true` in any environment that still serves the current AngularJS frontend (`frontend/app.js`) — it sends no custom headers today and its mutation calls would start failing with `401`. Only enable enforcement once the in-flight React/Vite re-platform of the frontend adds the `X-API-Key` header to its outgoing `POST` calls.

**Note:** `POST /inc`, `/dec`, `/reset` only accept `Content-Type: application/json` (as the AngularJS frontend already sends). This forces cross-origin requests through a CORS preflight — governed by `CORS_ALLOWED_ORIGINS` — instead of allowing a non-preflighted "simple" request (e.g. a cross-site HTML form post) to reach these routes.

## What's "dirty" here (room for improvement)
- Backend: global `count`/`history`, `readFileSync`/`writeFileSync` on every request, `parseInt` without validation, magic strings, no routers/layers, `res.send(200)`.
- Frontend: business logic in `$scope`, deprecated `$http().success()`, hardcoded `API`, `loadHistory()` via jQuery bypassing Angular, inline styles, `confirm()`.

## API
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | — | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
