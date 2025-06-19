import { MigrationInterface, QueryRunner } from 'typeorm';
import slugify from 'slugify';
import { titleWithoutSpecialCharacters } from '../src/utils/utils';

export class AddSlugToCause1750123930817 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('cause');
    if (tableExists) {
      // Check if the column does not exist before adding it
      const columnExists = await queryRunner.hasColumn('cause', 'slug');
      if (!columnExists) {
        await queryRunner.query(`
                ALTER TABLE "cause"
                ADD COLUMN "slug" text;
            `);
        await queryRunner.query(`
                ALTER TABLE "cause"
                ADD CONSTRAINT "UQ_cause_slug" UNIQUE ("slug");
            `);
      }

      // Get all existing causes that don't have a slug
      const causes = await queryRunner.query(`
            SELECT id, title FROM "cause" WHERE slug IS NULL OR slug = '';
        `);

      // Update each cause with a slug based on its title
      for (const cause of causes) {
        const cleanTitle = titleWithoutSpecialCharacters(cause.title);
        const slug = slugify(cleanTitle, { lower: true, strict: true });

        // Ensure slug is unique by adding a suffix if needed
        let finalSlug = slug;
        let counter = 1;
        const unique = true;

        while (unique) {
          const existingSlug = await queryRunner.query(
            `
                    SELECT id FROM "cause" WHERE slug = $1 AND id != $2
                `,
            [finalSlug, cause.id],
          );

          if (existingSlug.length === 0) {
            break; // Slug is unique
          }

          finalSlug = `${slug}-${counter}`;
          counter++;
        }

        await queryRunner.query(
          `
                UPDATE "cause" SET slug = $1 WHERE id = $2
            `,
          [finalSlug, cause.id],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cause"
      DROP CONSTRAINT "UQ_cause_slug";
    `);

    await queryRunner.query(`
      ALTER TABLE "cause"
      DROP COLUMN "slug";
    `);
  }
}
