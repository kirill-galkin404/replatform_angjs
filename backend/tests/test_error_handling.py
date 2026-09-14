"""Python port of backend/test/error-handling.test.js, tested at the
function level. Points db_file at a path inside a directory that does not
exist (mirroring Node's path.join(__dirname, 'no-such-dir', 'data.json')
trick) so storage.save() raises. Pins R-0015: the in-memory count/history
must have already advanced before the save failure is observed, and the
exception must propagate (not be silently swallowed) so a later step
(S-0005) can translate it into a structured 500 response.
"""

import pytest

from app.counter import CounterState


def test_forced_save_failure_still_advances_in_memory_count(tmp_path):
    db_file = tmp_path / "no-such-dir" / "data.json"
    state = CounterState(count=0, history=[])

    with pytest.raises(OSError) as exc_info:
        state.inc(by=1, db_file=str(db_file))

    # The exception propagated (not swallowed)...
    assert exc_info.value is not None

    # ...but the in-memory state already reflects the mutation that
    # happened before the failed save() call - this is the known,
    # deliberately-preserved defect (R-0015), not a bug to fix here.
    assert state.count == 1
    assert len(state.history) == 1
    assert state.history[-1]["op"] == "inc"
    assert state.history[-1]["val"] == 1

    # Soft check: the raw exception shouldn't look like a raw traceback dump
    # (a later step is responsible for building an actual HTTP error
    # envelope; here we just make sure the message itself isn't absurd).
    message = str(exc_info.value)
    assert "Traceback" not in message
    assert "  File \"" not in message


def test_forced_save_failure_on_dec_still_advances_in_memory_count(tmp_path):
    db_file = tmp_path / "no-such-dir" / "data.json"
    state = CounterState(count=10, history=[])

    with pytest.raises(OSError):
        state.dec(by=1, db_file=str(db_file))

    assert state.count == 9
    assert state.history[-1]["op"] == "dec"


def test_forced_save_failure_on_reset_still_advances_in_memory_count(tmp_path):
    db_file = tmp_path / "no-such-dir" / "data.json"
    state = CounterState(count=5, history=[])

    with pytest.raises(OSError):
        state.reset(body={}, db_file=str(db_file))

    assert state.count == 0
    assert state.history[-1]["op"] == "reset"
