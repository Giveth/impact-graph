import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSwapToDonation1751934580588 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donation"
      ADD COLUMN IF NOT EXISTS "swapTransactionId" integer;
    `);
    await queryRunner.query(`
      ALTER TABLE "donation"
      ADD CONSTRAINT "FK_donation_swap_transaction" 
      FOREIGN KEY ("swapTransactionId") 
      REFERENCES "swap_transaction"("id") 
      ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "donation"
      ADD COLUMN IF NOT EXISTS "isSwap" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE "draft_donation"
      ADD COLUMN IF NOT EXISTS "fromTokenAmount" double precision;
    `);
    await queryRunner.query(`
      ALTER TABLE "donation"
      ADD COLUMN IF NOT EXISTS "fromTokenAmount" double precision;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donation"
      DROP COLUMN IF EXISTS "fromTokenAmount";
    `);
    await queryRunner.query(`
      ALTER TABLE "draft_donation"
      DROP COLUMN IF EXISTS "fromTokenAmount";
    `);
    await queryRunner.query(`
      ALTER TABLE "donation"
      DROP COLUMN IF EXISTS "isSwap";
    `);
    await queryRunner.query(`
      ALTER TABLE "donation"
      DROP CONSTRAINT IF EXISTS "FK_donation_swap_transaction";
    `);
    await queryRunner.query(`
      ALTER TABLE "donation"
      DROP COLUMN IF EXISTS "swapTransactionId";
    `);
  }
}
