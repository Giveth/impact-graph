import { MigrationInterface, QueryRunner } from 'typeorm';
import { Organization } from '../src/entities/organization';
import { Project } from '../src/entities/project';

export class relateExistingProjectsToOrganizations1646306281286
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const givethOrganization = (await Organization.findOne({
      name: 'Giveth',
    })) as Organization;
    const traceOrganization = (await Organization.findOne({
      name: 'Trace',
    })) as Organization;
    const givingBlockOrganization = (await Organization.findOne({
      name: 'Giving Block',
    })) as Organization;
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
