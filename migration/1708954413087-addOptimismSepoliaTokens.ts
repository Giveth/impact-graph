import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token.js';
import seedTokens from './data/seedTokens.js';
import { NETWORK_IDS } from '../src/provider.js';
import config from '../src/config.js';

export class AddOptimismSepoliaTokens1708954413087
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;
    if (environment === 'production') {
      // We dont add optimism-sepolia tokens in production ENV
      return;
    }

    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === NETWORK_IDS.OPTIMISM_SEPOLIA)
        .map(token => {
          const t = {
            ...token,
          };
          t.address = t.address?.toLowerCase();
          delete t.chainType;
          return t;
        }),
    );
    const tokens = await queryRunner.query(`
                    SELECT * FROM token
                    WHERE "networkId" = ${NETWORK_IDS.OPTIMISM_SEPOLIA}
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
    const environment = config.get('ENVIRONMENT') as string;
    if (environment === 'production') {
      // We dont add optimism-sepolia tokens in production ENV
      return;
    }

    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${NETWORK_IDS.OPTIMISM_SEPOLIA}
            `);
    await queryRunner.query(
      `DELETE FROM organization_tokens_token WHERE "tokenId" IN (${tokens
        .map(token => token.id)
        .join(',')})`,
    );
    await queryRunner.query(
      `
                DELETE from token
                WHERE "networkId" = ${NETWORK_IDS.OPTIMISM_SEPOLIA}
            `,
    );
  }
}
