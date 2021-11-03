import { MigrationInterface, QueryRunner } from 'typeorm';

export class addSlugHistoryColumnToProjects1632203974464
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add slugHistory column and set an empty array for default value
    await queryRunner.query(
      `ALTER TABLE "project" ADD "slugHistory" text [] default '{}'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" DROP "slugHistory"`);
  }
}
