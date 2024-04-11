import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectDonationSummeryViewV31712745858472
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DROP MATERIALIZED VIEW IF EXISTS project_donation_summary_view;

            CREATE MATERIALIZED VIEW project_donation_summary_view AS
            WITH unique_donors AS (
              SELECT 
                "projectId", 
                "userId" 
              FROM 
                "donation"
              WHERE 
                "status" = 'verified' 
                AND "recurringDonationId" IS NULL 
                AND "valueUsd" > 0
              
              UNION
              
              SELECT 
                "projectId", 
                "donorId" AS "userId"
              FROM 
                "recurring_donation"
              WHERE 
                "status" = 'active'
            )
            SELECT
              d."projectId",
              (SELECT "totalDonations" FROM "project" WHERE "id" = d."projectId") AS "sumVerifiedDonations",
              COUNT(DISTINCT u."userId") AS "uniqueDonorsCount"
            FROM
              unique_donors u
            JOIN
              "donation" d ON u."projectId" = d."projectId"
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
