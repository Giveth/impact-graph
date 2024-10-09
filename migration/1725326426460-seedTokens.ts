import { MigrationInterface, QueryRunner } from 'typeorm';
import { NETWORK_IDS } from '../src/provider';
import { Token } from '../src/entities/token';

const tokens = [
  {
    name: 'Matic Token',
    symbol: 'MATIC',
    decimals: 18,
    address: '0xa2036f0538221a77a3937f1379699f44945018d0',
    coingeckoId: 'matic-network',
    networkId: NETWORK_IDS.ZKEVM_MAINNET,
  },
];

export class SeedTokens1725326426460 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(Token, tokens);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const token of tokens) {
      await queryRunner.query(
        `
        DELETE FROM "token"
        WHERE "address" = $1
        AND "networkId" = $2;
        `,
        [token.address, token.networkId],
      );
    }
  }
}
