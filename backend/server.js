// counter backend
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var validators = require('./validators');
var ValidationError = validators.ValidationError;
var validateStep = validators.validateStep;
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// global state, whatever
var DB_FILE = process.env.DB_FILE || './data.json';
var count = 0;
var history = [];

// Reads and validates the on-disk datastore. A missing file (ENOENT) is a
// legitimate clean-boot state and returns the default {count:0, history:[]}.
// Every other failure (unparseable JSON, wrong shape) is a sign the file is
// corrupt and must NOT be silently treated as "empty" - it throws a
// descriptive Error so the caller can decide (boot-time: abort with a real
// stack instead of quietly wiping the counter).
function loadState(filePath) {
  var raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      return { count: 0, history: [] };
    }
    throw e;
  }

  var obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    throw new Error('Datastore file ' + filePath + ' contains invalid JSON: ' + e.message);
  }

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Datastore file ' + filePath + ' does not contain a JSON object');
  }
  if (typeof obj.count !== 'number' || isNaN(obj.count)) {
    throw new Error('Datastore file ' + filePath + ' has a missing or non-numeric "count" field');
  }
  if (!Array.isArray(obj.history)) {
    throw new Error('Datastore file ' + filePath + ' has a missing or non-array "history" field');
  }

  return { count: obj.count, history: obj.history };
}

// A previous run may have crashed between writing DB_FILE + '.tmp' and
// renaming it over DB_FILE. That stale .tmp is never a legitimate live
// file, so clear it before boot-loading DB_FILE itself.
var TMP_FILE = DB_FILE + '.tmp';
try {
  fs.unlinkSync(TMP_FILE);
  console.log('removed stale temp datastore file ' + TMP_FILE);
} catch (e) {
  if (e.code !== 'ENOENT') {
    throw e;
  }
}

var initialState = loadState(DB_FILE);
count = initialState.count;
history = initialState.history;

// manual CORS because why not
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method == 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
});

// Crash-safe, non-blocking persistence: write the new state to a sibling
// .tmp file, then rename it over DB_FILE. rename(2) onto an existing
// destination on the SAME filesystem is atomic on POSIX, so a process that
// dies mid-save leaves either the old DB_FILE intact or a stray .tmp file
// (cleaned up at next boot) - never a half-written DB_FILE. This is safe to
// call concurrently only because every caller below goes through the
// `enqueue` serialising queue; calling save() directly from concurrent
// requests without that queue would reopen a lost-update race (two callers
// could both read the same `count` before either write lands).
//
// Note: this is in-process serialisation only. It guards this app's actual
// deployment (one Node process) against interleaved requests; it provides
// no protection against two OS processes (e.g. cluster/PM2, or two running
// instances) sharing the same DB_FILE.
//
// Windows caveat: fs.promises.rename onto an existing destination is
// atomic on POSIX but can fail with EPERM/EEXIST on Windows. This app
// targets POSIX deployments; a Windows target would need an
// unlink-then-rename fallback here instead.
function save() {
  return fs.promises
    .writeFile(TMP_FILE, JSON.stringify({ count: count, history: history }))
    .then(function () {
      return fs.promises.rename(TMP_FILE, DB_FILE);
    });
}

// Single-slot promise queue: every mutation (/inc, /dec, /reset) appends its
// validate -> mutate -> history.push -> save unit onto this chain, so units
// run strictly one at a time in arrival order no matter how many requests
// land concurrently. If a unit rejects (validation error or a save()
// failure), the tail is re-seeded with a swallowed-rejection continuation so
// that one failure doesn't permanently poison every later mutation; the
// real error still propagates to the caller that queued the failing unit.
var pending = Promise.resolve();

function enqueue(unit) {
  var result = pending.then(unit);
  pending = result.catch(function () {});
  return result;
}

app.get('/count', function (req, res) {
  res.send({ count: count });
});

app.post('/inc', function (req, res, next) {
  enqueue(function () {
    var by = validateStep(req.body.by);
    count = count + by;
    history.push({ t: new Date().getTime(), op: 'inc', val: count });
    return save().then(function () {
      res.send({ count: count });
    });
  }).catch(function (e) {
    next(e);
  });
});

app.post('/dec', function (req, res, next) {
  enqueue(function () {
    var by = validateStep(req.body.by);
    count = count - by;
    history.push({ t: new Date().getTime(), op: 'dec', val: count });
    return save().then(function () {
      res.send({ count: count });
    });
  }).catch(function (e) {
    next(e);
  });
});

app.post('/reset', function (req, res, next) {
  enqueue(function () {
    var extraFields = Object.keys(req.body || {});
    if (extraFields.length > 0) {
      throw new ValidationError('UNEXPECTED_FIELD', extraFields[0], '/reset does not accept a request body', 400);
    }
    count = 0;
    history.push({ t: new Date().getTime(), op: 'reset', val: 0 });
    return save().then(function () {
      res.send({ count: count });
    });
  }).catch(function (e) {
    next(e);
  });
});

app.get('/history', function (req, res) {
  res.send(history);
});

app.get('/healthz', function (req, res) {
  res.status(200).send({ status: 'ok' });
});

// 404 handler - unmatched routes get a structured JSON body
app.use(function (req, res) {
  res.status(404).send({ error: 'Not Found', code: 'NOT_FOUND' });
});

// centralised error-handling middleware - must be last
app.use(function (err, req, res, next) {
  if (err instanceof ValidationError) {
    var body = { error: err.message, code: err.code };
    if (err.field) {
      body.field = err.field;
    }
    res.status(err.status).send(body);
    return;
  }
  // Honour a legitimate 4xx set by upstream middleware (e.g. body-parser's
  // JSON SyntaxError, which sets err.status = 400) instead of always 500.
  var status = err.status || err.statusCode;
  if (status >= 400 && status < 500) {
    res.status(status).send({ error: 'Bad Request', code: 'BAD_REQUEST' });
    return;
  }
  res.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
});

if (require.main === module) {
  var PORT = process.env.PORT || 4000;
  app.listen(PORT, '0.0.0.0', function () {
    console.log('counter backend running on ' + PORT);
  });
}

module.exports = app;
module.exports.loadState = loadState;
