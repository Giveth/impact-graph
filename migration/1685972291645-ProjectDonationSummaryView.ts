import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectDonationSummaryView1685972291645
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DROP MATERIALIZED VIEW IF EXISTS project_donation_summary_view;
      CREATE MATERIALIZED VIEW project_donation_summary_view AS
      SELECT
        "projectId",
        SUM(CASE WHEN "status" = 'verified' THEN "valueUsd" ELSE 0 END) as "sumVerifiedDonations",
        COUNT(DISTINCT CASE WHEN "status" = 'verified' THEN "userId" END) as "uniqueDonorsCount"
      FROM
        "donation"
      GROUP BY
        "projectId";
        
      CREATE INDEX idx_project_donation_summary_project_id ON project_donation_summary_view USING hash ("projectId");
    `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DROP MATERIALIZED VIEW project_donation_summary_view;
    `,
    );
  }
}
