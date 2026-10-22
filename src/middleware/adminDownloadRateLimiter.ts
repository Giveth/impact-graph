import { rateLimit, Store } from 'express-rate-limit';

export const createAdminDownloadRateLimiter = (store: Store) =>
  rateLimit({
    store,
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many download requests. Try again in a minute.' },
  });
