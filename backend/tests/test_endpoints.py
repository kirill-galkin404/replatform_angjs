"""HTTP-level tests exercising all six FastAPI endpoints.

Each test gets a fresh DB_FILE and a freshly re-imported app.main module
(via importlib.reload after monkeypatching the DB_FILE env var), so state
never leaks between tests or between test files.
"""

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "data.json"
    monkeypatch.setenv("DB_FILE", str(db_file))

    import app.main as main_module

    importlib.reload(main_module)

    return TestClient(main_module.app)


def test_get_count_starts_at_zero(client):
    res = client.get("/count")
    assert res.status_code == 200
    assert res.json() == {"count": 0}


def test_post_inc_default_step(client):
    res = client.post("/inc", json={})
    assert res.status_code == 200
    assert res.json() == {"count": 1}


def test_post_inc_with_by(client):
    res = client.post("/inc", json={"by": 2})
    assert res.status_code == 200
    assert res.json() == {"count": 2}

    history = client.get("/history").json()
    last = history[-1]
    assert last["op"] == "inc"
    assert last["val"] == 2


def test_post_dec_with_by(client):
    client.post("/inc", json={"by": 10})
    res = client.post("/dec", json={"by": 3})
    assert res.status_code == 200
    assert res.json() == {"count": 7}

    history = client.get("/history").json()
    last = history[-1]
    assert last["op"] == "dec"
    assert last["val"] == 7


def test_post_inc_invalid_step_returns_400(client):
    res = client.post("/inc", json={"by": "not-a-number"})
    assert res.status_code == 400
    body = res.json()
    assert body["error"]
    assert body["code"] == "INVALID_STEP"
    assert body["field"] == "by"


def test_post_reset_zeroes_count(client):
    client.post("/inc", json={"by": 5})
    res = client.post("/reset", json={})
    assert res.status_code == 200
    assert res.json() == {"count": 0}

    history = client.get("/history").json()
    last = history[-1]
    assert last["op"] == "reset"
    assert last["val"] == 0


def test_post_reset_with_unexpected_field_returns_400(client):
    res = client.post("/reset", json={"foo": 1})
    assert res.status_code == 400
    body = res.json()
    assert body["code"] == "UNEXPECTED_FIELD"


def test_get_history_is_bare_array(client):
    client.post("/inc", json={"by": 1})
    res = client.get("/history")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_healthz_always_200(client):
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
