import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUseDonationBoxAndRelevantTxHashToDonation1720634068179
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('donation');
    const useDonationBoxColumn = table?.findColumnByName('useDonationBox');
    const relevantDonationTxHashColumn = table?.findColumnByName(
      'relevantDonationTxHash',
    );

    if (!useDonationBoxColumn) {
      await queryRunner.addColumn(
        'donation',
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
        'donation',
        new TableColumn({
          name: 'relevantDonationTxHash',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('donation', 'useDonationBox');
    await queryRunner.dropColumn('donation', 'relevantDonationTxHash');
  }
}
