import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../src/config';

export class addChangeAcceptedtokens1648066794387
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const changeOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label = 'change'`)
    )[0];

    const mainnetNativeToken = (
      await queryRunner.query(`
        SELECT * FROM token
        WHERE symbol='ETH' and "networkId"=1
      `)
    )[0];

    // for both production and staging
    await queryRunner.query(
      `INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${mainnetNativeToken.id}, ${changeOrganization.id})
      ;`,
    );

    const environment = config.get('ENVIRONMENT') as string;
    // add test token for any other env
    if (environment !== 'production') {
      const ropstenNativeToken = (
        await queryRunner.query(`
            SELECT * FROM token
            WHERE symbol='ETH' and "networkId"=3
        `)
      )[0];

      await queryRunner.query(
        `INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
          (${ropstenNativeToken.id}, ${changeOrganization.id})
        ;`,
      );
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
