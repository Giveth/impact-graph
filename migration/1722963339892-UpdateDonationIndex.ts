import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDonationIndex1722963339892 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // update donation table
    await queryRunner.query(`
            ALTER TABLE "donation" 
            ADD COLUMN IF NOT EXISTS "isQRDonation" boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS "toWalletMemo" text;
        `);

    await queryRunner.query(`DROP INDEX "idx_donation_project_user"`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_donation_project_user ON donation("projectId", "userId", "valueUsd") WHERE "status" = 'verified' AND "recurringDonationId" IS NULL AND "isQRDonation" = false AND "userId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_donation_project_user"`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_donation_project_user ON donation("projectId", "userId", "valueUsd") WHERE "status" = 'verified' AND "recurringDonationId" IS NULL`,
    );

    await queryRunner.query(`
            ALTER TABLE "donation" 
            DROP COLUMN IF EXISTS "isQRDonation",
            DROP COLUMN IF EXISTS "toWalletMemo";
        `);
  }
}
