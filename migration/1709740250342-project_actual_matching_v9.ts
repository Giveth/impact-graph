import { MigrationInterface, QueryRunner } from 'typeorm';

export class projectActualMatchingV91709740250342
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
                SUM(d."valueUsd") AS "allUsdReceived",
                STRING_AGG(distinct pa."networkId" || '-' || pa."address", ', ') AS "networkAddresses",
                COUNT(DISTINCT d."fromWalletAddress") AS "totalDonors",
                ARRAY_AGG(d.id) AS "donationIdsBeforeAnalysis"
            FROM
                public.donation d
                INNER JOIN project p ON p.id = d."projectId"
                INNER JOIN qf_round qr ON qr.id = d."qfRoundId"
                INNER JOIN project_address pa ON pa."projectId" = p.id AND pa."networkId" = ANY(qr."eligibleNetworks")
            WHERE
                d."status" = 'verified'
                AND d."transactionNetworkId" = ANY(qr."eligibleNetworks")
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
                d2."fromWalletAddress",
                d2."qfRoundUserScore",
                SUM(d2."valueUsd") AS "totalValueUsd",
                ARRAY_AGG(DISTINCT d2.id) AS "userDonationIds"
            FROM
                public.donation d2
                INNER JOIN qf_round qr ON qr.id = d2."qfRoundId"
                INNER JOIN project p ON p.id = d2."projectId"

            WHERE
                d2."status" = 'verified'
                AND d2."transactionNetworkId" = ANY(qr."eligibleNetworks")
            GROUP BY
                d2."userId",
                d2."fromWalletAddress",
                d2."qfRoundUserScore",
                d2."projectId",
                d2."qfRoundId"
        ),
        QualifiedUserDonations AS (
                  SELECT
                      upd."userId",
                      upd."fromWalletAddress",
                      upd."projectId",
                      upd."qfRoundId",
                      upd."totalValueUsd",
                      upd."userDonationIds",
                      upd."qfRoundUserScore"

                  FROM
                      UserProjectDonations upd
                    INNER JOIN qf_round qr ON qr.id = upd."qfRoundId"
                    INNER JOIN project p ON p.id = upd."projectId"
                    LEFT JOIN project_fraud pf ON pf."projectId" = p.id AND pf."qfRoundId" = qr.id
                    LEFT JOIN sybil s ON s."userId" = upd."userId" AND s."qfRoundId" =  qr.id
    
    
                WHERE
                     upd."totalValueUsd" >= qr."minimumValidUsdValue"
                     AND upd."qfRoundUserScore" >= qr."minimumPassportScore"
                     AND NOT EXISTS (
                          SELECT 1 FROM
                          project_fraud pf
                          WHERE pf."projectId" = p.id 
                          AND pf."qfRoundId" = qr.id
                      )
                      AND NOT EXISTS (
                          SELECT 1
                          FROM sybil s  
                          WHERE s."userId" = upd."userId"
                          AND s."qfRoundId" = qr.id
                      )
                      AND NOT EXISTS (
                          SELECT 1
                          FROM public.project_address pa2
                          JOIN public.project p4 ON p4.id = pa2."projectId"
                          WHERE LOWER(pa2.address) = LOWER(upd."fromWalletAddress")
                          AND p4."verified" = true
                          AND p4."listed" = true
                      )
            ),
            DonationIDsAggregated AS (
                  SELECT
                      qud."projectId",
                      qud."qfRoundId",
                      ARRAY_AGG(DISTINCT unnested_ids) AS uniqueDonationIds
                  FROM
                      QualifiedUserDonations qud,
                      LATERAL UNNEST(qud."userDonationIds") AS unnested_ids
                  GROUP BY qud."projectId", qud."qfRoundId"
              ),
        DonationsAfterAnalysis AS (
                SELECT
                    p.id,
                    p.slug,
                    p.title,
                    qr.id as "qfId",
                    COALESCE(SUM(qud."totalValueUsd"), 0) AS "allUsdReceivedAfterSybilsAnalysis",
                    COUNT(DISTINCT qud."fromWalletAddress") AS "uniqueQualifiedDonors",
                    SUM(SQRT(qud."totalValueUsd")) AS "donationsSqrtRootSum",
                    POWER(SUM(SQRT(qud."totalValueUsd")), 2) as "donationsSqrtRootSumSquared",
                     dia.uniqueDonationIds AS "donationIdsAfterAnalysis",
                    ARRAY_AGG(DISTINCT qud."userId") AS "uniqueUserIdsAfterAnalysis", 
                    ARRAY_AGG(qud."totalValueUsd") AS "totalValuesOfUserDonationsAfterAnalysis"
                FROM
                    QualifiedUserDonations qud
                    INNER JOIN project p ON p.id = qud."projectId"
                    INNER JOIN qf_round qr ON qr.id = qud."qfRoundId"
                    LEFT JOIN DonationIDsAggregated dia ON dia."projectId" = qud."projectId" AND dia."qfRoundId" = qud."qfRoundId"
                GROUP BY
                    p.id,
                    p.title,
                    p.slug,
                    qr.id,
                    dia.uniqueDonationIds
            )
            SELECT
                d1.id AS "projectId",
                d1."networkAddresses",
                d1.title,
                d1.slug,
                d1."qfId" AS "qfRoundId",
                d1."donationIdsBeforeAnalysis",
                d1."allUsdReceived",
                d1."totalDonors",
                daa."donationIdsAfterAnalysis",
                daa."allUsdReceivedAfterSybilsAnalysis",
                daa."uniqueQualifiedDonors",
                daa."donationsSqrtRootSum",
                daa."donationsSqrtRootSumSquared",
                daa."uniqueUserIdsAfterAnalysis",
                daa."totalValuesOfUserDonationsAfterAnalysis"
            FROM
                DonationsBeforeAnalysis d1
                INNER JOIN DonationsAfterAnalysis daa ON d1.id = daa.id AND d1.slug = daa.slug AND d1."qfId" = daa."qfId";
              
        CREATE INDEX idx_project_actual_matching_project_id ON project_actual_matching_view USING hash ("projectId");
        CREATE INDEX idx_project_actual_matching_qf_round_id ON project_actual_matching_view USING hash ("qfRoundId");
        `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
