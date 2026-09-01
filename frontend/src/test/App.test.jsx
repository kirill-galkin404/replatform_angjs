import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App.jsx';

function mockFetchSequence(responses) {
  var calls = 0;
  global.fetch = vi.fn().mockImplementation(() => {
    var response = responses[calls];
    calls += 1;
    return Promise.resolve({
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: () => Promise.resolve(response.body)
    });
  });
}

describe('App', () => {
  beforeEach(() => {
    delete window.API_BASE_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the count fetched on mount', async () => {
    mockFetchSequence([{ status: 200, body: { count: 7 } }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument());
    expect(screen.getByText('7')).not.toHaveClass('neg');
  });

  it('applies the "neg" class when count is negative', async () => {
    mockFetchSequence([{ status: 200, body: { count: -3 } }]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('-3')).toBeInTheDocument());
    expect(screen.getByText('-3')).toHaveClass('neg');
  });

  it('clicking + calls fetch with the exact expected method/URL/body for /inc', async () => {
    mockFetchSequence([
      { status: 200, body: { count: 0 } },
      { status: 200, body: { count: 1 } }
    ]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());

    fireEvent.click(screen.getByText('+'));

    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
    var call = fetch.mock.calls[1];
    expect(call[0]).toBe('http://localhost:4000/inc');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ by: 1 });
  });

  it('clicking - calls fetch with the exact expected method/URL/body for /dec', async () => {
    mockFetchSequence([
      { status: 200, body: { count: 0 } },
      { status: 200, body: { count: -1 } }
    ]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());

    fireEvent.click(screen.getByText('-'));

    await waitFor(() => expect(screen.getByText('-1')).toBeInTheDocument());
    var call = fetch.mock.calls[1];
    expect(call[0]).toBe('http://localhost:4000/dec');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({});
  });

  it('Reset does not call fetch again when window.confirm is mocked false', async () => {
    mockFetchSequence([{ status: 200, body: { count: 5 } }]);
    window.confirm = vi.fn().mockReturnValue(false);
    render(<App />);
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());

    fireEvent.click(screen.getByText('reset'));

    expect(window.confirm).toHaveBeenCalledWith('sure?');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('Reset calls fetch only when window.confirm is mocked true', async () => {
    mockFetchSequence([
      { status: 200, body: { count: 5 } },
      { status: 200, body: { count: 0 } }
    ]);
    window.confirm = vi.fn().mockReturnValue(true);
    render(<App />);
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());

    fireEvent.click(screen.getByText('reset'));

    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());
    expect(window.confirm).toHaveBeenCalledWith('sure?');
    var call = fetch.mock.calls[1];
    expect(call[0]).toBe('http://localhost:4000/reset');
    expect(call[1].method).toBe('POST');
    expect(Object.keys(JSON.parse(call[1].body))).toHaveLength(0);
  });

  it('renders fetched history entries as list items', async () => {
    mockFetchSequence([
      { status: 200, body: { count: 0 } },
      { status: 200, body: [
        { t: 1700000000000, op: 'inc', val: 1 },
        { t: 1700000001000, op: 'dec', val: 0 }
      ] }
    ]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());

    fireEvent.click(screen.getByText('show history'));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
  });

  it('renders the server error inline when a history fetch fails', async () => {
    mockFetchSequence([
      { status: 200, body: { count: 0 } },
      { status: 500, body: { error: 'Internal Server Error', code: 'INTERNAL_ERROR' } }
    ]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());

    fireEvent.click(screen.getByText('show history'));

    await waitFor(() => expect(screen.getByText('Internal Server Error')).toBeInTheDocument());
  });

  it('renders the server error inline when a call fails', async () => {
    mockFetchSequence([
      { status: 200, body: { count: 0 } },
      { status: 400, body: { error: '"by" must be a finite integer', code: 'INVALID_STEP', field: 'by' } }
    ]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument());

    fireEvent.click(screen.getByText('+'));

    await waitFor(() => expect(screen.getByText(/must be a finite integer/)).toBeInTheDocument());
  });
});
