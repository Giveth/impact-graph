import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatisticsToProjectQfRoundsMiddleTable1754050128500
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the QF-related columns to the project_qf_rounds_qf_round table
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD COLUMN IF NOT EXISTS "sumDonationValueUsd" DOUBLE PRECISION DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "countUniqueDonors" INTEGER DEFAULT 0;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
