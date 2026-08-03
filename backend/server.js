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

// load on boot
try {
  var raw = fs.readFileSync(DB_FILE, 'utf8');
  var obj = JSON.parse(raw);
  count = obj.count;
  history = obj.history;
} catch (e) {
  count = 0;
  history = [];
}

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

// Writes to a temp file then renames into place, both synchronously, so a
// crash/failure mid-write never leaves DB_FILE holding a partial/corrupt
// write. Stays fully synchronous (no fs.promises) so the single-threaded
// event loop keeps running each request's validate->mutate->save handler to
// completion before the next one starts - that is what already makes
// concurrent requests safe today, and introducing an async gap here would
// break it rather than fix anything.
function save() {
  var tmpFile = DB_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify({ count: count, history: history }));
  fs.renameSync(tmpFile, DB_FILE);
}

app.get('/count', function (req, res) {
  res.send({ count: count });
});

app.post('/inc', function (req, res, next) {
  var prevCount = count;
  var prevHistory = history;
  try {
    var by = validateStep(req.body.by);
    count = count + by;
    history = history.concat([{ t: new Date().getTime(), op: 'inc', val: count }]);
    save();
    res.send({ count: count });
  } catch (e) {
    count = prevCount;
    history = prevHistory;
    next(e);
  }
});

app.post('/dec', function (req, res, next) {
  var prevCount = count;
  var prevHistory = history;
  try {
    var by = validateStep(req.body.by);
    count = count - by;
    history = history.concat([{ t: new Date().getTime(), op: 'dec', val: count }]);
    save();
    res.send({ count: count });
  } catch (e) {
    count = prevCount;
    history = prevHistory;
    next(e);
  }
});

app.post('/reset', function (req, res, next) {
  var prevCount = count;
  var prevHistory = history;
  try {
    var extraFields = Object.keys(req.body || {});
    if (extraFields.length > 0) {
      throw new ValidationError('UNEXPECTED_FIELD', extraFields[0], '/reset does not accept a request body', 400);
    }
    count = 0;
    history = history.concat([{ t: new Date().getTime(), op: 'reset', val: 0 }]);
    save();
    res.send({ count: count });
  } catch (e) {
    count = prevCount;
    history = prevHistory;
    next(e);
  }
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
