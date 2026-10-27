# replatform_angjs

A small counter app: a React frontend talking to an Express backend. It is a test subject for a code rewriting/refactoring tool.

## Stack
- **frontend/**: React 18 built with Vite, tested with Vitest + Testing Library (jsdom).
- **backend/**: Express 4, `var`, global state, synchronous file "DB" (`data.json`, path overridable with `DB_FILE`), manual CORS (`Access-Control-Allow-Origin: *`).

## Prerequisites
- Node.js and npm.

## Running
The backend listens on `PORT` (default `4000`) and keeps its state in `data.json`.

```bash
# backend (port 4000; override with PORT=5000 npm start)
cd backend && npm install && npm start

# frontend (in a second terminal)
cd frontend
npm install
npm run dev       # Vite dev server with hot reload
npm run build     # production build, output in frontend/dist/
npm run preview   # serve the production build locally
npm test          # Vitest, runs once
```

The frontend calls the backend at `http://localhost:4000` by default, so start the backend first.

## Configuration
`VITE_API_BASE_URL` sets the backend URL the frontend calls. It defaults to `http://localhost:4000`.

It is read at **build time** (when the dev server starts or when `npm run build` runs) and baked into the bundle:

```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

The old `API_BASE_URL` variable and the post-build `dist/env.js` override are no longer used. To change the URL, rebuild; do not edit `dist/`.

## Frontend notes
- The step input value is sent as-is to `POST /inc`; `POST /dec` and `POST /reset` send `{}`. The client does no validation; the backend validates the step and returns structured errors.
- History entries are rendered as React text nodes, so values are escaped.

## What's "dirty" here (room for improvement)
- Backend: global `count`/`history`, `readFileSync`/`writeFileSync` on every request, no routers/layers, `res.send(200)`.

## API
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | — | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
