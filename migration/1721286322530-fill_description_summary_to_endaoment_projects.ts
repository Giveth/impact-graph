import { MigrationInterface, QueryRunner } from 'typeorm';
import { ORGANIZATION_LABELS } from '../src/entities/organization';

export class FillDescriptionSummaryToEndaomentProjects1721286322530
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "project"
            SET "descriptionSummary" = "description"
            WHERE "organizationId" IN (
                SELECT id FROM "organization" WHERE "label" = '${ORGANIZATION_LABELS.ENDAOMENT}'
            );
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // If you need to revert the update, you could set the descriptionSummary back to NULL or another default value.
    // For this example, we'll set it back to NULL.
    await queryRunner.query(`
            UPDATE "project"
            SET "descriptionSummary" = NULL
            WHERE "organizationId" IN (
                SELECT id FROM "organization" WHERE "label" = '${ORGANIZATION_LABELS.ENDAOMENT}'
            );
        `);
  }
}
