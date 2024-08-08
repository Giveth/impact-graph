import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPgTrgmIndexes1715086559930 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX if not exists trgm_idx_project_title ON project USING GIN (title gin_trgm_ops);',
    );
    await queryRunner.query(
      'CREATE INDEX if not exists trgm_idx_project_description ON project USING GIN (description gin_trgm_ops);',
    );
    await queryRunner.query(
      'CREATE INDEX if not exists trgm_idx_project_impact_location ON project USING GIN ("impactLocation" gin_trgm_ops);',
    );
    await queryRunner.query(
      'CREATE INDEX if not exists trgm_idx_user_name ON public.user USING GIN ("name" gin_trgm_ops);',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop index if exists trgm_idx_project_title;');
    await queryRunner.query(
      'drop index if exists trgm_idx_project_description;',
    );
    await queryRunner.query(
      'drop index if exists trgm_idx_project_impact_location;',
    );
    await queryRunner.query('drop index if exists trgm_idx_user_name;');
  }
}
