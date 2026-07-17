var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var request = require('supertest');

var DB_FILE = path.join(__dirname, 'tmp-reset-data.json');
try { fs.unlinkSync(DB_FILE); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
});

test('POST /inc then POST /reset returns 200 with {count:0} and appends a reset history entry', async function () {
  await request(app).post('/inc').send({ by: 5 });

  var res = await request(app).post('/reset').send({});
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.count, 0);

  var hist = await request(app).get('/history');
  var last = hist.body[hist.body.length - 1];
  assert.strictEqual(last.op, 'reset');
  assert.strictEqual(last.val, 0);
});

test('POST /reset with an unexpected body field returns 400 with structured error envelope', async function () {
  var res = await request(app).post('/reset').send({ foo: 1 });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error);
  assert.ok(res.body.code);
});

test('the old /rese path no longer exists and is handled by the 404 handler', async function () {
  var res = await request(app).post('/rese').send({});
  assert.strictEqual(res.status, 404);
  assert.ok(res.body.error);
  assert.ok(res.body.code);
});
