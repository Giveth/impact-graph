import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectActualMatchingV11_1710322367913
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP MATERIALIZED VIEW IF EXISTS project_actual_matching_view;
        CREATE MATERIALIZED VIEW project_actual_matching_view AS
          
          
     WITH ProjectsAndRounds AS (
            SELECT
                p.id AS "projectId",
                p.slug,
                p.title,
                qr.id as "qfId",
                qr."minimumPassportScore",
                qr."eligibleNetworks",
                 STRING_AGG(DISTINCT CONCAT(pa."networkId", '-', pa."address"), ', ') AS "networkAddresses"
            FROM
                public.project p
                INNER JOIN project_qf_rounds_qf_round pqrq ON pqrq."projectId" = p.id
                INNER JOIN public.qf_round qr on qr.id = pqrq."qfRoundId"
                LEFT JOIN project_address pa ON pa."projectId" = p.id AND pa."networkId" = ANY(qr."eligibleNetworks") AND pa."isRecipient" = true
        group by
            p.id,
            qr.id
        ),
        DonationsBeforeAnalysis AS (
            SELECT
                par."projectId",
                par.slug,
                par.title,
                par."qfId",
                par."networkAddresses",
                par."minimumPassportScore" as "minimumPassportScore",
                COALESCE(SUM(d."valueUsd"), 0) AS "allUsdReceived",
                COUNT(DISTINCT CASE WHEN d."fromWalletAddress" IS NOT NULL THEN d."fromWalletAddress" END) AS "totalDonors",
                ARRAY_AGG(DISTINCT d.id) FILTER (WHERE d.id IS NOT NULL) AS "donationIdsBeforeAnalysis"
            FROM
                ProjectsAndRounds par
                LEFT JOIN public.donation d ON d."projectId" = par."projectId" AND d."qfRoundId" = par."qfId" AND d."status" = 'verified' AND d."transactionNetworkId" = ANY(par."eligibleNetworks")
            GROUP BY
                par."projectId",
                par.title,
                par."networkAddresses",
                par.slug,
                par."qfId",
                par."minimumPassportScore"
        ),
        UserProjectDonations AS (
            SELECT
                par."projectId",
                par."qfId" AS "qfRoundId",
                d2."userId",
                d2."fromWalletAddress",
                d2."qfRoundUserScore",
                COALESCE(SUM(d2."valueUsd"), 0) AS "totalValueUsd",
                ARRAY_AGG(DISTINCT d2.id) FILTER (WHERE d2.id IS NOT NULL) AS "userDonationIds"
            FROM
                ProjectsAndRounds par
                LEFT JOIN public.donation d2 ON d2."projectId" = par."projectId" AND d2."qfRoundId" = par."qfId" AND d2."status" = 'verified' AND d2."transactionNetworkId" = ANY(par."eligibleNetworks")
            GROUP BY
                par."projectId",
                par."qfId",
                d2."userId",
                d2."fromWalletAddress",
                d2."qfRoundUserScore"
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
            WHERE
                upd."totalValueUsd" >= (SELECT "minimumValidUsdValue" FROM public.qf_round WHERE id = upd."qfRoundId")
                AND upd."qfRoundUserScore" >= (SELECT "minimumPassportScore" FROM public.qf_round WHERE id = upd."qfRoundId")
                AND NOT EXISTS (
                    SELECT 1
                    FROM project_fraud pf
                    WHERE pf."projectId" = upd."projectId"
                    AND pf."qfRoundId" = upd."qfRoundId"
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM sybil s
                    WHERE s."userId" = upd."userId"
                    AND s."qfRoundId" = upd."qfRoundId"
                )
              AND NOT EXISTS (
                  SELECT 1
                  FROM project verified_project
                  JOIN project_address ON verified_project."id" = project_address."projectId"
                  WHERE verified_project.verified = true 
                    AND lower(project_address."address") = lower(upd."fromWalletAddress") 
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
                da."projectId",
                da.slug,
                da.title,
                da."qfId",
                COALESCE(SUM(qud."totalValueUsd"), 0) AS "allUsdReceivedAfterSybilsAnalysis",
                COUNT(DISTINCT qud."fromWalletAddress") AS "uniqueQualifiedDonors",
                SUM(SQRT(qud."totalValueUsd")) AS "donationsSqrtRootSum",
                POWER(SUM(SQRT(qud."totalValueUsd")), 2) as "donationsSqrtRootSumSquared",
                dia.uniqueDonationIds AS "donationIdsAfterAnalysis",
                ARRAY_AGG(DISTINCT qud."userId") AS "uniqueUserIdsAfterAnalysis",
                ARRAY_AGG(qud."totalValueUsd") AS "totalValuesOfUserDonationsAfterAnalysis"
            FROM
                DonationsBeforeAnalysis da
                LEFT JOIN QualifiedUserDonations qud ON da."projectId" = qud."projectId" AND da."qfId" = qud."qfRoundId"
                LEFT JOIN DonationIDsAggregated dia ON da."projectId" = dia."projectId" AND da."qfId" = dia."qfRoundId"
            GROUP BY
                da."projectId",
                da.slug,
                da.title,
                da."qfId",
                dia."uniquedonationids",
                da."networkAddresses"
        )
               
        SELECT
            da."projectId",
            da.title,
            da.slug,
            da."networkAddresses",
            da."qfId" AS "qfRoundId",
            da."donationIdsBeforeAnalysis",
            da."allUsdReceived",
            da."totalDonors",
            daa."donationIdsAfterAnalysis",
            daa."allUsdReceivedAfterSybilsAnalysis",
            daa."uniqueQualifiedDonors",
            daa."donationsSqrtRootSum",
            daa."donationsSqrtRootSumSquared",
            daa."uniqueUserIdsAfterAnalysis",
            daa."totalValuesOfUserDonationsAfterAnalysis"
        FROM
            DonationsBeforeAnalysis da
            INNER JOIN DonationsAfterAnalysis daa ON da."projectId" = daa."projectId" AND da."qfId" = daa."qfId";
                
        CREATE INDEX idx_project_actual_matching_project_id ON project_actual_matching_view USING hash ("projectId");
        CREATE INDEX idx_project_actual_matching_qf_round_id ON project_actual_matching_view USING hash ("qfRoundId");
        `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
