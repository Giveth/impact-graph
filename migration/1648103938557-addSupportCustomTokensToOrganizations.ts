import { MigrationInterface, QueryRunner } from 'typeorm';
import { ORGANIZATION_LABELS } from '../src/entities/organization.js';

export class addSupportCustomTokensToOrganizations1648103938557
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE organization
        ADD COLUMN  IF NOT EXISTS "supportCustomTokens" boolean DEFAULT false
     `);

    await queryRunner.query(`
         UPDATE organization
         SET "supportCustomTokens" = true
         WHERE label='${ORGANIZATION_LABELS.GIVETH}' OR label='${ORGANIZATION_LABELS.TRACE}'
      `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization
      DROP COLUMN IF EXISTS "supportCustomTokens"
    `);
  }
}
