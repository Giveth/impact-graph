import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDonationType1619609850947 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "type" VARCHAR (10) default 'crypto'`
    )
    await queryRunner.query(`update "donation" SET "type" = 'crypto' WHERE 1=1`)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "donation" DROP COLUMN "type"`)
  }
}
