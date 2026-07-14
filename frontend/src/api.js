// Fetch-based API client for the counter backend.
// VITE_API_URL is provided via .env (see .env.example for the local default).
const API_BASE = import.meta.env.VITE_API_URL;

async function request(path, options) {
  const res = await fetch(API_BASE + path, options);
  return res.json();
}

export function getCount() {
  return request('/count');
}

export function postInc(by) {
  return request('/inc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ by }),
  });
}

export function postDec(by) {
  return request('/dec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ by }),
  });
}

export function postReset() {
  return request('/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export function getHistory() {
  return request('/history');
}
