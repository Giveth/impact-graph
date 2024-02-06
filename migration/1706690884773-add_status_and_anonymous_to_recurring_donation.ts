import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusAndAnonymousToRecurringDonation1706690884773
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'anonymous' column if it does not exist
    await queryRunner.query(`
      ALTER TABLE recurring_donation ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT FALSE;
    `);

    // Add 'status' column with a default value of 'pending' if it does not exist
    await queryRunner.query(`
      ALTER TABLE recurring_donation ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove 'anonymous' column if it exists
    await queryRunner.query(`
      ALTER TABLE recurring_donation DROP COLUMN IF EXISTS anonymous;
    `);

    // Remove 'status' column if it exists
    await queryRunner.query(`
      ALTER TABLE recurring_donation DROP COLUMN IF EXISTS status;
    `);
  }
}
