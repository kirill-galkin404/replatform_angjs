// manual CORS + centralised error-handling middleware
import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from './validators';

// manual CORS because why not
export function cors(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
}

// 404 handler - unmatched routes get a structured JSON body
export function notFound(req: Request, res: Response): void {
  res.status(404).send({ error: 'Not Found', code: 'NOT_FOUND' });
}

interface ErrorBody {
  error: string;
  code: string;
  field?: string;
}

// centralised error-handling middleware - must be last
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ValidationError) {
    const body: ErrorBody = { error: err.message, code: err.code };
    if (err.field) {
      body.field = err.field;
    }
    res.status(err.status).send(body);
    return;
  }
  // Honour a legitimate 4xx set by upstream middleware (e.g. body-parser's
  // JSON SyntaxError, which sets err.status = 400) instead of always 500.
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) {
    res.status(status).send({ error: 'Bad Request', code: 'BAD_REQUEST' });
    return;
  }
  res.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
}
