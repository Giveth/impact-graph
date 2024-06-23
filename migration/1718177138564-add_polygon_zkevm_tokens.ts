import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import config from '../src/config';
import { NETWORK_IDS } from '../src/provider';

export class AddPolygonZkevmTokens1718177138564 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;

    const networkId =
      environment === 'production'
        ? NETWORK_IDS.ZKEVM_MAINNET
        : NETWORK_IDS.ZKEVM_CARDONA;

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
    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${networkId}
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
      // Add all Base tokens to Giveth organization
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id}),
        (${token.id}, ${traceOrganization.id})
         ON CONFLICT DO NOTHING;
      ;`);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    //
  }
}
