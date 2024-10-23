import { Brackets } from 'typeorm';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { QfRound } from '../entities/qfRound';
import { logger } from '../utils/logger';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';

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
  if (!qfRoundId && !earlyAccessRoundId) {
    throw new Error('No round specified on updateOrCreateProjectRoundRecord');
  }
  try {
    let query = Donation.createQueryBuilder('donation')
      .select('SUM(COALESCE(donation.amount))', 'totalDonationAmount')
      .addSelect('SUM(COALESCE(donation.valueUsd,0))', 'totalDonationUsdAmount')
      .where('donation.projectId = :projectId', { projectId })
      .andWhere('donation.status IN (:...status)', {
        status: [DONATION_STATUS.VERIFIED, DONATION_STATUS.PENDING],
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

    // If a new record was created, result will have one entry; if not, result will be empty

    const cumulativePastRoundsDonationAmounts =
      await getCumulativePastRoundsDonationAmounts({
        projectId,
        qfRoundId: qfRoundId || undefined,
        earlyAccessRoundId: earlyAccessRoundId || undefined,
      });

    const result = await ProjectRoundRecord.createQueryBuilder(
      'projectRoundRecord',
    )
      .insert()
      .values({
        projectId,
        qfRoundId,
        earlyAccessRoundId,
        totalDonationAmount: totalDonationAmount || 0,
        totalDonationUsdAmount: totalDonationUsdAmount || 0,
        cumulativePastRoundsDonationAmounts,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .orUpdate(
        [
          'totalDonationAmount',
          'totalDonationUsdAmount',
          'cumulativePastRoundsDonationAmounts',
          'updatedAt',
        ],
        ['projectId', qfRoundId ? 'qfRoundId' : 'earlyAccessRoundId'],
      )
      .execute();
    const prr = result.raw[0];

    logger.info(`ProjectRoundRecord updated for project ${projectId}`);

    return prr;
  } catch (error) {
    logger.error('Error updating or creating ProjectRoundRecord:', error);
    logger.error('Paramse:', {
      projectId,
      qfRoundId,
      earlyAccessRoundId,
    });
    throw new Error(
      `Failed to update or create ProjectRoundRecord, ${error.message}`,
    );
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
      throw new Error(
        i18n.__(translationErrorMessagesKeys.ROUND_HAS_NOT_STARTED),
      );
    }
  } else if (qfRoundId) {
    round = await QfRound.findOneBy({ id: qfRoundId });
    if (!round?.beginDate || round.beginDate > new Date()) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.ROUND_HAS_NOT_STARTED),
      );
    }
  } else {
    // No round specified
    throw new Error(i18n.__(translationErrorMessagesKeys.NO_ROUND_SPECIFIED));
  }

  const roundNumber = round!.roundNumber;
  try {
    let query = Donation.createQueryBuilder('donation')
      .select(
        'ROUND(CAST(SUM(donation.amount) as NUMERIC), 2)',
        'cumulativePastRoundsDonationAmounts',
      )
      .where('donation.projectId = :projectId', { projectId })
      .andWhere('donation.status IN (:...status)', {
        status: [DONATION_STATUS.VERIFIED, DONATION_STATUS.PENDING],
      });

    if (earlyAccessRoundId) {
      query = query
        .leftJoin('donation.earlyAccessRound', 'earlyAccessRound')
        .andWhere('earlyAccessRound.roundNumber < :roundNumber', {
          roundNumber,
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
