import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddQfRoundErrorMessageToDonation1756933581757
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donation');
    const qfRoundErrorMessageColumn = table?.findColumnByName(
      'qfRoundErrorMessage',
    );

    if (!qfRoundErrorMessageColumn) {
      await queryRunner.addColumn(
        'donation',
        new TableColumn({
          name: 'qfRoundErrorMessage',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('donation', 'qfRoundErrorMessage');
  }
}
