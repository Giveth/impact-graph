import { MigrationInterface, QueryRunner } from 'typeorm';

export class LastSnapshotProjectPowerViewV21717648491606
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DROP
              MATERIALIZED VIEW IF EXISTS public.last_snapshot_project_power_view;
            CREATE MATERIALIZED VIEW IF NOT EXISTS public.last_snapshot_project_power_view AS
            SELECT
              INNERVIEW."projectId",
              ROUND(
                CAST(
                  INNERVIEW."totalPower" AS NUMERIC
                ),
                2
              ) AS "totalPower",
              RANK() OVER (
                ORDER BY
                  INNERVIEW."totalPower" DESC
              ) AS "powerRank",
              "powerRound".ROUND
            FROM
              (
                SELECT
                  PROJECT.ID AS "projectId",
                  CASE PROJECT.VERIFIED
                  AND PROJECT."statusId" = 5 WHEN FALSE THEN 0 :: double precision ELSE COALESCE(
                    SUM(PP."boostedPower"),
                    0 :: double precision
                  ) END AS "totalPower"
                FROM
                  PROJECT PROJECT
                  LEFT JOIN (
                    SELECT
                      "powerBoostingSnapshot"."projectId",
                      "powerBoostingSnapshot"."userId",
                      "powerBalanceSnapshot".BALANCE * "powerBoostingSnapshot".PERCENTAGE :: double precision / 100 :: double precision AS "boostedPower",
                      NOW() AS "updateTime"
                    FROM
                      (
                        select
                          *
                        from
                          POWER_SNAPSHOT
                        where
                          "synced" = true
                        order by
                          id DESC
                        limit
                          1
                      ) LAST_POWER_SNAPSHOT
                      JOIN POWER_BALANCE_SNAPSHOT "powerBalanceSnapshot" ON "powerBalanceSnapshot"."powerSnapshotId" = LAST_POWER_SNAPSHOT.ID
                      JOIN POWER_BOOSTING_SNAPSHOT "powerBoostingSnapshot" ON "powerBoostingSnapshot"."powerSnapshotId" = LAST_POWER_SNAPSHOT.ID
                      AND "powerBoostingSnapshot"."userId" = "powerBalanceSnapshot"."userId"
                  ) PP ON PP."projectId" = PROJECT.ID
                GROUP BY
                  PROJECT.ID
              ) INNERVIEW,
              POWER_ROUND "powerRound"
            WHERE
              "totalPower" > 0
            ORDER BY
              INNERVIEW."totalPower" DESC WITH DATA;

            CREATE UNIQUE INDEX idx_last_snapshot_project_power_view_unique ON public.last_snapshot_project_power_view ("projectId");
            CREATE INDEX last_snapshot_project_power_view_total_power ON public.last_snapshot_project_power_view USING btree ("totalPower" DESC) TABLESPACE pg_default;
      `,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
