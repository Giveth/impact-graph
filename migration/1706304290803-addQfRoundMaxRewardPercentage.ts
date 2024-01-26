import { MigrationInterface, QueryRunner } from 'typeorm';

export class addQfRoundMaxRewardPercentage1706304290803
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE qf_round
        ADD COLUMN IF NOT EXISTS "maximumReward" REAL DEFAULT '0.2'::real
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE qf_round
            DROP COLUMN IF EXISTS "maximumReward"
        `);
  }
}
