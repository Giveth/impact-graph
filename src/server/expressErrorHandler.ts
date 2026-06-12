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
 *    line (no stack trace), and DO NOT crash — otherwise any scanner could take
 *    the API down with one malformed request.
 *  - Server errors (5xx): genuine server-side failures. Make them loud (bunyan
 *    error + Sentry) so they can't fail silently, while still serving other
 *    requests. Process-level fatal errors are handled separately by the
 *    global handlers in utils/globalErrorHandlers.ts (which exit for a clean
 *    container restart).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function expressErrorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.status || err.statusCode || 500;

  // Client disconnected mid-request: there is nothing to respond to.
  if (err.type === 'request.aborted') {
    logger.debug('Request aborted by client', {
      method: req.method,
      path: req.path,
    });
    return;
  }

  if (status < 500) {
    logger.debug('Rejected bad request', {
      status,
      type: err.type,
      method: req.method,
      path: req.path,
      message: err.message,
    });
    if (!res.headersSent) {
      res.sendStatus(status);
    }
    return;
  }

  // Genuine server error — surface it loudly so it is never silent.
  logger.error('Unhandled server error', err);
  SentryLogger.captureException(err);
  if (!res.headersSent) {
    res.sendStatus(500);
  }
}
