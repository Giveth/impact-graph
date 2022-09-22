import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectPowerView1662915983382 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
              DROP 
                MATERIALIZED VIEW IF EXISTS public.project_power_view;
              CREATE MATERIALIZED VIEW public.project_power_view AS 
              SELECT 
                innerview."projectId", 
                innerview."totalPower", 
                rank() OVER (
                  ORDER BY 
                    innerview."totalPower" DESC
                ) AS "powerRank", 
                now() AS "updateTime" 
              FROM 
                (
                  SELECT 
                    project.id AS "projectId", 
                    COALESCE(
                      sum(
                        pp.power * pp.percentage :: double precision / 100 :: double precision
                      ), 
                      0 :: double precision
                    ) AS "totalPower" 
                  FROM 
                    project project 
                    LEFT JOIN (
                      select 
                        "powerBoosting".percentage, 
                        "powerBoosting"."projectId", 
                        "userPower".power 
                      from 
                        power_boosting "powerBoosting" 
                        JOIN user_power "userPower" ON "userPower"."userId" = "powerBoosting"."userId" 
                        JOIN power_round "powerRound" ON "userPower"."givbackRound" = "powerRound".round
                    ) AS "pp" on "pp"."projectId" = project.id 
                  GROUP BY 
                    project.id
                ) innerview 
              order by 
                "totalPower" DESC WITH DATA;
              ALTER TABLE 
                IF EXISTS public.project_power_view OWNER TO postgres;
              CREATE INDEX project_power_view_project_id ON public.project_power_view USING hash ("projectId") TABLESPACE pg_default;
              CREATE INDEX project_power_view_total_power ON public.project_power_view USING btree ("totalPower" DESC) TABLESPACE pg_default;

          `,
    );
  }

  // tslint:disable-next-line:no-empty
  async down(queryRunner: QueryRunner): Promise<void> {}
}
