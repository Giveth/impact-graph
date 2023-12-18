import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExternalDonationsFields1696421249293
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donation');
    if (!table?.findColumnByName('isExternal')) {
      await queryRunner.addColumn(
        'donation',
        new TableColumn({
          name: 'isExternal',
          type: 'boolean',
          default: false,
        }),
      );
    }

    if (!table?.findColumnByName('blockNumber')) {
      await queryRunner.addColumn(
        'donation',
        new TableColumn({
          name: 'blockNumber',
          type: 'integer',
          isNullable: true,
        }),
      );
    }

    if (!table?.findColumnByName('origin')) {
      await queryRunner.addColumn(
        'donation',
        new TableColumn({
          name: 'origin',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('donation', 'isExternal');
    await queryRunner.dropColumn('donation', 'blockNumber');
  }
}
