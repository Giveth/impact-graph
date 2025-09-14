import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddQfRoundIdToDraftDonation1757615891000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('draft_donation');
    const qfRoundIdColumn = table?.findColumnByName('qfRoundId');

    if (!qfRoundIdColumn) {
      await queryRunner.addColumn(
        'draft_donation',
        new TableColumn({
          name: 'qfRoundId',
          type: 'integer',
          isNullable: true,
        }),
      );

      // Add foreign key constraint
      await queryRunner.createForeignKey(
        'draft_donation',
        new TableForeignKey({
          columnNames: ['qfRoundId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'qf_round',
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint first
    const table = await queryRunner.getTable('draft_donation');
    const foreignKey = table?.foreignKeys.find(
      fk => fk.columnNames.indexOf('qfRoundId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('draft_donation', foreignKey);
    }

    // Drop column
    await queryRunner.dropColumn('draft_donation', 'qfRoundId');
  }
}
