import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerEarningsToCause1754040091087
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD IF NOT EXISTS "ownerTotalEarned" float DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD IF NOT EXISTS "ownerTotalEarnedUsdValue" float DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "ownerTotalEarned"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "ownerTotalEarnedUsdValue"`,
    );
  }
}
