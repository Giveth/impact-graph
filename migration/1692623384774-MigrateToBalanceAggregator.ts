import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateToBalanceAggregator1692623384774
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Drop instant power balance table and recreate it with new schema
    await queryRunner.query(`
    DROP TABLE IF EXISTS public.instant_power_balance;

    CREATE TABLE IF NOT EXISTS public.instant_power_balance
    (
        id integer NOT NULL DEFAULT nextval('instant_power_balance_id_seq'::regclass),
        "userId" integer NOT NULL,
        balance double precision NOT NULL,
        "balanceAggregatorUpdatedAt" timestamp without time zone NOT NULL,
        CONSTRAINT "PK_d129886058b6cb638e8f731088d" PRIMARY KEY (id)
    )

    TABLESPACE pg_default;

    ALTER TABLE IF EXISTS public.instant_power_balance
        OWNER to postgres;
    -- Index: IDX_6899519607df56ca15f416185c

    -- DROP INDEX IF EXISTS public."IDX_6899519607df56ca15f416185c";

    CREATE UNIQUE INDEX IF NOT EXISTS "IDX_6899519607df56ca15f416185c"
        ON public.instant_power_balance USING btree
        ("userId" ASC NULLS LAST)
        TABLESPACE pg_default;
    -- Index: IDX_8530cd84a7d7a041a0ddefecc2

    -- DROP INDEX IF EXISTS public."IDX_8530cd84a7d7a041a0ddefecc2";
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
