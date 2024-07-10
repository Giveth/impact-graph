import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDonationSummaryView1717502321980
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DROP MATERIALIZED VIEW IF EXISTS project_donation_summary_view;`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
