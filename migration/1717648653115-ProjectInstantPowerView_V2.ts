import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectInstantPowerViewV21717648653115
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
       DROP MATERIALIZED VIEW IF EXISTS public.project_instant_power_view;
        CREATE MATERIALIZED VIEW IF NOT EXISTS public.project_instant_power_view AS
        SELECT
          innerview."projectId",
          ROUND(CAST(innerview."totalPower" as NUMERIC), 2) as "totalPower",
          rank() OVER (
            ORDER BY
              innerview."totalPower" DESC
          ) AS "powerRank"
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
                  "powerBoosting"."projectId",
                  sum("instantPowerBalance".balance * "powerBoosting".percentage :: double precision / 100 :: double precision) AS "boostedPower",
                  now() AS "updateTime"
                FROM
                  instant_power_balance "instantPowerBalance"
                  JOIN power_boosting "powerBoosting" ON "powerBoosting"."userId" = "instantPowerBalance"."userId"
                GROUP BY
                  "powerBoosting"."projectId"
              ) pp ON pp."projectId" = project.id
            GROUP BY
              project.id
          ) innerview
        ORDER BY
          innerview."totalPower" DESC WITH DATA;
      `);

    await queryRunner.query(`
        CREATE UNIQUE INDEX idx_project_instant_power_view_unique ON public.project_instant_power_view ("projectId");
      `);

    await queryRunner.query(`
            CREATE INDEX project_instant_power_view_project_id ON public.project_instant_power_view USING hash ("projectId") TABLESPACE pg_default;
        `);
    await queryRunner.query(`
            CREATE INDEX project_instant_power_view_total_power ON public.project_instant_power_view USING btree ("totalPower" DESC) TABLESPACE pg_default;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP MATERIALIZED VIEW IF EXISTS public.project_instant_power_view;
        DROP INDEX IF EXISTS public.idx_project_instant_power_view_unique;
        DROP INDEX IF EXISTS public.project_instant_power_view_project_id;
        DROP INDEX IF EXISTS public.project_instant_power_view_total_power;
    `);
  }
}
