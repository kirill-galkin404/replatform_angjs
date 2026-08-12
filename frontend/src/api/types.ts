// Types mirroring backend/contract/openapi.yaml's component schemas - the
// locked REST contract this client consumes.

export interface CountResponse {
  count: number;
}

export interface HistoryEntry {
  t: number;
  op: 'inc' | 'dec' | 'reset';
  val: number;
}

export type HistoryResponse = HistoryEntry[];

export interface HealthzResponse {
  status: 'ok';
}

export interface ErrorResponse {
  error: string;
  code: string;
  field?: string;
}
