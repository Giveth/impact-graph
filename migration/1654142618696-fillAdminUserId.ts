import { MigrationInterface, QueryRunner } from 'typeorm';

export class fillAdminUserId1654142618696 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');
    if (!projectTableExists) {
      return;
    }

    await queryRunner.query(`
            UPDATE project
            SET "adminUserId" = CAST("admin" AS INTEGER)
        `);
  }

  // delete the attribute in the entity
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE project
            DROP COLUMN IF EXISTS "adminUserId"
        `);
  }
}
