import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token.js';
import seedTokens from './data/seedTokens.js';
import { NETWORK_IDS } from '../src/provider.js';

export class AddETCTokens1696421249294 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === NETWORK_IDS.ETC)
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
                    WHERE "networkId" = ${NETWORK_IDS.ETC}
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
            WHERE "networkId" = ${NETWORK_IDS.ETC}
            `);
    await queryRunner.query(
      `DELETE FROM organization_tokens_token WHERE "tokenId" IN (${tokens
        .map(token => token.id)
        .join(',')})`,
    );
    await queryRunner.query(
      `
                DELETE from token
                WHERE "networkId" = ${NETWORK_IDS.ETC}
            `,
    );
  }
}
