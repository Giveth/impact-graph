import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCauseTable1748296561266 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cause_status_enum') THEN
              CREATE TYPE public.cause_status_enum AS ENUM
              ('active', 'deactivated');
          END IF;
      END$$;

      CREATE TABLE IF NOT EXISTS public.cause
      (
          "id" SERIAL NOT NULL,
          "title" text NOT NULL,
          "description" text NOT NULL,
          "chainId" integer NOT NULL,
          "fundingPoolAddress" text NOT NULL,
          "causeId" text NOT NULL,
          "givpowerRank" float NOT NULL DEFAULT 0,
          "instantBoostingRank" float NOT NULL DEFAULT 0,
          "mainCategory" text NOT NULL,
          "subCategories" text[] NOT NULL DEFAULT '{}',
          "ownerId" integer NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "status" cause_status_enum NOT NULL DEFAULT 'active',
          "totalRaised" float NOT NULL DEFAULT 0,
          "totalDonated" float NOT NULL DEFAULT 0,
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_cause_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_cause_causeId" UNIQUE ("causeId"),
          CONSTRAINT "FK_cause_owner" FOREIGN KEY ("ownerId")
              REFERENCES public."user" ("id") MATCH SIMPLE
              ON UPDATE NO ACTION
              ON DELETE NO ACTION
      );

      CREATE INDEX IF NOT EXISTS "IDX_cause_ownerId"
          ON public.cause USING btree ("ownerId" ASC NULLS LAST);

      CREATE INDEX IF NOT EXISTS "IDX_cause_status"
          ON public.cause USING btree ("status" ASC NULLS LAST);

      CREATE INDEX IF NOT EXISTS "IDX_cause_chainId"
          ON public.cause USING btree ("chainId" ASC NULLS LAST);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS public.cause;
      DROP TYPE IF EXISTS public.cause_status_enum;
    `);
  }
}
