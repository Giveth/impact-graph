import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRemovedToCauseProjects1751934580591
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cause_project" ADD IF NOT EXISTS "userRemoved" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cause_project" DROP COLUMN IF EXISTS "userRemoved"`,
    );
  }
}