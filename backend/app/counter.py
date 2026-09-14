"""Counter mutation logic.

Python port of backend/server.js's /inc, /dec, /reset handler bodies,
minus the HTTP plumbing (that wiring is a later step, S-0005). CounterState
holds the in-memory count/history the same way server.js's module-level
`count`/`history` globals do, and each method mutates them in place BEFORE
calling app.storage.save() - in that order, so the same mutate-before-persist
gap as the Node version (R-0015) is preserved: if save() raises, self.count
and self.history are already updated and remain visible on this instance;
the exception propagates so a later step can turn it into a 500.
"""

import time

from app import storage
from app.validators import ValidationError, validate_step


def _now_ms():
    return int(time.time() * 1000)


class CounterState:
    def __init__(self, count=0, history=None):
        self.count = count
        self.history = list(history) if history is not None else []

    def inc(self, by=None, db_file=None):
        """Mirrors server.js's POST /inc handler body."""

        step = validate_step(by)
        self.count = self.count + step
        self.history.append({"t": _now_ms(), "op": "inc", "val": self.count})
        storage.save(self.count, self.history, db_file)
        return self.count

    def dec(self, by=None, db_file=None):
        """Mirrors server.js's POST /dec handler body."""

        step = validate_step(by)
        self.count = self.count - step
        self.history.append({"t": _now_ms(), "op": "dec", "val": self.count})
        storage.save(self.count, self.history, db_file)
        return self.count

    def reset(self, body=None, db_file=None):
        """Mirrors server.js's POST /reset handler body.

        `body` is expected to be a dict-like mapping of the request body;
        any key present raises ValidationError('UNEXPECTED_FIELD', ...)
        BEFORE any mutation happens, matching Node's
        check-before-count-reset ordering.
        """

        extra_fields = list((body or {}).keys())
        if len(extra_fields) > 0:
            raise ValidationError(
                "UNEXPECTED_FIELD",
                extra_fields[0],
                "/reset does not accept a request body",
                400,
            )

        self.count = 0
        self.history.append({"t": _now_ms(), "op": "reset", "val": 0})
        storage.save(self.count, self.history, db_file)
        return self.count
