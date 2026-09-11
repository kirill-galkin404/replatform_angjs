"""Python port of backend/test/dec.test.js, tested at the function level."""

import pytest

from app.counter import CounterState
from app.validators import ValidationError


def test_dec_by_3_decreases_count_and_appends_history(tmp_path):
    db_file = tmp_path / "data.json"
    state = CounterState(count=10, history=[])

    before = state.count
    new_count = state.dec(by=3, db_file=str(db_file))

    assert new_count == before - 3
    last = state.history[-1]
    assert last["op"] == "dec"
    assert last["val"] == new_count


def test_dec_empty_body_defaults_to_1(tmp_path):
    db_file = tmp_path / "data.json"
    state = CounterState(count=10, history=[])

    before = state.count
    new_count = state.dec(by=None, db_file=str(db_file))

    assert new_count == before - 1


def test_dec_with_x_returns_400_and_does_not_mutate_count(tmp_path):
    db_file = tmp_path / "data.json"
    state = CounterState(count=10, history=[])

    before = state.count
    before_history_len = len(state.history)

    with pytest.raises(ValidationError) as exc_info:
        state.dec(by="x", db_file=str(db_file))

    assert exc_info.value.status == 400
    assert state.count == before
    assert len(state.history) == before_history_len


def test_dec_can_go_negative_with_no_floor(tmp_path):
    db_file = tmp_path / "data.json"
    state = CounterState(count=0, history=[])

    new_count = state.dec(by=5, db_file=str(db_file))

    assert new_count == -5
