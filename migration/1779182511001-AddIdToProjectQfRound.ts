import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdToProjectQfRound1779182511001 implements MigrationInterface {
  name = 'AddIdToProjectQfRound1779182511001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new id column as auto-incrementing column (not primary key)
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD COLUMN "id" SERIAL
    `);

    // Add index on the id column for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_id" 
      ON "project_qf_rounds_qf_round" ("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_project_qf_rounds_id"
    `);

    // Drop the id column
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP COLUMN IF EXISTS "id"
    `);
  }
}
