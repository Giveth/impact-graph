import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateToBalanceAggregator21693205688573
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE IF EXISTS public.power_snapshot
        DROP COLUMN "blockNumber"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
