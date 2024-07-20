import { MigrationInterface, QueryRunner } from 'typeorm';
import { ORGANIZATION_LABELS } from '../../src/entities/organization';

export class RemoveSpecialCharactersFromEndaomentProjectsSlug1721290930117
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Replace '/' with '-'
    await queryRunner.query(`
            UPDATE "project"
            SET "slug" = REPLACE("slug", '/', '-')
            WHERE "organizationId" IN (
                SELECT id FROM "organization" WHERE "label" = '${ORGANIZATION_LABELS.ENDAOMENT}'
            );
        `);

    // Replace '\' with '-'
    await queryRunner.query(`
            UPDATE "project"
            SET "slug" = REPLACE("slug", '\\', '-')
            WHERE "organizationId" IN (
                SELECT id FROM "organization" WHERE "label" = '${ORGANIZATION_LABELS.ENDAOMENT}'
            );
        `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This down migration does not revert the slugs back to their original state
    // because we cannot determine the original character from '-'.
    // If you need a reversible migration, consider storing the original slugs in a separate table before modifying them.
  }
}
