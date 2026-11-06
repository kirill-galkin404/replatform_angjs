import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCount, inc, dec, reset, getHistory } from './api.js';

function mockFetch(payload = {}, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({ ok, status, json: async () => payload });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('api', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('getCount GETs /count on the default base URL', async () => {
    const f = mockFetch({ count: 3 });
    expect(await getCount()).toEqual({ count: 3 });
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe('http://localhost:4000/count');
    expect(f.mock.calls[0][1].method).toBe('GET');
    expect(f.mock.calls[0][1].body).toBeUndefined();
  });

  it('getHistory GETs /history', async () => {
    const f = mockFetch([{ t: 1, op: 'inc', val: 1 }]);
    expect(await getHistory()).toEqual([{ t: 1, op: 'inc', val: 1 }]);
    expect(f.mock.calls[0][0]).toBe('http://localhost:4000/history');
    expect(f.mock.calls[0][1].method).toBe('GET');
  });

  it('inc POSTs {by: number}', async () => {
    const f = mockFetch({ count: 1 });
    await inc(1);
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('http://localhost:4000/inc');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe('{"by":1}');
  });

  it('inc POSTs the raw string step as-is', async () => {
    const f = mockFetch({ count: 5 });
    await inc('5');
    expect(f.mock.calls[0][1].body).toBe('{"by":"5"}');
  });

  it('dec POSTs an empty object to /dec', async () => {
    const f = mockFetch({ count: 0 });
    await dec();
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('http://localhost:4000/dec');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe('{}');
  });

  it('reset POSTs an empty object to /reset', async () => {
    const f = mockFetch({ count: 0 });
    await reset();
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('http://localhost:4000/reset');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe('{}');
  });

  it('throws on non-2xx responses', async () => {
    mockFetch({ error: 'INVALID_STEP' }, false, 400);
    await expect(inc('abc')).rejects.toThrow(/400/);
    await expect(getCount()).rejects.toThrow();
  });

  it('propagates network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    await expect(getCount()).rejects.toThrow('network');
  });
});
