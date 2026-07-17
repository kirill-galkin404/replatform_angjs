var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');
var request = require('supertest');

var DB_FILE = path.join(__dirname, 'tmp-notfound-data.json');
try { fs.unlinkSync(DB_FILE); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
});

test('GET /this-route-does-not-exist returns 404 with a structured JSON body', async function () {
  var res = await request(app).get('/this-route-does-not-exist');
  assert.strictEqual(res.status, 404);
  assert.ok(res.headers['content-type'].indexOf('json') >= 0);
  assert.ok(res.body.error);
  assert.ok(res.body.code);
});
