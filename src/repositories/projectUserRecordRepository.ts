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
      // sum eaTotalDonationAmount if earlyAccessRoundId is not null
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

  let projectUserRecord = await ProjectUserRecord.findOneBy({
    projectId,
    userId,
  });

  if (!projectUserRecord) {
    projectUserRecord = ProjectUserRecord.create({
      projectId,
      userId,
    });
  }

  projectUserRecord.eaTotalDonationAmount = eaTotalDonationAmount || 0;
  projectUserRecord.qfTotalDonationAmount = qfTotalDonationAmount || 0;
  projectUserRecord.totalDonationAmount = totalDonationAmount || 0;

  return projectUserRecord.save();
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
