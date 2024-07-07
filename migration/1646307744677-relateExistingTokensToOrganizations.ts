import { MigrationInterface, QueryRunner } from 'typeorm';

export class relateExistinTokensToOrganizations1646307744677
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.query(`SELECT * FROM token`);
    const givethOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='giveth'`)
    )[0];
    const traceOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='trace'`)
    )[0];

    const givingBlockOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='givingBlock'`)
    )[0];

    for (const token of tokens) {
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id}),
        (${token.id}, ${traceOrganization.id})
      ;`);
    }

    const mainnetNativeToken = (
      await queryRunner.query(`
            SELECT * FROM token
            WHERE symbol='ETH' and "networkId"=1
        `)
    )[0];

    // Giving block projects just accept ETH on mainnet
    await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${mainnetNativeToken.id}, ${givingBlockOrganization.id})
      ;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM organization_tokens_token`);
  }
}
