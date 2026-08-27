# replatform_angjs

An intentionally "dirty" legacy counter — a test subject for a code rewriting/refactoring tool.

## Stack (deliberately outdated)
- **frontend/** — AngularJS 1.2 (CDN) + jQuery, logic in the controller, `.success()`, jQuery DOM manipulation mixed with Angular.
- **backend/** — Express 4, `var`, global state, synchronous file "DB" (`data.json`), manual CORS, zero validation/error handling.

## Running
```bash
# backend (port 4000)
cd backend && npm install && npm start

# frontend (dev server with hot reload)
cd frontend && npm install && npm run dev

# frontend (production build, output in frontend/dist)
cd frontend && npm install && npm run build
```

## What's "dirty" here (room for improvement)
- Backend: global `count`/`history`, `readFileSync`/`writeFileSync` on every request, `parseInt` without validation, magic strings, no routers/layers, `res.send(200)`.
- Frontend: business logic in `$scope`, deprecated `$http().success()`, hardcoded `API`, `loadHistory()` via jQuery bypassing Angular, inline styles, `confirm()`.

## API
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | `{by?}` | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
