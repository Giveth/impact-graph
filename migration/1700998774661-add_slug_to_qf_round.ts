import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlugToQfRound1700998774661 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Adding the 'slug' column with a default value
    await queryRunner.query(
      `ALTER TABLE qf_round ADD COLUMN slug TEXT NOT NULL DEFAULT ''`,
    );

    // Update the 'slug' column to use the 'id' for existing records
    await queryRunner.query(`UPDATE qf_round SET slug = id::text`);

    // Add a unique constraint to ensure slug uniqueness
    await queryRunner.query(
      `ALTER TABLE qf_round ADD CONSTRAINT qf_round_slug_unique UNIQUE (slug)`,
    );

    // Remove the default empty string now that all slugs have been set
    await queryRunner.query(
      `ALTER TABLE qf_round ALTER COLUMN slug DROP DEFAULT`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // If you need to revert the migration, remove the unique constraint
    await queryRunner.query(
      `ALTER TABLE qf_round DROP CONSTRAINT qf_round_slug_unique`,
    );

    // Then drop the 'slug' column
    await queryRunner.query(`ALTER TABLE qf_round DROP COLUMN slug`);
  }
}
