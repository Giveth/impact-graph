import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import { Organization } from '../src/entities/organization';

export class relateExistinTokensToOrganizations1646307744677
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const tokens = await Token.find({});
    const givethOrganization = (await Organization.findOne({
      name: 'Giveth',
    })) as Organization;
    const traceOrganization = (await Organization.findOne({
      name: 'Trace',
    })) as Organization;

    for (const token of tokens) {
      givethOrganization.tokens.push(token);
      traceOrganization.tokens.push(token);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
