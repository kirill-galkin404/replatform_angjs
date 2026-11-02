// API client for the counter backend. Plain ESM: runs in the browser and in Node.

export function getBaseUrl() {
  if (typeof window !== 'undefined' && window.API_BASE_URL) {
    return window.API_BASE_URL;
  }
  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  return 'http://localhost:4000';
}

async function request(path, method, body) {
  const options = { method };
  if (method === 'POST') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(getBaseUrl() + path, options);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = undefined;
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Request failed with status ' + res.status);
    err.status = res.status;
    err.code = data && data.code;
    err.body = data;
    throw err;
  }
  return data;
}

export function getCount() {
  return request('/count', 'GET');
}

export function inc(step) {
  return request('/inc', 'POST', { by: step });
}

export function dec() {
  return request('/dec', 'POST', {});
}

export function reset() {
  return request('/reset', 'POST', {});
}

export function getHistory() {
  return request('/history', 'GET');
}
