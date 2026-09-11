# replatform_angjs

A small counter app used as a test subject for a code rewriting/refactoring
tool. This repo contains a React + Python rewrite of an earlier
AngularJS/Express version of the same app.

## Stack
- **frontend/** — React 18, built with Vite. `src/App.jsx` composes
  `Counter.jsx` (inc/dec/reset controls) and `History.jsx` (the history log),
  talking to the backend via `src/api.js`.
- **backend/** — Python (FastAPI), under `app/`. State (`count`/`history`) is
  held in memory and persisted to a `data.json` file on disk (same on-disk
  JSON format as before), with atomic temp-file-then-rename writes on every
  mutating request. CORS is wide open (`CORSMiddleware` with `allow_origins=["*"]`)
  and there is no authentication — this is a deliberate scope decision for
  this app, not an oversight; see `RULES.md` for the full rationale. Request
  bodies are validated (see `app/validators.py`) and errors are returned as a
  structured JSON envelope rather than a raw stack trace.

## Running

Backend (port 4000):

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 4000
```

Frontend, for local development (dev server with hot reload):

```bash
cd frontend
npm install
npm run dev
```

Frontend, for a production build:

```bash
cd frontend
npm install
npm run build
npm run preview   # serves dist/, or use any static file server
```

By default the frontend talks to `http://localhost:4000`. To point it at a
different backend URL, set `VITE_API_BASE_URL` (see `frontend/.env.example`)
before building/running, e.g. `VITE_API_BASE_URL=https://example.com npm run build`.

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | `{by?}` | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
| GET | `/healthz` | — | `{status:'ok'}` |

`/inc` and `/dec` both accept an optional `by` field (defaulting to `1` if
omitted) with identical validation rules. The current frontend's decrement
button always sends an empty body (never a custom `by`) as a UX choice, not
a backend limitation — the `/dec` endpoint itself accepts `by` just like
`/inc` does.

## Notes

Some behaviors inherited from the original app (e.g. no rollback if a disk
write fails mid-request, unbounded history growth) are intentionally
preserved rather than fixed as part of this rewrite. See `RULES.md`'s
"Unpinned / unverified behaviour" section for the full list, and
`IMPROVEMENTS.md` (if present) for suggested future improvements.
