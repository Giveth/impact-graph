import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDonationMatchedIdColumnToDraftDonation1707892354691
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE draft_donation ADD COLUMN IF NOT EXISTS "matchedDonationId" integer default NULL`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
