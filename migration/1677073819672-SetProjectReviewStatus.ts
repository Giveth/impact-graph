import { MigrationInterface, QueryRunner } from 'typeorm';
import { Project, ReviewStatus } from '../src/entities/project';

export class SetProjectReviewStatus1677073819672 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_reviewstatus_enum') THEN
             CREATE TYPE public.project_reviewstatus_enum AS ENUM
          ('Not Reviewed', 'Listed', 'Not Listed');

          END IF;
      END$$;


      ALTER TYPE PUBLIC.PROJECT_REVIEWSTATUS_ENUM OWNER TO POSTGRES;
    `);
    await queryRunner.query(`
        ALTER TABLE IF EXISTS project
        ADD COLUMN IF NOT EXISTS  "reviewStatus" project_reviewstatus_enum NOT NULL DEFAULT 'Not Reviewed'::project_reviewstatus_enum;
    `);

    await queryRunner.query(`
    update project set "reviewStatus" = 'Listed'::project_reviewstatus_enum where listed = true;
    update project set "reviewStatus" = 'Not Listed'::project_reviewstatus_enum where listed = false;
    update project set "reviewStatus" = 'Not Reviewed'::project_reviewstatus_enum where listed IS NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
