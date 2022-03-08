import { MigrationInterface, QueryRunner } from 'typeorm';
import { Organization } from '../src/entities/organization';
import { Project } from '../src/entities/project';
import { Donation } from '../src/entities/donation';
import createSchema from '../src/server/createSchema';

export class relateExistingProjectsToOrganizations1646306281286
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
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

    const projects = await Project.find({});
    for (const project of projects) {
      if (project.traceCampaignId) {
        project.organization = traceOrganization;
      } else if (project.givingBlocksId) {
        project.organization = givingBlockOrganization;
      } else {
        project.organization = givethOrganization;
      }
      await project.save();
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE project SET "organizationId" = NULL`);
  }
}
