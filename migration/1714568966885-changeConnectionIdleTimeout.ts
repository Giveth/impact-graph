import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeConnectionIdleTimeout1714568966885
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(
        `ALTER DATABASE "${process.env.TYPEORM_DATABASE_NAME}" SET idle_in_transaction_session_timeout = '10min';`,
      );
    } catch (e) {
      console.error(
        'Error setting idle_in_transaction_session_timeout, try to run the query manually ...',
        e,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
