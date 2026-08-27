import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CounterControls from './CounterControls.jsx';
import * as counterClient from '../api/counterClient';

describe('CounterControls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls increment with the current step value', async () => {
    vi.spyOn(counterClient, 'increment').mockResolvedValue({ count: 5 });
    const onCountChange = vi.fn();
    const onError = vi.fn();

    render(<CounterControls onCountChange={onCountChange} onError={onError} />);

    const stepInput = screen.getByRole('textbox');
    fireEvent.change(stepInput, { target: { value: '3' } });
    fireEvent.click(screen.getByText('+'));

    await waitFor(() => expect(counterClient.increment).toHaveBeenCalledWith(3));
    expect(onCountChange).toHaveBeenCalledWith(5);
  });

  it('calls decrement with the current step value (D-0004)', async () => {
    vi.spyOn(counterClient, 'decrement').mockResolvedValue({ count: -3 });
    const onCountChange = vi.fn();
    const onError = vi.fn();

    render(<CounterControls onCountChange={onCountChange} onError={onError} />);

    const stepInput = screen.getByRole('textbox');
    fireEvent.change(stepInput, { target: { value: '7' } });
    fireEvent.click(screen.getByText('-'));

    await waitFor(() => expect(counterClient.decrement).toHaveBeenCalledWith(7));
    expect(onCountChange).toHaveBeenCalledWith(-3);
  });

  it('reports a structured error via onError instead of crashing', async () => {
    const apiError = Object.assign(new Error('"by" must be an integer'), {
      code: 'INVALID_STEP',
      field: 'by',
    });
    vi.spyOn(counterClient, 'increment').mockRejectedValue(apiError);
    const onCountChange = vi.fn();
    const onError = vi.fn();

    render(<CounterControls onCountChange={onCountChange} onError={onError} />);

    fireEvent.click(screen.getByText('+'));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(apiError));
  });

  it('clears a previous error automatically on the next successful request', async () => {
    const apiError = Object.assign(new Error('"by" must be an integer'), {
      code: 'INVALID_STEP',
      field: 'by',
    });
    vi.spyOn(counterClient, 'increment')
      .mockRejectedValueOnce(apiError)
      .mockResolvedValueOnce({ count: 1 });
    const onCountChange = vi.fn();
    const onError = vi.fn();

    render(<CounterControls onCountChange={onCountChange} onError={onError} />);

    fireEvent.click(screen.getByText('+'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(apiError));

    fireEvent.click(screen.getByText('+'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null));
  });
});
