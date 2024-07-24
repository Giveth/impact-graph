import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddIndexToUseDonationBox1721841071921
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'donation',
      new TableIndex({
        name: 'IDX_USE_DONATION_BOX',
        columnNames: ['useDonationBox'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('donation', 'IDX_USE_DONATION_BOX');
  }
}
