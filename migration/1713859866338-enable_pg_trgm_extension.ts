import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgTrgmExtension1713859866338 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP EXTENSION IF EXISTS pg_trgm');
  }
}
