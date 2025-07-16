import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsIncludedToCause1751934580589 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "cause_project"
      ADD COLUMN IF NOT EXISTS "isIncluded" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "cause_project"
      DROP COLUMN IF EXISTS "isIncluded";
    `);
  }
}
