import { MigrationInterface, QueryRunner } from 'typeorm';
import { NETWORK_IDS } from '../src/provider.js';
import { ChainType } from '../src/types/network.js';
import { Token } from '../src/entities/token.js';

const mpEthTokens = [
  {
    name: 'mpETH',
    symbol: 'mpETH',
    address: '0x48afbbd342f64ef8a9ab1c143719b63c2ad81710',
    decimals: 18,
    isGivbackEligible: true,
    networkId: NETWORK_IDS.MAIN_NET,
    chainType: ChainType.EVM,
  },
  {
    name: 'mpETH',
    symbol: 'mpETH',
    address: '0x819845b60a192167ed1139040b4f8eca31834f27',
    decimals: 18,
    isGivbackEligible: true,
    networkId: NETWORK_IDS.OPTIMISTIC,
    chainType: ChainType.EVM,
  },
];

export class addmpEthToDatabaseTokens1706820821887
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`
              SELECT * FROM token
              WHERE 
                ("address" = '0x48afbbd342f64ef8a9ab1c143719b63c2ad81710' AND "networkId" = ${NETWORK_IDS.MAIN_NET}) OR
                ("address" = '0x819845b60a192167ed1139040b4f8eca31834f27' AND "networkId" = ${NETWORK_IDS.OPTIMISTIC})
            `);

    if (exists && exists.length === 2) {
      return;
    }

    await queryRunner.manager.save(Token, mpEthTokens);

    const tokens = await queryRunner.query(`
              SELECT * FROM token
              WHERE 
                ("address" = '0x48afbbd342f64ef8a9ab1c143719b63c2ad81710' AND "networkId" = ${NETWORK_IDS.MAIN_NET}) OR
                ("address" = '0x819845b60a192167ed1139040b4f8eca31834f27' AND "networkId" = ${NETWORK_IDS.OPTIMISTIC})
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE 
                ("address" = '0x48afbbd342f64ef8a9ab1c143719b63c2ad81710' AND "networkId" = ${NETWORK_IDS.MAIN_NET}) OR
                ("address" = '0x819845b60a192167ed1139040b4f8eca31834f27' AND "networkId" = ${NETWORK_IDS.OPTIMISTIC})
            `);
    await queryRunner.query(
      `DELETE FROM organization_tokens_token WHERE "tokenId" IN (${tokens
        .map(token => token.id)
        .join(',')})`,
    );

    await queryRunner.query(
      `DELETE FROM token WHERE "id" IN (${tokens
        .map(token => token.id)
        .join(',')})`,
    );
  }
}
