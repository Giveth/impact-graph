import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIsActiveToMainCategories1703804755642
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                            ALTER TABLE main_category
                            ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true
                     `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                            ALTER TABLE main_category
                            DROP "isActive"
                     `,
    );
  }
}
