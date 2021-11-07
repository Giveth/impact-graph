import { MigrationInterface, QueryRunner } from 'typeorm';
import { Reaction } from '../entities/reaction';

export class UpdateTotalHearts1636314323228 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const projects = await queryRunner.query(`select * from project`);
    for (const project of projects) {
      const totalHearts = await queryRunner.query(
        `select count(*) from reaction where "projectId"=${project.id}`,
      );
      await queryRunner.query(
        `update project set "totalHearts"=${totalHearts[0].count} where id=${project.id}`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update project set "totalHearts"=0`);
  }
}
