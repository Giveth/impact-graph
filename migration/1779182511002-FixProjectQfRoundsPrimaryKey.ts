import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProjectQfRoundsPrimaryKey1779182511002
  implements MigrationInterface
{
  name = 'FixProjectQfRoundsPrimaryKey1779182511002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create temporary table with only id as primary key
    await queryRunner.query(`
      CREATE TABLE "project_qf_rounds_qf_round_temp" (
        "id" SERIAL NOT NULL,
        "projectId" integer NOT NULL,
        "qfRoundId" integer NOT NULL,
        "sumDonationValueUsd" DOUBLE PRECISION DEFAULT 0,
        "countUniqueDonors" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "PK_project_qf_rounds_qf_round_temp" PRIMARY KEY ("id")
      )
    `);

    // Copy all data from the old table to the temp table
    await queryRunner.query(`
      INSERT INTO "project_qf_rounds_qf_round_temp" 
      ("projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt")
      SELECT "projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt"
      FROM "project_qf_rounds_qf_round"
    `);

    // Drop the old table
    await queryRunner.query(`
      DROP TABLE "project_qf_rounds_qf_round"
    `);

    // Rename the temp table to the original name
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round_temp" 
      RENAME TO "project_qf_rounds_qf_round"
    `);

    // Rename the primary key constraint
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      RENAME CONSTRAINT "PK_project_qf_rounds_qf_round_temp" TO "PK_project_qf_rounds_qf_round"
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_projectId" 
      FOREIGN KEY ("projectId") 
      REFERENCES "project"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_qfRoundId" 
      FOREIGN KEY ("qfRoundId") 
      REFERENCES "qf_round"("id") 
      ON DELETE CASCADE
    `);

    // Recreate all indexes from the optimization migration
    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_id" 
      ON "project_qf_rounds_qf_round" ("id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_qf_round_id" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_sum_donation_desc" 
      ON "project_qf_rounds_qf_round" ("sumDonationValueUsd" DESC NULLS LAST)
      WHERE "sumDonationValueUsd" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_qf_round_sum_donation" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "sumDonationValueUsd" DESC NULLS LAST)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes first
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

    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP CONSTRAINT IF EXISTS "FK_qfRoundId"
    `);

    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP CONSTRAINT IF EXISTS "FK_projectId"
    `);

    // Create temporary table with composite primary key (original structure)
    await queryRunner.query(`
      CREATE TABLE "project_qf_rounds_qf_round_temp" (
        "projectId" integer NOT NULL,
        "qfRoundId" integer NOT NULL,
        "sumDonationValueUsd" DOUBLE PRECISION DEFAULT 0,
        "countUniqueDonors" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "id" SERIAL,
        CONSTRAINT "PK_project_qf_rounds_qf_round_temp" PRIMARY KEY ("projectId", "qfRoundId")
      )
    `);

    // Copy all data from the current table to the temp table
    await queryRunner.query(`
      INSERT INTO "project_qf_rounds_qf_round_temp" 
      ("projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt", "id")
      SELECT "projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt", "id"
      FROM "project_qf_rounds_qf_round"
    `);

    // Drop the current table
    await queryRunner.query(`
      DROP TABLE "project_qf_rounds_qf_round"
    `);

    // Rename the temp table to the original name
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round_temp" 
      RENAME TO "project_qf_rounds_qf_round"
    `);

    // Rename the primary key constraint
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      RENAME CONSTRAINT "PK_project_qf_rounds_qf_round_temp" TO "PK_project_qf_rounds_qf_round"
    `);

    // Recreate foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_projectId" 
      FOREIGN KEY ("projectId") 
      REFERENCES "project"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_qfRoundId" 
      FOREIGN KEY ("qfRoundId") 
      REFERENCES "qf_round"("id") 
      ON DELETE CASCADE
    `);

    // Recreate the id index
    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_id" 
      ON "project_qf_rounds_qf_round" ("id")
    `);

    // Recreate optimization indexes
    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_qf_round_id" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_sum_donation_desc" 
      ON "project_qf_rounds_qf_round" ("sumDonationValueUsd" DESC NULLS LAST)
      WHERE "sumDonationValueUsd" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_qf_round_sum_donation" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "sumDonationValueUsd" DESC NULLS LAST)
    `);
  }
}
