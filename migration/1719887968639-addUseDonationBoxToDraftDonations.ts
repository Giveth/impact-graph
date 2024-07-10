import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUseDonationBoxToDraftDonations1719887968639
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('draft_donation');
    const useDonationBoxColumn = table?.findColumnByName('useDonationBox');
    const relevantDonationTxHashColumn = table?.findColumnByName(
      'relevantDonationTxHash',
    );

    if (!useDonationBoxColumn) {
      await queryRunner.addColumn(
        'draft_donation',
        new TableColumn({
          name: 'useDonationBox',
          type: 'boolean',
          isNullable: true,
          default: false,
        }),
      );
    }

    if (!relevantDonationTxHashColumn) {
      await queryRunner.addColumn(
        'draft_donation',
        new TableColumn({
          name: 'relevantDonationTxHash',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('draft_donation', 'useDonationBox');
    await queryRunner.dropColumn('draft_donation', 'relevantDonationTxHash');
  }
}
