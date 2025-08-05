import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAggregationsToCause1750123930820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add cause-specific columns to the project table
    await queryRunner.query(`
      ALTER TABLE public.project 
      ADD COLUMN IF NOT EXISTS "activeProjectsCount" integer NOT NULL DEFAULT 0;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
