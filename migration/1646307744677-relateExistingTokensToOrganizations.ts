import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import { Organization } from '../src/entities/organization';

export class relateExistinTokensToOrganizations1646307744677
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.query(`SELECT * FROM token`);
    const givethOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE name='Giveth'`)
    )[0];
    const traceOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE name='Trace'`)
    )[0];

    for (const token of tokens) {
      await queryRunner.query(`INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id}),
        (${token.id}, ${traceOrganization.id})
      ;`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM organization_tokens_token`);
  }
}
