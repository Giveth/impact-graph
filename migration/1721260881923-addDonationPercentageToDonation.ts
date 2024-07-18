import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDonationPercentageToDonation1721260881923
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'donation',
      new TableColumn({
        name: 'donationPercentage',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('donation', 'donationPercentage');
  }
}
