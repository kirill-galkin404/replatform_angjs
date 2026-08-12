// shared validation helpers + structured error type

export class ValidationError extends Error {
  code: string;
  field?: string;
  status: number;

  constructor(code: string, field: string | undefined, message: string, status?: number) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.field = field;
    this.status = status || 400;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

export const DEFAULT_STEP = 1;
const MIN_STEP = -1000000;
const MAX_STEP = 1000000;

export interface ValidateStepOptions {
  required?: boolean;
}

// Accepts only finite integers within [MIN_STEP, MAX_STEP].
// Rejects NaN, Infinity, non-numeric strings and non-integer floats.
// When value is undefined/null and required is false (default), returns DEFAULT_STEP.
export function validateStep(value: unknown, options?: ValidateStepOptions): number {
  var opts = options || {};
  var required = opts.required === true;

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError('FIELD_REQUIRED', 'by', '"by" is required', 400);
    }
    return DEFAULT_STEP;
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new ValidationError('INVALID_STEP', 'by', '"by" must be a finite integer', 400);
  }

  if (typeof value === 'string' && value.trim() === '') {
    throw new ValidationError('INVALID_STEP', 'by', '"by" must be a finite integer', 400);
  }

  var num = typeof value === 'number' ? value : Number(value);

  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    throw new ValidationError('INVALID_STEP', 'by', '"by" must be a finite integer', 400);
  }

  if (Math.floor(num) !== num) {
    throw new ValidationError('INVALID_STEP', 'by', '"by" must be an integer', 400);
  }

  if (num < MIN_STEP || num > MAX_STEP) {
    throw new ValidationError('STEP_OUT_OF_RANGE', 'by', '"by" is out of the allowed range', 400);
  }

  return num;
}
