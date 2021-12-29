import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { ProjectStatus } from '../entities/projectStatus';

export class SeedProjectStatus1614082100757 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectStatuses = await queryRunner.query(
      `SELECT * FROM project_status`,
    );
    if (projectStatuses.length > 0) {
      return;
    }
    await queryRunner.query(`INSERT INTO public.project_status (symbol,"name",description) VALUES 
        ('rjt','rejected','This project has been rejected by Giveth or platform owner')
        ,('pen','pending','This project is created, but pending approval')
        ,('clr','clarificaiton','Clarification requested by Giveth or platform owner')
        ,('ver','verification','Verification in progress (including KYC or otherwise)')
        ,('act','active','This is an active project')
        ,('can','cancelled','Cancelled or deactivated (by owner)')
        ,('del','delisted','Delisted by Giveth or platform owner')
        ;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update project set "statusId" = null where "statusId" is not null;`,
    );
    await queryRunner.query(`delete from project_status where 1 = 1;`);
  }
}
