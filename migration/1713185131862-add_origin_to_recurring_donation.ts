import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginToRecurringDonation1713185131862
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE recurring_donation
            ADD COLUMN IF NOT EXISTS "origin" text;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE recurring_donation
        DROP COLUMN IF EXISTS "origin";
    `);
  }
}
