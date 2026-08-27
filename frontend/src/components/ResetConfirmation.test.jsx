import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetConfirmation from './ResetConfirmation.jsx';
import * as counterClient from '../api/counterClient';

describe('ResetConfirmation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not call reset until the confirmation is accepted', () => {
    vi.spyOn(counterClient, 'reset').mockResolvedValue({ count: 0 });

    render(<ResetConfirmation onCountChange={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByText('reset'));

    expect(counterClient.reset).not.toHaveBeenCalled();
    expect(screen.getByText('yes')).toBeInTheDocument();
  });

  it('calls reset after the confirmation is accepted', async () => {
    vi.spyOn(counterClient, 'reset').mockResolvedValue({ count: 0 });
    const onCountChange = vi.fn();

    render(<ResetConfirmation onCountChange={onCountChange} onError={vi.fn()} />);

    fireEvent.click(screen.getByText('reset'));
    fireEvent.click(screen.getByText('yes'));

    await waitFor(() => expect(counterClient.reset).toHaveBeenCalledTimes(1));
    expect(onCountChange).toHaveBeenCalledWith(0);
  });

  it('cancels the pending confirmation without calling reset', () => {
    vi.spyOn(counterClient, 'reset').mockResolvedValue({ count: 0 });

    render(<ResetConfirmation onCountChange={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByText('reset'));
    fireEvent.click(screen.getByText('cancel'));

    expect(counterClient.reset).not.toHaveBeenCalled();
    expect(screen.getByText('reset')).toBeInTheDocument();
  });
});
