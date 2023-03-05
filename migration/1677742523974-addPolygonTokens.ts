import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';
import config from '../src/config';
import { NETWORK_IDS } from '../src/provider';

// tslint:disable-next-line:class-name
export class addGoerliTokens1677742523974 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;
    if (environment === 'production') {
      // We dont add polygon tokens in production ENV
      return;
    }
    await queryRunner.manager.save(
      Token,
      seedTokens
        .filter(token => token.networkId === NETWORK_IDS.POLYGON)
        .map(t => {
          t.address = t.address?.toLowerCase();
          return t;
        }),
    );
    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${NETWORK_IDS.POLYGON}
            `);
    const givethOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='giveth'`)
    )[0];

    for (const token of tokens) {
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id}),
      ;`);
    }

    const changeOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label = 'change'`)
    )[0];

    const polygonNativeToken = (
      await queryRunner.query(`
            SELECT * FROM token
            WHERE symbol='MATIC' and "networkId"=${NETWORK_IDS.POLYGON}
        `)
    )[0];

    await queryRunner.query(
      `INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
          (${polygonNativeToken.id}, ${changeOrganization.id})
        ;`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
