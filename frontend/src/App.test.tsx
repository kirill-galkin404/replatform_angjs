import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function jsonResponse(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('App', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.test');
  });

  it('loads the count on mount', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(jsonResponse({ count: 7 })));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('7'));
  });

  it('increments by the step field when + is clicked', async () => {
    var fetchMock = vi
      .fn()
      .mockReturnValueOnce(jsonResponse({ count: 0 }))
      .mockReturnValueOnce(jsonResponse({ count: 3 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));

    fireEvent.click(screen.getByText('+'));

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('3'));
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://api.example.test/inc',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ by: 1 }) })
    );
  });

  it('decrements when - is clicked', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(jsonResponse({ count: 5 }))
        .mockReturnValueOnce(jsonResponse({ count: 4 }))
    );
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('5'));

    fireEvent.click(screen.getByText('-'));

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('4'));
  });

  it('reset is gated on confirm() and does nothing when the user cancels', async () => {
    var fetchMock = vi.fn().mockReturnValueOnce(jsonResponse({ count: 9 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('9'));

    fireEvent.click(screen.getByText('reset'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reset calls POST /reset and updates the count when confirmed', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(jsonResponse({ count: 9 }))
        .mockReturnValueOnce(jsonResponse({ count: 0 }))
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('9'));

    fireEvent.click(screen.getByText('reset'));

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
  });

  it('renders history as templated list items (not raw innerHTML) after "show history"', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(jsonResponse({ count: 1 }))
        .mockReturnValueOnce(jsonResponse([{ t: 1710000000000, op: 'inc', val: 1 }]))
    );
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('show history'));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(screen.getByRole('listitem').textContent).toContain('inc');
  });
});
