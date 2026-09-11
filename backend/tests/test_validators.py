import math

import pytest

from app.validators import DEFAULT_STEP, ValidationError, validate_step


def test_validate_step_non_numeric_string_raises():
    with pytest.raises(ValidationError):
        validate_step("abc")


def test_validate_step_nan_raises():
    with pytest.raises(ValidationError):
        validate_step(float("nan"))


def test_validate_step_infinity_raises():
    with pytest.raises(ValidationError):
        validate_step(math.inf)


def test_validate_step_fractional_raises():
    with pytest.raises(ValidationError):
        validate_step(1.5)


def test_validate_step_returns_value():
    assert validate_step(3) == 3


def test_validate_step_missing_returns_default():
    assert validate_step(None, required=False) == DEFAULT_STEP
    assert validate_step(None) == 1


def test_validate_step_missing_required_raises():
    with pytest.raises(ValidationError):
        validate_step(None, required=True)


def test_validate_step_rejects_non_number_non_string_types():
    for bad_value in ([5], [], True, False, {}):
        with pytest.raises(ValidationError):
            validate_step(bad_value)


def test_validate_step_rejects_whitespace_only_string():
    with pytest.raises(ValidationError):
        validate_step("   ")


def test_validate_step_accepts_min_max_boundary():
    assert validate_step(-1_000_000) == -1_000_000
    assert validate_step(1_000_000) == 1_000_000


def test_validate_step_rejects_beyond_min_max_boundary():
    with pytest.raises(ValidationError):
        validate_step(-1_000_001)
    with pytest.raises(ValidationError):
        validate_step(1_000_001)


def test_validate_step_accepts_hex_octal_binary_string_literals():
    # Mirrors JS's Number('0x10') === 16 (Number() accepts 0x/0o/0b-prefixed
    # numeric string literals, unlike Python's float()).
    assert validate_step("0x10") == 16
    assert validate_step("0o17") == 15
    assert validate_step("0b101") == 5


def test_validate_step_still_rejects_genuinely_invalid_strings():
    with pytest.raises(ValidationError):
        validate_step("0xzz")
    with pytest.raises(ValidationError):
        validate_step("abc")
