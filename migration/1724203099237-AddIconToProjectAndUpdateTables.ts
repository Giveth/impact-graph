import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIconToProjectAndUpdateTables1724203099237
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'project',
      new TableColumn({
        name: 'icon',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'project_update',
      new TableColumn({
        name: 'icon',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('project', 'icon');
    await queryRunner.dropColumn('project_update', 'icon');
  }
}
