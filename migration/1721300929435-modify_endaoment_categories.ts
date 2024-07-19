import { MigrationInterface, QueryRunner } from 'typeorm';
import { endaomentProjectCategoryMapping } from './data/endaomentProjectCategoryMapping';
import { endaomentProjects } from './data/importedEndaomentProjects';

export class ModifyEndaomentCategories1721300929435
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Swap names and values
    await queryRunner.query(`
            UPDATE "category"
            SET "name" = "value", "value" = "name"
            WHERE "value" IN ('endaoment', 'religious', 'disaster-relief', 'recreation', 'financial-services', 'international-aid');
        `);

    const endaomentOrgIdResult = await queryRunner.query(`
      SELECT "id" FROM "organization" WHERE "label" = 'endaoment';
    `);
    const endaomentOrgId = endaomentOrgIdResult[0].id;

    // Get all projects related to Endaoment
    const projects = await queryRunner.query(`
      SELECT "id", "title" FROM "project" WHERE "organizationId" = ${endaomentOrgId};
    `);

    // Function to get category names based on nteeCode
    const getCategoryNames = (nteeCode: string): string[] => {
      const mapping = endaomentProjectCategoryMapping.find(
        category => category.nteeCode === nteeCode,
      );
      return mapping
        ? [
            mapping.category1,
            mapping.category2,
            mapping.category3,
            mapping.category4,
          ].filter(Boolean)
        : [];
    };

    for (const project of projects) {
      // Find the corresponding project from endaomentProjects
      const matchingProject = endaomentProjects.find(
        p => p.name.replace(/'/g, '') === project.title,
      );

      if (matchingProject) {
        const categoryNames = getCategoryNames(
          String(matchingProject.nteeCode),
        );

        for (const categoryName of categoryNames) {
          const categoryIdResult = await queryRunner.query(`
            SELECT "id" FROM "category" WHERE "value" = '${categoryName.replace(/'/g, "''")}' LIMIT 1;
          `);
          const categoryId = categoryIdResult[0]?.id;

          // Insert the project-category relationship if category exists
          if (categoryId) {
            await queryRunner.query(`
              INSERT INTO "project_categories_category" ("projectId", "categoryId")
              VALUES (${project.id}, ${categoryId})
              ON CONFLICT DO NOTHING;
            `);
          } else {
            // eslint-disable-next-line no-console
            console.warn(
              `Category '${categoryName}' not found for project '${project.title}'.`,
            );
          }
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `Project '${project.title}' not found in importedEndaomentProjects.`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert names and values to original
    await queryRunner.query(`
            UPDATE "category"
            SET "name" = "value", "value" = "name"
            WHERE "name" IN ('endaoment', 'religious', 'disaster-relief', 'recreation', 'financial-services', 'international-aid');
        `);
  }
}
