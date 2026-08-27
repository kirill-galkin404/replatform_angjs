// Fetch-based client for the Counter REST API.
//
// All six endpoints are wrapped here. On a non-2xx response the backend's
// structured `{error, code, field?}` body is parsed and thrown as an
// ApiError instead of being discarded, so callers can surface it in the UI.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(message, code, field) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.field = field;
  }
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(BASE_URL + path, options);
  } catch (err) {
    throw new ApiError('Network request failed', 'NETWORK_ERROR');
  }

  let body = null;
  try {
    body = await response.json();
  } catch (err) {
    body = null;
  }

  if (!response.ok) {
    const message = (body && body.error) || 'Request failed';
    const code = (body && body.code) || 'UNKNOWN_ERROR';
    const field = body && body.field;
    throw new ApiError(message, code, field);
  }

  return body;
}

export async function getCount() {
  return request('/count', { method: 'GET' });
}

export async function increment(by) {
  return request('/inc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(by === undefined ? {} : { by }),
  });
}

export async function decrement(by) {
  return request('/dec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(by === undefined ? {} : { by }),
  });
}

export async function reset() {
  return request('/reset', { method: 'POST' });
}

export async function getHistory() {
  return request('/history', { method: 'GET' });
}

export async function healthCheck() {
  return request('/healthz', { method: 'GET' });
}
