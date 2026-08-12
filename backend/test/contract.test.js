// Executable OpenAPI contract harness.
//
// Loads backend/contract/openapi.yaml and validates that live supertest
// responses from the running app (the same require('../server') target as
// every other test file) actually match the locked response schemas, plus
// the wildcard-CORS/OPTIONS short-circuit the manual CORS middleware
// produces. This proves the spec faithful against whatever is currently
// exported by ../server (unmodified JS in Phase 1, compiled TS from
// Phase 2 onward).
var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var yaml = require('js-yaml');
var Ajv = require('ajv');
var request = require('supertest');

var DB_FILE = path.join(__dirname, 'tmp-contract-data.json');
try { fs.unlinkSync(DB_FILE); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
});

var spec = yaml.load(
  fs.readFileSync(path.join(__dirname, '..', 'contract', 'openapi.yaml'), 'utf8')
);

var ajv = new Ajv({ strict: false });
Object.keys(spec.components.schemas).forEach(function (name) {
  ajv.addSchema(spec.components.schemas[name], '#/components/schemas/' + name);
});

function schemaFor(name) {
  var validate = ajv.getSchema('#/components/schemas/' + name);
  assert.ok(validate, 'schema ' + name + ' must exist in the OpenAPI spec');
  return validate;
}

function assertMatchesSchema(name, data) {
  var validate = schemaFor(name);
  var ok = validate(data);
  assert.ok(
    ok,
    'response did not match schema ' + name + ': ' + JSON.stringify(validate.errors)
  );
}

test('GET /count matches the CountResponse schema', async function () {
  var res = await request(app).get('/count');
  assert.strictEqual(res.status, 200);
  assertMatchesSchema('CountResponse', res.body);
});

test('POST /inc with a valid body matches the CountResponse schema', async function () {
  var res = await request(app).post('/inc').send({ by: 2 });
  assert.strictEqual(res.status, 200);
  assertMatchesSchema('CountResponse', res.body);
});

test('POST /inc with an invalid body matches the ErrorResponse schema', async function () {
  var res = await request(app).post('/inc').send({ by: 'nope' });
  assert.strictEqual(res.status, 400);
  assertMatchesSchema('ErrorResponse', res.body);
});

test('POST /dec with a valid body matches the CountResponse schema', async function () {
  var res = await request(app).post('/dec').send({ by: 1 });
  assert.strictEqual(res.status, 200);
  assertMatchesSchema('CountResponse', res.body);
});

test('POST /reset matches the CountResponse schema and resets to 0', async function () {
  var res = await request(app).post('/reset').send({});
  assert.strictEqual(res.status, 200);
  assertMatchesSchema('CountResponse', res.body);
  assert.strictEqual(res.body.count, 0);
});

test('POST /reset with an unexpected field matches the ErrorResponse schema', async function () {
  var res = await request(app).post('/reset').send({ foo: 1 });
  assert.strictEqual(res.status, 400);
  assertMatchesSchema('ErrorResponse', res.body);
});

test('GET /history matches the HistoryResponse schema', async function () {
  var res = await request(app).get('/history');
  assert.strictEqual(res.status, 200);
  assertMatchesSchema('HistoryResponse', res.body);
});

test('GET /healthz matches the HealthzResponse schema', async function () {
  var res = await request(app).get('/healthz');
  assert.strictEqual(res.status, 200);
  assertMatchesSchema('HealthzResponse', res.body);
});

test('GET /this-route-does-not-exist matches the NotFoundResponse schema', async function () {
  var res = await request(app).get('/this-route-does-not-exist');
  assert.strictEqual(res.status, 404);
  assertMatchesSchema('NotFoundResponse', res.body);
});

['/count', '/inc', '/dec', '/reset', '/history', '/healthz'].forEach(function (route) {
  test('OPTIONS ' + route + ' short-circuits with wildcard CORS headers and an OK 200', async function () {
    var res = await request(app).options(route);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], '*');
    assert.strictEqual(res.headers['access-control-allow-headers'], 'Content-Type');
    assert.strictEqual(res.headers['access-control-allow-methods'], 'GET,POST,OPTIONS');
    // res.send(200) is Express's deprecated "send status" form: it sends the
    // status's reason phrase ("OK") as a plain-text body, not an empty one.
    assert.strictEqual(res.text, 'OK');
  });
});

test('every 2xx JSON response also carries the wildcard CORS header', async function () {
  var res = await request(app).get('/count');
  assert.strictEqual(res.headers['access-control-allow-origin'], '*');
});
