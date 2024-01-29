import { MigrationInterface, QueryRunner } from 'typeorm';
import { NETWORK_IDS } from '../src/provider';

const tokenUpdates = {
  ETH: 'ethereum',
  OP: 'optimism',
  WETH: 'weth',
  DAI: 'dai',
  LINK: 'chainlink',
  WBTC: 'wrapped-bitcoin',
  SNX: 'havven',
  USDT: 'tether',
  USDC: 'usd-coin',
};

export class addCoingeckoIdToOptimismTokens1704991714385
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.query(
      `SELECT * FROM token WHERE "networkId" = $1 OR "networkId" = $2`,
      [NETWORK_IDS.OPTIMISTIC, NETWORK_IDS.OPTIMISM_GOERLI],
    );

    for (const token of tokens) {
      const coingeckoId = tokenUpdates[token.symbol];
      if (coingeckoId) {
        await queryRunner.query(
          `
          UPDATE token
          SET "coingeckoId" = $1
          WHERE id = $2
        `,
          [coingeckoId, token.id],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE public.token
      SET "coingeckoId" = NULL
      WHERE "networkId" = 10 OR "networkId" = 420
    `);
  }
}
