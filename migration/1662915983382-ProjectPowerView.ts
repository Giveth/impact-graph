import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectPowerView1662915983382 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
              DROP 
                MATERIALIZED VIEW IF EXISTS public.project_power_view;
              CREATE MATERIALIZED VIEW public.project_power_view AS 
              SELECT 
                innerView."projectId" as "projectId", 
                innerView."totalPower" as "totalPower", 
                RANK () OVER (
                  ORDER BY 
                    innerView."totalPower" DESC
                ) as "powerRank",
                NOW() as "updateTime"
              FROM 
                (
                  SELECT 
                    "powerBoosting"."projectId", 
                    sum(
                      "userPower".power * "powerBoosting".percentage :: double precision / 100 :: double precision
                    ) AS "totalPower" 
                  FROM 
                    power_round "powerRound" 
                    JOIN user_power "userPower" ON "userPower"."givbackRound" = "powerRound".round 
                    JOIN power_boosting "powerBoosting" ON "userPower"."userId" = "powerBoosting"."userId" 
                  GROUP BY 
                    "powerBoosting"."projectId" 
                  ORDER BY 
                    (
                      sum(
                        "userPower".power * "powerBoosting".percentage :: double precision / 100 :: double precision
                      )
                    ) DESC
                ) as innerView;
              CREATE INDEX IF NOT EXISTS "project_power_view_project_id" ON public.project_power_view USING hash ("projectId") TABLESPACE pg_default;
              CREATE INDEX IF NOT EXISTS "project_power_view_total_power" ON public.project_power_view USING btree ("totalPower" DESC NULLS LAST) TABLESPACE pg_default;
          `,
    );
  }

  // tslint:disable-next-line:no-empty
  async down(queryRunner: QueryRunner): Promise<void> {}
}
