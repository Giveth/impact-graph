import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";
import config from './config';

const sentryId = config.get('SENTRY_ID').toString()

Sentry.init({
  dsn: `https://${sentryId}.ingest.sentry.io/5606310`,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

export default Sentry
