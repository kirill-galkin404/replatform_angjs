"""Atomic persistence for the counter state.

Python port of backend/server.js's save() (fs.writeFileSync(DB_FILE, ...)),
but hardened against crash-mid-write corruption: instead of a single
in-place write, we write to a temp file in the same directory and then
atomically os.replace() it into place. If any part of that fails (e.g. the
target directory doesn't exist), the exception propagates to the caller
unchanged - callers (see app/counter.py) are expected to have already
mutated their in-memory state before calling save(), preserving the same
mutate-before-persist gap the Node version has (see R-0015).
"""

import json
import os
import tempfile

DEFAULT_DB_FILE = os.environ.get("DB_FILE", "./data.json")


def save(count, history, db_file=None):
    """Serialize {count, history} to db_file via temp-file + atomic rename.

    Raises whatever exception occurs during the write/rename (e.g.
    FileNotFoundError if the parent directory of db_file does not exist) -
    it is not swallowed here.
    """

    if db_file is None:
        db_file = DEFAULT_DB_FILE

    payload = json.dumps({"count": count, "history": history})
    directory = os.path.dirname(db_file) or "."

    fd, tmp_path = tempfile.mkstemp(
        prefix=".data-", suffix=".tmp", dir=directory
    )
    try:
        with os.fdopen(fd, "w") as f:
            f.write(payload)
        os.replace(tmp_path, db_file)
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def load(db_file=None):
    """Load {count, history} from db_file, defaulting to count=0/history=[].

    Mirrors Node's boot-time try/read/JSON.parse/catch-and-reset-to-zero
    behavior. Left minimal here for a later step (S-0004) to wire into
    application boot; provided now so storage.py's primitives are reusable.
    """

    if db_file is None:
        db_file = DEFAULT_DB_FILE

    try:
        with open(db_file, "r") as f:
            obj = json.load(f)
        return obj.get("count", 0), obj.get("history", [])
    except (OSError, ValueError):
        return 0, []


def hydrate(db_file=None):
    """Boot-time entry point: load initial (count, history) state.

    Thin wrapper over load() so application startup (see R-0016) has an
    obviously-named function to call; missing, unreadable, or corrupt-JSON
    db_file all silently fall back to (0, []) with no exception raised.
    """

    return load(db_file)
