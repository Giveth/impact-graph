import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultValueForFinishedInRecurringDonation1710146146539
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE recurring_donation ALTER COLUMN finished SET DEFAULT false;`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE recurring_donation ALTER COLUMN finished DROP DEFAULT;`,
    );
  }
}
