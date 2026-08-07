// Shared REST client for the counter backend.
// Wraps GET /count, POST /inc, POST /dec, POST /reset, GET /history and
// normalizes every non-2xx response's {error, code, field?} envelope (plus
// its HTTP status) into a single rejected shape so the UI has one thing to
// render regardless of which endpoint failed.

const API_BASE_URL = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:4000';

async function parseResponse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok) {
    return body;
  }

  const error = new Error((body && body.error) || 'Request failed');
  error.status = res.status;
  error.code = (body && body.code) || 'UNKNOWN_ERROR';
  if (body && body.field) {
    error.field = body.field;
  }
  throw error;
}

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  return parseResponse(res);
}

function postJson(path, payload) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getCount() {
  return request('/count', { method: 'GET' });
}

export function inc(by) {
  return postJson('/inc', by === undefined ? {} : { by });
}

export function dec(by) {
  return postJson('/dec', by === undefined ? {} : { by });
}

export function reset() {
  return postJson('/reset', {});
}

export function getHistory() {
  return request('/history', { method: 'GET' });
}
