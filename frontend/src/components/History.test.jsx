import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import History from './History.jsx';
import * as counterClient from '../api/counterClient';

describe('History', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders fetched history entries as list items with time, op, and val', async () => {
    const t = new Date('2024-01-01T12:00:00Z').getTime();
    vi.spyOn(counterClient, 'getHistory').mockResolvedValue([
      { t, op: 'inc', val: 1 },
      { t, op: 'dec', val: 0 },
    ]);

    render(<History />);
    fireEvent.click(screen.getByText('show history'));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));

    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain(new Date(t).toLocaleTimeString());
    expect(items[0].textContent).toContain('inc');
    expect(items[0].textContent).toContain('1');
    expect(items[1].textContent).toContain('dec');
    expect(items[1].textContent).toContain('0');
  });
});
