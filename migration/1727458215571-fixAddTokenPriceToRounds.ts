import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAddTokenPriceToRounds1727458215571
  implements MigrationInterface
{
  name = 'FixAddTokenPriceToRounds1727458215571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" RENAME COLUMN "token_price" TO "tokenPrice"`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" RENAME COLUMN "token_price" TO "tokenPrice"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "early_access_round" RENAME COLUMN "tokenPrice" TO "token_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" RENAME COLUMN "tokenPrice" TO "token_price"`,
    );
  }
}
