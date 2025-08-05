import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCauseToProject1748296561268 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.project
      ADD COLUMN IF NOT EXISTS "causeId" integer,
      ADD CONSTRAINT "FK_project_cause" FOREIGN KEY ("causeId")
          REFERENCES public.cause ("id") MATCH SIMPLE
          ON UPDATE NO ACTION
          ON DELETE NO ACTION;

      CREATE INDEX IF NOT EXISTS "IDX_project_causeId"
          ON public.project USING btree ("causeId" ASC NULLS LAST);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.project
      DROP CONSTRAINT IF EXISTS "FK_project_cause",
      DROP COLUMN IF EXISTS "causeId";
    `);
  }
}
