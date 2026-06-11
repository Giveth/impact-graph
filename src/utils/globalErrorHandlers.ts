import { logger } from './logger';
import SentryLogger from '../sentryLogger';

/**
 * Registers process-level handlers for errors that escape application code.
 *
 * Why this exists: the API runs behind a Postgres connection pooler
 * (DigitalOcean managed Postgres / PgBouncer). When the pooler or database has
 * a transient problem, in-flight DB queries reject. Without an
 * `unhandledRejection` listener, Node (>= 15) terminates the whole process on
 * the first such rejection, taking the entire API down for a momentary DB blip.
 *
 * Behaviour:
 *  - unhandledRejection: log + report to Sentry, then KEEP the process alive.
 *    A single rejected promise (often a transient DB error) must not tear down
 *    the server; it should keep serving and recover once the DB is reachable.
 *  - uncaughtException: log + report to Sentry, then EXIT. The process state is
 *    undefined after an uncaught exception, so we let the container restart
 *    policy (`restart: always`) recreate a clean process.
 */
let handlersRegistered = false;

export function registerGlobalErrorHandlers(): void {
  // Idempotent: never attach the listeners more than once.
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('unhandledRejection - process kept alive', reason);
    captureToSentry(reason);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.fatal('uncaughtException - exiting for a clean restart', error);
    captureToSentry(error);
    flushSentryAndExit();
  });
}

function captureToSentry(error: unknown): void {
  try {
    SentryLogger.captureException(
      error instanceof Error ? error : new Error(String(error)),
    );
  } catch {
    // Never let error reporting throw from inside an error handler.
  }
}

/**
 * Flushes pending Sentry events (best-effort, max 2s) and then exits with a
 * non-zero code so the container restart policy (`restart: always`) recreates a
 * clean process. Used by the uncaughtException handler above and by the
 * bootstrap() startup-failure path.
 */
export function flushSentryAndExit(): void {
  // A hard fallback guarantees the process exits even if flushing stalls.
  const forceExit = setTimeout(() => process.exit(1), 3000);
  void SentryLogger.close(2000)
    .catch(() => undefined)
    .then(() => {
      clearTimeout(forceExit);
      process.exit(1);
    });
}
