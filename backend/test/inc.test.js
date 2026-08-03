var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var request = require('supertest');

var DB_FILE = path.join(__dirname, 'tmp-inc-data.json');
try { fs.unlinkSync(DB_FILE); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
});

test('POST /inc with {"by":2} increments count by 2 and appends history', async function () {
  var before = await request(app).get('/count');
  var res = await request(app).post('/inc').send({ by: 2 });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.count, before.body.count + 2);

  var hist = await request(app).get('/history');
  var last = hist.body[hist.body.length - 1];
  assert.strictEqual(last.op, 'inc');
  assert.strictEqual(last.val, res.body.count);
});

test('POST /inc with {"by":"not-a-number"} returns 400 and does not corrupt persisted count', async function () {
  var before = await request(app).get('/count');

  var res = await request(app).post('/inc').send({ by: 'not-a-number' });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error);
  assert.ok(res.body.code);
  assert.ok(res.body.field);

  var after = await request(app).get('/count');
  assert.strictEqual(after.body.count, before.body.count);
  assert.notStrictEqual(after.body.count, NaN);
  assert.ok(!isNaN(after.body.count));

  var raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  assert.ok(!isNaN(raw.count));
  assert.strictEqual(raw.count, before.body.count);
});

test('N concurrent POST /inc requests against a fresh DB_FILE all land, with no lost updates', async function () {
  var CONCURRENT_DB_FILE = path.join(__dirname, 'tmp-inc-concurrent-data.json');
  try { fs.unlinkSync(CONCURRENT_DB_FILE); } catch (e) {}
  process.env.DB_FILE = CONCURRENT_DB_FILE;
  delete require.cache[require.resolve('../server')];
  var concurrentApp = require('../server');

  var N = 20;
  try {
    var requests = [];
    for (var i = 0; i < N; i++) {
      requests.push(request(concurrentApp).post('/inc').send({ by: 1 }));
    }
    var results = await Promise.all(requests);
    results.forEach(function (res) {
      assert.strictEqual(res.status, 200);
    });

    var countRes = await request(concurrentApp).get('/count');
    assert.strictEqual(countRes.body.count, N);

    var histRes = await request(concurrentApp).get('/history');
    assert.strictEqual(histRes.body.length, N);

    var raw = JSON.parse(fs.readFileSync(CONCURRENT_DB_FILE, 'utf8'));
    assert.strictEqual(raw.count, N);
    assert.strictEqual(raw.history.length, N);
  } finally {
    process.env.DB_FILE = DB_FILE;
    delete require.cache[require.resolve('../server')];
    try { fs.unlinkSync(CONCURRENT_DB_FILE); } catch (e) {}
  }
});
