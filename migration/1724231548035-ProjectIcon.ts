import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectIcon1724231548035 implements MigrationInterface {
  name = 'ProjectIcon1724231548035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "icon" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_update" ADD "icon" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project_update" DROP COLUMN "icon"`);
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "icon"`);
  }
}
