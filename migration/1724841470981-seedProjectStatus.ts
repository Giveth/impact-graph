import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedProjectStatus1724841470981 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const projectStatuses = await queryRunner.query(
      `SELECT * FROM project_status`,
    );
    if (projectStatuses.length > 0) {
      return;
    }
    await queryRunner.query(`INSERT INTO public.project_status (symbol,"name",description) VALUES
              ('rejected','rejected','This project has been rejected by Giveth or platform owner, We dont use it now')
              ,('pending','pending','This project is created, but pending approval, We dont use it now')
              ,('clarification','clarification','Clarification requested by Giveth or platform owner, We dont use it now')
              ,('verification','verification','Verification in progress (including KYC or otherwise), We dont use it now')
              ,('activated','activated','This is an active project')
              ,('deactivated','deactivated','Deactivated with user or Giveth Admin')
              ,('cancelled','cancelled','Cancelled by Giveth Admin')
              ,('drafted', 'drafted', 'This project is created as a draft for a potential new project, but can be discarded')
              ;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update project set "statusId" = null where "statusId" is not null;`,
    );
    await queryRunner.query(`delete from project_status where 1 = 1;`);
  }
}
