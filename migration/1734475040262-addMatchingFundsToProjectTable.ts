import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchingFundsToProjectTable1734475040262
  implements MigrationInterface
{
  name = 'AddMatchingFundsToProjectTable1734475040262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "matchingFunds" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "matchingFunds"`,
    );
  }
}
