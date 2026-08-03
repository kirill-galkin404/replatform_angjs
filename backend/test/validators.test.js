var test = require('node:test');
var assert = require('node:assert');
var validators = require('../validators');
var ValidationError = validators.ValidationError;
var validateStep = validators.validateStep;

test('validateStep("abc") throws ValidationError', function () {
  assert.throws(function () {
    validateStep('abc');
  }, ValidationError);
});

test('validateStep(NaN) throws ValidationError', function () {
  assert.throws(function () {
    validateStep(NaN);
  }, ValidationError);
});

test('validateStep(Infinity) throws ValidationError', function () {
  assert.throws(function () {
    validateStep(Infinity);
  }, ValidationError);
});

test('validateStep(1.5) throws ValidationError (non-integer)', function () {
  assert.throws(function () {
    validateStep(1.5);
  }, ValidationError);
});

test('validateStep(3) returns 3', function () {
  assert.strictEqual(validateStep(3), 3);
});

test('validateStep(undefined, {required:false}) returns the documented default (1)', function () {
  assert.strictEqual(validateStep(undefined, { required: false }), validators.DEFAULT_STEP);
  assert.strictEqual(validateStep(undefined), 1);
});

test('validateStep(undefined, {required:true}) throws ValidationError', function () {
  assert.throws(function () {
    validateStep(undefined, { required: true });
  }, ValidationError);
});

test('validateStep rejects non-number/non-string types instead of loosely coercing them', function () {
  assert.throws(function () { validateStep([5]); }, ValidationError);
  assert.throws(function () { validateStep([]); }, ValidationError);
  assert.throws(function () { validateStep(true); }, ValidationError);
  assert.throws(function () { validateStep(false); }, ValidationError);
  assert.throws(function () { validateStep({}); }, ValidationError);
});

test('validateStep(1000000) and validateStep(-1000000) are accepted at the inclusive boundary', function () {
  assert.strictEqual(validateStep(1000000), 1000000);
  assert.strictEqual(validateStep(-1000000), -1000000);
});

test('validateStep(1000001) and validateStep(-1000001) throw STEP_OUT_OF_RANGE just past the boundary', function () {
  assert.throws(function () {
    validateStep(1000001);
  }, function (err) { return err instanceof ValidationError && err.code === 'STEP_OUT_OF_RANGE'; });
  assert.throws(function () {
    validateStep(-1000001);
  }, function (err) { return err instanceof ValidationError && err.code === 'STEP_OUT_OF_RANGE'; });
});

test('validateStep coerces numeric strings, including ones with surrounding whitespace', function () {
  assert.strictEqual(validateStep('5'), 5);
  assert.strictEqual(validateStep('  5  '), 5);
});

test('validateStep("5.5") and validateStep("") throw INVALID_STEP', function () {
  assert.throws(function () {
    validateStep('5.5');
  }, function (err) { return err instanceof ValidationError && err.code === 'INVALID_STEP'; });
  assert.throws(function () {
    validateStep('');
  }, function (err) { return err instanceof ValidationError && err.code === 'INVALID_STEP'; });
});

// NOTE: the required:true branch below is correct and exercised here directly,
// but server.js's /inc, /dec and /reset handlers only ever call
// validateStep(req.body.by) with no options object, so FIELD_REQUIRED is
// currently unreachable through the live HTTP API - this test documents the
// unit-level contract, not a reachable HTTP behaviour.
test('validateStep(undefined, {required:true}) throws FIELD_REQUIRED (unreachable via server.js today)', function () {
  assert.throws(function () {
    validateStep(undefined, { required: true });
  }, function (err) { return err instanceof ValidationError && err.code === 'FIELD_REQUIRED'; });
});
