import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectPowerView1662915983382 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
              DROP MATERIALIZED VIEW IF EXISTS public.project_power_view;
              CREATE MATERIALIZED VIEW public.project_power_view 
              AS
              SELECT "powerBoosting"."projectId",
                sum("userPower".power * "powerBoosting".percentage::double precision / 100::double precision) AS "totalPower"
                FROM power_boosting "powerBoosting"
                JOIN user_power "userPower" ON "userPower"."userId" = "powerBoosting"."userId"
                GROUP BY "powerBoosting"."projectId"
                ORDER BY "totalPower" DESC;
  
              ALTER TABLE public.user_project_power_view
                  OWNER TO postgres;

              CREATE INDEX IF NOT EXISTS "project_power_view_project_id"
                  ON public.project_power_view USING hash
                  ("projectId")
                  TABLESPACE pg_default;

              CREATE INDEX IF NOT EXISTS "user_project_power_view_power_boosted"
                  ON public.user_project_power_view USING btree
                  ("boostedPower" DESC NULLS LAST)
                  TABLESPACE pg_default;
          `,
    );
  }

  // tslint:disable-next-line:no-empty
  async down(queryRunner: QueryRunner): Promise<void> {}
}
