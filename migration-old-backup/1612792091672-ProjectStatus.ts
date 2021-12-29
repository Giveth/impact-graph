import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectStatus1612792091672 implements MigrationInterface {
  name = 'ProjectStatus1612792091672';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "statusId" integer DEFAULT 2`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "statusId"`);
  }
}
