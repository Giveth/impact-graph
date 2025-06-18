import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFundingPoolHdPathToCause1750220641794
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First add the column as nullable
    await queryRunner.query(`
      ALTER TABLE "cause"
      ADD COLUMN "fundingPoolHdPath" text;
    `);

    // Fill existing records with a default value
    await queryRunner.query(`
      UPDATE "cause"
      SET "fundingPoolHdPath" = 'm/44''/60''/0''/0/0'
      WHERE "fundingPoolHdPath" IS NULL;
    `);

    // Then make the column non-nullable
    await queryRunner.query(`
      ALTER TABLE "cause"
      ALTER COLUMN "fundingPoolHdPath" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cause"
      DROP COLUMN "fundingPoolHdPath";
    `);
  }
}
