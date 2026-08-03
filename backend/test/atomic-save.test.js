var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var request = require('supertest');

var DB_FILE = path.join(__dirname, 'tmp-atomic-save-data.json');
var TMP_FILE = DB_FILE + '.tmp';
try { fs.unlinkSync(DB_FILE); } catch (e) {}
try { fs.unlinkSync(TMP_FILE); } catch (e) {}
try { fs.rmdirSync(TMP_FILE); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
  try { fs.unlinkSync(TMP_FILE); } catch (e) {}
  try { fs.rmdirSync(TMP_FILE); } catch (e) {}
});

test('a successful mutation leaves DB_FILE holding valid JSON with no leftover .tmp file', async function () {
  var res = await request(app).post('/inc').send({ by: 4 });
  assert.strictEqual(res.status, 200);

  var raw = fs.readFileSync(DB_FILE, 'utf8');
  var parsed = JSON.parse(raw); // throws if not valid JSON
  assert.strictEqual(parsed.count, res.body.count);
  assert.strictEqual(fs.existsSync(TMP_FILE), false, 'no .tmp file should remain after a successful save');
});

test('a forced save() failure leaves DB_FILE byte-for-byte unchanged', async function () {
  var before = fs.readFileSync(DB_FILE, 'utf8');
  var beforeCount = JSON.parse(before).count;

  // Force the write-to-tempfile step of save() to fail (EISDIR) without
  // touching DB_FILE itself, by pre-creating a directory at the tmp path.
  fs.mkdirSync(TMP_FILE);
  try {
    var res = await request(app).post('/inc').send({ by: 9 });
    assert.strictEqual(res.status, 500);

    var after = fs.readFileSync(DB_FILE, 'utf8');
    assert.strictEqual(after, before, 'DB_FILE must be byte-for-byte unchanged after a failed save()');

    var countRes = await request(app).get('/count');
    assert.strictEqual(countRes.body.count, beforeCount, 'in-memory count must roll back too');
  } finally {
    fs.rmdirSync(TMP_FILE);
  }
});
