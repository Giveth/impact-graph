import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpirationDateToDraftDonation1723025859680
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE draft_donation ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE draft_donation DROP COLUMN IF EXISTS "expiresAt"`,
    );
  }
}
