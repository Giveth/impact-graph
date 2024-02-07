import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyRecurringDonationTable1707045732631
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add amount, anonymous, interval, and currency columns with default values
    await queryRunner.query(`
            ALTER TABLE recurring_donation
            ADD COLUMN IF NOT EXISTS amount INT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS interval text NOT NULL DEFAULT 'monthly',
            ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD'
            ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns if the migration is rolled back
    await queryRunner.query(`
            ALTER TABLE recurring_donation
            DROP COLUMN amount,
            DROP COLUMN status,
            DROP COLUMN interval,
            DROP COLUMN currency
        `);
  }
}
