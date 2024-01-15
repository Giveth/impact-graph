import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import { NETWORK_IDS } from '../src/provider';
import { ChainType } from '../src/types/network';
import { SOLANA_SYSTEM_PROGRAM } from '../src/utils/networks';

export class addSolanaTokens1704487070444 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(
      Token,
      seedTokens.filter(
        token =>
          token.networkId === NETWORK_IDS.SOLANA_MAINNET &&
          token.chainType === ChainType.SOLANA &&
          token.address !== SOLANA_SYSTEM_PROGRAM,
      ),
    );
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

  public async down(queryRunner: QueryRunner): Promise<void> {
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
