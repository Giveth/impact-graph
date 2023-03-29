import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../src/config';
import { NETWORK_IDS } from '../src/provider';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';

// tslint:disable-next-line:class-name
export class addCeloTokensToTraceOrganisation1680094671040
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;

    const networkId =
      environment === 'production'
        ? NETWORK_IDS.CELO
        : NETWORK_IDS.CELO_ALFAJORES;

    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === networkId)
        .map(t => {
          t.address = t.address?.toLowerCase();
          return t;
        }),
    );
    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${NETWORK_IDS.CELO} or "networkId" = ${NETWORK_IDS.CELO_ALFAJORES}
            `);
    const traceOrganization = (
      await queryRunner.query(`SELECT * FROM organization
                                 WHERE label='trace'`)
    )[0];

    for (const token of tokens) {
      // Add all Polygon tokens to Giveth organization
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${traceOrganization.id})
      ;`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
