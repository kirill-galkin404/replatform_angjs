'use strict';

/**
 * CounterRepository defines the persistence contract used by CounterService.
 * Implementations must provide:
 *
 *   async init()
 *     Open/create the underlying store and ensure the schema is migrated.
 *     Must resolve before any other method is called.
 *
 *   async getState()
 *     Returns the current counter state: { count: number }.
 *
 *   async applyMutation(op, delta)
 *     Atomically applies one of 'inc' | 'dec' | 'reset' to the counter,
 *     appends a history entry, and returns the resulting state:
 *     { count: number }.
 *       - op === 'inc'   -> new value = current value + delta
 *       - op === 'dec'   -> new value = current value - 1 (delta ignored)
 *       - op === 'reset' -> new value = 0 (delta ignored)
 *
 *   async getHistory()
 *     Returns the full history as an array of { t, op, val }, ordered
 *     oldest first, matching the shape the frontend has always consumed.
 */
class CounterRepository {
  async init() {
    throw new Error('init() not implemented');
  }

  async getState() {
    throw new Error('getState() not implemented');
  }

  async applyMutation(op, delta) {
    throw new Error('applyMutation() not implemented');
  }

  async getHistory() {
    throw new Error('getHistory() not implemented');
  }
}

module.exports = CounterRepository;
