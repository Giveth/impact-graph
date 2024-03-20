import { QfRound } from '../entities/qfRound';
import { AppDataSource } from '../orm';
import { logger } from '../utils/logger';
import { QfRoundDonationRow } from './googleSheets';
import { ProjectActualMatchingView } from '../entities/ProjectActualMatchingView';

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
  try {
    const qfRound = await QfRound.createQueryBuilder('qfRound')
      .where('qfRound.id = :id', { id: qfRoundId })
      .getOne();

    if (!qfRoundId) return [];

    await refreshProjectActualMatchingView();

    const rows = (await ProjectActualMatchingView.query(`
        SELECT *
        FROM project_actual_matching_view
        WHERE "qfRoundId" = ${qfRoundId}
    `)) as ProjectActualMatchingView[];
    const totalReward = qfRound!.allocatedFund;
    const maxRewardShare = Number(qfRound?.maximumReward || 0.2);
    const totalWeight = rows.reduce((accumulator, currentRow) => {
      return accumulator + currentRow.donationsSqrtRootSumSquared;
    }, 0);
    const weightCap = totalWeight * maxRewardShare;
    const fundingCap = totalReward * maxRewardShare;
    const countOfProjectsWithMaxShare = rows.filter(currentRow => {
      return currentRow.donationsSqrtRootSumSquared >= weightCap;
    }).length;
    let remainingWeight = totalWeight;
    const remainingFunds =
      totalReward - countOfProjectsWithMaxShare * fundingCap;

    const result = [] as ProjectActualMatchingView[];
    // Fill rows for those wight are more than maxRewardShare
    for (const row of rows) {
      if (row.donationsSqrtRootSumSquared / totalWeight >= maxRewardShare) {
        remainingWeight -= row.donationsSqrtRootSumSquared;
        row.actualMatching = fundingCap;
        row.donationsSqrtRootSumSquared = weightCap;
        result.push(row);
      }
    }
    for (const row of rows) {
      if (row.donationsSqrtRootSumSquared / totalWeight < maxRewardShare) {
        row.actualMatching =
          (row.donationsSqrtRootSumSquared / remainingWeight) * remainingFunds;
        result.push(row);
      }
    }

    const qfRoundDonationsRows = rows.map(row => {
      return {
        projectName: row.title,
        addresses: row.networkAddresses,
        link: process.env.GIVETH_IO_DAPP_BASE_URL + '/project/' + row.slug,
        allUsdReceived: row.allUsdReceived,
        allUsdReceivedAfterSybilsAnalysis:
          row.allUsdReceivedAfterSybilsAnalysis,
        totalDonors: row.totalDonors,
        uniqueDonors: row.uniqueQualifiedDonors,
        realMatchingFund: row.actualMatching,
        projectWeight: row.donationsSqrtRootSumSquared,
        donationIdsBeforeAnalysis: row?.donationIdsBeforeAnalysis?.join('-'),
        donationIdsAfterAnalysis: row?.donationIdsAfterAnalysis?.join('-'),
        totalValuesOfUserDonationsAfterAnalysis:
          row?.totalValuesOfUserDonationsAfterAnalysis?.join('-'),
        uniqueUserIdsAfterAnalysis: row?.uniqueUserIdsAfterAnalysis?.join('-'),
      };
    });
    logger.info(
      'Data that we should upload to googlesheet',
      qfRoundDonationsRows,
    );

    return qfRoundDonationsRows;
  } catch (e) {
    logger.error('getQfRoundActualDonationDetails error', e);
    throw e;
  }
};
