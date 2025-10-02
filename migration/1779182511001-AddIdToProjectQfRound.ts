import { MigrationInterface, QueryRunner } from 'typeorm';
import { logger } from '../src/utils/logger';

export class AddIdToProjectQfRound1779182511001 implements MigrationInterface {
  name = 'AddIdToProjectQfRound1779182511001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if the table exists and get the current primary key constraint name
    const tableExists = await queryRunner.hasTable(
      'project_qf_rounds_qf_round',
    );
    if (!tableExists) {
      throw new Error('Table project_qf_rounds_qf_round does not exist');
    }

    // Check if the id column already exists (migration already ran)
    const idColumnExists = await queryRunner.hasColumn(
      'project_qf_rounds_qf_round',
      'id',
    );

    if (idColumnExists) {
      return;
    }

    // Get all primary key constraints for this table
    const allConstraintsQuery = await queryRunner.query(`
      SELECT conname, contype
      FROM pg_constraint 
      WHERE conrelid = (
        SELECT oid 
        FROM pg_class 
        WHERE relname = 'project_qf_rounds_qf_round'
      ) AND contype = 'p'
    `);

    // Drop all primary key constraints
    for (const constraint of allConstraintsQuery) {
      try {
        await queryRunner.query(`
          ALTER TABLE "project_qf_rounds_qf_round" 
          DROP CONSTRAINT IF EXISTS "${constraint.conname}"
        `);
      } catch (error) {
        // Continue with other constraints
      }
    }

    // Also try to drop the standard constraint names that might exist
    const possibleConstraints = [
      'PK_046d515dee2988817725ec75ebf',
      'project_qf_rounds_qf_round_pkey',
      'PK_project_qf_rounds_qf_round',
    ];

    for (const constraintName of possibleConstraints) {
      try {
        await queryRunner.query(`
          ALTER TABLE "project_qf_rounds_qf_round" 
          DROP CONSTRAINT IF EXISTS "${constraintName}"
        `);
      } catch (error) {
        // Ignore errors for constraints that don't exist
      }
    }

    // PostgreSQL doesn't support column positioning, so we need to recreate the table
    // to have id as the first column
    await this.resetTableStructure(queryRunner);
  }

  // Emergency method to completely reset the table if needed
  private async resetTableStructure(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Backup existing data
    await queryRunner.query(`
      CREATE TEMP TABLE project_qf_rounds_backup AS 
      SELECT "projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt"
      FROM "project_qf_rounds_qf_round"
    `);

    // Step 2: Drop the problematic table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "project_qf_rounds_qf_round" CASCADE
    `);

    // Step 3: Recreate the table with proper structure
    await queryRunner.query(`
      CREATE TABLE "project_qf_rounds_qf_round" (
        "id" SERIAL PRIMARY KEY,
        "projectId" INTEGER NOT NULL,
        "qfRoundId" INTEGER NOT NULL,
        "sumDonationValueUsd" REAL DEFAULT 0,
        "countUniqueDonors" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "UQ_project_qf_rounds_composite" UNIQUE ("projectId", "qfRoundId")
      )
    `);

    // Step 4: Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_projectId" ON "project_qf_rounds_qf_round" ("projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_qfRoundId" ON "project_qf_rounds_qf_round" ("qfRoundId")
    `);

    // Step 5: Restore data with new auto-incrementing IDs
    await queryRunner.query(`
      INSERT INTO "project_qf_rounds_qf_round" ("projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt")
      SELECT "projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt"
      FROM project_qf_rounds_backup
    `);

    // Clean up
    await queryRunner.query(`DROP TABLE project_qf_rounds_backup`);
  }

  // Alternative method using the constraint fix approach
  private async fixConstraintsOnly(queryRunner: QueryRunner): Promise<void> {
    // Drop all possible primary key constraints
    const allConstraints = await queryRunner.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = (
        SELECT oid 
        FROM pg_class 
        WHERE relname = 'project_qf_rounds_qf_round'
      ) AND contype = 'p'
    `);

    for (const constraint of allConstraints) {
      try {
        await queryRunner.query(`
          ALTER TABLE "project_qf_rounds_qf_round" 
          DROP CONSTRAINT IF EXISTS "${constraint.conname}"
        `);
      } catch (error) {
        logger.error(`Error dropping constraint ${constraint.conname}:`, error);
      }
    }

    // Also try common constraint names
    const commonConstraints = [
      'PK_046d515dee2988817725ec75ebf',
      'project_qf_rounds_qf_round_pkey',
      'PK_project_qf_rounds_qf_round',
    ];

    for (const constraintName of commonConstraints) {
      try {
        await queryRunner.query(`
          ALTER TABLE "project_qf_rounds_qf_round" 
          DROP CONSTRAINT IF EXISTS "${constraintName}"
        `);
      } catch (error) {
        // Ignore errors for constraints that don't exist
      }
    }

    // Check if id column exists, if not add it
    const idColumnExists = await queryRunner.hasColumn(
      'project_qf_rounds_qf_round',
      'id',
    );

    if (!idColumnExists) {
      // First add the column as SERIAL (auto-incrementing)
      await queryRunner.query(`
        ALTER TABLE "project_qf_rounds_qf_round" ADD COLUMN id SERIAL
      `);

      // Then add the primary key constraint
      await queryRunner.query(`
        ALTER TABLE "project_qf_rounds_qf_round" 
        ADD CONSTRAINT "PK_project_qf_rounds_qf_round_id" PRIMARY KEY (id)
      `);
    } else {
      // Check if there are records without IDs (shouldn't happen with SERIAL)
      const recordsWithoutIdResult = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM "project_qf_rounds_qf_round" 
        WHERE id IS NULL
      `);
      const recordsWithoutId = recordsWithoutIdResult[0]?.count || 0;

      if (recordsWithoutId > 0) {
        // Fix records without ID
        await queryRunner.query(`
          UPDATE "project_qf_rounds_qf_round" 
          SET id = nextval(pg_get_serial_sequence('project_qf_rounds_qf_round', 'id'))
          WHERE id IS NULL
        `);
      }
    }

    // Add unique constraint if it doesn't exist
    const uniqueConstraintExists = await queryRunner.query(`
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE table_name = 'project_qf_rounds_qf_round' 
      AND constraint_name = 'UQ_project_qf_rounds_composite'
    `);

    if (!uniqueConstraintExists || uniqueConstraintExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "project_qf_rounds_qf_round" 
        ADD CONSTRAINT "UQ_project_qf_rounds_composite" 
        UNIQUE ("projectId", "qfRoundId")
      `);
    }

    // Add indexes if they don't exist
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
      try {
        // Drop the id primary key constraint
        await queryRunner.query(`
          ALTER TABLE "project_qf_rounds_qf_round" 
          DROP CONSTRAINT "${primaryKeyName}"
        `);
      } catch (error) {
        // Fallback with IF EXISTS
        await queryRunner.query(`
          ALTER TABLE "project_qf_rounds_qf_round" 
          DROP CONSTRAINT IF EXISTS "${primaryKeyName}"
        `);
      }
    } else {
      // Fallback: drop all possible primary key constraints
      await queryRunner.query(`
        ALTER TABLE "project_qf_rounds_qf_round" 
        DROP CONSTRAINT IF EXISTS "UQ_project_qf_rounds_qf_round"
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
