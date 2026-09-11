"""Python port of backend/test/inc.test.js, tested at the function level
(no FastAPI app exists yet - that's S-0005). Mirrors the same assertions:
{"by": 2} increments count by 2 and appends an 'inc' history entry;
{"by": "not-a-number"} returns/raises a 400-equivalent and leaves the
persisted + in-memory count unchanged.
"""

import pytest

from app.counter import CounterState
from app.validators import ValidationError


def test_inc_by_2_increments_and_appends_history(tmp_path):
    db_file = tmp_path / "data.json"
    state = CounterState(count=0, history=[])

    before = state.count
    new_count = state.inc(by=2, db_file=str(db_file))

    assert new_count == before + 2
    assert state.count == before + 2

    last = state.history[-1]
    assert last["op"] == "inc"
    assert last["val"] == new_count


def test_inc_with_non_numeric_by_raises_and_does_not_mutate_count(tmp_path):
    db_file = tmp_path / "data.json"
    state = CounterState(count=5, history=[])

    before = state.count
    before_history_len = len(state.history)

    with pytest.raises(ValidationError) as exc_info:
        state.inc(by="not-a-number", db_file=str(db_file))

    err = exc_info.value
    assert err.status == 400
    assert err.code
    assert err.field

    assert state.count == before
    assert len(state.history) == before_history_len
