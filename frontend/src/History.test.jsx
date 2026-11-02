import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import History from './History.jsx';
import * as api from './api.js';

vi.mock('./api.js');

const T1 = Date.UTC(2024, 0, 2, 3, 4, 5);
const T2 = Date.UTC(2024, 0, 2, 3, 5, 6);
const fmt = (t) => new Date(t).toLocaleTimeString();

describe('History', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders nothing and does not fetch until show history is clicked', () => {
    const { container } = render(<History />);
    expect(api.getHistory).not.toHaveBeenCalled();
    expect(container.querySelector('#hist').children.length).toBe(0);
  });

  it('fetches on click and renders items in API order as time - op -> val', async () => {
    api.getHistory.mockResolvedValue([
      { t: T1, op: 'inc', val: 3 },
      { t: T2, op: 'dec', val: 2 },
    ]);
    const { container } = render(<History />);
    fireEvent.click(screen.getByText('show history'));
    await waitFor(() => expect(container.querySelectorAll('#hist li').length).toBe(2));
    expect(api.getHistory).toHaveBeenCalledTimes(1);
    expect(container.querySelector('#hist b').textContent).toBe('History:');
    const items = [...container.querySelectorAll('#hist li')].map((li) => li.textContent);
    expect(items).toEqual([fmt(T1) + ' - inc -> 3', fmt(T2) + ' - dec -> 2']);
  });

  it('renders markup in op as literal text with no injected element', async () => {
    const evil = '<img src=x onerror="window.__pwned=1">';
    api.getHistory.mockResolvedValue([{ t: T1, op: evil, val: 1 }]);
    const { container } = render(<History />);
    fireEvent.click(screen.getByText('show history'));
    await waitFor(() => expect(container.querySelectorAll('#hist li').length).toBe(1));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('#hist li').textContent).toBe(fmt(T1) + ' - ' + evil + ' -> 1');
  });

  it('replaces prior content on a second click', async () => {
    api.getHistory
      .mockResolvedValueOnce([{ t: T1, op: 'inc', val: 1 }, { t: T2, op: 'inc', val: 2 }])
      .mockResolvedValueOnce([{ t: T2, op: 'reset', val: 0 }]);
    const { container } = render(<History />);
    fireEvent.click(screen.getByText('show history'));
    await waitFor(() => expect(container.querySelectorAll('#hist li').length).toBe(2));
    fireEvent.click(screen.getByText('show history'));
    await waitFor(() => expect(container.querySelectorAll('#hist li').length).toBe(1));
    expect(container.querySelector('#hist li').textContent).toBe(fmt(T2) + ' - reset -> 0');
    expect(container.querySelectorAll('#hist b').length).toBe(1);
  });

  it('a rejected getHistory leaves state unchanged without an unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    api.getHistory
      .mockResolvedValueOnce([{ t: T1, op: 'inc', val: 1 }])
      .mockRejectedValueOnce(new Error('boom'));
    const { container } = render(<History />);
    fireEvent.click(screen.getByText('show history'));
    await waitFor(() => expect(container.querySelectorAll('#hist li').length).toBe(1));
    fireEvent.click(screen.getByText('show history'));
    await new Promise((r) => setTimeout(r, 20));
    expect(api.getHistory).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll('#hist li').length).toBe(1);
    expect(container.querySelector('#hist li').textContent).toBe(fmt(T1) + ' - inc -> 1');
    expect(unhandled).not.toHaveBeenCalled();
    process.off('unhandledRejection', unhandled);
  });
});
