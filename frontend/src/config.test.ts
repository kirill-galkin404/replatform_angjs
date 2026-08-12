import { describe, expect, it, vi } from 'vitest';
import { ConfigError, getApiBaseUrl } from './config';

describe('getApiBaseUrl', () => {
  it('throws a ConfigError when VITE_API_BASE_URL is unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(() => getApiBaseUrl()).toThrow(ConfigError);
  });

  it('returns the configured URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.test');
    expect(getApiBaseUrl()).toBe('http://api.example.test');
  });
});
