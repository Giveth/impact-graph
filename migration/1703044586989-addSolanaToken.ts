import { MigrationInterface, QueryRunner } from 'typeorm';
import { NETWORK_IDS } from '../src/provider';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import config from '../src/config';

export class addSolanaToken1703044586989 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === NETWORK_IDS.SOLANA)
        .map(t => {
          t.address = t.address?.toLowerCase();
          return t;
        }),
    );
    const tokens = await queryRunner.query(`
                    SELECT * FROM token
                    WHERE "networkId" = ${NETWORK_IDS.SOLANA}
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
            WHERE "networkId" = ${NETWORK_IDS.SOLANA}
            `);
    await queryRunner.query(
      `DELETE FROM organization_tokens_token WHERE "tokenId" IN (${tokens
        .map(token => token.id)
        .join(',')})`,
    );
    await queryRunner.query(
      `
                    DELETE from token
                    WHERE "networkId" = ${NETWORK_IDS.SOLANA}
                `,
    );
  }
}
