import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserScoresToUserDonations1689142228634
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE donation
            ADD COLUMN  IF NOT EXISTS "qfRoundUserScore" real
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE donation
            DROP COLUMN IF EXISTS "qfRoundUserScore"
        `);
  }
}
