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

    // Get active causes with wallet addresses
    const activeCauses = await getActiveCausesWithWalletAddresses();

    logger.info(
      `Found ${activeCauses.length} active causes with wallet addresses`,
    );

    if (activeCauses.length === 0) {
      logger.info('No eligible causes found for distribution');
      return;
    }

    let totalProcessedCauses = 0;
    let totalProcessedProjects = 0;
    let successfulCauses = 0;
    let failedCauses = 0;

    // Process causes in batches to avoid memory issues
    const batchSize = 5;
    for (let i = 0; i < activeCauses.length; i += batchSize) {
      const batchCauses = activeCauses.slice(i, i + batchSize);

      // Get eligible projects for all causes in the batch with a single query
      const causeIds = batchCauses.map(cause => cause.id);
      const batchEligibleProjects =
        await getEligibleProjectsForCauses(causeIds);

      for (const cause of batchCauses) {
        const eligibleProjects = batchEligibleProjects.filter(
          project => project.causeId === cause.id,
        );

        if (eligibleProjects.length === 0) {
          logger.info(`No eligible projects found for cause ${cause.id}`);
          continue;
        }

        // Check if cause has been evaluated - if all projects have causeScore of 0, skip distribution
        const hasBeenEvaluated = eligibleProjects.some(
          project => project.score > 0,
        );

        if (!hasBeenEvaluated) {
          logger.info(
            `Cause ${cause.id} has not been evaluated yet (all projects have causeScore of 0), skipping distribution`,
          );
          continue;
        }

        // Create payload for this cause
        const distributionPayload: DistributionServicePayload = {
          walletAddress: cause.walletAddress!,
          causeId: cause.id,
          projects: eligibleProjects.map(p => ({
            projectId: p.projectId,
            name: p.name,
            slug: p.slug,
            walletAddress: p.walletAddress,
            score: p.score,
          })),
          causeOwnerAddress: cause.adminUser?.walletAddress || '',
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

// Function to get active causes with wallet addresses
export const getActiveCausesWithWalletAddresses = async (): Promise<
  Cause[]
> => {
  return await Cause.createQueryBuilder('cause')
    .select([
      'cause.id',
      'cause.walletAddress',
      'user.id',
      'user.walletAddress',
    ])
    .leftJoin('cause.adminUser', 'user')
    .where('cause.projectType = :projectType', { projectType: 'cause' })
    .andWhere('cause.statusId = :statusId', { statusId: ProjStatus.active })
    .andWhere('cause.walletAddress IS NOT NULL') // Filter out causes without wallet addresses
    .andWhere('cause.walletAddress != :emptyString', { emptyString: '' }) // Filter out empty string wallet addresses
    .getMany();
};

// Optimized function to get eligible projects for multiple causes in a single query
export const getEligibleProjectsForCauses = async (
  causeIds: number[],
): Promise<
  Array<{
    causeId: number;
    projectId: number;
    name: string;
    slug: string;
    walletAddress: string;
    score: number;
  }>
> => {
  if (causeIds.length === 0) {
    return [];
  }

  // Single optimized query that filters everything at the database level
  const results = await CauseProject.createQueryBuilder('causeProject')
    .select([
      'causeProject.causeId',
      'causeProject.causeScore',
      'project.id',
      'project.title',
      'project.slug',
      'addresses.address',
    ])
    .innerJoin('causeProject.project', 'project')
    .innerJoin(
      'project.addresses',
      'addresses',
      'addresses.networkId = :networkId AND addresses.isRecipient = :isRecipient',
      { networkId: NETWORK_IDS.POLYGON, isRecipient: true },
    )
    .where('causeProject.causeId IN (:...causeIds)', { causeIds })
    .andWhere('causeProject.isIncluded = :isIncluded', { isIncluded: true })
    .andWhere('project.verified = :verified', { verified: true })
    .andWhere('project.statusId = :statusId', { statusId: ProjStatus.active })
    .getMany();

  return results.map(causeProject => ({
    causeId: causeProject.causeId,
    projectId: causeProject.project.id,
    name: causeProject.project.title,
    slug: causeProject.project.slug || '',
    walletAddress: causeProject.project.addresses?.[0]?.address || '',
    score: causeProject.causeScore,
  }));
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
    '0 */3 * * *'; // every 3 hours at the 0th minute

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
