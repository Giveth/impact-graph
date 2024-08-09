import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import { NETWORK_IDS } from '../src/provider';

export class AddStellarTokens1722475689162 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const networkId = NETWORK_IDS.STELLAR_MAINNET;

    //add isQR code to token
    await queryRunner.query(
      `ALTER TABLE token ADD COLUMN IF NOT EXISTS "isQR" BOOLEAN DEFAULT FALSE NOT NULL`,
    );

    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === networkId)
        .map(token => {
          const t = {
            ...token,
          };
          t.address = t.address?.toUpperCase();
          return t;
        }),
    );
    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${networkId}
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
      // Add all Stellar tokens to Giveth organization
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id}),
        (${token.id}, ${traceOrganization.id})
      ;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const networkId = NETWORK_IDS.STELLAR_MAINNET;

    await queryRunner.query(`ALTER TABLE token DROP COLUMN IF EXISTS "isQR"`);

    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${networkId}
            `);

    for (const token of tokens) {
      await queryRunner.query(
        `DELETE FROM organization_tokens_token WHERE "tokenId" = ${token.id}`,
      );
    }
    await queryRunner.query(
      `DELETE FROM token WHERE "networkId" = ${networkId}`,
    );
  }
}
