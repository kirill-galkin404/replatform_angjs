// Typed client for the locked REST contract (backend/contract/openapi.yaml).
import { getApiBaseUrl } from '../config';
import type { CountResponse, ErrorResponse, HistoryResponse, HealthzResponse } from './types';

export class ApiError extends Error {
  code: string;
  field?: string;
  status: number;

  constructor(body: ErrorResponse, status: number) {
    super(body.error);
    this.code = body.code;
    this.field = body.field;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(getApiBaseUrl() + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body as ErrorResponse, res.status);
  }
  return body as T;
}

export function getCount(): Promise<CountResponse> {
  return request<CountResponse>('/count');
}

export function inc(by: number | string): Promise<CountResponse> {
  return request<CountResponse>('/inc', { method: 'POST', body: JSON.stringify({ by }) });
}

// The original AngularJS app's $scope.dec always POSTed an empty body,
// never sending the step field - only increment ever honoured it. Preserved
// verbatim: decrement always uses the server's default step (1).
export function dec(): Promise<CountResponse> {
  return request<CountResponse>('/dec', { method: 'POST', body: JSON.stringify({}) });
}

export function reset(): Promise<CountResponse> {
  return request<CountResponse>('/reset', { method: 'POST', body: JSON.stringify({}) });
}

export function getHistory(): Promise<HistoryResponse> {
  return request<HistoryResponse>('/history');
}

export function healthz(): Promise<HealthzResponse> {
  return request<HealthzResponse>('/healthz');
}
