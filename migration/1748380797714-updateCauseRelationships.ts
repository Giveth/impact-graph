import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCauseRelationships1748380797714
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to user table
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "ownedCausesCount" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "totalCausesRaised" float DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "totalCausesDistributed" float DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "totalCausesDonated" float DEFAULT 0;
    `);

    // Add new columns to project table
    await queryRunner.query(`
      ALTER TABLE "project"
      ADD COLUMN IF NOT EXISTS "activeCausesCount" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "totalCausesRaised" float DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "totalCausesDistributed" float DEFAULT 0;
    `);

    // Add new columns to cause table
    await queryRunner.query(`
      ALTER TABLE "cause"
      ADD COLUMN IF NOT EXISTS "activeProjectsCount" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "totalDistributed" float DEFAULT 0;
    `);

    // Create many-to-many relationship table between project and cause
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_causes_cause" (
        "projectId" integer NOT NULL,
        "causeId" integer NOT NULL,
        CONSTRAINT "PK_project_causes_cause" PRIMARY KEY ("projectId", "causeId"),
        CONSTRAINT "FK_project_causes_cause_project" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_causes_cause_cause" FOREIGN KEY ("causeId") REFERENCES "cause"("id") ON DELETE CASCADE
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_causes_cause_project" ON "project_causes_cause" ("projectId");
      CREATE INDEX IF NOT EXISTS "IDX_project_causes_cause_cause" ON "project_causes_cause" ("causeId");
    `);

    // Migrate existing single cause relationships to many-to-many
    await queryRunner.query(`
      INSERT INTO "project_causes_cause" ("projectId", "causeId")
      SELECT "id", "causeId"
      FROM "project"
      WHERE "causeId" IS NOT NULL;
    `);

    // Drop the old single cause relationship column
    await queryRunner.query(`
      ALTER TABLE "project"
      DROP COLUMN IF EXISTS "causeId";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the single cause relationship column
    await queryRunner.query(`
      ALTER TABLE "project"
      ADD COLUMN IF NOT EXISTS "causeId" integer;
    `);

    // Migrate back from many-to-many to single cause relationship
    await queryRunner.query(`
      UPDATE "project" p
      SET "causeId" = (
        SELECT "causeId"
        FROM "project_causes_cause" pcc
        WHERE pcc."projectId" = p.id
        LIMIT 1
      );
    `);

    // Drop the many-to-many relationship table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "project_causes_cause";
    `);

    // Remove new columns from user table
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "ownedCausesCount",
      DROP COLUMN IF EXISTS "totalCausesRaised",
      DROP COLUMN IF EXISTS "totalCausesDistributed",
      DROP COLUMN IF EXISTS "totalCausesDonated";
    `);

    // Remove new columns from project table
    await queryRunner.query(`
      ALTER TABLE "project"
      DROP COLUMN IF EXISTS "activeCausesCount",
      DROP COLUMN IF EXISTS "totalCausesRaised",
      DROP COLUMN IF EXISTS "totalCausesDistributed";
    `);

    // Remove new columns from cause table
    await queryRunner.query(`
      ALTER TABLE "cause"
      DROP COLUMN IF EXISTS "activeProjectsCount",
      DROP COLUMN IF EXISTS "totalDistributed";
    `);
  }
}
