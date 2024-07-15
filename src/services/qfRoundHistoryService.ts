import { AppDataSource } from '../orm.js';

export const getQfRoundHistoriesThatDontHaveRelatedDonations = async () => {
  return AppDataSource.getDataSource().query(
    `
              SELECT q.*
              FROM qf_round_history q
              LEFT JOIN donation d 
              ON q."txHash" = d."txHash"
              AND q."projectId" = d."projectId"
              AND d.distributedFundQfRoundId IS NOT NULL
              WHERE d.id IS NULL;

    `,
  );
};
