import { MigrationInterface, QueryRunner } from 'typeorm';
import { Project, ProjectUpdate } from '../src/entities/project';

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

      // const projectUpdate = await ProjectUpdate.findOne(
      //   {
      //     projectId: project.id,
      //   },
      //   {
      //     order: {
      //       createdAt: 'DESC',
      //     },
      //   },
      // );

      if (projectUpdates.length === 0) {
        continue;
      }
      await queryRunner.query(`
            UPDATE project 
            SET "updatedAt" =${projectUpdates[0].createdAt}
            WHERE id=${project.id}
            `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
