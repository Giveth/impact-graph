import { DONATION_STATUS } from '../entities/donation';
import { ProjectUserRecord } from '../entities/projectUserRecord';

export async function updateOrCreateProjectUserRecord({
  projectId,
  userId,
  seasonNumber,
}: {
  projectId: number;
  userId: number;
  seasonNumber?: number;
}): Promise<ProjectUserRecord> {
  let query = `
  INSERT INTO project_user_record ("projectId", "userId", "seasonNumber", "eaTotalDonationAmount", "qfTotalDonationAmount", "totalDonationAmount")
  SELECT 
    $1 AS projectId, 
    $2 AS userId,
    $3 AS seasonNumber,
    COALESCE(SUM(CASE WHEN donation."earlyAccessRoundId" IS NOT NULL THEN donation.amount ELSE 0 END), 0) AS eaTotalDonationAmount,
    COALESCE(SUM(CASE WHEN donation."qfRoundId" IS NOT NULL THEN donation.amount ELSE 0 END), 0) AS qfTotalDonationAmount,
    COALESCE(SUM(CASE WHEN ((donation."earlyAccessRoundId" IS NOT NULL) OR (donation."qfRoundId" IS NOT NULL)) THEN donation.amount ELSE 0 END), 0) AS totalDonationAmount
  FROM donation
  WHERE donation."projectId" = $1 
    AND donation."userId" = $2
    AND donation.status = ANY($4)
  `;

  if (seasonNumber) {
    query += ` AND (
      (donation."qfRoundId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM qf_round 
        WHERE qf_round.id = donation."qfRoundId" 
        AND qf_round."seasonNumber" = $3
      )) OR 
      (donation."earlyAccessRoundId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM early_access_round
        WHERE early_access_round.id = donation."earlyAccessRoundId"
        AND early_access_round."seasonNumber" = $3
      ))
    )`;
  }

  query += `
  ON CONFLICT ("projectId", "userId", "seasonNumber") DO UPDATE 
  SET 
    "eaTotalDonationAmount" = EXCLUDED."eaTotalDonationAmount",
    "qfTotalDonationAmount" = EXCLUDED."qfTotalDonationAmount",
    "totalDonationAmount" = EXCLUDED."totalDonationAmount"
  RETURNING *;
`;

  const result = await ProjectUserRecord.query(query, [
    projectId,
    userId,
    seasonNumber || null,
    [
      DONATION_STATUS.VERIFIED,
      DONATION_STATUS.PENDING,
      DONATION_STATUS.SWAP_PENDING,
    ],
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
  seasonNumber,
}: {
  projectId: number;
  userId: number;
  seasonNumber?: number;
}): Promise<ProjectUserRecordAmounts> {
  const record = await ProjectUserRecord.findOneBy({
    projectId,
    userId,
    seasonNumber,
  });
  return {
    totalDonationAmount: record?.totalDonationAmount || 0,
    eaTotalDonationAmount: record?.eaTotalDonationAmount || 0,
    qfTotalDonationAmount: record?.qfTotalDonationAmount || 0,
  };
}
