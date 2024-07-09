import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEndaomentsCategories1719808494903
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Main Categories
    await queryRunner.query(`
            INSERT INTO "main_category" ("title", "slug", "description", "banner", "isActive")
            VALUES 
                ('NGO', 'ngo', 'Non-Governmental Organizations', '', true),
                ('Art & Culture', 'art-culture', 'Art and Cultural activities', '', true),
                ('Health & Wellness', 'health-wellness', 'Health and Wellness initiatives', '', true),
                ('Finance', 'finance', 'Financial Services and Initiatives', '', true);
        `);

    // Retrieve Main Category IDs
    const ngoMainCategory = await queryRunner.query(
      `SELECT "id" FROM "main_category" WHERE "slug" = 'ngo' LIMIT 1`,
    );
    const artCultureMainCategory = await queryRunner.query(
      `SELECT "id" FROM "main_category" WHERE "slug" = 'art-culture' LIMIT 1`,
    );
    const healthWellnessMainCategory = await queryRunner.query(
      `SELECT "id" FROM "main_category" WHERE "slug" = 'health-wellness' LIMIT 1`,
    );
    const financeMainCategory = await queryRunner.query(
      `SELECT "id" FROM "main_category" WHERE "slug" = 'finance' LIMIT 1`,
    );

    // Create Sub-Categories
    await queryRunner.query(`
            INSERT INTO "category" ("name", "value", "source", "mainCategoryId", "isActive")
            VALUES 
                ('Endaoment', 'endaoment', '', ${ngoMainCategory[0].id}, true),
                ('Religious', 'religious', '', ${artCultureMainCategory[0].id}, true),
                ('Disaster Relief', 'disaster-relief', '', ${ngoMainCategory[0].id}, true),
                ('Recreation', 'recreation', '', ${healthWellnessMainCategory[0].id}, true),
                ('Financial Services', 'financial-services', '', ${financeMainCategory[0].id}, true),
                ('International Aid', 'international-aid', '', ${ngoMainCategory[0].id}, true);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete Sub-Categories
    await queryRunner.query(
      `DELETE FROM "category" WHERE "value" IN ('endaoment', 'religious', 'disaster-relief', 'recreation', 'financial-services', 'international-aid')`,
    );

    // Delete Main Categories
    await queryRunner.query(
      `DELETE FROM "main_category" WHERE "slug" IN ('ngo', 'art-culture', 'health-wellness', 'finance')`,
    );
  }
}
