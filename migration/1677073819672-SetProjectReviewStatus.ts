import { MigrationInterface, QueryRunner } from 'typeorm';
import { Project, ReviewStatus } from '../src/entities/project';

export class SetProjectReviewStatus1677073819672 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_reviewstatus_enum') THEN
             CREATE TYPE public.project_reviewstatus_enum AS ENUM
          ('NotReviewed', 'Listed', 'Not Listed');

          END IF;
      END$$;


      ALTER TYPE PUBLIC.PROJECT_REVIEWSTATUS_ENUM OWNER TO POSTGRES;
    `);
    await queryRunner.query(`
        ALTER TABLE IF EXISTS project
        ADD COLUMN IF NOT EXISTS  "reviewStatus" project_reviewstatus_enum NOT NULL DEFAULT 'NotReviewed'::project_reviewstatus_enum;
    `);
    let skip = 0;
    while (true) {
      const [projects, count] = await queryRunner.manager.findAndCount<Project>(
        Project,
        {
          select: ['id', 'listed'],
          order: { id: 'ASC' },
          skip,
          take: 100,
        },
      );

      await Promise.all(
        projects.map(project => {
          const { id, listed } = project;
          let reviewStatus: ReviewStatus;
          switch (listed) {
            case true:
              reviewStatus = ReviewStatus.Listed;
              break;
            case false:
              reviewStatus = ReviewStatus.NotListed;
              break;
            case null:
            default:
              reviewStatus = ReviewStatus.NotReviewed;
              break;
          }

          queryRunner.manager.update(
            Project,
            { id: project.id },
            { reviewStatus },
          );
        }),
      );

      skip += projects.length;
      if (skip >= count) break;
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
