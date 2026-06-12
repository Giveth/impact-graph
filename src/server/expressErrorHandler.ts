import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import SentryLogger from '../sentryLogger';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  // body-parser / http-errors set a machine-readable `type`
  // (e.g. 'entity.parse.failed', 'entity.too.large', 'request.aborted').
  type?: string;
}

/**
 * Centralized Express error-handling middleware. Must be registered LAST (after
 * all routes) and must keep all four arguments — that 4-arity signature is how
 * Express recognizes it as an error handler.
 *
 * Why this exists: without it, Express's default handler prints a full stack
 * trace to stderr for every error — including malformed/aborted requests from
 * internet scanners (bad JSON bodies, oversized payloads, path-traversal
 * probes). That noise buries genuine failures and looks like the app is
 * breaking when it is just rejecting junk.
 *
 * Policy:
 *  - Client errors (4xx): expected noise. Respond cleanly, log a single concise
 *    line (no stack, no message — 4xx messages can echo back user input/PII),
 *    and DO NOT crash — otherwise any scanner could take the API down with one
 *    malformed request.
 *  - Server errors (5xx): genuine server-side failures. Make them loud (bunyan
 *    error + Sentry) so they can't fail silently, while still serving other
 *    requests. Process-level fatal errors are handled separately by the global
 *    handlers in utils/globalErrorHandlers.ts (which exit for a clean restart).
 */
export function expressErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Anything can be passed to next() (a string, null, a plain object). Coerce
  // to an Error so the property access below can never crash the handler.
  const error: HttpError =
    err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : 'Unknown error');

  // Derive a valid HTTP status; fall back to 500 for anything out of range.
  const candidate = error.status ?? error.statusCode ?? 500;
  const status =
    Number.isInteger(candidate) && candidate >= 100 && candidate <= 599
      ? candidate
      : 500;

  // Client disconnected mid-request: there is nothing to respond to.
  if (error.type === 'request.aborted') {
    logger.debug('Request aborted by client', {
      method: req.method,
      path: req.path,
    });
    return;
  }

  if (status < 500) {
    logger.debug('Rejected bad request', {
      status,
      type: error.type,
      method: req.method,
      path: req.path,
    });
    if (!res.headersSent) {
      res.sendStatus(status);
    }
    return;
  }

  // Genuine server error — surface it loudly so it is never silent.
  logger.error('Unhandled server error', error);
  SentryLogger.captureException(error);
  if (!res.headersSent) {
    res.sendStatus(500);
  }
}
