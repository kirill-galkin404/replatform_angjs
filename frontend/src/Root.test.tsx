import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Root from './Root';

function jsonResponse(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('Root', () => {
  it('shows a visible configuration error when VITE_API_BASE_URL is unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    render(<Root />);
    expect(screen.getByTestId('config-error')).toBeInTheDocument();
    expect(screen.getByTestId('config-error').textContent).toMatch(/VITE_API_BASE_URL/);
  });

  it('renders the counter app when VITE_API_BASE_URL is set', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.test');
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(jsonResponse({ count: 0 })));
    render(<Root />);
    expect(screen.queryByTestId('config-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('count')).toBeInTheDocument();
  });
});
