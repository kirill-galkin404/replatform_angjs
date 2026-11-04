import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCount, inc, dec, reset, getHistory } from './api.js';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

describe('api', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    delete window.API_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.API_BASE_URL;
  });

  it('getCount GETs /count on the default base URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 5 }));
    await expect(getCount()).resolves.toEqual({ count: 5 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/count');
    expect(opts?.method ?? 'GET').toBe('GET');
  });

  it('honours window.API_BASE_URL at call time', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 1 }));
    window.API_BASE_URL = 'http://api.example:9000';
    await getCount();
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.example:9000/count');
    window.API_BASE_URL = 'http://other:1';
    await getCount();
    expect(fetchMock.mock.calls[1][0]).toBe('http://other:1/count');
  });

  it('inc posts { by: step } as JSON with Content-Type header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 4 }));
    await expect(inc(3)).resolves.toEqual({ count: 4 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/inc');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({ by: 3 });
  });

  it('inc passes the step through raw without validating', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 0 }));
    await inc(-2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ by: -2 });
    await inc(null);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ by: null });
  });

  it('dec posts {} as JSON with Content-Type header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: -1 }));
    await expect(dec()).resolves.toEqual({ count: -1 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/dec');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({});
  });

  it('reset posts {} as JSON with Content-Type header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 0 }));
    await expect(reset()).resolves.toEqual({ count: 0 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/reset');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({});
  });

  it('getHistory GETs /history', async () => {
    const hist = [{ t: 1, op: 'inc', val: 1 }];
    fetchMock.mockResolvedValue(jsonResponse(hist));
    await expect(getHistory()).resolves.toEqual(hist);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/history');
  });

  it('rejects non-2xx with the backend error message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'by must be an integer', code: 'INVALID_STEP', field: 'by' }, 400)
    );
    await expect(inc(1.5)).rejects.toThrow('by must be an integer');
  });

  it('rejects non-2xx with a generic message when the body has no error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new SyntaxError('bad json')),
    });
    await expect(getCount()).rejects.toThrow('Request failed');
  });

  it('rejects network failures with a generic message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getCount()).rejects.toThrow('Network error: could not reach the server');
    await expect(reset()).rejects.toThrow('Network error: could not reach the server');
  });
});
