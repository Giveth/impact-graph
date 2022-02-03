import { MigrationInterface, QueryRunner } from 'typeorm';

export class setSegmentNotifiedForOlderDonations1643891610952
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE public.donation SET "segmentNotified" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE public.donation SET "segmentNotified" = false`,
    );
  }
}
