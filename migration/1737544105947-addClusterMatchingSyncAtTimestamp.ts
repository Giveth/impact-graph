import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addClusterMatchingSyncAtTimestamp1737544105947
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('qf_round');
    const columnExists = table?.findColumnByName('clusterMatchingSyncAt');

    if (!columnExists) {
      await queryRunner.addColumn(
        'qf_round',
        new TableColumn({
          name: 'clusterMatchingSyncAt',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('qf_round', 'clusterMatchingSyncAt');
  }
}
