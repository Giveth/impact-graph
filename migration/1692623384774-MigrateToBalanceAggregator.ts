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
        
    DROP TABLE IF EXISTS public.instant_power_fetch_state;

    CREATE TABLE IF NOT EXISTS public.instant_power_fetch_state
    (
        id boolean NOT NULL,
        "maxFetchedUpdateAtTimestampMS" bigint NOT NULL,
        CONSTRAINT "PK_a686115bd3ba34aa38b006d3a4d" PRIMARY KEY (id),
        CONSTRAINT "CHK_860e525a72150d69afd94fe18d" CHECK (id)
    )

    TABLESPACE pg_default;

    ALTER TABLE IF EXISTS public.instant_power_fetch_state
        OWNER to postgres;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
