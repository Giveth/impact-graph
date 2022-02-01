import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectTotalReactions1643716017830 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE project SET "totalReactions" = (SELECT COUNT(*) FROM reaction WHERE "projectId"=project.id)`,
    );
    await queryRunner.query(
      `UPDATE project_update SET "totalReactions" = (SELECT COUNT(*) FROM reaction WHERE "projectUpdateId"=project_update.id)`,
    );
  }

  // tslint:disable-next-line:no-empty
  async down(queryRunner: QueryRunner): Promise<void> {}
}
