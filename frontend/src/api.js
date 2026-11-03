export function createApi(baseUrl) {
  async function request(path, body) {
    const options =
      body === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          };
    const res = await fetch(baseUrl + path, options);
    if (!res.ok) {
      throw new Error(`Request to ${path} failed with status ${res.status}`);
    }
    return res.json();
  }

  return {
    baseUrl,
    getCount: () => request('/count'),
    inc: (step) => request('/inc', { by: step }),
    dec: () => request('/dec', {}),
    reset: () => request('/reset', {}),
    history: () => request('/history'),
  };
}

export default createApi(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000');
