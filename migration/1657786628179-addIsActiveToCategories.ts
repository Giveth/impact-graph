import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIsActiveToCategories1657786628179
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                ALTER TABLE category
                ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true
         `,
    );
    await queryRunner.query(`
          UPDATE category
          SET "isActive"=false
          WHERE name in('the-giving-block','change', 'other')
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                ALTER TABLE category
                DROP "isActive"
         `,
    );
  }
}
