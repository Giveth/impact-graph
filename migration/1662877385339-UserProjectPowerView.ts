import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProjectPowerView1662877385339 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                DROP MATERIALIZED VIEW IF EXISTS public.user_project_power_view;
                CREATE MATERIALIZED VIEW public.user_project_power_view 
                AS
                SELECT "powerRound".round,
                  "userPower".power AS "userPower",
                  "powerBoosting".id,
                  "powerBoosting"."projectId",
                  "powerBoosting"."userId",
                  "powerBoosting".percentage,
                  "userPower".power * "powerBoosting".percentage::double precision / 100::double precision AS "boostedPower"
                FROM power_round "powerRound"
                   JOIN user_power "userPower" ON "userPower"."givbackRound" = "powerRound".round
                   JOIN power_boosting "powerBoosting" ON "powerBoosting"."userId" = "userPower"."userId";
  
                CREATE INDEX IF NOT EXISTS "user_project_power_view_project_id"
                    ON public.user_project_power_view USING hash
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
