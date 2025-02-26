import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQfRoundIdToProjectUserRecord1740426502676
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_project_user_record_project_user"`,
    );

    // Add qfRoundId column
    await queryRunner.query(
      `ALTER TABLE "project_user_record" ADD "qfRoundId" integer`,
    );

    // Add foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "project_user_record" ADD CONSTRAINT "FK_project_user_record_qf_round" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Create new composite unique index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_user_record_project_user_round" ON "project_user_record" ("projectId", "userId", "qfRoundId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_project_user_record_project_user_round"`,
    );

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "project_user_record" DROP CONSTRAINT "FK_project_user_record_qf_round"`,
    );

    // Drop qfRoundId column
    await queryRunner.query(
      `ALTER TABLE "project_user_record" DROP COLUMN "qfRoundId"`,
    );

    // Recreate original index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_user_record_project_user" ON "project_user_record" ("projectId", "userId")`,
    );
  }
}
