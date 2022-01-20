import { MigrationInterface, QueryRunner } from 'typeorm';
import { Donation } from '../src/entities/donation';

export class UpdateTotalDonations1636314330347 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const projects = await queryRunner.query(`select * from project`);
    for (const project of projects) {
      const donationsAmount = await Donation.query(
        `select COALESCE(SUM("valueUsd"),0) as total from donation where "projectId" = ${project.id}`,
      );
      await queryRunner.query(
        `update project set "totalDonations"=${donationsAmount[0].total} where id=${project.id}`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update project set "totalDonations"=0`);
  }
}
