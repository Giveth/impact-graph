import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token.js';
import { NETWORK_IDS } from '../src/provider.js';

const optimisticTokens = [
  {
    name: 'OPTIMISTIC',
    symbol: 'OP',
    address: '0x4200000000000000000000000000000000000042',
    decimals: 18,
    isGivbackEligible: true,
    networkId: NETWORK_IDS.OPTIMISTIC,
  },
  {
    name: 'Ethereum native token',
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    isGivbackEligible: true,
    order: 1,
    networkId: NETWORK_IDS.OPTIMISTIC,
  },
];

export class addOptimisticNativeToken1679383446020
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(Token, optimisticTokens);

    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${NETWORK_IDS.OPTIMISTIC}
            `);

    const givethOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='giveth'`)
    )[0];

    const traceOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='trace'`)
    )[0];

    for (const token of tokens) {
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id}),
        (${token.id}, ${traceOrganization.id})
      ;`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${NETWORK_IDS.OPTIMISTIC}
            `);
    await queryRunner.query(
      `DELETE FROM organization_tokens_token WHERE "tokenId" IN (${tokens
        .map(token => token.id)
        .join(',')})`,
    );
    await queryRunner.query(
      `
        DELETE from token
        WHERE "networkId" = ${NETWORK_IDS.OPTIMISTIC}
      `,
    );
  }
}
