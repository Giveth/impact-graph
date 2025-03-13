import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropOldIndexOnProjectUserRecord1741882777190
  implements MigrationInterface
{
  name = 'DropOldIndexOnProjectUserRecord1741882777190';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_29abdbcc3e6e7090cbc8fb1a90"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_29abdbcc3e6e7090cbc8fb1a90" ON "project_user_record" ("projectId", "userId")`,
    );
  }
}
