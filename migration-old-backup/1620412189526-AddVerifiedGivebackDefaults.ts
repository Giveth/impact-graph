import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerifiedGivebackDefaults1620412189526
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE project ALTER COLUMN verified SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE project ALTER COLUMN "giveBacks" SET DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
