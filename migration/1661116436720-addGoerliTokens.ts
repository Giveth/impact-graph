import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token.js';
import seedTokens from './data/seedTokens.js';
import config from '../src/config.js';

export class addGoerliTokens1661116436720 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;
    if (environment === 'production') {
      // We dont add goerli tokens in production ENV
      return;
    }
    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === 5)
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
            WHERE "networkId" = 5
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

    const changeOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label = 'change'`)
    )[0];

    const goerliNativeToken = (
      await queryRunner.query(`
            SELECT * FROM token
            WHERE symbol='ETH' and "networkId"=5
        `)
    )[0];

    await queryRunner.query(
      `INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
          (${goerliNativeToken.id}, ${changeOrganization.id})
        ;`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
