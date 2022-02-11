import { MigrationInterface, QueryRunner } from 'typeorm';

export class setSegmentNotifiedForOlderDonations1643891610952
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS  "donation" ADD COLUMN IF NOT EXISTS "segmentNotified" boolean DEFAULT true`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS  "donation" DROP COLUMN IF EXISTS "segmentNotified" boolean DEFAULT true`,
    );
  }
}
