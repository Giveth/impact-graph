import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLatestUpdateCreationDateToProject1720095110381
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE project
        ADD COLUMN "latestUpdateCreationDate" TIMESTAMP WITHOUT TIME ZONE;
    `);

    await queryRunner.query(`
        UPDATE project
        SET "latestUpdateCreationDate" = subquery."latestUpdateCreationDate"
        FROM (
            SELECT project.id AS project_id, MAX(project_update."createdAt") AS "latestUpdateCreationDate"
            FROM project
            LEFT JOIN project_update ON project.id = project_update."projectId"
            GROUP BY project.id
        ) AS subquery
        WHERE project.id = subquery.project_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE project
        DROP COLUMN "latestUpdateCreationDate";
    `);
  }
}
