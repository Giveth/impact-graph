import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropAdminColumn1715556030126 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "project"
            DROP COLUMN "admin";
        `);
  }
  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
