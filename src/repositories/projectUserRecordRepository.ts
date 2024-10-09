import { Donation, DONATION_STATUS } from '../entities/donation';
import { ProjectUserRecord } from '../entities/projectUserRecord';

export async function updateOrCreateProjectUserRecord({
  projectId,
  userId,
}: {
  projectId: number;
  userId: number;
}): Promise<ProjectUserRecord> {
  const { eaTotalDonationAmount, qfTotalDonationAmount, totalDonationAmount } =
    await Donation.createQueryBuilder('donation')
      .select('SUM(donation.amount)', 'totalDonationAmount')
      // Sum eaTotalDonationAmount if earlyAccessRoundId is not null
      .addSelect(
        'SUM(CASE WHEN donation.earlyAccessRoundId IS NOT NULL THEN donation.amount ELSE 0 END)',
        'eaTotalDonationAmount',
      )
      .addSelect(
        'SUM(CASE WHEN donation.qfRoundId IS NOT NULL THEN donation.amount ELSE 0 END)',
        'qfTotalDonationAmount',
      )
      .where('donation.projectId = :projectId', { projectId })
      .andWhere('donation.status = :status', {
        status: DONATION_STATUS.VERIFIED,
      })
      .andWhere('donation.userId = :userId', { userId })
      .getRawOne();

  // Create or update ProjectUserRecord using onConflict
  const result = await ProjectUserRecord.createQueryBuilder()
    .insert()
    .values({
      projectId,
      userId,
      eaTotalDonationAmount: eaTotalDonationAmount || 0,
      qfTotalDonationAmount: qfTotalDonationAmount || 0,
      totalDonationAmount: totalDonationAmount || 0,
    })
    .orUpdate(
      ['eaTotalDonationAmount', 'qfTotalDonationAmount', 'totalDonationAmount'],
      ['projectId', 'userId'],
    )
    .execute();
  return result.raw[0];
}

export type ProjectUserRecordAmounts = Pick<
  ProjectUserRecord,
  'totalDonationAmount' | 'eaTotalDonationAmount' | 'qfTotalDonationAmount'
>;
export async function getProjectUserRecordAmount({
  projectId,
  userId,
}: {
  projectId: number;
  userId: number;
}): Promise<ProjectUserRecordAmounts> {
  const record = await ProjectUserRecord.findOneBy({ projectId, userId });
  return {
    totalDonationAmount: record?.totalDonationAmount || 0,
    eaTotalDonationAmount: record?.eaTotalDonationAmount || 0,
    qfTotalDonationAmount: record?.qfTotalDonationAmount || 0,
  };
}
