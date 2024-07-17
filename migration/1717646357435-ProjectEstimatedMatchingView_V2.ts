import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectEstimatedMatchingViewV21717646357435
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
              DROP MATERIALIZED VIEW IF EXISTS project_estimated_matching_view;
              `,
    );
    await queryRunner.query(
      `
          CREATE MATERIALIZED VIEW project_estimated_matching_view AS
          SELECT
            donations_by_user."projectId",
            donations_by_user."qfRoundId",
            SUM(donations_by_user."valueUsd") as "sumValueUsd",
            COUNT(*) as "uniqueDonorsCount",
            SUM(SQRT(donations_by_user."valueUsd")) as "sqrtRootSum",
            POWER(SUM(SQRT(donations_by_user."valueUsd")), 2) as "sqrtRootSumSquared",
            COUNT(donations_by_user."userId") as "donorsCount"
          FROM (
            SELECT
              "donation"."projectId",
              "donation"."qfRoundId",
              SUM("donation"."valueUsd") as "valueUsd",
              "donation"."userId"
            FROM
              "donation"
              INNER JOIN "user" ON "user"."id" = "donation"."userId"
              INNER JOIN "qf_round" ON "qf_round"."id" = "donation"."qfRoundId"
            WHERE
              "donation"."status" = 'verified'
              AND "donation"."createdAt" BETWEEN "qf_round"."beginDate" AND "qf_round"."endDate"
            GROUP BY
              "donation"."projectId",
              "donation"."qfRoundId",
              "donation"."userId"
          ) as donations_by_user
          GROUP BY
            donations_by_user."projectId",
            donations_by_user."qfRoundId";
        `,
    );
    await queryRunner.query(`
      CREATE INDEX idx_project_estimated_matching_project_id ON project_estimated_matching_view USING hash ("projectId");
      CREATE INDEX idx_project_estimated_matching_qf_round_id ON project_estimated_matching_view USING btree ("qfRoundId");
      CREATE UNIQUE INDEX idx_project_estimated_matching_unique ON project_estimated_matching_view ("projectId", "qfRoundId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DROP MATERIALIZED VIEW project_estimated_matching_view;
          `,
    );
  }
}
