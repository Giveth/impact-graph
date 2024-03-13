import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProjectPowerView1662877385339 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
              DROP
                MATERIALIZED VIEW IF EXISTS public.user_project_power_view;
              CREATE MATERIALIZED VIEW IF NOT EXISTS PUBLIC.USER_PROJECT_POWER_VIEW TABLESPACE PG_DEFAULT AS
              SELECT
                row_number() over() as "id",
                "powerRound".ROUND,
                "powerBoostingSnapshot"."projectId" as "projectId",
                "powerBoostingSnapshot"."userId" as "userId",
                avg(
                  "powerBalanceSnapshot".balance * "powerBoostingSnapshot".PERCENTAGE :: double precision / 100 :: double precision
                ) AS "boostedPower"
              FROM
                POWER_ROUND "powerRound"
                JOIN POWER_SNAPSHOT "powerSnapshot" ON "powerSnapshot"."roundNumber" = "powerRound".ROUND
                JOIN POWER_BALANCE_SNAPSHOT "powerBalanceSnapshot" ON "powerBalanceSnapshot"."powerSnapshotId" = "powerSnapshot".id
                JOIN POWER_BOOSTING_SNAPSHOT "powerBoostingSnapshot" ON "powerBoostingSnapshot"."powerSnapshotId" = "powerSnapshot".id
                and "powerBoostingSnapshot"."userId" = "powerBalanceSnapshot"."userId"
              group by
                round,
                "powerBoostingSnapshot"."projectId",
                "powerBoostingSnapshot"."userId";
              CREATE INDEX USER_PROJECT_POWER_VIEW_POWER_BOOSTED ON PUBLIC.USER_PROJECT_POWER_VIEW USING BTREE ("boostedPower" DESC) TABLESPACE PG_DEFAULT;
              CREATE INDEX USER_PROJECT_POWER_VIEW_PROJECT_ID ON PUBLIC.USER_PROJECT_POWER_VIEW USING HASH ("projectId") TABLESPACE PG_DEFAULT;
          `,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
