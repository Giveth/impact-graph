import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsBatchColumnToRecurringDonationTable1712044723561
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE recurring_donation
            ADD COLUMN IF NOT EXISTS "isBatch" BOOLEAN DEFAULT FALSE;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE recurring_donation
        DROP COLUMN IF EXISTS "isBatch";
    `);
  }
}
