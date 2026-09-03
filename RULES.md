# RULES.md — Counter App Business Rules

This document is the authoritative statement of the counter app's enforceable
business rules: the `by`/step validation contract, the semantics of the
mutating operations, the invariants of the counter state, and the shape of
error responses. Every statement below is drawn directly from
`backend/validators.js` and `backend/server.js`, and cross-checked against
`backend/test/*.test.js` — the source test citation is noted after each rule.
Anything not corroborated by a test is explicitly labeled **(unverified)**.

## Step Validation

`validateStep(value, options)` in `backend/validators.js` governs the `by`
field accepted by the mutating routes:

- `DEFAULT_STEP` is `1`. If `value` is `undefined` or `null` and
  `options.required` is not `true`, `validateStep` returns `DEFAULT_STEP`
  without error. *(verified: `backend/test/validators.test.js` —
  "validateStep(undefined, {required:false}) returns the documented default
  (1)"; `backend/test/dec.test.js` — "POST /dec with an empty body still
  decreases count by exactly 1".)*
- If `value` is `undefined`/`null` and `options.required` is `true`,
  validation throws `ValidationError` with code `FIELD_REQUIRED`.
  *(verified: `backend/test/validators.test.js` — "validateStep(undefined,
  {required:true}) throws ValidationError". Note: none of the current
  mutating routes (`/inc`, `/dec`) pass `{required: true}` — this branch is
  exercised only via the validator's own unit tests, not through an HTTP
  route today.)*
- A `value` that is not a `number` and not a `string` (e.g. an array, boolean,
  or plain object) is rejected with code `INVALID_STEP`. *(verified:
  `backend/test/validators.test.js` — "validateStep rejects non-number/
  non-string types instead of loosely coercing them".)*
- An empty or whitespace-only string is rejected with code `INVALID_STEP`.
  *(unverified — no test in `backend/test/*.test.js` sends a
  whitespace-only `by` string; behavior is implemented in
  `backend/validators.js:39-41` but not exercised by the suite.)*
- A value that is `NaN` or non-finite (e.g. `Infinity`) is rejected with code
  `INVALID_STEP`. *(verified: `backend/test/validators.test.js` —
  "validateStep(NaN) throws ValidationError" and "validateStep(Infinity)
  throws ValidationError".)*
- A non-integer numeric value (e.g. `1.5`) is rejected with code
  `INVALID_STEP`. *(verified: `backend/test/validators.test.js` —
  "validateStep(1.5) throws ValidationError (non-integer)".)*
- A value outside the inclusive range `[-1000000, 1000000]` is rejected with
  code `STEP_OUT_OF_RANGE`. *(unverified — the range bound of `1000000` is
  implemented in `backend/validators.js:18-19,53-55` but no test in
  `backend/test/*.test.js` exercises a value outside the range.)*
- Every rejection above throws a `ValidationError` whose HTTP status is `400`.
  *(verified: `backend/test/inc.test.js` — "POST /inc with {"by":"not-a-
  number"} returns 400 ..."; `backend/test/dec.test.js` — "POST /dec with
  {"by":"x"} returns 400 ...".)*

## Mutation Operations

- **`POST /inc`**: `count = count + validateStep(req.body.by)`. If `by` is
  omitted, the default step (`1`) is added. *(verified:
  `backend/test/inc.test.js` — "POST /inc with {"by":2} increments count by
  2 and appends history".)*
- **`POST /dec`**: `count = count - validateStep(req.body.by)`. If `by` is
  omitted, the count is still decremented by the default step (`1`).
  *(verified: `backend/test/dec.test.js` — "POST /dec with an empty body
  still decreases count by exactly 1".) Note: the shipped AngularJS frontend
  (`frontend/app.js`) always posts an empty body to `/dec` regardless of the
  user-entered step value — only the increment button forwards the step —
  so in the current UI this default-step behavior is what actually runs on
  every decrement, not just when the field is left blank.*
- **`POST /reset`**: rejects a request whose body contains **any** key with
  `ValidationError` code `UNEXPECTED_FIELD` (using the first offending key as
  the `field`); if the body has no keys, sets `count = 0`. *(verified:
  `backend/test/reset.test.js` — "POST /inc then POST /reset returns 200
  with {count:0} ..." and "POST /reset with an unexpected body field returns
  400 with structured error envelope".)*
- All three mutating routes append an entry `{t, op, val}` to `history`
  (`t` = `Date.now()` epoch-ms, `op` = `'inc'|'dec'|'reset'`, `val` = the
  resulting `count`) and persist state to `DB_FILE` via a synchronous
  `save()` **before** sending the `{count}` response body. *(verified:
  `backend/test/inc.test.js`, `backend/test/dec.test.js`,
  `backend/test/reset.test.js` each assert the last `history` entry's `op`
  and `val` after calling the corresponding route; `backend/test/inc.test.js`
  additionally reads `DB_FILE` back off disk to confirm persistence.)*
- A rejected mutation (any `ValidationError`) does not change `count` and
  does not append to `history` — validation happens before the
  count/history mutation in each handler. *(verified:
  `backend/test/inc.test.js` — "... does not corrupt persisted count";
  `backend/test/dec.test.js` — "... does not mutate count".)*

### Field-strictness asymmetry (current behavior)

`/inc` and `/dec` only ever read `req.body.by` — any other keys present in
the request body are silently ignored. `/reset`, by contrast, rejects the
request with `UNEXPECTED_FIELD` if **any** key at all is present in the
body, including keys other than `by`. There is no single, shared
"unexpected field" policy across the three mutating routes today: two of
them are permissive of unknown fields and one is strict. This is documented
here as the current, intentional-for-now business rule — not a defect to be
silently worked around — and is out of scope for this document to change.
*(verified: `backend/test/reset.test.js` — "POST /reset with an unexpected
body field returns 400 ..."; contrast with `backend/test/inc.test.js` and
`backend/test/dec.test.js`, neither of which tests an extra-field rejection
on `/inc`/`/dec`, consistent with `backend/server.js:49-71` never inspecting
any body key besides `by`.)*

## Counter State

- `count` is an integer and may legitimately be **negative** — there is no
  floor at zero. The frontend renders the `.neg` CSS class on the counter
  display when `count < 0` (`frontend/index.html`), confirming negative
  values are an expected, styled state rather than an error condition.
  *(verified indirectly: `backend/test/dec.test.js`'s first test starts from
  a freshly-booted `count = 0` and asserts `POST /dec {by:3}` returns a count
  of `before.body.count - 3` (i.e. `-3`); that assertion would fail if
  `/dec` floored `count` at zero, so the passing suite depends on — and
  thereby confirms — the no-floor-at-zero behavior, even though no test
  names "negative count" explicitly. Behavior is implemented in
  `backend/server.js:61-71`, which has no lower bound, and
  `backend/validators.js`, which has no floor check.)*
- `history` is an append-only log of `{t, op, val}` entries; entries are
  never removed or mutated after being pushed, and `GET /history` returns
  the full log. *(verified indirectly: every mutation test in
  `backend/test/inc.test.js`, `backend/test/dec.test.js`, and
  `backend/test/reset.test.js` asserts the *last* history entry after a
  mutation, consistent with `history.push(...)` being the only mutation of
  `history` in `backend/server.js`.)*
- On boot, `count` and `history` are loaded from `DB_FILE`
  (`process.env.DB_FILE` or `./data.json`); if the file is missing or
  unparsable, both reset to `count = 0` and `history = []` rather than
  crashing. *(unverified against `backend/test/*.test.js` — each test file
  points `DB_FILE` at a fresh/missing path and relies on this fallback
  implicitly, but no test asserts the fallback values directly; behavior is
  implemented in `backend/server.js:19-27`.)*

## Error Responses

The centralised error-handling middleware in `backend/server.js` (registered
last, after the 404 handler) produces one of three response tiers, plus a
distinct 404 rule for unmatched routes:

1. **`ValidationError`** (thrown by `validateStep` or the `/reset` handler):
   responds with the error's own `status` (`400` for every case currently
   thrown) and body `{error, code}`, plus `field` when the error carries one.
   *(verified: `backend/test/inc.test.js` asserts `res.body.field` is
   present for an invalid `by`; `backend/test/dec.test.js` and
   `backend/test/reset.test.js` assert `res.body.error`/`res.body.code` are
   present without asserting `field`.)*
2. **Other 4xx** (e.g. body-parser's JSON `SyntaxError`, which sets
   `err.status = 400`): responds `400` with a fixed body
   `{error: 'Bad Request', code: 'BAD_REQUEST'}`, regardless of the
   upstream error's own message. *(the 4xx-not-500 status is verified:
   `backend/test/malformed-json.test.js` — "malformed JSON body on POST
   /inc is reported as a 4xx client error, not a 500" asserts
   `res.status` is in `[400,500)` and that `res.body.error`/`res.body.code`
   are present; the exact fixed strings `'Bad Request'`/`'BAD_REQUEST'` are
   not asserted by any test and are confirmed instead by code inspection of
   `backend/server.js:115`.)*
3. **Everything else** (unexpected exceptions, e.g. a filesystem error from
   `save()`): responds `500` with `{error: 'Internal Server Error', code:
   'INTERNAL_ERROR'}`, and never leaks a stack trace or file path in the
   response body. *(the 500 status and the no-stack-trace-leak guarantee
   are verified: `backend/test/error-handling.test.js` — "a save()/fs
   failure is translated into a structured 5xx JSON response, not a crash
   or stack trace" asserts `res.status === 500` and that the response body
   contains neither `.js:` nor `at `; the exact fixed strings
   `'Internal Server Error'`/`'INTERNAL_ERROR'` are not asserted by any
   test and are confirmed instead by code inspection of
   `backend/server.js:118`.)*
4. **Unmatched routes** (no route matches, handled by the dedicated 404
   middleware registered before the error handler): responds `404` with
   `{error: 'Not Found', code: 'NOT_FOUND'}`. *(the 404 status is verified:
   `backend/test/not-found.test.js` — "GET /this-route-does-not-exist
   returns 404 with a structured JSON body" and `backend/test/reset.test.js`
   — "the old /rese path no longer exists and is handled by the 404
   handler" both assert `res.status === 404` and truthy `res.body.error`/
   `res.body.code`; the exact fixed strings `'Not Found'`/`'NOT_FOUND'` are
   not asserted by any test and are confirmed instead by code inspection of
   `backend/server.js:98`.)*

## Keeping this current

This document must be reviewed and updated whenever any of these four
locations change, since each backs one or more sections above:

- **`backend/validators.js`** — the `validateStep` contract (Step Validation
  section: `DEFAULT_STEP`, range bounds, error codes).
- **the mutating routes in `backend/server.js`** (`POST /inc`, `POST /dec`,
  `POST /reset`, roughly `backend/server.js:49-86`) — the Mutation
  Operations section, including the field-strictness asymmetry.
- **the counter-state shape in `backend/server.js`** (the `count`/`history`
  globals and their load/save logic, roughly `backend/server.js:14-27,41-43`)
  — the Counter State section.
- **the error middleware in `backend/server.js`** (the 404 handler and the
  centralised error-handling middleware, roughly `backend/server.js:96-119`)
  — the Error Responses section.

If a change to any of the above alters a rule stated here, update this file
in the same change, and re-run `backend/test/*.test.js` to confirm the
updated statement still holds (or mark it unverified if the suite does not
cover it).
