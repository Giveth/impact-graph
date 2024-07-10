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

    await queryRunner.addColumn(
      'donation',
      new TableColumn({
        name: 'relevantDonationTxHash',
        type: 'varchar',
        isNullable: true,
      }),
    );

    const givethProjectId = 1;
    const timeDiff = 60 * 1000; // 1 minute in milliseconds

    await queryRunner.query(
      `
        WITH RelevantDonations AS (
          SELECT d1.id AS donation1_id, d2.id AS donation2_id, d2."transactionId" AS relevant_tx_hash
          FROM donation d1
          JOIN donation d2 ON d1."userId" = d2."userId"
          WHERE d1."projectId" = $1
            AND d2."projectId" != $1
            AND ABS(EXTRACT(EPOCH FROM (d1."createdAt" - d2."createdAt"))) <= $2
        )
        UPDATE donation
        SET "useDonationBox" = true,
            "relevantDonationTxHash" = CASE
                                         WHEN donation."projectId" = $1 THEN RelevantDonations.relevant_tx_hash
                                         ELSE NULL
                                       END
        FROM RelevantDonations
        WHERE donation.id = RelevantDonations.donation1_id
          OR donation.id = RelevantDonations.donation2_id;
      `,
      [givethProjectId, timeDiff],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('donation', 'useDonationBox');
    await queryRunner.dropColumn('donation', 'relevantDonationTxHash');
  }
}
