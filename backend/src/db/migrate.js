'use strict';

// Creates the counter_state / counter_history tables if they don't already
// exist. Safe to call on every boot (CREATE TABLE IF NOT EXISTS), so it does
// not error against an already-migrated database.
function migrate(db) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS counter_state (' +
      'id INTEGER PRIMARY KEY CHECK (id = 1), ' +
      'value INTEGER NOT NULL' +
      ');'
  );

  db.exec(
    'CREATE TABLE IF NOT EXISTS counter_history (' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
      'timestamp INTEGER NOT NULL, ' +
      'op TEXT NOT NULL, ' +
      'delta INTEGER, ' +
      'resulting_value INTEGER NOT NULL' +
      ');'
  );
}

module.exports = migrate;
