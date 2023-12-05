import { MigrationInterface, QueryRunner } from 'typeorm';

export class addFieldsToQfRoundHistory1701689359018
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "qf_round_history"
            ADD COLUMN "matchingFundAmount" real ,
            ADD COLUMN "matchingFundPriceUsd" real ,
            ADD COLUMN "matchingFundCurrency" text ;
        `);

    await queryRunner.query(`
            ALTER TABLE "donation"
            ADD COLUMN "distributedFundQfRoundId" integer;

            -- If you have a foreign key constraint to enforce the relationship
            ALTER TABLE "donation"
            ADD CONSTRAINT "FK_donation_qfRound"
            FOREIGN KEY ("distributedFundQfRoundId") REFERENCES "qf_round"("id");
        `);

    // These rounds are in Production but I didnt set any condition for that
    // because I want this part of code be executed in staging ENV

    // Alpha round in production
    await queryRunner.query(`
        UPDATE qf_round_history 
        SET 
            "matchingFundAmount" = "matchingFund", 
            "matchingFundPriceUsd" = 1, 
            "matchingFundCurrency" = 'WXDAI'
        WHERE 
            id = 2 AND "matchingFund" IS NOT NULL;

    `);

    // Optimism round in production
    await queryRunner.query(`
        UPDATE qf_round_history 
        SET 
            "matchingFundAmount" = "matchingFund", 
            "matchingFundPriceUsd" = 1, 
            "matchingFundCurrency" = 'DAI'
        WHERE 
            id = 4 AND "matchingFund" IS NOT NULL;

    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "qf_round_history"
            DROP COLUMN "matchingFundAmount",
            DROP COLUMN "matchingFundPriceUsd",
            DROP COLUMN "matchingFundCurrency";
        `);

    await queryRunner.query(`
            -- If you added a foreign key constraint, remove it first
            ALTER TABLE "donation"
            DROP CONSTRAINT IF EXISTS "FK_donation_qfRound";

            ALTER TABLE "donation"
            DROP COLUMN "distributedFundQfRoundId";
        `);
  }
}
