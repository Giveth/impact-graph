import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDonationType1619609850947 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "donationType" VARCHAR (10) NOT NULL default 'crypto'`,
    );
    // await queryRunner.query(
    //   `update "donation" SET "donationType" = 'crypto' WHERE 1=1`
    // )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "donationType"`,
    );
  }
}
