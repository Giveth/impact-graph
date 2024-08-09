import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDraftDonationQRFields1722800845343
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE draft_donation
            ADD COLUMN IF NOT EXISTS "toWalletMemo" VARCHAR NULL,
            ADD COLUMN IF NOT EXISTS "qrCodeDataUrl" TEXT NULL,
            ADD COLUMN IF NOT EXISTS "isQRDonation" BOOLEAN DEFAULT FALSE;
        `);

    // update enum draft_donation_chaintype_enum (add 'STELLAR');
    await queryRunner.query(
      `ALTER TYPE public.draft_donation_chaintype_enum ADD VALUE IF NOT EXISTS 'STELLAR';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE draft_donation
            DROP COLUMN IF EXISTS "toWalletMemo",
            DROP COLUMN IF EXISTS "qrCodeDataUrl",
            DROP COLUMN IF EXISTS "isQRDonation";
        `);

    // update enum draft_donation_chaintype_enum (remove 'STELLAR');
    await queryRunner.query(`
        DELETE FROM pg_enum
        WHERE enumlabel = 'STELLAR'
        AND enumtypid = (
            SELECT oid
            FROM pg_type
            WHERE typname = 'draft_donation_chaintype_enum'
        );
        `);
  }
}
