import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyRecurringDonationTable1709457251478
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Delete all existing records
    await queryRunner.query(`DELETE FROM "recurring_donation";`);

    // Drop the 'amount' column if it exists
    await queryRunner.query(
      `ALTER TABLE "recurring_donation" DROP COLUMN IF EXISTS "amount";`,
    );

    // Drop the 'interval' column if it exists
    await queryRunner.query(
      `ALTER TABLE "recurring_donation" DROP COLUMN IF EXISTS "interval";`,
    );

    await queryRunner.query(
      `ALTER TABLE "recurring_donation" ADD "flowRate" character varying NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the 'flowRate' column
    await queryRunner.query(
      `ALTER TABLE "recurring_donation" DROP COLUMN "flowRate";`,
    );

    // Assuming 'amount' was of type NUMERIC and 'interval' was of type INTEGER
    // Add the 'amount' column back
    await queryRunner.query(
      `ALTER TABLE "recurring_donation" ADD "amount" NUMERIC NOT NULL;`,
    );

    // Add the 'interval' column back
    await queryRunner.query(
      `ALTER TABLE "recurring_donation" ADD "interval" INTEGER NOT NULL;`,
    );

    // Since data was deleted in the `up` method, consider ways to restore it if necessary.
    // This might involve restoring from a backup or other data recovery strategies, which cannot be done through migration scripts.
  }
}
