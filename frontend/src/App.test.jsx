import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

function jsonResponse(body, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App', () => {
  test('loads initial count, increments, decrements, resets, and shows history end to end', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    global.fetch.mockImplementation((url, options = {}) => {
      const method = options.method || 'GET';
      if (typeof url === 'string' && url.endsWith('/count') && method === 'GET') {
        return jsonResponse({ count: 0 });
      }
      if (typeof url === 'string' && url.endsWith('/inc') && method === 'POST') {
        return jsonResponse({ count: 5 });
      }
      if (typeof url === 'string' && url.endsWith('/dec') && method === 'POST') {
        return jsonResponse({ count: 4 });
      }
      if (typeof url === 'string' && url.endsWith('/reset') && method === 'POST') {
        return jsonResponse({ count: 0 });
      }
      if (typeof url === 'string' && url.endsWith('/history') && method === 'GET') {
        return jsonResponse([
          { t: 1700000000000, op: 'inc', val: 5 },
          { t: 1700000001000, op: 'dec', val: 4 },
        ]);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`));
    });

    render(<App />);

    // 1. Initial count loads on mount.
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());

    // 2. Increment.
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByText('+'));
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());

    // 3. Decrement.
    fireEvent.click(screen.getByText('-'));
    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());

    // 4. Reset (confirmed).
    fireEvent.click(screen.getByText('reset'));
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());
    expect(window.confirm).toHaveBeenCalledWith('sure?');

    // 5. Show history.
    fireEvent.click(screen.getByText('show history'));
    await waitFor(() => expect(screen.getByText(/inc/)).toBeInTheDocument());
    expect(screen.getByText(/dec/)).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalled();
  });
});
