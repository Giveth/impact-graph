import { schedule } from 'node-cron';

import { logger } from '../../utils/logger';
import config from '../../config';
import { fillIncompletePowerSnapshots } from '../powerSnapshotServices';

const cronJobTime =
  (config.get(
    'FILL_BLOCK_NUMBERS_OF_SNAPSHOTS_CRONJOB_EXPRESSION',
  ) as string) || '0 0 * * *';

export const runFillBlockNumbersOfSnapshotsCronjob = () => {
  logger.debug(
    'runFillBlockNumbersOfSnapshotsCronjob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    await fillIncompletePowerSnapshots();
  });
};
