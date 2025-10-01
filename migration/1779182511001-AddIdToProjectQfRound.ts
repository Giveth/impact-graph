import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdToProjectQfRound1779182511001 implements MigrationInterface {
  name = 'AddIdToProjectQfRound1779182511001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if the table exists and get the current primary key constraint name
    const tableExists = await queryRunner.hasTable('project_qf_rounds_qf_round');
    if (!tableExists) {
      throw new Error('Table project_qf_rounds_qf_round does not exist');
    }

    // Get the current primary key constraint name
    const primaryKeyQuery = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'project_qf_rounds_qf_round' 
      AND constraint_type = 'PRIMARY KEY'
    `);

    const primaryKeyName = primaryKeyQuery[0]?.constraint_name || 'PK_project_qf_rounds_qf_round';

    // Drop the existing composite primary key
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP CONSTRAINT "${primaryKeyName}"
    `);

    // Add the new id column as auto-incrementing primary key
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD COLUMN "id" SERIAL PRIMARY KEY
    `);

    // Add unique constraint on the composite key to maintain uniqueness
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "project_qf_rounds_qf_round" 
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
      ALTER TABLE IF EXISTS "project_qf_rounds_qf_round" 
      DROP CONSTRAINT IF EXISTS "UQ_project_qf_rounds_composite"
    `);

    // Get the current primary key constraint name for the id column
    const primaryKeyQuery = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'project_qf_rounds_qf_round' 
      AND constraint_type = 'PRIMARY KEY'
    `);

    const primaryKeyName = primaryKeyQuery[0]?.constraint_name;

    if (primaryKeyName) {
      // Drop the id primary key constraint
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "project_qf_rounds_qf_round" 
        DROP CONSTRAINT "${primaryKeyName}"
      `);
    }

    // Drop the id column
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "project_qf_rounds_qf_round" 
      DROP COLUMN IF EXISTS "id"
    `);

    // Restore the composite primary key
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "PK_project_qf_rounds_qf_round" 
      PRIMARY KEY ("projectId", "qfRoundId")
    `);
  }
}
