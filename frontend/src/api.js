export function getApiBase() {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
}

async function request(path, options) {
  const res = await fetch(getApiBase() + path, options);
  if (!res.ok) throw new Error(`Request to ${path} failed with status ${res.status}`);
  return res.json();
}

export function getCount() {
  return request('/count');
}

function post(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function inc(by) {
  return post('/inc', { by });
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
