# RULES.md — Behavioral contract for the counter app

This document is the extracted behavioral contract of the current Node/Express
backend (`backend/server.js`, `backend/validators.js`) and the AngularJS
frontend (`frontend/app.js`), as pinned by the existing Node test suite under
`backend/test/*.js`. It is the ground truth that the Python/React rewrite must
match, rule by rule, unless a rule is explicitly marked `[change]`.

Each rule is tagged:
- `[preserve]` — must be reproduced exactly in the rewrite.
- `[change]` — deliberately altered by a later step in this Plan; the change
  is noted in the rule itself.

## Numbered rules

**R-0001** `[preserve]` When a request to `/inc` or `/dec` omits the `by`
field (or sends it as `null`), the counter changes by exactly 1
(`validateStep`'s `DEFAULT_STEP = 1` in `backend/validators.js`).
Pinned by: `backend/test/validators.test.js` (`validateStep(undefined, ...)` →
`1`), `backend/test/inc.test.js`, `backend/test/dec.test.js` ("POST /dec with
an empty body still decreases count by exactly 1").

**R-0002** `[preserve]` `validateStep` supports a stricter mode
(`{ required: true }`) where a missing/`null` step value is rejected outright
(`ValidationError('FIELD_REQUIRED', 'by', ...)`) instead of defaulting to 1.
Pinned by: `backend/test/validators.test.js`
(`validateStep(undefined, {required:true})` throws). Note: `server.js` never
actually calls `validateStep` with `{ required: true }` on any route today —
this stricter mode exists in `validators.js` and is exercised only at the
validator-unit level, not through any HTTP route in the current app.

**R-0003** `[preserve]` A `by` value that is not a number or a string is
rejected outright, with no attempt at loose coercion — arrays, plain objects
and booleans are all rejected (`typeof value !== 'number' && typeof value !==
'string'` check in `backend/validators.js`).
Pinned by: `backend/test/validators.test.js` ("validateStep rejects
non-number/non-string types instead of loosely coercing them" — covers
`[5]`, `[]`, `true`, `false`, `{}`).

**R-0004** `[preserve]` A `by` value that is a whitespace-only string (e.g.
`"   "`) is treated as invalid rather than being coerced to the number 0.
Implemented by the `typeof value === 'string' && value.trim() === ''` check
in `backend/validators.js`. **Not directly pinned by an explicit
whitespace-string test** — `backend/test/validators.test.js` was checked and
contains no test that passes a whitespace-only string to `validateStep`. This
is implementation-level behavior only; the rewrite must still preserve it
since it is intentional, documented-in-code logic, but it currently has no
regression test guarding it.

**R-0005** `[preserve]` The counter can only move by whole numbers; a
fractional `by` such as `1.5` is rejected even though it is numeric and
finite (`Math.floor(num) !== num` check in `backend/validators.js`).
Pinned by: `backend/test/validators.test.js` ("validateStep(1.5) throws
ValidationError (non-integer)").

**R-0006** `[preserve]` The counter cannot be moved by more than one million
in a single `/inc` or `/dec` call, in either direction (`MIN_STEP =
-1000000`, `MAX_STEP = 1000000` in `backend/validators.js`, enforced via
`num < MIN_STEP || num > MAX_STEP` → `ValidationError('STEP_OUT_OF_RANGE', ...)`).
**Not directly pinned by any test** — `backend/test/validators.test.js` was
checked carefully and contains no test that exercises a `by` value outside
`[-1000000, 1000000]` (the largest tested values are `3`, `1.5`, `NaN`,
`Infinity`, and the non-coercible-type cases). This rule is currently
implementation-level only, not test-pinned; the rewrite must still preserve
the exact `MIN_STEP`/`MAX_STEP` bounds and the `STEP_OUT_OF_RANGE` code.

**R-0007** `[change]` The frontend decides which backend server to call using
a build-time-injected global, `window.API_BASE_URL`, read in
`frontend/app.js` (`var API = window.API_BASE_URL || 'http://localhost:4000';`),
which is populated by `frontend/build.sh` writing a generated `env.js` file
from the `API_BASE_URL` shell environment variable at build time, falling
back to the hardcoded local default `http://localhost:4000` if that variable
was never set at build time. **This rule is changed by a later step in this
Plan (S-0006)**, which replaces the `build.sh`/`env.js` mechanism with a
standard Vite build-time environment variable, `import.meta.env.VITE_API_BASE_URL`
(see `frontend/src/api.js`), read at build time by Vite instead of via a
runtime-loaded `<script src="env.js">` tag. The same fallback default
(`http://localhost:4000`) is preserved across the change.

**R-0008** `[preserve]` Every error reaching the app's centralized error
handler (`backend/server.js`, final `app.use(function (err, req, res, next) {...})`
middleware) is translated into a consistent JSON body: `ValidationError`
instances keep their specific `code`/`status`/`field`; any other error/object
carrying a 4xx `status`/`statusCode` (e.g. body-parser's JSON `SyntaxError`)
is flattened to a generic `{ error: 'Bad Request', code: 'BAD_REQUEST' }` with
status 400; anything else becomes a generic `{ error: 'Internal Server
Error', code: 'INTERNAL_ERROR' }` with status 500, with no stack trace or
other internal detail leaked in the response body.
Pinned by: `backend/test/error-handling.test.js` ("a save()/fs failure is
translated into a structured 5xx JSON response, not a crash or stack trace"),
`backend/test/malformed-json.test.js` ("malformed JSON body on POST /inc is
reported as a 4xx client error, not a 500").

**R-0009** `[preserve]` Any request whose path/method doesn't match one of
the defined routes gets a structured JSON 404 response
(`{ error: 'Not Found', code: 'NOT_FOUND' }`) rather than a framework default
HTML error page.
Pinned by: `backend/test/not-found.test.js` (`GET
/this-route-does-not-exist` → 404 JSON), `backend/test/reset.test.js`'s "the
old `/rese` path no longer exists and is handled by the 404 handler" case.

**R-0010** `[preserve]` The counter cannot be reset without the user
explicitly confirming a browser `confirm()` dialog first
(`frontend/app.js`, `$scope.reset = function () { if (confirm('sure?')) {...} }`).
**No automated frontend test exists for this in the current repo** — the
frontend rewrite (later steps in this Plan) will need to reproduce this
confirm-before-reset gate in React, but there is nothing in
`backend/test/*.js` that pins frontend behavior since those tests only cover
the backend.

**R-0011** `[preserve]` Incrementing sends the amount typed into the step
input field (`$http.post(API + '/inc', { by: $scope.step })`), but
decrementing always sends no amount at all (`$http.post(API + '/dec', {})`),
relying entirely on the backend's fixed default (R-0001) rather than sending
the step value the user typed. This means today's UI has no way to decrement
by a custom amount — only `by`-less "decrement by 1" is reachable from the
existing frontend, even though the backend's `/dec` route accepts an optional
`by` field identical to `/inc`'s (see `backend/server.js`'s `/dec` handler,
and `backend/test/dec.test.js`'s `{by:3}` case, which only the test suite and
not the current UI exercises).
Source: `frontend/app.js` `inc()`/`dec()`.

**R-0012** `[preserve]` A successful `POST /inc` adds the validated step to
the running in-memory count, appends a `{ t, op: 'inc', val: <new count> }`
entry to the in-memory history log, and synchronously rewrites the whole
state file (`fs.writeFileSync` via `save()`) before responding with the new
count.
Pinned by: `backend/test/inc.test.js` ("POST /inc with {"by":2} increments
count by 2 and appends history").

**R-0013** `[preserve]` A successful `POST /dec` subtracts the validated step
from the running count; the count is allowed to go negative with no floor
(no clamping/min-value check anywhere in `backend/server.js`).
Pinned by: `backend/test/dec.test.js` ("POST /dec with {"by":3} decreases
count by 3 and appends history with op dec").

**R-0014** `[preserve]` `POST /reset` only succeeds with an empty body;
sending any field at all (e.g. `{ foo: 1 }`) causes a 400
`ValidationError('UNEXPECTED_FIELD', ...)`, and otherwise the counter is
unconditionally set to 0 and a `{ t, op: 'reset', val: 0 }` entry is appended
to history.
Pinned by: `backend/test/reset.test.js` (both the successful-reset case and
"POST /reset with an unexpected body field returns 400 with structured error
envelope").

**R-0015** `[preserve]` On `/inc`, `/dec` and `/reset`, the in-memory counter
and history are updated first, and only afterward written to disk via
`save()`; if the disk write throws (e.g. because the configured `DB_FILE`
directory doesn't exist), the in-memory state has already changed and is
**not** rolled back — the error handler still returns the write failure as a
500 to the caller, but the server's own in-memory `count`/`history` remain
mutated.
Pinned by: `backend/test/error-handling.test.js` (points `DB_FILE` at a
non-existent directory to force `fs.writeFileSync` to throw, and asserts the
error is reported as a structured 500 rather than a crash — it does not
assert on post-failure in-memory state, so the absence-of-rollback itself is
inferred directly from reading `backend/server.js`, not asserted by the
test).
**Note — suspected defect, to be preserved, not fixed:** this "mutate first,
persist second, no rollback on failure" ordering means a save failure leaves
the running process's in-memory count divergent from what's on disk (until
the next successful write papers over it). Per this Plan's decisions, the
Python port must preserve this exact behavior rather than fix it; the defect
is to be recorded in `IMPROVEMENTS.md` (a later, separate step in this Plan)
as a proposed improvement, not remediated silently during the rewrite.

**R-0016** `[preserve]` When the server starts, if the data file
(`DB_FILE`, default `./data.json`) is missing, unreadable, or not valid JSON,
the `try { fs.readFileSync(...); JSON.parse(...); } catch (e) { count = 0;
history = []; }` boot-time guard in `backend/server.js` silently resets the
counter and history to zero/empty rather than crashing the process or
surfacing a warning.
**No dedicated boot-hydration test exists yet in `backend/test/*.js`** —
every test file in the suite points `DB_FILE` at a path that doesn't exist
yet (via `try { fs.unlinkSync(DB_FILE); } catch (e) {}` before `require('../server')`),
so this fallback path is exercised incidentally by every test file's setup,
but no test asserts on it directly (e.g. by pre-seeding a corrupt/malformed
JSON file and asserting the server still boots with `count === 0`).

## Undocumented behavior found in the current code

- **`/dec`'s undocumented optional `by` field.** `README.md`'s API table
  documents `/inc`'s body as `{by?}` but `/dec`'s body as `—` (implying no
  body is accepted). In reality `backend/server.js`'s `/dec` handler calls
  the exact same `validateStep(req.body.by)` as `/inc` — `/dec` accepts an
  optional `by` field with identical validation rules (see R-0001, R-0011,
  and `backend/test/dec.test.js`'s `{by:3}` case). The README is incomplete
  here; the rewrite's documentation should describe `/dec`'s body as `{by?}`
  as well.
- **The undocumented `GET /healthz` endpoint.** `backend/server.js` defines
  `app.get('/healthz', ...)` returning `{ status: 'ok' }` with HTTP 200. This
  route is not mentioned anywhere in `README.md`'s API table, and no test in
  `backend/test/*.js` covers it. It must still be preserved in the rewrite
  (it is live, reachable behavior), and should be documented.
- **The README's false "zero validation" claim.** `README.md`'s "Stack"
  section states the backend has "zero validation/error handling." This is
  false as of the current code: `backend/validators.js` implements a
  fairly thorough `validateStep` (type checks, whitespace handling, integer
  check, range check, required-mode) and `backend/server.js` has a
  centralized error-handling middleware (R-0008) plus a structured 404
  handler (R-0009) and per-route body validation on `/reset` (R-0014). The
  claim appears to be stale copy left over from an earlier version of the
  app, predating `validators.js` and the error/404 middleware. The rewrite's
  documentation must not repeat this claim.

## Deliberate scope decision: no auth, wildcard CORS

`backend/server.js` has no authentication/authorization of any kind, and its
manual CORS middleware unconditionally sets
`Access-Control-Allow-Origin: *` for every request. This is a **deliberate,
explicit scope decision for this rewrite, not an oversight to be silently
"fixed"**: per this Plan's approved instructions, adding authentication, rate
limiting, or database persistence is explicitly out of scope for the
Python/React port. The no-auth + wildcard-CORS posture is to be preserved
as-is in the Python rewrite; any concerns about it belong exclusively in
`IMPROVEMENTS.md` (written by a later, separate step in this Plan) as a
proposed future improvement, not implemented here.

## Unpinned / unverified behaviour

The following behaviors are either not exercised by any test in
`backend/test/*.js`, or are exercised only incidentally as a side effect of
test setup rather than being the subject of an explicit assertion. The Python
rewrite should preserve today's actual behavior for all of these, but should
not treat the absence of a test as license to change them silently:

1. **Concurrent mutating requests.** `backend/server.js` has no locking,
   queueing, or transaction semantics around the global `count`/`history`
   state or the synchronous `save()` file write. Two concurrent `/inc`,
   `/dec`, or `/reset` requests racing each other (e.g. interleaved reads and
   writes of the shared in-memory `count`/`history` variables, or overlapping
   `fs.writeFileSync` calls to the same `DB_FILE`) have no test coverage and
   no defined/guaranteed outcome beyond "whatever Node's single-threaded
   event loop and synchronous fs calls happen to produce." This is not
   pinned by any test.
2. **Large-history payload cost.** `GET /history` returns the entire
   in-memory `history` array unpaginated, and every mutating request appends
   to it forever (there is no trimming/rotation/eviction of old entries) and
   rewrites the *entire* state file (count + full history) synchronously on
   every single `/inc`/`/dec`/`/reset` call. The cost of this as `history`
   grows large (memory footprint, `JSON.stringify`/`writeFileSync` latency
   per request, `GET /history` response size) is not measured or bounded
   anywhere, and no test exercises a large-history scenario.
3. **Extra body fields on non-`/reset` endpoints.** `/reset` explicitly
   rejects any request body field (R-0014). `/inc` and `/dec`, by contrast,
   only ever read `req.body.by` and silently ignore every other field present
   in the body — sending e.g. `{ by: 1, extra: 'x' }` to `/inc` is not tested
   anywhere and its "extra fields are silently ignored, not rejected" behavior
   is inferred only by reading `backend/server.js`'s handlers, not asserted
   by any test.
4. **The `/history` response shape.** `GET /history` returns the raw
   `history` array of `{ t, op, val }` objects with no wrapping envelope
   (unlike `/count`, `/inc`, `/dec`, `/reset`, which all wrap their payload
   in `{ count }`). This asymmetry (bare array vs. wrapped object) is real,
   observable behavior in `backend/server.js`, but no test asserts on the
   *shape* of the `/history` response beyond indexing into the array to read
   the last entry's `op`/`val` — the fact that it's a bare top-level array
   (not `{ history: [...] }`) is not itself pinned by an explicit assertion.
