import {MigrationInterface, QueryRunner, getRepository} from "typeorm";
import { ProjectStatus } from '../entities/projectStatus';

export class SeedProjectStatus1614082100757 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const projectStatusRepository = getRepository(ProjectStatus)
        const projectStatuses = projectStatusRepository.create([{
            symbol: 'rjt',
            name: `rejected`,
            description: 'This project has been rejected by Giveth or platform owner'
          },
          {
            symbol: 'pen',
            name: 'pending',
            description: 'This project is created, but pending approval'
          },
          {
            symbol: 'clr',
            name: 'clarificaiton',
            description: 'Clarification requested by Giveth or platform owner'
          },
          {
            symbol: 'ver',
            name: 'verification',
            description: 'Verification in progress (including KYC or otherwise)'
          },
          {
            symbol: 'act',
            name: 'active',
            description: 'This is an active project'
          },
          {
            symbol: 'can',
            name: 'cancelled',
            description: 'Cancelled or deactivated (by owner)'
          },
          {
            symbol: 'del',
            name: 'delisted',
            description: 'Delisted by Giveth or platform owner'
          }
        ])
        
        await projectStatusRepository.save(projectStatuses)
        
        
        await queryRunner.query(`UPDATE "project" SET "statusId" = 5`);

       
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
