// workers/auth.js
import { expose } from 'threads/worker';
import { WorkerModule } from 'threads/dist/types/worker';
import { cacheProjectCampaigns } from '../services/campaignService';

type ProjectsResolverWorkerFunctions = 'cacheSlugsOfCampaignProjects';

export type CacheProjectCampaignsWorker =
  WorkerModule<ProjectsResolverWorkerFunctions>;

const worker: CacheProjectCampaignsWorker = {
  async cacheSlugsOfCampaignProjects() {
    await cacheProjectCampaigns();
  },
};

expose(worker);
