import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App.jsx';

const json = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

let count;
let fetchMock;

beforeEach(() => {
  count = 5;
  fetchMock = vi.fn((url, options = {}) => {
    if (url.endsWith('/count')) return json({ count });
    if (url.endsWith('/inc')) {
      count += JSON.parse(options.body).by;
      return json({ count });
    }
    if (url.endsWith('/history')) {
      return json([{ t: 1700000000000, op: 'inc', val: count }]);
    }
    return Promise.reject(new Error(`unexpected ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('loads the count, increments it and shows history', async () => {
  const user = userEvent.setup();
  const { container } = render(<App />);

  expect(await screen.findByText('5')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '+' }));
  expect(await screen.findByText('6')).toBeInTheDocument();
  expect(container.querySelector('#big')).toHaveTextContent('6');

  await user.click(screen.getByRole('button', { name: 'show history' }));
  expect(await screen.findByText('History:')).toBeInTheDocument();
  expect(container.querySelector('#hist li')).toHaveTextContent('inc -> 6');
});
