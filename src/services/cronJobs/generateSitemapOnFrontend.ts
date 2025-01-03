/**
 * This cron job is responsible for generating sitemap on frontend.
 *
 * It sends a request to frontend to generate sitemap.
 *
 * It is scheduled to run every Sunday at 00:00.
 *
 * It use SITEMAP_CRON_SECRET that is set in .env file and MUST be the same on frontend!
 */
import { schedule } from 'node-cron';
import axios from 'axios';
import { logger } from '../../utils/logger';

const cronJobTime = '0 0 * * 0'; // Every Sunday at 00:00

export const runGenerateSitemapOnFrontend = () => {
  logger.debug(
    'runGenerateSitemapOnFrontend() has been called, cronJobTime:',
    cronJobTime,
  );

  schedule(cronJobTime, async () => {
    logger.debug('runGenerateSitemapOnFrontend() job has started');
    try {
      const response = await axios.get(
        `{process.env.FRONTEND_URL}/api/generate-sitemap`,
        {
          headers: {
            Authorization: `Bearer {process.env.SITEMAP_CRON_SECRET}`,
          },
        },
      );
      logger.info('runGenerateSitemapOnFrontend() response:', response.data);
    } catch (error) {
      logger.error('runGenerateSitemapOnFrontend() error:', error.message);
    }
    logger.debug('runGenerateSitemapOnFrontend() job has finished');
  });
};
