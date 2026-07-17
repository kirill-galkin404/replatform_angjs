var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var request = require('supertest');

var DB_FILE = path.join(__dirname, 'tmp-malformed-json-data.json');
try { fs.unlinkSync(DB_FILE); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
});

test('malformed JSON body on POST /inc is reported as a 4xx client error, not a 500', async function () {
  var res = await request(app)
    .post('/inc')
    .set('Content-Type', 'application/json')
    .send('{"by": not-valid-json');
  assert.ok(res.status >= 400 && res.status < 500, 'expected a 4xx status, got ' + res.status);
  assert.ok(res.body.error);
  assert.ok(res.body.code);
});
