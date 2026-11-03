import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApi } from './api.js';

function okResponse(data) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) };
}

describe('createApi', () => {
  const base = 'http://example.test';
  let fetchMock;
  let api;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    api = createApi(base);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getCount GETs /count without a body', async () => {
    fetchMock.mockResolvedValue(okResponse({ count: 3 }));
    await expect(api.getCount()).resolves.toEqual({ count: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts = {}] = fetchMock.mock.calls[0];
    expect(url).toBe(base + '/count');
    expect(opts.method ?? 'GET').toBe('GET');
    expect(opts.body).toBeUndefined();
  });

  it('inc POSTs {by: step} with the step passed through raw', async () => {
    fetchMock.mockResolvedValue(okResponse({ count: 5 }));
    await expect(api.inc(5)).resolves.toEqual({ count: 5 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(base + '/inc');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(opts.body).toBe(JSON.stringify({ by: 5 }));

    await api.inc('7');
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ by: '7' }));
  });

  it('dec POSTs an empty object', async () => {
    fetchMock.mockResolvedValue(okResponse({ count: 1 }));
    await expect(api.dec()).resolves.toEqual({ count: 1 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(base + '/dec');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(opts.body).toBe('{}');
  });

  it('reset POSTs an empty object', async () => {
    fetchMock.mockResolvedValue(okResponse({ count: 0 }));
    await expect(api.reset()).resolves.toEqual({ count: 0 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(base + '/reset');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(opts.body).toBe('{}');
  });

  it('history GETs /history and returns the array', async () => {
    const rows = [{ t: 1, op: 'inc', val: 1 }];
    fetchMock.mockResolvedValue(okResponse(rows));
    await expect(api.history()).resolves.toEqual(rows);
    const [url, opts = {}] = fetchMock.mock.calls[0];
    expect(url).toBe(base + '/history');
    expect(opts.method ?? 'GET').toBe('GET');
    expect(opts.body).toBeUndefined();
  });

  it('rejects on non-2xx responses for every method', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });
    await expect(api.getCount()).rejects.toThrow();
    await expect(api.inc(1)).rejects.toThrow();
    await expect(api.dec()).rejects.toThrow();
    await expect(api.reset()).rejects.toThrow();
    await expect(api.history()).rejects.toThrow();
  });

  it('rejects when fetch itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(api.getCount()).rejects.toThrow('network');
  });
});

describe('default export', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to http://localhost:4000', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const mod = await import('./api.js');
    expect(mod.default.baseUrl).toBe('http://localhost:4000');
  });

  it('uses VITE_API_BASE_URL when set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test:9');
    vi.resetModules();
    const mod = await import('./api.js');
    expect(mod.default.baseUrl).toBe('http://api.test:9');
  });
});
