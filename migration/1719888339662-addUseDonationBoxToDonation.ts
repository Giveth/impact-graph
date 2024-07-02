import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUseDonationBoxToDonation1719888339662
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('donation', 'useDonationBox');
  }
}
