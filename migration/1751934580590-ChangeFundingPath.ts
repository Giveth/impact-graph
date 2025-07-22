import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeFundingPath1751934580590 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make the column nullable
    await queryRunner.query(`
      ALTER TABLE "project"
      ALTER COLUMN "fundingPoolHdPath" DROP NOT NULL;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
