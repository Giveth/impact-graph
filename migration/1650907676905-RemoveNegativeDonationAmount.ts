import { MigrationInterface, QueryRunner } from 'typeorm';

// https://github.com/Giveth/giveth-dapps-v2/issues/596

export class RemoveNegativeDonationAmount1650907676905
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const donationTableExists = await queryRunner.hasTable('donation');

    if (donationTableExists) {
      await queryRunner.query(`DELETE FROM donation WHERE amount<0`);
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
