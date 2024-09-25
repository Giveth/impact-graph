import { Donation, DONATION_STATUS } from '../entities/donation';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
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
export async function updateOrCreateProjectRoundRecord(
  projectId: number,
  qfRoundId?: number | null,
  earlyAccessRoundId?: number | null,
): Promise<ProjectRoundRecord> {
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

    let summary = await ProjectRoundRecord.findOneBy({
      projectId,
      qfRoundId: qfRoundId ?? undefined,
      earlyAccessRoundId: earlyAccessRoundId ?? undefined,
    });

    if (!summary) {
      summary = ProjectRoundRecord.create({
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

    const pds = await ProjectRoundRecord.save(summary);

    logger.info(`ProjectRoundRecord updated for project ${projectId}`);

    return pds;
  } catch (error) {
    logger.error('Error updating or creating ProjectRoundRecord:', error);
    throw new Error('Failed to update or create ProjectRoundRecord');
  }
}

/**
 * Get the donation summary for a specific project, QfRound, and EarlyAccessRound.
 *
 * @param projectId - ID of the project
 * @param qfRoundId - ID of the QF round (optional)
 * @param earlyAccessRoundId - ID of the Early Access round (optional)
 * @returns ProjectRoundRecord object
 */
export async function getProjectRoundRecord(
  projectId: number,
  qfRoundId?: number,
  earlyAccessRoundId?: number,
): Promise<ProjectRoundRecord[]> {
  return ProjectRoundRecord.find({
    where: { projectId, qfRoundId, earlyAccessRoundId },
  });
}

export async function updateCumulativePastDonations() {}
