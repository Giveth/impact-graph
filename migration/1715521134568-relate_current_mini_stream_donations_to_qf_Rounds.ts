import { MigrationInterface, QueryRunner } from 'typeorm';

export class RelateCurrentMiniStreamDonationsToQfRounds1715521134568
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE donation
            SET "qfRoundId" = qf_round.id
            FROM project_qf_rounds_qf_round, qf_round
            WHERE donation."recurringDonationId" IS NOT NULL
                AND donation."projectId" = project_qf_rounds_qf_round."projectId"
                AND project_qf_rounds_qf_round."qfRoundId" = qf_round."id"
                AND donation."createdAt" BETWEEN qf_round."beginDate" AND qf_round."endDate"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Since the `up` migration changes data based on existing conditions rather than schema,
    // rolling back would ideally require prior knowledge of the previous state, which might
    // not be practical or possible to restore.
    // Therefore, typically for data migrations, the down method might be left empty or
    // could reset changes based on specific requirements.
  }
}
