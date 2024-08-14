import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemoToProjectAddressFields1722379846122
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_address" ADD COLUMN IF NOT EXISTS "memo" VARCHAR`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_address" DROP COLUMN IF EXISTS "memo"`,
    );
  }
}
