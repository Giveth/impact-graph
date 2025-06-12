import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepositTxFieldsToCause1748380797715
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cause"
      ADD COLUMN "depositTxHash" text,
      ADD COLUMN "depositTxChainId" integer;
    `);

    // Add unique constraint for depositTxHash
    await queryRunner.query(`
      ALTER TABLE "cause"
      ADD CONSTRAINT "UQ_cause_depositTxHash" UNIQUE ("depositTxHash");
    `);

    // Add not null constraints after adding the columns
    await queryRunner.query(`
      ALTER TABLE "cause"
      ALTER COLUMN "depositTxHash" SET NOT NULL,
      ALTER COLUMN "depositTxChainId" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove not null constraints first
    await queryRunner.query(`
      ALTER TABLE "cause"
      ALTER COLUMN "depositTxHash" DROP NOT NULL,
      ALTER COLUMN "depositTxChainId" DROP NOT NULL;
    `);

    // Remove unique constraint
    await queryRunner.query(`
      ALTER TABLE "cause"
      DROP CONSTRAINT "UQ_cause_depositTxHash";
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "cause"
      DROP COLUMN "depositTxHash",
      DROP COLUMN "depositTxChainId";
    `);
  }
}
