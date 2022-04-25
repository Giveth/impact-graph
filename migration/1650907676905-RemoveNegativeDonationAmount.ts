import { MigrationInterface, QueryRunner } from 'typeorm';

// https://github.com/Giveth/giveth-dapps-v2/issues/596

export class RemoveNegativeDonationAmount1650907676905
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM Donation where amount<0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
