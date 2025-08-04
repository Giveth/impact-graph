import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCauseEarningsToUser1754043100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" ADD IF NOT EXISTS "causesTotalEarned" float DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE "user" ADD IF NOT EXISTS "causesTotalEarnedUsdValue" float DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS "causesTotalEarned";
    `);
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS "causesTotalEarnedUsdValue";
    `);
  }
}
