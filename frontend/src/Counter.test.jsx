import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Counter from './Counter.jsx';
import * as api from './api.js';

vi.mock('./api.js');

const bigEl = () => document.getElementById('big');

describe('Counter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getCount.mockResolvedValue({ count: 5 });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads the count on mount and starts step at 1', async () => {
    render(<Counter />);
    await waitFor(() => expect(bigEl().textContent).toBe('5'));
    expect(api.getCount).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox').value).toBe('1');
  });

  it('inc passes the typed step as a string and sets count from the response', async () => {
    api.inc.mockResolvedValue({ count: 12 });
    render(<Counter />);
    await waitFor(() => expect(bigEl().textContent).toBe('5'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '7' } });
    fireEvent.click(screen.getByText('+'));
    await waitFor(() => expect(bigEl().textContent).toBe('12'));
    expect(api.inc).toHaveBeenCalledWith('7');
  });

  it('dec calls the api without the step and updates count', async () => {
    api.dec.mockResolvedValue({ count: 4 });
    render(<Counter />);
    await waitFor(() => expect(bigEl().textContent).toBe('5'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('-'));
    await waitFor(() => expect(bigEl().textContent).toBe('4'));
    expect(api.dec).toHaveBeenCalledWith();
  });

  it('reset calls the api when confirmed', async () => {
    api.reset.mockResolvedValue({ count: 0 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Counter />);
    await waitFor(() => expect(bigEl().textContent).toBe('5'));
    fireEvent.click(screen.getByText('reset'));
    await waitFor(() => expect(bigEl().textContent).toBe('0'));
    expect(api.reset).toHaveBeenCalledTimes(1);
  });

  it('reset does nothing when declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Counter />);
    await waitFor(() => expect(bigEl().textContent).toBe('5'));
    fireEvent.click(screen.getByText('reset'));
    expect(api.reset).not.toHaveBeenCalled();
    expect(bigEl().textContent).toBe('5');
  });

  it('count element has class neg only when below zero', async () => {
    api.getCount.mockResolvedValue({ count: -3 });
    render(<Counter />);
    await waitFor(() => expect(bigEl().textContent).toBe('-3'));
    expect(bigEl().classList.contains('neg')).toBe(true);
    cleanup();
    api.getCount.mockResolvedValue({ count: 0 });
    render(<Counter />);
    await waitFor(() => expect(bigEl().textContent).toBe('0'));
    expect(bigEl().classList.contains('neg')).toBe(false);
  });

  it('a rejected inc leaves state unchanged without an unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    api.inc.mockRejectedValue(new Error('boom'));
    render(<Counter />);
    await waitFor(() => expect(bigEl().textContent).toBe('5'));
    fireEvent.click(screen.getByText('+'));
    await new Promise((r) => setTimeout(r, 20));
    expect(api.inc).toHaveBeenCalledWith('1');
    expect(bigEl().textContent).toBe('5');
    expect(unhandled).not.toHaveBeenCalled();
    process.off('unhandledRejection', unhandled);
  });
});
