import { MigrationInterface, QueryRunner } from 'typeorm';

export class relateExistingProjectsToOrganizations1646306281286
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');
    if (!projectTableExists) {
      // eslint-disable-next-line no-console
      console.log(
        'The project table doesnt exist, so there is no need to relate it to organizations',
      );
      return;
    }
    await queryRunner.query(
      `
            ALTER TABLE project
            ADD IF NOT EXISTS "organizationId" Integer`,
    );
    const givethOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE name='Giveth'`)
    )[0];
    const traceOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE name='Trace'`)
    )[0];
    const givingBlockOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE name='Giving Block'`)
    )[0];

    const projects = await queryRunner.query(`SELECT * FROM project`);
    for (const project of projects) {
      let organizationId;
      if (project.traceCampaignId) {
        organizationId = traceOrganization.id;
      } else if (project.givingBlocksId) {
        organizationId = givingBlockOrganization.id;
      } else {
        organizationId = givethOrganization.id;
      }
      await queryRunner.query(
        `
                UPDATE project SET "organizationId" = ${organizationId}
                WHERE id=${project.id}
              `,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE project SET "organizationId" = NULL`);
  }
}
