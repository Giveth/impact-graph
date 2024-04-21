import { MigrationInterface, QueryRunner } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const moment = require('moment');

export class fixUpdatetAtOfProjects1647514950889 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');
    if (!projectTableExists) {
      return;
    }
    const projects = await queryRunner.query(`SELECT * FROM project`);

    for (const project of projects) {
      const projectUpdates = await queryRunner.query(
        `
            SELECT * FROM project_update
            where "projectId"=${project.id}
            ORDER BY "createdAt" DESC
            `,
      );
      if (projectUpdates.length === 0) {
        // projects always have at least 1 projectUpdate which is the main. In theory this shouldn't happen.
        continue;
      }
      await queryRunner.query(`
            UPDATE project
            SET "updatedAt" ='${moment(projectUpdates[0].createdAt).format(
              'YYYY-MM-DD',
            )}'
            WHERE id=${project.id}
            `);
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
