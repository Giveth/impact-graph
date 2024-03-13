import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedMainCategories1657696850026 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
           INSERT INTO public.main_category(id, title, slug, description, banner) VALUES
             ( 1, 'Environment & Energy','environment-and-energy', '', ''),
             ( 2, 'Economics & Infrastructure','economic-and-infrastructure', '', ''),
             ( 3, 'Health & Wellness','health-and-wellness', '', ''),
             ( 4, 'Technology & Education','technology-and-education', '', ''),
             ( 5, 'Art & Culture','art-and-culture', '', ''),
             ( 6, 'Non-profit','non-profit', '', '');
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM main_category`);
  }
}
