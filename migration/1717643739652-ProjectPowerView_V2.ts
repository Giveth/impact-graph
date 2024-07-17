import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectPowerViewV21717643739652 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                    DROP
                      MATERIALIZED VIEW IF EXISTS public.project_power_view;
                    CREATE MATERIALIZED VIEW IF NOT EXISTS public.project_power_view AS
                    SELECT
                      innerview."projectId",
                      ROUND(CAST(innerview."totalPower" as NUMERIC), 2) as "totalPower",
                      rank() OVER (
                        ORDER BY
                          innerview."totalPower" DESC
                      ) AS "powerRank",
                      "powerRound".round
                    FROM
                      (
                        SELECT
                          project.id AS "projectId",
                          CASE project.verified and project."statusId" = 5 WHEN false THEN 0 :: double precision ELSE COALESCE(
                            sum(pp."boostedPower"),
                            0 :: double precision
                          ) END AS "totalPower"
                        FROM
                          project project
                          LEFT JOIN (
                            SELECT
                              "powerRound".round,
                              "powerBoostingSnapshot"."projectId",
                              "powerBoostingSnapshot"."userId",
                              avg(
                                "powerBalanceSnapshot".balance * "powerBoostingSnapshot".percentage :: double precision / 100 :: double precision
                              ) AS "boostedPower",
                              now() AS "updateTime"
                            FROM
                              power_round "powerRound"
                              JOIN power_snapshot "powerSnapshot" ON "powerSnapshot"."roundNumber" = "powerRound".round
                              JOIN power_balance_snapshot "powerBalanceSnapshot" ON "powerBalanceSnapshot"."powerSnapshotId" = "powerSnapshot".id
                              JOIN power_boosting_snapshot "powerBoostingSnapshot" ON "powerBoostingSnapshot"."powerSnapshotId" = "powerSnapshot".id
                              AND "powerBoostingSnapshot"."userId" = "powerBalanceSnapshot"."userId"
                            GROUP BY
                              "powerRound".round,
                              "powerBoostingSnapshot"."projectId",
                              "powerBoostingSnapshot"."userId"
                          ) pp ON pp."projectId" = project.id
                        GROUP BY
                          project.id
                      ) innerview,
                      power_round "powerRound"
                    ORDER BY
                      innerview."totalPower" DESC WITH DATA;
                    CREATE UNIQUE INDEX project_power_view_project_id_round_unique ON public.project_power_view ("projectId", "round");
                    CREATE INDEX project_power_view_project_id ON public.project_power_view USING hash ("projectId") TABLESPACE pg_default;
                    CREATE INDEX project_power_view_total_power ON public.project_power_view USING btree ("totalPower" DESC) TABLESPACE pg_default;
                `,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
