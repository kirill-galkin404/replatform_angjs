"""Structured error/not-found envelope for the FastAPI app.

Python port of backend/server.js's centralised error-handling middleware and
404 handler (R-0008, R-0009). Every error reaching the app is translated into
a consistent JSON body:

- ValidationError (app.validators / app.counter) -> {error, code[, field]} at
  its own status (typically 400).
- Malformed JSON bodies (json.JSONDecodeError) -> {error: 'Bad Request',
  code: 'BAD_REQUEST'} at 400, mirroring body-parser's JSON SyntaxError
  (err.status = 400) in the Node version.
- FastAPI/Starlette request validation errors -> same 'Bad Request' shape at
  400.
- Unmatched routes (404) -> {error: 'Not Found', code: 'NOT_FOUND'} for any
  HTTP method.
- Anything else -> {error: 'Internal Server Error', code: 'INTERNAL_ERROR'}
  at 500, with no leaked stack trace text.
"""

import json

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.validators import ValidationError


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError):
        body = {"error": exc.message, "code": exc.code}
        if exc.field:
            body["field"] = exc.field
        return JSONResponse(status_code=exc.status, content=body)

    @app.exception_handler(json.JSONDecodeError)
    async def json_decode_error_handler(request: Request, exc: json.JSONDecodeError):
        return JSONResponse(
            status_code=400, content={"error": "Bad Request", "code": "BAD_REQUEST"}
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(
        request: Request, exc: RequestValidationError
    ):
        return JSONResponse(
            status_code=400, content={"error": "Bad Request", "code": "BAD_REQUEST"}
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        if exc.status_code == 404:
            return JSONResponse(
                status_code=404, content={"error": "Not Found", "code": "NOT_FOUND"}
            )
        if 400 <= exc.status_code < 500:
            return JSONResponse(
                status_code=exc.status_code,
                content={"error": "Bad Request", "code": "BAD_REQUEST"},
            )
        return JSONResponse(
            status_code=500,
            content={"error": "Internal Server Error", "code": "INTERNAL_ERROR"},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"error": "Internal Server Error", "code": "INTERNAL_ERROR"},
        )
