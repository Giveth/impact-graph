import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSwapTransactionsTable1741000000000
  implements MigrationInterface
{
  name = 'CreateSwapTransactionsTable1741000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create swap transactions table
    await queryRunner.query(
      `CREATE TABLE "swap_transaction" (
        "id" SERIAL NOT NULL,
        "squidRequestId" character varying NOT NULL,
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
        CONSTRAINT "PK_swap_transaction" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_squid_request_id" UNIQUE ("squidRequestId")
      )`,
    );

    // Add swapTransactionId and isSwap to donation table
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "swapTransactionId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "isSwap" boolean NOT NULL DEFAULT false`,
    );

    // Add foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_donation_swap_transaction" FOREIGN KEY ("swapTransactionId") REFERENCES "swap_transaction"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Create index on swapTransactionId
    await queryRunner.query(
      `CREATE INDEX "IDX_donation_swap_transaction" ON "donation" ("swapTransactionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key and index
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_donation_swap_transaction"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_donation_swap_transaction"`,
    );

    // Drop swapTransactionId column
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "swapTransactionId"`,
    );

    // Drop swap transactions table
    await queryRunner.query(`DROP TABLE "swap_transaction"`);
  }
}
