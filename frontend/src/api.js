// Single fetch layer over the fixed REST contract (GET /count, POST /inc,
// POST /dec, POST /reset, GET /history). Non-2xx responses reject with the
// server's structured {error, code, field?} envelope instead of being
// swallowed. Client-side never re-implements validateStep's rules; it only
// renders whatever the server returns.

function getApiBase() {
  if (typeof window !== 'undefined' && window.API_BASE_URL) {
    return window.API_BASE_URL;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return 'http://localhost:4000';
}

async function request(path, options) {
  var res = await fetch(getApiBase() + path, options);
  var data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

export function getCount() {
  return request('/count');
}

export function inc(by) {
  return request('/inc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ by: by })
  });
}

export function dec() {
  return request('/dec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
}

export function reset() {
  return request('/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
}

export function getHistory() {
  return request('/history');
}
