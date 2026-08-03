var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var request = require('supertest');

// point DB_FILE at a directory that does not exist so save() (fs.writeFileSync)
// throws, exercising the centralised error middleware's non-ValidationError path.
var DB_FILE = path.join(__dirname, 'no-such-dir', 'data.json');
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test('a save()/fs failure is translated into a structured 5xx JSON response, not a crash or stack trace', async function () {
  var res = await request(app).post('/inc').send({ by: 1 });
  assert.strictEqual(res.status, 500);
  assert.ok(res.body.error);
  assert.ok(res.body.code);
  var text = JSON.stringify(res.body);
  assert.ok(text.indexOf('.js:') === -1, 'response must not leak a stack trace');
  assert.ok(text.indexOf('at ') === -1, 'response must not leak a stack trace');
});

test('a save() failure does not leave in-memory count diverged from disk: GET /count is unchanged afterwards', async function () {
  var before = await request(app).get('/count');
  var failed = await request(app).post('/inc').send({ by: 7 });
  assert.strictEqual(failed.status, 500);

  var after = await request(app).get('/count');
  assert.strictEqual(after.body.count, before.body.count, 'in-memory count must roll back when save() throws');
});
