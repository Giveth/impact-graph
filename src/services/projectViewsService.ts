import { AppDataSource } from '../orm';

export const refreshProjectEstimatedMatchingView = async (): Promise<void> => {
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW project_estimated_matching_view
    `,
  );
};

export const refreshProjectDonationSummaryView = async (): Promise<void> => {
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW project_donation_summary_view
    `,
  );
};
