import { MigrationInterface, QueryRunner } from 'typeorm';

export class addCategoryTable1640767594947 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "category" ("id" SERIAL NOT NULL, "name" text NOT NULL, "value" character varying, "source" character varying, CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`DROP TABLE "category"`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('addCategoryTable1640767594947 error', e);
    }
  }
}
