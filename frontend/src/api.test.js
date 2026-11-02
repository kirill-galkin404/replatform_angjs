import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCount, inc, dec, reset, getHistory } from './api.js';

function mockFetch(body, init = {}) {
  const fn = vi.fn(async () => ({
    ok: init.ok !== false,
    status: init.status || 200,
    json: async () => body,
  }));
  globalThis.fetch = fn;
  return fn;
}

describe('api', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    delete window.API_BASE_URL;
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete window.API_BASE_URL;
    vi.unstubAllEnvs();
  });

  it('getCount GETs /count and resolves the parsed JSON', async () => {
    const f = mockFetch({ count: 3 });
    expect(await getCount()).toEqual({ count: 3 });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('http://localhost:4000/count');
    expect(opts.method).toBe('GET');
    expect(opts.body).toBeUndefined();
  });

  it('getHistory GETs /history', async () => {
    const list = [{ t: 1, op: 'inc', val: 1 }];
    const f = mockFetch(list);
    expect(await getHistory()).toEqual(list);
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('http://localhost:4000/history');
    expect(opts.method).toBe('GET');
  });

  it('inc POSTs the raw step as typed', async () => {
    const f = mockFetch({ count: 5 });
    expect(await inc('5')).toEqual({ count: 5 });
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('http://localhost:4000/inc');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe('{"by":"5"}');
  });

  it('inc keeps numeric steps numeric and does not trim strings', async () => {
    const f = mockFetch({ count: 1 });
    await inc(2);
    expect(f.mock.calls[0][1].body).toBe('{"by":2}');
    await inc(' 7 ');
    expect(f.mock.calls[1][1].body).toBe('{"by":" 7 "}');
  });

  it('dec POSTs an empty object', async () => {
    const f = mockFetch({ count: -1 });
    expect(await dec()).toEqual({ count: -1 });
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('http://localhost:4000/dec');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe('{}');
  });

  it('reset POSTs an empty object', async () => {
    const f = mockFetch({ count: 0 });
    expect(await reset()).toEqual({ count: 0 });
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('http://localhost:4000/reset');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe('{}');
  });

  it('rejects on non-2xx responses with status and code', async () => {
    mockFetch({ error: 'bad', code: 'INVALID_STEP', field: 'by' }, { ok: false, status: 400 });
    await expect(inc('abc')).rejects.toMatchObject({ status: 400, code: 'INVALID_STEP', message: 'bad' });
    await expect(getCount()).rejects.toThrow();
  });

  it('rejects on non-2xx even when the body is not JSON', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('no json');
      },
    }));
    await expect(reset()).rejects.toMatchObject({ status: 500 });
  });

  it('base URL: window.API_BASE_URL wins over env and default', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://env.example');
    window.API_BASE_URL = 'http://win.example';
    const f = mockFetch({ count: 0 });
    await getCount();
    expect(f.mock.calls[0][0]).toBe('http://win.example/count');
  });

  it('base URL: env is used when window value is absent', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://env.example');
    const f = mockFetch({ count: 0 });
    await getCount();
    expect(f.mock.calls[0][0]).toBe('http://env.example/count');
  });

  it('base URL is resolved on every call', async () => {
    const f = mockFetch({ count: 0 });
    await getCount();
    window.API_BASE_URL = 'http://later.example';
    await getCount();
    delete window.API_BASE_URL;
    vi.stubEnv('VITE_API_BASE_URL', 'http://env2.example');
    await getCount();
    expect(f.mock.calls.map((c) => c[0])).toEqual([
      'http://localhost:4000/count',
      'http://later.example/count',
      'http://env2.example/count',
    ]);
  });
});
