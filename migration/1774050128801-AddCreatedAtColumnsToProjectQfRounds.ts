import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtColumnsToProjectQfRounds1774050128801
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add createdAt and updatedAt columns to project_qf_rounds_qf_round table
    await queryRunner.query(`
      ALTER TABLE project_qf_rounds_qf_round 
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns
    await queryRunner.query(`
      ALTER TABLE project_qf_rounds_qf_round 
      DROP COLUMN IF EXISTS "createdAt",
      DROP COLUMN IF EXISTS "updatedAt"
    `);
  }
}
