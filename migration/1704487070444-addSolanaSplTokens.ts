import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token.js';
import seedTokens from './data/seedTokens.js';
import { NETWORK_IDS } from '../src/provider.js';
import { ChainType } from '../src/types/network.js';
import { SOLANA_SYSTEM_PROGRAM } from '../src/utils/networks.js';
import { ENVIRONMENTS } from '../src/utils/utils.js';

export class addSolanaSplTokens1704487070444 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    let tokensData;
    if (process.env.ENVIRONMENT === ENVIRONMENTS.PRODUCTION) {
      tokensData = seedTokens.filter(
        token =>
          token.networkId === NETWORK_IDS.SOLANA_MAINNET &&
          token.address !== SOLANA_SYSTEM_PROGRAM,
      );
    } else {
      tokensData = seedTokens.filter(
        token =>
          token.networkId === NETWORK_IDS.SOLANA_DEVNET &&
          token.address !== SOLANA_SYSTEM_PROGRAM,
      );
    }
    await queryRunner.manager.save(Token, tokensData);
    const tokens = await queryRunner.query(
      `SELECT * FROM token WHERE "chainType" = $1 AND "address" != $2`,
      [ChainType.SOLANA, SOLANA_SYSTEM_PROGRAM],
    );
    const givethOrganization = (
      await queryRunner.query(`SELECT * FROM organization
                        WHERE label='giveth'`)
    )[0];
    const traceOrganization = (
      await queryRunner.query(`SELECT * FROM organization
                        WHERE label='trace'`)
    )[0];

    for (const token of tokens) {
      await queryRunner.query(
        `INSERT INTO organization_tokens_token ("tokenId", "organizationId") VALUES ($1, $2), ($1, $3)`,
        [token.id, givethOrganization.id, traceOrganization.id],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.query(
      `SELECT * FROM token WHERE "chainType" = $1 AND "address" != $2`,
      [ChainType.SOLANA, SOLANA_SYSTEM_PROGRAM],
    );
    await queryRunner.query(
      `DELETE FROM organization_tokens_token WHERE "tokenId" IN (${tokens
        .map(token => token.id)
        .join(',')})`,
    );
    await queryRunner.query(
      `DELETE FROM token WHERE "chainType" = $1 AND "address" != $2`,
      [ChainType.SOLANA, SOLANA_SYSTEM_PROGRAM],
    );
  }
}
