import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyRecurringDonationTable1707045732631
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add amount, anonymous, interval, and currency columns with default values
    await queryRunner.query(`
            ALTER TABLE recurring_donation
            ADD COLUMN amount INT NOT NULL DEFAULT 0,
            ADD COLUMN interval VARCHAR(255) NOT NULL DEFAULT 'monthly',
            ADD COLUMN currency VARCHAR(255) NOT NULL DEFAULT 'USD'
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns if the migration is rolled back
    await queryRunner.query(`
            ALTER TABLE recurring_donation
            DROP COLUMN amount,
            DROP COLUMN interval,
            DROP COLUMN currency
        `);
  }
}
