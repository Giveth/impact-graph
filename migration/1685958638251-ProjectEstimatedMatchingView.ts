import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectEstimatedMatchingView1685958638251
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
    DROP MATERIALIZED VIEW IF EXISTS project_estimated_matching_view;
    CREATE MATERIALIZED VIEW project_estimated_matching_view AS
    SELECT
      donations_by_user."projectId",
      donations_by_user."qfRoundId",
      SUM(donations_by_user."valueUsd") as "sumValueUsd",
      COUNT(*) as "uniqueDonorsCount",
      SUM(SQRT(donations_by_user."valueUsd")) as "sqrtRootSum"
    FROM (
      SELECT
        "donation"."projectId",
        "donation"."qfRoundId",
        SUM("donation"."valueUsd") as "valueUsd"
      FROM
        "donation"
        INNER JOIN "user" ON "user"."id" = "donation"."userId"
        INNER JOIN "qf_round" ON "qf_round"."id" = "donation"."qfRoundId"
      WHERE
        "donation"."status" = 'verified'
        AND "user"."passportScore" >= "qf_round"."minimumPassportScore"
        AND "donation"."createdAt" BETWEEN "qf_round"."beginDate" AND "qf_round"."endDate"
      GROUP BY
        "donation"."projectId",
        "donation"."qfRoundId",
        "donation"."userId"
    ) as donations_by_user
    GROUP BY
      donations_by_user."projectId",
      donations_by_user."qfRoundId";
      
    CREATE INDEX idx_project_estimated_matching_project_id ON project_estimated_matching_view USING hash ("projectId");
    CREATE INDEX idx_project_estimated_matching_qf_round_id ON project_estimated_matching_view USING btree ("qfRoundId");
  `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DROP MATERIALIZED VIEW project_estimated_matching_view;
    `,
    );
  }
}
