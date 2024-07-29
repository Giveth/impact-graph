import { MigrationInterface, QueryRunner } from 'typeorm';
import { Project, ProjectUpdate } from '../src/entities/project.js';
import { getHtmlTextSummary } from '../src/utils/utils.js';

export class FillProjectDescriptionSummaryProjectUpdateContentSummary1676472760533
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    let skip = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [projects, count] = await queryRunner.manager.findAndCount<Project>(
        Project,
        {
          select: ['id', 'description'],
          order: { id: 'ASC' },
          skip,
          take: 100,
        },
      );

      await Promise.all(
        projects.map(project => {
          queryRunner.manager.update(
            Project,
            { id: project.id },
            { descriptionSummary: getHtmlTextSummary(project.description) },
          );
        }),
      );

      skip += projects.length;
      if (skip >= count) break;
    }

    skip = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [projectUpdates, count] =
        await queryRunner.manager.findAndCount<ProjectUpdate>(ProjectUpdate, {
          select: ['id', 'content'],
          order: { id: 'ASC' },
          skip,
          take: 100,
        });

      await Promise.all(
        projectUpdates.map(projectUpdate => {
          queryRunner.manager.update(
            ProjectUpdate,
            { id: projectUpdate.id },
            { contentSummary: getHtmlTextSummary(projectUpdate.content) },
          );
        }),
      );

      skip += projectUpdates.length;
      if (skip >= count) break;
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
