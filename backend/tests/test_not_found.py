"""Port of backend/test/not-found.test.js.

Any unmatched route/method must return a structured JSON 404 body rather
than a framework default page.
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


def test_get_unmatched_route_returns_structured_404(client):
    res = client.get("/this-route-does-not-exist")
    assert res.status_code == 404
    assert "application/json" in res.headers["content-type"]
    body = res.json()
    assert body["error"]
    assert body["code"]


def test_post_unmatched_route_returns_structured_404(client):
    res = client.post("/this-route-does-not-exist", json={})
    assert res.status_code == 404
    body = res.json()
    assert body["error"]
    assert body["code"]
