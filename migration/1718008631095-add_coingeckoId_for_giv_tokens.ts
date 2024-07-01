import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoingeckoIdForGivTokens1718008631095
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update 'coingeckoId' for tokens with the symbol 'GIV'
    await queryRunner.query(`
            UPDATE token
            SET "coingeckoId" = 'giveth'
            WHERE symbol = 'GIV';
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert 'coingeckoId' to NULL for tokens with the symbol 'GIV'
    await queryRunner.query(`
            UPDATE token
            SET "coingeckoId" = NULL
            WHERE symbol = 'GIV';
        `);
  }
}
