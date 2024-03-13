import { MigrationInterface, QueryRunner } from 'typeorm';

export class addOrderForTokens1656398065898 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token" ADD IF NOT EXISTS "order" integer`,
    );

    // GIV token
    await queryRunner.query(`
          UPDATE "token"
          SET "order" = 1
          WHERE symbol='GIV'
        `);

    // Native tokens
    await queryRunner.query(`
          UPDATE "token"
          SET "order" = 2
          WHERE symbol='XDAI' OR symbol='ETH'
        `);

    // Important tokens
    await queryRunner.query(`
          UPDATE "token"
          SET "order" = 3
          WHERE symbol='WETH'
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE token
            DROP COLUMN IF EXISTS order
        `);
  }
}
