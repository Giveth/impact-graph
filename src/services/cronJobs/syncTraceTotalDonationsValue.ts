import { Donation } from '../../entities/donation';
import { schedule } from 'node-cron';
import { fetchGivHistoricPrice } from '../givPriceService';
import { convertExponentialNumber } from '../../utils/utils';
import { updateTotalDonationsOfProject } from '../donationService';
import { logger } from '../../utils/logger';
import config from '../../config';
import { Project } from '../../entities/project';
import { getCampaignTotalDonationsInUsd } from '../trace/traceService';

// */10 * * * * means every 10 minutes
const cronJobTime =
  (config.get(
    'UPDATE_TRACEBLE_PROJECT_DONATIONS_CRONJOB_EXPRESSION',
  ) as string) || '*/10 * * * *';

export const runUpdateTraceableProjectsTotalDonations = () => {
  logger.debug('runUpdateTraceableProjectsTotalDonations() has been called');
  schedule(cronJobTime, async () => {
    await updateTraceableProjectsTotalDonations();
  });
};

const updateTraceableProjectsTotalDonations = async () => {
  logger.debug('updateTraceableProjectsTotalDonations has been called');
  const projects = await Project.createQueryBuilder('project')
    .where(`"traceCampaignId" IS NOT NULL `)
    .getMany();
  for (const project of projects) {
    const traceCampaignId = project.traceCampaignId as string;
    try {
      project.totalTraceDonations = await getCampaignTotalDonationsInUsd(
        traceCampaignId,
      );
      await project.save();
    } catch (e) {
      logger.error('Fail get trace donations of project', {
        projectId: project.id,
        traceCampaignId,
      });
    }
  }
};
