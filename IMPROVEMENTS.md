# IMPROVEMENTS.md — Suggested improvements backlog

This document is forward-looking: it proposes improvements surfaced while
porting the counter app's Node/Express + AngularJS stack to Python/FastAPI +
React. It does **not** re-litigate what was intentionally preserved during
the rewrite (see `RULES.md` for the pinned, backward-looking behavioral
contract, including its "Deliberate scope decision" and "Unpinned /
unverified behaviour" sections) — these are proposals for future work, none
of which were implemented as part of this rewrite.

## Concurrency & Scale

1. **Lock/concurrency control around count & history mutations.** `POST
   /inc`, `/dec`, and `/reset` all read-modify-write the shared in-memory
   `count`/`history` state (and then the on-disk file) with no locking,
   queueing, or transaction semantics — this was true of the original Node
   server and is preserved as-is in the Python port. Concurrent requests can
   race and produce interleaved/lost updates, especially once persistence is
   involved.
   **Proposed direction:** introduce a mutex (e.g. `asyncio.Lock` around the
   mutate-then-persist critical section, or move to a single-writer
   queue/actor) so `/inc`, `/dec`, and `/reset` execute their
   read-modify-write-persist sequence atomically with respect to each other.

2. **Pagination or a size cap for `GET /history`.** The `history` array
   grows without bound (one entry appended per mutating request, never
   trimmed or rotated) and `GET /history` always returns the entire array in
   one response, with no wrapping envelope or pagination metadata. As
   history grows large this drives up memory footprint, per-request
   `save()`/serialization latency, and response payload size.
   **Proposed direction:** add either (a) pagination (`?limit=&offset=` or
   cursor-based) to `GET /history`, and/or (b) a max-length cap with
   truncation/rotation of the oldest entries (e.g. keep the last N,
   optionally archiving older entries to a separate file); either change
   should also consider wrapping the response as `{ history: [...], total,
   ... }` for consistency with the other endpoints' `{ count }` envelope.

## Security & Deployment

3. **Authentication and narrowed CORS for real deployments.** The backend
   currently has no authentication/authorization of any kind, and CORS is
   configured with `allow_origins=['*']`, matching the original Node
   server's posture. This is a deliberate, documented scope decision for
   this rewrite (see `RULES.md`), not an oversight — but it is not a safe
   default for any real-world deployment reachable outside a trusted network.
   **Proposed direction:** once real deployment/auth requirements are known,
   add an auth layer (API key, session, or OAuth depending on consumer type)
   and replace the wildcard CORS origin with an explicit allow-list of known
   frontend origins.

4. **Real persistence layer instead of a flat JSON file.** State is stored
   as a single JSON file rewritten in full on every mutating request
   (`storage.save()`), which does not scale well and offers no transactional
   guarantees, indexing, or concurrent-writer safety. Database persistence
   was explicitly out of scope for this rewrite.
   **Proposed direction:** migrate to a real datastore (e.g. SQLite for a
   low-effort drop-in with real transactions, or Postgres/Redis for
   multi-instance deployments) once scale or durability requirements justify
   the added complexity.

## Behavioral / UX

5. **Decrement not honoring the typed step amount (asymmetry with
   increment).** `Counter.jsx`'s `-` button always calls `POST /dec` with an
   empty body, relying entirely on the backend's default step of 1, while
   `+` sends `{ by: step }` using whatever value is typed into the step
   input — even though `/dec` accepts an optional `by` field with identical
   validation to `/inc` (see `RULES.md` R-0011). This means there is
   currently no way to decrement by a custom amount from the UI at all. This
   was preserved as-is during the rewrite as a suspected UX defect/asymmetry
   rather than silently "fixed."
   **Proposed direction:** make `-` also send `{ by: step }` for symmetry
   with `+`, pending product confirmation that this asymmetry isn't
   intentional (e.g. a "decrement always by 1" safety rail) — this is a
   product decision to confirm, not an obvious bug to just patch.

6. **Silently-ignored extra body fields on `/inc`/`/dec`.** Unlike `/reset`
   (which rejects any unexpected body field), `/inc` and `/dec` only read
   `by` and silently ignore any other field sent in the request body. This
   is inconsistent and could mask client bugs (e.g. a typo'd field name that
   silently does nothing instead of surfacing an error).
   **Proposed direction:** consider applying the same "reject unexpected
   fields" strictness used by `/reset` to `/inc`/`/dec` as well, behind a
   product decision, since it would be a behavior change for existing
   clients.

## Reliability

7. **No rollback of in-memory state when persistence fails.** On `/inc`,
   `/dec`, and `/reset`, the in-memory `count`/`history` are mutated first
   and only afterward persisted via `storage.save()`. If `save()` raises
   (e.g. disk full, permissions issue, missing directory), the caller
   correctly receives a structured 500 error, but the in-memory state has
   already changed and is never rolled back — so the running process's view
   of `count`/`history` can drift from the last-known-good on-disk state
   until the next successful write happens to overwrite it. This is a
   known, pre-existing gap (pinned by `backend/tests/test_error_handling.py`
   / `RULES.md` R-0015) that was preserved during the rewrite rather than
   fixed.
   **Proposed direction:** snapshot `count`/`history` before mutating, and
   restore the snapshot if `save()` raises, so a failed persistence attempt
   leaves in-memory state consistent with what's actually on disk; longer
   term, consider reordering to persist-then-mutate (write the intended new
   state to disk first, only updating in-memory state on success) or adding
   a write-ahead journal with retry for durability across restarts.

8. **No health/readiness distinction beyond `/healthz`.** The existing
   `/healthz` endpoint (preserved from the Node server) always returns
   `{status: "ok"}` regardless of whether the storage file is
   readable/writable. This gives orchestrators (Kubernetes, load balancers,
   etc.) no way to detect a storage-layer failure via health checks.
   **Proposed direction:** consider a `/readyz`-style check that verifies
   the storage file is currently readable/writable, separate from the basic
   liveness check `/healthz` provides.
