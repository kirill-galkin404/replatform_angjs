import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCount,
  increment,
  decrement,
  reset,
  getHistory,
  healthCheck,
  ApiError,
} from './counterClient';

function mockFetchOnce(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('counterClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getCount returns the parsed count on success', async () => {
    global.fetch = mockFetchOnce(200, { count: 5 });
    const result = await getCount();
    expect(result).toEqual({ count: 5 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/count'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('increment posts the step and returns the new count', async () => {
    global.fetch = mockFetchOnce(200, { count: 3 });
    const result = await increment(2);
    expect(result).toEqual({ count: 3 });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ by: 2 });
  });

  it('decrement posts the step and returns the new count', async () => {
    global.fetch = mockFetchOnce(200, { count: 1 });
    const result = await decrement(4);
    expect(result).toEqual({ count: 1 });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ by: 4 });
  });

  it('reset returns the reset count', async () => {
    global.fetch = mockFetchOnce(200, { count: 0 });
    const result = await reset();
    expect(result).toEqual({ count: 0 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reset'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('getHistory returns the list of entries', async () => {
    const entries = [{ t: 1, op: 'inc', val: 1 }];
    global.fetch = mockFetchOnce(200, entries);
    const result = await getHistory();
    expect(result).toEqual(entries);
  });

  it('healthCheck returns the status payload', async () => {
    global.fetch = mockFetchOnce(200, { status: 'ok' });
    const result = await healthCheck();
    expect(result).toEqual({ status: 'ok' });
  });

  it('surfaces a structured {error, code, field} body on a 400 response instead of discarding it', async () => {
    global.fetch = mockFetchOnce(400, {
      error: '"by" must be an integer',
      code: 'INVALID_STEP',
      field: 'by',
    });

    await expect(increment('abc')).rejects.toMatchObject({
      code: 'INVALID_STEP',
      field: 'by',
      message: '"by" must be an integer',
    });
  });

  it('surfaces a rejected fetch (network failure) instead of crashing silently', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('network reject'));

    await expect(getCount()).rejects.toBeInstanceOf(ApiError);
    await expect(getCount()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
