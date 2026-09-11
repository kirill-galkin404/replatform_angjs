import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import History from './History';

describe('History', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('does not render history entries before the button is clicked', () => {
    render(<History />);
    expect(screen.queryByText(/inc/)).not.toBeInTheDocument();
    expect(screen.queryByText(/dec/)).not.toBeInTheDocument();
  });

  test('renders history entries from state after clicking show history', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { t: 1700000000000, op: 'inc', val: 5 },
        { t: 1700000001000, op: 'dec', val: 4 },
      ],
    });

    render(<History />);
    fireEvent.click(screen.getByText('show history'));

    await waitFor(() => {
      expect(screen.getByText(/inc/)).toBeInTheDocument();
    });
    expect(screen.getByText(/dec/)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/history'));
  });

  test('surfaces a visible error message when the fetch fails', async () => {
    global.fetch.mockRejectedValue(new Error('network fail'));

    render(<History />);
    fireEvent.click(screen.getByText('show history'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed to load history/i);
    expect(screen.queryByText(/inc/)).not.toBeInTheDocument();
    expect(screen.queryByText(/dec/)).not.toBeInTheDocument();
  });

  test('surfaces a visible error message when the response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false });

    render(<History />);
    fireEvent.click(screen.getByText('show history'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed to load history/i);
  });
});
