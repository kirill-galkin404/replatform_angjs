# frontend/test/maintctrl.test.html - manual-only check

`maintctrl.test.html` is a static, no-build fixture that instantiates
`MainCtrl` with a stubbed `$httpBackend` (via `angular-mocks`) and asserts
that `$scope.history` reflects the **post-mutation** `/history` payload
after calling `$scope.inc()` - i.e. it fails if history is not
automatically refreshed after a mutation, not merely if the mutation's own
response is wrong.

**This is a manual-only check, not an automated test in this repo's CI or
`npm test`.** It needs AngularJS 1.2.28 and a matching `angular-mocks`
build from a CDN, and this execution environment's outbound network access
to those CDNs returned HTTP 403 (`host_not_allowed`) - the same restriction
already noted from the planning sandbox. There is no vendored copy of
either library anywhere in this repo or image, and the project intentionally
has no bundler/package manager for the frontend (`frontend/build.sh` is
copy-only), so nothing was added here to work around that constraint.

## How to run it manually

1. Open `frontend/test/maintctrl.test.html` directly in a browser
   (double-click it, or serve `frontend/` with any static file server) on a
   machine with network access to `ajax.googleapis.com`.
2. Read the `<pre id="output">` block (also logged to the browser console):
   each assertion prints `PASS` or `FAIL`, ending in `ALL PASS` or
   `SOME FAILED`.
3. Expected outcome against the current `app.js` (post history-refresh fix):
   `ALL PASS`. Against the pre-fix `app.js` (global `loadHistory()`, no
   `$scope.loadHistory`, no post-mutation refresh call), the `$scope.history`
   assertions fail because history is never populated/refreshed by `inc()`.
