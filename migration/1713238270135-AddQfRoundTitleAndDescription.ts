import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQfRoundTitleAndDescription1713238270135
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE IF EXISTS "qf_round"
            ADD COLUMN IF NOT EXISTS "title" text,
            ADD COLUMN IF NOT EXISTS "description" text;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "qf_round"
            DROP COLUMN "title",
            DROP COLUMN "description";
        `);
  }
}
