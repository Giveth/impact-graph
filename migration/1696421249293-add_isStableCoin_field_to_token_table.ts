import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIsStableCoinFieldToTokenTable1696421249293
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the isStableCoin column with a default value of false
    await queryRunner.query(`
            DO $$
              BEGIN
                BEGIN
                    ALTER TABLE token ADD COLUMN "isStableCoin" boolean NOT NULL DEFAULT false;
                EXCEPTION
                    WHEN duplicate_column THEN 
                        -- Handle the error, or just do nothing to skip adding the column.
                        RAISE NOTICE 'Column "isStableCoin" already exists in "token".';
                END;
              END $$;
        `);

    // Update records to set "isStableCoin" to true based on symbol
    await queryRunner.query(`
            UPDATE token
            SET "isStableCoin" = true
            WHERE symbol IN ('USDC', 'USDT', 'DAI', 'GLO', 'pyUSD', 'XDAI', 'WXDAI', 'cUSD');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the "isStableCoin" column
    await queryRunner.query(`
            ALTER TABLE token
            DROP COLUMN "isStableCoin";
        `);
  }
}
