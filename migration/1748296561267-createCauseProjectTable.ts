import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCauseProjectTable1748296561267
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.cause_project
      (
          "id" SERIAL NOT NULL,
          "causeId" integer NOT NULL,
          "projectId" integer NOT NULL,
          "amountReceived" float NOT NULL DEFAULT 0,
          "amountReceivedUsdValue" float NOT NULL DEFAULT 0,
          "causeScore" float NOT NULL DEFAULT 0,
          CONSTRAINT "PK_cause_project_id" PRIMARY KEY ("id"),
          CONSTRAINT "FK_cause_project_cause" FOREIGN KEY ("causeId")
              REFERENCES public.cause ("id") MATCH SIMPLE
              ON UPDATE NO ACTION
              ON DELETE NO ACTION,
          CONSTRAINT "FK_cause_project_project" FOREIGN KEY ("projectId")
              REFERENCES public.project ("id") MATCH SIMPLE
              ON UPDATE NO ACTION
              ON DELETE NO ACTION
      );

      CREATE INDEX IF NOT EXISTS "IDX_cause_project_causeId"
          ON public.cause_project USING btree ("causeId" ASC NULLS LAST);

      CREATE INDEX IF NOT EXISTS "IDX_cause_project_projectId"
          ON public.cause_project USING btree ("projectId" ASC NULLS LAST);

      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cause_project_unique"
          ON public.cause_project USING btree ("causeId" ASC NULLS LAST, "projectId" ASC NULLS LAST);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS public.cause_project;
    `);
  }
}
