import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFundingPoolHdPathToCause1750220641794
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cause"
      ADD COLUMN "fundingPoolHdPath" text NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cause"
      DROP COLUMN "fundingPoolHdPath";
    `);
  }
}
