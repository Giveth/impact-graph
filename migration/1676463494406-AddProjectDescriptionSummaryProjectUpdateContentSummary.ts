import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectDescriptionSummaryProjectUpdateContentSummary1676463494406
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                ALTER TABLE IF EXISTS project
                    ADD COLUMN IF NOT EXISTS "descriptionSummary" character varying;

                ALTER TABLE IF EXISTS "project_update"
                    ADD COLUMN IF NOT EXISTS "contentSummary" character varying;
         `,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
