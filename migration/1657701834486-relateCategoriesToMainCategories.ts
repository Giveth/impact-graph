import { MigrationInterface, QueryRunner } from 'typeorm';

export class relateCategoriesToMainCategories1657701834486
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            ALTER TABLE category
            ADD IF NOT EXISTS "mainCategoryId" Integer`,
    );

    // https://github.com/Giveth/GIVeconomy/issues/655
    await queryRunner.query(
      `
                UPDATE category SET "mainCategoryId" = 1
                WHERE name in ('agriculture','air', 'climate','energy','land','oceans','pollution','waste','water','biodiversity')
              `,
    );

    await queryRunner.query(
      `
                UPDATE category SET "mainCategoryId" = 2
                WHERE name in ('housing', 'employment', 'finance', 'infrastructure', 'real-estate')
              `,
    );

    await queryRunner.query(
      `
                UPDATE category SET "mainCategoryId" = 3
                WHERE name in ('food', 'nutrition', 'health')
              `,
    );

    await queryRunner.query(
      `
                UPDATE category SET "mainCategoryId" = 4
                WHERE name in ('technology', 'research', 'education')
              `,
    );

    await queryRunner.query(
      `
                UPDATE category SET "mainCategoryId" = 5
                WHERE name in ('art-culture', 'community', 'inclusion')
              `,
    );

    await queryRunner.query(
      `
                UPDATE category SET "mainCategoryId" = 6
                WHERE name in ('the-giving-block','change', 'non-profit', 'other')
              `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE category SET "mainCategoryId" = NULL`);
  }
}
