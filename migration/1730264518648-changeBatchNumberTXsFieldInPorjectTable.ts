import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeBatchNumberTXsFieldInPorjectTable1730264518648
  implements MigrationInterface
{
  name = 'ChangeBatchNumberTXsFieldInPorjectTable1730264518648';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" RENAME COLUMN "numberOfBatchMintingTransactions" TO "batchNumbersWithSafeTransactions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "batchNumbersWithSafeTransactions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD "batchNumbersWithSafeTransactions" integer array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "batchNumbersWithSafeTransactions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD "batchNumbersWithSafeTransactions" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" RENAME COLUMN "batchNumbersWithSafeTransactions" TO "numberOfBatchMintingTransactions"`,
    );
  }
}
