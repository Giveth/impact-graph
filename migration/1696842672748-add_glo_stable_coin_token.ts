import { MigrationInterface, QueryRunner } from 'typeorm';
import { NETWORK_IDS } from '../src/provider.js';
import { Token } from '../src/entities/token.js';

const newTokens = [
  {
    name: 'GLO',
    symbol: 'GLO',
    address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    decimals: 18,
    isGivbackEligible: true,
    networkId: NETWORK_IDS.MAIN_NET,
  },
  {
    name: 'GLO',
    symbol: 'GLO',
    address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    decimals: 18,
    isGivbackEligible: true,
    networkId: NETWORK_IDS.OPTIMISTIC,
  },
  {
    name: 'GLO',
    symbol: 'GLO',
    address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    decimals: 18,
    isGivbackEligible: true,
    networkId: NETWORK_IDS.POLYGON,
  },
  {
    name: 'GLO',
    symbol: 'GLO',
    address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    decimals: 18,
    isGivbackEligible: true,
    networkId: NETWORK_IDS.CELO,
  },
  {
    name: 'pyUSD',
    symbol: 'pyUSD',
    address: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
    decimals: 18,
    isGivbackEligible: true,
    networkId: NETWORK_IDS.MAIN_NET,
  },
];

export class addGloStableCoinToken1696842672748 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(Token, newTokens);

    const tokens = await queryRunner.query(`
              SELECT * FROM token
              WHERE 
                ("address" = '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3' AND "networkId" = ${NETWORK_IDS.MAIN_NET}) OR
                ("address" = '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3' AND "networkId" = ${NETWORK_IDS.OPTIMISTIC}) OR
                ("address" = '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3' AND "networkId" = ${NETWORK_IDS.POLYGON}) OR
                ("address" = '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3' AND "networkId" = ${NETWORK_IDS.CELO}) OR
                ("address" = '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8' AND "networkId" = ${NETWORK_IDS.MAIN_NET});
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
            WHERE 
                ("address" = '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3' AND "networkId" = ${NETWORK_IDS.MAIN_NET}) OR
                ("address" = '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3' AND "networkId" = ${NETWORK_IDS.OPTIMISTIC}) OR
                ("address" = '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3' AND "networkId" = ${NETWORK_IDS.POLYGON}) OR
                ("address" = '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3' AND "networkId" = ${NETWORK_IDS.CELO}) OR
                ("address" = '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8' AND "networkId" = ${NETWORK_IDS.MAIN_NET});
          
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
