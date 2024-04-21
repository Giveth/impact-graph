import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeOlderProjectStatusHistories1646131845613
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // We added createdAt field, as we didnt deployed history feature to production
    // I deleted all records then after that all records would have createdAt
    await queryRunner.query(`DROP TABLE IF EXISTS project_status_history`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
