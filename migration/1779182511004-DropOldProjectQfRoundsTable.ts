import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropOldProjectQfRoundsTable1779182511004
  implements MigrationInterface
{
  name = 'DropOldProjectQfRoundsTable1779182511004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old table with composite primary key
    await queryRunner.query(`
      DROP TABLE IF EXISTS "project_qf_rounds_qf_round" CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the old table structure (without data)
    // This is mainly for rollback capability
    await queryRunner.query(`
      CREATE TABLE "project_qf_rounds_qf_round" (
        "projectId" integer NOT NULL,
        "qfRoundId" integer NOT NULL,
        "sumDonationValueUsd" DOUBLE PRECISION DEFAULT 0,
        "countUniqueDonors" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL,
        CONSTRAINT "PK_project_qf_rounds_qf_round" PRIMARY KEY ("projectId", "qfRoundId")
      )
    `);

    // Create index on id
    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_id" 
      ON "project_qf_rounds_qf_round" ("id")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_project_qf_rounds_project" 
      FOREIGN KEY ("projectId") 
      REFERENCES "project"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_project_qf_rounds_qf_round" 
      FOREIGN KEY ("qfRoundId") 
      REFERENCES "qf_round"("id") 
      ON DELETE CASCADE
    `);

    // Copy data back from new table to old table
    await queryRunner.query(`
      INSERT INTO "project_qf_rounds_qf_round" 
        ("projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt")
      SELECT 
        "projectId", 
        "qfRoundId", 
        "sumDonationValueUsd", 
        "countUniqueDonors",
        "createdAt",
        "updatedAt"
      FROM "project_qf_round"
      ON CONFLICT ("projectId", "qfRoundId") DO NOTHING
    `);
  }
}
