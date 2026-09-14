"""Tests for storage.hydrate(): boot-time state hydration (R-0016).

Mirrors Node's boot-time try/read/JSON.parse/catch-and-reset-to-zero
behavior: a missing DB_FILE and a corrupted-JSON DB_FILE must both
silently fall back to count=0/history=[], with no exception raised.
"""

from app.storage import hydrate


def test_hydrate_missing_file_resets_to_zero(tmp_path):
    db_file = tmp_path / "does-not-exist.json"

    count, history = hydrate(str(db_file))

    assert count == 0
    assert history == []


def test_hydrate_corrupt_json_resets_to_zero(tmp_path):
    db_file = tmp_path / "corrupt.json"
    db_file.write_text("{not valid json")

    count, history = hydrate(str(db_file))

    assert count == 0
    assert history == []


def test_hydrate_missing_and_corrupt_produce_identical_result(tmp_path):
    missing_file = tmp_path / "does-not-exist.json"
    corrupt_file = tmp_path / "corrupt.json"
    corrupt_file.write_text("{not valid json")

    missing_result = hydrate(str(missing_file))
    corrupt_result = hydrate(str(corrupt_file))

    assert missing_result == corrupt_result == (0, [])
