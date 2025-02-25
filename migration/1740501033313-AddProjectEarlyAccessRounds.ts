import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectEarlyAccessRounds1740501033313
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project_early_access_rounds_early_access_round" ("projectId" integer NOT NULL, "earlyAccessRoundId" integer NOT NULL, CONSTRAINT "PK_project_early_access_rounds" PRIMARY KEY ("projectId", "earlyAccessRoundId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_early_access_rounds_project" ON "project_early_access_rounds_early_access_round" ("projectId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_early_access_rounds_round" ON "project_early_access_rounds_early_access_round" ("earlyAccessRoundId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" ADD CONSTRAINT "FK_project_early_access_rounds_project" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" ADD CONSTRAINT "FK_project_early_access_rounds_round" FOREIGN KEY ("earlyAccessRoundId") REFERENCES "early_access_round"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" DROP CONSTRAINT "FK_project_early_access_rounds_round"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" DROP CONSTRAINT "FK_project_early_access_rounds_project"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_early_access_rounds_round"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_early_access_rounds_project"`,
    );
    await queryRunner.query(
      `DROP TABLE "project_early_access_rounds_early_access_round"`,
    );
  }
}
