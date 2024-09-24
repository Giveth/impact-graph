import { ProjectDonationSummary } from '../entities/projectDonationSummary';
import { logger } from '../utils/logger';

/**
 * Create or update the donation summary for the specified project, QfRound, and EarlyAccessRound.
 *
 * @param projectId - ID of the project
 * @param qfRoundId - ID of the QF round (optional)
 * @param earlyAccessRoundId - ID of the Early Access round (optional)
 * @param donationAmount - Amount of the current donation
 * @param donationUsdAmount - USD amount of the current donation
 */
export async function updateOrCreateDonationSummary(
  projectId: number,
  donationAmount: number,
  donationUsdAmount: number,
  qfRoundId?: number | null,
  earlyAccessRoundId?: number | null,
): Promise<void> {
  try {
    const query = ProjectDonationSummary.createQueryBuilder(
      'projectDonationSummary',
    ).where(`projectDonationSummary.projectId = :projectId`, {
      projectId,
    });
    if (qfRoundId) {
      query.andWhere(`projectDonationSummary.qfRoundId = :qfRoundId`, {
        qfRoundId,
      });
    }
    if (earlyAccessRoundId) {
      query.andWhere(
        `projectDonationSummary.earlyAccessRoundId = :earlyAccessRoundId`,
        {
          earlyAccessRoundId,
        },
      );
    }
    let summary = await query.getOne();
    if (!summary) {
      summary = ProjectDonationSummary.create({
        projectId,
        qfRoundId,
        earlyAccessRoundId,
        totalDonationAmount: donationAmount,
        totalDonationUsdAmount: donationUsdAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      summary.totalDonationAmount += donationAmount;
      summary.totalDonationUsdAmount += donationUsdAmount;
      summary.updatedAt = new Date();
    }
    await ProjectDonationSummary.save(summary);
    logger.info(`ProjectDonationSummary updated for project ${projectId}`);
  } catch (error) {
    logger.error('Error updating or creating ProjectDonationSummary:', error);
    throw new Error('Failed to update or create ProjectDonationSummary');
  }
}

/**
 * Get the donation summary for a specific project, QfRound, and EarlyAccessRound.
 *
 * @param projectId - ID of the project
 * @param qfRoundId - ID of the QF round (optional)
 * @param earlyAccessRoundId - ID of the Early Access round (optional)
 * @returns ProjectDonationSummary object
 */
export async function getDonationSummary(
  projectId: number,
  qfRoundId?: number,
  earlyAccessRoundId?: number,
): Promise<ProjectDonationSummary[]> {
  return ProjectDonationSummary.find({
    where: { projectId, qfRoundId, earlyAccessRoundId },
  });
}
