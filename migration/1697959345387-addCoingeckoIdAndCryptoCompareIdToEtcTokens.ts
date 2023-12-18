import { MigrationInterface, QueryRunner } from 'typeorm';

export class addCoingeckoIdAndCryptoCompareIdToEtcTokens1697959345387
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE token
            SET "cryptoCompareId" = 'ETC'
            WHERE symbol = 'ETC' OR symbol = 'WETC' or symbol = 'mETC';
        `);

    await queryRunner.query(`
            UPDATE token
            SET "cryptoCompareId" = 'ETH'
            WHERE symbol = 'WETH' AND "networkId" = 63;
        `);

    await queryRunner.query(`
            UPDATE token
            SET "coingeckoId" = 'hebeblock'
            WHERE symbol = 'HEBE';
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                 UPDATE token
                 SET "coingeckoId" = NULL,
                 "cryptoCompareId" = NULL; 
            `);
  }
}
