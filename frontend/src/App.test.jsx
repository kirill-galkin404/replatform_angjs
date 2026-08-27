import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';
import * as counterClient from './api/counterClient';

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches the initial count on mount and renders it', async () => {
    vi.spyOn(counterClient, 'getCount').mockResolvedValue({ count: 4 });

    render(<App />);

    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());
    expect(screen.getByText('4')).not.toHaveClass('neg');
  });

  it('applies the neg class when the initial count is negative', async () => {
    vi.spyOn(counterClient, 'getCount').mockResolvedValue({ count: -2 });

    render(<App />);

    await waitFor(() => expect(screen.getByText('-2')).toBeInTheDocument());
    expect(screen.getByText('-2')).toHaveClass('neg');
  });

  it('surfaces a structured validation error via ErrorBanner', async () => {
    const apiError = Object.assign(new Error('"by" must be an integer'), {
      code: 'INVALID_STEP',
      field: 'by',
    });
    vi.spyOn(counterClient, 'getCount').mockRejectedValue(apiError);

    render(<App />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toContain('"by" must be an integer');
  });
});
