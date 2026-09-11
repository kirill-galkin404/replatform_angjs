"""FastAPI wiring for the counter backend.

Assembles all six routes (GET/POST /count, /inc, /dec, /reset, /history,
/healthz) on top of app.counter.CounterState and app.storage, with
CORSMiddleware and the structured error/not-found envelope from app.errors.
Python port of backend/server.js's HTTP layer.
"""

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app import storage
from app.counter import CounterState
from app.errors import register_error_handlers
from app.validators import ValidationError

DB_FILE = os.environ.get("DB_FILE", "./data.json")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

# Boot-time hydration: load persisted {count, history} once at import time,
# then hold the running state for the lifetime of the process (mirrors
# server.js's module-level count/history globals loaded on boot).
state = CounterState(*storage.hydrate(DB_FILE))


async def _read_json_body(request: Request):
    """Read and JSON-parse the request body, treating an empty body as {}.

    An empty body is not valid JSON on its own; Node's body-parser leaves
    req.body as {} for an absent/empty body, so we replicate that here
    rather than letting an empty body raise json.JSONDecodeError.

    Node's body-parser also runs in its default 'strict' mode, which
    rejects a syntactically-valid but top-level-scalar JSON body (e.g. a
    bare `42` or `"foo"`) with a 400 - only objects and arrays are accepted
    as a JSON request body. We reproduce that here so a non-object body
    is rejected the same way, instead of silently degrading `by` to None.
    """

    raw = await request.body()
    if not raw:
        return {}
    body = await request.json()
    if not isinstance(body, dict):
        raise ValidationError(
            "BAD_REQUEST", None, "Request body must be a JSON object", 400
        )
    return body


@app.get("/count")
async def get_count():
    return {"count": state.count}


@app.post("/inc")
async def post_inc(request: Request):
    body = await _read_json_body(request)
    count = state.inc(by=body.get("by"), db_file=DB_FILE)
    return {"count": count}


@app.post("/dec")
async def post_dec(request: Request):
    body = await _read_json_body(request)
    count = state.dec(by=body.get("by"), db_file=DB_FILE)
    return {"count": count}


@app.post("/reset")
async def post_reset(request: Request):
    body = await _read_json_body(request)
    count = state.reset(body=body, db_file=DB_FILE)
    return {"count": count}


@app.get("/history")
async def get_history():
    return state.history


@app.get("/healthz")
async def get_healthz():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 4000)))
