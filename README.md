# replatform_angjs

An intentionally "dirty" legacy counter — a test subject for a code rewriting/refactoring tool.

## Stack
- **frontend/** — Vite + React SPA, consuming the backend's REST contract.
- **backend/** — Express 4, `var`, global state, synchronous file "DB" (`data.json`), manual CORS, zero validation/error handling.

## Running
```bash
# backend (port 4000)
cd backend && npm install && npm start

# frontend (dev server)
cd frontend && npm install && npm run dev

# frontend (production build)
cd frontend && npm install && npm run build
# writes dist/; runtime API base URL comes from dist/env.js (see below)
```

The frontend reads its API base URL at runtime from `window.API_BASE_URL`,
set by a plain `<script src="env.js">` loaded before the bundle. `npm run
build` copies `frontend/public/env.js`'s dev-time default into `dist/env.js`;
to point a build at a different backend without rebuilding, overwrite it:
```bash
cd frontend && API_BASE_URL=https://api.example.com npm run write-env
```

## What's "dirty" here (room for improvement)
- Backend: global `count`/`history`, `readFileSync`/`writeFileSync` on every request, `parseInt` without validation, magic strings, no routers/layers, `res.send(200)`.

## API
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | — | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
