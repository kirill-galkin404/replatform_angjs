# replatform_angjs

A small counter app: a React (Vite) frontend talking to an Express backend.

- **frontend/** — React 18 + Vite 5, tested with Vitest and Testing Library.
- **backend/** — Express 4 with a file-backed store (`data.json`).

## Prerequisites
- Node.js 18 or newer (required by Vite 5) and npm.

## Running the backend (port 4000)
```bash
cd backend && npm install && npm start
```

## Running the frontend
All commands are run from `frontend/`.
```bash
cd frontend
npm install
npm run dev       # dev server with hot reload
npm run build     # production build into dist/
npm run preview   # serve the built dist/ locally
npm test          # run the test suite (Vitest)
```

`npm test` includes an integration test (`src/api.integration.test.js`) that starts the real backend, so install the backend dependencies first: `npm --prefix backend ci` (or `npm install` inside `backend/`).

## Configuration: `VITE_API_BASE_URL`
The frontend reads the backend address from `VITE_API_BASE_URL`; when unset it defaults to `http://localhost:4000`.

This value is read at **build time** and embedded in the bundle. Set it before `npm run build`; changing it later requires a rebuild.
```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```
It also applies to `npm run dev` via the environment or a `.env` / `.env.local` file in `frontend/` (see `frontend/.env.example`).

The build output in `dist/` uses relative asset paths (`base: './'`), so it can be served from a sub-path.

### Migration note
The previous build script and its `API_BASE_URL` variable are gone. Any hosting or CI that set `API_BASE_URL` must now set `VITE_API_BASE_URL` instead, and build with `npm run build`; the value is baked in at build time.

## Project structure
```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── .env.example
└── src/
    ├── main.jsx            # entry point
    ├── App.jsx             # top-level component
    ├── api.js              # backend client (uses VITE_API_BASE_URL)
    ├── styles.css
    ├── setupTests.js
    └── components/         # src/components
        ├── Counter.jsx
        └── History.jsx
```
Tests sit next to the code as `*.test.js(x)`.

## API
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | — | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |

## Known behaviour / open question
The minus button posts an empty body to `/dec`, so the step input does not affect decrement. This is preserved as-is from before the rewrite. Open question for the operator: should decrement also send the step?
