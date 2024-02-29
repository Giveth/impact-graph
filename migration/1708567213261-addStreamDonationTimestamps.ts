import { MigrationInterface, QueryRunner } from 'typeorm';

export class addStreamDonationTimestamps1708567213261
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE donation 
      ADD COLUMN IF NOT EXISTS "recurringDonationId" integer,
      ADD COLUMN IF NOT EXISTS "virtualPeriodStart" INTEGER,
      ADD COLUMN IF NOT EXISTS "virtualPeriodEnd" INTEGER,
      ADD CONSTRAINT IF NOT EXISTS fk_recurring_donation
      FOREIGN KEY ("recurringDonationId") 
      REFERENCES recurring_donations(id)
      ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE recurring_donation
      ADD COLUMN IF NOT EXISTS "amountStreamed" TYPE real DEFAULT 0
      ADD COLUMN IF NOT EXISTS "totalUsdStreamed" TYPE real DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE donation 
      DROP CONSTRAINT IF EXISTS fk_recurring_donation,
      DROP COLUMN IF EXISTS "recurringDonationId",
      DROP COLUMN IF EXISTS "virtualPeriodStart",
      DROP COLUMN IF EXISTS "virtualPeriodEnd";
    `);

    await queryRunner.query(`
      ALTER TABLE recurring_donation
      DROP COLUMN IF EXISTS "amountStreamed"
      DROP COLUMN IF EXISTS "totalUsdStreamed"
    `);
  }
}
