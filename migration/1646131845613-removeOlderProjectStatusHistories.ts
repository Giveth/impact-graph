import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeOlderProjectStatusHistories1646131845613
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // We added createdAt field, as we didnt deployed history feature to production
      // I deleted all records then after that all records would have createdAt
      await queryRunner.query(`DELETE FROM project_status_history`);
    } catch (e) {
      // We might dont have this table in some environments
        // tslint:disable-next-line:no-console
      console.log('removeOlderProjectStatusHistories1646131845613 error', e);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
