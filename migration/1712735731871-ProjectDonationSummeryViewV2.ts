import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectDonationSummeryViewV21712735731871
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        DROP MATERIALIZED VIEW IF EXISTS project_donation_summary_view;

        CREATE MATERIALIZED VIEW project_donation_summary_view AS
        WITH unique_donors AS (
          SELECT 
            d."projectId", 
            d."userId" 
          FROM 
            "donation" d
          WHERE 
            d."status" = 'verified' 
            AND d."recurringDonationId" IS NULL 
            AND d."valueUsd" > 0
          
          UNION
          
          SELECT 
            rd."projectId", 
            rd."donorId" AS "userId"
          FROM 
            "recurring_donation" rd
          WHERE 
            rd."status" = 'active'
        )
        SELECT
          d."projectId",
          SUM(CASE WHEN d."status" = 'verified' AND d."valueUsd" > 0 THEN d."valueUsd" ELSE 0 END) AS "sumVerifiedDonations",
          COUNT(DISTINCT u."userId") AS "uniqueDonorsCount"
        FROM
          "donation" d
        JOIN
          unique_donors u ON d."projectId" = u."projectId"
        GROUP BY
          d."projectId";
        
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
