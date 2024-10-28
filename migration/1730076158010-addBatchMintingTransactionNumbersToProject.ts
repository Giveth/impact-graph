import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatchMintingTransactionNumbersToProject1730076158010
  implements MigrationInterface
{
  name = 'AddBatchMintingTransactionNumbersToProject1730076158010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "numberOfBatchMintingTransactions" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "numberOfBatchMintingTransactions"`,
    );
  }
}
