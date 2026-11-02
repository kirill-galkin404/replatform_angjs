// Live parity check: starts the real backend and drives frontend/src/api.js against it.
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..', '..', 'backend');
const apiUrl = pathToFileURL(path.resolve(here, '..', 'src', 'api.js')).href;
const ORIGIN = 'http://localhost:5173';

let child = null;
let tmpDir = null;

function killChild() {
  if (child && child.exitCode === null && !child.killed) {
    try { child.kill('SIGKILL'); } catch (e) { /* already gone */ }
  }
}
function cleanTmp() {
  if (tmpDir) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    tmpDir = null;
  }
}
process.on('exit', () => { killChild(); cleanTmp(); });
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { killChild(); cleanTmp(); process.exit(130); });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady(base, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('backend exited early with code ' + child.exitCode);
    try {
      const res = await fetch(base + '/healthz');
      if (res.ok) return;
    } catch (e) { /* not up yet */ }
    await sleep(100);
  }
  throw new Error('backend did not become ready within ' + timeoutMs + 'ms');
}

async function main() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-'));
  const port = await freePort();
  const base = 'http://127.0.0.1:' + port;

  child = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(port), DB_FILE: path.join(tmpDir, 'db.json') },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  child.on('error', (e) => { console.error('failed to spawn backend:', e.message); });
  await waitReady(base, 15000);

  // CORS preflight
  const pre = await fetch(base + '/inc', {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.ok(pre.status >= 200 && pre.status < 300, 'preflight status ' + pre.status);
  const allowOrigin = pre.headers.get('access-control-allow-origin');
  assert.ok(allowOrigin === '*' || allowOrigin === ORIGIN,
    'CORS: access-control-allow-origin was ' + JSON.stringify(allowOrigin));
  const allowHeaders = (pre.headers.get('access-control-allow-headers') || '').toLowerCase();
  assert.ok(allowHeaders.split(',').map((s) => s.trim()).includes('content-type'),
    'CORS: Content-Type not in access-control-allow-headers: ' + JSON.stringify(allowHeaders));
  const allowMethods = (pre.headers.get('access-control-allow-methods') || '').toUpperCase();
  assert.ok(allowMethods.includes('POST'), 'CORS: POST not allowed: ' + allowMethods);
  console.log('ok  CORS preflight from ' + ORIGIN);

  // api.js resolves its base URL per call from window.API_BASE_URL
  globalThis.window = { API_BASE_URL: base };
  const api = await import(apiUrl);

  assert.deepEqual(await api.getCount(), { count: 0 });
  console.log('ok  count starts at 0');

  assert.deepEqual(await api.inc('3'), { count: 3 });
  console.log("ok  inc('3') -> 3");

  assert.deepEqual(await api.dec(), { count: 2 }); // dec ignores step, default 1
  console.log('ok  dec -> 2 (default step 1)');

  assert.deepEqual(await api.getCount(), { count: 2 });

  assert.deepEqual(await api.reset(), { count: 0 });
  assert.deepEqual(await api.getCount(), { count: 0 });
  console.log('ok  reset -> 0');

  const history = await api.getHistory();
  assert.ok(Array.isArray(history), 'history is an array');
  assert.deepEqual(history.map((h) => h.op), ['inc', 'dec', 'reset']);
  assert.deepEqual(history.map((h) => h.val), [3, 2, 0]);
  for (const h of history) {
    assert.equal(typeof h.t, 'number', 'history entry has numeric t');
  }
  console.log('ok  history lists inc, dec, reset in order');
}

try {
  await main();
  console.log('PARITY CHECK PASSED');
  process.exitCode = 0;
} catch (e) {
  console.error('PARITY CHECK FAILED: ' + (e && e.message ? e.message : e));
  process.exitCode = 1;
} finally {
  killChild();
  cleanTmp();
}
