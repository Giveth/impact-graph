import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstantBoostingTables1683189393828
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Create instant power balance table
    await queryRunner.query(
      `
              CREATE TABLE IF NOT EXISTS public.instant_power_balance
              (
                  id SERIAL NOT NULL,
                  "userId" integer NOT NULL,
                  balance double precision NOT NULL,
                  "chainUpdatedAt" integer NOT NULL,
                  CONSTRAINT "PK_d129886058b6cb638e8f731088d" PRIMARY KEY (id)
              )

                  TABLESPACE pg_default;

              -- Index: IDX_6899519607df56ca15f416185c

              CREATE UNIQUE INDEX IF NOT EXISTS "IDX_6899519607df56ca15f416185c"
                  ON public.instant_power_balance USING btree
                      ("userId" ASC NULLS LAST)
                  TABLESPACE pg_default;
              -- Index: IDX_d6fec7c0f512a6b409728e21a0

              CREATE INDEX IF NOT EXISTS "IDX_d6fec7c0f512a6b409728e21a0"
                  ON public.instant_power_balance USING btree
                      ("chainUpdatedAt" ASC NULLS LAST)
                  TABLESPACE pg_default;
          `,
    );

    // Create instant power fetch state table
    await queryRunner.query(`

      CREATE TABLE IF NOT EXISTS public.instant_power_fetch_state
      (
          id boolean NOT NULL,
          "latestBlockNumber" integer NOT NULL,
          "latestBlockTimestamp" integer NOT NULL,
          CONSTRAINT "PK_a686115bd3ba34aa38b006d3a4d" PRIMARY KEY (id),
          CONSTRAINT "CHK_860e525a72150d69afd94fe18d" CHECK (id)
      )

      TABLESPACE pg_default;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop instant power balance table
    await queryRunner.query(`
      DROP TABLE IF EXISTS public.instant_power_balance;
      DROP INDEX IF EXISTS public."IDX_6899519607df56ca15f416185c";
      DROP INDEX IF EXISTS public."IDX_d6fec7c0f512a6b409728e21a0";
    `);

    // Drop instant power fetch state table
    await queryRunner.query(`
      DROP TABLE IF EXISTS public.instant_power_fetch_state;
    `);
  }
}
