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
                    STRING_AGG(distinct pa."networkId" || '-' || pa."address", ', ') AS "networkAddresses",
                    COALESCE(SUM(d."valueUsd"), 0) AS "allUsdReceived", 
                    COUNT(DISTINCT d."fromWalletAddress") AS "totalDonors"
                FROM 
                    public.donation AS d
                    INNER JOIN project p ON p.id = d."projectId"
                    INNER JOIN qf_round qr ON qr.id = d."qfRoundId"
                    INNER JOIN project_address pa ON pa."projectId" = p.id AND pa."networkId" = ANY(qr."eligibleNetworks")
                    LEFT JOIN project_fraud pf ON pf."projectId" = p.id AND pf."qfRoundId" = qr.id
                WHERE
                    pf.id IS NULL
                    AND d."valueUsd" >= 0.65
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
                    SUM(d2."valueUsd") AS "totalValueUsd"
                FROM 
                    public.donation AS d2
                    INNER JOIN qf_round qr ON qr.id = d2."qfRoundId"
                WHERE 
                    d2."valueUsd" >= 0.65
                    AND d2."status" = 'verified'
                    AND d2."qfRoundUserScore" > qr."minimumPassportScore"
                GROUP BY 
                    d2."userId", 
                    d2."projectId"
            ),
            DonationsAfterAnalysis AS (
                SELECT 
                    p2.id, 
                    p2.slug, 
                    p2.title,
                    qr.id as "qfId",
                    COALESCE(SUM(upd."totalValueUsd"), 0) AS "allUsdReceivedAfterSybilsAnalysis", 
                    COUNT(DISTINCT d2."fromWalletAddress") AS "uniqueDonors",
                    SUM(SQRT(upd."totalValueUsd")) AS "donationsSqrtRootSum",
                    POWER(SUM(SQRT(upd."totalValueUsd")), 2) as "donationsSqrtRootSumSquared"
                FROM 
                    UserProjectDonations upd
                    INNER JOIN project p2 ON p2.id = upd."projectId"
                    INNER JOIN qf_round qr ON qr.id = p2."currentQfRoundId" // Adjust if "currentQfRoundId" does not exist in your schema
                    INNER JOIN project_address pa ON pa."projectId" = p2.id AND pa."networkId" = ANY(qr."eligibleNetworks")
                    LEFT JOIN "sybil" s ON s."userId" = upd."userId" AND s."qfRoundId" = qr.id
                    LEFT JOIN project_fraud pf ON pf."projectId" = p2.id AND pf."qfRoundId" = qr.id
                    LEFT JOIN public.donation d2 ON d2."userId" = upd."userId" AND d2."projectId" = upd."projectId" // To fetch unique donor addresses
                WHERE 
                    p2."statusId" = 5
                    AND NOT EXISTS (
                        SELECT 1
                        FROM public.project_address pa
                        JOIN public.project p4 ON p4.id = pa."projectId"
                        WHERE LOWER(d2."fromWalletAddress") = LOWER(pa.address)
                        AND p4."verified" = true
                        AND p4."listed" = true
                    )
                    AND s.id IS NULL
                    AND pf.id IS NULL
                GROUP BY 
                    p2.id,
                    p2.title,
                    p2.slug,
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
    // Implementation for reverting the changes made by the up method, typically dropping the created materialized view and indexes.
  }
}
