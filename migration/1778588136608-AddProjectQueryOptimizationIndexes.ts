import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectQueryOptimizationIndexes1778588136608
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Critical composite index for main WHERE clause (statusId + reviewStatus)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_status_review_status" 
      ON "project" ("statusId", "reviewStatus") 
      WHERE "statusId" = 1
    `);

    // Project type filtering index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_type_status_review" 
      ON "project" ("projectType", "statusId", "reviewStatus")
    `);

    // Sorting optimization indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_creation_date_desc" 
      ON "project" ("creationDate" DESC) 
      WHERE "statusId" = 1 AND "reviewStatus" = 'Listed'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_updated_at_desc" 
      ON "project" ("updatedAt" DESC) 
      WHERE "statusId" = 1 AND "reviewStatus" = 'Listed'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_total_donations_desc" 
      ON "project" ("totalDonations" DESC) 
      WHERE "statusId" = 1 AND "reviewStatus" = 'Listed'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_active_projects_count_desc" 
      ON "project" ("activeProjectsCount" DESC) 
      WHERE "statusId" = 1 AND "reviewStatus" = 'Listed'
    `);

    // Multi-column sorting index for complex sorting
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_complex_sorting" 
      ON "project" ("isGivbackEligible" DESC, "verified" DESC, "totalDonations" DESC) 
      WHERE "statusId" = 1 AND "reviewStatus" = 'Listed'
    `);

    // Category table optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_category_is_active" 
      ON "category" ("isActive") 
      WHERE "isActive" = true
    `);

    // Organization label filtering (for Recently Updated sorting)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_organization_label" 
      ON "organization" ("label")
    `);

    // Covering index for frequently selected columns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_covering" 
      ON "project" ("statusId", "reviewStatus", "projectType", "id", "title", "slug", "creationDate", "totalDonations", "isGivbackEligible", "verified", "updatedAt", "activeProjectsCount")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_covering"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_organization_label"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_category_is_active"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_complex_sorting"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_active_projects_count_desc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_total_donations_desc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_updated_at_desc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_creation_date_desc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_type_status_review"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_status_review_status"
    `);
  }
}
