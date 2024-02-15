import { MigrationInterface, QueryRunner } from 'typeorm';

export class projectActualMatchingView1707892354692
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DROP MATERIALIZED VIEW IF EXISTS project_actual_matching_view;
            CREATE MATERIALIZED VIEW project_actual_matching_view AS
            WITH DonationsBeforeAnalysis AS (
            SELECT 
                p.id, 
                p.slug, 
                p.title,
                qr.id as "qfId",
                STRING_AGG(distinct pa."networkId" || '-' || pa."address", ', ') AS "networkAddresses",
                COALESCE(SUM(d."valueUsd"), 0) AS "allUsdReceived", 
                COUNT(DISTINCT d."fromWalletAddress") AS "totalDonors"
            FROM 
                public.donation AS d
                INNER JOIN project p ON p.id = d."projectId"
                INNER JOIN qf_round qr on qr.id = d."qfRoundId"
                inner join project_address pa on pa."projectId" = p.id AND pa."networkId" = ANY(qr."eligibleNetworks")
                inner join "user" u on u.id = d."userId" 
            GROUP BY 
                p.id,
                p.title, 
                p.slug,
                qr.id
            ), DonationsAfterAnalysis AS (
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
                INNER JOIN qf_round qr on qr.id = d2."qfRoundId"
                inner join project_address pa on pa."projectId" = p2.id AND pa."networkId" = ANY(qr."eligibleNetworks")
                inner join "user" u on u.id = d2."userId"
                left join "sybil" s on s."userId" = u.id AND s."qfRoundId" = qr.id
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
                AND d2."qfRoundUserScore" > 4
                AND s.id is null OR s."confirmedSybil" = false
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
            INNER JOIN DonationsAfterAnalysis d2 ON d1.id = d2.id AND d1.slug = d2.slug and d1."qfId" = d2."qfId";
            
            CREATE INDEX idx_project_actual_matching_project_id ON project_actual_matching_view USING hash ("projectId");
            CREATE INDEX idx_project_actual_matching_qf_round_id ON project_actual_matching_view USING hash ("qfRoundId");
            `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DROP MATERIALIZED VIEW project_actual_matching_view;
            `,
    );
  }
}
