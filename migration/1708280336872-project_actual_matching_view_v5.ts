import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectActualMatchingViewV51708280336872
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
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
                GROUP BY 
                    p.id,
                    p.title, 
                    p.slug,
                    qr.id
            ), 
            DonationsAfterAnalysis AS (
                SELECT 
                    p2.id, 
                    p2.slug, 
                    p2.title,
                    qr.id as "qfId",
                    COALESCE(SUM(d2."valueUsd"), 0) AS "allUsdReceivedAfterSybilsAnalysis", 
                    COUNT(DISTINCT d2."fromWalletAddress") AS "uniqueDonors",
                    SUM(SQRT(d2."valueUsd")) AS "donationsSqrtRootSum",
                    POWER(SUM(SQRT(d2."valueUsd")), 2) as "donationsSqrtRootSumSquared"
                FROM 
                    public.donation AS d2
                    INNER JOIN project p2 ON p2.id = d2."projectId"
                    INNER JOIN qf_round qr ON qr.id = d2."qfRoundId"
                    INNER JOIN project_address pa ON pa."projectId" = p2.id AND pa."networkId" = ANY(qr."eligibleNetworks")
                    LEFT JOIN user_passport_score ups ON ups."userId" = d2."userId" AND ups."qfRoundId" = qr.id
                    LEFT JOIN "sybil" s ON s."userId" = d2."userId" AND s."qfRoundId" = qr.id
                    LEFT JOIN project_fraud pf ON pf."projectId" = p2.id AND pf."qfRoundId" = qr.id
                WHERE 
                    p2."statusId" = 5 
                    AND LOWER(d2."fromWalletAddress") NOT IN (
                        SELECT DISTINCT LOWER(pa.address) AS "projectAddress"
                        FROM public.project_address pa 
                        JOIN project p3 ON p3.id = pa."projectId" 
                        AND p3."verified" = true 
                        AND p3."statusId" = 5 
                        AND p3."isImported" = false
                    )
                    AND (ups."passportScore" IS NULL OR ups."passportScore" >= qr."minimumPassportScore")
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

  public async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
