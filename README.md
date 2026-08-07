# replatform_angjs

An intentionally "dirty" legacy counter — a test subject for a code rewriting/refactoring tool.

## Stack
- **frontend-react/** — Vite + React (package-managed), talking to the backend through the shared `src/api.js` module.
- **backend/** — Express 4, `var`, global state, synchronous file "DB" (`data.json`), manual CORS, zero validation/error handling. (Deliberately left as-is.)

## Running
```bash
# backend (port 4000)
cd backend && npm install && npm start

# frontend-react (dev server, proxies to http://localhost:4000 by default)
cd frontend-react && npm install && npm run dev

# frontend-react (production build)
cd frontend-react && npm install
VITE_API_BASE_URL=http://localhost:4000 npm run build
npm run preview   # or serve dist/ with any static server
```

The frontend reads its API base URL from `VITE_API_BASE_URL` at build time
(falling back to `http://localhost:4000`), so each environment gets its own
build the same way the old `build.sh`/`env.js` did for the legacy frontend.

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

## Changelog

### 2025 — Replace CDN AngularJS/jQuery frontend with Vite + React
- Removed the CDN-loaded AngularJS 1.2.28 and jQuery 1.11.3 frontend
  (`frontend/index.html`, `frontend/app.js`, `frontend/build.sh`).
- Replaced it with a package-managed Vite + React app in `frontend-react/`,
  talking to the unchanged REST API through one shared `src/api.js` module.
- New build/run commands: `cd frontend-react && npm install && npm run dev`
  for local development, and `npm run build` (reading `VITE_API_BASE_URL`)
  to produce a production bundle in `frontend-react/dist/`.
- The Express backend, its JSON persistence, `validateStep`, and the backend
  test suite (`backend/test/*.test.js`) are unchanged.
