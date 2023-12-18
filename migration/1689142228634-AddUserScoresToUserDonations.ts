import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserScoresToUserDonations1689142228634
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE donation
            ADD COLUMN  IF NOT EXISTS "qfRoundUserScore" real
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE donation
            DROP COLUMN IF EXISTS "qfRoundUserScore"
        `);
  }
}
