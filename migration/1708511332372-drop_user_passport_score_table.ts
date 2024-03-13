import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUserPassportScoreTable1708511332372
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // We drop the materialized view to DB allow us to drop the user_passport_score table
    // but we will create new version of materialized view in next migration
    await queryRunner.query(`
            DROP MATERIALIZED VIEW IF EXISTS project_actual_matching_view;
            DROP TABLE IF EXISTS user_passport_score;
        `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
