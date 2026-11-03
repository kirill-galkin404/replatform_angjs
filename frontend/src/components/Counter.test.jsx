import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Counter from './Counter';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    getCount: vi.fn(),
    inc: vi.fn(),
    dec: vi.fn(),
    reset: vi.fn(),
    history: vi.fn(),
  },
}));

const big = () => document.getElementById('big');

describe('Counter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getCount.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the count on mount', async () => {
    api.getCount.mockResolvedValue({ count: 7 });
    render(<Counter />);
    await waitFor(() => expect(big()).toHaveTextContent('7'));
    expect(api.getCount).toHaveBeenCalledTimes(1);
  });

  it('starts at 0 with step input 1', () => {
    api.getCount.mockReturnValue(new Promise(() => {}));
    render(<Counter />);
    expect(big()).toHaveTextContent('0');
    expect(screen.getByRole('textbox')).toHaveValue('1');
  });

  it('inc sends the default numeric step 1', async () => {
    api.inc.mockResolvedValue({ count: 1 });
    render(<Counter />);
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    expect(api.inc).toHaveBeenCalledWith(1);
    await waitFor(() => expect(big()).toHaveTextContent('1'));
  });

  it('inc sends the typed step as a raw string', async () => {
    api.inc.mockResolvedValue({ count: 5 });
    render(<Counter />);
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    expect(api.inc).toHaveBeenCalledWith('5');
    await waitFor(() => expect(big()).toHaveTextContent('5'));
  });

  it('dec sends no step even when step is changed', async () => {
    api.dec.mockResolvedValue({ count: -1 });
    render(<Counter />);
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    await userEvent.click(screen.getByRole('button', { name: '-' }));
    expect(api.dec).toHaveBeenCalledTimes(1);
    expect(api.dec.mock.calls[0]).toEqual([]);
    await waitFor(() => expect(big()).toHaveTextContent('-1'));
  });

  it('reset calls the api when confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.getCount.mockResolvedValue({ count: 9 });
    api.reset.mockResolvedValue({ count: 0 });
    render(<Counter />);
    await waitFor(() => expect(big()).toHaveTextContent('9'));
    await userEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(confirm).toHaveBeenCalledWith('sure?');
    expect(api.reset).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(big()).toHaveTextContent('0'));
  });

  it('reset sends nothing when not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    api.getCount.mockResolvedValue({ count: 9 });
    render(<Counter />);
    await waitFor(() => expect(big()).toHaveTextContent('9'));
    await userEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(api.reset).not.toHaveBeenCalled();
    expect(big()).toHaveTextContent('9');
  });

  it('has class neg only when count < 0', async () => {
    api.dec.mockResolvedValue({ count: -1 });
    api.inc.mockResolvedValue({ count: 0 });
    render(<Counter />);
    expect(big()).not.toHaveClass('neg');
    await userEvent.click(screen.getByRole('button', { name: '-' }));
    await waitFor(() => expect(big()).toHaveClass('neg'));
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    await waitFor(() => expect(big()).not.toHaveClass('neg'));
  });

  it('leaves the count unchanged when requests fail', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.getCount.mockResolvedValue({ count: 3 });
    api.inc.mockRejectedValue(new Error('x'));
    api.dec.mockRejectedValue(new Error('x'));
    api.reset.mockRejectedValue(new Error('x'));
    render(<Counter />);
    await waitFor(() => expect(big()).toHaveTextContent('3'));
    for (const name of ['+', '-', 'reset']) {
      await userEvent.click(screen.getByRole('button', { name }));
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(api.inc).toHaveBeenCalled();
    expect(api.dec).toHaveBeenCalled();
    expect(api.reset).toHaveBeenCalled();
    expect(big()).toHaveTextContent('3');
    expect(unhandled).not.toHaveBeenCalled();
    process.off('unhandledRejection', unhandled);
  });

  it('keeps count at 0 when the initial load fails', async () => {
    api.getCount.mockRejectedValue(new Error('x'));
    render(<Counter />);
    await new Promise((r) => setTimeout(r, 10));
    expect(big()).toHaveTextContent('0');
  });
});
