import { QfRound } from '../entities/qfRound';
import { AppDataSource } from '../orm';
import { logger } from '../utils/logger';
import { QfRoundDonationRow } from './googleSheets';

export const refreshProjectEstimatedMatchingView = async (): Promise<void> => {
  logger.debug('Refresh project_estimated_matching_view materialized view');
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW project_estimated_matching_view
    `,
  );
};

export const refreshProjectActualMatchingView = async (): Promise<void> => {
  logger.debug('Refresh project_actual_matching_view materialized view');
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW project_actual_matching_view
    `,
  );
};

export const refreshProjectDonationSummaryView = async (): Promise<void> => {
  logger.debug('Refresh project_donation_summary_view materialized view');
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW project_donation_summary_view
    `,
  );
};

export const getQfRoundActualDonationDetails = async (
  qfRoundId: Number,
): Promise<QfRoundDonationRow[]> => {
  const qfRound = await QfRound.createQueryBuilder('qfRound')
    .where('qfRound.id = :id', { id: qfRoundId })
    .getOne();

  if (!qfRoundId) return [];

  await refreshProjectActualMatchingView();

  const rows = await QfRound.query(`
      SELECT *
      FROM project_actual_matching_view
      WHERE "qfRoundId" = ${qfRoundId}
  `);

  let totalReward = qfRound!.allocatedFund;
  const qfRoundMaxReward =
    totalReward * Number(process.env.QF_ROUND_MAX_REWARD_PERCENTAGE || 0.2);
  let totalWeight = rows.reduce((accumulator, currentRow) => {
    return accumulator + currentRow.donationsSqrtRootSumSquared;
  }, 0);

  for (const row of rows) {
    const weight = row.donationsSqrtRootSumSquared;
    const reward = Math.min(
      (totalReward * weight) / totalWeight,
      qfRoundMaxReward,
    );
    row.actualMatching = reward;
    totalReward -= reward;
    totalWeight -= weight;
  }

  const qfRoundDonationsRows = rows.map(row => {
    return {
      projectName: row.title,
      addresses: row.networkAddresses,
      link: process.env.GIVETH_IO_DAPP_BASE_URL + '/' + row.slug,
      allUsdReceived: row.allUsdReceived,
      allUsdReceivedAfterSybilsAnalysis: row.allUsdReceivedAfterSybilsAnalysis,
      totalDonors: row.totalDonors,
      uniqueDonors: row.uniqueDonors,
      realMatchingFund: row.actualMatching,
    };
  });

  return qfRoundDonationsRows;
};
