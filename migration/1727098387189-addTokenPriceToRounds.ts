import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenPriceToRounds1727098387189 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add `token_price` column to the `qf_round` table
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD "token_price" double precision DEFAULT NULL`,
    );

    // Add `token_price` column to the `early_access_round` table
    await queryRunner.query(
      `ALTER TABLE "early_access_round" ADD "token_price" double precision DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove `token_price` column from both tables if needed
    await queryRunner.query(`ALTER TABLE "qf_round" DROP COLUMN "price"`);
    await queryRunner.query(
      `ALTER TABLE "early_access_round" DROP COLUMN "price"`,
    );
  }
}
