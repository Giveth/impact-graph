import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addStreamDonationTimestamps1708567213261
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('donation', [
      new TableColumn({
        name: 'virtualPeriodStart',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'virtualPeriodEnd',
        type: 'integer',
        isNullable: true,
      }),
    ]);

    // Add columns to "recurring_donation" table
    await queryRunner.addColumns('recurring_donation', [
      new TableColumn({
        name: 'amountStreamed',
        type: 'real',
        default: 0,
      }),
      new TableColumn({
        name: 'totalUsdStreamed',
        type: 'real',
        default: 0,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from "donation"
    await queryRunner.dropColumn('donation', 'virtualPeriodEnd');
    await queryRunner.dropColumn('donation', 'virtualPeriodStart');

    // Remove columns from "recurring_donation"
    await queryRunner.dropColumn('recurring_donation', 'totalUsdStreamed');
    await queryRunner.dropColumn('recurring_donation', 'amountStreamed');
  }
}
