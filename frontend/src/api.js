const DEFAULT_BASE_URL = 'http://localhost:4000';
const NETWORK_ERROR = 'Network error: could not reach the server';
const REQUEST_ERROR = 'Request failed';

function baseUrl() {
  return window.API_BASE_URL || DEFAULT_BASE_URL;
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(baseUrl() + path, options);
  } catch (e) {
    throw new Error(NETWORK_ERROR);
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = undefined;
  }

  if (!res.ok) {
    const message =
      data && typeof data.error === 'string' && data.error ? data.error : REQUEST_ERROR;
    throw new Error(message);
  }
  if (data === undefined) {
    throw new Error(REQUEST_ERROR);
  }
  return data;
}

function post(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getCount() {
  return request('/count');
}

export function inc(step) {
  return post('/inc', { by: step });
}

export function dec() {
  return post('/dec', {});
}

export function reset() {
  return post('/reset', {});
}

export function getHistory() {
  return request('/history');
}
