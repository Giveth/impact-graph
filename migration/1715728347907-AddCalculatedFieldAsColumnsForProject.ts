import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalculatedFieldAsColumnsForProject1715728347907
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "project"
            ADD COLUMN IF NOT EXISTS "sumDonationValueUsdForActiveQfRound" DOUBLE PRECISION DEFAULT 0;
        `);

    await queryRunner.query(`
            ALTER TABLE "project"
            ADD COLUMN IF NOT EXISTS "sumDonationValueUsd" DOUBLE PRECISION DEFAULT 0;
        `);

    // Add new integer columns for counting unique donors with 'IF NOT EXISTS'
    await queryRunner.query(`
            ALTER TABLE "project"
            ADD COLUMN IF NOT EXISTS "countUniqueDonorsForActiveQfRound" INTEGER DEFAULT 0;
        `);

    await queryRunner.query(`
            ALTER TABLE "project"
            ADD COLUMN IF NOT EXISTS "countUniqueDonors" INTEGER DEFAULT 0;
        `);

    await queryRunner.query(`
        UPDATE "project"
        SET "countUniqueDonors" = pds."uniqueDonorsCount",
        "sumDonationValueUsd" = pds."sumVerifiedDonations"
        FROM "project_donation_summary_view" AS pds
        WHERE "project"."id" = pds."projectId";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Use 'IF EXISTS' in the DROP statement to avoid errors in case the column does not exist
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "sumDonationValueUsdForActiveQfRound"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "sumDonationValueUsd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "countUniqueDonorsForActiveQfRound"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "countUniqueDonors"`,
    );
  }
}
