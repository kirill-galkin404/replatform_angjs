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
