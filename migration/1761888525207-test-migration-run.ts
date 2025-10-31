import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestMigrationRun1761888525207 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE project SET title = $1 WHERE id = $2`, [
      'test new',
      100,
    ]);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // To properly reverse this migration, you would need to know the original title
    // You can manually set it here if needed
  }
}
