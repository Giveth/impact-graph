import { MigrationInterface, QueryRunner } from 'typeorm';

export class SlugUniqueIndex1710977505681 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_unique_slug" ON "project" ("slug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_unique_slug"`);
  }
}
