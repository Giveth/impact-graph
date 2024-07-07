import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateToBalanceAggregator1692623384774
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Drop instant power balance table and recreate it with new schema
    await queryRunner.query(`
    DELETE FROM public.instant_power_balance;

    ALTER TABLE IF EXISTS public.instant_power_balance
        DROP  COLUMN "chainUpdatedAt",
        ADD COLUMN "balanceAggregatorUpdatedAt" timestamp without time zone NOT NULL;
    `);

    // Drop InstantPowerFetchState table and create new one
    await queryRunner.query(`
    DELETE from public.instant_power_fetch_state;
    ALTER TABLE IF EXISTS public.instant_power_fetch_state
        DROP COLUMN "latestBlockNumber",
        DROP COLUMN "latestBlockTimestamp",
        ADD COLUMN "maxFetchedUpdateAtTimestampMS" bigint NOT NULL;
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
