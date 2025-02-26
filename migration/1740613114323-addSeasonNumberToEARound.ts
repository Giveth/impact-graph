import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeasonNumberToEARound1740613114323
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "early_access_round" ADD "seasonNumber" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "early_access_round" DROP COLUMN "seasonNumber"`,
    );
  }
}
