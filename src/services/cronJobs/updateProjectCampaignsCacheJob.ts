import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { cacheProjectCampaigns } from '../campaignService';

// every 10 minutes
const cronJobTime =
  (config.get('CACHE_PROJECT_CAMPAIGNS_CRONJOB_EXPRESSION') as string) ||
  '0 */5 * * * *';

// const projectsFiltersThreadPool: Pool<
//   ModuleThread<CacheProjectCampaignsWorker>
// > = Pool(
//   () => spawn(new Worker('../../workers/cacheProjectCampaignsWorker')), // create the worker,
// );
export const runUpdateProjectCampaignsCacheJob = async () => {
  logger.debug(
    'runUpdateProjectCampaignsCacheJob() has been called, cronJobTime',
    cronJobTime,
  );

  // I commented worker because it wasn't working so I changed it to call the function directly
  try {
    await cacheProjectCampaigns();
  } catch (e) {
    logger.error('runUpdateProjectCampaignsCacheJob() error', e);
  }

  // Run it first time to make sure it is cached
  // projectsFiltersThreadPool.queue(async worker => {
  //   await worker.cacheSlugsOfCampaignProjects();
  // });
  //
  schedule(cronJobTime, async () => {
    try {
      // projectsFiltersThreadPool.queue(async worker => {
      //   await worker.cacheSlugsOfCampaignProjects();
      // });
      await cacheProjectCampaigns();
    } catch (e) {
      logger.error('runUpdateProjectCampaignsCacheJob() error', e);
    }
  });
};
