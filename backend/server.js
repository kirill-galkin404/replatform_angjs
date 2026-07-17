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

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify({ count: count, history: history }));
}

app.get('/count', function (req, res) {
  res.send({ count: count });
});

app.post('/inc', function (req, res, next) {
  try {
    var by = validateStep(req.body.by);
    count = count + by;
    history.push({ t: new Date().getTime(), op: 'inc', val: count });
    save();
    res.send({ count: count });
  } catch (e) {
    next(e);
  }
});

app.post('/dec', function (req, res, next) {
  try {
    var by = validateStep(req.body.by);
    count = count - by;
    history.push({ t: new Date().getTime(), op: 'dec', val: count });
    save();
    res.send({ count: count });
  } catch (e) {
    next(e);
  }
});

app.post('/reset', function (req, res, next) {
  try {
    var extraFields = Object.keys(req.body || {});
    if (extraFields.length > 0) {
      throw new ValidationError('UNEXPECTED_FIELD', extraFields[0], '/reset does not accept a request body', 400);
    }
    count = 0;
    history.push({ t: new Date().getTime(), op: 'reset', val: 0 });
    save();
    res.send({ count: count });
  } catch (e) {
    next(e);
  }
});

app.get('/history', function (req, res) {
  res.send(history);
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
  app.listen(4000, function () {
    console.log('counter backend running on 4000');
  });
}

module.exports = app;
