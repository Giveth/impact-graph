import config from '../config.js';
import { logger } from '../utils/logger.js';

const whitelistHostnames: string[] = (
  config.get('HOSTNAME_WHITELIST') as string
).split(',');

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      // allow requests with no origin (like mobile apps, Curl, ...)
      return callback(null, true);
    }

    // removing http:// , https://, and :port
    const formattedOrigin = origin
      .replace('https://', '')
      .replace('http://', '')
      .split(':')[0];

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
