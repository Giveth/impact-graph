// workers/auth.js
import { expose } from 'threads/worker';
import { cacheProjectCampaigns } from '../services/campaignService.js';

const worker = {
  async cacheSlugsOfCampaignProjects() {
    await cacheProjectCampaigns();
  },
};

expose(worker);
