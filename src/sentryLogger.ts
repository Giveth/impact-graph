import * as Sentry from '@sentry/node';
import config from './config';

const sentryId = config.get('SENTRY_ID').toString();
const sentryToken = config.get('SENTRY_TOKEN').toString();

Sentry.init({
  dsn: `https://${sentryToken}.ingest.sentry.io/${sentryId}`,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,

  // Crash/rejection handling lives in src/utils/globalErrorHandlers.ts, which
  // registers our own process-level handlers (keep-alive on unhandledRejection,
  // clean exit on uncaughtException). Disable Sentry's built-in global handlers
  // so errors aren't captured twice and the handlers don't race to exit.
  integrations: defaults =>
    defaults.filter(
      integration =>
        integration.name !== 'OnUncaughtException' &&
        integration.name !== 'OnUnhandledRejection',
    ),
});

export default Sentry;
