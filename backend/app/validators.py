"""Shared validation helpers + structured error type.

Python port of backend/validators.js (the Node ground truth). Behavior is
kept byte-for-byte equivalent to the JS implementation, not "idiomatic
Python first" where that would change semantics.
"""

import math


class ValidationError(Exception):
    """Mirrors the JS ValidationError shape: code/field/message/status."""

    def __init__(self, code, field, message, status=400):
        super().__init__(message)
        self.name = "ValidationError"
        self.message = message
        self.code = code
        self.field = field
        self.status = status or 400


DEFAULT_STEP = 1
MIN_STEP = -1_000_000
MAX_STEP = 1_000_000


def validate_step(value, *, required: bool = False):
    """Accepts only finite integers within [MIN_STEP, MAX_STEP].

    Rejects NaN, Infinity, non-numeric strings and non-integer floats.
    When value is None and required is False (default), returns DEFAULT_STEP.
    """

    if value is None:
        if required:
            raise ValidationError("FIELD_REQUIRED", "by", '"by" is required', 400)
        return DEFAULT_STEP

    # In Python, bool is a subclass of int, but in JS typeof true !== 'number'.
    # Explicitly reject bool before the numeric/string type check.
    if isinstance(value, bool):
        raise ValidationError(
            "INVALID_STEP", "by", '"by" must be a finite integer', 400
        )

    if not isinstance(value, (int, float, str)):
        raise ValidationError(
            "INVALID_STEP", "by", '"by" must be a finite integer', 400
        )

    if isinstance(value, str) and value.strip() == "":
        raise ValidationError(
            "INVALID_STEP", "by", '"by" must be a finite integer', 400
        )

    if isinstance(value, (int, float)):
        num = value
    else:
        # Mirror JS's permissive `Number(value)` coercion of numeric strings.
        try:
            num = float(value)
        except ValueError:
            num = float("nan")

    if math.isnan(num) or math.isinf(num):
        raise ValidationError(
            "INVALID_STEP", "by", '"by" must be a finite integer', 400
        )

    if math.floor(num) != num:
        raise ValidationError("INVALID_STEP", "by", '"by" must be an integer', 400)

    if num < MIN_STEP or num > MAX_STEP:
        raise ValidationError(
            "STEP_OUT_OF_RANGE", "by", '"by" is out of the allowed range', 400
        )

    return int(num)
