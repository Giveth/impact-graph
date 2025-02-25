import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHasEARoundToProject1740510537342 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add hasEARound column with default false
    await queryRunner.query(
      `ALTER TABLE "project" ADD COLUMN "hasEARound" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "hasEARound"`);
  }
}
