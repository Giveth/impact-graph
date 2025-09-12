import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMigrationRoundIdDraftDonations1757668523311
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE draft_donation
      ADD COLUMN IF NOT EXISTS "qfRoundId" integer;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE draft_donation
      DROP COLUMN IF EXISTS "qfRoundId";
    `);
  }
}
