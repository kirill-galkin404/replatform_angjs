var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');

var DB_FILE = path.join(__dirname, 'tmp-datastore-data.json');
try { fs.unlinkSync(DB_FILE); } catch (e) {}
process.env.DB_FILE = DB_FILE;
var app = require('../server');
var loadState = app.loadState;

test.after(function () {
  try { fs.unlinkSync(DB_FILE); } catch (e) {}
});

test('loadState() on a missing file returns the clean-boot default (ENOENT is not corruption)', function () {
  var missing = path.join(__dirname, 'tmp-datastore-does-not-exist.json');
  var state = loadState(missing);
  assert.deepStrictEqual(state, { count: 0, history: [] });
});

test('loadState() throws on a zero-byte file instead of silently returning the default', function () {
  var f = path.join(__dirname, 'tmp-datastore-zero-byte.json');
  fs.writeFileSync(f, '');
  try {
    assert.throws(function () {
      loadState(f);
    }, /invalid JSON/);
  } finally {
    fs.unlinkSync(f);
  }
});

test('loadState() throws on truncated JSON', function () {
  var f = path.join(__dirname, 'tmp-datastore-truncated.json');
  fs.writeFileSync(f, '{"count":5,');
  try {
    assert.throws(function () {
      loadState(f);
    }, /invalid JSON/);
  } finally {
    fs.unlinkSync(f);
  }
});

test('loadState() throws on well-formed JSON with the wrong shape (count as a string)', function () {
  var f = path.join(__dirname, 'tmp-datastore-wrong-shape.json');
  fs.writeFileSync(f, JSON.stringify({ count: '5', history: [] }));
  try {
    assert.throws(function () {
      loadState(f);
    }, /non-numeric "count"/);
  } finally {
    fs.unlinkSync(f);
  }
});

test('loadState() throws when the "history" key is missing', function () {
  var f = path.join(__dirname, 'tmp-datastore-missing-history.json');
  fs.writeFileSync(f, JSON.stringify({ count: 5 }));
  try {
    assert.throws(function () {
      loadState(f);
    }, /non-array "history"/);
  } finally {
    fs.unlinkSync(f);
  }
});

test('loadState() throws when the parsed JSON is not an object (e.g. a bare array)', function () {
  var f = path.join(__dirname, 'tmp-datastore-not-object.json');
  fs.writeFileSync(f, JSON.stringify([1, 2, 3]));
  try {
    assert.throws(function () {
      loadState(f);
    }, /does not contain a JSON object/);
  } finally {
    fs.unlinkSync(f);
  }
});

test('boot removes a stale .tmp file left by an interrupted previous write, and loads the last good DB_FILE', function () {
  var bootDbFile = path.join(__dirname, 'tmp-datastore-boot-data.json');
  var bootTmpFile = bootDbFile + '.tmp';

  fs.writeFileSync(bootDbFile, JSON.stringify({ count: 7, history: [{ t: 1, op: 'inc', val: 7 }] }));
  fs.writeFileSync(bootTmpFile, 'this is stale half-written garbage from a previous crash');
  assert.ok(fs.existsSync(bootTmpFile));

  delete require.cache[require.resolve('../server')];
  var previousDbFile = process.env.DB_FILE;
  process.env.DB_FILE = bootDbFile;
  try {
    var bootedApp = require('../server');
    assert.strictEqual(fs.existsSync(bootTmpFile), false, 'stale .tmp must be removed by boot');
    var onDisk = JSON.parse(fs.readFileSync(bootDbFile, 'utf8'));
    assert.strictEqual(onDisk.count, 7, 'DB_FILE itself must be untouched - boot loads from it, not the stale tmp');
    assert.ok(bootedApp.loadState, 'module should still export loadState after a fresh require');
  } finally {
    delete require.cache[require.resolve('../server')];
    process.env.DB_FILE = previousDbFile;
    require('../server');
    fs.unlinkSync(bootDbFile);
  }
});
