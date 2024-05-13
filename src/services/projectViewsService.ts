import { QfRound } from '../entities/qfRound';
import { AppDataSource } from '../orm';
import { logger } from '../utils/logger';
import { QfRoundDonationRow } from './googleSheets';
import { ProjectActualMatchingView } from '../entities/ProjectActualMatchingView';

export const refreshProjectEstimatedMatchingView = async (): Promise<void> => {
  logger.debug('Refresh project_estimated_matching_view materialized view');
  try {
    return AppDataSource.getDataSource().query(
      `
        REFRESH MATERIALIZED VIEW project_estimated_matching_view
      `,
    );
  } catch (e) {
    logger.error('refreshProjectEstimatedMatchingView() error', e);
  }
};

export const refreshProjectActualMatchingView = async (): Promise<void> => {
  logger.debug('Refresh project_actual_matching_view materialized view');
  try {
    return AppDataSource.getDataSource().query(
      `
        REFRESH MATERIALIZED VIEW project_actual_matching_view
      `,
    );
  } catch (e) {
    logger.error('refreshProjectActualMatchingView() error', e);
  }
};

export const refreshProjectDonationSummaryView = async (): Promise<void> => {
  try {
    logger.debug('Refresh project_donation_summary_view materialized view');
    return AppDataSource.getDataSource().query(
      `
        REFRESH MATERIALIZED VIEW project_donation_summary_view
      `,
    );
  } catch (e) {
    logger.error('refreshProjectDonationSummaryView() error', e);
  }
};

export const getQfRoundActualDonationDetails = async (
  qfRoundId: number,
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
        ORDER BY "donationsSqrtRootSumSquared" DESC NULLS LAST
    `)) as ProjectActualMatchingView[];
    const totalReward = qfRound!.allocatedFund;
    const maxRewardShare = Number(qfRound?.maximumReward || 0.2);
    const totalWeight = rows.reduce((accumulator, currentRow) => {
      return accumulator + currentRow.donationsSqrtRootSumSquared;
    }, 0);
    const fundingCap = totalReward * maxRewardShare;
    let remainingWeight = totalWeight;
    let remainingFunds = totalReward;

    const result = [] as ProjectActualMatchingView[];
    // Fill rows for those weight are more than maxRewardShare
    for (const row of rows) {
      const matchingFund =
        (row.donationsSqrtRootSumSquared / remainingWeight) * remainingFunds;
      if (matchingFund >= fundingCap) {
        remainingWeight -= row.donationsSqrtRootSumSquared;
        remainingFunds -= fundingCap;
        row.actualMatching = fundingCap;
        result.push(row);
      }
    }

    for (const row of rows) {
      const matchingFund =
        (row.donationsSqrtRootSumSquared / remainingWeight) * remainingFunds;

      // Avoid matching the same over the cap rows
      if (matchingFund < fundingCap) {
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
        projectOwnerEmail: row?.email, // can be empty for new users
      };
    });
    logger.debug(
      'Data that we should upload to Google sheet',
      qfRoundDonationsRows,
    );

    return qfRoundDonationsRows;
  } catch (e) {
    logger.error('getQfRoundActualDonationDetails error', e);
    throw e;
  }
};
