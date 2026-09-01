# RULES.md — Counter Backend Business Rules

This document is the authoritative reference for every business rule the counter
backend (`backend/server.js`, `backend/validators.js`) enforces. Every statement
below is sourced exclusively from those two files and the seven test files under
`backend/test/` (`inc.test.js`, `dec.test.js`, `reset.test.js`,
`error-handling.test.js`, `malformed-json.test.js`, `not-found.test.js`,
`validators.test.js`). No other document is used as a source of rules; Section 6
separately discusses a piece of existing project documentation whose contents
are shown to be incorrect against this same source code.

Each rule cites the exact file and line range it was read from, and — where the
rule is behavioral — the test that exercises it.

---

## 1. Step Validation (`validateStep(value, options)`)

Source: `backend/validators.js:17-58` (constants at lines 17-19; function body at
lines 24-58). `validateStep` is the single shared gate used identically by both
`POST /inc` and `POST /dec` to turn the request body's `by` field into the
integer amount to apply (see Section 2).

Constants (`backend/validators.js:17-19`):
- `DEFAULT_STEP = 1`
- `MIN_STEP = -1000000`
- `MAX_STEP = 1000000`

The function evaluates branches in this order; the first branch whose condition
matches determines the outcome:

| # | Condition | Outcome | Source | Test |
|---|-----------|---------|--------|------|
| 1 | `value` is `undefined` or `null`, and `options.required !== true` | Returns `DEFAULT_STEP` (`1`) — the "no `by` supplied" default | `backend/validators.js:28-32` | `validators.test.js:35-38` ("`validateStep(undefined, {required:false})` returns the documented default (1)") |
| 2 | `value` is `undefined` or `null`, and `options.required === true` | Throws `ValidationError('FIELD_REQUIRED', 'by', '"by" is required', 400)` | `backend/validators.js:29-31` | `validators.test.js:40-44` ("`validateStep(undefined, {required:true})` throws ValidationError") |
| 3 | `typeof value` is neither `'number'` nor `'string'` (e.g. array, boolean, object) | Throws `ValidationError('INVALID_STEP', 'by', '"by" must be a finite integer', 400)` | `backend/validators.js:35-37` | `validators.test.js:46-51` ("validateStep rejects non-number/non-string types instead of loosely coercing them" — covers `[5]`, `[]`, `true`, `false`, `{}`) |
| 4 | `value` is a string and `value.trim() === ''` (blank/whitespace-only string) | Throws `ValidationError('INVALID_STEP', 'by', '"by" must be a finite integer', 400)` | `backend/validators.js:39-41` | **Not exercised by any test in the current suite** — no test in `backend/test/` sends a blank/whitespace-only `by` string. Documented here from source only, per instruction I-0001. |
| 5 | The coerced number (`Number(value)` for strings, the value itself for numbers) is `NaN` or not finite (`Infinity`/`-Infinity`) | Throws `ValidationError('INVALID_STEP', 'by', '"by" must be a finite integer', 400)` | `backend/validators.js:43-47` | `validators.test.js:7-11` ("`validateStep(\"abc\")` throws ValidationError" — `Number('abc')` is `NaN`), `validators.test.js:13-17` ("`validateStep(NaN)` throws ValidationError"), `validators.test.js:19-23` ("`validateStep(Infinity)` throws ValidationError") |
| 6 | The number is finite but not an integer (`Math.floor(num) !== num`) | Throws `ValidationError('INVALID_STEP', 'by', '"by" must be an integer', 400)` | `backend/validators.js:49-51` | `validators.test.js:25-29` ("`validateStep(1.5)` throws ValidationError (non-integer)") |
| 7 | The integer is outside `[MIN_STEP, MAX_STEP]` = `[-1000000, 1000000]` | Throws `ValidationError('STEP_OUT_OF_RANGE', 'by', '"by" is out of the allowed range', 400)` | `backend/validators.js:53-55` | **Untested: no test in the current suite (`backend/test/*.js`) exercises `STEP_OUT_OF_RANGE`.** No request with `by` outside `±1000000` appears anywhere in `backend/test/`. |
| 8 | The integer is within `[MIN_STEP, MAX_STEP]` | Returns the integer unchanged | `backend/validators.js:57` | `validators.test.js:31-33` ("`validateStep(3)` returns 3") |

Notes:
- Note that branch 5's `NaN`/non-finite check subsumes numeric strings that don't
  parse to a real number (e.g. `"abc"` → `Number('abc')` is `NaN`); it is not
  limited to `value` being passed as the literal JavaScript `NaN`.
- All `ValidationError` instances raised by `validateStep` use HTTP status `400`
  and field name `'by'` (`backend/validators.js:30,36,40,46,50,54`). See Section 3
  for how the error middleware turns these into HTTP responses.
- `options.required` is `true` only when a caller explicitly passes it;
  `backend/server.js`'s `/inc` and `/dec` handlers never do (see Section 2), so in
  production traffic branch 2 (`FIELD_REQUIRED`) is reachable only through
  direct, non-HTTP calls to `validateStep`, not through any current HTTP route.

---

## 2. Per-Endpoint Body and Response Contracts

Source: `backend/server.js:45-94` (route handlers).

### `POST /inc` — `backend/server.js:49-59`
- Body: optional `{ by?: number | string }`. `by` is passed to
  `validateStep(req.body.by)` (no `options`, so `required` is `false`) —
  `backend/server.js:51`. If omitted or `null`, it defaults to `1`
  (Section 1, branch 1).
- On success: `count = count + by`; a history entry `{t, op: 'inc', val: count}`
  is appended; state is persisted via `save()`; responds `200 {count}`
  (`backend/server.js:52-55`).
- On validation failure: the error propagates to the centralized error
  middleware (Section 3) via `next(e)`; `count`/`history` are left unchanged and
  `save()` is never called (`backend/server.js:56-58`; see Section 4, R-0008).
- Test evidence: `inc.test.js:16-26` ("POST /inc with {"by":2} increments count
  by 2 and appends history") for the success path; `inc.test.js:28-45` ("POST
  /inc with {"by":"not-a-number"} returns 400 and does not corrupt persisted
  count") for the validation-failure path, including that the on-disk
  `DB_FILE` is left unchanged (`inc.test.js:42-44`).

### `POST /dec` — `backend/server.js:61-71`
- Body: optional `{ by?: number | string }`, validated via the exact same
  `validateStep(req.body.by)` call as `/inc` (`backend/server.js:63`) — same
  default (`1`), same accepted range, same error codes.
- On success: `count = count - by`; a history entry `{t, op: 'dec', val: count}`
  is appended; state is persisted via `save()`; responds `200 {count}`
  (`backend/server.js:64-67`).
- On validation failure: identical to `/inc` — propagates via `next(e)`, no
  mutation, no `save()` (`backend/server.js:68-70`).
- `by` is read and validated on every `/dec` call; it is simply optional
  (defaults to `1` when omitted, exactly like `/inc`). See Section 6 for a note
  on existing project documentation that describes this endpoint differently.
- Test evidence: `dec.test.js:16-26` (`{by:3}` decreases the count by exactly
  `3`), `dec.test.js:28-33` (an omitted body `{}` still decreases by the
  default of `1`), `dec.test.js:35-44` (`{by:'x'}` → `400`, count unchanged).

### `POST /reset` — `backend/server.js:73-86`
- Body: **must be empty** — it accepts zero fields, not `{}` alone by
  convention but literally no own enumerable keys on `req.body`. The handler
  computes `Object.keys(req.body || {})` and, if that array is non-empty,
  throws `ValidationError('UNEXPECTED_FIELD', extraFields[0], '/reset does not
  accept a request body', 400)` **before** any mutation
  (`backend/server.js:75-78`). The `field` in the resulting error body is the
  name of the first unexpected key found.
- On success (no body fields): `count = 0`; a history entry
  `{t, op: 'reset', val: 0}` is appended; state is persisted via `save()`;
  responds `200 {count: 0}` (`backend/server.js:79-82`).
- Test evidence: `reset.test.js:16-27` ("POST /inc then POST /reset returns 200
  with {count:0} and appends a reset history entry") for the success path (with
  an empty body `{}`, which has zero own keys); `reset.test.js:29-34` ("POST
  /reset with an unexpected body field returns 400 with structured error
  envelope") for the rejection path (`{foo:1}` → `400`).
- `/reset` gates only on the shape of the request body (zero vs. non-zero
  keys) — it performs no identity, header, or origin check of any kind (see
  Section 5).

### `GET /count` — `backend/server.js:45-47`
- No body accepted, no request validation performed.
- Response: `200 {count: <current process-global count>}`.
- Used as the "before"/"after" oracle in `inc.test.js`, `dec.test.js`, and
  `reset.test.js` (e.g. `inc.test.js:17,29,37`).

### `GET /history` — `backend/server.js:88-90`
- No body accepted, no request validation performed.
- Response: `200 [{t: <epoch-ms number>, op: 'inc' | 'dec' | 'reset', val: <resulting count after that mutation>}, ...]` — the full in-memory history array, in append order.
- Test evidence: `inc.test.js:22-25`, `dec.test.js:22-25`, `reset.test.js:23-26`
  each read the last entry of `GET /history` and assert its `op`/`val` match
  the mutation just performed.

### `GET /healthz` — `backend/server.js:92-94`
- No body accepted, no request validation performed.
- Response: `200 {status: 'ok'}`, unconditionally — it does not check
  database/file state, connectivity, or anything else.
- No dedicated test file exercises `/healthz`; this rule is sourced from
  `backend/server.js:92-94` directly (no test citation available), per
  instruction I-0001 (cite the source; do not invent a test that doesn't
  exist).

---

## 3. Error-Code and HTTP-Status Contract

Source: the centralized error-handling middleware, `backend/server.js:102-119`
(registered last, per the comment at `backend/server.js:101`), plus the 404
handler at `backend/server.js:97-99`.

Every error response — from any route — is a JSON object shaped
`{ error: <string>, code: <string>[, field: <string>] }`. `field` is present
only for `ValidationError`s that carry one (all current throw sites do; see
below).

| Situation | HTTP status | Response body | Source |
|---|---|---|---|
| Unmatched route (any method/path not registered) | `404` | `{error: 'Not Found', code: 'NOT_FOUND'}` | `backend/server.js:97-99`; test: `not-found.test.js:16-22`, `reset.test.js:36-41` (old `/rese` path) |
| `ValidationError` thrown anywhere in a route handler | the error's own `status` field (all current throw sites use `400`) | `{error: err.message, code: err.code[, field: err.field]}` — e.g. `{error: '"by" is required', code: 'FIELD_REQUIRED', field: 'by'}` | `backend/server.js:103-109`; error construction: `backend/validators.js:30,36,40,46,50,54`, `backend/server.js:77` |
| Non-`ValidationError` error with an upstream 4xx `status`/`statusCode` (e.g. `body-parser`'s JSON `SyntaxError`, which sets `err.status = 400`) | that upstream status (observed: `400`) | `{error: 'Bad Request', code: 'BAD_REQUEST'}` — the upstream error's own message/detail is discarded | `backend/server.js:111-117`; test: `malformed-json.test.js:16-24` ("malformed JSON body on POST /inc is reported as a 4xx client error, not a 500") |
| Any other error (no `ValidationError`, no 4xx `status`/`statusCode` — e.g. a `fs.writeFileSync` failure inside `save()`) | `500` | `{error: 'Internal Server Error', code: 'INTERNAL_ERROR'}` | `backend/server.js:118`; test: `error-handling.test.js:12-20` ("a save()/fs failure is translated into a structured 5xx JSON response, not a crash or stack trace") |

Additional invariants:
- **No response body ever contains a stack trace or internal error detail.**
  The middleware always constructs a fresh `{error, code[, field]}` object; it
  never serializes `err.stack` or `err` itself into the response. Verified by
  `error-handling.test.js:17-19`, which asserts the JSON-stringified response
  body contains neither `'.js:'` nor `'at '` (both of which would appear in a
  leaked Node.js stack trace).
- The four `ValidationError` codes currently thrown anywhere in the backend are
  `FIELD_REQUIRED` (`validators.js:30`), `INVALID_STEP` (`validators.js:36, 40,
  46, 50`), `STEP_OUT_OF_RANGE` (`validators.js:54`), and `UNEXPECTED_FIELD`
  (`server.js:77`) — all four use status `400`. There is no `ValidationError`
  throw site anywhere in the backend that uses a status other than `400`.

---

## 4. State and Mutation Lifecycle Invariants

Source: `backend/server.js:13-27` (state and boot load), `:41-43` (`save()`),
and the three mutating handlers `:49-86`.

- **R-0010 — Process-global, not per-user state.** `count` and `history` are
  plain module-level variables (`backend/server.js:15-16`), not tied to any
  request, session, or caller — every client observes and mutates the same
  shared state. They are loaded exactly once, at process boot, from `DB_FILE`
  (`process.env.DB_FILE || './data.json'`, `backend/server.js:14`):
  `backend/server.js:19-27` reads and `JSON.parse`s the file inside a
  `try`/`catch`; if the read or parse fails for any reason (file missing,
  invalid JSON, etc.), both `count` and `history` fall back to `0` and `[]`
  respectively (`backend/server.js:24-27`) — there is no distinction between
  "file missing" and "file corrupt"; both take the same fallback path.
- **R-0008 — Validation strictly precedes mutation.** In all three mutating
  handlers (`/inc`, `/dec`, `/reset`), `validateStep`/the body-shape check runs
  first, inside a `try` block, and any thrown error is forwarded to `next(e)`
  before the lines that mutate `count`/`history` or call `save()` execute
  (`backend/server.js:50-58`, `:62-70`, `:74-85`). A validation failure
  therefore always leaves `count` and `history` exactly as they were, and
  `save()` is never invoked on that request. Test evidence:
  `inc.test.js:28-45` (a `400` from `/inc` leaves the persisted `count`
  unchanged both in memory and, per the direct read of `DB_FILE` at
  `inc.test.js:42-44`, on disk); `dec.test.js:35-44` (a `400` from `/dec`
  leaves the in-memory `count` unchanged).
- **R-0009 — Every successful mutation appends a history entry and
  synchronously persists.** On the success path of `/inc`, `/dec`, and
  `/reset`, exactly one entry is pushed onto `history` — shaped
  `{t: <Date.now() in epoch-ms>, op: 'inc' | 'dec' | 'reset', val: <the
  resulting count after this mutation>}` (`backend/server.js:53,65,80`) —
  immediately followed by a call to `save()` (`backend/server.js:54,66,81`),
  which synchronously rewrites the **entire** `DB_FILE` with
  `fs.writeFileSync(DB_FILE, JSON.stringify({count, history}))`
  (`backend/server.js:41-43`) before the HTTP response is sent. There is no
  partial/incremental write and no asynchronous or batched persistence. Test
  evidence: `inc.test.js:16-26`, `dec.test.js:16-26`, `reset.test.js:16-27`
  each assert the last `GET /history` entry's `op`/`val` immediately after a
  successful mutation.
- **Concurrency caveat (not a currently-observed defect):** `save()` and the
  boot-time load are plain synchronous `fs` calls with no file lock, and every
  `/inc`/`/dec`/`/reset` handler in `backend/server.js:49-86` runs to
  completion synchronously with no `await`/yield point in between reading and
  writing `count`/`history`, so there is no interleaving within a single
  Node.js process — one request's handler always finishes before the next
  one's JavaScript begins running. The only real exposure is **hypothetical**:
  if multiple instances of this process were run concurrently against the
  *same* `DB_FILE` path (e.g. a multi-process/clustered deployment, which
  nothing in `backend/package.json`'s scripts sets up), each instance keeps
  its own in-memory `count`/`history` loaded once at its own boot, and
  whichever instance calls `save()` last on overlapping requests would
  silently overwrite the other's write. This is a documentation note about a
  deployment shape not exercised by anything in `backend/server.js` or
  `backend/test/*.js` today, not a demonstrated bug in the current
  single-process code path.

---

## 5. Access-Control Rules

Source: `backend/server.js:29-39` (CORS middleware); the absence of any
authentication/authorization code was confirmed by reading `backend/server.js`
and `backend/validators.js` in full — neither file, nor any test in
`backend/test/`, references a user, session, token, API key, or credential of
any kind.

- **No authentication or authorization exists anywhere in the backend.** There
  is no login endpoint, no session store, no token/API-key check, and no
  per-caller identity concept at all in `backend/server.js` or
  `backend/validators.js`. Every route (`GET /count`, `POST /inc`,
  `POST /dec`, `POST /reset`, `GET /history`, `GET /healthz`) is reachable by
  any caller who can reach the process over the network, with no credential
  of any kind. `POST /reset` in particular gates only on the shape of its
  request body (zero own keys — Section 2), never on who is calling it.
- **CORS is unconditionally open.** A middleware registered before every route
  (`backend/server.js:30-39`) sets, on every single request regardless of
  origin, path, or method:
  - `Access-Control-Allow-Origin: *` (`backend/server.js:31`)
  - `Access-Control-Allow-Headers: Content-Type` (`backend/server.js:32`)
  - `Access-Control-Allow-Methods: GET,POST,OPTIONS` (`backend/server.js:33`)

  and if the request method is `OPTIONS`, it short-circuits with
  `res.send(200)` (`backend/server.js:34-35`) — an unconditional `200`
  regardless of path, i.e. even for an `OPTIONS` request to a route that does
  not otherwise exist — without ever calling `next()` to reach the 404
  handler. For any other method it calls `next()` to continue to the matching
  route (`backend/server.js:36-38`). This behavior is not conditioned on the
  request's `Origin` header, IP, or any other property of the caller.
- No test file in `backend/test/` directly exercises the CORS headers or the
  `OPTIONS` short-circuit; this section is sourced from `backend/server.js:
  29-39` directly, per instruction I-0001.

---

## 6. Documentation Drift Appendix — README.md's incorrect `POST /dec` row

`README.md`'s "API" table (its own `## API` section) lists:

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/dec` | — | `{count}` |

claiming `POST /dec` takes **no** request body. This is incorrect for the
current backend:

- `backend/server.js:61-71` shows `/dec`'s handler reads and validates
  `req.body.by` via `validateStep(req.body.by)` — exactly the same call
  `/inc` makes (`backend/server.js:51,63`) — before computing the new count.
  `by` is optional (it defaults to `1` when absent, per Section 1), but it is
  read and validated on **every** call, not ignored.
- `dec.test.js:16-26` proves the `{by}` contract directly: `POST /dec` with
  `{by: 3}` decreases the count by exactly `3`, not by a fixed, body-independent
  amount.
- `dec.test.js:35-44` further proves `by` is validated, not ignored: `POST
  /dec` with `{by: 'x'}` returns `400` with a structured error body rather than
  silently succeeding, which would be the observable behavior if the body
  were truly disregarded.
- Separately, `frontend/app.js:22-26`'s `$scope.dec` always calls
  `$http.post(API + '/dec', {})` — it never sends `by` from the UI. That is a
  *caller* choice, not a backend contract; the backend still validates
  whatever body it receives, per `backend/server.js:61-71` above, and would
  honor an explicit `{by}` from any other caller (as `dec.test.js:16-26`
  demonstrates). `README.md`'s claim that the route has no body is therefore
  wrong about the backend's contract, regardless of what any particular
  frontend caller happens to send.

**This document (`RULES.md`) is authoritative over `README.md` for the
backend's business rules.** Per this Plan's scope, `README.md` itself is not
edited here; correcting its `## API` table (row `POST /dec`, "Body" column) is
flagged as out-of-scope follow-up work for a human to pick up separately.
