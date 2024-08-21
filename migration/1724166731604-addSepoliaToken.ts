import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import { NETWORK_IDS } from '../src/provider';
import seedTokens from './data/seedTokens';

export class AddSepoliaToken1724166731604 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === NETWORK_IDS.SEPOLIA)
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
            WHERE "networkId" = ${NETWORK_IDS.SEPOLIA}
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
    await queryRunner.query(`
      DELETE FROM organization_tokens_token 
      WHERE "tokenId" IN (
        SELECT id FROM token WHERE "networkId" = ${NETWORK_IDS.SEPOLIA}
      );
    `);

    await queryRunner.query(`
      DELETE FROM token WHERE "networkId" = ${NETWORK_IDS.SEPOLIA};
    `);
  }
}
