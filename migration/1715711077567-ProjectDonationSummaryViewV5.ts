import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectDonationSummaryViewV51715711077567
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            -- Create necessary indexes for optimization before creating the materialized view
            CREATE INDEX IF NOT EXISTS idx_donation_project_user ON donation("projectId", "userId", "valueUsd") WHERE "status" = 'verified' AND "recurringDonationId" IS NULL;
            CREATE INDEX IF NOT EXISTS idx_recurring_donation_project_donor ON recurring_donation("projectId", "donorId") WHERE "status" IN ('active', 'ended');
            CREATE INDEX IF NOT EXISTS idx_project_total_donations ON project("id");
    
            -- Drop existing materialized view if it exists
            DROP MATERIALIZED VIEW IF EXISTS project_donation_summary_view;
    
            -- Create optimized materialized view
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
                  "status" IN ('active', 'ended')
            )
            SELECT
              u."projectId",
              (SELECT "totalDonations" FROM "project" WHERE "id" = u."projectId") AS "sumVerifiedDonations",
              COUNT(DISTINCT u."userId") AS "uniqueDonorsCount"
            FROM
              unique_donors u
            GROUP BY
              u."projectId";
            
            -- Create an index on the materialized view to improve lookup performance
            CREATE INDEX idx_project_donation_summary_project_id ON project_donation_summary_view USING hash ("projectId");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DROP MATERIALIZED VIEW project_donation_summary_view;
          `,
    );
  }
}
