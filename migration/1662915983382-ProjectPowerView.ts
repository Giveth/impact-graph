import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectPowerView1662915983382 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
              DROP 
                MATERIALIZED VIEW IF EXISTS public.project_power_view;
              CREATE MATERIALIZED VIEW IF NOT EXISTS public.project_power_view AS 
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
                      sum(pp."averagePower"), 
                      0 :: double precision
                    ) AS "totalPower" 
                  FROM 
                    project project 
                    LEFT JOIN (
                      SELECT 
                        "powerRound".ROUND, 
                        "powerBoostingSnapshot"."projectId" as "projectId", 
                        "powerBoostingSnapshot"."userId" as "userId", 
                        avg(
                          "powerBalanceSnapshot".balance * "powerBoostingSnapshot".PERCENTAGE :: double precision / 100 :: double precision
                        ) AS "averagePower", 
                        NOW() AS "updateTime" 
                      FROM 
                        POWER_ROUND "powerRound" 
                        JOIN POWER_SNAPSHOT "powerSnapshot" ON "powerSnapshot"."roundNumber" = "powerRound".ROUND 
                        JOIN POWER_BALANCE_SNAPSHOT "powerBalanceSnapshot" ON "powerBalanceSnapshot"."powerSnapshotId" = "powerSnapshot".id 
                        JOIN POWER_BOOSTING_SNAPSHOT "powerBoostingSnapshot" ON "powerBoostingSnapshot"."powerSnapshotId" = "powerSnapshot".id 
                        and "powerBoostingSnapshot"."userId" = "powerBalanceSnapshot"."userId" 
                      group by 
                        round, 
                        "powerBoostingSnapshot"."projectId", 
                        "powerBoostingSnapshot"."userId"
                    ) pp ON pp."projectId" = project.id 
                  GROUP BY 
                    project.id
                ) innerview 
              ORDER BY 
                innerview."totalPower" DESC WITH DATA;
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
