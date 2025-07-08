import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSwapTransactionTable1751934185752
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the swap_transaction table
    await queryRunner.query(`
      CREATE TABLE "swap_transaction" (
        "id" SERIAL NOT NULL,
        "squidRequestId" character varying,
        "firstTxHash" character varying NOT NULL,
        "secondTxHash" character varying,
        "fromChainId" integer NOT NULL,
        "toChainId" integer NOT NULL,
        "fromTokenAddress" character varying NOT NULL,
        "toTokenAddress" character varying NOT NULL,
        "fromAmount" double precision NOT NULL,
        "toAmount" double precision,
        "fromTokenSymbol" character varying NOT NULL,
        "toTokenSymbol" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_swap_transaction" PRIMARY KEY ("id")
      )
    `);

    // Add indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_swap_transaction_squid_request_id" ON "swap_transaction" ("squidRequestId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_swap_transaction_first_tx_hash" ON "swap_transaction" ("firstTxHash")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_swap_transaction_second_tx_hash" ON "swap_transaction" ("secondTxHash")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_swap_transaction_status" ON "swap_transaction" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_swap_transaction_from_chain_id" ON "swap_transaction" ("fromChainId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_swap_transaction_to_chain_id" ON "swap_transaction" ("toChainId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_swap_transaction_created_at" ON "swap_transaction" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_swap_transaction_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_swap_transaction_to_chain_id"`);
    await queryRunner.query(`DROP INDEX "IDX_swap_transaction_from_chain_id"`);
    await queryRunner.query(`DROP INDEX "IDX_swap_transaction_status"`);
    await queryRunner.query(`DROP INDEX "IDX_swap_transaction_second_tx_hash"`);
    await queryRunner.query(`DROP INDEX "IDX_swap_transaction_first_tx_hash"`);
    await queryRunner.query(
      `DROP INDEX "IDX_swap_transaction_squid_request_id"`,
    );

    // Drop the table
    await queryRunner.query(`DROP TABLE "swap_transaction"`);
  }
}
