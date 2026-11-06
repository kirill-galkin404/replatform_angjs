import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { API_BASE } from './config.js';

const ok = (data) => ({ ok: true, status: 200, json: async () => data });

let fetchMock;

// route table: "METHOD /path" -> response (or function returning one)
function mockServer(routes) {
  fetchMock = vi.fn(async (url, options = {}) => {
    const key = `${options.method || 'GET'} ${String(url).replace(API_BASE, '')}`;
    if (!(key in routes)) throw new Error(`unexpected request ${key}`);
    return routes[key];
  });
  vi.stubGlobal('fetch', fetchMock);
}

const callsTo = (method, path) =>
  fetchMock.mock.calls.filter(
    ([url, o = {}]) => url === `${API_BASE}${path}` && (o.method || 'GET') === method,
  );

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('initial load', () => {
  it('GETs /count on mount and shows it', async () => {
    mockServer({ 'GET /count': ok({ count: 7 }) });
    render(<App />);
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(callsTo('GET', '/count')).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('starts with the step input at 1', async () => {
    mockServer({ 'GET /count': ok({ count: 0 }) });
    render(<App />);
    expect(screen.getByLabelText('step')).toHaveValue('1');
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});

describe('adjust', () => {
  it('POSTs /inc with the numeric step 1 on the first click', async () => {
    mockServer({ 'GET /count': ok({ count: 0 }), 'POST /inc': ok({ count: 1 }) });
    render(<App />);
    await waitFor(() => expect(callsTo('GET', '/count')).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    expect(await screen.findByText('1')).toBeInTheDocument();
    const [[, options]] = callsTo('POST', '/inc');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.body).toBe('{"by":1}');
    expect(JSON.parse(options.body)).toEqual({ by: 1 });
  });

  it('POSTs /inc with the raw string after the step is edited', async () => {
    mockServer({ 'GET /count': ok({ count: 0 }), 'POST /inc': ok({ count: 5 }) });
    render(<App />);
    const input = screen.getByLabelText('step');
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    expect(await screen.findByText('5', { selector: '#big' })).toBeInTheDocument();
    const [[, options]] = callsTo('POST', '/inc');
    expect(JSON.parse(options.body)).toEqual({ by: '5' });
  });

  it('POSTs /dec with {} (ignoring step) and shows the server count', async () => {
    mockServer({ 'GET /count': ok({ count: 3 }), 'POST /dec': ok({ count: 2 }) });
    render(<App />);
    await screen.findByText('3');
    const input = screen.getByLabelText('step');
    await userEvent.clear(input);
    await userEvent.type(input, '9');
    await userEvent.click(screen.getByRole('button', { name: '-' }));
    expect(await screen.findByText('2')).toBeInTheDocument();
    const [[, options]] = callsTo('POST', '/dec');
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{}');
  });

  it('adds the neg class to #big only when count < 0', async () => {
    mockServer({
      'GET /count': ok({ count: 0 }),
      'POST /dec': ok({ count: -1 }),
      'POST /inc': ok({ count: 0 }),
    });
    const { container } = render(<App />);
    const big = container.querySelector('#big');
    await waitFor(() => expect(callsTo('GET', '/count')).toHaveLength(1));
    expect(big).not.toHaveClass('neg');
    await userEvent.click(screen.getByRole('button', { name: '-' }));
    await waitFor(() => expect(big).toHaveTextContent('-1'));
    expect(big).toHaveClass('neg');
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    await waitFor(() => expect(big).toHaveTextContent(/^0$/));
    expect(big).not.toHaveClass('neg');
  });
});

describe('reset', () => {
  it('sends no request and keeps the count when confirm is cancelled', async () => {
    mockServer({ 'GET /count': ok({ count: 4 }) });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    await screen.findByText('4');
    await userEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(confirmSpy).toHaveBeenCalledWith('sure?');
    expect(callsTo('POST', '/reset')).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('POSTs /reset with {} and shows the response count when confirmed', async () => {
    mockServer({ 'GET /count': ok({ count: 4 }), 'POST /reset': ok({ count: 0 }) });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container } = render(<App />);
    await screen.findByText('4');
    await userEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(confirmSpy).toHaveBeenCalledWith('sure?');
    await waitFor(() => expect(container.querySelector('#big')).toHaveTextContent(/^0$/));
    const [[, options]] = callsTo('POST', '/reset');
    expect(options.body).toBe('{}');
  });
});

describe('history', () => {
  it('GETs /history and renders heading plus entries as list items', async () => {
    const entries = [
      { t: 1700000000000, op: 'inc', val: 1 },
      { t: 1700000060000, op: 'dec', val: 0 },
    ];
    mockServer({ 'GET /count': ok({ count: 0 }), 'GET /history': ok(entries) });
    const { container } = render(<App />);
    expect(container.querySelector('#hist')).toBeEmptyDOMElement();
    await userEvent.click(screen.getByRole('button', { name: 'show history' }));
    const heading = await screen.findByText('History:');
    expect(heading.tagName).toBe('B');
    expect(callsTo('GET', '/history')).toHaveLength(1);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    entries.forEach((e, i) => {
      expect(items[i]).toHaveTextContent(
        `${new Date(e.t).toLocaleTimeString()} - ${e.op} -> ${e.val}`,
      );
    });
  });
});

describe('failures', () => {
  it('leaves the count unchanged and logs console.error on a non-2xx response', async () => {
    mockServer({
      'GET /count': ok({ count: 3 }),
      'POST /inc': { ok: false, status: 500, json: async () => ({ error: 'boom' }) },
    });
    const { container } = render(<App />);
    await screen.findByText('3');
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(container.querySelector('#big')).toHaveTextContent(/^3$/);
  });
});
