import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectActualMatchingV81709625907739 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP MATERIALIZED VIEW IF EXISTS project_actual_matching_view;

            CREATE MATERIALIZED VIEW project_actual_matching_view AS
            WITH DonationsBeforeAnalysis AS (
                SELECT
                    p.id,
                    p.slug,
                    p.title,
                    qr.id as "qfId",
                    qr."minimumPassportScore" as "minimumPassportScore",
                    STRING_AGG(DISTINCT pa."networkId" || '-' || pa."address", ', ') AS "networkAddresses",
                    COALESCE(SUM(d."valueUsd"), 0) AS "allUsdReceived",
                    COUNT(DISTINCT d."fromWalletAddress") AS "totalDonors"
                FROM
                    public.donation d
                    INNER JOIN project p ON p.id = d."projectId"
                    INNER JOIN qf_round qr ON qr.id = d."qfRoundId"
                    INNER JOIN project_address pa ON pa."projectId" = p.id AND pa."networkId" = ANY(qr."eligibleNetworks")
                    LEFT JOIN project_fraud pf ON pf."projectId" = p.id AND pf."qfRoundId" = qr.id
                WHERE
                    pf.id IS NULL
                    AND d."valueUsd" >= qr."minimumValidUsdValue"
                    AND d."status" = 'verified'
                    AND d."qfRoundUserScore" > qr."minimumPassportScore"
                GROUP BY
                    p.id,
                    p.title,
                    p.slug,
                    qr.id
            ),
            UserProjectDonations AS (
                SELECT
                    d2."userId",
                    d2."projectId",
                    d2."qfRoundId",
                    SUM(d2."valueUsd") AS "totalValueUsd"
                FROM
                    public.donation d2
                    INNER JOIN qf_round qr ON qr.id = d2."qfRoundId"
                WHERE
                    d2."valueUsd" >= qr."minimumValidUsdValue"
                    AND d2."status" = 'verified'
                    AND d2."qfRoundUserScore" > qr."minimumPassportScore"
                GROUP BY
                    d2."userId",
                    d2."projectId",
                    d2."qfRoundId"
            ),
            DonationsAfterAnalysis AS (
                SELECT
                    p.id,
                    p.slug,
                    p.title,
                    qr.id as "qfId",
                    COALESCE(SUM(upd."totalValueUsd"), 0) AS "allUsdReceivedAfterSybilsAnalysis",
                    COUNT(DISTINCT d."fromWalletAddress") AS "uniqueDonors",
                    SUM(SQRT(upd."totalValueUsd")) AS "donationsSqrtRootSum",
                    POWER(SUM(SQRT(upd."totalValueUsd")), 2) as "donationsSqrtRootSumSquared"
                FROM
                    UserProjectDonations upd
                    INNER JOIN project p ON p.id = upd."projectId"
                    INNER JOIN qf_round qr ON qr.id = upd."qfRoundId"
                    INNER JOIN project_address pa ON pa."projectId" = upd."projectId" AND pa."networkId" = ANY(qr."eligibleNetworks")
                    LEFT JOIN "sybil" s ON s."userId" = upd."userId" AND s."qfRoundId" = qr.id
                    LEFT JOIN project_fraud pf ON pf."projectId" = upd."projectId" AND pf."qfRoundId" = qr.id
                    INNER JOIN donation d ON d."userId" = upd."userId" AND d."projectId" = upd."projectId" AND d."qfRoundId" = qr.id
                WHERE
                    p."statusId" = 5
                    AND NOT EXISTS (
                        SELECT 1
                        FROM public.project_address pa2
                        JOIN public.project p4 ON p4.id = pa2."projectId"
                        WHERE LOWER(pa2.address) = LOWER(d."fromWalletAddress")
                        AND p4."verified" = true
                        AND p4."listed" = true
                    )
                    AND s.id IS NULL
                    AND pf.id IS NULL
                GROUP BY
                    p.id,
                    p.title,
                    p.slug,
                    qr.id
            )
            SELECT
                d1.id AS "projectId",
                d1.title,
                d1.slug,
                d1."networkAddresses",
                d1."qfId" AS "qfRoundId",
                d1."allUsdReceived",
                d1."totalDonors",
                d2."allUsdReceivedAfterSybilsAnalysis",
                d2."uniqueDonors",
                d2."donationsSqrtRootSum",
                d2."donationsSqrtRootSumSquared"
            FROM
                DonationsBeforeAnalysis d1
                INNER JOIN DonationsAfterAnalysis d2 ON d1.id = d2.id AND d1.slug = d2.slug AND d1."qfId" = d2."qfId";

            CREATE INDEX idx_project_actual_matching_project_id ON project_actual_matching_view USING hash ("projectId");
            CREATE INDEX idx_project_actual_matching_qf_round_id ON project_actual_matching_view USING hash ("qfRoundId");
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    //
  }
}
