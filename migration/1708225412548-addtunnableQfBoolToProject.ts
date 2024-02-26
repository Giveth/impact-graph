import { MigrationInterface, QueryRunner } from 'typeorm';

export class addtunnableQfBoolToProject1708225412548
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the table exists
    const tableExists = await queryRunner.hasTable('project');
    if (tableExists) {
      // Check if the column does not exist before adding it
      const columnExists = await queryRunner.hasColumn('project', 'tunnableQF');
      if (!columnExists) {
        await queryRunner.query(
          `ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "tunnableQF" boolean NOT NULL DEFAULT false`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('project');
    if (tableExists) {
      // Remove the column if it exists
      const columnExists = await queryRunner.hasColumn('project', 'tunnableQF');
      if (columnExists) {
        await queryRunner.query(
          `ALTER TABLE "project" DROP COLUMN IF EXISTS "tunnableQF"`,
        );
      }
    }
  }
}
