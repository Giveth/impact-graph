import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsArchivedToRecurringDonation1711613263251
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE recurring_donation
            ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT FALSE;
        `);

    // update status of all archived donations to isArchived = true and status:ended
    await queryRunner.query(`
            UPDATE recurring_donation
            SET "isArchived" = TRUE, status = 'ended'
            WHERE status = 'archived';
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // update status of all archived donations to isArchived = true and status:ended
    await queryRunner.query(`
            UPDATE recurring_donation
            status = 'archived'
            WHERE "isArchived" = TRUE;
            `);

    await queryRunner.query(`
        ALTER TABLE recurring_donation
        DROP COLUMN IF EXISTS "isArchived";
    `);
  }
}
