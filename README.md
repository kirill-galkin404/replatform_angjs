# replatform_angjs

A small counter app: a React 18 + Vite single-page frontend (`frontend/`) talking to an Express backend (`backend/`) that listens on port 4000.

## Prerequisites

- Node.js 18 or newer
- npm (bundled with Node.js)

## Project layout

- `backend/` - Express API (`/count`, `/inc`, `/dec`, `/reset`, `/history`, `/healthz`). Not modified by the frontend rewrite.
- `frontend/` - React + Vite app, tests and `build.sh`.

## Running the backend (port 4000)

```sh
cd backend
npm install
npm start      # node server.js, listens on port 4000 (override with PORT)
```

Backend tests: `npm test` (runs `node --test`).

CORS is open (`*`), so the frontend can call the backend from any origin.

## Frontend

### Install

```sh
cd frontend
npm install
```

### Develop

```sh
npm run dev
```

Starts the Vite dev server, by default at http://localhost:5173. Start the backend first so the counter can load.

### Test

```sh
npm test       # vitest run (jsdom + Testing Library)
```

### Production build and preview

```sh
npm run build    # outputs static files to frontend/dist/
npm run preview  # serves frontend/dist/, by default at http://localhost:4173
```

### Build script

`frontend/build.sh` is a one-shot build for CI/deployment. It changes into its own directory, runs `npm ci`, then `npm run build`, producing `frontend/dist/`:

```sh
sh frontend/build.sh
API_BASE_URL=https://api.example.com sh frontend/build.sh
```

## Configuring the API URL

The backend URL defaults to `http://localhost:4000`.

- `VITE_API_BASE_URL` is read by Vite, so it applies to `npm run dev` and `npm run build`. Set it in the shell or in `frontend/.env.local`:

  ```sh
  VITE_API_BASE_URL=http://localhost:4000 npm run dev
  ```

  ```
  # frontend/.env.local
  VITE_API_BASE_URL=https://api.example.com
  ```

- `API_BASE_URL` is consumed only by `frontend/build.sh`, which maps it to `VITE_API_BASE_URL` before building. If `API_BASE_URL` is unset, an existing `VITE_API_BASE_URL` (shell or `frontend/.env.local`) is used, otherwise `http://localhost:4000`.

There is no runtime environment injection: the URL is baked into the bundle at build time, so changing it requires rebuilding.

## Behaviour notes

- `+` sends the value from the step input; `-` deliberately ignores the step input and decrements by the server's default amount.
- `reset` asks `window.confirm('sure?')` before posting to the backend.
- Request errors are logged to the browser console; there is no visible error UI.
