import { Donation, DONATION_STATUS } from '../entities/donation';
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
  qfRoundId?: number | null,
  earlyAccessRoundId?: number | null,
): Promise<void> {
  try {
    let query = Donation.createQueryBuilder('donation')
      .select('SUM(donation.amount)', 'totalDonationAmount')
      .addSelect('SUM(donation.valueUsd)', 'totalDonationUsdAmount')
      .where('donation.projectId = :projectId', { projectId })
      .andWhere('donation.status = :status', {
        status: DONATION_STATUS.VERIFIED,
      });

    if (qfRoundId) {
      query = query.andWhere('donation.qfRoundId = :qfRoundId', { qfRoundId });
    }
    if (earlyAccessRoundId) {
      query = query.andWhere(
        'donation.earlyAccessRoundId = :earlyAccessRoundId',
        {
          earlyAccessRoundId,
        },
      );
    }

    const { totalDonationAmount, totalDonationUsdAmount } =
      await query.getRawOne();

    let summary = await ProjectDonationSummary.findOneBy({
      projectId,
      qfRoundId: qfRoundId ?? undefined,
      earlyAccessRoundId: earlyAccessRoundId ?? undefined,
    });

    if (!summary) {
      summary = ProjectDonationSummary.create({
        projectId,
        qfRoundId,
        earlyAccessRoundId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    summary.totalDonationAmount = totalDonationAmount;
    summary.totalDonationUsdAmount = totalDonationUsdAmount;
    summary.updatedAt = new Date();

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
