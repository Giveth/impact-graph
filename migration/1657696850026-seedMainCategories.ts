import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedMainCategories1657696850026 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
           INSERT INTO public.main_category(id, title, description, banner) VALUES
             ( 1, 'Environment & Energy', '', ''),
             ( 2, 'Economics & Infrastructure', '', ''),
             ( 3, 'Health & Wellness', '', ''),
             ( 4, 'Technology & Education', '', ''),
             ( 5, 'Art & Culture', '', ''),
             ( 6, 'Non-profit', '', '');
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM main_category`);
  }
}
