import { MigrationInterface, QueryRunner } from 'typeorm';
import { NETWORK_IDS } from '../src/provider';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import { ChainType } from '../src/types/network';
import { SOLANA_SYSTEM_ADDRESS } from '../src/utils/networks';

export class addSolanaToken1703044586989 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.chainType === ChainType.SOLANA)
        .map(t => {
          t.address = t.address;
          return t;
        }),
    );
    const tokens = await queryRunner.query(`
                    SELECT * FROM token
                    WHERE "chainType" = ${ChainType.SOLANA}
                    AND "address" = ${SOLANA_SYSTEM_ADDRESS}
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
            WHERE "chainType" = ${ChainType.SOLANA}
            AND "address" = ${SOLANA_SYSTEM_ADDRESS}
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
