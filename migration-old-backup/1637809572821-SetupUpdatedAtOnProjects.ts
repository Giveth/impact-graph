import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetupUpdatedAtOnProjects1637809572821
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP`,
    );
    await queryRunner.query(`UPDATE project SET "updatedAt"="creationDate"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE project DROP "updatedAt"`);
  }
}
