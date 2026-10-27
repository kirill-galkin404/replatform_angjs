import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Counter } from './Counter.jsx';
import { getApiBase } from './api.js';

const BASE = 'http://localhost:4000';
let fetchMock;
let responses;

function mockFetch(initial = { count: 0 }) {
  responses = { '/count': initial };
  fetchMock = vi.fn(async (url) => {
    const path = String(url).replace(BASE, '');
    return { ok: true, json: async () => responses[path] };
  });
  vi.stubGlobal('fetch', fetchMock);
}

const callsTo = (path, method) =>
  fetchMock.mock.calls.filter(
    ([url, opts]) =>
      url === BASE + path && (!method || (opts && opts.method) === method),
  );

async function renderLoaded(initial) {
  mockFetch(initial);
  render(<Counter />);
  await waitFor(() => expect(screen.getByText(String(initial?.count ?? 0))).toBeTruthy());
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('api base URL', () => {
  it('defaults to http://localhost:4000 when unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(getApiBase()).toBe('http://localhost:4000');
  });

  it('uses VITE_API_BASE_URL when set', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://example.test:9000');
    expect(getApiBase()).toBe('http://example.test:9000');
  });

  it('sends requests to the overridden base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://example.test:9000');
    fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ count: 3 }) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Counter />);
    await waitFor(() => expect(screen.getByText('3')).toBeTruthy());
    expect(fetchMock.mock.calls[0][0]).toBe('http://example.test:9000/count');
  });
});

describe('Counter', () => {
  it('loads the initial count with GET /count on mount', async () => {
    await renderLoaded({ count: 7 });
    expect(callsTo('/count')).toHaveLength(1);
    expect(screen.getByText('7').id).toBe('big');
  });

  it('inc posts the default step 1 as JSON to /inc and shows the result', async () => {
    await renderLoaded({ count: 0 });
    responses['/inc'] = { count: 1 };
    fireEvent.click(screen.getByText('+'));
    await waitFor(() => expect(screen.getByText('1').id).toBe('big'));
    const [[, opts]] = callsTo('/inc', 'POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({ by: 1 });
  });

  it('inc posts the step input as typed', async () => {
    await renderLoaded({ count: 0 });
    responses['/inc'] = { count: 5 };
    fireEvent.change(screen.getByLabelText('step'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('+'));
    await waitFor(() => expect(screen.getByText('5').id).toBe('big'));
    const [[, opts]] = callsTo('/inc', 'POST');
    expect(JSON.parse(opts.body)).toEqual({ by: '5' });
  });

  it('dec posts an empty object to /dec regardless of step', async () => {
    await renderLoaded({ count: 3 });
    responses['/dec'] = { count: 2 };
    fireEvent.change(screen.getByLabelText('step'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('-'));
    await waitFor(() => expect(screen.getByText('2').id).toBe('big'));
    const [[, opts]] = callsTo('/dec', 'POST');
    expect(JSON.parse(opts.body)).toEqual({});
  });

  it('reset posts an empty body to /reset when confirmed', async () => {
    await renderLoaded({ count: 4 });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    responses['/reset'] = { count: 0 };
    fireEvent.click(screen.getByText('reset'));
    await waitFor(() => expect(screen.getByText('0').id).toBe('big'));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const [[, opts]] = callsTo('/reset', 'POST');
    expect(JSON.parse(opts.body)).toEqual({});
  });

  it('reset does nothing when not confirmed', async () => {
    await renderLoaded({ count: 4 });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByText('reset'));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(callsTo('/reset')).toHaveLength(0);
    expect(screen.getByText('4').id).toBe('big');
  });

  it('renders history entries after clicking show history', async () => {
    await renderLoaded({ count: 0 });
    responses['/history'] = [
      { t: 1700000000000, op: 'inc', val: 1 },
      { t: 1700000001000, op: 'dec', val: 0 },
    ];
    expect(screen.queryByText('History:')).toBeNull();
    fireEvent.click(screen.getByText('show history'));
    await waitFor(() => expect(screen.getByText(/inc -> 1$/)).toBeTruthy());
    expect(screen.getByText(/dec -> 0$/)).toBeTruthy();
    expect(screen.getByText('History:')).toBeTruthy();
    expect(callsTo('/history')).toHaveLength(1);
  });

  it('gives #big the neg class only when count is below 0', async () => {
    await renderLoaded({ count: -2 });
    const big = screen.getByText('-2');
    expect(big.id).toBe('big');
    expect(big.classList.contains('neg')).toBe(true);

    responses['/inc'] = { count: 0 };
    fireEvent.click(screen.getByText('+'));
    await waitFor(() => expect(screen.getByText('0').id).toBe('big'));
    expect(screen.getByText('0').classList.contains('neg')).toBe(false);
  });

  it('does not use neg class for a positive count', async () => {
    await renderLoaded({ count: 5 });
    expect(screen.getByText('5').classList.contains('neg')).toBe(false);
  });
});
