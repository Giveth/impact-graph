import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenAndChainToQFRound1714566501335
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE IF EXISTS "qf_round"
            ADD COLUMN IF NOT EXISTS "allocatedTokenSymbol" text,
            ADD COLUMN IF NOT EXISTS "allocatedTokenChainId" integer,
            ADD COLUMN IF NOT EXISTS "allocatedFundUSDPreferred" boolean,
            ADD COLUMN IF NOT EXISTS "allocatedFundUSD" integer;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE IF EXISTS "qf_round"
            DROP COLUMN "allocatedTokenSymbol",
            DROP COLUMN "allocatedTokenChainId",
            DROP COLUMN "allocatedFundUSDPreferred",
            DROP COLUMN "allocatedFundUSD";
        `);
  }
}
