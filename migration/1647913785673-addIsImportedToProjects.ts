import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIsImportedToProjects1647913785673
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // To run the update query SUM I should check table existance
    // UPDATE clause doesn't have a IF EXISTS conditional
    const projectTableExists = await queryRunner.hasTable('project');

    if (projectTableExists) {
      await queryRunner.query(
        `ALTER TABLE "project" ADD IF NOT EXISTS "isImported" boolean DEFAULT false`,
      );

      await queryRunner.query(`
          UPDATE "project"
          SET "isImported" = true
          WHERE project."givingBlocksId" IS NOT NULL OR project."traceCampaignId" IS NOT NULL
        `);
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
