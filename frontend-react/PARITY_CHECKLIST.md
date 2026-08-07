# Parity checklist — frontend-react vs. backend/test/*.test.js

Manual walkthrough of frontend-react against a live `backend/server.js`
instance, mapping each backend test scenario to an observed UI behaviour.
All checks below were run and passed (see PR description for the exact
commands/output).

| backend test | scenario | observed UI behaviour |
|---|---|---|
| `inc.test.js` — `{"by":2}` | inc by explicit value | Setting the step input to a number and clicking **+** increases the displayed count by that amount; a follow-up `GET /count` matches. |
| `inc.test.js` — `{"by":"not-a-number"}` | invalid `by` leaves count/persisted file unchanged | Setting step to `abc` and clicking **+** shows the backend's `"by" must be a finite integer (field: by)` message in the UI; the displayed count and the backend's persisted count are unchanged. |
| `dec.test.js` — `{"by":3}` / empty body | dec by default (always 1) | Clicking **-** always decreases the displayed count by exactly 1, regardless of the step input's value (matches legacy `app.js` posting `{}`, not `{by: step}`). |
| `dec.test.js` — `{"by":"x"}` | invalid `by` on dec (n/a — UI never sends `by` for dec) | UI never triggers this path since dec always posts no body, by design (Phase 3 decision). |
| `reset.test.js` — inc then reset | reset success | Clicking **reset**, confirming the `sure?` dialog, sets the displayed count to `0`; a follow-up `GET /history` shows a `reset` entry with `val: 0`. |
| `reset.test.js` — unexpected field | n/a — UI always posts `{}` to `/reset` | Not reachable from the UI; the api.js `reset()` call always sends an empty body. |
| `reset.test.js` — old `/rese` 404 | route removed | Not reachable from the UI; api.js only ever calls `/reset`. |
| `malformed-json.test.js` | malformed JSON body | Not reachable from the UI; api.js always serializes valid JSON via `JSON.stringify`. |
| `not-found.test.js` | unmatched route 404 | Not reachable from the UI in normal operation; api.js only calls the five documented routes. |
| `error-handling.test.js` | fs-write failure (500) | With `DB_FILE` pointed at a non-existent directory, clicking **+** shows the generic message "Something went wrong. Please try again." with no stack-trace text (`.js:` / `at ...`) anywhere in the rendered page. |
| n/a | initial load | Loading the app fetches `GET /count` on mount and renders the live value without a manual refresh. |
| n/a | history rendering | Clicking **show history** renders the current history as real React `<li>` elements (formatted with `toLocaleTimeString`), matching `GET /history` for the same backend state, with no `innerHTML` string concatenation and no jQuery in the bundle. |

## How this was run

1. Started `backend/server.js` with a scratch `DB_FILE` and, for the 500
   scenario, `DB_FILE` pointed at a non-existent directory.
2. Started `frontend-react`'s Vite dev server (`VITE_API_BASE_URL` pointed
   at the backend) and drove the rendered page with a headless-browser
   script performing exactly the flows in the table above.
3. Confirmed `backend/` and `backend/test/` are byte-for-byte unmodified
   (`git diff --stat` shows nothing under `backend/`).
