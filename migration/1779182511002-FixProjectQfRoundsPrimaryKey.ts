import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProjectQfRoundsPrimaryKey1779182511002
  implements MigrationInterface
{
  name = 'FixProjectQfRoundsPrimaryKey1779182511002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if migration already completed by checking the primary key structure
    const pkCheck = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'project_qf_rounds_qf_round' 
      AND constraint_type = 'PRIMARY KEY'
      AND constraint_name = 'PK_project_qf_rounds_qf_round'
    `);

    // Check if the primary key is on 'id' column (migration already done)
    if (pkCheck && pkCheck.length > 0) {
      const columnCheck = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.key_column_usage 
        WHERE constraint_name = 'PK_project_qf_rounds_qf_round'
        AND table_name = 'project_qf_rounds_qf_round'
        AND column_name = 'id'
      `);

      if (columnCheck && columnCheck.length > 0) {
        // Migration already completed - primary key is already on id column
        return;
      }
    }

    // Drop the materialized view that depends on the table
    await queryRunner.query(`
      DROP MATERIALIZED VIEW IF EXISTS project_actual_matching_view
    `);

    // Drop temp table if it exists from previous failed run
    await queryRunner.query(`
      DROP TABLE IF EXISTS "project_qf_rounds_qf_round_temp"
    `);

    // Create temporary table with only id as primary key
    await queryRunner.query(`
      CREATE TABLE "project_qf_rounds_qf_round_temp" (
        "id" SERIAL NOT NULL,
        "projectId" integer NOT NULL,
        "qfRoundId" integer NOT NULL,
        "sumDonationValueUsd" DOUBLE PRECISION DEFAULT 0,
        "countUniqueDonors" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "PK_project_qf_rounds_qf_round_temp" PRIMARY KEY ("id")
      )
    `);

    // Check if the original table exists before copying
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'project_qf_rounds_qf_round'
      ) as exists
    `);

    if (tableExists[0]?.exists) {
      // Copy all data from the old table to the temp table
      await queryRunner.query(`
        INSERT INTO "project_qf_rounds_qf_round_temp" 
        ("projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt")
        SELECT "projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt"
        FROM "project_qf_rounds_qf_round"
      `);
    } else {
      // Original table does not exist, skipping data copy
    }

    // Drop the old table if it exists
    await queryRunner.query(`
      DROP TABLE IF EXISTS "project_qf_rounds_qf_round"
    `);

    // Rename the temp table to the original name
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round_temp" 
      RENAME TO "project_qf_rounds_qf_round"
    `);

    // Rename the primary key constraint
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      RENAME CONSTRAINT "PK_project_qf_rounds_qf_round_temp" TO "PK_project_qf_rounds_qf_round"
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_projectId" 
      FOREIGN KEY ("projectId") 
      REFERENCES "project"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_qfRoundId" 
      FOREIGN KEY ("qfRoundId") 
      REFERENCES "qf_round"("id") 
      ON DELETE CASCADE
    `);

    // Recreate all indexes from the optimization migration
    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_id" 
      ON "project_qf_rounds_qf_round" ("id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_qf_round_id" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_sum_donation_desc" 
      ON "project_qf_rounds_qf_round" ("sumDonationValueUsd" DESC NULLS LAST)
      WHERE "sumDonationValueUsd" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_qf_round_sum_donation" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "sumDonationValueUsd" DESC NULLS LAST)
    `);

    // Recreate the materialized view
    await queryRunner.query(`
        DROP MATERIALIZED VIEW IF EXISTS project_actual_matching_view;
        CREATE MATERIALIZED VIEW project_actual_matching_view AS
          
          
     WITH ProjectsAndRounds AS (
            SELECT
                p.id AS "projectId",
                u.email,
                p.slug,
                p.title,
                qr.id as "qfId",
                qr."minimumPassportScore",
                qr."eligibleNetworks",
                 STRING_AGG(DISTINCT CONCAT(pa."networkId", '-', pa."address"), ', ') AS "networkAddresses"
            FROM
                public.project p
                INNER JOIN project_qf_rounds_qf_round pqrq ON pqrq."projectId" = p.id
                INNER JOIN public."user" u on p."adminUserId" = u.id
                INNER JOIN public.qf_round qr on qr.id = pqrq."qfRoundId"
                LEFT JOIN project_address pa ON pa."projectId" = p.id AND pa."networkId" = ANY(qr."eligibleNetworks") AND pa."isRecipient" = true
           group by
            p.id,
            u.email,
            qr.id
        ),
        DonationsBeforeAnalysis AS (
            SELECT
                par."projectId",
                par.slug,
                par.title,
                par."qfId",
                par."email",
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
                par."email",
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
                  FROM project normal_project
                  JOIN project_address ON normal_project."id" = project_address."projectId"
                  WHERE normal_project."statusId" = 5 AND normal_project."reviewStatus" = 'Listed'
                    AND lower(project_address."address") = lower(upd."fromWalletAddress") 
              )
              AND NOT EXISTS (
                SELECT 1
                FROM project_address pa
                INNER JOIN project_qf_rounds_qf_round pqrq ON pa."projectId" = pqrq."projectId"
                WHERE pqrq."qfRoundId" = upd."qfRoundId" -- Ensuring we're looking at the same QF round
                  AND lower(pa."address") = lower(upd."fromWalletAddress")
                  AND pa."isRecipient" = true
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
                da.email,
                da."qfId",
                dia."uniquedonationids",
                da."networkAddresses"
        )
               
        SELECT
            da."projectId",
            da.title,
            da.email,
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
        CREATE UNIQUE INDEX idx_project_actual_matching_unique ON project_actual_matching_view ("projectId", "qfRoundId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_rounds_qf_round_sum_donation"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_rounds_sum_donation_desc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_qf_rounds_qf_round_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_project_qf_rounds_id"
    `);

    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP CONSTRAINT IF EXISTS "FK_qfRoundId"
    `);

    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      DROP CONSTRAINT IF EXISTS "FK_projectId"
    `);

    // Create temporary table with composite primary key (original structure)
    await queryRunner.query(`
      CREATE TABLE "project_qf_rounds_qf_round_temp" (
        "projectId" integer NOT NULL,
        "qfRoundId" integer NOT NULL,
        "sumDonationValueUsd" DOUBLE PRECISION DEFAULT 0,
        "countUniqueDonors" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "id" SERIAL,
        CONSTRAINT "PK_project_qf_rounds_qf_round_temp" PRIMARY KEY ("projectId", "qfRoundId")
      )
    `);

    // Copy all data from the current table to the temp table
    await queryRunner.query(`
      INSERT INTO "project_qf_rounds_qf_round_temp" 
      ("projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt", "id")
      SELECT "projectId", "qfRoundId", "sumDonationValueUsd", "countUniqueDonors", "createdAt", "updatedAt", "id"
      FROM "project_qf_rounds_qf_round"
    `);

    // Drop the current table
    await queryRunner.query(`
      DROP TABLE "project_qf_rounds_qf_round"
    `);

    // Rename the temp table to the original name
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round_temp" 
      RENAME TO "project_qf_rounds_qf_round"
    `);

    // Rename the primary key constraint
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      RENAME CONSTRAINT "PK_project_qf_rounds_qf_round_temp" TO "PK_project_qf_rounds_qf_round"
    `);

    // Recreate foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_projectId" 
      FOREIGN KEY ("projectId") 
      REFERENCES "project"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "project_qf_rounds_qf_round" 
      ADD CONSTRAINT "FK_qfRoundId" 
      FOREIGN KEY ("qfRoundId") 
      REFERENCES "qf_round"("id") 
      ON DELETE CASCADE
    `);

    // Recreate the id index
    await queryRunner.query(`
      CREATE INDEX "IDX_project_qf_rounds_id" 
      ON "project_qf_rounds_qf_round" ("id")
    `);

    // Recreate optimization indexes
    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_qf_round_id" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_sum_donation_desc" 
      ON "project_qf_rounds_qf_round" ("sumDonationValueUsd" DESC NULLS LAST)
      WHERE "sumDonationValueUsd" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_qf_rounds_qf_round_sum_donation" 
      ON "project_qf_rounds_qf_round" ("qfRoundId", "sumDonationValueUsd" DESC NULLS LAST)
    `);

    // Recreate the materialized view
    await queryRunner.query(`
        DROP MATERIALIZED VIEW IF EXISTS project_actual_matching_view;
        CREATE MATERIALIZED VIEW project_actual_matching_view AS
          
          
     WITH ProjectsAndRounds AS (
            SELECT
                p.id AS "projectId",
                u.email,
                p.slug,
                p.title,
                qr.id as "qfId",
                qr."minimumPassportScore",
                qr."eligibleNetworks",
                 STRING_AGG(DISTINCT CONCAT(pa."networkId", '-', pa."address"), ', ') AS "networkAddresses"
            FROM
                public.project p
                INNER JOIN project_qf_rounds_qf_round pqrq ON pqrq."projectId" = p.id
                INNER JOIN public."user" u on p."adminUserId" = u.id
                INNER JOIN public.qf_round qr on qr.id = pqrq."qfRoundId"
                LEFT JOIN project_address pa ON pa."projectId" = p.id AND pa."networkId" = ANY(qr."eligibleNetworks") AND pa."isRecipient" = true
           group by
            p.id,
            u.email,
            qr.id
        ),
        DonationsBeforeAnalysis AS (
            SELECT
                par."projectId",
                par.slug,
                par.title,
                par."qfId",
                par."email",
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
                par."email",
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
                  FROM project normal_project
                  JOIN project_address ON normal_project."id" = project_address."projectId"
                  WHERE normal_project."statusId" = 5 AND normal_project."reviewStatus" = 'Listed'
                    AND lower(project_address."address") = lower(upd."fromWalletAddress") 
              )
              AND NOT EXISTS (
                SELECT 1
                FROM project_address pa
                INNER JOIN project_qf_rounds_qf_round pqrq ON pa."projectId" = pqrq."projectId"
                WHERE pqrq."qfRoundId" = upd."qfRoundId" -- Ensuring we're looking at the same QF round
                  AND lower(pa."address") = lower(upd."fromWalletAddress")
                  AND pa."isRecipient" = true
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
                da.email,
                da."qfId",
                dia."uniquedonationids",
                da."networkAddresses"
        )
               
        SELECT
            da."projectId",
            da.title,
            da.email,
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
        CREATE UNIQUE INDEX idx_project_actual_matching_unique ON project_actual_matching_view ("projectId", "qfRoundId");
    `);
  }
}
