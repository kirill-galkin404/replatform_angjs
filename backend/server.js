// counter backend - do not touch, it works
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var crypto = require('crypto');
var fs = require('fs');
var app = express();

process.on('uncaughtException', function (err) {
  console.error('uncaughtException:', err);
  process.exit(1);
});

process.on('unhandledRejection', function (reason) {
  console.error('unhandledRejection:', reason);
  process.exit(1);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// global state, whatever
var DB_FILE = './data.json';
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

// CORS: origin allowlist driven by CORS_ALLOWED_ORIGINS (comma-separated list).
// If unset, no origins are allowed (cors() defaults to reflecting no origin).
var allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(function (origin) { return origin.trim(); })
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }
}));

// Env-gated X-API-Key auth on mutation routes only. Defaults OFF so the
// current AngularJS frontend (which sends no custom headers) keeps working.
// Do not set REQUIRE_API_KEY=true in any environment shared with that
// frontend until the React/Vite re-platform adds the X-API-Key header
// to its outgoing calls (see README.md).
var requireApiKey = process.env.REQUIRE_API_KEY === 'true';
if (requireApiKey) {
  console.log('REQUIRE_API_KEY is enabled: mutation routes require a valid X-API-Key header');
  if (!process.env.API_KEY) {
    console.error('REQUIRE_API_KEY is true but API_KEY is not set: all mutation requests will be rejected, please set key');
  }
} else {
  console.log('REQUIRE_API_KEY is disabled (default): mutation routes are not authenticated');
}

function requireApiKeyMiddleware(req, res, next) {
  if (!requireApiKey) {
    return next();
  }
  var provided = req.header('X-API-Key') || '';
  var expected = process.env.API_KEY || '';
  var providedBuf = Buffer.from(provided);
  var expectedBuf = Buffer.from(expected);
  var valid = !!process.env.API_KEY &&
    providedBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(providedBuf, expectedBuf);
  if (!valid) {
    return res.status(401).send({ error: 'unauthorized' });
  }
  next();
}

// Mutation routes only accept JSON bodies. This forces cross-origin callers
// to send a Content-Type that triggers a CORS preflight (blocked by the
// origin allowlist above) instead of being able to reach these routes as a
// "simple" (non-preflighted) request, e.g. a cross-site HTML form post with
// Content-Type: application/x-www-form-urlencoded or text/plain.
function requireJsonContentType(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(400).send({ error: 'Content-Type must be application/json' });
  }
  next();
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify({ count: count, history: history }));
}

app.get('/count', function (req, res) {
  console.log('GET /count');
  res.send({ count: count });
});

app.post('/inc', requireJsonContentType, requireApiKeyMiddleware, function (req, res) {
  console.log('POST /inc', { by: req.body.by });
  var by = req.body.by;
  if (by == undefined) {
    by = 1;
  }
  count = count + parseInt(by);
  history.push({ t: new Date().getTime(), op: 'inc', val: count });
  save();
  res.send({ count: count });
});

app.post('/dec', requireJsonContentType, requireApiKeyMiddleware, function (req, res) {
  console.log('POST /dec');
  count = count - 1;
  history.push({ t: new Date().getTime(), op: 'dec', val: count });
  save();
  res.send({ count: count });
});

app.post('/reset', requireJsonContentType, requireApiKeyMiddleware, function (req, res) {
  console.log('POST /reset');
  count = 0;
  history.push({ t: new Date().getTime(), op: 'reset', val: 0 });
  save();
  res.send({ count: count });
});

app.get('/history', function (req, res) {
  console.log('GET /history');
  res.send(history);
});

app.listen(4000, function () {
  console.log('counter backend running on 4000');
});
