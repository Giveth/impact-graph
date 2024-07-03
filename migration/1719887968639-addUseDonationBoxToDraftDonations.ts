import { MigrationInterface, QueryRunner } from 'typeorm';

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

    const givethProjectId = 1;
    const timeDiff = 60 * 1000; // 1 minute in milliseconds

    await queryRunner.query(
      `
      WITH RelevantDonations AS (
        SELECT d1.id AS donation1_id, d2.id AS donation2_id
        FROM draft_donation d1
        JOIN draft_donation d2 ON d1."userId" = d2."userId"
        WHERE d1."projectId" = $1
          AND d2."projectId" != $1
          AND ABS(EXTRACT(EPOCH FROM (d1."createdAt" - d2."createdAt"))) <= $2
      )
      UPDATE draft_donation
      SET "useDonationBox" = true
      WHERE id IN (
        SELECT donation1_id FROM RelevantDonations
        UNION
        SELECT donation2_id FROM RelevantDonations
      );
    `,
      [givethProjectId, timeDiff],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('draft_donation', 'useDonationBox');
  }
}
