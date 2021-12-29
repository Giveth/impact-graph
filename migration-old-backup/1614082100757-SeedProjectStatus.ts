import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { ProjectStatus } from '../entities/projectStatus';

export class SeedProjectStatus1614082100757 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // const projectStatusRepository = getRepository(ProjectStatus)
    // const projectStatuses = projectStatusRepository.create([{
    //     symbol: 'rjt',
    //     name: `rejected`,
    //     description: 'This project has been rejected by Giveth or platform owner'
    //   },
    //   {
    //     symbol: 'pen',
    //     name: 'pending',
    //     description: 'This project is created, but pending approval'
    //   },
    //   {
    //     symbol: 'clr',
    //     name: 'clarificaiton',
    //     description: 'Clarification requested by Giveth or platform owner'
    //   },
    //   {
    //     symbol: 'ver',
    //     name: 'verification',
    //     description: 'Verification in progress (including KYC or otherwise)'
    //   },
    //   {
    //     symbol: 'act',
    //     name: 'active',
    //     description: 'This is an active project'
    //   },
    //   {
    //     symbol: 'can',
    //     name: 'cancelled',
    //     description: 'Cancelled or deactivated (by owner)'
    //   },
    //   {
    //     symbol: 'del',
    //     name: 'delisted',
    //     description: 'Delisted by Giveth or platform owner'
    //   }
    // ])

    // await projectStatusRepository.save(projectStatuses)

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
