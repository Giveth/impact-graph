import { MigrationInterface, QueryRunner } from 'typeorm';
import { updateTotalDonationsOfProject } from '../src/services/donationService';
import { updateUserTotalReceived } from '../src/services/userService';

export class updateTotalDonationsOfQfRoundProjects1698844763871
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const projects = await queryRunner.query(`
           SELECT DISTINCT "projectId"
           FROM qf_round_history;
   `);
    for (const project of projects) {
      const projectId = project.id;
      try {
        await updateTotalDonationsOfProject(projectId);
        await updateUserTotalReceived(projectId);
      } catch (e) {
        // tslint:disable-next-line:no-console
        console.log(
          'error in updating totalReceived and total donations of project',
          e,
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    //
  }
}
