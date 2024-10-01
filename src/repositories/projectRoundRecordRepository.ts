import { Brackets } from 'typeorm';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { QfRound } from '../entities/qfRound';
import { logger } from '../utils/logger';

/**
 * Create or update the donation summary for the specified project, QfRound, and EarlyAccessRound.
 *
 * @param projectId - ID of the project
 * @param qfRoundId - ID of the QF round (optional)
 * @param earlyAccessRoundId - ID of the Early Access round (optional)
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

    summary.totalDonationAmount = totalDonationAmount || 0;
    summary.totalDonationUsdAmount = totalDonationUsdAmount || 0;
    summary.updatedAt = new Date();
    summary.cumulativePastRoundsDonationAmounts =
      await getCumulativePastRoundsDonationAmounts({
        projectId,
        qfRoundId: qfRoundId || undefined,
        earlyAccessRoundId: earlyAccessRoundId || undefined,
      });

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

export async function getCumulativePastRoundsDonationAmounts({
  projectId,
  earlyAccessRoundId,
  qfRoundId,
}: {
  projectId: number;
  earlyAccessRoundId?: number;
  qfRoundId?: number;
}): Promise<number | null> {
  let round: EarlyAccessRound | QfRound | null;
  if (earlyAccessRoundId) {
    round = await EarlyAccessRound.findOneBy({ id: earlyAccessRoundId });
    if (!round?.startDate || round.startDate > new Date()) {
      return null;
    }
  } else if (qfRoundId) {
    round = await QfRound.findOneBy({ id: qfRoundId });
    if (!round?.beginDate || round.beginDate > new Date()) {
      return null;
    }
  } else {
    // No round specified
    return null;
  }

  try {
    let query = Donation.createQueryBuilder('donation')
      .select(
        'ROUND(CAST(SUM(donation.amount) as NUMERIC), 2)',
        'cumulativePastRoundsDonationAmounts',
      )
      .where('donation.projectId = :projectId', { projectId })
      .andWhere('donation.status = :status', {
        status: DONATION_STATUS.VERIFIED,
      });

    if (earlyAccessRoundId) {
      query = query
        .leftJoin('donation.earlyAccessRound', 'earlyAccessRound')
        .andWhere('earlyAccessRound.roundNumber < :roundNumber', {
          roundNumber: round!.roundNumber,
        });
    } else {
      // all early access rounds and all

      query = query.leftJoin('donation.qfRound', 'qfRound').andWhere(
        new Brackets(qb => {
          qb.orWhere('donation.earlyAccessRoundId IS NOT NULL').orWhere(
            'qfRound.roundNumber < :roundNumber',
            {
              roundNumber: round!.roundNumber,
            },
          );
        }),
      );
    }

    const { cumulativePastRoundsDonationAmounts } = await query.getRawOne();

    return parseFloat(cumulativePastRoundsDonationAmounts) || 0;
  } catch (error) {
    logger.error('Error getting cumulativePastRoundsDonationAmounts:', error);
    throw new Error('Failed to get cumulativePastRoundsDonationAmounts');
  }
}
