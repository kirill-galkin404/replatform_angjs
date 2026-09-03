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

## What's "dirty" here (room for improvement)
- Backend: global `count`/`history`, `readFileSync`/`writeFileSync` on every request, `parseInt` without validation, magic strings, no routers/layers, `res.send(200)`.
- Frontend: business logic in `$scope`, deprecated `$http().success()`, hardcoded `API`, `loadHistory()` via jQuery bypassing Angular, inline styles, `confirm()`.

## Documentation
See [RULES.md](RULES.md) for the authoritative statement of this app's
business rules (step validation, mutation-operation semantics, counter-state
invariants, and the error-response contract).

## API
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | — | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
