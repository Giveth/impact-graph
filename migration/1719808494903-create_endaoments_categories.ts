import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEndaomentsCategories1719808494903
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Retrieve Main Category IDs
    const ngoMainCategory = await queryRunner.query(
      `SELECT "id" FROM "main_category" WHERE "slug" = 'ngo' LIMIT 1`,
    );
    const artCultureMainCategory = await queryRunner.query(
      `SELECT "id" FROM "main_category" WHERE "slug" = 'art-and-culture' LIMIT 1`,
    );
    const healthWellnessMainCategory = await queryRunner.query(
      `SELECT "id" FROM "main_category" WHERE "slug" = 'health-and-wellness' LIMIT 1`,
    );
    const financeMainCategory = await queryRunner.query(
      `SELECT "id" FROM "main_category" WHERE "slug" = 'finance' LIMIT 1`,
    );

    // Create Sub-Categories
    await queryRunner.query(`
            INSERT INTO "category" ("name", "value", "source", "mainCategoryId", "isActive")
            VALUES
                ('endaoment', 'Endaoment', '', ${ngoMainCategory[0].id}, true),
                ('religious', 'Religious', '', ${artCultureMainCategory[0].id}, true),
                ('disaster-relief', 'Disaster Relief', '', ${ngoMainCategory[0].id}, true),
                ('recreation', 'Recreation', '', ${healthWellnessMainCategory[0].id}, true),
                ('financial-services', 'Financial Services', '', ${financeMainCategory[0].id}, true),
                ('international-aid', 'International Aid', '', ${ngoMainCategory[0].id}, true);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete Sub-Categories
    await queryRunner.query(
      `DELETE FROM "category" WHERE "name" IN ('endaoment', 'religious', 'disaster-relief', 'recreation', 'financial-services', 'international-aid')`,
    );
  }
}
