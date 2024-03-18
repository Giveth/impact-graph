import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeStatusesInfos1644326560894 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE project_status SET symbol='rejected',  name='rejected', description='This project has been rejected by Giveth or platform owner, We dont use it now' where id=1`,
    );
    await queryRunner.query(
      `UPDATE project_status SET symbol='pending', name='pending', description='This project is created, but pending approval, We dont use it now' where id=2`,
    );
    await queryRunner.query(
      `UPDATE project_status SET symbol='clarification', name='clarification', description='Clarification requested by Giveth or platform owner, We dont use it now' where id=3`,
    );
    await queryRunner.query(
      `UPDATE project_status SET symbol='verification', name='verification', description='Verification in progress (including KYC or otherwise), We dont use it now' where id=4`,
    );
    await queryRunner.query(
      `UPDATE project_status SET symbol='activate', name='activate', description='This is an active project' where id=5`,
    );
    await queryRunner.query(
      `UPDATE project_status SET symbol='deactivate', name='deactivate', description='Deactivated with user or Giveth Admin' where id=6`,
    );
    await queryRunner.query(
      `UPDATE project_status SET symbol='cancelled', name='cancelled', description='Cancelled by Giveth Admin' where id=7`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
