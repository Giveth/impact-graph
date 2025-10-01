import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdToProjectQfRound1779182511001 implements MigrationInterface {
  name = 'AddIdToProjectQfRound1779182511001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing composite primary key
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP CONSTRAINT IF EXISTS "PK_project_qf_rounds_qf_round"
    `);

    // Add the new id column as auto-incrementing primary key
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD COLUMN "id" SERIAL PRIMARY KEY
    `);

    // Add unique constraint on the composite key to maintain uniqueness
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "UQ_project_qf_rounds_composite" 
      UNIQUE ("projectId", "qfRoundId")
    `);

    // Add indexes on projectId and qfRoundId for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_projectId" 
      ON "project_qf_rounds_qf_round" ("projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_qfRoundId" 
      ON "project_qf_rounds_qf_round" ("qfRoundId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_project_qf_rounds_projectId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_project_qf_rounds_qfRoundId"
    `);

    // Drop the unique constraint
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP CONSTRAINT IF EXISTS "UQ_project_qf_rounds_composite"
    `);

    // Drop the id column (which is the primary key)
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP COLUMN IF EXISTS "id"
    `);

    // Restore the composite primary key
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "PK_project_qf_rounds_qf_round" 
      PRIMARY KEY ("projectId", "qfRoundId")
    `);
  }
}
