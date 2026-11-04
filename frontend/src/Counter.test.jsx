import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Counter from './Counter.jsx';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

function callsTo(fetchMock, path) {
  return fetchMock.mock.calls.filter(([url]) => url.endsWith(path));
}

describe('Counter', () => {
  let fetchMock;

  beforeEach(() => {
    delete window.API_BASE_URL;
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('initial load: GET /count and shows the count', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 7 }));
    render(<Counter />);
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/count');
    expect(opts).toBeUndefined();
    expect(document.getElementById('big')).toHaveTextContent('7');
  });

  it('defaults: count 0, step 1, controls in the original order', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 0 }));
    const { container } = render(<Counter />);
    expect(document.getElementById('big')).toHaveTextContent('0');
    expect(screen.getByRole('textbox')).toHaveValue('1');
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const labels = Array.from(container.querySelectorAll('button, input')).map((el) =>
      el.tagName === 'INPUT' ? 'input' : el.textContent
    );
    expect(labels).toEqual(['-', 'input', '+', 'reset', 'show history']);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('inc posts the user-entered step as by and shows the new count', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0 }));
    render(<Counter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5');
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 5 }));
    await user.click(screen.getByRole('button', { name: '+' }));

    await waitFor(() => expect(document.getElementById('big')).toHaveTextContent('5'));
    const [call] = callsTo(fetchMock, '/inc');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ by: '5' });
  });

  it('dec posts an empty body and shows the new count', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 3 }));
    render(<Counter />);
    await screen.findByText('3');

    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 2 }));
    await user.click(screen.getByRole('button', { name: '-' }));

    await screen.findByText('2');
    const [call] = callsTo(fetchMock, '/dec');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({});
  });

  it('reset confirm: confirm stubbed true posts /reset and shows 0', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 9 }));
    render(<Counter />);
    await screen.findByText('9');

    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0 }));
    await user.click(screen.getByRole('button', { name: 'reset' }));

    await screen.findByText('0');
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const [call] = callsTo(fetchMock, '/reset');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({});
  });

  it('reset cancel: confirm false makes no /reset call and keeps the count', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 9 }));
    render(<Counter />);
    await screen.findByText('9');

    await user.click(screen.getByRole('button', { name: 'reset' }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(callsTo(fetchMock, '/reset')).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.getElementById('big')).toHaveTextContent('9');
  });

  it('neg class applied when count below zero and absent at zero or above', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0 }));
    render(<Counter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const big = document.getElementById('big');
    expect(big).not.toHaveClass('neg');

    fetchMock.mockResolvedValueOnce(jsonResponse({ count: -1 }));
    await user.click(screen.getByRole('button', { name: '-' }));
    await waitFor(() => expect(big).toHaveTextContent('-1'));
    expect(big).toHaveClass('neg');

    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0 }));
    await user.click(screen.getByRole('button', { name: '+' }));
    await waitFor(() => expect(big).toHaveTextContent(/^0$/));
    expect(big).not.toHaveClass('neg');

    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 4 }));
    await user.click(screen.getByRole('button', { name: '+' }));
    await waitFor(() => expect(big).toHaveTextContent('4'));
    expect(big).not.toHaveClass('neg');
  });

  it('error: backend 400 message is shown in the alert region and cleared on success', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 1 }));
    render(<Counter />);
    await screen.findByText('1');

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "'by' must be an integer" }, 400));
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("'by' must be an integer");
    expect(document.getElementById('big')).toHaveTextContent('1');

    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 2 }));
    await user.click(screen.getByRole('button', { name: '-' }));
    await screen.findByText('2');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('error: network failure on load shows a message in the alert region', async () => {
    fetchMock.mockRejectedValue(new TypeError('failed to fetch'));
    render(<Counter />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i);
    expect(document.getElementById('big')).toHaveTextContent('0');
  });

  describe('history', () => {
    async function loadHistory(entries) {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0 }));
      render(<Counter />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      fetchMock.mockResolvedValueOnce(jsonResponse(entries));
      await user.click(screen.getByRole('button', { name: 'show history' }));
      await waitFor(() => expect(callsTo(fetchMock, '/history')).toHaveLength(1));
    }

    it('history rendering: entries as li with time - op -> val', async () => {
      const t1 = 1700000000000;
      const t2 = 1700000060000;
      await loadHistory([
        { t: t1, op: 'inc', val: 1 },
        { t: t2, op: 'dec', val: 0 },
      ]);
      const items = await screen.findAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0].textContent).toBe(`${new Date(t1).toLocaleTimeString()} - inc -> 1`);
      expect(items[1].textContent).toBe(`${new Date(t2).toLocaleTimeString()} - dec -> 0`);
      expect(document.getElementById('hist')).toHaveTextContent('History:');
      expect(document.querySelector('#hist ul')).not.toBeNull();
    });

    it('history escaping: markup in op rendered as text, no element created', async () => {
      const evil = '<img src=x onerror=alert(1)><b>bold</b>';
      await loadHistory([{ t: 1700000000000, op: evil, val: 3 }]);
      const item = await screen.findByRole('listitem');
      expect(item.textContent).toContain(evil);
      expect(item.querySelector('img')).toBeNull();
      expect(item.querySelector('b')).toBeNull();
      expect(document.querySelector('#hist ul img')).toBeNull();
    });

    it('history error: backend failure shows message in the alert region', async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0 }));
      render(<Counter />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'history unavailable' }, 400));
      await user.click(screen.getByRole('button', { name: 'show history' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('history unavailable');
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });
  });
});
