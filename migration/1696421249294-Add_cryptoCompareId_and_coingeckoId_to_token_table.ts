import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import { NETWORK_IDS } from '../src/provider';

export class AddCryptoCompareIdAndCoingeckoIdToTokenTable1696421249294
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add the cryptoCompareId and coingeckoId columns with a default value of NULL
    await queryRunner.query(`
            DO $$
              BEGIN
                BEGIN
                    ALTER TABLE token ADD COLUMN "cryptoCompareId" text DEFAULT NULL;
                    ALTER TABLE token ADD COLUMN "coingeckoId" text DEFAULT NULL;
                EXCEPTION
                    WHEN duplicate_column THEN 
                        -- Handle the error, or just do nothing to skip adding the column.
                        RAISE NOTICE 'Column "cryptoCompareId" or "coingeckoId already exists in "token".';
                END;
              END $$;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the "cryptoCompareId" column
    await queryRunner.query(`
            ALTER TABLE token
            DROP COLUMN "cryptoCompareId";
        `);

    // Remove the "coingeckoId" column
    await queryRunner.query(`
            ALTER TABLE token
            DROP COLUMN "cryptoCompareId";
        `);
  }
}
