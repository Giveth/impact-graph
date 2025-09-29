import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeQfProjectsQueryIndexes1779182511000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for project_qf_rounds_qf_round table to optimize QF round filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_qf_rounds_qf_round_id" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "projectId")
    `);

    // Index for project_qf_rounds_qf_round table to optimize sumDonationValueUsd sorting
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_qf_rounds_sum_donation_desc" 
      ON "project_qf_rounds_qf_round" ("sumDonationValueUsd" DESC NULLS LAST)
      WHERE "sumDonationValueUsd" IS NOT NULL
    `);

    // Composite index for project_qf_rounds_qf_round with qfRoundId and sumDonationValueUsd
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_qf_rounds_qf_round_sum_donation" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "sumDonationValueUsd" DESC NULLS LAST)
    `);

    // Index for project_instant_power_view to optimize instant power sorting
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_instant_power_total_power_desc" 
      ON "project_instant_power_view" ("totalPower" DESC NULLS LAST)
      WHERE "totalPower" IS NOT NULL
    `);

    // Index for project_power_view to optimize power sorting
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_power_total_power_desc" 
      ON "project_power_view" ("totalPower" DESC NULLS LAST)
      WHERE "totalPower" IS NOT NULL
    `);

    // Index for project_power_view with powerRank
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_power_power_rank" 
      ON "project_power_view" ("powerRank")
      WHERE "powerRank" IS NOT NULL
    `);

    // Index for project_instant_power_view with powerRank
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_instant_power_power_rank" 
      ON "project_instant_power_view" ("powerRank")
      WHERE "powerRank" IS NOT NULL
    `);

    // Covering index for project table with QF-specific fields
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_qf_covering" 
      ON "project" ("statusId", "reviewStatus", "id", "title", "slug", "creationDate", "totalDonations", "isGivbackEligible", "verified", "adminUserId", "organizationId")
      WHERE "statusId" = 5 AND "reviewStatus" = 'Listed'
    `);

    // Index for project addresses join optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_address_project_id" 
      ON "project_address" ("projectId")
    `);

    // Index for user table optimization (adminUser join)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_id_covering" 
      ON "user" ("id", "walletAddress", "name", "firstName", "lastName", "url", "avatar", "totalDonated", "totalReceived", "passportScore", "passportStamps", "isEmailVerified", "ownedCausesCount", "totalCausesRaised", "totalCausesDistributed", "causesTotalEarned", "causesTotalEarnedUsdValue")
    `);

    // Index for organization table optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_organization_id_covering" 
      ON "organization" ("id", "name", "label", "website", "supportCustomTokens")
    `);

    // Index for project_status table optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_status_id_covering" 
      ON "project_status" ("id", "name", "description")
    `);

    // Partial index for active projects with QF round relations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_qf_active_projects" 
      ON "project" ("id", "isGivbackEligible", "verified", "creationDate", "totalDonations")
      WHERE "statusId" = 5 AND "reviewStatus" = 'Listed'
    `);

    // Index for complex sorting combinations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_qf_complex_sort" 
      ON "project" ("isGivbackEligible" DESC, "verified" DESC, "creationDate" DESC, "totalDonations" DESC)
      WHERE "statusId" = 5 AND "reviewStatus" = 'Listed'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_complex_sort"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_active_projects"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_status_id_covering"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_organization_id_covering"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_user_id_covering"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_address_project_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_covering"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_instant_power_power_rank"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_power_power_rank"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_power_total_power_desc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_instant_power_total_power_desc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_rounds_qf_round_sum_donation"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_rounds_sum_donation_desc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_rounds_qf_round_id"
    `);
  }
}
