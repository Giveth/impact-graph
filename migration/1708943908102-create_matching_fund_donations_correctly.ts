import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchingFundDonationsCorrectly1708943908102
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // First delete all donations that are related to a qfRound, we will fill it again later correctly
    await queryRunner.query(`
            DELETE FROM donation
            WHERE "distributedFundQfRoundId" IS NOT NULL;
        `);
    await queryRunner.query(`
            ALTER TABLE qf_round_history
            ADD COLUMN "distributedFundTxDate" DATE NULL;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE qf_round_history
            DROP COLUMN "distributedFundTxDate";
        `);
  }
}
