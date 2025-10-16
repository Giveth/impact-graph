import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProjectQfRoundsPrimaryKey1779182511002
  implements MigrationInterface
{
  name = 'FixProjectQfRoundsPrimaryKey1779182511002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration only ensures required indexes exist on project_qf_rounds_qf_round table
    // It's safe to run multiple times (idempotent)

    // Create index on id if it doesn't exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_qf_rounds_id" 
      ON "project_qf_rounds_qf_round" ("id")
    `);

    // Create composite index on qfRoundId and projectId if it doesn't exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_qf_rounds_qf_round_id" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "projectId")
    `);

    // Create index on sumDonationValueUsd with DESC order if it doesn't exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_qf_rounds_sum_donation_desc" 
      ON "project_qf_rounds_qf_round" ("sumDonationValueUsd" DESC NULLS LAST)
      WHERE "sumDonationValueUsd" IS NOT NULL
    `);

    // Create composite index on qfRoundId and sumDonationValueUsd if it doesn't exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_qf_rounds_qf_round_sum_donation" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "sumDonationValueUsd" DESC NULLS LAST)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the indexes if they exist
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_rounds_qf_round_sum_donation"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_rounds_sum_donation_desc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_rounds_qf_round_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_project_qf_rounds_id"
    `);
  }
}
