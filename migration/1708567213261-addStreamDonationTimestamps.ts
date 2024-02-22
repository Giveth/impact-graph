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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE donation 
      DROP CONSTRAINT IF EXISTS fk_recurring_donation,
      DROP COLUMN IF EXISTS "recurringDonationId",
      DROP COLUMN IF EXISTS "virtualPeriodStart",
      DROP COLUMN IF EXISTS "virtualPeriodEnd";
    `);
  }
}
