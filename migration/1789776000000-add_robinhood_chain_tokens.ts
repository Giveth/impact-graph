import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import config from '../src/config';
import { NETWORK_IDS } from '../src/provider';

export class AddRobinhoodChainTokens1789776000000
  implements MigrationInterface
{
  // Same environment branch as the Base chain token migration: the testnet
  // network is seeded in every non-production environment (test, staging,
  // development) so the flow stays testable there, mainnet only in production
  private getNetworkId(): number {
    const environment = config.get('ENVIRONMENT') as string;
    return environment === 'production'
      ? NETWORK_IDS.ROBINHOOD_CHAIN_MAINNET
      : NETWORK_IDS.ROBINHOOD_CHAIN_TESTNET;
  }

  // The address list comes from the same seedTokens filter + lowercasing that
  // up() applies on insert, so up() and down() can never drift apart
  private seededAddressList(networkId: number): string {
    return seedTokens
      .filter(token => token.networkId === networkId)
      .map(token => `'${token.address?.toLowerCase()}'`)
      .join(', ');
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const networkId = this.getNetworkId();

    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === networkId)
        .map(token => {
          const t = {
            ...token,
          };
          t.address = t.address?.toLowerCase();
          delete t.chainType;
          return t;
        }),
    );

    const seededAddresses = this.seededAddressList(networkId);
    if (!seededAddresses) {
      return;
    }

    // Associate only the rows this migration seeded — tokens added to the
    // network independently must not gain organization associations
    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${networkId}
              AND address IN (${seededAddresses})
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
      // Add all Robinhood Chain tokens to Giveth and Trace organizations
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id}),
        (${token.id}, ${traceOrganization.id})
        ON CONFLICT DO NOTHING
      ;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const networkId = this.getNetworkId();

    // Roll back only the rows this migration seeded; tokens added to the
    // network independently of this migration survive a rollback.
    const seededAddresses = this.seededAddressList(networkId);

    if (!seededAddresses) {
      return;
    }

    await queryRunner.query(`
      DELETE FROM organization_tokens_token
      WHERE "tokenId" IN (
        SELECT id FROM token
        WHERE "networkId" = ${networkId}
          AND address IN (${seededAddresses})
      );
    `);

    await queryRunner.query(`
      DELETE FROM token
      WHERE "networkId" = ${networkId}
        AND address IN (${seededAddresses});
    `);
  }
}
