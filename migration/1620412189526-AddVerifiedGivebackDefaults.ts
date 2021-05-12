import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVerifiedGivebackDefaults1620412189526
  implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE project ALTER COLUMN verified SET DEFAULT false`
    )
    await queryRunner.query(
      `ALTER TABLE project ALTER COLUMN "giveBacks" SET DEFAULT false`
    )
  }

  public async down (queryRunner: QueryRunner): Promise<void> {}
}
