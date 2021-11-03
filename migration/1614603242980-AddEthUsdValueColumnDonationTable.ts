import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEthUsdValueColumnDonationTable1614603242980
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "priceEth" double precision NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "priceUsd" double precision NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "donation" DROP COLUMN "priceEth"`);
    await queryRunner.query(`ALTER TABLE "donation" DROP COLUMN "priceUsd"`);
  }
}
