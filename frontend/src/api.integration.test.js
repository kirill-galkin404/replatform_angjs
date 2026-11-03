// @vitest-environment node
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApi } from './api.js';

const require = createRequire(import.meta.url);

describe('createApi against the real backend', () => {
  let tmpDir;
  let server;
  let baseUrl;
  let api;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'counter-it-'));
    // backend reads DB_FILE at module load time, so set it before require
    process.env.DB_FILE = path.join(tmpDir, 'data.json');
    const app = require('../../backend/server.js');
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    api = createApi(baseUrl);
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('starts at 0', async () => {
    expect(await api.getCount()).toEqual({ count: 0 });
  });

  it('inc with step 5, dec, reset and history', async () => {
    expect(await api.inc(5)).toEqual({ count: 5 });
    expect(await api.getCount()).toEqual({ count: 5 });
    expect(await api.dec()).toEqual({ count: 4 });
    expect(await api.reset()).toEqual({ count: 0 });

    const history = await api.history();
    expect(history).toHaveLength(3);
    expect(history.map(({ op, val }) => ({ op, val }))).toEqual([
      { op: 'inc', val: 5 },
      { op: 'dec', val: 4 },
      { op: 'reset', val: 0 },
    ]);
    for (const entry of history) {
      expect(Object.keys(entry).sort()).toEqual(['op', 't', 'val']);
      expect(typeof entry.t).toBe('number');
    }
  });

  it('rejects an invalid step and leaves the count unchanged', async () => {
    await api.inc(3);
    const before = await api.getCount();
    const historyBefore = await api.history();
    await expect(api.inc('abc')).rejects.toThrow(/400/);
    expect(await api.getCount()).toEqual(before);
    expect(await api.history()).toHaveLength(historyBefore.length);
    await api.reset();
  });

  it('answers a CORS preflight on /inc with the middleware headers', async () => {
    const res = await fetch(`${baseUrl}/inc`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-headers')).toBe('Content-Type');
    expect(res.headers.get('access-control-allow-methods')).toBe('GET,POST,OPTIONS');
  });
});
