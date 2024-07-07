import { Like, MigrationInterface, QueryRunner } from 'typeorm';
import { Project, ProjectUpdate } from '../src/entities/project';
import { changeBase64ToIpfsImageInHTML } from '../src/utils/documents';

export class TransformBase64ImagesToIpfs1680539882510
  implements MigrationInterface
{
  async up(_queryRunner: QueryRunner): Promise<void> {
    // paginate through project updates
    let skip = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [projectUpdates, count] = await ProjectUpdate.findAndCount({
        where: { content: Like('%;base64%') },
        select: ['id', 'content'],
        skip,
        take: 100,
      });

      // transform base64 images to ipfs
      await Promise.all(
        projectUpdates.map(async ({ id, content }) => {
          // eslint-disable-next-line no-console
          console.log(
            'Transforming base64 images to ipfs for project update',
            id,
          );
          content = await changeBase64ToIpfsImageInHTML(content);
          return ProjectUpdate.update(id, { content });
        }),
      );

      skip += projectUpdates.length;
      if (skip >= count) break;
    }

    skip = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [projects, count] = await Project.findAndCount({
        where: { description: Like('%;base64%') },
        select: ['id', 'description'],
        skip,
        take: 100,
      });

      // transform base64 images to ipfs
      await Promise.all(
        projects.map(async ({ id, description }) => {
          if (!description) return;
          // eslint-disable-next-line no-console
          console.log('Transforming base64 images to ipfs for project', id);
          description = await changeBase64ToIpfsImageInHTML(description);
          return Project.update(id, { description });
        }),
      );

      skip += projects.length;
      if (skip >= count) break;
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
