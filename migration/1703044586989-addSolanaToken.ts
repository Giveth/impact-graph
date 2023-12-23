import { MigrationInterface, QueryRunner } from 'typeorm';
import { NETWORK_IDS } from '../src/provider';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import { ChainType } from '../src/types/network';
import { SOLANA_SYSTEM_PROGRAM } from '../src/utils/networks';

export class addSolanaToken1703044586989 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.save(
      Token,
      seedTokens.filter(
        token =>
          token.address === SOLANA_SYSTEM_PROGRAM &&
          token.chainType === ChainType.SOLANA,
      ),
    );
    const tokens = await queryRunner.query(
      `SELECT * FROM token WHERE "chainType" = $1 AND "address" = $2`,
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
    await queryRunner.query(
      `INSERT INTO organization_tokens_token ("tokenId", "organizationId") VALUES ($1, $2), ($1, $3)`,
      [tokens[0].id, givethOrganization.id, traceOrganization.id],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.query(
      `SELECT * FROM token WHERE "chainType" = $1 AND "address" = $2`,
      [ChainType.SOLANA, SOLANA_SYSTEM_PROGRAM],
    );
    await queryRunner.query(
      `DELETE FROM organization_tokens_token WHERE "tokenId" IN (${tokens
        .map(token => token.id)
        .join(',')})`,
    );
    await queryRunner.query(
      `DELETE FROM token WHERE "chainType" = $1 AND "address" = $2`,
      [ChainType.SOLANA, SOLANA_SYSTEM_PROGRAM],
    );
  }
}
