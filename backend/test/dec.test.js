var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var request = require('supertest');

var DB_FILE = path.join(__dirname, 'tmp-dec-data.json');
try { fs.unlinkSync(DB_FILE); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
});

test('POST /dec with {"by":3} decreases count by 3 and appends history with op dec', async function () {
  var before = await request(app).get('/count');
  var res = await request(app).post('/dec').send({ by: 3 });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.count, before.body.count - 3);

  var hist = await request(app).get('/history');
  var last = hist.body[hist.body.length - 1];
  assert.strictEqual(last.op, 'dec');
  assert.strictEqual(last.val, res.body.count);
});

test('POST /dec with an empty body still decreases count by exactly 1', async function () {
  var before = await request(app).get('/count');
  var res = await request(app).post('/dec').send({});
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.count, before.body.count - 1);
});

test('POST /dec with {"by":"x"} returns 400 and does not mutate count', async function () {
  var before = await request(app).get('/count');
  var res = await request(app).post('/dec').send({ by: 'x' });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error);
  assert.ok(res.body.code);

  var after = await request(app).get('/count');
  assert.strictEqual(after.body.count, before.body.count);
});
