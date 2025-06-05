import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStellarToEstimatedMatchingCalc1749072346678
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP MATERIALIZED VIEW IF EXISTS project_estimated_matching_view;
    `);

    await queryRunner.query(`
      CREATE MATERIALIZED VIEW project_estimated_matching_view AS
      SELECT
        donations_by_identity."projectId",
        donations_by_identity."qfRoundId",
        SUM(SQRT(donations_by_identity."valueUsd")) AS "sqrtRootSum",
        POWER(SUM(SQRT(donations_by_identity."valueUsd")), 2) AS "sqrtRootSumSquared"
      FROM (
        SELECT
          d."projectId",
          d."qfRoundId",
          SUM(d."valueUsd") AS "valueUsd",
          COALESCE(CAST(d."userId" AS TEXT), d."fromWalletAddress") AS donor_identity
        FROM
          "donation" d
        INNER JOIN "qf_round" q ON q."id" = d."qfRoundId"
        WHERE
          d."status" = 'verified'
          AND d."createdAt" BETWEEN q."beginDate" AND q."endDate"
          AND (
            d."userId" IS NOT NULL
            OR (
              d."userId" IS NULL
              AND d."chainType" = 'STELLAR'
              AND d."isQRDonation" = true
              AND d."fromWalletAddress" IS NOT NULL
            )
          )
        GROUP BY
          d."projectId",
          d."qfRoundId",
          donor_identity
      ) AS donations_by_identity
      GROUP BY
        donations_by_identity."projectId",
        donations_by_identity."qfRoundId";
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_estimated_matching_project_id ON project_estimated_matching_view USING hash ("projectId");
      CREATE INDEX idx_project_estimated_matching_qf_round_id ON project_estimated_matching_view USING btree ("qfRoundId");
      CREATE UNIQUE INDEX idx_project_estimated_matching_unique ON project_estimated_matching_view ("projectId", "qfRoundId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP MATERIALIZED VIEW project_estimated_matching_view;
    `);
  }
}
