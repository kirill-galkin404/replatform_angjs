# replatform_angjs

A small counter app: a Vite + React frontend (`frontend/`) talking to an Express backend (`backend/`). The backend is intentionally left in a legacy style and is still a target for refactoring.

## Stack
- **frontend/** — React 18, built and served by Vite 5, tested with Vitest + Testing Library (jsdom).
- **backend/** — Express 4, `var`, global state, synchronous file "DB" (`data.json`, override with `DB_FILE`), manual CORS (any origin allowed), listens on port 4000 (override with `PORT`).

## Prerequisites
- Node.js 18 or newer (required by Vite 5 and Vitest 2) and the npm that ships with it.
- A running backend for the app itself, and `npm install` in `backend/` for `npm run parity`.

## Running

### Backend (port 4000)
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production bundle in frontend/dist
npm run preview    # serve frontend/dist locally
npm test           # unit/component tests (vitest run)
npm run parity     # live parity check against the real backend
```

Always use the dev or preview server; the app is an ES-module bundle and is not meant to be opened as a plain file.

`npm run parity` starts the real backend from `backend/` on a free port with a temporary database file and drives `frontend/src/api.js` against it. Run `npm install` in `backend/` first, as well as in `frontend/`.

## Configuration: API base URL
The frontend resolves the backend URL in this order (first match wins):

1. `window.API_BASE_URL`, set at runtime by `env.js`
2. `VITE_API_BASE_URL`, read by Vite at dev/build time
3. `http://localhost:4000`

- **Dev/build time:** `VITE_API_BASE_URL=http://host:4000 npm run dev` (or put it in a Vite env file).
- **Runtime override:** `frontend/public/env.js` is loaded by `index.html` before the app. Uncomment/set `window.API_BASE_URL = "http://host:4000";` there. Vite copies it to `dist/env.js`, so a deployed build can be repointed by editing `dist/env.js` without rebuilding.
- **`build.sh`:** `frontend/build.sh` runs `npm run build` and then writes `dist/env.js` from the `API_BASE_URL` environment variable, falling back to `VITE_API_BASE_URL`, then `http://localhost:4000`:
  ```bash
  cd frontend
  API_BASE_URL=https://api.example.com ./build.sh
  ```
  `build.sh` does not run `npm install` (do that first). It refuses values containing double quotes, backslashes or line breaks.

## Project structure
```
backend/                    Express API (server.js, validators.js, test/)
frontend/
  package.json              scripts and dependencies
  vite.config.js            Vite + React plugin, Vitest (jsdom) config
  index.html                HTML entry; loads env.js, then src/main.jsx
  public/env.js             optional runtime API_BASE_URL override
  build.sh                  build wrapper that writes dist/env.js
  scripts/parity-check.mjs  live parity check against the real backend
  src/                      (frontend/src)
    main.jsx                React entry point
    App.jsx                 top-level component
    Counter.jsx             counter display and controls
    History.jsx             operation history list
    api.js                  backend client and base-URL resolution
    styles.css              styles
    api.test.js, Counter.test.jsx, History.test.jsx   Vitest tests
```

## What's "dirty" in the backend (room for improvement)
Global `count`/`history`, `readFileSync`/`writeFileSync` on every request, `var` and callbacks, magic strings, a single `server.js` with no routers/layers, `res.send(200)` in the CORS preflight, wide-open CORS.

## API
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | `{by?}` | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
