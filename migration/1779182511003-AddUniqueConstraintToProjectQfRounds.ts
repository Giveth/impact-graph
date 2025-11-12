import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToProjectQfRounds1779182511003
  implements MigrationInterface
{
  name = 'AddUniqueConstraintToProjectQfRounds1779182511003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add UNIQUE constraint to match entity definition
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round"
      ADD CONSTRAINT "UQ_project_qf_rounds_project_qf_round" UNIQUE ("projectId", "qfRoundId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop UNIQUE constraint
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP CONSTRAINT IF EXISTS "UQ_project_qf_rounds_project_qf_round"
    `);
  }
}
