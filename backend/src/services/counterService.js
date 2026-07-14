'use strict';

// Owns the increment/decrement/reset/history business logic that used to be
// inlined in the route handlers. Mutations are serialized through a
// promise-chain queue so that concurrent /inc, /dec, /reset requests are
// applied one at a time against the repository, in addition to each
// individual mutation being wrapped in a DB transaction.
class CounterService {
  constructor(repository) {
    this.repository = repository;
    this.queue = Promise.resolve();
  }

  async init() {
    await this.repository.init();
  }

  _enqueue(op) {
    var result = this.queue.then(op);
    // Never let a rejected mutation wedge the queue for subsequent callers;
    // the rejection itself still propagates to whoever awaits `result`.
    this.queue = result.then(
      function () {},
      function () {}
    );
    return result;
  }

  async getCount() {
    var state = await this.repository.getState();
    return state.count;
  }

  increment(by) {
    var delta = by === undefined || by === null ? 1 : parseInt(by, 10);
    if (isNaN(delta)) {
      var err = new Error('`by` must be a number');
      err.status = 400;
      return Promise.reject(err);
    }
    var repository = this.repository;
    return this._enqueue(function () {
      return repository.applyMutation('inc', delta);
    }).then(function (state) {
      return state.count;
    });
  }

  decrement() {
    var repository = this.repository;
    return this._enqueue(function () {
      return repository.applyMutation('dec', -1);
    }).then(function (state) {
      return state.count;
    });
  }

  reset() {
    var repository = this.repository;
    return this._enqueue(function () {
      return repository.applyMutation('reset', null);
    }).then(function (state) {
      return state.count;
    });
  }

  async getHistory() {
    return this.repository.getHistory();
  }
}

module.exports = CounterService;
