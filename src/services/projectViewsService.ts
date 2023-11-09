import { AppDataSource } from '../orm';
import { logger } from '../utils/logger';

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
