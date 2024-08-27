import { MigrationInterface, QueryRunner } from 'typeorm';

export class DonationEarlyAccess1724594336012 implements MigrationInterface {
  name = 'DonationEarlyAccess1724594336012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "earlyAccessRound" boolean DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "earlyAccessRound"`,
    );
  }
}
