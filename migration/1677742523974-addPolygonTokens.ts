import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token.js';
import seedTokens from './data/seedTokens.js';
import { NETWORK_IDS } from '../src/provider.js';

export class addGoerliTokens1677742523974 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === NETWORK_IDS.POLYGON)
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
            WHERE "networkId" = ${NETWORK_IDS.POLYGON}
            `);
    const givethOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='giveth'`)
    )[0];

    for (const token of tokens) {
      // Add all Polygon tokens to Giveth organization
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id})
      ;`);
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
