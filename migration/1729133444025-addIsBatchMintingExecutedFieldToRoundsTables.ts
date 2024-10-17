import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsBatchMintingExecutedFieldToRoundsTables1729133444025
  implements MigrationInterface
{
  name = 'AddIsBatchMintingExecutedFieldToRoundsTables1729133444025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD "isBatchMintingExecuted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" ADD "isBatchMintingExecuted" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "early_access_round" DROP COLUMN "isBatchMintingExecuted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" DROP COLUMN "isBatchMintingExecuted"`,
    );
  }
}
