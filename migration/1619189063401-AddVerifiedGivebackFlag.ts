import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVerifiedGivebackFlag1619189063401
  implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "verfied" boolean default false`
    )
    await queryRunner.query(
      `ALTER TABLE "project" ADD "giveBacks" boolean default false`
    )
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "verfied"`)
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "giveBacks"`)
  }
}
