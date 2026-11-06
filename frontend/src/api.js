import { API_BASE } from './config.js';

async function request(path, body) {
  const options = body === undefined
    ? { method: 'GET' }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      };
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

export const getCount = () => request('/count');
export const inc = (step) => request('/inc', { by: step });
export const dec = () => request('/dec', {});
export const reset = () => request('/reset', {});
export const getHistory = () => request('/history');
