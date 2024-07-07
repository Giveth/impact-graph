import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectTotalReactions1643716017830 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const [projectTableExists, projectUpdateTableExists, reactionTableExists] =
      await Promise.all([
        queryRunner.hasTable('project'),
        queryRunner.hasTable('project_update'),
        queryRunner.hasTable('reaction'),
      ]);

    if (projectTableExists && reactionTableExists) {
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "project" ADD COLUMN IF NOT EXISTS "totalReactions" integer DEFAULT 0',
      );
      await queryRunner.query(
        `UPDATE project SET "totalReactions" = (SELECT COUNT(*) FROM reaction WHERE "projectId"=project.id)`,
      );
    }

    if (projectUpdateTableExists && reactionTableExists) {
      await queryRunner.query(
        'ALTER TABLE IF EXISTS "project_update" ADD COLUMN IF NOT EXISTS "totalReactions" integer DEFAULT 0',
      );
      await queryRunner.query(
        `UPDATE project_update SET "totalReactions" = (SELECT COUNT(*) FROM reaction WHERE "projectUpdateId"=project_update.id)`,
      );
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
