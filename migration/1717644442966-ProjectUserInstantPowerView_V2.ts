import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectUserInstantPowerViewV21717644442966
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP MATERIALIZED VIEW IF EXISTS PUBLIC.PROJECT_USER_INSTANT_POWER_VIEW;

        CREATE MATERIALIZED VIEW IF NOT EXISTS PUBLIC.PROJECT_USER_INSTANT_POWER_VIEW AS
        SELECT "powerBoosting"."id",
            "powerBoosting"."projectId",
            "powerBoosting"."userId",
            ("instantPowerBalance".BALANCE * "powerBoosting".PERCENTAGE :: double precision / 100 :: double precision) AS "boostedPower",
            NOW() AS "updateTime"
        FROM INSTANT_POWER_BALANCE "instantPowerBalance"
        JOIN POWER_BOOSTING "powerBoosting" ON "powerBoosting"."userId" = "instantPowerBalance"."userId";
    `);

    await queryRunner.query(`
        CREATE UNIQUE INDEX project_user_instant_power_view_id ON public.project_user_instant_power_view ("id");
    `);

    await queryRunner.query(`
        CREATE UNIQUE INDEX project_user_instant_power_view_project_user_id ON public.project_user_instant_power_view ("projectId", "userId");
    `);

    await queryRunner.query(`
        CREATE INDEX project_user_instant_power_view_project_id ON PUBLIC.PROJECT_USER_INSTANT_POWER_VIEW USING hash ("projectId") TABLESPACE pg_default;
    `);
    await queryRunner.query(`
        CREATE INDEX PROJECT_USER_INSTANT_POWER_VIEW_TOTAL_POWER ON PUBLIC.PROJECT_USER_INSTANT_POWER_VIEW USING BTREE ("boostedPower" DESC) TABLESPACE PG_DEFAULT;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
