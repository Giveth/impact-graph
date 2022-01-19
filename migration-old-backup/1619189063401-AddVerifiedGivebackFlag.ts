import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerifiedGivebackFlag1619189063401
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "verified" boolean default false`,
    );
    await queryRunner.query(
      `update "project" SET "verified" = false WHERE 1=1`,
    );

    await queryRunner.query(
      `ALTER TABLE "project" ADD "giveBacks" boolean default false`,
    );
    await queryRunner.query(
      `update "project" SET "giveBacks" = false WHERE 1=1`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "verified"`);
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "giveBacks"`);
  }
}
