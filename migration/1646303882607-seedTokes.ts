import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import { ChainType } from '../src/types/network';

export class seedTokes1646303882607 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "token" ADD COLUMN IF NOT EXISTS "isGivbackEligible" boolean DEFAULT false`,
    );

    await queryRunner.manager.save(
      Token,
      seedTokens
        // We add goerli tokens in addGoerliTokens migration file
        .filter(token => token.networkId !== 5)
        .filter(token => !token.chainType || token.chainType === ChainType.EVM)
        .map(token => {
          const t = {
            ...token,
          };
          t.address = t.address?.toLowerCase();
          delete t.chainType;
          return t;
        }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM token`);
  }
}
