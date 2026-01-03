import config from '../config';
import { logger } from '../utils/logger';

const normalizeHostname = (value: string): string => {
  const raw = (value || '').trim();
  if (!raw) return '';

  // Accept hostnames ("localhost"), host:port ("localhost:3000") and full URLs.
  // For full URLs we rely on URL parsing; for bare hostnames we strip port/path.
  try {
    if (raw.includes('://')) {
      return new URL(raw).hostname.trim().toLowerCase();
    }
  } catch {
    // fall through to manual parsing
  }

  return raw
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .trim()
    .toLowerCase();
};

const getWhitelistHostnames = (): string[] => {
  const fromEnv = ((config.get('HOSTNAME_WHITELIST') as string) || '')
    .split(',')
    .map(normalizeHostname)
    .filter(Boolean);

  // Make local development work out-of-the-box even if env is misconfigured.
  const env = String(config.get('ENVIRONMENT') || '').toLowerCase();
  const isProd =
    env === 'production' ||
    process.env.NODE_ENV?.toLowerCase() === 'production';

  if (isProd) return fromEnv;

  return Array.from(new Set([...fromEnv, 'localhost', '127.0.0.1', '::1']));
};

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      // allow requests with no origin (like mobile apps, Curl, ...)
      return callback(null, true);
    }

    const whitelistHostnames = getWhitelistHostnames();

    let formattedOrigin = '';
    try {
      formattedOrigin = new URL(origin).hostname.toLowerCase();
    } catch {
      formattedOrigin = normalizeHostname(origin);
    }

    logger.info('formattedOrigin', formattedOrigin);
    logger.info('whitelistHostnames', whitelistHostnames);

    for (const allowedOrigin of whitelistHostnames) {
      // passing all subdomains of whitelist hosts, for instance x.vercel.app, x.giveth.io,...
      if (
        formattedOrigin === allowedOrigin ||
        formattedOrigin.endsWith(`.${allowedOrigin}`)
      ) {
        return callback(null, true);
      }
    }

    logger.error('CORS error', { whitelistHostnames, origin });
    callback(new Error('Not allowed by CORS'));
  },
};
