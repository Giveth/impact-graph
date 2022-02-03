import { MigrationInterface, QueryRunner } from 'typeorm';

export class setSegmentNotifiedForOlderDonations1643891610952
  implements MigrationInterface
{
  // Update statements don't have if exists clause, we have to run another query or create a pg function
  public async up(queryRunner: QueryRunner): Promise<void> {
    const donationTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE  schemaname = 'public'
        AND    tablename  = 'donation'
      );
    `);
    if (donationTableExists[0].exists) {
      await queryRunner.query(`UPDATE donation SET "segmentNotified" = true`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const donationTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE  schemaname = 'public'
        AND    tablename  = 'donation'
      );
    `);
    if (donationTableExists[0].exists) {
      await queryRunner.query(`UPDATE donation SET "segmentNotified" = false`);
    }
  }
}
