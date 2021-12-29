import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTotalProjectUpdates1637708818194
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "totalProjectUpdates" Integer default 0`,
    );
    const projects = await queryRunner.query(`select * from project`);
    for (const project of projects) {
      const totalProjectUpdates = await queryRunner.query(
        `select count(*) from project_update where "projectId"=${project.id}`,
      );
      await queryRunner.query(
        `update project set "totalProjectUpdates"=${totalProjectUpdates[0].count} where id=${project.id}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "totalProjectUpdates"`,
    );
  }
}
