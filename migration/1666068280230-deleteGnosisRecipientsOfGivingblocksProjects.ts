import { MigrationInterface, QueryRunner } from 'typeorm';

export class deleteGnosisRecipientsOfGivingblocksProjects1666068280230
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');
    const projectAddressTableExists =
      await queryRunner.hasTable('project_address');
    if (!projectTableExists || !projectAddressTableExists) {
      // eslint-disable-next-line no-console
      console.log('The project table or project_Address table doesnt exist', {
        projectAddressTableExists,
        projectTableExists,
      });
      return;
    }

    await queryRunner.query(`
            DELETE FROM project_address
            USING project
            WHERE project_address."projectId" = project.id AND project_address."networkId"=100 AND  project."givingBlocksId" IS NOT NULL
        `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
