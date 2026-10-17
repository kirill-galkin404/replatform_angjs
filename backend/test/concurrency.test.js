var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var request = require('supertest');

var DB_FILE = path.join(__dirname, 'tmp-concurrency-data.json');
try { fs.unlinkSync(DB_FILE); } catch (e) {}
try { fs.unlinkSync(DB_FILE + '.tmp'); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
  try { fs.unlinkSync(DB_FILE + '.tmp'); } catch (e) {}
});

// Pins the invariant that the async, promise-queue-serialised save() does
// not reintroduce a lost-update race: N simultaneous POST /inc requests
// must land as N distinct mutations, both in memory and on disk. An async
// save() without the serialising queue would let two requests read the same
// pre-mutation count and let the last write win, losing updates.
test('N simultaneous POST /inc requests all land - no lost updates, in memory or on disk', async function () {
  var N = 50;
  var requests = [];
  for (var i = 0; i < N; i++) {
    requests.push(request(app).post('/inc').send({ by: 1 }));
  }
  var responses = await Promise.all(requests);

  responses.forEach(function (res) {
    assert.strictEqual(res.status, 200);
  });

  var finalCount = await request(app).get('/count');
  assert.strictEqual(finalCount.body.count, N);

  var hist = await request(app).get('/history');
  assert.strictEqual(hist.body.length, N);

  var onDisk = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  assert.strictEqual(onDisk.count, N);
  assert.strictEqual(onDisk.history.length, N);
});
