// shared validation helpers + structured error type

function ValidationError(code, field, message, status) {
  Error.call(this, message);
  this.name = 'ValidationError';
  this.message = message;
  this.code = code;
  this.field = field;
  this.status = status || 400;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ValidationError);
  }
}
ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.constructor = ValidationError;

var DEFAULT_STEP = 1;
var MIN_STEP = -1000000;
var MAX_STEP = 1000000;

// Accepts only finite integers within [MIN_STEP, MAX_STEP].
// Rejects NaN, Infinity, non-numeric strings and non-integer floats.
// When value is undefined/null and required is false (default), returns DEFAULT_STEP.
function validateStep(value, options) {
  var opts = options || {};
  var required = opts.required === true;

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError('FIELD_REQUIRED', 'by', '"by" is required', 400);
    }
    return DEFAULT_STEP;
  }

  var num = typeof value === 'number' ? value : Number(value);

  if (typeof value === 'string' && value.trim() === '') {
    throw new ValidationError('INVALID_STEP', 'by', '"by" must be a finite integer', 400);
  }

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

module.exports = {
  ValidationError: ValidationError,
  validateStep: validateStep,
  DEFAULT_STEP: DEFAULT_STEP
};
