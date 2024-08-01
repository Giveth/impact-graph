import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAdminAddressHistoryToProject1722549878186
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'project',
      new TableColumn({
        name: 'adminAddressHistory',
        type: 'text',
        isArray: true,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('project', 'adminAddressHistory');
  }
}
