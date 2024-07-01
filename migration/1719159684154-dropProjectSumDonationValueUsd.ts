import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropProjectSumDonationValueUsd1719159684154
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "sumDonationValueUsd"`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
