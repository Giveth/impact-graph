import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeasonNumberToQfRound1740426399798
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD "seasonNumber" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" DROP COLUMN "seasonNumber"`,
    );
  }
}
