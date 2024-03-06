import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMinimumValidValueUsdToQfRound1709625907738
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new column with a default value of NULL
    await queryRunner.query(`
      ALTER TABLE qf_round ADD COLUMN IF NOT EXISTS "minimumValidUsdValue" FLOAT DEFAULT 1;
    `);

    // Update existing records to set the value to 0.65
    await queryRunner.query(`
      UPDATE qf_round SET "minimumValidUsdValue" = 0.65;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the added column
    await queryRunner.query(`
      ALTER TABLE qf_round DROP COLUMN IF EXISTS "minimumValidUsdValue";
    `);
  }
}
