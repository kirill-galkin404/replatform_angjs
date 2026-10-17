var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var request = require('supertest');

// point DB_FILE at a directory that does not exist so save() (fs.promises.writeFile
// of DB_FILE + '.tmp') rejects, exercising the centralised error middleware's
// non-ValidationError path.
var DB_DIR = path.join(__dirname, 'no-such-dir');
var DB_FILE = path.join(DB_DIR, 'data.json');
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.rmSync(DB_DIR, { recursive: true, force: true }); } catch (e) {}
});

test('a save()/fs failure is translated into a structured 5xx JSON response, not a crash or stack trace', async function () {
  var res = await request(app).post('/inc').send({ by: 1 });
  assert.strictEqual(res.status, 500);
  assert.ok(res.body.error);
  assert.ok(res.body.code);
  var text = JSON.stringify(res.body);
  assert.ok(text.indexOf('.js:') === -1, 'response must not leak a stack trace');
  assert.ok(text.indexOf('at ') === -1, 'response must not leak a stack trace');
});

test('a save() failure does not poison the mutation queue - a later request still succeeds once the failure clears', async function () {
  // The previous test already forced one failed /inc while DB_DIR did not
  // exist; in-memory count was still bumped to 1 even though the save
  // rejected (mutate-before-persist, matching the pre-existing behaviour).
  // Creating the directory now lets save() succeed for the next mutation -
  // if the queue's rejected tail were not re-seeded, this request would hang
  // or fail forever instead of returning normally.
  fs.mkdirSync(DB_DIR, { recursive: true });

  var res = await request(app).post('/inc').send({ by: 1 });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.count, 2);

  var onDisk = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  assert.strictEqual(onDisk.count, 2);
});
