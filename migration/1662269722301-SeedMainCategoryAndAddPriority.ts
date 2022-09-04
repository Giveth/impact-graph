import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMainCategoryAndAddPriority1662269722301
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE "main_category" ADD IF NOT EXISTS "priority" Integer
    `);
    await queryRunner.query(`
            UPDATE main_category
            SET "priority" = 1
            WHERE id = 1;
        `);

    await queryRunner.query(`
           UPDATE main_category
                    SET priority = 2
                    WHERE id = 2;
        `);

    await queryRunner.query(`
            UPDATE main_category
                    SET priority = 1
                    WHERE id = 3;
        `);

    await queryRunner.query(`
           UPDATE main_category
                    SET priority = 2
                    WHERE id = 4;
        `);

    await queryRunner.query(`
            UPDATE main_category
                    SET priority =2
                    WHERE id = 5;
        `);

    await queryRunner.query(`
              
                    UPDATE main_category
                    SET priority = 2
                    WHERE id = 6;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
