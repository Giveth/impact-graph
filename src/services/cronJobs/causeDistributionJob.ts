import cron from 'node-cron';
import { Cause, CauseProject, ProjStatus } from '../../entities/project';
import { NETWORK_IDS } from '../../provider';
import { logger } from '../../utils/logger';
import config from '../../config';
import {
  AgentDistributionService,
  DistributionServicePayload,
} from '../agentDistributionService';

export const runCauseDistributionJob = async (): Promise<void> => {
  try {
    logger.info('Starting cause distribution job');

    // Get all active causes
    const activeCauses = await Cause.createQueryBuilder('cause')
      .leftJoinAndSelect('causeProjects.project', 'project')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.status', 'status')
      .where('cause.projectType = :projectType', { projectType: 'cause' })
      .andWhere('cause.statusId = :statusId', { statusId: ProjStatus.active })
      .getMany();

    logger.info(`Found ${activeCauses.length} active causes`);

    activeCauses.forEach(async cause => {
      cause.causeProjects = await cause.loadCauseProjects();
    });

    let totalProcessedCauses = 0;
    let totalProcessedProjects = 0;
    let successfulCauses = 0;
    let failedCauses = 0;

    for (const cause of activeCauses) {
      if (!cause.walletAddress) {
        logger.warn(`Cause ${cause.id} has no wallet address, skipping`);
        continue;
      }

      // Get projects for this cause that meet the criteria
      const eligibleProjects = await getEligibleProjectsForCause(cause.id);

      if (eligibleProjects.length === 0) {
        logger.info(`No eligible projects found for cause ${cause.id}`);
        continue;
      }

      // Create payload for this cause
      const distributionPayload: DistributionServicePayload = {
        walletAddress: cause.walletAddress,
        causeId: cause.id,
        projects: eligibleProjects,
      };

      // Call the distribution service endpoint for this cause
      const success =
        await AgentDistributionService.callDistributionService(
          distributionPayload,
        );

      if (success) {
        successfulCauses++;
        logger.info(
          `Successfully processed cause ${cause.id} with ${eligibleProjects.length} projects`,
        );
      } else {
        failedCauses++;
        logger.warn(
          `Failed to process cause ${cause.id} with ${eligibleProjects.length} projects`,
        );
      }

      totalProcessedCauses++;
      totalProcessedProjects += eligibleProjects.length;
    }

    if (totalProcessedCauses === 0) {
      logger.info('No eligible causes found for distribution');
      return;
    }

    logger.info('Cause distribution job completed', {
      totalCauses: totalProcessedCauses,
      successfulCauses,
      failedCauses,
      totalProjects: totalProcessedProjects,
    });
  } catch (error) {
    logger.error('Cause distribution job failed', { error });
    throw error;
  }
};

export const getEligibleProjectsForCause = async (
  causeId: number,
): Promise<
  Array<{
    projectId: number;
    name: string;
    slug: string;
    walletAddress: string;
    score: number;
  }>
> => {
  // Get all projects for this cause with their addresses and status
  const causeProjects = await CauseProject.createQueryBuilder('causeProject')
    .leftJoinAndSelect('causeProject.project', 'project')
    .leftJoinAndSelect('project.addresses', 'addresses')
    .leftJoinAndSelect('project.status', 'status')
    .where('causeProject.causeId = :causeId', { causeId })
    .andWhere('causeProject.isIncluded = :isIncluded', { isIncluded: true })
    .getMany();

  const eligibleProjects: Array<{
    projectId: number;
    name: string;
    slug: string;
    walletAddress: string;
    score: number;
  }> = [];

  for (const causeProject of causeProjects) {
    const project = causeProject.project;

    // Skip projects that don't meet the criteria
    if (
      !project.verified || // Not verified
      project.statusId !== ProjStatus.active || // Not active (deactivated, cancelled, etc.)
      !project.addresses || // No addresses
      project.addresses.length === 0
    ) {
      continue;
    }

    // Find Polygon recipient address
    const polygonAddress = project.addresses.find(
      address =>
        address.networkId === NETWORK_IDS.POLYGON &&
        address.isRecipient === true,
    );

    if (!polygonAddress) {
      // Skip projects without Polygon address
      continue;
    }

    eligibleProjects.push({
      projectId: project.id,
      name: project.title,
      slug: project.slug || '',
      walletAddress: polygonAddress.address,
      score: causeProject.causeScore,
    });
  }

  return eligibleProjects;
};

export const scheduleCauseDistributionJob = (): void => {
  const enableCauseDistributionJob =
    config.get('ENABLE_CAUSE_DISTRIBUTION_JOB') === 'true';

  if (!enableCauseDistributionJob) {
    logger.info('Cause distribution job is disabled');
    return;
  }

  const cronJobTime =
    (config.get('CAUSE_DISTRIBUTION_CRONJOB_EXPRESSION') as string) ||
    '0 */3 * * *'; // every 3 hours

  cron.schedule(cronJobTime, async () => {
    try {
      logger.info('Scheduled cause distribution job starting');
      await runCauseDistributionJob();
      logger.info('Scheduled cause distribution job completed');
    } catch (error) {
      logger.error('Scheduled cause distribution job failed', { error });
    }
  });

  logger.info(
    `Cause distribution job scheduled with expression: ${cronJobTime}`,
  );
};
