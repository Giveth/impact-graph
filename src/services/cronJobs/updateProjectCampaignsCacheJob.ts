import config from '../../config';
import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import { isTestEnv } from '../../utils/utils';
import { ModuleThread, Pool, spawn, Worker } from 'threads';
import { CacheProjectCampaignsWorker } from '../../workers/cacheProjectCampaignsWorker';

// every 10 minutes
const cronJobTime =
  (config.get('CACHE_PROJECT_CAMPAIGNS_CRONJOB_EXPRESSION') as string) ||
  '0 */5 * * *';

const projectsFiltersThreadPool: Pool<
  ModuleThread<CacheProjectCampaignsWorker>
> = Pool(
  () => spawn(new Worker('../../workers/cacheProjectCampaignsWorker')), // create the worker,
);
export const runUpdateProjectCampaignsCacheJob = () => {
  // Run it first time to make sure it is cached
  projectsFiltersThreadPool.queue(async worker => {
    await worker.cacheSlugsOfCampaignProjects();
  });

  logger.debug(
    'runUpdateProjectCampaignsCacheJob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    try {
      projectsFiltersThreadPool.queue(async worker => {
        await worker.cacheSlugsOfCampaignProjects();
      });
    } catch (e) {
      logger.error('runUpdateProjectCampaignsCacheJob() error', e);
    }
  });
};
