import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdToProjectQfRound1779182511001 implements MigrationInterface {
  name = 'AddIdToProjectQfRound1779182511001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Try to drop primary key constraints with common names first
    const commonConstraintNames = [
      'pk_project_qf_rounds_qf_round',
      'project_qf_rounds_qf_round_pkey',
      'PK_project_qf_rounds_qf_round',
    ];

    for (const constraintName of commonConstraintNames) {
      try {
        await queryRunner.query(`
          ALTER TABLE "project_qf_rounds_qf_round" 
          DROP CONSTRAINT IF EXISTS "${constraintName}"
        `);
      } catch (error) {
        // Continue to next constraint name if this fails
        continue;
      }
    }

    // Then try to find and drop any remaining primary key constraints
    try {
      await queryRunner.query(`
        DO $$ 
        DECLARE
          constraint_name TEXT;
        BEGIN
          -- Get all primary key constraint names for this table
          SELECT conname INTO constraint_name
          FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'project_qf_rounds_qf_round' 
          AND c.contype = 'p'
          LIMIT 1;
        
          IF constraint_name IS NOT NULL THEN
            -- Try a direct drop first
            BEGIN
              EXECUTE 'ALTER TABLE project_qf_rounds_qf_round DROP CONSTRAINT ' || constraint_name;
            EXCEPTION 
              WHEN OTHERS THEN
                -- If it fails, just continue - constraint might not exist
                NULL;
            END;
          END IF;
        END $$;
      `);
    } catch (error) {
      // If the whole DO block fails, continue - table might not have constraints
      // silently continue
    }

    // Add id column as primary key
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "project_qf_rounds_qf_round" 
      ADD COLUMN IF NOT EXISTS "id" SERIAL PRIMARY KEY
    `);

    // Add unique constraint on projectId and qfRoundId
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "project_qf_rounds_qf_round" 
      ADD CONSTRAINT IF NOT EXISTS "UQ_project_qf_rounds_composite" 
      UNIQUE ("projectId", "qfRoundId")
    `);

    // Add indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_qf_rounds_projectId" 
      ON "project_qf_rounds_qf_round" ("projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_qf_rounds_qfRoundId" 
      ON "project_qf_rounds_qf_round" ("qfRoundId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_project_qf_rounds_projectId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_project_qf_rounds_qfRoundId"
    `);

    // Drop unique constraint
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP CONSTRAINT IF EXISTS "UQ_project_qf_rounds_composite"
    `);

    // Drop id column (which includes dropping its primary key constraint)
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP COLUMN IF EXISTS "id"
    `);

    // Restore composite primary key
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "PK_project_qf_rounds_qf_round" 
      PRIMARY KEY ("projectId", "qfRoundId")
    `);
  }
}
