import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCount, inc, dec, reset, getHistory } from './api.js';

function mockFetchOnce(status, body) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status: status,
    json: () => Promise.resolve(body)
  });
}

describe('api.js', () => {
  beforeEach(() => {
    delete window.API_BASE_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getCount() resolves with parsed JSON on a 2xx response', async () => {
    mockFetchOnce(200, { count: 5 });
    var data = await getCount();
    expect(data).toEqual({ count: 5 });
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/count', undefined);
  });

  it('inc(by) POSTs {by} exactly', async () => {
    mockFetchOnce(200, { count: 3 });
    await inc(3);
    expect(fetch).toHaveBeenCalledTimes(1);
    var call = fetch.mock.calls[0];
    expect(call[0]).toBe('http://localhost:4000/inc');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ by: 3 });
  });

  it('dec() POSTs with zero body fields', async () => {
    mockFetchOnce(200, { count: -1 });
    await dec();
    var call = fetch.mock.calls[0];
    expect(call[0]).toBe('http://localhost:4000/dec');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({});
  });

  it('reset() never includes a body key', async () => {
    mockFetchOnce(200, { count: 0 });
    await reset();
    var call = fetch.mock.calls[0];
    expect(call[0]).toBe('http://localhost:4000/reset');
    expect(call[1].method).toBe('POST');
    expect(Object.keys(JSON.parse(call[1].body))).toHaveLength(0);
  });

  it('getHistory() resolves with the parsed history array', async () => {
    mockFetchOnce(200, [{ t: 1, op: 'inc', val: 1 }]);
    var data = await getHistory();
    expect(data).toEqual([{ t: 1, op: 'inc', val: 1 }]);
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/history', undefined);
  });

  it('rejects with the server error envelope instead of being swallowed', async () => {
    mockFetchOnce(400, { error: '"by" must be a finite integer', code: 'INVALID_STEP', field: 'by' });
    await expect(inc('nope')).rejects.toEqual({
      error: '"by" must be a finite integer',
      code: 'INVALID_STEP',
      field: 'by'
    });
  });

  it('uses window.API_BASE_URL when set', async () => {
    window.API_BASE_URL = 'https://example.test';
    mockFetchOnce(200, { count: 0 });
    await getCount();
    expect(fetch).toHaveBeenCalledWith('https://example.test/count', undefined);
  });
});
