'use strict';

var fs = require('fs');
var Database = require('better-sqlite3');
var CounterRepository = require('./counterRepository');
var migrate = require('../db/migrate');

// Async, transactional replacement for the old fs.writeFileSync-per-request
// store. better-sqlite3 itself is synchronous-per-call, but every mutation is
// wrapped in a db.transaction(...) here, and CounterService additionally
// serializes calls through a promise-chain queue so two concurrent requests
// can never interleave a read-modify-write.
class SqliteCounterRepository extends CounterRepository {
  constructor(options) {
    super();
    this.dbFile = options.dbFile;
    this.legacyDataFile = options.legacyDataFile;
    this.db = null;
  }

  async init() {
    this.db = new Database(this.dbFile);
    this.db.pragma('journal_mode = WAL');
    migrate(this.db);
    this._ensureSeeded();
  }

  _ensureSeeded() {
    var row = this.db.prepare('SELECT value FROM counter_state WHERE id = 1').get();
    if (row) {
      return;
    }

    var imported = this._importLegacyData();
    if (!imported) {
      this.db.prepare('INSERT INTO counter_state (id, value) VALUES (1, 0)').run();
    }
  }

  // Imports the legacy backend/data.json blob ({count, history:[{t,op,val}]})
  // on first boot, then renames it to data.json.migrated so it is neither
  // silently discarded nor re-imported on the next boot.
  _importLegacyData() {
    if (!this.legacyDataFile || !fs.existsSync(this.legacyDataFile)) {
      return false;
    }

    var parsed;
    try {
      var raw = fs.readFileSync(this.legacyDataFile, 'utf8');
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse legacy data file ' + this.legacyDataFile + ', ignoring it', e);
      return false;
    }

    if (!parsed || typeof parsed !== 'object') {
      console.error(
        'Legacy data file ' + this.legacyDataFile + ' did not contain a JSON object, ignoring it'
      );
      return false;
    }

    var count = typeof parsed.count === 'number' && !isNaN(parsed.count) ? parsed.count : 0;
    var rawHistory = Array.isArray(parsed.history) ? parsed.history : [];

    // Only accept well-shaped entries - the history/state columns are
    // NOT NULL, so anything malformed here must be dropped rather than fed
    // into the insert (which would otherwise throw and abort the whole
    // import, leaving data.json un-renamed and re-attempted on every boot).
    var history = rawHistory.filter(function (entry) {
      return (
        entry &&
        typeof entry.t === 'number' &&
        typeof entry.op === 'string' &&
        typeof entry.val === 'number'
      );
    });

    if (history.length !== rawHistory.length) {
      console.warn(
        'Skipped ' +
          (rawHistory.length - history.length) +
          ' malformed history entry/entries in ' +
          this.legacyDataFile
      );
    }

    var insertState = this.db.prepare('INSERT INTO counter_state (id, value) VALUES (1, ?)');
    var insertHistory = this.db.prepare(
      'INSERT INTO counter_history (timestamp, op, delta, resulting_value) VALUES (?, ?, ?, ?)'
    );

    var importAll = this.db.transaction(function () {
      insertState.run(count);
      for (var i = 0; i < history.length; i++) {
        var entry = history[i];
        insertHistory.run(entry.t, entry.op, null, entry.val);
      }
    });
    importAll();

    var migratedPath = this.legacyDataFile + '.migrated';
    fs.renameSync(this.legacyDataFile, migratedPath);
    console.log(
      'Imported ' + history.length + ' history row(s) from ' + this.legacyDataFile + ' -> ' + migratedPath
    );

    return true;
  }

  async getState() {
    var row = this.db.prepare('SELECT value FROM counter_state WHERE id = 1').get();
    return { count: row.value };
  }

  async applyMutation(op, delta) {
    var db = this.db;

    var mutate = db.transaction(function () {
      var row = db.prepare('SELECT value FROM counter_state WHERE id = 1').get();
      var current = row.value;
      var next;
      var storedDelta;

      if (op === 'inc') {
        storedDelta = delta;
        next = current + storedDelta;
      } else if (op === 'dec') {
        storedDelta = -1;
        next = current - 1;
      } else if (op === 'reset') {
        storedDelta = null;
        next = 0;
      } else {
        throw new Error('Unknown op: ' + op);
      }

      db.prepare('UPDATE counter_state SET value = ? WHERE id = 1').run(next);
      db.prepare(
        'INSERT INTO counter_history (timestamp, op, delta, resulting_value) VALUES (?, ?, ?, ?)'
      ).run(Date.now(), op, storedDelta, next);

      return next;
    });

    var next = mutate();
    return { count: next };
  }

  async getHistory() {
    var rows = this.db
      .prepare('SELECT timestamp, op, resulting_value FROM counter_history ORDER BY id ASC')
      .all();
    return rows.map(function (r) {
      return { t: r.timestamp, op: r.op, val: r.resulting_value };
    });
  }
}

module.exports = SqliteCounterRepository;
