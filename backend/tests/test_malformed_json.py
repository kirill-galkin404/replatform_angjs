"""Port of backend/test/malformed-json.test.js.

POST /inc with an unparseable JSON body must be reported as a 4xx client
error (not a 500), with a structured {error, code} body.
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


def test_malformed_json_body_on_inc_is_4xx_not_500(client):
    res = client.post(
        "/inc",
        content='{"by": not-valid-json',
        headers={"Content-Type": "application/json"},
    )
    assert 400 <= res.status_code < 500, "expected a 4xx status, got %s" % res.status_code
    body = res.json()
    assert body["error"]
    assert body["code"]
