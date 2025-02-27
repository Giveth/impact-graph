import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeasonNumberToProjectUserRecord1740426502676
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_project_user_record_project_user"`,
    );

    // Add seasonNumber column
    await queryRunner.query(
      `ALTER TABLE "project_user_record" ADD "seasonNumber" integer`,
    );

    // Create new composite unique index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_user_record_project_user_season" ON "project_user_record" ("projectId", "userId", "seasonNumber")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_project_user_record_project_user_season"`,
    );

    // Drop seasonNumber column
    await queryRunner.query(
      `ALTER TABLE "project_user_record" DROP COLUMN "seasonNumber"`,
    );

    // Recreate original index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_user_record_project_user" ON "project_user_record" ("projectId", "userId")`,
    );
  }
}
