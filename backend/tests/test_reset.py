"""Python port of backend/test/reset.test.js, tested at the function level."""

import pytest

from app.counter import CounterState
from app.validators import ValidationError


def test_inc_then_reset_zeroes_count_and_appends_reset_history(tmp_path):
    db_file = tmp_path / "data.json"
    state = CounterState(count=0, history=[])

    state.inc(by=5, db_file=str(db_file))
    new_count = state.reset(body={}, db_file=str(db_file))

    assert new_count == 0
    assert state.count == 0

    last = state.history[-1]
    assert last["op"] == "reset"
    assert last["val"] == 0


def test_reset_with_unexpected_field_raises_400():
    state = CounterState(count=3, history=[])

    with pytest.raises(ValidationError) as exc_info:
        state.reset(body={"foo": 1})

    err = exc_info.value
    assert err.status == 400
    assert err.code == "UNEXPECTED_FIELD"
    # count/history must be untouched since the check happens before mutation
    assert state.count == 3
    assert state.history == []


def test_reset_with_no_body_defaults_to_empty_dict(tmp_path):
    db_file = tmp_path / "data.json"
    state = CounterState(count=7, history=[])

    new_count = state.reset(body=None, db_file=str(db_file))

    assert new_count == 0
