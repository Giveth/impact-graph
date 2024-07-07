import { MigrationInterface, QueryRunner } from 'typeorm';

export class addGivingBlockOrganizationToGivingBlockProjects1648085509369
  implements MigrationInterface
{
  // this is to fix newly created givingBlocksProjects after the older migration ran
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');

    if (!projectTableExists) return;

    const givingBlockOrganization = (
      await queryRunner.query(`SELECT * FROM organization
              WHERE label='givingBlock'`)
    )[0];

    if (!givingBlockOrganization) return;
    await queryRunner.query(`
            UPDATE project
            SET "organizationId" = ${givingBlockOrganization.id}
            WHERE "givingBlocksId" IS NOT NULL
        `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
