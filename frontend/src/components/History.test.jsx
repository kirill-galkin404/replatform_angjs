import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import History from './History';
import api from '../api';

vi.mock('../api', () => ({ default: { history: vi.fn() } }));

const fmt = (e) => `${new Date(e.t).toLocaleTimeString()} - ${e.op} -> ${e.val}`;

describe('History', () => {
  beforeEach(() => {
    api.history.mockReset();
  });

  it('does not fetch or render anything before click', () => {
    const { container } = render(<History />);
    expect(api.history).not.toHaveBeenCalled();
    expect(container.querySelector('#hist')).toBeEmptyDOMElement();
  });

  it('renders heading and empty list for empty history', async () => {
    api.history.mockResolvedValue([]);
    const { container } = render(<History />);
    await userEvent.click(screen.getByRole('button', { name: 'show history' }));
    await waitFor(() => expect(container.querySelector('#hist b')).toHaveTextContent('History:'));
    expect(container.querySelectorAll('#hist ul li')).toHaveLength(0);
  });

  it('renders one li per entry in time - op -> val format', async () => {
    const data = [
      { t: 1700000000000, op: 'inc', val: 1 },
      { t: 1700000005000, op: 'dec', val: 0 },
    ];
    api.history.mockResolvedValue(data);
    const { container } = render(<History />);
    await userEvent.click(screen.getByText('show history'));
    await waitFor(() => expect(container.querySelectorAll('#hist ul li')).toHaveLength(2));
    const items = container.querySelectorAll('#hist ul li');
    expect(items[0].textContent).toBe(fmt(data[0]));
    expect(items[1].textContent).toBe(fmt(data[1]));
  });

  it('renders markup in op as text', async () => {
    api.history.mockResolvedValue([{ t: 1700000000000, op: '<b>x</b>', val: 3 }]);
    const { container } = render(<History />);
    await userEvent.click(screen.getByText('show history'));
    await waitFor(() => expect(container.querySelectorAll('#hist li')).toHaveLength(1));
    const li = container.querySelector('#hist li');
    expect(li.querySelector('b')).toBeNull();
    expect(li.textContent).toContain('<b>x</b>');
    expect(container.querySelectorAll('#hist b')).toHaveLength(1);
  });

  it('refetches and replaces the list on each click', async () => {
    api.history.mockResolvedValueOnce([{ t: 1, op: 'inc', val: 1 }]);
    api.history.mockResolvedValueOnce([
      { t: 2, op: 'dec', val: 0 },
      { t: 3, op: 'reset', val: 0 },
    ]);
    const { container } = render(<History />);
    const button = screen.getByText('show history');
    await userEvent.click(button);
    await waitFor(() => expect(container.querySelectorAll('#hist li')).toHaveLength(1));
    await userEvent.click(button);
    await waitFor(() => expect(container.querySelectorAll('#hist li')).toHaveLength(2));
    expect(api.history).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll('#hist b')).toHaveLength(1);
  });

  it('keeps what is shown when a request fails', async () => {
    api.history.mockResolvedValueOnce([{ t: 1, op: 'inc', val: 1 }]);
    api.history.mockRejectedValueOnce(new Error('boom'));
    const { container } = render(<History />);
    const button = screen.getByText('show history');
    await userEvent.click(button);
    await waitFor(() => expect(container.querySelectorAll('#hist li')).toHaveLength(1));
    await userEvent.click(button);
    await waitFor(() => expect(api.history).toHaveBeenCalledTimes(2));
    expect(container.querySelectorAll('#hist li')).toHaveLength(1);
  });
});
