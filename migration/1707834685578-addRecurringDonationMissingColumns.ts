import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecurringDonationMissingColumns1707834685578
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE recurring_donation ADD COLUMN IF NOT EXISTS anonymous boolean DEFAULT false;
      `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
