var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var request = require('supertest');

var DB_FILE = path.join(__dirname, 'tmp-history-contract-data.json');
try { fs.unlinkSync(DB_FILE); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
});

test('GET /history returns an array whose entries each have {t:number, op:string, val:number} - the shape the frontend reads', async function () {
  await request(app).post('/inc').send({ by: 3 });
  await request(app).post('/dec').send({ by: 1 });
  await request(app).post('/reset').send({});

  var res = await request(app).get('/history');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 3);

  res.body.forEach(function (entry) {
    assert.strictEqual(typeof entry.t, 'number');
    assert.strictEqual(typeof entry.op, 'string');
    assert.strictEqual(typeof entry.val, 'number');
  });

  var ops = res.body.slice(-3).map(function (e) { return e.op; });
  assert.deepStrictEqual(ops, ['inc', 'dec', 'reset']);
});
