import { DONATION_STATUS } from '../entities/donation';
import { ProjectUserRecord } from '../entities/projectUserRecord';

export async function updateOrCreateProjectUserRecord({
  projectId,
  userId,
  qfRoundId,
}: {
  projectId: number;
  userId: number;
  qfRoundId?: number;
}): Promise<ProjectUserRecord> {
  let query = `
  INSERT INTO project_user_record ("projectId", "userId", "qfRoundId", "eaTotalDonationAmount", "qfTotalDonationAmount", "totalDonationAmount")
  SELECT 
    $1 AS projectId, 
    $2 AS userId,
    $3 AS qfRoundId,
    COALESCE(SUM(CASE WHEN donation."earlyAccessRoundId" IS NOT NULL THEN donation.amount ELSE 0 END), 0) AS eaTotalDonationAmount,
    COALESCE(SUM(CASE WHEN donation."qfRoundId" IS NOT NULL THEN donation.amount ELSE 0 END), 0) AS qfTotalDonationAmount,
    COALESCE(SUM(CASE WHEN ((donation."earlyAccessRoundId" IS NOT NULL) OR (donation."qfRoundId" IS NOT NULL)) THEN donation.amount ELSE 0 END), 0) AS totalDonationAmount
  FROM donation
  WHERE donation."projectId" = $1 
    AND donation."userId" = $2
    AND donation.status = ANY($4)
  `;

  if (qfRoundId) {
    query += ` AND donation."qfRoundId" = $3`;
  }

  query += `
  ON CONFLICT ("projectId", "userId", "qfRoundId") DO UPDATE 
  SET 
    "eaTotalDonationAmount" = EXCLUDED."eaTotalDonationAmount",
    "qfTotalDonationAmount" = EXCLUDED."qfTotalDonationAmount",
    "totalDonationAmount" = EXCLUDED."totalDonationAmount"
  RETURNING *;
`;

  const result = await ProjectUserRecord.query(query, [
    projectId,
    userId,
    qfRoundId || null,
    [DONATION_STATUS.VERIFIED, DONATION_STATUS.PENDING],
  ]);

  return result[0];
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
