import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBalanceWarningToRecurringDonation1712146623379
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recurring_donation" ADD "balanceWarning" text DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recurring_donation" DROP COLUMN "balanceWarning"`,
    );
  }
}
