import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeImagePathProjectDescriptions1646744494458
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');
    if (projectTableExists) {
      await queryRunner.query(
        `
        UPDATE
        project
        SET
        description = REPLACE (
          description,
          'gateway.pinata.cloud',
          'giveth.mypinata.cloud'
        );
`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');
    if (projectTableExists) {
      await queryRunner.query(
        `
        UPDATE
        project
        SET
        description = REPLACE (
          description,
          'giveth.mypinata.cloud',
          'gateway.pinata.cloud'
        );
`,
      );
    }
  }
}
