import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUseDonationBoxToDraftDonations1719887968639
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('draft_donation', 'useDonationBox');
  }
}
