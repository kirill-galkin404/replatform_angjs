import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import Counter from './Counter';

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

describe('Counter', () => {
  test('increment sends POST /inc with {by: step} and updates the displayed count', async () => {
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ count: 0 })) // initial GET /count
      .mockImplementationOnce(() => jsonResponse({ count: 5 })); // POST /inc

    render(<Counter />);

    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '5' } });

    fireEvent.click(screen.getByText('+'));

    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [url, options] = global.fetch.mock.calls[1];
    expect(url).toMatch(/\/inc$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ by: 5 });
  });

  test('decrement sends POST /dec with an empty body and updates the displayed count', async () => {
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ count: 3 })) // initial GET /count
      .mockImplementationOnce(() => jsonResponse({ count: 2 })); // POST /dec

    render(<Counter />);

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '99' } });

    fireEvent.click(screen.getByText('-'));

    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [url, options] = global.fetch.mock.calls[1];
    expect(url).toMatch(/\/dec$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({});
  });

  test('reset confirmed sends POST /reset and updates the displayed count', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    global.fetch
      .mockImplementationOnce(() => jsonResponse({ count: 7 })) // initial GET /count
      .mockImplementationOnce(() => jsonResponse({ count: 0 })); // POST /reset

    render(<Counter />);

    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument());

    fireEvent.click(screen.getByText('reset'));

    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());

    expect(window.confirm).toHaveBeenCalledWith('sure?');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [url, options] = global.fetch.mock.calls[1];
    expect(url).toMatch(/\/reset$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({});
  });

  test('reset cancelled sends no request and leaves the count unchanged', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    global.fetch.mockImplementationOnce(() => jsonResponse({ count: 7 })); // initial GET /count

    render(<Counter />);

    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument());

    fireEvent.click(screen.getByText('reset'));

    expect(window.confirm).toHaveBeenCalledWith('sure?');
    // No additional fetch call beyond the initial mount GET /count.
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  test('fetch failure surfaces a visible error message and does not corrupt the count', async () => {
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ count: 4 })) // initial GET /count
      .mockImplementationOnce(() => Promise.reject(new Error('network down'))); // POST /inc fails

    render(<Counter />);

    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());

    fireEvent.click(screen.getByText('+'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed/i);

    // count must not have silently changed to something wrong
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
