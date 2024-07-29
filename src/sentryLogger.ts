import * as Sentry from '@sentry/node';
import config from './config.js';

const sentryId = config.get('SENTRY_ID').toString();
const sentryToken = config.get('SENTRY_TOKEN').toString();

Sentry.init({
  dsn: `https://${sentryToken}.ingest.sentry.io/${sentryId}`,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

export default Sentry;
