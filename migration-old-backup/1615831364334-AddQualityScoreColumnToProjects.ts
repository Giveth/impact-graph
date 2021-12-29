import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQualityScoreColumnToProjects1615831364334
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "qualityScore" integer default 30`,
    );
    await queryRunner.query(
      `UPDATE project SET "qualityScore" = 30 WHERE "qualityScore" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "qualityScore"`);
  }
}
