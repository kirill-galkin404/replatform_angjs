# replatform_angjs

A simple counter app: a React (Vite) frontend talking to an Express backend.

## Stack
- **frontend/** — React 18 + Vite. Tests use Vitest and Testing Library.
- **backend/** — Express 4, `var`, global state, synchronous file "DB" (`data.json`), manual CORS. It is unchanged by the frontend rewrite.

## Prerequisites
- Node.js 18 or newer (and npm).

## Running

### 1. Start the backend (port 4000)
```bash
cd backend
npm install
npm start
```
The backend listens on `http://localhost:4000` (override with the `PORT` environment variable).

### 2. Frontend in development
```bash
cd frontend
npm install        # or `npm ci` for a clean install from package-lock.json
npm run dev
```
Vite prints the local URL (by default `http://localhost:5173`). The app calls the backend at `http://localhost:4000`, which is the default in `frontend/public/env.js`. If your backend runs elsewhere, edit `window.API_BASE_URL` in that file.

### 3. Frontend production build
```bash
cd frontend
npm run build      # outputs to frontend/dist/
```
Or use the helper script, which runs `npm ci`, `npm run build`, and then writes `dist/env.js` using the `API_BASE_URL` environment variable (default `http://localhost:4000`):
```bash
cd frontend
API_BASE_URL=https://api.example.com ./build.sh
```
`dist/env.js` is loaded as a plain script before the bundle, so the API URL can be changed after the build by editing that one file.

### 4. Preview / serve the build
```bash
cd frontend
npm run preview    # serves dist/ locally
```
Any static file server pointed at `frontend/dist/` works as well, for example `npx http-server frontend/dist`.

## Tests
```bash
# frontend (Vitest)
cd frontend && npm test

# backend (node:test)
cd backend && npm test
```

## API
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | — | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
