import { schedule } from 'node-cron';
import { logger } from '../../utils/logger';

// const cronJobTime = '0 0 * * *';
const cronJobTime = '0 0 * * * *'; // Every second

export const runCheckAndUpdateEndaomentProject = () => {
  logger.debug(
    'runCheckAndUpdateEndaomentProject() has been called, cronJobTime',
    cronJobTime,
  );

  console.log('tried');

  schedule(cronJobTime, async () => {
    logger.debug('runCheckAndUpdateEndaomentProject() has been started');
    try {
      console.log('tried');
    } catch (error) {
      logger.error('runCheckAndUpdateEndaomentProject() error', error);
    }
    logger.debug('runCheckAndUpdateEndaomentProject() has been finished');
  });
};
