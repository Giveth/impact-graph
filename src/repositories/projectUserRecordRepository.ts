import { DONATION_STATUS } from '../entities/donation';
import { ProjectUserRecord } from '../entities/projectUserRecord';

export async function updateOrCreateProjectUserRecord({
  projectId,
  userId,
}: {
  projectId: number;
  userId: number;
}): Promise<ProjectUserRecord> {
  const result = await ProjectUserRecord.createQueryBuilder()
    .insert()
    .values({
      projectId,
      userId,
      eaTotalDonationAmount: () => `
      (SELECT COALESCE(SUM(CASE WHEN donation."earlyAccessRoundId" IS NOT NULL THEN donation.amount ELSE 0 END), 0)
      FROM donation
      WHERE donation."projectId" = :projectId AND donation.status = :status AND donation."userId" = :userId)
    `,
      qfTotalDonationAmount: () => `
      (SELECT COALESCE(SUM(CASE WHEN donation."qfRoundId" IS NOT NULL THEN donation.amount ELSE 0 END), 0)
      FROM donation
      WHERE donation."projectId" = :projectId AND donation.status = :status AND donation."userId" = :userId)
    `,
      totalDonationAmount: () => `
      (SELECT COALESCE(SUM(donation.amount), 0)
      FROM donation
      WHERE donation."projectId" = :projectId AND donation.status = :status AND donation."userId" = :userId)
    `,
    })
    .orUpdate(
      ['eaTotalDonationAmount', 'qfTotalDonationAmount', 'totalDonationAmount'],
      ['projectId', 'userId'],
    )
    .setParameters({ projectId, status: DONATION_STATUS.VERIFIED, userId })
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
